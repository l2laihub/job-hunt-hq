import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { applicationQuestionAnswerSchema } from './schemas';
import { parseGeminiJson } from './parse-json';
import type { UserProfile, Experience, JDAnalysis, ApplicationQuestionAnswer, CompanyResearch, SalaryContext } from '@/src/types';

interface GenerateApplicationAnswerParams {
  question: string;
  jobDescription: string;
  analysis: JDAnalysis;
  profile: UserProfile;
  stories: Experience[];
  company?: string;
  role?: string;
  maxLength?: number; // Character limit (e.g., LinkedIn has 500 char limit)
  companyResearch?: CompanyResearch; // Company research with salary intel
}

interface ApplicationAnswerResult {
  generatedAnswer: string;
  questionType: ApplicationQuestionAnswer['questionType'];
  sources: {
    profileSections: string[];
    storyIds: string[];
    synthesized: boolean;
  };
  keyPoints: string[];
  wordCount: number;
  characterCount: number;
  alternativeAnswers?: string[];
  salaryContext?: SalaryContext; // Only present for salary questions
}

/**
 * Build comprehensive profile context for answer generation
 */
function buildProfileContext(profile: UserProfile): string {
  const roles = profile.recentRoles
    .slice(0, 4)
    .map((r, i) => `${i + 1}. ${r.title} at ${r.company} (${r.duration}):\n   - ${r.highlights.slice(0, 3).join('\n   - ')}`)
    .join('\n\n');

  const achievements = profile.keyAchievements
    .slice(0, 5)
    .map((a) => `- ${a.description}${a.metrics ? ` (${a.metrics})` : ''} [${a.storyType}]`)
    .join('\n');

  return `
## Candidate Profile
Name: ${profile.name}
Headline: ${profile.headline}
Years of Experience: ${profile.yearsExperience}
Current Situation: ${profile.currentSituation || 'Open to opportunities'}

## Technical Skills
${profile.technicalSkills.join(', ')}

## Soft Skills
${profile.softSkills.join(', ') || 'Not specified'}

## Work History
${roles || 'No roles listed'}

## Key Achievements
${achievements || 'No achievements listed'}

## Industries
${profile.industries.join(', ') || 'Various'}

## Career Goals
${profile.goals.join(', ') || 'Not specified'}
`.trim();
}

/**
 * Build stories context for answer generation
 */
function buildStoriesContext(stories: Experience[]): string {
  if (stories.length === 0) return 'No experience stories available.';

  return stories
    .slice(0, 6)
    .map((s, i) => `
### Story ${i + 1}: ${s.title} [Tags: ${s.tags.join(', ')}]
**Situation:** ${s.star.situation}
**Task:** ${s.star.task}
**Action:** ${s.star.action}
**Result:** ${s.star.result}
${s.metrics.primary ? `**Key Metric:** ${s.metrics.primary}` : ''}
`)
    .join('\n');
}

/**
 * Detect the type of question being asked
 */
function detectQuestionType(question: string): ApplicationQuestionAnswer['questionType'] {
  const q = question.toLowerCase();

  // Behavioral patterns
  if (/tell (me|us) (a|about a) time|describe a situation|give (me |us )?an example/i.test(q)) {
    return 'behavioral';
  }

  // Experience patterns
  if (/how many years|experience (do you have|with)|worked (on|with)|background in/i.test(q)) {
    return 'experience';
  }

  // Technical patterns
  if (/how would you (implement|design|build|architect)|explain (how|what|the)/i.test(q)) {
    return 'technical';
  }

  // Motivation patterns
  if (/why (do you want|are you interested|this role|this company)|what interests you|motivat/i.test(q)) {
    return 'motivation';
  }

  // Situational patterns
  if (/what would you do|how would you handle|if you were|imagine/i.test(q)) {
    return 'situational';
  }

  return 'custom';
}

/**
 * Detect if the question is salary/compensation related
 */
function isSalaryQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return /salary|compensation|pay|wage|rate|earning|remuneration|desired.*(salary|pay|compensation)|salary.*expectation|expected.*(salary|pay)|how much.*looking for|target.*(salary|compensation)/i.test(q);
}

/**
 * Parse salary range string to min/max numbers
 * Handles formats like "$180K-$220K", "180,000 - 220,000", "$180k to $220k"
 */
function parseSalaryRange(salaryStr: string): { min: number; max: number } | null {
  if (!salaryStr) return null;

  // Remove $ and commas, normalize K/k to 000
  const normalized = salaryStr
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/[kK]/g, '000');

  // Extract numbers
  const numbers = normalized.match(/\d+/g);
  if (!numbers || numbers.length < 1) return null;

  const values = numbers.map(n => parseInt(n, 10)).filter(n => n > 1000); // Filter out small numbers

  if (values.length >= 2) {
    return { min: Math.min(...values), max: Math.max(...values) };
  } else if (values.length === 1) {
    // Single number - treat as target with ±10% range
    const val = values[0];
    return { min: Math.round(val * 0.9), max: Math.round(val * 1.1) };
  }

  return null;
}

/**
 * Build salary context by comparing user target with JD and market data
 */
function buildSalaryContext(
  profile: UserProfile,
  analysis: JDAnalysis,
  companyResearch?: CompanyResearch
): SalaryContext {
  const userTarget = profile.preferences.salaryRange;

  // Get JD salary info from compensation fit assessment
  const jdRange = analysis.compensationFit?.assessment ||
    ('salaryAssessment' in analysis ? analysis.salaryAssessment : undefined);

  // Get Glassdoor/market salary from company research
  const glassdoorRange = companyResearch?.interviewIntel?.salaryRange;

  // Parse available salary ranges for comparison
  const parsedJdRange = jdRange ? parseSalaryRange(jdRange) : null;
  const parsedGlassdoor = glassdoorRange ? parseSalaryRange(glassdoorRange) : null;

  // Determine assessment and recommended range
  let assessment: SalaryContext['assessment'] = 'unknown';
  let recommendedRange: string | undefined;
  let negotiationTip: string | undefined;

  // Use JD range if available, otherwise use Glassdoor
  const marketRange = parsedJdRange || parsedGlassdoor;

  if (marketRange) {
    const userMid = (userTarget.min + userTarget.max) / 2;
    const marketMid = (marketRange.min + marketRange.max) / 2;

    // Check overlap
    const hasOverlap = userTarget.min <= marketRange.max && userTarget.max >= marketRange.min;

    if (hasOverlap) {
      assessment = 'within-range';
      // Recommend the overlap sweet spot
      const overlapMin = Math.max(userTarget.min, marketRange.min);
      const overlapMax = Math.min(userTarget.max, marketRange.max);
      recommendedRange = `$${Math.round(overlapMin / 1000)}K-$${Math.round(overlapMax / 1000)}K`;
      negotiationTip = 'Your target aligns with the role. Aim for the upper end of the overlap to leave room for negotiation.';
    } else if (userMid > marketMid) {
      assessment = 'above-target';
      recommendedRange = `$${Math.round(marketRange.max / 1000)}K+`;
      negotiationTip = `The role may pay below your target ($${Math.round(marketRange.min / 1000)}K-$${Math.round(marketRange.max / 1000)}K). Consider if other factors (growth, equity, benefits) compensate, or negotiate based on your unique value.`;
    } else {
      assessment = 'below-target';
      recommendedRange = `$${Math.round(userTarget.min / 1000)}K-$${Math.round(marketRange.max / 1000)}K`;
      negotiationTip = `The role pays above your stated minimum. Consider targeting higher within the range ($${Math.round(marketRange.min / 1000)}K-$${Math.round(marketRange.max / 1000)}K) based on your experience.`;
    }
  } else {
    // No market data available
    recommendedRange = `$${Math.round(userTarget.min / 1000)}K-$${Math.round(userTarget.max / 1000)}K`;
    negotiationTip = 'No salary range found in job description. Research market rates on Glassdoor/Levels.fyi before answering.';
  }

  return {
    userTarget,
    jdRange,
    glassdoorRange,
    recommendedRange,
    negotiationTip,
    assessment,
  };
}

/**
 * Build company context for answer generation
 */
function buildCompanyContext(companyResearch?: CompanyResearch): string {
  if (!companyResearch) return '';

  const parts: string[] = ['## Company Intelligence'];

  if (companyResearch.overview) {
    parts.push(`Industry: ${companyResearch.overview.industry}`);
    parts.push(`Size: ${companyResearch.overview.size}`);
    if (companyResearch.overview.fundingStatus) {
      parts.push(`Funding: ${companyResearch.overview.fundingStatus}`);
    }
  }

  if (companyResearch.engineeringCulture) {
    if (companyResearch.engineeringCulture.knownStack?.length) {
      parts.push(`Tech Stack: ${companyResearch.engineeringCulture.knownStack.join(', ')}`);
    }
    if (companyResearch.engineeringCulture.remotePolicy) {
      parts.push(`Work Style: ${companyResearch.engineeringCulture.remotePolicy}`);
    }
  }

  if (companyResearch.greenFlags?.length) {
    parts.push(`Positives: ${companyResearch.greenFlags.slice(0, 3).map(f => f.flag).join('; ')}`);
  }

  if (companyResearch.verdict) {
    parts.push(`Overall: ${companyResearch.verdict.summary}`);
  }

  return parts.join('\n');
}

/**
 * Generate an answer for an application question
 */
export async function generateApplicationAnswer(
  params: GenerateApplicationAnswerParams
): Promise<ApplicationAnswerResult> {
  const ai = requireGemini();
  const { question, jobDescription, analysis, profile, stories, company, role, maxLength, companyResearch } = params;

  const profileContext = buildProfileContext(profile);
  const storiesContext = buildStoriesContext(stories);
  const companyContext = buildCompanyContext(companyResearch);
  const questionType = detectQuestionType(question);

  // Check if this is a salary question
  const isSalary = isSalaryQuestion(question);
  const salaryContext = isSalary ? buildSalaryContext(profile, analysis, companyResearch) : undefined;

  // Find relevant stories based on question type
  const relevantStoryIds = findRelevantStories(question, stories);

  const characterLimit = maxLength || 2000;
  const isShortForm = characterLimit <= 500;

  // Build salary-specific guidance if applicable
  const salaryGuidance = isSalary && salaryContext ? `
## SALARY QUESTION CONTEXT (IMPORTANT)
This is a salary/compensation question. Use this context to craft a strategic answer:

Your Target Range: $${Math.round(salaryContext.userTarget.min / 1000)}K-$${Math.round(salaryContext.userTarget.max / 1000)}K
${salaryContext.jdRange ? `JD Salary Info: ${salaryContext.jdRange}` : 'JD Salary: Not specified'}
${salaryContext.glassdoorRange ? `Market Data (Glassdoor): ${salaryContext.glassdoorRange}` : ''}
Recommended Answer Range: ${salaryContext.recommendedRange}
Assessment: ${salaryContext.assessment}
Strategy: ${salaryContext.negotiationTip}

Guidelines for salary answers:
- Use the RECOMMENDED range, not just the user's target (it accounts for market data)
- Be confident but open: "I'm targeting X, open to discussion based on total compensation"
- Reference your experience level to justify the range
- For short answers, just state the range with brief justification
- NEVER undersell - if market pays more, target higher
- If role is below target, consider mentioning flexibility for the right opportunity
` : '';

  const prompt = `You are ghostwriting an application answer AS the candidate. Write in their authentic voice - first person, natural, human.

${profileContext}

## Experience Stories (STAR Format)
${storiesContext}

${companyContext}

## Target Position
Company: ${company || 'Not specified'}
Role: ${role || 'Not specified'}

## Job Description Summary
${jobDescription.slice(0, 1500)}

## Analysis Context
Fit Score: ${analysis.fitScore}/10
Matched Skills: ${'matchedSkills' in analysis ? analysis.matchedSkills.join(', ') : 'N/A'}
${analysis.recommendation ? `Recommendation: ${analysis.recommendation.summary}` : ''}
${'talkingPoints' in analysis && analysis.talkingPoints?.length ? `Key Talking Points: ${analysis.talkingPoints.slice(0, 3).join('; ')}` : ''}
${'greenFlags' in analysis && analysis.greenFlags?.length ? `Role Positives: ${analysis.greenFlags.slice(0, 2).join('; ')}` : ''}
${salaryGuidance}

## APPLICATION QUESTION TO ANSWER
"${question}"

## Character Limit
${characterLimit} characters maximum${isShortForm ? ' (SHORT FORM - be concise!)' : ''}

## Question Type Detected: ${questionType.toUpperCase()}

## CRITICAL: Sound Human, Not AI
NEVER use these AI patterns:
- "I am excited/thrilled/passionate about" - Instead, show interest through specifics
- "I believe/I feel" - Just state it directly
- "leverage/utilize/synergy/dynamic/innovative" - Use plain English
- "Throughout my career/In my current role/As a [title]" - Jump straight to the story
- "This experience taught me" - Show, don't tell
- "make me an ideal candidate/perfect fit" - Let achievements speak
- Starting every sentence with "I"
- Generic statements that could apply to anyone

DO use these human patterns:
- Contractions (I'm, I've, didn't, we'd)
- Specific project names, team sizes, real numbers
- Short sentences mixed with longer ones
- Starting some sentences with the action or result
- Casual but professional tone
- Your actual opinion or perspective
- Concrete details only YOU would know
- Reference THIS specific role/company when relevant

${questionType === 'behavioral' ? `
For behavioral questions:
- Jump into the story quickly - skip generic intros
- Use STAR but don't be formulaic about it
- ONE specific example with real details
- End with the concrete outcome (numbers help)
` : ''}

${questionType === 'experience' ? `
For experience questions:
- Give the specific number/duration upfront
- Follow with the most impressive relevant context
- Don't over-explain - be direct
` : ''}

${questionType === 'technical' ? `
For technical questions:
- Lead with what you actually built or solved
- Name specific technologies you used
- Include scale/impact where relevant
` : ''}

${questionType === 'motivation' ? `
For motivation questions:
- Be specific about THIS company (${company || 'the company'}), not generic
- Reference specific things from the JD or company research
- Connect to something real from your background
- Avoid sounding desperate or over-eager
` : ''}

${isShortForm ? `
SHORT FORM (${characterLimit} chars) - Be ruthlessly concise:
- Skip setup, start with the key point
- One strong example beats three weak ones
- Numbers > adjectives
- Every word must earn its place
` : ''}

## Your Task
Write an answer that sounds like a real person wrote it - someone with personality, opinions, and specific experiences. A recruiter should NOT be able to tell this was AI-generated.

IMPORTANT: Tailor your answer to THIS SPECIFIC JOB at ${company || 'this company'} for the ${role || 'this role'} position. Reference relevant skills, requirements, or company details when appropriate.

Also provide:
- 3-4 key points that make this answer effective
- Which profile sections informed this
${!isShortForm ? '- 1-2 shorter alternative versions' : ''}`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: applicationQuestionAnswerSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    const result = parseGeminiJson<any>(response.text, { context: 'generateApplicationAnswer' });

    // Ensure the answer fits within the character limit
    let finalAnswer = result.generatedAnswer || '';
    if (finalAnswer.length > characterLimit) {
      // Truncate at the last complete sentence within limit
      finalAnswer = truncateToSentence(finalAnswer, characterLimit);
    }

    return {
      generatedAnswer: finalAnswer,
      questionType,
      sources: {
        profileSections: result.sources?.profileSections || ['recentRoles', 'keyAchievements'],
        storyIds: relevantStoryIds,
        synthesized: relevantStoryIds.length > 1,
      },
      keyPoints: result.keyPoints || [],
      wordCount: finalAnswer.split(/\s+/).length,
      characterCount: finalAnswer.length,
      alternativeAnswers: result.alternativeAnswers,
      salaryContext, // Include salary context for salary questions
    };
  } catch (error) {
    console.error('Generate application answer failed:', error);
    throw new Error(
      `Failed to generate answer: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Find stories relevant to the question
 */
function findRelevantStories(question: string, stories: Experience[]): string[] {
  const q = question.toLowerCase();
  const relevantIds: string[] = [];

  // Keywords to match
  const keywords = q.match(/\b(lead|led|built|build|design|implement|team|problem|challenge|conflict|deadline|fail|success|achieve|improve|optimize|scale)\w*\b/gi) || [];

  stories.forEach((story) => {
    const storyText = `${story.title} ${story.star.situation} ${story.star.action} ${story.star.result} ${story.tags.join(' ')}`.toLowerCase();

    // Check if any keywords match
    const matches = keywords.filter((kw) => storyText.includes(kw.toLowerCase()));
    if (matches.length > 0) {
      relevantIds.push(story.id);
    }
  });

  return relevantIds.slice(0, 3); // Return top 3 relevant stories
}

/**
 * Truncate text to last complete sentence within character limit
 */
function truncateToSentence(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );

  if (lastSentenceEnd > maxLength * 0.6) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }

  // If no good sentence break, truncate at last word
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.slice(0, lastSpace) + '...';
}

/**
 * Generate multiple answers for batch questions
 */
export async function generateBatchApplicationAnswers(
  questions: string[],
  params: Omit<GenerateApplicationAnswerParams, 'question'>
): Promise<ApplicationAnswerResult[]> {
  const results: ApplicationAnswerResult[] = [];

  for (const question of questions) {
    try {
      const result = await generateApplicationAnswer({ ...params, question });
      results.push(result);
    } catch (error) {
      console.error(`Failed to generate answer for: ${question}`, error);
      // Continue with other questions
    }
  }

  return results;
}

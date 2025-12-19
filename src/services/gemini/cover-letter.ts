import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { coverLetterSchema, coverLetterRefinementSchema } from './schemas';
import type { UserProfile, Experience, JDAnalysis, CoverLetterStyle } from '@/src/types';

/**
 * Format cover letter content to ensure proper paragraph breaks
 * This handles cases where the AI generates a wall of text without line breaks
 */
function formatCoverLetterContent(content: string, candidateName: string): string {
  let formatted = content.trim();

  // If content already has multiple line breaks, just clean it up
  if ((formatted.match(/\n\n/g) || []).length >= 3) {
    return formatted;
  }

  // Step 1: Add break after greeting (Dear X,)
  formatted = formatted.replace(/^(Dear[^,]+,)\s*/i, '$1\n\n');

  // Step 2: Add break before common sign-offs
  formatted = formatted.replace(
    /\s+(Best regards|Sincerely|Kind regards|Regards|Thank you|Warm regards|Yours truly|Respectfully),?\s*/gi,
    '\n\n$1,\n'
  );

  // Step 3: Ensure candidate name is on its own line after sign-off
  if (candidateName) {
    const namePattern = new RegExp(`(,)\\s*(${candidateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*$`, 'i');
    formatted = formatted.replace(namePattern, '$1\n$2');
  }

  // Step 4: If body is still one big block, split it intelligently
  // Count paragraphs (sections separated by \n\n)
  const paragraphCount = (formatted.match(/\n\n/g) || []).length;

  if (paragraphCount < 3) {
    // Need to add more paragraph breaks in the body
    // Find the body (between greeting and sign-off)
    const greetingMatch = formatted.match(/^(Dear[^,]+,\n\n)/i);
    const signoffMatch = formatted.match(/(\n\n(?:Best regards|Sincerely|Kind regards|Regards|Thank you|Warm regards|Yours truly|Respectfully),[\s\S]*$)/i);

    if (greetingMatch && signoffMatch) {
      const greeting = greetingMatch[1];
      const signoffIndex = formatted.lastIndexOf(signoffMatch[1]);
      const body = formatted.slice(greeting.length, signoffIndex);
      const signoff = signoffMatch[1];

      // Split body into sentences and group into paragraphs
      let formattedBody = body
        // Break after sentences that end a thought (before transition phrases)
        .replace(/\.\s+(In my |At |During |While |After |Before |Throughout |Additionally|Furthermore|Moreover|Beyond this|My experience|My background|My work|I've also|I also|Most recently|Previously|Before that)/gi, '.\n\n$1')
        // Break before closing/eager statements
        .replace(/\.\s+(I(?:'m| am) (?:particularly|especially|most|confident|eager|excited)|What (?:excites|interests|draws|attracts)|I would (?:welcome|love|be)|I look forward|I'd (?:love|welcome|be))/gi, '.\n\n$1')
        // Break after first 2-3 sentences if still no breaks
        .replace(/^([^.]+\.[^.]+\.)\s+/g, '$1\n\n');

      formatted = greeting + formattedBody.trim() + signoff;
    }
  }

  return formatted.trim();
}

interface ScreeningQuestion {
  question: string;
  isRequired: boolean;
  questionType: 'technical' | 'experience' | 'availability' | 'rate' | 'general';
}

interface GenerateCoverLetterParams {
  jobDescription: string;
  analysis: JDAnalysis;
  profile: UserProfile;
  stories: Experience[];
  style: CoverLetterStyle;
  company?: string;
  role?: string;
  screeningQuestions?: ScreeningQuestion[];
}

interface ScreeningAnswer {
  question: string;
  answer: string;
}

interface CoverLetterResult {
  content: string;
  keyPoints: string[];
  wordCount: number;
  screeningAnswers?: ScreeningAnswer[];
}

/**
 * Build context from user profile for cover letter
 */
function buildProfileContext(profile: UserProfile): string {
  const roles = profile.recentRoles
    .slice(0, 3)
    .map((r) => `- ${r.title} at ${r.company} (${r.duration}): ${r.highlights.slice(0, 2).join('; ')}`)
    .join('\n');

  const achievements = profile.keyAchievements
    .slice(0, 5)
    .map((a) => `- ${a.description} (${a.metrics || 'no metrics'})`)
    .join('\n');

  return `
Name: ${profile.name}
Headline: ${profile.headline}
Experience: ${profile.yearsExperience} years

Technical Skills: ${profile.technicalSkills.slice(0, 15).join(', ')}
Industries: ${profile.industries.join(', ')}

Recent Roles:
${roles || 'No roles listed'}

Key Achievements:
${achievements || 'No achievements listed'}

Goals: ${profile.goals.join(', ') || 'Not specified'}
`.trim();
}

/**
 * Build relevant stories context
 */
function buildStoriesContext(stories: Experience[], matchedSkills: string[]): string {
  // Filter stories that might be relevant based on tags/skills
  const relevantStories = stories
    .filter((s) =>
      s.tags.some((tag) =>
        matchedSkills.some((skill) => tag.toLowerCase().includes(skill.toLowerCase()))
      )
    )
    .slice(0, 3);

  if (relevantStories.length === 0) {
    return stories
      .slice(0, 2)
      .map((s) => `- ${s.title}: ${s.star.result.slice(0, 100)}...`)
      .join('\n');
  }

  return relevantStories
    .map((s) => `- ${s.title}: ${s.star.result.slice(0, 100)}...`)
    .join('\n');
}

/**
 * Get style-specific instructions
 */
function getStyleInstructions(style: CoverLetterStyle): string {
  const instructions: Record<CoverLetterStyle, string> = {
    professional: `
Write in a formal, polished tone suitable for established corporations.
- Use traditional business letter structure
- Focus on qualifications and track record
- Be respectful, confident, and direct
- Avoid casual language or humor
- Keep sentences structured and professional`,

    'story-driven': `
Write in an engaging narrative style that tells a compelling story.
- Open with a hook or anecdote that relates to the role
- Weave achievements into a cohesive narrative
- Show personality while remaining professional
- Connect past experiences to future contributions
- Make the reader want to know more`,

    'technical-focused': `
Write in a style that emphasizes technical expertise and problem-solving.
- Lead with relevant technical achievements
- Use specific technical terminology appropriately
- Quantify impact with metrics and data
- Show depth of technical understanding
- Reference relevant technologies and methodologies`,

    'startup-casual': `
Write in a friendly, authentic tone suitable for startups.
- Be conversational but professional
- Show genuine enthusiasm and passion
- Highlight adaptability and growth mindset
- Use active voice and dynamic language
- Let personality shine through while being appropriate`,
  };

  return instructions[style];
}

/**
 * Generate a cover letter based on job description and profile
 */
export async function generateCoverLetter(
  params: GenerateCoverLetterParams
): Promise<CoverLetterResult> {
  const ai = requireGemini();
  const { jobDescription, analysis, profile, stories, style, company, role, screeningQuestions } = params;

  const profileContext = buildProfileContext(profile);
  const matchedSkills =
    analysis.analysisType === 'freelance'
      ? analysis.matchedSkills
      : analysis.matchedSkills;

  const storiesContext = buildStoriesContext(stories, matchedSkills);
  const styleInstructions = getStyleInstructions(style);

  // Build screening questions section if present
  const hasScreeningQuestions = screeningQuestions && screeningQuestions.length > 0;
  const screeningQuestionsSection = hasScreeningQuestions
    ? `
## Screening Questions to Answer
The job posting includes these screening questions that MUST be answered. Include answers to these at the END of the cover letter in a clearly marked section.

${screeningQuestions.map((q, i) => `${i + 1}. [${q.questionType.toUpperCase()}${q.isRequired ? ' - REQUIRED' : ''}] ${q.question}`).join('\n')}

IMPORTANT: After the main cover letter and sign-off, add a section titled "---\\n\\n**Screening Questions:**" and answer each question concisely but thoroughly (2-4 sentences each). Use the candidate's profile and experience to craft authentic, specific answers.
`
    : '';

  const prompt = `You are ghostwriting a cover letter AS the candidate (first person). Write in their authentic voice based on their profile.

## Candidate Profile
${profileContext}

## Relevant Experience Stories
${storiesContext}

## Target Position
Company: ${company || 'Not specified'}
Role: ${role || 'Not specified'}

## Job Description
${jobDescription.slice(0, 2000)}

## Analysis Summary
Fit Score: ${analysis.fitScore}/10
Matched Skills: ${matchedSkills.join(', ')}
${analysis.analysisType === 'fulltime' || analysis.analysisType === 'contract' ? `Talking Points: ${analysis.talkingPoints.slice(0, 3).join('; ')}` : ''}

## Style Instructions
${styleInstructions}
${screeningQuestionsSection}
## CRITICAL: Sound Human, Not AI
You MUST avoid these AI-sounding patterns:
- NEVER use: "I am excited", "I am thrilled", "I am passionate about", "I believe", "I am confident"
- NEVER use: "leverage", "utilize", "synergy", "dynamic", "innovative", "cutting-edge", "spearhead"
- NEVER use: "Throughout my career", "In my current role", "As a [title]"
- NEVER start sentences with "I" more than 2 times in a row
- NEVER use corporate buzzwords or empty superlatives
- NEVER use the phrase "make me an ideal candidate" or "perfect fit"
- NEVER list skills in a comma-separated way ("I have experience with X, Y, and Z")

Instead:
- Use contractions naturally (I'm, I've, didn't, wasn't)
- Vary sentence length - mix short punchy sentences with longer ones
- Start some sentences with the action/result, not "I"
- Be specific and concrete - numbers, project names, real situations
- Show personality through word choice and rhythm
- Use active voice and strong verbs
- Write like you're talking to a real person, not a robot

## Your Task
Write a cover letter (250-400 words) that:
1. Opens with a specific hook - a project, a problem you solved, or why THIS company caught your attention
2. Connects 2-3 concrete achievements to what the role needs (with metrics)
3. Shows you understand their challenges and can help solve them
4. Ends with a clear, confident (not desperate) call to action

## FORMATTING REQUIREMENTS (CRITICAL - USE MARKDOWN)
Format the cover letter using Markdown with clear paragraph breaks:

1. Start with the greeting on its own line: "Dear ${company || 'Hiring Team'},"
2. Leave a BLANK LINE after the greeting
3. Write 3-4 paragraphs, each separated by a BLANK LINE (two newlines: \\n\\n)
4. Leave a BLANK LINE before the sign-off
5. Sign-off on its own line (e.g., "Best regards,")
6. Candidate name on the final line: "${profile.name}"

Example structure (follow this EXACTLY):
\`\`\`
Dear [Company],

[Opening paragraph - hook and why this role]

[Middle paragraph - relevant experience with metrics]

[Optional middle paragraph - more achievements]

[Closing paragraph - call to action]

Best regards,
[Name]
\`\`\`

IMPORTANT: Each paragraph MUST be separated by a blank line (double newline).
Do NOT write as one continuous block of text.
Do NOT use placeholder text like [Company Name] - use actual values.

The letter should sound like it was written by a real person with opinions and personality, not generated by AI.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: coverLetterSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    let jsonText = response.text;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonText);

    // Format the content to ensure proper paragraph breaks
    const formattedContent = formatCoverLetterContent(result.content || '', profile.name);

    return {
      content: formattedContent,
      keyPoints: result.keyPoints || [],
      wordCount: result.wordCount || formattedContent.split(/\s+/).length || 0,
      screeningAnswers: result.screeningAnswers || undefined,
    };
  } catch (error) {
    console.error('Generate cover letter failed:', error);
    throw new Error(
      `Failed to generate cover letter: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Refinement mode types
export type RefinementMode = 'improve' | 'shorten' | 'expand' | 'keywords' | 'tone';

interface RefineCoverLetterParams {
  existingLetter: string;
  jobDescription: string;
  analysis: JDAnalysis;
  profile: UserProfile;
  mode: RefinementMode;
  targetWordCount?: number;
  customInstructions?: string;
}

interface CoverLetterRefinementResult {
  refinedContent: string;
  changes: { type: string; description: string }[];
  keywordsAdded: string[];
  wordCount: number;
  improvements: string[];
}

/**
 * Refine an existing cover letter based on the job description and user preferences
 */
export async function refineCoverLetter(
  params: RefineCoverLetterParams
): Promise<CoverLetterRefinementResult> {
  const ai = requireGemini();
  const { existingLetter, jobDescription, analysis, profile, mode, targetWordCount, customInstructions } = params;

  const matchedSkills =
    analysis.analysisType === 'freelance'
      ? analysis.matchedSkills
      : analysis.matchedSkills;

  const missingSkills =
    'missingSkills' in analysis ? analysis.missingSkills : [];

  const modeInstructions: Record<RefinementMode, string> = {
    improve: `
Improve this cover letter while maintaining its core message and voice:
- Fix any awkward phrasing or unclear sentences
- Strengthen weak statements with more specific details
- Improve flow and transitions between paragraphs
- Make the opening more compelling
- Ensure the closing has a clear call to action
- Add relevant keywords from the job description naturally`,

    shorten: `
Shorten this cover letter to be more concise (target: ${targetWordCount || 250} words):
- Remove redundant phrases and filler words
- Combine similar points
- Keep only the strongest achievements/examples
- Maintain the core message and personality
- Ensure it still feels complete and professional`,

    expand: `
Expand this cover letter with more detail (target: ${targetWordCount || 400} words):
- Add more specific examples or achievements
- Elaborate on key points with metrics/numbers
- Include additional relevant experience
- Strengthen the connection to the company/role
- Add more personality while staying professional`,

    keywords: `
Optimize this cover letter for ATS and keyword matching:
- Add missing keywords from the job description naturally
- Include technical terms and skills mentioned in the JD
- Ensure key qualifications are explicitly mentioned
- Keep the natural flow - don't stuff keywords awkwardly
Keywords to incorporate: ${[...matchedSkills, ...missingSkills.slice(0, 5)].join(', ')}`,

    tone: `
Adjust the tone based on the role type and company:
${analysis.analysisType === 'freelance' ?
  '- Make it more conversational and direct (Upwork/freelance style)\n- Focus on solving the client\'s specific problem\n- Show enthusiasm without being desperate\n- Include a clear value proposition' :
  '- Match the company culture implied in the JD\n- Balance confidence with humility\n- Sound authentic, not robotic\n- Remove any overly casual or overly formal phrases'
}`,
  };

  const prompt = `You are refining an existing cover letter. Your goal is to improve it while preserving the candidate's authentic voice.

## Original Cover Letter
${existingLetter}

## Target Position
Job Description:
${jobDescription.slice(0, 2000)}

## Analysis Context
Fit Score: ${analysis.fitScore}/10
Matched Skills: ${matchedSkills.join(', ')}
Missing Skills: ${missingSkills.join(', ') || 'None identified'}

## Candidate Name: ${profile.name}

## Refinement Mode: ${mode.toUpperCase()}
${modeInstructions[mode]}

${customInstructions ? `## Additional Instructions\n${customInstructions}` : ''}

## CRITICAL: Preserve the Human Voice
- Keep contractions and natural language patterns from the original
- Don't add AI-sounding phrases like "I am excited", "I believe", "leverage", "utilize"
- Maintain the same general tone and personality
- If the original has specific examples/numbers, keep or enhance them
- Don't make it sound generic - keep the specific details that make it personal

## Your Task
1. Refine the cover letter according to the mode instructions
2. List the specific changes you made
3. Note any keywords you added from the JD
4. Highlight the key improvements

Return the refined letter with proper paragraph formatting (blank lines between paragraphs).`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: coverLetterRefinementSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    let jsonText = response.text;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonText);

    // Format the content to ensure proper paragraph breaks
    const formattedContent = formatCoverLetterContent(result.refinedContent || '', profile.name);

    return {
      refinedContent: formattedContent,
      changes: result.changes || [],
      keywordsAdded: result.keywordsAdded || [],
      wordCount: result.wordCount || formattedContent.split(/\s+/).length || 0,
      improvements: result.improvements || [],
    };
  } catch (error) {
    console.error('Refine cover letter failed:', error);
    throw new Error(
      `Failed to refine cover letter: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

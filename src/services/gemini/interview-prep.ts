import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { parseGeminiJson } from './parse-json';
import { phoneScreenPrepSchema, technicalInterviewPrepSchema, applicationStrategySchema } from './schemas';
import type {
  UserProfile,
  Experience,
  JDAnalysis,
  PhoneScreenPrep,
  TechnicalInterviewPrep,
  ApplicationStrategy,
} from '@/src/types';

interface PrepGenerationParams {
  jobDescription: string;
  analysis: JDAnalysis;
  profile: UserProfile;
  stories: Experience[];
  company?: string;
  role?: string;
}

/**
 * Build profile context for interview prep
 */
function buildProfileContext(profile: UserProfile): string {
  const roles = profile.recentRoles
    .slice(0, 3)
    .map((r) => `- ${r.title} at ${r.company} (${r.duration})`)
    .join('\n');

  return `
Name: ${profile.name}
Headline: ${profile.headline}
Experience: ${profile.yearsExperience} years
Technical Skills: ${profile.technicalSkills.slice(0, 15).join(', ')}
Soft Skills: ${profile.softSkills.join(', ')}

Recent Roles:
${roles || 'No roles listed'}

Current Situation: ${profile.currentSituation}
`.trim();
}

/**
 * Build stories context with indices for matching
 */
function buildStoriesWithIndices(stories: Experience[]): string {
  return stories
    .slice(0, 10)
    .map(
      (s, i) =>
        `[${i}] ${s.title} - Tags: ${s.tags.join(', ')} - Result: ${s.star.result.slice(0, 80)}...`
    )
    .join('\n');
}

/**
 * Generate phone screen preparation materials
 */
export async function generatePhoneScreenPrep(
  params: PrepGenerationParams
): Promise<PhoneScreenPrep> {
  const ai = requireGemini();
  const { jobDescription, analysis, profile, company, role } = params;

  const profileContext = buildProfileContext(profile);

  const prompt = `You are helping prepare a candidate for a phone screen. Write all suggested answers and talking points AS the candidate would say them - natural, human voice.

## Candidate Profile
${profileContext}

## Target Position
Company: ${company || 'Not specified'}
Role: ${role || 'Not specified'}

## Job Description
${jobDescription.slice(0, 2000)}

## Analysis Summary
Fit Score: ${analysis.fitScore}/10
Matched Skills: ${analysis.analysisType !== 'freelance' ? analysis.matchedSkills.join(', ') : analysis.matchedSkills.join(', ')}
Missing Skills: ${analysis.missingSkills?.join(', ') || 'None identified'}
${analysis.analysisType === 'fulltime' || analysis.analysisType === 'contract' ? `Red Flags: ${analysis.redFlags?.join('; ') || 'None'}` : ''}

## CRITICAL: Sound Human, Not AI
All suggested answers and scripts MUST:
- Use contractions (I'm, I've, we'd, didn't)
- Sound conversational, not rehearsed or robotic
- Avoid: "I am excited", "I am passionate", "I believe", "leverage", "utilize", "synergy"
- Avoid: "Throughout my career", "In my current role", "This position aligns perfectly"
- Be specific with real numbers, project names, and concrete examples
- Vary sentence length - short punchy sentences mixed with longer explanations
- Never start more than 2 sentences in a row with "I"

## Your Task
Create phone screen preparation:

1. **Company Research Points**: Key facts to mention naturally - NOT generic platitudes
2. **Likely Questions**: Questions they'll ask with suggested answers in natural conversational voice
3. **Questions to Ask**: Smart questions showing genuine curiosity (not brown-nosing)
4. **Talking Points**: Specific achievements to weave in - with numbers
5. **Red Flag Responses**: How to address gaps honestly but positively (${analysis.missingSkills?.slice(0, 3).join(', ') || 'none'})
6. **Elevator Pitch**: A 30-second intro that sounds natural when spoken aloud
7. **Closing Statement**: A confident (not desperate) way to end

Make it sound like a real person talking, not a script.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: phoneScreenPrepSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 1.5 },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    const result = parseGeminiJson<any>(response.text, { context: 'generatePhoneScreenPrep' });

    return {
      companyResearchPoints: result.companyResearchPoints || [],
      likelyQuestions: result.likelyQuestions || [],
      questionsToAsk: result.questionsToAsk || [],
      talkingPoints: result.talkingPoints || [],
      redFlagResponses: result.redFlagResponses || [],
      elevatorPitch: result.elevatorPitch || '',
      closingStatement: result.closingStatement || '',
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Generate phone screen prep failed:', error);
    throw new Error(
      `Failed to generate phone screen prep: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate technical interview preparation materials
 */
export async function generateTechnicalInterviewPrep(
  params: PrepGenerationParams
): Promise<TechnicalInterviewPrep> {
  const ai = requireGemini();
  const { jobDescription, analysis, profile, stories, company, role } = params;

  const profileContext = buildProfileContext(profile);
  const storiesContext = buildStoriesWithIndices(stories);

  const prompt = `You are helping prepare a candidate for technical interviews. All suggested talking points and approaches should sound like natural human speech.

## Candidate Profile
${profileContext}

## Available Stories (with indices)
${storiesContext || 'No stories available'}

## Target Position
Company: ${company || 'Not specified'}
Role: ${role || 'Not specified'}

## Job Description
${jobDescription.slice(0, 2000)}

## Analysis Summary
Fit Score: ${analysis.fitScore}/10
Required Skills: ${analysis.analysisType !== 'freelance' ? analysis.requiredSkills?.join(', ') : analysis.requiredSkills?.join(', ')}
Matched Skills: ${analysis.matchedSkills?.join(', ')}
Missing Skills: ${analysis.missingSkills?.join(', ') || 'None'}

## CRITICAL: Sound Human, Not AI
When writing suggested approaches or talking points:
- Use natural language, not corporate speak
- Avoid: "leverage", "utilize", "innovative", "cutting-edge", "synergy"
- Be specific - name actual technologies, not just categories
- Include realistic trade-offs and honest limitations
- Sound like an engineer explaining to another engineer, not marketing copy

## Your Task
Create technical interview preparation:

1. **Focus Areas**: Main technical areas based on job requirements (be specific to their stack)
2. **Likely Topics**: Specific topics with depth level (basic/intermediate/deep) and practical notes
3. **Relevant Stories**: Story indices that best demonstrate technical competence (use actual indices)
4. **System Design Topics**: For senior roles - realistic design scenarios they might ask
5. **Coding Patterns**: Specific algorithms/patterns to review (not generic "know data structures")
6. **Behavioral Questions**: Technical behavioral questions with recommended story and natural approach
7. **Study Resources**: Specific resources with priority (high/medium/low) - actual book/course names
8. **Practice Problems**: Specific problems to practice (LeetCode numbers, system design scenarios)

Be practical and specific. Reference actual story indices where relevant.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: technicalInterviewPrepSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 2 },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    const result = parseGeminiJson<any>(response.text, { context: 'generateTechnicalInterviewPrep' });

    // Map story indices to IDs
    const relevantStoryIds = (result.relevantStoryIndices || [])
      .map((idx: number) => stories[idx]?.id)
      .filter(Boolean);

    return {
      focusAreas: result.focusAreas || [],
      likelyTopics: result.likelyTopics || [],
      relevantStoryIds,
      systemDesignTopics: result.systemDesignTopics || [],
      codingPatterns: result.codingPatterns || [],
      behavioralQuestions: (result.behavioralQuestions || []).map((q: any) => ({
        question: q.question,
        recommendedStoryId: q.recommendedStoryIndex !== undefined ? stories[q.recommendedStoryIndex]?.id : undefined,
        suggestedApproach: q.suggestedApproach,
      })),
      studyResources: result.studyResources || [],
      practiceProblems: result.practiceProblems || [],
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Generate technical interview prep failed:', error);
    throw new Error(
      `Failed to generate technical interview prep: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate application strategy and fit assessment
 */
export async function generateApplicationStrategy(
  params: PrepGenerationParams
): Promise<ApplicationStrategy> {
  const ai = requireGemini();
  const { jobDescription, analysis, profile, company, role } = params;

  const profileContext = buildProfileContext(profile);

  const prompt = `You are helping a candidate decide whether to apply and how to maximize their chances. Be direct and honest - no sugarcoating.

## Candidate Profile
${profileContext}

Salary Expectations: $${profile.preferences.salaryRange.min.toLocaleString()} - $${profile.preferences.salaryRange.max.toLocaleString()}
Work Style Preference: ${profile.preferences.workStyle}
Deal Breakers: ${profile.preferences.dealBreakers.join(', ') || 'None specified'}

## Target Position
Company: ${company || 'Not specified'}
Role: ${role || 'Not specified'}

## Job Description
${jobDescription.slice(0, 2000)}

## Analysis Summary
Fit Score: ${analysis.fitScore}/10
Reasoning: ${analysis.reasoning}
Matched Skills: ${analysis.matchedSkills?.join(', ')}
Missing Skills: ${analysis.missingSkills?.join(', ') || 'None'}
Red Flags: ${analysis.redFlags?.join('; ') || 'None'}
Green Flags: ${analysis.greenFlags?.join('; ') || 'None'}

## CRITICAL: Be Direct and Human
- Give honest assessments, not empty encouragement
- If it's a stretch, say so clearly
- Avoid corporate buzzwords and generic advice
- Be specific about what to actually do, not vague suggestions
- Write like you're giving advice to a friend, not a client

## Your Task
Provide a practical application strategy:

1. **Fit Assessment**:
   - Honest score and direct summary (don't sugarcoat)
   - Real strengths for this specific role
   - Gaps that matter (not just "could improve")
   - Deal breakers if any (be honest if this isn't worth pursuing)
   - Competitiveness: strong/moderate/weak with why

2. **Application Timing**: When to apply - be specific (not "ASAP")

3. **Customization Tips**: Concrete changes to make to resume/cover letter

4. **Networking Opportunities**: Realistic ways to connect (not "just network!")

5. **Salary Negotiation Notes**: Practical leverage points based on profile

6. **Application Checklist**: What actually matters vs. nice-to-haves

7. **Follow-up Strategy**: Specific timing and approach

Be honest. If this isn't a good fit, say so directly.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: applicationStrategySchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 1.5 },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    const result = parseGeminiJson<any>(response.text, { context: 'generateApplicationStrategy' });

    return {
      fitAssessment: {
        score: result.fitAssessment?.score ?? analysis.fitScore,
        summary: result.fitAssessment?.summary || '',
        strengths: result.fitAssessment?.strengths || [],
        gaps: result.fitAssessment?.gaps || [],
        dealBreakers: result.fitAssessment?.dealBreakers || [],
        competitiveness: result.fitAssessment?.competitiveness || 'moderate',
      },
      applicationTiming: result.applicationTiming || '',
      customizationTips: result.customizationTips || [],
      networkingOpportunities: result.networkingOpportunities || [],
      salaryNegotiationNotes: result.salaryNegotiationNotes || [],
      applicationChecklist: result.applicationChecklist || [],
      followUpStrategy: result.followUpStrategy || '',
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Generate application strategy failed:', error);
    throw new Error(
      `Failed to generate application strategy: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

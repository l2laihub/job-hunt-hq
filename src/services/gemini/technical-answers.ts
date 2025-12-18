import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { technicalAnswerSchema, followUpSchema } from './schemas';
import type {
  UserProfile,
  Experience,
  JobApplication,
  TechnicalQuestionType,
  AnswerFormatType,
  AnswerSection,
  FollowUpQA,
} from '@/src/types';

interface GenerateAnswerParams {
  question: string;
  profile: UserProfile;
  stories: Experience[];
  applicationContext?: JobApplication;
  difficulty?: 'junior' | 'mid' | 'senior' | 'staff';
}

interface GenerateAnswerResult {
  questionType: TechnicalQuestionType;
  format: {
    type: AnswerFormatType;
    sections: AnswerSection[];
  };
  answer: {
    structured: AnswerSection[];
    narrative: string;
    bulletPoints: string[];
  };
  sources: {
    storyIds: string[];
    profileSections: string[];
    synthesized: boolean;
  };
  suggestedTags: string[];
}

/**
 * Build a context string from the user's profile
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

Technical Skills: ${profile.technicalSkills.join(', ')}
Soft Skills: ${profile.softSkills.join(', ')}
Industries: ${profile.industries.join(', ')}

Recent Roles:
${roles || 'No roles listed'}

Key Achievements:
${achievements || 'No achievements listed'}

Current Situation: ${profile.currentSituation}
Goals: ${profile.goals.join(', ') || 'Not specified'}
`.trim();
}

/**
 * Generate a technical answer for an interview question
 */
export async function generateTechnicalAnswer(
  params: GenerateAnswerParams
): Promise<GenerateAnswerResult> {
  const ai = requireGemini();
  const { question, profile, stories, applicationContext, difficulty = 'mid' } = params;

  // Build context from profile
  const profileContext = buildProfileContext(profile);

  // Build stories context
  const storiesContext = stories.map((s, i) => ({
    index: i,
    id: s.id,
    title: s.title,
    tags: s.tags,
    summary: `${s.star.situation.slice(0, 150)}... Result: ${s.star.result.slice(0, 100)}...`,
    metrics: s.metrics?.primary || 'No metrics',
  }));

  // Build application context if provided
  const appContext = applicationContext
    ? `Target Role: ${applicationContext.role} at ${applicationContext.company}
       Job Type: ${applicationContext.type}
       ${applicationContext.analysis?.matchedSkills ? `Key Skills: ${applicationContext.analysis.matchedSkills.join(', ')}` : ''}`
    : '';

  const prompt = `You are an expert interview coach helping a candidate prepare technical interview answers.

## Candidate Profile
${profileContext}

## Available Stories/Experiences
${storiesContext.length > 0 ? JSON.stringify(storiesContext, null, 2) : 'No stories available'}

${appContext ? `## Target Position Context\n${appContext}` : ''}

## Interview Question
"${question}"

## Difficulty Level
${difficulty} (tailor complexity and depth accordingly)

## Your Task
1. AUTO-DETECT the question type:
   - "behavioral-technical": Hybrid question asking about past technical experiences (use STAR format)
   - "conceptual": Theory/explanation question (use Explain->Example->Tradeoffs format)
   - "system-design": Design a system question (use Requirements->Design->Tradeoffs format)
   - "problem-solving": Algorithm/coding question (use Approach->Implementation->Complexity format)
   - "experience": General experience question (use STAR format)

2. Generate a comprehensive answer using the appropriate format:
   - STAR: Situation, Task, Action, Result
   - Explain-Example-Tradeoffs: Concept explanation, Real example, Pros/cons
   - Requirements-Design-Tradeoffs: Requirements gathering, High-level design, Trade-offs discussion
   - Approach-Implementation-Complexity: Problem approach, Implementation steps, Time/space complexity

3. Reference specific stories from the candidate's experience bank where relevant (by index)

4. Note which profile sections you used (e.g., "technicalSkills", "recentRoles", "keyAchievements")

5. Provide the answer in multiple formats:
   - Structured: Section-by-section breakdown following the format
   - Narrative: Natural conversational flow (2-3 minute spoken response)
   - Bullet Points: Key points to remember

6. Suggest relevant tags for categorization

Be specific, use real metrics/numbers from the profile, and help the candidate tell a compelling story.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: technicalAnswerSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 2 },
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

    // Map story indices back to IDs
    const matchedStoryIds = (result.sources?.matchedStoryIndices || [])
      .map((idx: number) => stories[idx]?.id)
      .filter(Boolean);

    // Ensure answer has all required fields with defaults
    const answer = {
      structured: result.answer?.structured || [],
      narrative: result.answer?.narrative || '',
      bulletPoints: result.answer?.bulletPoints || [],
    };

    // Ensure format has required fields
    const format = {
      type: result.format?.type || 'STAR',
      sections: result.format?.sections || [],
    };

    return {
      questionType: result.questionType || 'conceptual',
      format,
      answer,
      sources: {
        storyIds: matchedStoryIds,
        profileSections: result.sources?.profileSectionsUsed || [],
        synthesized: result.sources?.synthesized || false,
      },
      suggestedTags: result.suggestedTags || [],
    };
  } catch (error) {
    console.error('Generate technical answer failed:', error);
    throw new Error(
      `Failed to generate answer: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate follow-up Q&A pairs for an answer
 */
export async function generateFollowUps(
  question: string,
  answer: string,
  profile: UserProfile,
  questionType: TechnicalQuestionType
): Promise<FollowUpQA[]> {
  const ai = requireGemini();

  const prompt = `You are an interview coach predicting follow-up questions.

## Original Question
"${question}"

## Candidate's Answer
${answer}

## Question Type
${questionType}

## Candidate Background
${profile.headline}, ${profile.yearsExperience} years experience
Skills: ${profile.technicalSkills.slice(0, 10).join(', ')}

## Task
Generate 3-5 likely follow-up questions an interviewer would ask based on this answer.
For each follow-up:
1. Estimate likelihood (high/medium/low) based on how common this follow-up is
2. Provide a suggested response that builds on the original answer
3. List 3-4 key points to emphasize

Focus on:
- Probing for specifics/details
- Testing depth of knowledge
- Challenging assumptions
- Exploring edge cases
- Asking about alternatives considered`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: followUpSchema,
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
    return result.followUps || [];
  } catch (error) {
    console.error('Generate follow-ups failed:', error);
    throw new Error(
      `Failed to generate follow-ups: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

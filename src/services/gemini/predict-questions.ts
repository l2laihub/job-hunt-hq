import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import type {
  UserProfile,
  JDAnalysis,
  CompanyResearch,
  Experience,
  PredictedQuestion,
  InterviewStage,
  QuestionCategory,
  LikelihoodLevel,
  DifficultyLevel,
} from '@/src/types';
import { generateId } from '@/src/lib/utils';

interface PredictQuestionsParams {
  profile: UserProfile;
  analysis: JDAnalysis;
  research?: CompanyResearch;
  stories: Experience[];
  interviewType: InterviewStage;
  company: string;
  role: string;
  /** Existing questions to avoid duplicating (for "generate more" feature) */
  existingQuestions?: PredictedQuestion[];
  /** Number of questions to generate (default: 12-15 for initial, 5 for additional) */
  count?: number;
}

interface PredictedQuestionRaw {
  question: string;
  category: QuestionCategory;
  likelihood: LikelihoodLevel;
  difficulty: DifficultyLevel;
  source: string;
  suggestedApproach?: string;
  bestStoryIndex?: number;
}

/**
 * Build profile context for AI
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
 * Build stories context with indices
 */
function buildStoriesContext(stories: Experience[]): string {
  if (stories.length === 0) return 'No stories available';

  return stories
    .slice(0, 10)
    .map(
      (s, i) =>
        `[${i}] ${s.title} - Tags: ${s.tags.join(', ')} - Result: ${s.star.result.slice(0, 100)}...`
    )
    .join('\n');
}

/**
 * Build company research context
 */
function buildResearchContext(research?: CompanyResearch): string {
  if (!research) return 'No company research available';

  return `
Industry: ${research.overview.industry}
Size: ${research.overview.size}
Culture Notes: ${research.engineeringCulture.notes || 'Unknown'}
Interview Topics: ${research.interviewIntel.commonTopics?.join(', ') || 'Unknown'}
Interview Difficulty: ${research.interviewIntel.interviewDifficulty || 'Unknown'}
Red Flags: ${research.redFlags.map(f => f.flag).join(', ') || 'None'}
Green Flags: ${research.greenFlags.map(f => f.flag).join(', ') || 'None'}
`.trim();
}

/**
 * Get interview type description
 */
function getInterviewTypeDescription(type: InterviewStage): string {
  const descriptions: Record<InterviewStage, string> = {
    'phone-screen': 'Initial phone screening with recruiter or hiring manager. Focus on background, motivation, and basic fit.',
    'technical': 'Technical interview focusing on coding, algorithms, and technical knowledge.',
    'behavioral': 'Behavioral interview using STAR format to assess past experiences and competencies.',
    'system-design': 'System design interview focusing on architecture, scalability, and technical decisions.',
    'hiring-manager': 'Interview with the direct hiring manager focusing on team fit and management alignment.',
    'final-round': 'Final round interview, often with senior leadership or cross-functional stakeholders.',
    'onsite': 'Full onsite interview day with multiple sessions covering various aspects.',
  };
  return descriptions[type] || 'General interview';
}

/**
 * Predict interview questions based on JD, company research, and profile
 */
export async function predictInterviewQuestions(
  params: PredictQuestionsParams
): Promise<PredictedQuestion[]> {
  const ai = requireGemini();
  const { profile, analysis, research, stories, interviewType, company, role, existingQuestions, count } = params;

  const profileContext = buildProfileContext(profile);
  const storiesContext = buildStoriesContext(stories);
  const researchContext = buildResearchContext(research);
  const typeDescription = getInterviewTypeDescription(interviewType);

  // Determine question count - default 12-15 for initial, 5 for additional
  const isGeneratingMore = existingQuestions && existingQuestions.length > 0;
  const questionCount = count ?? (isGeneratingMore ? 5 : 12);
  const questionCountText = isGeneratingMore ? `${questionCount} additional` : `${questionCount}-${questionCount + 3}`;

  // Build existing questions context for deduplication
  const existingQuestionsContext = isGeneratingMore
    ? `
## IMPORTANT: Questions Already Asked
The candidate already has the following questions prepared. DO NOT repeat or rephrase these questions.
Generate COMPLETELY NEW and DIFFERENT questions that cover OTHER aspects of the interview.

Existing questions to avoid:
${existingQuestions!.map((q, i) => `${i + 1}. [${q.category}] ${q.question}`).join('\n')}

You MUST generate questions that are distinctly different from all of the above.
`
    : '';

  const prompt = `You are an expert interview coach. Predict the specific questions this candidate will likely be asked in their upcoming interview.

## Candidate Profile
${profileContext}

## Target Position
Company: ${company}
Role: ${role}
Interview Type: ${interviewType}
Interview Description: ${typeDescription}

## Job Analysis
Fit Score: ${analysis.fitScore}/10
Required Skills: ${analysis.requiredSkills?.join(', ') || 'N/A'}
Matched Skills: ${analysis.matchedSkills?.join(', ')}
Skill Gaps: ${analysis.missingSkills?.join(', ') || 'None'}
${analysis.analysisType !== 'freelance' ? `Talking Points: ${(analysis as any).talkingPoints?.slice(0, 3).join('; ') || 'N/A'}` : ''}
${analysis.analysisType !== 'freelance' ? `Red Flags: ${(analysis as any).redFlags?.slice(0, 3).join('; ') || 'None'}` : ''}

## Company Research
${researchContext}

## Available Stories (reference by index if relevant)
${storiesContext}
${existingQuestionsContext}
## Your Task
Predict ${questionCountText} specific questions for a ${interviewType} interview at ${company} for the ${role} position.${isGeneratingMore ? ' These must be DIFFERENT from the existing questions listed above.' : ''}

For each question, provide:
1. **question**: The exact question they're likely to ask
2. **category**: One of: behavioral, technical, situational, role-specific, company-specific
3. **likelihood**: How likely this question will be asked - high (>70%), medium (40-70%), low (<40%)
4. **difficulty**: easy, medium, or hard
5. **source**: Why you predict this (e.g., "JD emphasizes microservices", "Common for ${interviewType}", "Based on skill gap in X")
6. **suggestedApproach**: Brief strategy to answer well (2-3 sentences)
7. **bestStoryIndex**: Index of the best matching story from the list above (or null if none match well)

## Guidelines
- Be specific to ${company} and this exact ${role} role
- Prioritize questions about their skill gaps (${analysis.missingSkills?.join(', ') || 'none'})
- Include questions about required skills they have (${analysis.matchedSkills?.slice(0, 5).join(', ')})
- For ${interviewType} interviews, focus on appropriate question types
- Don't give generic questions - make them specific to the JD and company
- Consider the company culture and recent news if research is available
- Keep "source" field brief (1-2 sentences max)
- Keep "suggestedApproach" field concise (2-3 sentences max)

Return a JSON object with a "questions" array containing all predicted questions.`;

  const schema = {
    type: 'object' as const,
    properties: {
      questions: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            question: { type: 'string' as const },
            category: {
              type: 'string' as const,
              enum: ['behavioral', 'technical', 'situational', 'role-specific', 'company-specific'],
            },
            likelihood: {
              type: 'string' as const,
              enum: ['high', 'medium', 'low'],
            },
            difficulty: {
              type: 'string' as const,
              enum: ['easy', 'medium', 'hard'],
            },
            source: { type: 'string' as const },
            suggestedApproach: { type: 'string' as const },
            bestStoryIndex: { type: 'number' as const },
          },
          required: ['question', 'category', 'likelihood', 'difficulty', 'source'],
        },
      },
    },
    required: ['questions'],
  };

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 2 },
        maxOutputTokens: 8192, // Ensure sufficient output space
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    let jsonText = response.text;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    // Try to parse, with fallback for truncated responses
    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (parseError) {
      // If JSON is truncated, try to salvage partial data
      console.warn('JSON parse failed, attempting to salvage partial response');

      // Try to find the last complete question object
      const questionsMatch = jsonText.match(/"questions"\s*:\s*\[([\s\S]*)/);
      if (questionsMatch) {
        const questionsContent = questionsMatch[1];
        // Find all complete question objects using a more robust pattern
        const completeObjects: PredictedQuestionRaw[] = [];
        let depth = 0;
        let start = -1;

        for (let i = 0; i < questionsContent.length; i++) {
          const char = questionsContent[i];
          if (char === '{') {
            if (depth === 0) start = i;
            depth++;
          } else if (char === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
              try {
                const objStr = questionsContent.substring(start, i + 1);
                const obj = JSON.parse(objStr);
                if (obj.question && obj.category) {
                  completeObjects.push(obj);
                }
              } catch {
                // Skip malformed object
              }
              start = -1;
            }
          }
        }

        if (completeObjects.length > 0) {
          console.log(`Salvaged ${completeObjects.length} questions from truncated response`);
          result = { questions: completeObjects };
        } else {
          throw parseError;
        }
      } else {
        throw parseError;
      }
    }

    // Transform raw questions to PredictedQuestion format
    return (result.questions || []).map((q: PredictedQuestionRaw): PredictedQuestion => ({
      id: generateId(),
      question: q.question,
      category: q.category,
      likelihood: q.likelihood,
      difficulty: q.difficulty,
      source: q.source,
      suggestedApproach: q.suggestedApproach,
      matchedStoryId: q.bestStoryIndex !== undefined && q.bestStoryIndex !== null && stories[q.bestStoryIndex]
        ? stories[q.bestStoryIndex].id
        : undefined,
      isPrepared: false,
      practiceCount: 0,
    }));
  } catch (error) {
    console.error('Predict questions failed:', error);
    throw new Error(
      `Failed to predict interview questions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Match a story to a specific question
 */
export async function matchStoryToQuestion(
  question: string,
  stories: Experience[],
  profile: UserProfile
): Promise<{ storyId: string; reasoning: string; openingLine: string } | null> {
  if (stories.length === 0) return null;

  const ai = requireGemini();

  const storiesContext = stories
    .map(
      (s, i) =>
        `[${i}] "${s.title}"
   Tags: ${s.tags.join(', ')}
   Situation: ${s.star.situation.slice(0, 100)}...
   Result: ${s.star.result.slice(0, 100)}...`
    )
    .join('\n\n');

  const prompt = `You are an interview coach. Match the best story to this interview question.

## Question
"${question}"

## Available Stories
${storiesContext}

## Candidate Background
${profile.headline} with ${profile.yearsExperience} years of experience.
Skills: ${profile.technicalSkills.slice(0, 10).join(', ')}

## Your Task
Select the BEST matching story for this question. If no story is a good fit, return null.

Return JSON with:
- storyIndex: Index of best story (or null if none fit)
- reasoning: Why this story fits (1-2 sentences)
- openingLine: How to start the answer naturally (1 sentence)`;

  const schema = {
    type: 'object' as const,
    properties: {
      storyIndex: { type: 'number' as const },
      reasoning: { type: 'string' as const },
      openingLine: { type: 'string' as const },
    },
    required: ['reasoning'],
  };

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    if (!response.text) return null;

    let jsonText = response.text;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonText);

    if (result.storyIndex === null || result.storyIndex === undefined) return null;
    if (!stories[result.storyIndex]) return null;

    return {
      storyId: stories[result.storyIndex].id,
      reasoning: result.reasoning || '',
      openingLine: result.openingLine || '',
    };
  } catch (error) {
    console.error('Match story to question failed:', error);
    return null;
  }
}

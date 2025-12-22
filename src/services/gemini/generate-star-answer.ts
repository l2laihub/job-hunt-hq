/**
 * AI Service: Generate STAR Answer for Interview Question
 *
 * Creates a tailored STAR-formatted answer based on user's profile,
 * the specific interview question, and job context.
 */

import { geminiClient, requireGemini } from './client';
import { Type, Schema } from '@google/genai';
import type { UserProfile, Experience, JDAnalysis, CompanyResearch, PredictedQuestion, FTEAnalysis } from '@/src/types';

export interface GenerateAnswerParams {
  question: PredictedQuestion;
  profile: UserProfile;
  analysis?: JDAnalysis;
  research?: CompanyResearch;
  company: string;
  role: string;
}

export interface GeneratedAnswer {
  title: string;
  star: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  metrics: {
    primary?: string;
    secondary: string[];
  };
  tags: string[];
  variations: {
    leadership?: string;
    technical?: string;
    challenge?: string;
  };
  followUpQuestions: string[];
  coachingNotes: string;
  keyTalkingPoints: string[];
  deliveryTips: string[];
}

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'A concise, memorable title for this story (e.g., "Led Platform Migration Under Tight Deadline")',
    },
    star: {
      type: Type.OBJECT,
      properties: {
        situation: {
          type: Type.STRING,
          description: 'The context and background - 2-3 sentences setting the scene',
        },
        task: {
          type: Type.STRING,
          description: 'Your specific responsibility or challenge - 1-2 sentences',
        },
        action: {
          type: Type.STRING,
          description: 'The specific steps YOU took (use "I" not "we") - 3-5 sentences with concrete details',
        },
        result: {
          type: Type.STRING,
          description: 'Quantified outcomes and impact - 2-3 sentences with metrics',
        },
      },
      required: ['situation', 'task', 'action', 'result'],
    },
    metrics: {
      type: Type.OBJECT,
      properties: {
        primary: {
          type: Type.STRING,
          description: 'The most impressive quantified result (e.g., "Reduced deployment time by 60%")',
        },
        secondary: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Additional metrics and outcomes',
        },
      },
      required: ['secondary'],
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Skills and themes demonstrated (e.g., ["leadership", "problem-solving", "technical", "collaboration"])',
    },
    variations: {
      type: Type.OBJECT,
      properties: {
        leadership: {
          type: Type.STRING,
          description: 'Alternative emphasis for leadership-focused questions',
        },
        technical: {
          type: Type.STRING,
          description: 'Alternative emphasis for technical deep-dive questions',
        },
        challenge: {
          type: Type.STRING,
          description: 'Alternative emphasis for challenge/failure questions',
        },
      },
    },
    followUpQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Likely follow-up questions the interviewer might ask',
    },
    coachingNotes: {
      type: Type.STRING,
      description: 'Tips for delivering this answer effectively',
    },
    keyTalkingPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key points to remember when delivering this answer',
    },
    deliveryTips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Tips for tone, pacing, and presentation',
    },
  },
  required: ['title', 'star', 'metrics', 'tags', 'followUpQuestions', 'coachingNotes', 'keyTalkingPoints', 'deliveryTips'],
};

// Helper to check if analysis is FTE type
function isFTEAnalysis(analysis: JDAnalysis): analysis is FTEAnalysis {
  return analysis.analysisType === 'fulltime';
}

export async function generateStarAnswer(params: GenerateAnswerParams): Promise<GeneratedAnswer> {
  requireGemini();

  const { question, profile, analysis, research, company, role } = params;

  // Build context from profile
  const profileContext = `
## Candidate Profile
- Name: ${profile.name}
- Headline: ${profile.headline}
- Years of Experience: ${profile.yearsExperience}
- Technical Skills: ${profile.technicalSkills.join(', ')}
- Soft Skills: ${profile.softSkills.join(', ')}
- Industries: ${profile.industries.join(', ')}

### Key Achievements
${profile.keyAchievements.map((a, i) => `${i + 1}. ${a.description}${a.metrics ? ` (${a.metrics})` : ''}`).join('\n')}

### Recent Roles
${profile.recentRoles.map(r => `- ${r.title} at ${r.company} (${r.duration})\n  Highlights: ${r.highlights.join('; ')}`).join('\n')}

### Active Projects
${profile.activeProjects.map(p => `- ${p.name}: ${p.description}`).join('\n')}
`;

  // Build job context - handle different analysis types
  let jobContext = `
## Target Job Context
- Company: ${company}
- Role: ${role}
`;

  if (analysis) {
    jobContext += `- Fit Score: ${analysis.fitScore}/10\n`;
    jobContext += `- Key Requirements: ${analysis.matchedSkills?.join(', ') || 'N/A'}\n`;

    // FTE analysis has talkingPoints as string array
    if (isFTEAnalysis(analysis) && analysis.talkingPoints) {
      jobContext += `- Skills to Emphasize: ${analysis.talkingPoints.join('; ')}\n`;
    }
  }

  // Build company context
  let companyContext = '';
  if (research) {
    companyContext = `
## Company Intelligence
- Industry: ${research.overview?.industry || 'N/A'}
- Size: ${research.overview?.size || 'N/A'}
- Engineering Culture: ${research.engineeringCulture?.notes || 'N/A'}
- Interview Focus: ${research.interviewIntel?.commonTopics?.join(', ') || 'N/A'}
`;
  }

  const prompt = `You are an expert interview coach helping a candidate prepare the perfect STAR-formatted answer for an interview question.

${profileContext}

${jobContext}

${companyContext}

## The Interview Question
"${question.question}"

- Category: ${question.category}
- Likelihood: ${question.likelihood}
- Difficulty: ${question.difficulty}
- Source: ${question.source}
${question.suggestedApproach ? `- Suggested Approach: ${question.suggestedApproach}` : ''}

## Your Task

Create a compelling STAR-formatted answer that:
1. **Draws from the candidate's REAL experience** - Use their actual achievements, roles, and projects
2. **Highlights relevant skills** for this specific ${role} role at ${company}
3. **Includes quantified results** with realistic metrics based on their background
4. **Sounds authentic** - Match the candidate's experience level and industry
5. **Addresses what the interviewer is really asking** - ${question.category} questions look for specific competencies

## Important Guidelines
- Use "I" statements, not "we" - the candidate should own their contributions
- Keep the total answer deliverable in 2-3 minutes
- Make metrics realistic and consistent with their experience level
- The story should be specific and memorable, not generic
- Include concrete details that demonstrate expertise
- Anticipate follow-up questions the interviewer might ask

Generate a complete, interview-ready STAR answer based on the candidate's actual background.`;

  const result = await geminiClient!.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.7,
    },
  });

  const text = result.text || '';

  try {
    const parsed = JSON.parse(text) as GeneratedAnswer;
    return parsed;
  } catch (error) {
    console.error('Failed to parse generated answer:', error);
    throw new Error('Failed to generate STAR answer. Please try again.');
  }
}

/**
 * Convert a GeneratedAnswer to an Experience object for saving to stories
 */
export function answerToExperience(
  answer: GeneratedAnswer,
  question: string,
  profileId?: string
): Partial<Experience> {
  return {
    title: answer.title,
    rawInput: `Generated answer for: "${question}"`,
    inputMethod: 'import' as const,
    star: answer.star,
    metrics: answer.metrics,
    tags: answer.tags,
    variations: answer.variations,
    followUpQuestions: answer.followUpQuestions,
    coachingNotes: answer.coachingNotes,
    profileId,
  };
}

export interface RefineAnswerParams {
  currentAnswer: GeneratedAnswer;
  refinementFeedback: string;
  question: string;
  company: string;
  role: string;
}

/**
 * Refine an existing STAR answer based on user feedback.
 * Takes the current answer and user's refinement instructions to improve it.
 */
export async function refineStarAnswer(params: RefineAnswerParams): Promise<GeneratedAnswer> {
  requireGemini();

  const { currentAnswer, refinementFeedback, question, company, role } = params;

  const prompt = `You are an expert interview coach. A candidate has generated a STAR-formatted answer and wants to refine it based on their feedback.

## Current Answer

**Title:** ${currentAnswer.title}

**Situation:**
${currentAnswer.star.situation}

**Task:**
${currentAnswer.star.task}

**Action:**
${currentAnswer.star.action}

**Result:**
${currentAnswer.star.result}

**Key Metric:** ${currentAnswer.metrics.primary || 'None specified'}
**Secondary Metrics:** ${currentAnswer.metrics.secondary.join(', ') || 'None'}
**Tags:** ${currentAnswer.tags.join(', ')}

**Coaching Notes:** ${currentAnswer.coachingNotes}

**Key Talking Points:**
${currentAnswer.keyTalkingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

**Delivery Tips:**
${currentAnswer.deliveryTips.map((t, i) => `${i + 1}. ${t}`).join('\n')}

**Follow-up Questions:**
${currentAnswer.followUpQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## Interview Context
- Question: "${question}"
- Company: ${company}
- Role: ${role}

## User's Refinement Request
"${refinementFeedback}"

## Your Task

Refine the answer based on the user's feedback. Common refinement requests include:
- Making it more concise or detailed
- Emphasizing different skills or achievements
- Adding or changing metrics
- Making it sound more natural/conversational
- Focusing on leadership, technical depth, or problem-solving
- Changing the story angle or emphasis
- Improving specific sections (Situation, Task, Action, or Result)

Apply the user's feedback while:
1. Maintaining the STAR structure
2. Keeping the answer authentic and specific
3. Preserving metrics and concrete details (unless asked to change)
4. Ensuring the answer still addresses the interview question
5. Keeping the total answer deliverable in 2-3 minutes

Generate the complete refined answer.`;

  const result = await geminiClient!.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.7,
    },
  });

  const text = result.text || '';

  try {
    const parsed = JSON.parse(text) as GeneratedAnswer;
    return parsed;
  } catch (error) {
    console.error('Failed to parse refined answer:', error);
    throw new Error('Failed to refine STAR answer. Please try again.');
  }
}

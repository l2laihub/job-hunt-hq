import { Type, Schema } from '@google/genai';
import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import type { PredictedQuestion } from '@/src/types/interview-prep';

/**
 * STAR method adherence tracking
 */
export interface StarAdherence {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
  score: number; // 0-4 based on how many elements present
}

/**
 * Comparison to prepared answer
 */
export interface PreparedAnswerComparison {
  similarity: number; // 0-100%
  keyPointsCovered: string[];
  keyPointsMissed: string[];
  additionalPoints: string[]; // Good points user made that weren't in prepared answer
}

/**
 * Full response evaluation result
 */
export interface ResponseEvaluation {
  score: number; // 1-10
  starAdherence: StarAdherence;
  preparedAnswerComparison?: PreparedAnswerComparison;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  improvementTips: string[];
  suggestedFollowUp?: string; // What interviewer might ask next
}

/**
 * Schema for response evaluation
 */
const responseEvaluationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.NUMBER,
      description: 'Overall score from 1-10. Consider content quality, relevance, and delivery.',
    },
    starAdherence: {
      type: Type.OBJECT,
      properties: {
        situation: { type: Type.BOOLEAN, description: 'Did they clearly set the context/situation?' },
        task: { type: Type.BOOLEAN, description: 'Did they explain their specific responsibility/task?' },
        action: { type: Type.BOOLEAN, description: 'Did they describe the actions they personally took?' },
        result: { type: Type.BOOLEAN, description: 'Did they share measurable outcomes/results?' },
        score: { type: Type.NUMBER, description: 'Count of STAR elements present (0-4)' },
      },
      required: ['situation', 'task', 'action', 'result', 'score'],
    },
    preparedAnswerComparison: {
      type: Type.OBJECT,
      description: 'Only include if a prepared answer was provided for comparison',
      properties: {
        similarity: { type: Type.NUMBER, description: 'How similar to prepared answer (0-100%)' },
        keyPointsCovered: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Key points from prepared answer that user covered',
        },
        keyPointsMissed: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Key points from prepared answer that user missed',
        },
        additionalPoints: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Good points user made that were not in prepared answer',
        },
      },
      required: ['similarity', 'keyPointsCovered', 'keyPointsMissed', 'additionalPoints'],
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Top 2-3 things the candidate did well',
    },
    weaknesses: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Top 2-3 areas for improvement',
    },
    feedback: {
      type: Type.STRING,
      description: 'Concise, encouraging feedback paragraph (2-3 sentences)',
    },
    improvementTips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific, actionable tips to improve this answer (2-4 tips)',
    },
    suggestedFollowUp: {
      type: Type.STRING,
      description: 'A likely follow-up question an interviewer might ask based on this response',
    },
  },
  required: ['score', 'starAdherence', 'strengths', 'weaknesses', 'feedback', 'improvementTips'],
};

/**
 * Evaluate a user's interview response
 */
export async function evaluateInterviewResponse(
  question: PredictedQuestion,
  userResponse: string,
  preparedAnswer?: string,
  context?: {
    jobRole?: string;
    company?: string;
    interviewType?: string;
  }
): Promise<ResponseEvaluation> {
  const ai = requireGemini();

  const contextInfo = context
    ? `
## Interview Context
Role: ${context.jobRole || 'Software Engineer'}
Company: ${context.company || 'Tech Company'}
Interview Type: ${context.interviewType || 'General'}
`
    : '';

  const preparedAnswerSection = preparedAnswer
    ? `
## Prepared Answer (for comparison)
${preparedAnswer}

IMPORTANT: Compare the user's response to this prepared answer. Identify which key points were covered and which were missed.
`
    : '';

  const prompt = `You are an experienced interview coach evaluating a candidate's response to an interview question.

${contextInfo}

## Question
Category: ${question.category}
Difficulty: ${question.difficulty}
Question: ${question.question}

## Candidate's Response
${userResponse}
${preparedAnswerSection}

## Evaluation Task
Provide a thorough but encouraging evaluation:

1. **Score (1-10)**: Be fair but constructive
   - 1-3: Answer misses the point or is too vague
   - 4-5: Acceptable but needs significant improvement
   - 6-7: Good answer with room for polish
   - 8-9: Strong answer, well-structured
   - 10: Exceptional, interview-ready

2. **STAR Method Adherence**: For ${question.category === 'behavioral' ? 'behavioral questions like this, STAR format is expected' : 'non-behavioral questions, STAR may be optional but still useful'}

3. **Comparison to Prepared Answer**: ${preparedAnswer ? 'Compare key points covered vs missed' : 'Skip this section (no prepared answer provided)'}

4. **Strengths & Weaknesses**: Be specific and actionable

5. **Improvement Tips**: Focus on what they can practice

Be encouraging but honest. The goal is to help them improve.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseEvaluationSchema,
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

    return JSON.parse(jsonText) as ResponseEvaluation;
  } catch (error) {
    console.error('Response evaluation failed:', error);
    throw new Error(
      `Failed to evaluate response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate quick feedback for live interview mode
 * Optimized for lower latency with shorter response
 */
export async function generateQuickFeedback(
  question: string,
  userResponse: string
): Promise<{ score: number; feedback: string; tip: string }> {
  const ai = requireGemini();

  const quickFeedbackSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.NUMBER, description: 'Score 1-10' },
      feedback: { type: Type.STRING, description: 'One sentence feedback' },
      tip: { type: Type.STRING, description: 'One actionable tip' },
    },
    required: ['score', 'feedback', 'tip'],
  };

  const prompt = `Quick interview response evaluation:

Question: ${question}
Response: ${userResponse}

Provide a score (1-10), one sentence of feedback, and one tip.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: quickFeedbackSchema,
        thinkingConfig: { thinkingBudget: 512 },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    let jsonText = response.text;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Quick feedback failed:', error);
    return {
      score: 5,
      feedback: 'Unable to evaluate response.',
      tip: 'Try to structure your answer using the STAR method.',
    };
  }
}

/**
 * Generate a summary evaluation for an entire interview session
 */
export async function generateSessionSummary(
  questionResults: Array<{
    question: string;
    category: string;
    userResponse: string;
    score: number;
  }>,
  context?: {
    jobRole?: string;
    company?: string;
    duration: number;
  }
): Promise<{
  overallScore: number;
  categoryScores: Record<string, number>;
  topStrengths: string[];
  priorityImprovements: string[];
  summary: string;
  nextSteps: string[];
}> {
  const ai = requireGemini();

  const summarySchema: Schema = {
    type: Type.OBJECT,
    properties: {
      overallScore: { type: Type.NUMBER },
      categoryScores: {
        type: Type.OBJECT,
        description: 'Average scores by question category. Keys are category names, values are average scores.',
        properties: {
          behavioral: { type: Type.NUMBER, description: 'Average score for behavioral questions' },
          technical: { type: Type.NUMBER, description: 'Average score for technical questions' },
          situational: { type: Type.NUMBER, description: 'Average score for situational questions' },
        },
      },
      topStrengths: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Top 3 things candidate did well across all questions',
      },
      priorityImprovements: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Top 3 areas to focus on for improvement',
      },
      summary: {
        type: Type.STRING,
        description: 'Overall assessment paragraph (3-4 sentences)',
      },
      nextSteps: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Specific practice recommendations (2-4 items)',
      },
    },
    required: ['overallScore', 'categoryScores', 'topStrengths', 'priorityImprovements', 'summary', 'nextSteps'],
  };

  const questionsText = questionResults
    .map(
      (q, i) =>
        `Question ${i + 1} [${q.category}] (Score: ${q.score}/10):
Q: ${q.question}
A: ${q.userResponse.substring(0, 500)}${q.userResponse.length > 500 ? '...' : ''}`
    )
    .join('\n\n');

  const prompt = `You are an interview coach summarizing a practice interview session.

## Session Context
Role: ${context?.jobRole || 'Software Engineer'}
Company: ${context?.company || 'Tech Company'}
Duration: ${context?.duration ? Math.round(context.duration / 60) + ' minutes' : 'Unknown'}
Questions Answered: ${questionResults.length}

## Question & Answer Review
${questionsText}

## Task
Provide a comprehensive but encouraging summary:
1. Calculate overall score (weighted average, considering difficulty)
2. Group scores by category
3. Identify patterns in strengths and weaknesses
4. Give specific, actionable next steps

Focus on growth and improvement. Be encouraging but honest about areas needing work.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: summarySchema,
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

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Session summary failed:', error);
    throw new Error(
      `Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

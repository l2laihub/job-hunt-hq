/**
 * Assistant Action Handlers
 *
 * These functions provide wrappers around core services for use by the AI assistant
 * when performing actions on behalf of the user in the question-detail context.
 */

import type {
  UserProfile,
  Experience,
  JDAnalysis,
  CompanyResearch,
  GeneratedAnswerMetadata,
} from '@/src/types';
import type { PredictedQuestion, InterviewPrepSession } from '@/src/types/interview-prep';
import {
  generateInterviewAnswer,
  refineInterviewAnswer,
  type GeneratedInterviewAnswer,
  type GenerateInterviewAnswerParams,
  type RefineInterviewAnswerParams,
} from './generate-interview-answer';
import { generateId } from '@/src/lib/utils';

// ============================================
// TYPES
// ============================================

export interface AssistantGenerateAnswerParams {
  question: PredictedQuestion;
  profile: UserProfile;
  stories: Experience[];
  analysis?: JDAnalysis;
  research?: CompanyResearch;
  company: string;
  role: string;
}

export interface AssistantGenerateAnswerResult {
  success: boolean;
  story?: Experience;
  error?: string;
}

export interface AssistantRefineAnswerParams {
  currentStory: Experience;
  feedback: string;
  question: string;
  company: string;
  role: string;
}

export interface AssistantRefineAnswerResult {
  success: boolean;
  updatedStory?: Experience;
  error?: string;
}

export interface AssistantAddQuestionParams {
  sessionId: string;
  questionText: string;
  category?: PredictedQuestion['category'];
  likelihood?: PredictedQuestion['likelihood'];
  difficulty?: PredictedQuestion['difficulty'];
}

export interface AssistantAddQuestionResult {
  success: boolean;
  question?: PredictedQuestion;
  error?: string;
}

export interface AssistantUpdateQuestionParams {
  sessionId: string;
  questionId: string;
  updates: Partial<Pick<PredictedQuestion, 'question' | 'category' | 'likelihood' | 'difficulty' | 'suggestedApproach'>>;
}

export interface AssistantUpdateQuestionResult {
  success: boolean;
  question?: PredictedQuestion;
  error?: string;
}

// ============================================
// ACTION HANDLERS
// ============================================

/**
 * Generate an answer for an interview question
 * Returns a new Experience object that can be saved to the store
 */
export async function assistantGenerateAnswer(
  params: AssistantGenerateAnswerParams
): Promise<AssistantGenerateAnswerResult> {
  try {
    const answer = await generateInterviewAnswer(params);

    // Convert GeneratedInterviewAnswer to Experience
    const story = convertAnswerToExperience(answer, params.question);

    return {
      success: true,
      story,
    };
  } catch (error) {
    console.error('Assistant failed to generate answer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate answer',
    };
  }
}

/**
 * Refine an existing answer based on user feedback
 * Returns an updated Experience object
 */
export async function assistantRefineAnswer(
  params: AssistantRefineAnswerParams
): Promise<AssistantRefineAnswerResult> {
  try {
    const { currentStory, feedback, question, company, role } = params;

    // Convert story back to GeneratedInterviewAnswer format
    const metadata = currentStory.generatedAnswerMetadata;
    if (!metadata) {
      return {
        success: false,
        error: 'Story does not have generated answer metadata - cannot refine',
      };
    }

    const currentAnswer: GeneratedInterviewAnswer = {
      detectedQuestionType: metadata.detectedQuestionType,
      answerFormat: metadata.answerFormat,
      title: currentStory.title,
      sections: metadata.sections,
      narrative: metadata.narrative,
      bulletPoints: metadata.bulletPoints,
      star: currentStory.star,
      metrics: currentStory.metrics,
      sources: metadata.sources,
      tags: currentStory.tags,
      keyTalkingPoints: metadata.keyTalkingPoints,
      deliveryTips: metadata.deliveryTips,
      followUpQuestions: metadata.followUpQA,
      coachingNotes: currentStory.coachingNotes || '',
      variations: currentStory.variations,
    };

    const refinedAnswer = await refineInterviewAnswer({
      currentAnswer,
      refinementFeedback: feedback,
      question,
      company,
      role,
    });

    // Convert back to Experience
    const updatedMetadata: GeneratedAnswerMetadata = {
      detectedQuestionType: refinedAnswer.detectedQuestionType,
      answerFormat: refinedAnswer.answerFormat,
      sections: refinedAnswer.sections,
      narrative: refinedAnswer.narrative,
      bulletPoints: refinedAnswer.bulletPoints,
      keyTalkingPoints: refinedAnswer.keyTalkingPoints,
      deliveryTips: refinedAnswer.deliveryTips,
      followUpQA: refinedAnswer.followUpQuestions,
      sources: refinedAnswer.sources,
    };

    const updatedStory: Experience = {
      ...currentStory,
      title: refinedAnswer.title,
      star: refinedAnswer.star || currentStory.star,
      metrics: refinedAnswer.metrics,
      tags: refinedAnswer.tags,
      coachingNotes: refinedAnswer.coachingNotes,
      variations: refinedAnswer.variations,
      generatedAnswerMetadata: updatedMetadata,
      updatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      updatedStory,
    };
  } catch (error) {
    console.error('Assistant failed to refine answer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refine answer',
    };
  }
}

/**
 * Create a new predicted question and add it to a session
 * Returns the new question that can be added to the store
 */
export function assistantAddQuestion(
  params: AssistantAddQuestionParams
): AssistantAddQuestionResult {
  try {
    const { questionText, category = 'behavioral', likelihood = 'medium', difficulty = 'medium' } = params;

    const question: PredictedQuestion = {
      id: generateId(),
      question: questionText,
      category,
      likelihood,
      difficulty,
      source: 'AI Assistant suggestion',
      suggestedApproach: '',
      isPrepared: false,
      practiceCount: 0,
    };

    return {
      success: true,
      question,
    };
  } catch (error) {
    console.error('Assistant failed to add question:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add question',
    };
  }
}

/**
 * Update an existing question's metadata
 * Returns the updated question
 */
export function assistantUpdateQuestion(
  params: AssistantUpdateQuestionParams,
  existingQuestion: PredictedQuestion
): AssistantUpdateQuestionResult {
  try {
    const { updates } = params;

    const updatedQuestion: PredictedQuestion = {
      ...existingQuestion,
      ...updates,
    };

    return {
      success: true,
      question: updatedQuestion,
    };
  } catch (error) {
    console.error('Assistant failed to update question:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update question',
    };
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Convert a GeneratedInterviewAnswer to an Experience object
 */
function convertAnswerToExperience(
  answer: GeneratedInterviewAnswer,
  question: PredictedQuestion
): Experience {
  const now = new Date().toISOString();

  // Build metadata for generated answers
  const metadata: GeneratedAnswerMetadata = {
    detectedQuestionType: answer.detectedQuestionType,
    answerFormat: answer.answerFormat,
    sections: answer.sections,
    narrative: answer.narrative,
    bulletPoints: answer.bulletPoints,
    keyTalkingPoints: answer.keyTalkingPoints,
    deliveryTips: answer.deliveryTips,
    followUpQA: answer.followUpQuestions,
    sources: answer.sources,
  };

  // Create the Experience object
  const experience: Experience = {
    id: generateId(),
    title: answer.title,
    dateRange: '', // Not applicable for generated answers
    context: `Generated answer for: "${question.question}"`,
    star: answer.star || {
      situation: '',
      task: '',
      action: '',
      result: '',
    },
    metrics: answer.metrics,
    tags: answer.tags,
    isHighlight: false,
    coachingNotes: answer.coachingNotes,
    variations: answer.variations,
    followUpQuestions: answer.followUpQuestions.map((fq) => fq.question),
    generatedAnswerMetadata: metadata,
    createdAt: now,
    updatedAt: now,
  };

  return experience;
}

/**
 * Check if a story has valid generated answer metadata
 */
export function hasValidGeneratedMetadata(story: Experience): boolean {
  return (
    !!story.generatedAnswerMetadata &&
    !!story.generatedAnswerMetadata.narrative &&
    story.generatedAnswerMetadata.sections.length > 0
  );
}

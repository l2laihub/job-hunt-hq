// Interview Prep Hub Types

import type { PhoneScreenPrep, TechnicalInterviewPrep, ApplicationStrategy } from './index';

// Interview stage types
export type InterviewStage =
  | 'phone-screen'
  | 'technical'
  | 'behavioral'
  | 'system-design'
  | 'hiring-manager'
  | 'final-round'
  | 'onsite';

// Preparation item status
export type PrepItemStatus = 'not-started' | 'in-progress' | 'completed' | 'skipped';

// Checklist item categories
export type PrepCategory = 'research' | 'stories' | 'technical' | 'questions' | 'logistics';

// Checklist priority levels
export type PrepPriority = 'required' | 'recommended' | 'optional';

// Linked resource types
export type LinkedResourceType = 'story' | 'answer' | 'research' | 'analysis';

// Question categories
export type QuestionCategory =
  | 'behavioral'
  | 'technical'
  | 'situational'
  | 'role-specific'
  | 'company-specific';

// Likelihood levels
export type LikelihoodLevel = 'high' | 'medium' | 'low';

// Difficulty levels
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// Practice mode types
export type PracticeMode = 'quick' | 'timed' | 'mock';

/**
 * Checklist item for interview preparation
 */
export interface PrepChecklistItem {
  id: string;
  category: PrepCategory;
  label: string;
  description?: string;
  status: PrepItemStatus;
  priority: PrepPriority;
  linkedResourceId?: string;
  linkedResourceType?: LinkedResourceType;
  completedAt?: string;
}

/**
 * AI-predicted interview question
 */
export interface PredictedQuestion {
  id: string;
  question: string;
  category: QuestionCategory;
  likelihood: LikelihoodLevel;
  difficulty: DifficultyLevel;
  source: string; // Why this question is predicted (e.g., "JD mentions microservices")
  matchedStoryId?: string;
  matchedAnswerId?: string;
  suggestedApproach?: string;
  isPrepared: boolean;
  practiceCount: number;
}

/**
 * Quick reference content for interview day
 */
export interface QuickReference {
  elevatorPitch: string;
  topStories: string[]; // Story IDs
  talkingPoints: string[];
  questionsToAsk: string[];
  companyFacts: string[];
  generatedAt: string;
}

/**
 * AI evaluation result saved with practice session
 */
export interface PracticeAIEvaluation {
  score: number; // 1-10
  starScore: number; // 0-4
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  improvementTips: string[];
  similarity?: number; // 0-100% if prepared answer was compared
}

/**
 * Practice session record
 */
export interface PrepPracticeSession {
  id: string;
  sessionId: string; // Parent InterviewPrepSession
  mode: PracticeMode;
  questionIds: string[]; // Questions practiced
  durationSeconds: number;
  selfRating?: number; // 1-5
  notes?: string;
  audioBlob?: string; // Base64 encoded
  audioMimeType?: string;
  createdAt: string;
  // AI-powered evaluation (optional)
  aiEvaluation?: PracticeAIEvaluation;
  transcript?: string; // User's response transcript
}

/**
 * Main interview preparation session
 */
export interface InterviewPrepSession {
  id: string;
  applicationId: string;
  profileId?: string;

  // Scheduling
  interviewDate?: string;
  interviewTime?: string;
  interviewType: InterviewStage;
  interviewerName?: string;
  interviewerRole?: string;
  interviewLocation?: string; // URL for virtual or address for in-person
  notes?: string;

  // Preparation state
  checklist: PrepChecklistItem[];
  predictedQuestions: PredictedQuestion[];
  readinessScore: number; // 0-100 calculated from prep completion

  // Generated content (from existing AI services)
  phoneScreenPrep?: PhoneScreenPrep;
  technicalPrep?: TechnicalInterviewPrep;
  applicationStrategy?: ApplicationStrategy;

  // Quick reference for interview day
  quickReference?: QuickReference;

  // Practice tracking
  practiceSessionIds: string[];
  lastPracticedAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Dashboard statistics
 */
export interface PrepDashboardStats {
  totalApplications: number;
  interviewingCount: number;
  preparedCount: number; // readinessScore >= 70
  unpreparedCount: number;
  upcomingInterviews: UpcomingInterview[];
}

/**
 * Upcoming interview summary
 */
export interface UpcomingInterview {
  applicationId: string;
  sessionId: string;
  date: string;
  time?: string;
  company: string;
  role: string;
  interviewType: InterviewStage;
  readinessScore: number;
}

/**
 * Question prediction request params
 */
export interface PredictQuestionsParams {
  applicationId: string;
  interviewType: InterviewStage;
  includeCompanyResearch?: boolean;
}

/**
 * Question prediction result
 */
export interface PredictQuestionsResult {
  questions: PredictedQuestion[];
  generatedAt: string;
}

/**
 * Quick reference generation params
 */
export interface GenerateQuickRefParams {
  sessionId: string;
  includeAllStories?: boolean;
  maxTalkingPoints?: number;
  maxQuestions?: number;
}

// Constants for interview stages
export const INTERVIEW_STAGES: { value: InterviewStage; label: string; description: string }[] = [
  { value: 'phone-screen', label: 'Phone Screen', description: 'Initial screening call with recruiter or hiring manager' },
  { value: 'technical', label: 'Technical', description: 'Coding, algorithms, or technical knowledge assessment' },
  { value: 'behavioral', label: 'Behavioral', description: 'STAR-format questions about past experiences' },
  { value: 'system-design', label: 'System Design', description: 'Architecture and system design discussions' },
  { value: 'hiring-manager', label: 'Hiring Manager', description: 'Interview with the direct manager' },
  { value: 'final-round', label: 'Final Round', description: 'Final interviews before offer decision' },
  { value: 'onsite', label: 'Onsite', description: 'Multiple interviews at company location' },
];

// Constants for question categories
export const QUESTION_CATEGORIES: { value: QuestionCategory; label: string; color: string }[] = [
  { value: 'behavioral', label: 'Behavioral', color: 'purple' },
  { value: 'technical', label: 'Technical', color: 'blue' },
  { value: 'situational', label: 'Situational', color: 'green' },
  { value: 'role-specific', label: 'Role-Specific', color: 'yellow' },
  { value: 'company-specific', label: 'Company-Specific', color: 'pink' },
];

// Constants for likelihood levels
export const LIKELIHOOD_LEVELS: { value: LikelihoodLevel; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'red' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'low', label: 'Low', color: 'gray' },
];

// ============================================
// ENHANCED MOCK INTERVIEW TYPES
// ============================================

/**
 * Enhanced interview configuration with prep session context
 */
export interface EnhancedInterviewConfig {
  // Base config
  type: 'behavioral' | 'technical' | 'system-design' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number; // minutes

  // Prep session integration
  prepSessionId: string;
  applicationId: string;

  // Question selection
  questionPriority: 'unpracticed' | 'high-likelihood' | 'random' | 'custom';
  selectedQuestionIds?: string[]; // For custom selection
  maxQuestions?: number; // Limit number of questions

  // Feedback settings
  showPreparedAnswers: boolean; // Show prepared answer after each response
  enablePerQuestionFeedback: boolean; // Evaluate after each question

  // Focus areas
  focusCategories?: QuestionCategory[]; // Filter by category
}

/**
 * STAR adherence tracking
 */
export interface StarAdherence {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
  score: number; // 0-4 based on elements present
}

/**
 * Comparison to prepared answer
 */
export interface PreparedAnswerComparison {
  similarity: number; // 0-100%
  keyPointsCovered: string[];
  keyPointsMissed: string[];
  additionalPoints: string[]; // Good points not in prepared answer
}

/**
 * Per-question evaluation result
 */
export interface QuestionEvaluation {
  score: number; // 1-10
  starAdherence: StarAdherence;
  preparedAnswerComparison?: PreparedAnswerComparison;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  improvementTips: string[];
  suggestedFollowUp?: string;
}

/**
 * Result for a single question in the interview
 */
export interface QuestionResult {
  questionId: string;
  question: PredictedQuestion;
  userResponse: string;
  userTranscript?: string; // If different from response (e.g., cleaned up)
  audioBlob?: string; // Base64 encoded
  evaluation: QuestionEvaluation;
  responseTimeSeconds: number;
  timestamp: string;
}

/**
 * Category-based score breakdown
 */
export interface CategoryScores {
  behavioral?: number;
  technical?: number;
  situational?: number;
  'role-specific'?: number;
  'company-specific'?: number;
}

/**
 * Progress update after session
 */
export interface SessionProgressUpdate {
  questionsNewlyPracticed: number;
  questionsImproved: number; // Better score than last practice
  totalPracticeCount: number;
  readinessScoreChange: number; // +/- change
}

/**
 * Enhanced interview feedback with question breakdown
 */
export interface EnhancedInterviewFeedback {
  // Overall scores
  overallScore: number; // 1-10
  categoryScores: CategoryScores;

  // Question-by-question results
  questionResults: QuestionResult[];

  // Summary stats
  questionsAnswered: number;
  averageResponseTime: number; // seconds
  totalDuration: number; // seconds

  // Prepared answer comparison
  preparedVsActual: {
    questionsWithPreparedAnswers: number;
    averageSimilarity: number;
    bestMatchQuestionId?: string;
    worstMatchQuestionId?: string;
  };

  // Progress tracking
  progressUpdate: SessionProgressUpdate;

  // AI-generated summary
  topStrengths: string[];
  priorityImprovements: string[];
  summary: string;
  nextSteps: string[];

  // Metadata
  completedAt: string;
  config: EnhancedInterviewConfig;
}

/**
 * Live interview session state
 */
export type LiveInterviewPhase = 'setup' | 'connecting' | 'active' | 'evaluating' | 'feedback';

/**
 * Current question state during active interview
 */
export interface ActiveQuestionState {
  question: PredictedQuestion;
  index: number;
  totalQuestions: number;
  startedAt: string;
  isRecording: boolean;
  hasResponded: boolean;
  evaluation?: QuestionEvaluation;
}

/**
 * Enhanced mock interview session (saved to store)
 */
export interface EnhancedMockSession extends PrepPracticeSession {
  // Override mode to be specifically 'mock'
  mode: 'mock';

  // Enhanced config
  config: EnhancedInterviewConfig;

  // Full results
  feedback?: EnhancedInterviewFeedback;

  // Question results for detailed tracking
  questionResults: QuestionResult[];
}

/**
 * Default config for enhanced interview
 */
export const DEFAULT_ENHANCED_INTERVIEW_CONFIG: Partial<EnhancedInterviewConfig> = {
  type: 'mixed',
  difficulty: 'medium',
  duration: 20,
  questionPriority: 'unpracticed',
  maxQuestions: 5,
  showPreparedAnswers: true,
  enablePerQuestionFeedback: true,
};

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

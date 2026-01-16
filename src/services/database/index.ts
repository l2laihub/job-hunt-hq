/**
 * Database Service - Main Export
 * Unified access to all database services
 */
export { profilesService } from './profiles';
export { applicationsService } from './applications';
export { storiesService } from './stories';
export { companyResearchService } from './company-research';
export { technicalAnswersService } from './technical-answers';
export { analyzedJobsService } from './analyzed-jobs';
export { enhancementsService } from './enhancements';
export { interviewNotesService } from './interview-notes';
export { interviewPrepService } from './interview-prep';
export { copilotSessionsService } from './copilot-sessions';
export { assistantChatsService } from './assistant-chats';
export { topicResearchService } from './topic-research';
export { preferencesService, messageFeedbackService } from './preferences';

// Type converters
export * from './types';

// Unified database service object
import { profilesService } from './profiles';
import { applicationsService } from './applications';
import { storiesService } from './stories';
import { companyResearchService } from './company-research';
import { technicalAnswersService } from './technical-answers';
import { analyzedJobsService } from './analyzed-jobs';
import { enhancementsService } from './enhancements';
import { interviewNotesService } from './interview-notes';
import { interviewPrepService } from './interview-prep';
import { copilotSessionsService } from './copilot-sessions';
import { assistantChatsService } from './assistant-chats';
import { topicResearchService } from './topic-research';
import { preferencesService, messageFeedbackService } from './preferences';

export const db = {
  profiles: profilesService,
  applications: applicationsService,
  stories: storiesService,
  companyResearch: companyResearchService,
  technicalAnswers: technicalAnswersService,
  analyzedJobs: analyzedJobsService,
  enhancements: enhancementsService,
  interviewNotes: interviewNotesService,
  interviewPrep: interviewPrepService,
  copilotSessions: copilotSessionsService,
  assistantChats: assistantChatsService,
  topicResearch: topicResearchService,
  preferences: preferencesService,
  messageFeedback: messageFeedbackService,
};

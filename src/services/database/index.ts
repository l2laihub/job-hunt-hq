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

export const db = {
  profiles: profilesService,
  applications: applicationsService,
  stories: storiesService,
  companyResearch: companyResearchService,
  technicalAnswers: technicalAnswersService,
  analyzedJobs: analyzedJobsService,
  enhancements: enhancementsService,
  interviewNotes: interviewNotesService,
};

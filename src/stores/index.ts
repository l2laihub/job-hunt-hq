// Import stores and migration functions
import { useApplicationStore, migrateLegacyApplications, initApplicationsSync, destroyApplicationsSync } from './applications';
import { useProfileStore, migrateLegacyProfile, initProfileSync, destroyProfileSync } from './profile';
import { useStoriesStore, migrateLegacyStories, initStoriesSync, destroyStoriesSync } from './stories';
import { useTechnicalAnswersStore, initTechnicalAnswersSync, destroyTechnicalAnswersSync } from './technical-answers';
import { useAnalyzedJobsStore, initAnalyzedJobsSync, destroyAnalyzedJobsSync } from './analyzed-jobs';
import { useEnhancementsStore } from './enhancements';
import { useCompanyResearchStore } from './company-research';
import { useUIStore, toast } from './ui';
import type { ModalType, Toast } from './ui';
import { initStorageSync, destroyStorageSync } from '@/src/lib/storage-sync';

// Re-export everything
export { useApplicationStore, migrateLegacyApplications } from './applications';
export {
  useProfileStore,
  migrateLegacyProfile,
  useCurrentProfile,
  useActiveProfile,
  useAllProfiles,
  useActiveProfileId,
} from './profile';
export { useStoriesStore, migrateLegacyStories } from './stories';
export { useTechnicalAnswersStore } from './technical-answers';
export { useAnalyzedJobsStore } from './analyzed-jobs';
export { useEnhancementsStore } from './enhancements';
export { useCompanyResearchStore } from './company-research';
export { useInterviewPrepStore, hasSessionForApplication } from './interview-prep';
export { useUIStore, toast, type ModalType, type Toast } from './ui';

// Initialize all stores and run migrations
export function initializeStores(): void {
  // Initialize cross-tab sync system
  initStorageSync();

  // Run migrations for legacy data
  migrateLegacyApplications();
  migrateLegacyProfile();
  migrateLegacyStories();

  // Set up cross-tab sync for all stores
  initProfileSync();
  initApplicationsSync();
  initStoriesSync();
  initTechnicalAnswersSync();
  initAnalyzedJobsSync();
}

// Cleanup function for unmounting
export function destroyStores(): void {
  destroyProfileSync();
  destroyApplicationsSync();
  destroyStoriesSync();
  destroyTechnicalAnswersSync();
  destroyAnalyzedJobsSync();
  destroyStorageSync();
}

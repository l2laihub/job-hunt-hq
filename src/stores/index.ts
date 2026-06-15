// Import stores and migration functions
import { useApplicationStore, migrateLegacyApplications, initApplicationsSync, destroyApplicationsSync } from './applications';
import { useProfileStore, migrateLegacyProfile, initProfileSync, destroyProfileSync } from './profile';
import { useStoriesStore, migrateLegacyStories, initStoriesSync, destroyStoriesSync } from './stories';
import { useTechnicalAnswersStore, initTechnicalAnswersSync, destroyTechnicalAnswersSync } from './technical-answers';
import { useAnalyzedJobsStore, initAnalyzedJobsSync, destroyAnalyzedJobsSync } from './analyzed-jobs';
import { useEnhancementsStore } from './enhancements';
import { useCompanyResearchStore } from './company-research';
import { useInterviewPrepStore, migrateLegacyInterviewPrep, initInterviewPrepSync, destroyInterviewPrepSync } from './interview-prep';
import { useFlashcardsStore, initFlashcardsSync, destroyFlashcardsSync } from './flashcards';
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
export { useInterviewPrepStore, hasSessionForApplication, migrateLegacyInterviewPrep } from './interview-prep';
export { useUIStore, toast, type ModalType, type Toast } from './ui';
export { useAssistantStore, useAssistantHasMessages, useAssistantName } from './assistant';
export {
  usePreferencesStore,
  useHasPreferences,
  useActivePreferenceCount,
  useFeedbackForMessage,
} from './preferences';
export { useTopicResearchStore } from './topic-research';
export { useFlashcardsStore } from './flashcards';
export { useRecordingStore } from './recording';
export type { RecordingContext } from './recording';

// One-time backfill: assign NULL profileId items to the default profile for the
// localStorage path. Mirrors the Supabase migration so strict per-profile filters
// don't hide pre-existing (untagged) data. Only the strictly-isolated entities
// (applications, company research) need this; stories stay shared by design.
const PROFILE_BACKFILL_KEY = 'jhq_profile_backfill_v1';

function backfillProfileLinks(): void {
  try {
    if (localStorage.getItem(PROFILE_BACKFILL_KEY)) return;

    const profileState = useProfileStore.getState();
    const defaultProfile =
      profileState.profiles.find((p) => p.metadata.isDefault) || profileState.profiles[0];
    const defaultId = defaultProfile?.metadata.id;
    if (!defaultId) return; // No profile yet; retry on a later init (flag not set)

    const apps = useApplicationStore.getState().applications;
    if (apps.some((a) => !a.profileId)) {
      useApplicationStore.setState({
        applications: apps.map((a) => (a.profileId ? a : { ...a, profileId: defaultId })),
      });
    }

    const researches = useCompanyResearchStore.getState().researches;
    if (researches.some((r) => !r.profileId)) {
      useCompanyResearchStore.setState({
        researches: researches.map((r) => (r.profileId ? r : { ...r, profileId: defaultId })),
      });
    }

    localStorage.setItem(PROFILE_BACKFILL_KEY, '1');
  } catch (error) {
    console.error('Profile backfill failed:', error);
  }
}

// Initialize all stores and run migrations
export function initializeStores(): void {
  // Initialize cross-tab sync system
  initStorageSync();

  // Run migrations for legacy data
  migrateLegacyApplications();
  migrateLegacyProfile();
  migrateLegacyStories();
  migrateLegacyInterviewPrep();

  // Backfill profile links for strictly-isolated localStorage data (runs once)
  backfillProfileLinks();

  // Set up cross-tab sync for all stores
  initProfileSync();
  initApplicationsSync();
  initStoriesSync();
  initTechnicalAnswersSync();
  initAnalyzedJobsSync();
  initInterviewPrepSync();
  initFlashcardsSync();
}

// Cleanup function for unmounting
export function destroyStores(): void {
  destroyProfileSync();
  destroyApplicationsSync();
  destroyStoriesSync();
  destroyTechnicalAnswersSync();
  destroyAnalyzedJobsSync();
  destroyInterviewPrepSync();
  destroyFlashcardsSync();
  destroyStorageSync();
}

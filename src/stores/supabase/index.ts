/**
 * Supabase Stores - Main Export
 * Exports all Supabase-backed Zustand stores
 */

// Profile store
export {
  useSupabaseProfileStore,
  useSupabaseAllProfiles,
  useSupabaseActiveProfileId,
  useSupabaseActiveProfile,
  useSupabaseCurrentProfile,
} from './profile';

// Applications store
export { useSupabaseApplicationStore } from './applications';

// Stories store
export { useSupabaseStoriesStore } from './stories';

// Company Research store
export { useSupabaseCompanyResearchStore } from './company-research';

// Analyzed Jobs store
export { useSupabaseAnalyzedJobsStore } from './analyzed-jobs';

// Enhancements store
export { useSupabaseEnhancementsStore } from './enhancements';

// Technical Answers store
export { useSupabaseTechnicalAnswersStore } from './technical-answers';

// Interview Prep store
export { useSupabaseInterviewPrepStore } from './interview-prep';

// Copilot Sessions store
export { useSupabaseCopilotSessionsStore } from './copilot-sessions';

// Flashcards store
export { useSupabaseFlashcardsStore } from './flashcards';

// Re-export database services for direct access
export { db } from '@/src/services/database';

// Re-export migration utilities
export {
  hasLocalStorageData,
  getLocalStorageSummary,
  migrateLocalStorageToSupabase,
  clearMigratedLocalStorage,
  isMigrationComplete,
  markMigrationSkipped,
  runFullMigration,
} from '@/src/services/database/migration';

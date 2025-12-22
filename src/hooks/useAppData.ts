/**
 * App Data Hook
 * Provides unified access to application data from Supabase stores
 */
import { useMemo } from 'react';
import {
  useSupabaseProfileStore,
  useSupabaseApplicationStore,
  useSupabaseStoriesStore,
  useSupabaseCompanyResearchStore,
  useSupabaseAnalyzedJobsStore,
  useSupabaseEnhancementsStore,
  useSupabaseTechnicalAnswersStore,
  useSupabaseActiveProfile,
  useSupabaseCurrentProfile,
  useSupabaseActiveProfileId,
} from '@/src/stores/supabase';
import { useAuth, isSupabaseConfigured } from '@/src/lib/supabase';

// For legacy localStorage fallback when Supabase is not configured
import { useProfileStore, useCurrentProfile } from '@/src/stores/profile';
import { useApplicationStore } from '@/src/stores/applications';
import { useStoriesStore } from '@/src/stores/stories';
import { useCompanyResearchStore } from '@/src/stores/company-research';
import { useAnalyzedJobsStore } from '@/src/stores/analyzed-jobs';
import { useEnhancementsStore } from '@/src/stores/enhancements';
import { useTechnicalAnswersStore } from '@/src/stores/technical-answers';

/**
 * Hook to get the appropriate data based on Supabase configuration
 */
export function useAppData() {
  const { user } = useAuth();
  const configured = isSupabaseConfigured();

  // Supabase stores
  const supabaseProfile = useSupabaseCurrentProfile();
  const supabaseActiveProfile = useSupabaseActiveProfile();
  const supabaseApplications = useSupabaseApplicationStore((s) => s.applications);
  const supabaseStories = useSupabaseStoriesStore((s) => s.stories);
  const supabaseProfileStore = useSupabaseProfileStore();
  const supabaseAppStore = useSupabaseApplicationStore();
  const supabaseStoriesStore = useSupabaseStoriesStore();

  // Legacy stores (for fallback)
  const legacyProfile = useCurrentProfile();
  const legacyActiveProfile = useProfileStore((s) => s.getActiveProfile());
  const legacyApplications = useApplicationStore((s) => s.applications);
  const legacyStories = useStoriesStore((s) => s.stories);
  const legacyProfileStore = useProfileStore();
  const legacyAppStore = useApplicationStore();
  const legacyStoriesStore = useStoriesStore();

  // Determine which data source to use
  const useSupabase = configured && !!user;

  return useMemo(() => ({
    // Data
    profile: useSupabase ? supabaseProfile : legacyProfile,
    activeProfile: useSupabase ? supabaseActiveProfile : legacyActiveProfile,
    applications: useSupabase ? supabaseApplications : legacyApplications,
    stories: useSupabase ? supabaseStories : legacyStories,

    // Stores (for actions)
    profileStore: useSupabase ? supabaseProfileStore : legacyProfileStore,
    applicationStore: useSupabase ? supabaseAppStore : legacyAppStore,
    storiesStore: useSupabase ? supabaseStoriesStore : legacyStoriesStore,

    // Meta
    isUsingSupabase: useSupabase,
    isAuthenticated: !!user,
  }), [
    useSupabase,
    user,
    supabaseProfile,
    supabaseActiveProfile,
    supabaseApplications,
    supabaseStories,
    supabaseProfileStore,
    supabaseAppStore,
    supabaseStoriesStore,
    legacyProfile,
    legacyActiveProfile,
    legacyApplications,
    legacyStories,
    legacyProfileStore,
    legacyAppStore,
    legacyStoriesStore,
  ]);
}

/**
 * Hook for profile data and actions
 */
export function useProfile() {
  const { profile, profileStore, isUsingSupabase } = useAppData();

  return {
    profile,
    updateProfile: isUsingSupabase
      ? profileStore.updateProfile
      : (updates: Parameters<typeof profileStore.updateProfile>[0]) => {
          profileStore.updateProfile(updates);
        },
    setProfile: profileStore.setProfile,
    isUsingSupabase,
  };
}

/**
 * Hook for applications data and actions
 */
export function useApplications() {
  const { applications, applicationStore, isUsingSupabase } = useAppData();

  return {
    applications,
    addApplication: applicationStore.addApplication,
    updateApplication: applicationStore.updateApplication,
    deleteApplication: applicationStore.deleteApplication,
    moveApplication: applicationStore.moveApplication,
    setAnalysis: applicationStore.setAnalysis,
    setResearch: applicationStore.setResearch,
    getStats: applicationStore.getStats,
    isUsingSupabase,
  };
}

/**
 * Hook for stories data and actions
 */
export function useStories() {
  const { stories, storiesStore, isUsingSupabase } = useAppData();

  return {
    stories,
    addStory: storiesStore.addStory,
    updateStory: storiesStore.updateStory,
    deleteStory: storiesStore.deleteStory,
    incrementUsage: storiesStore.incrementUsage,
    getStoriesByTags: storiesStore.getStoriesByTags,
    searchStories: storiesStore.searchStories,
    isUsingSupabase,
  };
}

/**
 * Hook for unified active profile ID
 * Automatically switches between Supabase and localStorage based on auth state
 */
export function useUnifiedActiveProfileId(): string | null {
  const { user } = useAuth();
  const configured = isSupabaseConfigured();
  const useSupabase = configured && !!user;

  // Supabase active profile ID
  const supabaseActiveProfileId = useSupabaseActiveProfileId();

  // Legacy localStorage active profile ID
  const legacyActiveProfileId = useProfileStore((s) => s.activeProfileId);

  return useSupabase ? supabaseActiveProfileId : legacyActiveProfileId;
}

/**
 * Hook for company research data and actions
 * Automatically switches between Supabase and localStorage based on auth state
 */
export function useCompanyResearch() {
  const { user } = useAuth();
  const configured = isSupabaseConfigured();
  const useSupabase = configured && !!user;

  // Supabase store
  const supabaseResearches = useSupabaseCompanyResearchStore((s) => s.researches);
  const supabaseStore = useSupabaseCompanyResearchStore();

  // Legacy localStorage store
  const legacyResearches = useCompanyResearchStore((s) => s.researches);
  const legacyStore = useCompanyResearchStore();

  return useMemo(() => ({
    researches: useSupabase ? supabaseResearches : legacyResearches,
    addResearch: useSupabase ? supabaseStore.addResearch : legacyStore.addResearch,
    updateResearch: useSupabase ? supabaseStore.updateResearch : legacyStore.updateResearch,
    deleteResearch: useSupabase ? supabaseStore.deleteResearch : legacyStore.deleteResearch,
    getResearchByCompany: useSupabase ? supabaseStore.getResearchByCompany : legacyStore.getResearchByCompany,
    getResearchById: useSupabase ? supabaseStore.getResearchById : legacyStore.getResearchById,
    getStats: useSupabase ? supabaseStore.getStats : legacyStore.getStats,
    isUsingSupabase: useSupabase,
  }), [
    useSupabase,
    supabaseResearches,
    supabaseStore,
    legacyResearches,
    legacyStore,
  ]);
}

/**
 * Hook for analyzed jobs data and actions
 * Automatically switches between Supabase and localStorage based on auth state
 */
export function useAnalyzedJobs() {
  const { user } = useAuth();
  const configured = isSupabaseConfigured();
  const useSupabase = configured && !!user;

  // Supabase store
  const supabaseJobs = useSupabaseAnalyzedJobsStore((s) => s.jobs);
  const supabaseStore = useSupabaseAnalyzedJobsStore();

  // Legacy localStorage store
  const legacyJobs = useAnalyzedJobsStore((s) => s.jobs);
  const legacyStore = useAnalyzedJobsStore();

  return useMemo(() => ({
    jobs: useSupabase ? supabaseJobs : legacyJobs,
    addJob: useSupabase ? supabaseStore.addJob : legacyStore.addJob,
    updateJob: useSupabase ? supabaseStore.updateJob : legacyStore.updateJob,
    deleteJob: useSupabase ? supabaseStore.deleteJob : legacyStore.deleteJob,
    addCoverLetter: useSupabase ? supabaseStore.addCoverLetter : legacyStore.addCoverLetter,
    updateCoverLetter: useSupabase ? supabaseStore.updateCoverLetter : legacyStore.updateCoverLetter,
    deleteCoverLetter: useSupabase ? supabaseStore.deleteCoverLetter : legacyStore.deleteCoverLetter,
    setPhoneScreenPrep: useSupabase ? supabaseStore.setPhoneScreenPrep : legacyStore.setPhoneScreenPrep,
    setTechnicalInterviewPrep: useSupabase ? supabaseStore.setTechnicalInterviewPrep : legacyStore.setTechnicalInterviewPrep,
    setApplicationStrategy: useSupabase ? supabaseStore.setApplicationStrategy : legacyStore.setApplicationStrategy,
    setSkillsRoadmap: useSupabase ? supabaseStore.setSkillsRoadmap : legacyStore.setSkillsRoadmap,
    setTopicDetails: useSupabase ? supabaseStore.setTopicDetails : legacyStore.setTopicDetails,
    updateTopicPractice: useSupabase ? supabaseStore.updateTopicPractice : legacyStore.updateTopicPractice,
    addApplicationQuestion: useSupabase ? supabaseStore.addApplicationQuestion : legacyStore.addApplicationQuestion,
    updateApplicationQuestion: useSupabase ? supabaseStore.updateApplicationQuestion : legacyStore.updateApplicationQuestion,
    deleteApplicationQuestion: useSupabase ? supabaseStore.deleteApplicationQuestion : legacyStore.deleteApplicationQuestion,
    incrementQuestionCopyCount: useSupabase ? supabaseStore.incrementQuestionCopyCount : legacyStore.incrementQuestionCopyCount,
    toggleFavorite: useSupabase ? supabaseStore.toggleFavorite : legacyStore.toggleFavorite,
    addTag: useSupabase ? supabaseStore.addTag : legacyStore.addTag,
    removeTag: useSupabase ? supabaseStore.removeTag : legacyStore.removeTag,
    linkToApplication: useSupabase ? supabaseStore.linkToApplication : legacyStore.linkToApplication,
    getJobById: useSupabase ? supabaseStore.getJobById : legacyStore.getJobById,
    getJobsByType: useSupabase ? supabaseStore.getJobsByType : legacyStore.getJobsByType,
    getFavorites: useSupabase ? supabaseStore.getFavorites : legacyStore.getFavorites,
    searchJobs: useSupabase ? supabaseStore.searchJobs : legacyStore.searchJobs,
    getRecentJobs: useSupabase ? supabaseStore.getRecentJobs : legacyStore.getRecentJobs,
    getJobsByProfile: useSupabase ? supabaseStore.getJobsByProfile : legacyStore.getJobsByProfile,
    isUsingSupabase: useSupabase,
  }), [
    useSupabase,
    supabaseJobs,
    supabaseStore,
    legacyJobs,
    legacyStore,
  ]);
}

/**
 * Hook for enhancements data and actions
 * Automatically switches between Supabase and localStorage based on auth state
 */
export function useEnhancements() {
  const { user } = useAuth();
  const configured = isSupabaseConfigured();
  const useSupabase = configured && !!user;

  // Supabase store
  const supabaseEnhancements = useSupabaseEnhancementsStore((s) => s.enhancements);
  const supabaseStore = useSupabaseEnhancementsStore();

  // Legacy localStorage store
  const legacyEnhancements = useEnhancementsStore((s) => s.enhancements);
  const legacyStore = useEnhancementsStore();

  return useMemo(() => ({
    enhancements: useSupabase ? supabaseEnhancements : legacyEnhancements,
    addEnhancement: useSupabase ? supabaseStore.addEnhancement : legacyStore.addEnhancement,
    updateEnhancement: useSupabase ? supabaseStore.updateEnhancement : legacyStore.updateEnhancement,
    deleteEnhancement: useSupabase ? supabaseStore.deleteEnhancement : legacyStore.deleteEnhancement,
    getEnhancement: useSupabase ? supabaseStore.getEnhancement : legacyStore.getEnhancement,
    getEnhancementsByJob: useSupabase ? supabaseStore.getEnhancementsByJob : legacyStore.getEnhancementsByJob,
    isUsingSupabase: useSupabase,
  }), [
    useSupabase,
    supabaseEnhancements,
    supabaseStore,
    legacyEnhancements,
    legacyStore,
  ]);
}

/**
 * Hook for technical answers data and actions
 * Automatically switches between Supabase and localStorage based on auth state
 */
export function useTechnicalAnswers() {
  const { user } = useAuth();
  const configured = isSupabaseConfigured();
  const useSupabase = configured && !!user;

  // Supabase store
  const supabaseAnswers = useSupabaseTechnicalAnswersStore((s) => s.answers);
  const supabasePracticeSessions = useSupabaseTechnicalAnswersStore((s) => s.practiceSessions);
  const supabaseStore = useSupabaseTechnicalAnswersStore();

  // Legacy localStorage store
  const legacyAnswers = useTechnicalAnswersStore((s) => s.answers);
  const legacyPracticeSessions = useTechnicalAnswersStore((s) => s.practiceSessions);
  const legacyStore = useTechnicalAnswersStore();

  return useMemo(() => ({
    answers: useSupabase ? supabaseAnswers : legacyAnswers,
    practiceSessions: useSupabase ? supabasePracticeSessions : legacyPracticeSessions,
    addAnswer: useSupabase ? supabaseStore.addAnswer : legacyStore.addAnswer,
    updateAnswer: useSupabase ? supabaseStore.updateAnswer : legacyStore.updateAnswer,
    deleteAnswer: useSupabase ? supabaseStore.deleteAnswer : legacyStore.deleteAnswer,
    incrementUsage: useSupabase ? supabaseStore.incrementUsage : legacyStore.incrementUsage,
    recordUsedInInterview: useSupabase ? supabaseStore.recordUsedInInterview : legacyStore.recordUsedInInterview,
    recordPractice: useSupabase ? supabaseStore.recordPractice : legacyStore.recordPractice,
    getPracticeSessions: useSupabase ? supabaseStore.getPracticeSessions : legacyStore.getPracticeSessions,
    searchAnswers: useSupabase ? supabaseStore.searchAnswers : legacyStore.searchAnswers,
    getAnswersByType: useSupabase ? supabaseStore.getAnswersByType : legacyStore.getAnswersByType,
    isUsingSupabase: useSupabase,
  }), [
    useSupabase,
    supabaseAnswers,
    supabasePracticeSessions,
    supabaseStore,
    legacyAnswers,
    legacyPracticeSessions,
    legacyStore,
  ]);
}

/**
 * App Wrapper Component
 * Handles authentication flow, data migration, and initialization
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/lib/supabase';
import { AuthPage } from './AuthPage';
import { DataMigration } from './DataMigration';
import {
  useSupabaseProfileStore,
  useSupabaseApplicationStore,
  useSupabaseStoriesStore,
  useSupabaseCompanyResearchStore,
  useSupabaseAnalyzedJobsStore,
  useSupabaseEnhancementsStore,
  useSupabaseTechnicalAnswersStore,
  hasLocalStorageData,
  isMigrationComplete,
} from '@/src/stores/supabase';
import { Loader2, Briefcase } from 'lucide-react';

interface AppWrapperProps {
  children: React.ReactNode;
}

type AppState = 'loading' | 'unauthenticated' | 'migrating' | 'initializing' | 'ready';

export function AppWrapper({ children }: AppWrapperProps) {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const [appState, setAppState] = useState<AppState>('loading');
  // Track if we've already checked migration to prevent re-showing on tab focus
  const [migrationChecked, setMigrationChecked] = useState(false);

  const fetchProfiles = useSupabaseProfileStore((state) => state.fetchProfiles);
  const fetchApplications = useSupabaseApplicationStore((state) => state.fetchApplications);
  const fetchStories = useSupabaseStoriesStore((state) => state.fetchStories);
  const fetchResearches = useSupabaseCompanyResearchStore((state) => state.fetchResearches);
  const fetchAnalyzedJobs = useSupabaseAnalyzedJobsStore((state) => state.fetchJobs);
  const fetchEnhancements = useSupabaseEnhancementsStore((state) => state.fetchEnhancements);
  const fetchAnswers = useSupabaseTechnicalAnswersStore((state) => state.fetchAnswers);

  const subscribeProfiles = useSupabaseProfileStore((state) => state.subscribeToChanges);
  const subscribeApplications = useSupabaseApplicationStore((state) => state.subscribeToChanges);
  const subscribeStories = useSupabaseStoriesStore((state) => state.subscribeToChanges);
  const subscribeResearches = useSupabaseCompanyResearchStore((state) => state.subscribeToChanges);
  const subscribeAnalyzedJobs = useSupabaseAnalyzedJobsStore((state) => state.subscribeToChanges);
  const subscribeEnhancements = useSupabaseEnhancementsStore((state) => state.subscribeToChanges);
  const subscribeAnswers = useSupabaseTechnicalAnswersStore((state) => state.subscribeToChanges);

  // Initialize data after authentication
  const initializeData = useCallback(async () => {
    setAppState('initializing');
    try {
      await Promise.all([
        fetchProfiles(),
        fetchApplications(),
        fetchStories(),
        fetchResearches(),
        fetchAnalyzedJobs(),
        fetchEnhancements(),
        fetchAnswers(),
      ]);
      setAppState('ready');
    } catch (error) {
      console.error('Failed to initialize data:', error);
      // Still proceed to ready state - stores will show empty data
      setAppState('ready');
    }
  }, [fetchProfiles, fetchApplications, fetchStories, fetchResearches, fetchAnalyzedJobs, fetchEnhancements, fetchAnswers]);

  // Handle auth state changes
  useEffect(() => {
    if (authLoading) {
      setAppState('loading');
      return;
    }

    if (!isConfigured) {
      // Supabase not configured - proceed without auth
      setAppState('ready');
      setMigrationChecked(true);
      return;
    }

    if (!user) {
      setAppState('unauthenticated');
      // Reset migration check when user logs out
      setMigrationChecked(false);
      return;
    }

    // Skip if we've already checked migration and are past the initial load
    // This prevents re-showing migration prompt on tab focus
    if (migrationChecked && (appState === 'ready' || appState === 'initializing')) {
      return;
    }

    // User is authenticated - check for migration (only once per session)
    if (!migrationChecked && hasLocalStorageData() && !isMigrationComplete()) {
      setAppState('migrating');
    } else {
      setMigrationChecked(true);
      initializeData();
    }
  }, [user, authLoading, isConfigured, initializeData, migrationChecked, appState]);

  // Set up real-time subscriptions when ready
  useEffect(() => {
    if (appState !== 'ready' || !user) return;

    const unsubscribers = [
      subscribeProfiles(),
      subscribeApplications(),
      subscribeStories(),
      subscribeResearches(),
      subscribeAnalyzedJobs(),
      subscribeEnhancements(),
      subscribeAnswers(),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [appState, user, subscribeProfiles, subscribeApplications, subscribeStories, subscribeResearches, subscribeAnalyzedJobs, subscribeEnhancements, subscribeAnswers]);

  // Handle migration completion
  const handleMigrationComplete = useCallback(() => {
    setMigrationChecked(true);
    initializeData();
  }, [initializeData]);

  const handleMigrationSkip = useCallback(() => {
    setMigrationChecked(true);
    initializeData();
  }, [initializeData]);

  // Render based on state
  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (appState === 'unauthenticated') {
    return <AuthPage onSuccess={initializeData} />;
  }

  if (appState === 'migrating') {
    return (
      <DataMigration
        onComplete={handleMigrationComplete}
        onSkip={handleMigrationSkip}
      />
    );
  }

  if (appState === 'initializing') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your data...</p>
        </div>
      </div>
    );
  }

  // Ready - render children
  return <>{children}</>;
}

export default AppWrapper;

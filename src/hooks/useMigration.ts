/**
 * Migration Hook
 * Handles localStorage to Supabase data migration
 */
import { useState, useCallback } from 'react';
import { useAuth } from '@/src/lib/supabase';
import {
  hasLocalStorageData,
  getLocalStorageSummary,
  runFullMigration,
  isMigrationComplete,
} from '@/src/stores/supabase';
import {
  useSupabaseProfileStore,
  useSupabaseApplicationStore,
  useSupabaseStoriesStore,
} from '@/src/stores/supabase';

interface MigrationState {
  status: 'idle' | 'checking' | 'ready' | 'migrating' | 'success' | 'error';
  progress: string;
  hasData: boolean;
  summary: {
    profiles: number;
    applications: number;
    stories: number;
    companyResearch: number;
    technicalAnswers: number;
    analyzedJobs: number;
  } | null;
  errors: string[];
}

interface UseMigrationReturn extends MigrationState {
  checkForMigration: () => void;
  runMigration: () => Promise<boolean>;
  skipMigration: () => void;
  refreshData: () => Promise<void>;
}

export function useMigration(): UseMigrationReturn {
  const { user, isConfigured } = useAuth();
  const [state, setState] = useState<MigrationState>({
    status: 'idle',
    progress: '',
    hasData: false,
    summary: null,
    errors: [],
  });

  const fetchProfiles = useSupabaseProfileStore((s) => s.fetchProfiles);
  const fetchApplications = useSupabaseApplicationStore((s) => s.fetchApplications);
  const fetchStories = useSupabaseStoriesStore((s) => s.fetchStories);

  // Refresh data from Supabase
  const refreshData = useCallback(async () => {
    if (!user || !isConfigured) return;

    try {
      await Promise.all([
        fetchProfiles(),
        fetchApplications(),
        fetchStories(),
      ]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }, [user, isConfigured, fetchProfiles, fetchApplications, fetchStories]);

  // Check if migration is needed
  const checkForMigration = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'checking' }));

    // Already migrated
    if (isMigrationComplete()) {
      setState((prev) => ({
        ...prev,
        status: 'idle',
        hasData: false,
      }));
      return;
    }

    // Check for localStorage data
    if (hasLocalStorageData()) {
      const summary = getLocalStorageSummary();
      const totalItems = Object.values(summary).reduce((a, b) => a + b, 0);

      setState((prev) => ({
        ...prev,
        status: 'ready',
        hasData: totalItems > 0,
        summary,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        status: 'idle',
        hasData: false,
      }));
    }
  }, []);

  // Run migration
  const runMigration = useCallback(async (): Promise<boolean> => {
    if (!user || !isConfigured) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errors: ['User not authenticated'],
      }));
      return false;
    }

    setState((prev) => ({
      ...prev,
      status: 'migrating',
      progress: 'Starting migration...',
      errors: [],
    }));

    try {
      const result = await runFullMigration((progress) => {
        setState((prev) => ({ ...prev, progress }));
      });

      if (result.success) {
        setState((prev) => ({
          ...prev,
          status: 'success',
          progress: 'Migration complete!',
        }));

        // Refresh data from Supabase
        await refreshData();
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          status: 'error',
          errors: result.errors,
        }));
        return false;
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }));
      return false;
    }
  }, [user, isConfigured, refreshData]);

  // Skip migration
  const skipMigration = useCallback(() => {
    setState({
      status: 'idle',
      progress: '',
      hasData: false,
      summary: null,
      errors: [],
    });
  }, []);

  return {
    ...state,
    checkForMigration,
    runMigration,
    skipMigration,
    refreshData,
  };
}

export default useMigration;

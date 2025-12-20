import { useCallback, useRef } from 'react';
import { useApplicationStore, useProfileStore, useStoriesStore, useTechnicalAnswersStore, useAnalyzedJobsStore, useEnhancementsStore, useCurrentProfile, toast } from '@/src/stores';
import { downloadJSON, safeJSONParse, generateId } from '@/src/lib/utils';
import { useAuth } from '@/src/lib/supabase';
import {
  useSupabaseProfileStore,
  useSupabaseApplicationStore,
  useSupabaseStoriesStore,
  useSupabaseCompanyResearchStore,
  useSupabaseAnalyzedJobsStore,
  useSupabaseEnhancementsStore,
} from '@/src/stores/supabase';
import {
  profilesService,
  applicationsService,
  storiesService,
  technicalAnswersService,
  analyzedJobsService,
  enhancementsService,
} from '@/src/services/database';
import type { JobApplication, UserProfile, UserProfileWithMeta, Experience, TechnicalAnswer, PracticeSession, AnalyzedJob, ResumeEnhancement } from '@/src/types';
import { z } from 'zod';

// Schema for validating imported data
const importSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  applications: z.array(z.any()).optional(),
  profile: z.any().optional(),
  profiles: z.array(z.any()).optional(), // Multi-profile support
  activeProfileId: z.string().optional(), // Multi-profile support
  stories: z.array(z.any()).optional(),
  technicalAnswers: z.array(z.any()).optional(),
  practiceSessions: z.array(z.any()).optional(),
  analyzedJobs: z.array(z.any()).optional(),
  enhancements: z.array(z.any()).optional(), // Resume enhancements
});

interface ExportData {
  version: string;
  exportedAt: string;
  applications: JobApplication[];
  profile?: UserProfile; // Legacy single profile (for backward compatibility)
  profiles: UserProfileWithMeta[]; // Multi-profile export
  activeProfileId: string | null;
  stories: Experience[];
  technicalAnswers: TechnicalAnswer[];
  practiceSessions: PracticeSession[];
  analyzedJobs: AnalyzedJob[];
  enhancements: ResumeEnhancement[]; // Resume enhancements
}

interface ImportResult {
  success: boolean;
  imported: {
    applications: number;
    stories: number;
    profile: boolean;
    technicalAnswers: number;
    practiceSessions: number;
    analyzedJobs: number;
    enhancements: number;
  };
  errors: string[];
}

export function useDataExport() {
  const { user, isConfigured } = useAuth();
  const isAuthenticated = Boolean(user && isConfigured);

  const applications = useApplicationStore((s) => s.applications);
  const profiles = useProfileStore((s) => s.profiles);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const profile = useCurrentProfile(); // Legacy support - uses stable selector
  const stories = useStoriesStore((s) => s.stories);
  const technicalAnswers = useTechnicalAnswersStore((s) => s.answers);
  const practiceSessions = useTechnicalAnswersStore((s) => s.practiceSessions);
  const analyzedJobs = useAnalyzedJobsStore((s) => s.jobs);
  const enhancements = useEnhancementsStore((s) => s.enhancements);

  const importApplications = useApplicationStore((s) => s.importApplications);
  const importProfile = useProfileStore((s) => s.importProfile);
  const importProfiles = useProfileStore((s) => s.importProfiles);
  const importStories = useStoriesStore((s) => s.importStories);
  const importAnswers = useTechnicalAnswersStore((s) => s.importAnswers);
  const importPracticeSessions = useTechnicalAnswersStore((s) => s.importPracticeSessions);
  const importAnalyzedJobs = useAnalyzedJobsStore((s) => s.importJobs);
  const importEnhancements = useEnhancementsStore((s) => s.importEnhancements);

  // Supabase store refresh functions
  const fetchSupabaseProfiles = useSupabaseProfileStore((s) => s.fetchProfiles);
  const fetchSupabaseApplications = useSupabaseApplicationStore((s) => s.fetchApplications);
  const fetchSupabaseStories = useSupabaseStoriesStore((s) => s.fetchStories);
  const fetchSupabaseResearches = useSupabaseCompanyResearchStore((s) => s.fetchResearches);
  const fetchSupabaseAnalyzedJobs = useSupabaseAnalyzedJobsStore((s) => s.fetchJobs);
  const fetchSupabaseEnhancements = useSupabaseEnhancementsStore((s) => s.fetchEnhancements);

  // File input ref for triggering file picker
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Import data directly to Supabase (for authenticated users)
   * Deduplicates data based on meaningful fields to prevent duplicates on re-import
   */
  const importToSupabase = useCallback(async (data: {
    profiles?: UserProfileWithMeta[];
    applications?: JobApplication[];
    stories?: Experience[];
    technicalAnswers?: TechnicalAnswer[];
    analyzedJobs?: AnalyzedJob[];
    enhancements?: ResumeEnhancement[];
  }): Promise<{ success: boolean; errors: string[]; imported: { profiles: number; applications: number; stories: number; technicalAnswers: number; analyzedJobs: number; enhancements: number } }> => {
    const errors: string[] = [];
    const imported = { profiles: 0, applications: 0, stories: 0, technicalAnswers: 0, analyzedJobs: 0, enhancements: 0 };

    console.log('[Import to Supabase] Starting import with:', {
      profiles: data.profiles?.length || 0,
      applications: data.applications?.length || 0,
      stories: data.stories?.length || 0,
      technicalAnswers: data.technicalAnswers?.length || 0,
      enhancements: data.enhancements?.length || 0,
      analyzedJobs: data.analyzedJobs?.length || 0,
    });

    // Fetch existing data for deduplication
    let existingProfiles: UserProfileWithMeta[] = [];
    let existingApps: JobApplication[] = [];
    let existingStories: Experience[] = [];
    let existingAnswers: TechnicalAnswer[] = [];
    let existingJobs: AnalyzedJob[] = [];

    try {
      [existingProfiles, existingApps, existingStories, existingAnswers, existingJobs] = await Promise.all([
        profilesService.list(),
        applicationsService.list(),
        storiesService.list(),
        technicalAnswersService.list(),
        analyzedJobsService.list(),
      ]);
      console.log('[Import] Fetched existing data for deduplication:', {
        profiles: existingProfiles.length,
        applications: existingApps.length,
        stories: existingStories.length,
        technicalAnswers: existingAnswers.length,
        analyzedJobs: existingJobs.length,
      });
    } catch (error) {
      console.error('[Import] Failed to fetch existing data:', error);
      // Continue with import but without deduplication
    }

    // Import profiles first (other entities reference them)
    // Deduplicate by profile name
    if (data.profiles && data.profiles.length > 0) {
      try {
        const existingNames = new Set(existingProfiles.map(p => p.name.toLowerCase()));
        const newProfiles = data.profiles.filter(p => !existingNames.has(p.name.toLowerCase()));

        if (newProfiles.length > 0) {
          const profilesWithNewIds = newProfiles.map(p => ({
            ...p,
            metadata: {
              ...p.metadata,
              id: generateId(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }));
          console.log('[Import] Upserting profiles:', profilesWithNewIds.length, '(skipped', data.profiles.length - newProfiles.length, 'duplicates)');
          await profilesService.upsertMany(profilesWithNewIds);
          imported.profiles = profilesWithNewIds.length;
        } else {
          console.log('[Import] All profiles already exist, skipping');
        }
      } catch (error) {
        console.error('[Import] Profile upsert error:', error);
        errors.push(`Profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Import applications
    // Deduplicate by company + role combination
    if (data.applications && data.applications.length > 0) {
      try {
        const existingKeys = new Set(existingApps.map(a => `${a.company.toLowerCase()}|${a.role.toLowerCase()}`));
        const newApps = data.applications.filter(a => !existingKeys.has(`${a.company.toLowerCase()}|${a.role.toLowerCase()}`));

        if (newApps.length > 0) {
          const appsWithNewIds = newApps.map(a => ({
            ...a,
            id: generateId(),
            profileId: undefined,
          }));
          console.log('[Import] Upserting applications:', appsWithNewIds.length, '(skipped', data.applications.length - newApps.length, 'duplicates)');
          await applicationsService.upsertMany(appsWithNewIds);
          imported.applications = appsWithNewIds.length;
        } else {
          console.log('[Import] All applications already exist, skipping');
        }
      } catch (error) {
        console.error('[Import] Applications upsert error:', error);
        errors.push(`Applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Import stories
    // Deduplicate by title
    if (data.stories && data.stories.length > 0) {
      try {
        const existingTitles = new Set(existingStories.map(s => s.title.toLowerCase()));
        const newStories = data.stories.filter(s => !existingTitles.has(s.title.toLowerCase()));

        if (newStories.length > 0) {
          const storiesWithNewIds = newStories.map(s => ({
            ...s,
            id: generateId(),
            profileId: undefined,
          }));
          console.log('[Import] Upserting stories:', storiesWithNewIds.length, '(skipped', data.stories.length - newStories.length, 'duplicates)');
          await storiesService.upsertMany(storiesWithNewIds);
          imported.stories = storiesWithNewIds.length;
        } else {
          console.log('[Import] All stories already exist, skipping');
        }
      } catch (error) {
        console.error('[Import] Stories upsert error:', error);
        errors.push(`Stories: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Import technical answers
    // Deduplicate by question text
    if (data.technicalAnswers && data.technicalAnswers.length > 0) {
      try {
        const existingQuestions = new Set(existingAnswers.map(a => a.question.toLowerCase()));
        const newAnswers = data.technicalAnswers.filter(a => !existingQuestions.has(a.question.toLowerCase()));

        if (newAnswers.length > 0) {
          const answersWithNewIds = newAnswers.map(a => ({
            ...a,
            id: generateId(),
            profileId: undefined,
          }));
          console.log('[Import] Upserting technical answers:', answersWithNewIds.length, '(skipped', data.technicalAnswers.length - newAnswers.length, 'duplicates)');
          await technicalAnswersService.upsertMany(answersWithNewIds);
          imported.technicalAnswers = answersWithNewIds.length;
        } else {
          console.log('[Import] All technical answers already exist, skipping');
        }
      } catch (error) {
        console.error('[Import] Technical answers upsert error:', error);
        errors.push(`Technical Answers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Import analyzed jobs
    // Deduplicate by company + role combination
    if (data.analyzedJobs && data.analyzedJobs.length > 0) {
      try {
        const existingKeys = new Set(existingJobs.map(j => `${(j.company || '').toLowerCase()}|${(j.role || '').toLowerCase()}`));
        const newJobs = data.analyzedJobs.filter(j => !existingKeys.has(`${(j.company || '').toLowerCase()}|${(j.role || '').toLowerCase()}`));

        if (newJobs.length > 0) {
          const jobsWithNewIds = newJobs.map(j => ({
            ...j,
            id: generateId(),
            profileId: undefined,
            applicationId: undefined,
          }));
          console.log('[Import] Upserting analyzed jobs:', jobsWithNewIds.length, '(skipped', data.analyzedJobs.length - newJobs.length, 'duplicates)');
          await analyzedJobsService.upsertMany(jobsWithNewIds);
          imported.analyzedJobs = jobsWithNewIds.length;
        } else {
          console.log('[Import] All analyzed jobs already exist, skipping');
        }
      } catch (error) {
        console.error('[Import] Analyzed jobs upsert error:', error);
        errors.push(`Analyzed Jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Import enhancements
    // Deduplicate by jobId + mode combination (or just id for professional mode)
    if (data.enhancements && data.enhancements.length > 0) {
      try {
        let existingEnhancements: ResumeEnhancement[] = [];
        try {
          existingEnhancements = await enhancementsService.list();
        } catch {
          // If list fails, proceed without deduplication
        }

        const existingKeys = new Set(
          existingEnhancements.map((e) =>
            e.jobId ? `${e.jobId}|${e.mode}` : e.id
          )
        );
        const newEnhancements = data.enhancements.filter((e) => {
          const key = e.jobId ? `${e.jobId}|${e.mode}` : e.id;
          return !existingKeys.has(key);
        });

        if (newEnhancements.length > 0) {
          const enhancementsWithNewIds = newEnhancements.map((e) => ({
            ...e,
            id: generateId(),
          }));
          console.log('[Import] Upserting enhancements:', enhancementsWithNewIds.length, '(skipped', data.enhancements.length - newEnhancements.length, 'duplicates)');
          await enhancementsService.upsertMany(enhancementsWithNewIds);
          imported.enhancements = enhancementsWithNewIds.length;
        } else {
          console.log('[Import] All enhancements already exist, skipping');
        }
      } catch (error) {
        console.error('[Import] Enhancements upsert error:', error);
        errors.push(`Enhancements: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('[Import] Import completed. Imported:', imported, 'Errors:', errors);
    return { success: errors.length === 0, errors, imported };
  }, []);

  /**
   * Export all data to JSON file
   */
  const exportData = useCallback(() => {
    const data: ExportData = {
      version: '3.1', // Bumped version for enhancements support
      exportedAt: new Date().toISOString(),
      applications,
      profiles, // Multi-profile export
      activeProfileId,
      profile, // Legacy support for older imports
      stories,
      technicalAnswers,
      practiceSessions,
      analyzedJobs,
      enhancements, // Resume enhancements
    };

    const filename = `jobhunt-hq-backup-${new Date().toISOString().split('T')[0]}.json`;
    downloadJSON(data, filename);

    // Build summary of exported data
    const parts = [];
    if (applications.length > 0) parts.push(`${applications.length} apps`);
    if (stories.length > 0) parts.push(`${stories.length} stories`);
    if (technicalAnswers.length > 0) parts.push(`${technicalAnswers.length} answers`);
    if (practiceSessions.length > 0) parts.push(`${practiceSessions.length} practices`);
    if (analyzedJobs.length > 0) parts.push(`${analyzedJobs.length} analyzed jobs`);
    if (enhancements.length > 0) parts.push(`${enhancements.length} enhancements`);
    if (profiles.length > 0) parts.push(`${profiles.length} profiles`);

    toast.success('Data exported', `Exported: ${parts.join(', ')}`);
  }, [applications, profiles, activeProfileId, profile, stories, technicalAnswers, practiceSessions, analyzedJobs, enhancements]);

  /**
   * Export only applications
   */
  const exportApplications = useCallback(() => {
    const filename = `jobhunt-applications-${new Date().toISOString().split('T')[0]}.json`;
    downloadJSON({ applications, exportedAt: new Date().toISOString() }, filename);
    toast.success('Applications exported', `${applications.length} applications saved`);
  }, [applications]);

  /**
   * Export only stories
   */
  const exportStories = useCallback(() => {
    const filename = `jobhunt-stories-${new Date().toISOString().split('T')[0]}.json`;
    downloadJSON({ stories, exportedAt: new Date().toISOString() }, filename);
    toast.success('Stories exported', `${stories.length} stories saved`);
  }, [stories]);

  /**
   * Import data from JSON file
   * When authenticated, imports directly to Supabase
   * When not authenticated, imports to localStorage
   */
  const importData = useCallback(
    async (file: File): Promise<ImportResult> => {
      const result: ImportResult = {
        success: false,
        imported: { applications: 0, stories: 0, profile: false, technicalAnswers: 0, practiceSessions: 0, analyzedJobs: 0, enhancements: 0 },
        errors: [],
      };

      try {
        const text = await file.text();
        const rawData = safeJSONParse(text, null);

        if (!rawData) {
          result.errors.push('Invalid JSON file');
          return result;
        }

        // Validate structure
        const parsed = importSchema.safeParse(rawData);
        if (!parsed.success) {
          result.errors.push('Invalid data structure');
          return result;
        }

        const data = parsed.data;

        // Log what's in the file for debugging
        console.log('[Import] File contains:', {
          applications: data.applications?.length || 0,
          stories: data.stories?.length || 0,
          technicalAnswers: data.technicalAnswers?.length || 0,
          practiceSessions: data.practiceSessions?.length || 0,
          analyzedJobs: data.analyzedJobs?.length || 0,
          enhancements: data.enhancements?.length || 0,
          profiles: data.profiles?.length || 0,
          hasLegacyProfile: !!data.profile,
        });

        // Validate and prepare data
        const validProfiles = (data.profiles || []).filter(
          (p: unknown) => p && typeof p === 'object' && 'metadata' in p && 'name' in p
        ) as UserProfileWithMeta[];

        const validApps = (data.applications || []).filter(
          (app: unknown) => app && typeof app === 'object' && 'id' in app && 'company' in app
        ) as JobApplication[];

        const validStories = (data.stories || []).filter(
          (story: unknown) => story && typeof story === 'object' && 'id' in story && 'title' in story
        ) as Experience[];

        const validAnswers = (data.technicalAnswers || []).filter(
          (answer: unknown) => answer && typeof answer === 'object' && 'id' in answer && 'question' in answer
        ) as TechnicalAnswer[];

        const validJobs = (data.analyzedJobs || []).filter(
          (job: unknown) => job && typeof job === 'object' && 'id' in job && 'jobDescription' in job
        ) as AnalyzedJob[];

        const validEnhancements = (data.enhancements || []).filter(
          (e: unknown) => e && typeof e === 'object' && 'id' in e && 'enhancedProfile' in e
        ) as ResumeEnhancement[];

        // If authenticated, import directly to Supabase
        if (isAuthenticated) {
          toast.info('Importing to cloud...', 'Uploading your data directly to Supabase');

          const supabaseResult = await importToSupabase({
            profiles: validProfiles,
            applications: validApps,
            stories: validStories,
            technicalAnswers: validAnswers,
            analyzedJobs: validJobs,
            enhancements: validEnhancements,
          });

          if (supabaseResult.success || supabaseResult.errors.length === 0) {
            // Use actual imported counts from deduplication
            result.imported.profile = supabaseResult.imported.profiles > 0;
            result.imported.applications = supabaseResult.imported.applications;
            result.imported.stories = supabaseResult.imported.stories;
            result.imported.technicalAnswers = supabaseResult.imported.technicalAnswers;
            result.imported.analyzedJobs = supabaseResult.imported.analyzedJobs;
            result.imported.enhancements = supabaseResult.imported.enhancements;
            result.success = true;

            // Refresh all Supabase stores
            await Promise.all([
              fetchSupabaseProfiles(),
              fetchSupabaseApplications(),
              fetchSupabaseStories(),
              fetchSupabaseResearches(),
              fetchSupabaseAnalyzedJobs(),
              fetchSupabaseEnhancements(),
            ]);

            // Also import to localStorage stores for consistency (uses store's built-in deduplication)
            if (validApps.length > 0) {
              importApplications(validApps);
            }
            if (validStories.length > 0) {
              importStories(validStories);
            }
            if (validAnswers.length > 0) {
              importAnswers(validAnswers);
            }
            if (validJobs.length > 0) {
              importAnalyzedJobs(validJobs);
            }
            if (validEnhancements.length > 0) {
              importEnhancements(validEnhancements);
            }

            // Build success message showing actual imported counts (after deduplication)
            const parts = [];
            if (result.imported.applications > 0) parts.push(`${result.imported.applications} applications`);
            if (result.imported.stories > 0) parts.push(`${result.imported.stories} stories`);
            if (result.imported.profile) parts.push(`${supabaseResult.imported.profiles} profiles`);
            if (result.imported.technicalAnswers > 0) parts.push(`${result.imported.technicalAnswers} answers`);
            if (result.imported.analyzedJobs > 0) parts.push(`${result.imported.analyzedJobs} analyzed jobs`);
            if (result.imported.enhancements > 0) parts.push(`${result.imported.enhancements} enhancements`);

            if (parts.length > 0) {
              toast.success('Import complete!', `Imported: ${parts.join(', ')}`);
            } else {
              toast.info('No new data', 'All data already exists or file was empty');
            }
          } else {
            result.errors = supabaseResult.errors;
            toast.error('Import failed', supabaseResult.errors.join(', '));
          }

          return result;
        }

        // Not authenticated - import to localStorage
        if (validApps.length > 0) {
          importApplications(validApps);
          result.imported.applications = validApps.length;
        }

        if (validStories.length > 0) {
          importStories(validStories);
          result.imported.stories = validStories.length;
        }

        if (validProfiles.length > 0) {
          importProfiles(validProfiles);
          result.imported.profile = true;
        } else if (data.profile && typeof data.profile === 'object' && 'name' in data.profile) {
          // Legacy single profile import
          importProfile(data.profile as UserProfile);
          result.imported.profile = true;
        }

        if (validAnswers.length > 0) {
          importAnswers(validAnswers);
          result.imported.technicalAnswers = validAnswers.length;
        }

        const validSessions = (data.practiceSessions || []).filter(
          (session: unknown) => session && typeof session === 'object' && 'id' in session && 'answerId' in session
        ) as PracticeSession[];

        if (validSessions.length > 0) {
          importPracticeSessions(validSessions);
          result.imported.practiceSessions = validSessions.length;
        }

        if (validJobs.length > 0) {
          importAnalyzedJobs(validJobs);
          result.imported.analyzedJobs = validJobs.length;
        }

        if (validEnhancements.length > 0) {
          importEnhancements(validEnhancements);
          result.imported.enhancements = validEnhancements.length;
        }

        // Small delay to ensure Zustand persist middleware writes to localStorage
        await new Promise(resolve => setTimeout(resolve, 100));

        result.success = true;

        // Show success toast
        const parts = [];
        if (result.imported.applications > 0) parts.push(`${result.imported.applications} applications`);
        if (result.imported.stories > 0) parts.push(`${result.imported.stories} stories`);
        if (result.imported.profile) parts.push('profile');
        if (result.imported.technicalAnswers > 0) parts.push(`${result.imported.technicalAnswers} answers`);
        if (result.imported.practiceSessions > 0) parts.push(`${result.imported.practiceSessions} practice sessions`);
        if (result.imported.analyzedJobs > 0) parts.push(`${result.imported.analyzedJobs} analyzed jobs`);
        if (result.imported.enhancements > 0) parts.push(`${result.imported.enhancements} enhancements`);

        if (parts.length > 0) {
          toast.success('Data imported', `Imported: ${parts.join(', ')}`);
          // Prompt user to reload
          setTimeout(() => {
            if (window.confirm('Data imported successfully! Reload page to see all changes?')) {
              window.location.reload();
            }
          }, 500);
        } else {
          toast.info('No new data', 'The file contained no importable data');
        }

        return result;
      } catch (error) {
        console.error('Import failed:', error);
        result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        toast.error('Import failed', result.errors[0]);
        return result;
      }
    },
    [isAuthenticated, importToSupabase, importApplications, importStories, importProfile, importProfiles, importAnswers, importPracticeSessions, importAnalyzedJobs, importEnhancements, fetchSupabaseProfiles, fetchSupabaseApplications, fetchSupabaseStories, fetchSupabaseResearches, fetchSupabaseAnalyzedJobs, fetchSupabaseEnhancements]
  );

  /**
   * Get data statistics
   */
  const getDataStats = useCallback(() => {
    return {
      applications: applications.length,
      stories: stories.length,
      technicalAnswers: technicalAnswers.length,
      practiceSessions: practiceSessions.length,
      analyzedJobs: analyzedJobs.length,
      profiles: profiles.length,
      hasProfile: profiles.length > 0 && profile.name !== 'Senior Engineer', // Check if profile has been customized
    };
  }, [applications.length, stories.length, technicalAnswers.length, practiceSessions.length, analyzedJobs.length, profiles.length, profile.name]);

  /**
   * Trigger file picker for import
   */
  const triggerImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Handle file selection for import
   */
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await importData(file);
        // Reset the input so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [importData]
  );

  return {
    exportData,
    exportApplications,
    exportStories,
    importData,
    getDataStats,
    triggerImport,
    handleFileSelect,
    fileInputRef,
    isAuthenticated,
  };
}

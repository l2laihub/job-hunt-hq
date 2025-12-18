import { useCallback, useRef } from 'react';
import { useApplicationStore, useProfileStore, useStoriesStore, useTechnicalAnswersStore, useAnalyzedJobsStore, toast } from '@/src/stores';
import { downloadJSON, safeJSONParse } from '@/src/lib/utils';
import type { JobApplication, UserProfile, Experience, TechnicalAnswer, PracticeSession, AnalyzedJob } from '@/src/types';
import { z } from 'zod';

// Schema for validating imported data
const importSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  applications: z.array(z.any()).optional(),
  profile: z.any().optional(),
  stories: z.array(z.any()).optional(),
  technicalAnswers: z.array(z.any()).optional(),
  practiceSessions: z.array(z.any()).optional(),
  analyzedJobs: z.array(z.any()).optional(),
});

interface ExportData {
  version: string;
  exportedAt: string;
  applications: JobApplication[];
  profile: UserProfile;
  stories: Experience[];
  technicalAnswers: TechnicalAnswer[];
  practiceSessions: PracticeSession[];
  analyzedJobs: AnalyzedJob[];
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
  };
  errors: string[];
}

export function useDataExport() {
  const applications = useApplicationStore((s) => s.applications);
  const profile = useProfileStore((s) => s.profile);
  const stories = useStoriesStore((s) => s.stories);
  const technicalAnswers = useTechnicalAnswersStore((s) => s.answers);
  const practiceSessions = useTechnicalAnswersStore((s) => s.practiceSessions);
  const analyzedJobs = useAnalyzedJobsStore((s) => s.jobs);

  const importApplications = useApplicationStore((s) => s.importApplications);
  const importProfile = useProfileStore((s) => s.importProfile);
  const importStories = useStoriesStore((s) => s.importStories);
  const importAnswers = useTechnicalAnswersStore((s) => s.importAnswers);
  const importPracticeSessions = useTechnicalAnswersStore((s) => s.importPracticeSessions);
  const importAnalyzedJobs = useAnalyzedJobsStore((s) => s.importJobs);

  // File input ref for triggering file picker
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Export all data to JSON file
   */
  const exportData = useCallback(() => {
    const data: ExportData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      applications,
      profile,
      stories,
      technicalAnswers,
      practiceSessions,
      analyzedJobs,
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
    parts.push('profile');

    toast.success('Data exported', `Exported: ${parts.join(', ')}`);
  }, [applications, profile, stories, technicalAnswers, practiceSessions, analyzedJobs]);

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
   */
  const importData = useCallback(
    async (file: File): Promise<ImportResult> => {
      const result: ImportResult = {
        success: false,
        imported: { applications: 0, stories: 0, profile: false, technicalAnswers: 0, practiceSessions: 0, analyzedJobs: 0 },
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
          hasProfile: !!data.profile,
        });

        // Import applications
        if (data.applications && Array.isArray(data.applications)) {
          const validApps = data.applications.filter(
            (app: unknown) =>
              app &&
              typeof app === 'object' &&
              'id' in app &&
              'company' in app
          ) as JobApplication[];

          if (validApps.length > 0) {
            importApplications(validApps);
            result.imported.applications = validApps.length;
          }
        }

        // Import stories
        if (data.stories && Array.isArray(data.stories)) {
          const validStories = data.stories.filter(
            (story: unknown) =>
              story &&
              typeof story === 'object' &&
              'id' in story &&
              'title' in story
          ) as Experience[];

          if (validStories.length > 0) {
            importStories(validStories);
            result.imported.stories = validStories.length;
          }
        }

        // Import profile
        if (data.profile && typeof data.profile === 'object' && 'name' in data.profile) {
          importProfile(data.profile as UserProfile);
          result.imported.profile = true;
        }

        // Import technical answers
        if (data.technicalAnswers && Array.isArray(data.technicalAnswers)) {
          const validAnswers = data.technicalAnswers.filter(
            (answer: unknown) =>
              answer &&
              typeof answer === 'object' &&
              'id' in answer &&
              'question' in answer
          ) as TechnicalAnswer[];

          if (validAnswers.length > 0) {
            importAnswers(validAnswers);
            result.imported.technicalAnswers = validAnswers.length;
          }
        }

        // Import practice sessions
        if (data.practiceSessions && Array.isArray(data.practiceSessions)) {
          const validSessions = data.practiceSessions.filter(
            (session: unknown) =>
              session &&
              typeof session === 'object' &&
              'id' in session &&
              'answerId' in session
          ) as PracticeSession[];

          if (validSessions.length > 0) {
            importPracticeSessions(validSessions);
            result.imported.practiceSessions = validSessions.length;
          }
        }

        // Import analyzed jobs
        if (data.analyzedJobs && Array.isArray(data.analyzedJobs)) {
          const validJobs = data.analyzedJobs.filter(
            (job: unknown) =>
              job &&
              typeof job === 'object' &&
              'id' in job &&
              'jobDescription' in job &&
              'analysis' in job
          ) as AnalyzedJob[];

          if (validJobs.length > 0) {
            importAnalyzedJobs(validJobs);
            result.imported.analyzedJobs = validJobs.length;
          }
        }

        // Small delay to ensure Zustand persist middleware writes to localStorage
        await new Promise(resolve => setTimeout(resolve, 100));

        result.success = true;

        // Show success toast
        const parts = [];
        if (result.imported.applications > 0) {
          parts.push(`${result.imported.applications} applications`);
        }
        if (result.imported.stories > 0) {
          parts.push(`${result.imported.stories} stories`);
        }
        if (result.imported.profile) {
          parts.push('profile');
        }
        if (result.imported.technicalAnswers > 0) {
          parts.push(`${result.imported.technicalAnswers} answers`);
        }
        if (result.imported.practiceSessions > 0) {
          parts.push(`${result.imported.practiceSessions} practice sessions`);
        }
        if (result.imported.analyzedJobs > 0) {
          parts.push(`${result.imported.analyzedJobs} analyzed jobs`);
        }

        if (parts.length > 0) {
          toast.success('Data imported', `Imported: ${parts.join(', ')}`);
          // Prompt user to reload if data was imported to ensure UI updates
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
        result.errors.push(
          error instanceof Error ? error.message : 'Unknown error'
        );
        toast.error('Import failed', result.errors[0]);
        return result;
      }
    },
    [importApplications, importStories, importProfile, importAnswers, importPracticeSessions, importAnalyzedJobs]
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
      hasProfile: profile.name !== 'Senior Engineer', // Check if profile has been customized
    };
  }, [applications.length, stories.length, technicalAnswers.length, practiceSessions.length, analyzedJobs.length, profile.name]);

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
  };
}

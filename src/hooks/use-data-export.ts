import { useCallback } from 'react';
import { useApplicationStore, useProfileStore, useStoriesStore, toast } from '@/src/stores';
import { downloadJSON, safeJSONParse } from '@/src/lib/utils';
import type { JobApplication, UserProfile, Experience } from '@/src/types';
import { z } from 'zod';

// Schema for validating imported data
const importSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  applications: z.array(z.any()).optional(),
  profile: z.any().optional(),
  stories: z.array(z.any()).optional(),
});

interface ExportData {
  version: string;
  exportedAt: string;
  applications: JobApplication[];
  profile: UserProfile;
  stories: Experience[];
}

interface ImportResult {
  success: boolean;
  imported: {
    applications: number;
    stories: number;
    profile: boolean;
  };
  errors: string[];
}

export function useDataExport() {
  const applications = useApplicationStore((s) => s.applications);
  const profile = useProfileStore((s) => s.profile);
  const stories = useStoriesStore((s) => s.stories);

  const importApplications = useApplicationStore((s) => s.importApplications);
  const importProfile = useProfileStore((s) => s.importProfile);
  const importStories = useStoriesStore((s) => s.importStories);

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
    };

    const filename = `jobhunt-hq-backup-${new Date().toISOString().split('T')[0]}.json`;
    downloadJSON(data, filename);

    toast.success('Data exported', `Saved to ${filename}`);
  }, [applications, profile, stories]);

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
        imported: { applications: 0, stories: 0, profile: false },
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

        if (parts.length > 0) {
          toast.success('Data imported', `Imported: ${parts.join(', ')}`);
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
    [importApplications, importStories, importProfile]
  );

  /**
   * Get data statistics
   */
  const getDataStats = useCallback(() => {
    return {
      applications: applications.length,
      stories: stories.length,
      hasProfile: profile.name !== 'Senior Engineer', // Check if profile has been customized
    };
  }, [applications.length, stories.length, profile.name]);

  return {
    exportData,
    exportApplications,
    exportStories,
    importData,
    getDataStats,
  };
}

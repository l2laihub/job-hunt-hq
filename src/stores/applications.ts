import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { JobApplication, ApplicationStatus, JDAnalysis, CompanyResearch } from '@/src/types';
import { STORAGE_KEYS } from '@/src/lib/constants';
import { generateId } from '@/src/lib/utils';
import { useProfileStore } from './profile';
import { createSyncedStorage, setupStoreSync } from '@/src/lib/storage-sync';

interface ApplicationsState {
  applications: JobApplication[];
  isLoading: boolean;
  selectedIds: string[];

  // Actions
  addApplication: (app: Partial<JobApplication>) => JobApplication;
  updateApplication: (id: string, updates: Partial<JobApplication>) => void;
  deleteApplication: (id: string) => void;
  deleteApplications: (ids: string[]) => void;
  moveApplication: (id: string, status: ApplicationStatus) => void;
  bulkUpdateStatus: (ids: string[], status: ApplicationStatus) => void;

  // Analysis & Research
  setAnalysis: (id: string, analysis: JDAnalysis) => void;
  setResearch: (id: string, research: CompanyResearch) => void;

  // Selection
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Import/Export
  importApplications: (apps: JobApplication[]) => void;
  exportApplications: () => JobApplication[];

  // Stats
  getStats: () => {
    total: number;
    byStatus: Record<ApplicationStatus, number>;
    responseRate: number;
  };

  // Profile-scoped getters
  getApplicationsForProfile: (profileId: string | null) => JobApplication[];
  getApplicationsForActiveProfile: () => JobApplication[];
}

export const useApplicationStore = create<ApplicationsState>()(
  persist(
    (set, get) => ({
      applications: [],
      isLoading: false,
      selectedIds: [],

      addApplication: (partial) => {
        const now = new Date().toISOString();
        // Get current active profile ID to link the application
        const activeProfile = useProfileStore.getState().getActiveProfile();
        const activeProfileId = activeProfile?.metadata.id;

        const newApp: JobApplication = {
          id: generateId(),
          type: partial.type || 'fulltime',
          company: partial.company || 'Unknown Company',
          role: partial.role || 'Unknown Role',
          status: partial.status || 'wishlist',
          source: partial.source || 'other',
          notes: partial.notes || '',
          salaryRange: partial.salaryRange,
          dateApplied: partial.dateApplied,
          jobDescriptionRaw: partial.jobDescriptionRaw,
          analysis: partial.analysis,
          companyResearch: partial.companyResearch,
          platform: partial.platform,
          proposalSent: partial.proposalSent,
          profileId: partial.profileId || activeProfileId, // Link to active profile
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          applications: [newApp, ...state.applications],
        }));

        return newApp;
      },

      updateApplication: (id, updates) => {
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? { ...app, ...updates, updatedAt: new Date().toISOString() }
              : app
          ),
        }));
      },

      deleteApplication: (id) => {
        set((state) => ({
          applications: state.applications.filter((app) => app.id !== id),
          selectedIds: state.selectedIds.filter((sid) => sid !== id),
        }));
      },

      deleteApplications: (ids) => {
        set((state) => ({
          applications: state.applications.filter((app) => !ids.includes(app.id)),
          selectedIds: state.selectedIds.filter((sid) => !ids.includes(sid)),
        }));
      },

      moveApplication: (id, status) => {
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? {
                  ...app,
                  status,
                  updatedAt: new Date().toISOString(),
                  dateApplied:
                    status === 'applied' && !app.dateApplied
                      ? new Date().toISOString()
                      : app.dateApplied,
                }
              : app
          ),
        }));
      },

      bulkUpdateStatus: (ids, status) => {
        set((state) => ({
          applications: state.applications.map((app) =>
            ids.includes(app.id)
              ? { ...app, status, updatedAt: new Date().toISOString() }
              : app
          ),
          selectedIds: [],
        }));
      },

      setAnalysis: (id, analysis) => {
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? { ...app, analysis, updatedAt: new Date().toISOString() }
              : app
          ),
        }));
      },

      setResearch: (id, research) => {
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? { ...app, companyResearch: research, updatedAt: new Date().toISOString() }
              : app
          ),
        }));
      },

      toggleSelection: (id) => {
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((sid) => sid !== id)
            : [...state.selectedIds, id],
        }));
      },

      selectAll: () => {
        set((state) => ({
          selectedIds: state.applications.map((app) => app.id),
        }));
      },

      clearSelection: () => {
        set({ selectedIds: [] });
      },

      importApplications: (apps) => {
        set((state) => {
          const existingIds = new Set(state.applications.map((a) => a.id));
          const newApps = apps.filter((a) => !existingIds.has(a.id));
          return {
            applications: [...newApps, ...state.applications],
          };
        });
      },

      exportApplications: () => {
        return get().applications;
      },

      getStats: () => {
        const apps = get().applications;
        const total = apps.length;

        const byStatus = apps.reduce(
          (acc, app) => {
            acc[app.status] = (acc[app.status] || 0) + 1;
            return acc;
          },
          {} as Record<ApplicationStatus, number>
        );

        // Response rate = (interviewing + offer + rejected) / total
        const responded =
          (byStatus.interviewing || 0) +
          (byStatus.offer || 0) +
          (byStatus.rejected || 0);
        const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

        return { total, byStatus, responseRate };
      },

      // Get applications for a specific profile
      getApplicationsForProfile: (profileId) => {
        const apps = get().applications;
        if (!profileId) return apps; // Return all if no profile specified
        return apps.filter((app) => app.profileId === profileId || !app.profileId);
      },

      // Get applications for the currently active profile
      getApplicationsForActiveProfile: () => {
        const apps = get().applications;
        const activeProfile = useProfileStore.getState().getActiveProfile();
        if (!activeProfile) return apps;
        // Return apps that match the profile OR have no profile (legacy apps)
        return apps.filter(
          (app) => app.profileId === activeProfile.metadata.id || !app.profileId
        );
      },
    }),
    {
      name: STORAGE_KEYS.APPLICATIONS,
      storage: createJSONStorage(() => createSyncedStorage()),
      partialize: (state) => ({ applications: state.applications }),
    }
  )
);

// Set up cross-tab sync for applications store
let applicationsSyncUnsubscribe: (() => void) | null = null;

export function initApplicationsSync(): void {
  if (applicationsSyncUnsubscribe) return;

  applicationsSyncUnsubscribe = setupStoreSync<ApplicationsState>(
    STORAGE_KEYS.APPLICATIONS,
    (updates) => useApplicationStore.setState(updates),
    () => ['applications']
  );
}

export function destroyApplicationsSync(): void {
  if (applicationsSyncUnsubscribe) {
    applicationsSyncUnsubscribe();
    applicationsSyncUnsubscribe = null;
  }
}

// Migration helper for legacy data
export function migrateLegacyApplications(): void {
  const legacyData = localStorage.getItem(STORAGE_KEYS.LEGACY_APPLICATIONS);
  if (legacyData && !localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) {
    try {
      const apps = JSON.parse(legacyData) as JobApplication[];
      useApplicationStore.getState().importApplications(apps);
      console.log(`Migrated ${apps.length} applications from legacy storage`);
    } catch (error) {
      console.error('Failed to migrate legacy applications:', error);
    }
  }
}

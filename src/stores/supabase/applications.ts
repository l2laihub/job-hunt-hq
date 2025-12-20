/**
 * Applications Store - Supabase Version
 * Manages job applications with Supabase backend
 */
import { create } from 'zustand';
import type { JobApplication, ApplicationStatus, JDAnalysis, CompanyResearch } from '@/src/types';
import { applicationsService } from '@/src/services/database';
import { generateId } from '@/src/lib/utils';

interface ApplicationsState {
  applications: JobApplication[];
  isLoading: boolean;
  error: string | null;
  selectedIds: string[];

  // Data fetching
  fetchApplications: () => Promise<void>;

  // Actions
  addApplication: (app: Partial<JobApplication>) => Promise<JobApplication>;
  updateApplication: (id: string, updates: Partial<JobApplication>) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  deleteApplications: (ids: string[]) => Promise<void>;
  moveApplication: (id: string, status: ApplicationStatus) => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: ApplicationStatus) => Promise<void>;

  // Analysis & Research
  setAnalysis: (id: string, analysis: JDAnalysis) => Promise<void>;
  setResearch: (id: string, research: CompanyResearch) => Promise<void>;

  // Selection
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Import/Export
  importApplications: (apps: JobApplication[]) => Promise<void>;
  exportApplications: () => JobApplication[];

  // Stats
  getStats: () => {
    total: number;
    byStatus: Record<ApplicationStatus, number>;
    responseRate: number;
  };

  // Profile-scoped getters
  getApplicationsForProfile: (profileId: string | null) => JobApplication[];
  getApplicationsForActiveProfile: (activeProfileId: string | null) => JobApplication[];

  // Real-time subscription
  subscribeToChanges: () => () => void;
}

export const useSupabaseApplicationStore = create<ApplicationsState>()((set, get) => ({
  applications: [],
  isLoading: false,
  error: null,
  selectedIds: [],

  fetchApplications: async () => {
    set({ isLoading: true, error: null });
    try {
      const applications = await applicationsService.list();
      set({ applications, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch applications',
        isLoading: false,
      });
    }
  },

  addApplication: async (partial) => {
    const now = new Date().toISOString();
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
      profileId: partial.profileId,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const created = await applicationsService.create(newApp);
      set((state) => ({
        applications: [created, ...state.applications],
      }));
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add application' });
      throw error;
    }
  },

  updateApplication: async (id, updates) => {
    try {
      const updated = await applicationsService.update(id, updates);
      set((state) => ({
        applications: state.applications.map((app) =>
          app.id === id ? updated : app
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update application' });
      throw error;
    }
  },

  deleteApplication: async (id) => {
    try {
      await applicationsService.delete(id);
      set((state) => ({
        applications: state.applications.filter((app) => app.id !== id),
        selectedIds: state.selectedIds.filter((sid) => sid !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete application' });
      throw error;
    }
  },

  deleteApplications: async (ids) => {
    try {
      await applicationsService.deleteMany(ids);
      set((state) => ({
        applications: state.applications.filter((app) => !ids.includes(app.id)),
        selectedIds: state.selectedIds.filter((sid) => !ids.includes(sid)),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete applications' });
      throw error;
    }
  },

  moveApplication: async (id, status) => {
    try {
      const updated = await applicationsService.updateStatus(id, status);
      set((state) => ({
        applications: state.applications.map((app) =>
          app.id === id ? updated : app
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to move application' });
      throw error;
    }
  },

  bulkUpdateStatus: async (ids, status) => {
    try {
      await applicationsService.bulkUpdateStatus(ids, status);
      set((state) => ({
        applications: state.applications.map((app) =>
          ids.includes(app.id)
            ? { ...app, status, updatedAt: new Date().toISOString() }
            : app
        ),
        selectedIds: [],
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update status' });
      throw error;
    }
  },

  setAnalysis: async (id, analysis) => {
    try {
      const updated = await applicationsService.setAnalysis(id, analysis);
      set((state) => ({
        applications: state.applications.map((app) =>
          app.id === id ? updated : app
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to set analysis' });
      throw error;
    }
  },

  setResearch: async (id, research) => {
    try {
      const updated = await applicationsService.setResearch(id, research);
      set((state) => ({
        applications: state.applications.map((app) =>
          app.id === id ? updated : app
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to set research' });
      throw error;
    }
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

  importApplications: async (apps) => {
    try {
      await applicationsService.upsertMany(apps);
      await get().fetchApplications();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to import applications' });
      throw error;
    }
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

    const responded =
      (byStatus.interviewing || 0) +
      (byStatus.offer || 0) +
      (byStatus.rejected || 0);
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

    return { total, byStatus, responseRate };
  },

  getApplicationsForProfile: (profileId) => {
    const apps = get().applications;
    if (!profileId) return apps;
    return apps.filter((app) => app.profileId === profileId || !app.profileId);
  },

  getApplicationsForActiveProfile: (activeProfileId) => {
    const apps = get().applications;
    if (!activeProfileId) return apps;
    return apps.filter(
      (app) => app.profileId === activeProfileId || !app.profileId
    );
  },

  subscribeToChanges: () => {
    return applicationsService.subscribe((applications) => {
      set({ applications });
    });
  },
}));

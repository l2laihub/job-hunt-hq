/**
 * Company Research Store - Supabase Version
 * Manages company research with Supabase backend
 */
import { create } from 'zustand';
import type { CompanyResearch } from '@/src/types';
import { companyResearchService } from '@/src/services/database';

interface CompanyResearchState {
  researches: CompanyResearch[];
  isLoading: boolean;
  error: string | null;

  // Data fetching
  fetchResearches: () => Promise<void>;

  // Actions
  addResearch: (research: Omit<CompanyResearch, 'id'>) => Promise<CompanyResearch>;
  updateResearch: (id: string, updates: Partial<CompanyResearch>) => Promise<void>;
  deleteResearch: (id: string) => Promise<void>;
  getResearchByCompany: (companyName: string) => CompanyResearch | undefined;
  getResearchById: (id: string) => CompanyResearch | undefined;

  // Import/Export
  importResearches: (researches: CompanyResearch[]) => Promise<void>;
  exportResearches: () => CompanyResearch[];

  // Stats
  getStats: () => {
    total: number;
    byVerdict: Record<'green' | 'yellow' | 'red', number>;
  };

  // Real-time subscription
  subscribeToChanges: () => () => void;
}

export const useSupabaseCompanyResearchStore = create<CompanyResearchState>()((set, get) => ({
  researches: [],
  isLoading: false,
  error: null,

  fetchResearches: async () => {
    set({ isLoading: true, error: null });
    try {
      const researches = await companyResearchService.list();
      set({ researches, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch researches',
        isLoading: false,
      });
    }
  },

  addResearch: async (researchData) => {
    try {
      // Use upsert which handles both create and update by company name
      const created = await companyResearchService.upsert(researchData);

      // Update local state
      set((state) => {
        // Check if we're updating an existing research
        const existingIndex = state.researches.findIndex(
          (r) => r.companyName.toLowerCase() === created.companyName.toLowerCase()
        );

        if (existingIndex >= 0) {
          // Update existing
          const newResearches = [...state.researches];
          newResearches[existingIndex] = created;
          return { researches: newResearches };
        } else {
          // Add new
          return { researches: [created, ...state.researches] };
        }
      });

      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add research' });
      throw error;
    }
  },

  updateResearch: async (id, updates) => {
    try {
      // Get current research to merge with updates
      const current = get().researches.find((r) => r.id === id);
      if (!current) throw new Error('Research not found');

      const updated = await companyResearchService.upsert({
        ...current,
        ...updates,
      });

      set((state) => ({
        researches: state.researches.map((r) =>
          r.id === id ? updated : r
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update research' });
      throw error;
    }
  },

  deleteResearch: async (id) => {
    try {
      await companyResearchService.delete(id);
      set((state) => ({
        researches: state.researches.filter((r) => r.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete research' });
      throw error;
    }
  },

  getResearchByCompany: (companyName) => {
    return get().researches.find(
      (r) => r.companyName.toLowerCase() === companyName.toLowerCase()
    );
  },

  getResearchById: (id) => {
    return get().researches.find((r) => r.id === id);
  },

  importResearches: async (researches) => {
    try {
      await companyResearchService.upsertMany(researches);
      await get().fetchResearches();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to import researches' });
      throw error;
    }
  },

  exportResearches: () => {
    return get().researches;
  },

  getStats: () => {
    const researches = get().researches;
    const total = researches.length;

    const byVerdict = researches.reduce(
      (acc, r) => {
        acc[r.verdict.overall] = (acc[r.verdict.overall] || 0) + 1;
        return acc;
      },
      { green: 0, yellow: 0, red: 0 } as Record<'green' | 'yellow' | 'red', number>
    );

    return { total, byVerdict };
  },

  subscribeToChanges: () => {
    return companyResearchService.subscribe((researches) => {
      set({ researches });
    });
  },
}));

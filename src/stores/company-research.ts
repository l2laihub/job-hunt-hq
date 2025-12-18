import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CompanyResearch } from '@/src/types';
import { STORAGE_KEYS } from '@/src/lib/constants';
import { generateId } from '@/src/lib/utils';

interface CompanyResearchState {
  researches: CompanyResearch[];
  isLoading: boolean;

  // Actions
  addResearch: (research: Omit<CompanyResearch, 'id'>) => CompanyResearch;
  updateResearch: (id: string, updates: Partial<CompanyResearch>) => void;
  deleteResearch: (id: string) => void;
  getResearchByCompany: (companyName: string) => CompanyResearch | undefined;
  getResearchById: (id: string) => CompanyResearch | undefined;

  // Import/Export
  importResearches: (researches: CompanyResearch[]) => void;
  exportResearches: () => CompanyResearch[];

  // Stats
  getStats: () => {
    total: number;
    byVerdict: Record<'green' | 'yellow' | 'red', number>;
  };
}

export const useCompanyResearchStore = create<CompanyResearchState>()(
  persist(
    (set, get) => ({
      researches: [],
      isLoading: false,

      addResearch: (researchData) => {
        const existingResearch = get().researches.find(
          (r) => r.companyName.toLowerCase() === researchData.companyName.toLowerCase()
        );

        // If research for this company exists, update it instead
        if (existingResearch) {
          const updated = {
            ...existingResearch,
            ...researchData,
            id: existingResearch.id,
            searchedAt: new Date().toISOString(),
          };
          set((state) => ({
            researches: state.researches.map((r) =>
              r.id === existingResearch.id ? updated : r
            ),
          }));
          return updated;
        }

        // Create new research entry
        const newResearch: CompanyResearch = {
          ...researchData,
          id: generateId(),
        };

        set((state) => ({
          researches: [newResearch, ...state.researches],
        }));

        return newResearch;
      },

      updateResearch: (id, updates) => {
        set((state) => ({
          researches: state.researches.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      deleteResearch: (id) => {
        set((state) => ({
          researches: state.researches.filter((r) => r.id !== id),
        }));
      },

      getResearchByCompany: (companyName) => {
        return get().researches.find(
          (r) => r.companyName.toLowerCase() === companyName.toLowerCase()
        );
      },

      getResearchById: (id) => {
        return get().researches.find((r) => r.id === id);
      },

      importResearches: (researches) => {
        set((state) => {
          const existingIds = new Set(state.researches.map((r) => r.id));
          const existingCompanies = new Set(
            state.researches.map((r) => r.companyName.toLowerCase())
          );

          // Filter out duplicates by ID or company name
          const newResearches = researches.filter(
            (r) =>
              !existingIds.has(r.id) &&
              !existingCompanies.has(r.companyName.toLowerCase())
          );

          return {
            researches: [...newResearches, ...state.researches],
          };
        });
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
    }),
    {
      name: STORAGE_KEYS.COMPANY_RESEARCH,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ researches: state.researches }),
    }
  )
);

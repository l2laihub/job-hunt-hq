/**
 * Topic Research Store (localStorage)
 * Local persistence for topic research results
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  TopicResearch,
  TopicResearchType,
} from '@/src/types/topic-research';
import { STORAGE_KEYS } from '@/src/lib/constants';
import { generateId } from '@/src/lib/utils';

interface TopicResearchState {
  researches: TopicResearch[];
  isLoading: boolean;

  // Filter state
  filterType: TopicResearchType | 'all';
  searchQuery: string;

  // Actions
  addResearch: (research: Omit<TopicResearch, 'id' | 'createdAt' | 'updatedAt'>) => TopicResearch;
  updateResearch: (id: string, updates: Partial<TopicResearch>) => void;
  deleteResearch: (id: string) => void;
  toggleFavorite: (id: string) => void;

  // Getters
  getById: (id: string) => TopicResearch | undefined;
  getByType: (type: TopicResearchType) => TopicResearch[];
  getByApplication: (applicationId: string) => TopicResearch[];
  getFavorites: () => TopicResearch[];
  getRecent: (limit?: number) => TopicResearch[];
  getFiltered: () => TopicResearch[];

  // Filters
  setFilterType: (type: TopicResearchType | 'all') => void;
  setSearchQuery: (query: string) => void;

  // Import/Export
  importResearches: (researches: TopicResearch[]) => void;
  exportResearches: () => TopicResearch[];

  // Stats
  getStats: () => {
    total: number;
    byType: Record<TopicResearchType, number>;
    favorites: number;
  };

  // Reset
  reset: () => void;
}

export const useTopicResearchStore = create<TopicResearchState>()(
  persist(
    (set, get) => ({
      researches: [],
      isLoading: false,
      filterType: 'all',
      searchQuery: '',

      addResearch: (researchData) => {
        const now = new Date().toISOString();
        const newResearch: TopicResearch = {
          ...researchData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        } as TopicResearch;

        set((state) => ({
          researches: [newResearch, ...state.researches],
        }));

        return newResearch;
      },

      updateResearch: (id, updates) => {
        set((state) => ({
          researches: state.researches.map((r) =>
            r.id === id
              ? { ...r, ...updates, updatedAt: new Date().toISOString() }
              : r
          ),
        }));
      },

      deleteResearch: (id) => {
        set((state) => ({
          researches: state.researches.filter((r) => r.id !== id),
        }));
      },

      toggleFavorite: (id) => {
        set((state) => ({
          researches: state.researches.map((r) =>
            r.id === id
              ? { ...r, isFavorite: !r.isFavorite, updatedAt: new Date().toISOString() }
              : r
          ),
        }));
      },

      getById: (id) => {
        return get().researches.find((r) => r.id === id);
      },

      getByType: (type) => {
        return get().researches.filter((r) => r.type === type);
      },

      getByApplication: (applicationId) => {
        return get().researches.filter((r) => r.applicationId === applicationId);
      },

      getFavorites: () => {
        return get().researches.filter((r) => r.isFavorite);
      },

      getRecent: (limit = 10) => {
        return get().researches
          .sort((a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime())
          .slice(0, limit);
      },

      getFiltered: () => {
        const { researches, filterType, searchQuery } = get();

        let filtered = researches;

        // Filter by type
        if (filterType !== 'all') {
          filtered = filtered.filter((r) => r.type === filterType);
        }

        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (r) =>
              r.query.toLowerCase().includes(query) ||
              r.tags.some((t) => t.toLowerCase().includes(query)) ||
              r.companyContext?.toLowerCase().includes(query) ||
              r.roleContext?.toLowerCase().includes(query)
          );
        }

        // Sort by most recent
        return filtered.sort(
          (a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime()
        );
      },

      setFilterType: (type) => {
        set({ filterType: type });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      importResearches: (researches) => {
        set((state) => {
          const existingIds = new Set(state.researches.map((r) => r.id));

          // Filter out duplicates by ID
          const newResearches = researches.filter((r) => !existingIds.has(r.id));

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
        const favorites = researches.filter((r) => r.isFavorite).length;

        const byType = researches.reduce(
          (acc, r) => {
            acc[r.type] = (acc[r.type] || 0) + 1;
            return acc;
          },
          { salary: 0, industry: 0, technical: 0, interview: 0 } as Record<TopicResearchType, number>
        );

        return { total, byType, favorites };
      },

      reset: () => {
        set({
          researches: [],
          filterType: 'all',
          searchQuery: '',
        });
      },
    }),
    {
      name: STORAGE_KEYS.TOPIC_RESEARCH,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ researches: state.researches }),
    }
  )
);

/**
 * Helper hook to get filtered researches
 */
export function useFilteredResearches(): TopicResearch[] {
  return useTopicResearchStore((state) => state.getFiltered());
}

/**
 * Helper hook to get research stats
 */
export function useResearchStats() {
  return useTopicResearchStore((state) => state.getStats());
}

/**
 * Enhancements Store - Supabase Version
 * Manages resume enhancement data with Supabase backend
 */
import { create } from 'zustand';
import type {
  ResumeEnhancement,
  ResumeAnalysis,
  EnhancementSuggestion,
  EnhancedProfile,
  EnhancementMode,
} from '@/src/types';
import { enhancementsService } from '@/src/services/database';

interface EnhancementsState {
  enhancements: ResumeEnhancement[];
  isLoading: boolean;
  error: string | null;

  // Data fetching
  fetchEnhancements: () => Promise<void>;

  // Actions
  addEnhancement: (params: {
    mode: EnhancementMode;
    analysis: ResumeAnalysis;
    suggestions: EnhancementSuggestion[];
    enhancedProfile: EnhancedProfile;
    jobId?: string;
    jobTitle?: string;
    companyName?: string;
  }) => Promise<ResumeEnhancement>;

  updateEnhancement: (id: string, updates: Partial<ResumeEnhancement>) => Promise<void>;
  deleteEnhancement: (id: string) => Promise<void>;
  getEnhancement: (id: string) => ResumeEnhancement | undefined;
  getEnhancementsByJob: (jobId: string) => ResumeEnhancement[];

  // Import/Export
  importEnhancements: (enhancements: ResumeEnhancement[]) => Promise<void>;
  exportEnhancements: () => ResumeEnhancement[];

  // Clear
  clearAll: () => Promise<void>;

  // Real-time subscription
  subscribeToChanges: () => () => void;
}

export const useSupabaseEnhancementsStore = create<EnhancementsState>()((set, get) => ({
  enhancements: [],
  isLoading: false,
  error: null,

  fetchEnhancements: async () => {
    set({ isLoading: true, error: null });
    try {
      const enhancements = await enhancementsService.list();
      set({ enhancements, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch enhancements',
        isLoading: false,
      });
    }
  },

  addEnhancement: async (params) => {
    try {
      const created = await enhancementsService.create(params);
      set((state) => ({
        enhancements: [created, ...state.enhancements],
      }));
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add enhancement' });
      throw error;
    }
  },

  updateEnhancement: async (id, updates) => {
    try {
      const updated = await enhancementsService.update(id, updates);
      set((state) => ({
        enhancements: state.enhancements.map((e) => (e.id === id ? updated : e)),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update enhancement' });
      throw error;
    }
  },

  deleteEnhancement: async (id) => {
    try {
      await enhancementsService.delete(id);
      set((state) => ({
        enhancements: state.enhancements.filter((e) => e.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete enhancement' });
      throw error;
    }
  },

  getEnhancement: (id) => {
    return get().enhancements.find((e) => e.id === id);
  },

  getEnhancementsByJob: (jobId) => {
    return get().enhancements.filter((e) => e.jobId === jobId);
  },

  importEnhancements: async (enhancements) => {
    try {
      await enhancementsService.upsertMany(enhancements);
      await get().fetchEnhancements();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to import enhancements' });
      throw error;
    }
  },

  exportEnhancements: () => {
    return get().enhancements;
  },

  clearAll: async () => {
    try {
      const enhancements = get().enhancements;
      await Promise.all(enhancements.map((e) => enhancementsService.delete(e.id)));
      set({ enhancements: [] });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to clear enhancements' });
      throw error;
    }
  },

  subscribeToChanges: () => {
    return enhancementsService.subscribe((enhancements) => {
      set({ enhancements });
    });
  },
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResumeEnhancement, ResumeAnalysis, EnhancementSuggestion, EnhancedProfile, EnhancementMode } from '@/src/types';
import { generateId } from '@/src/lib/utils';

const STORAGE_KEY = 'jobhunt-hq-enhancements';

interface EnhancementsState {
  enhancements: ResumeEnhancement[];

  // Actions
  addEnhancement: (params: {
    mode: EnhancementMode;
    analysis: ResumeAnalysis;
    suggestions: EnhancementSuggestion[];
    enhancedProfile: EnhancedProfile;
    jobId?: string;
    jobTitle?: string;
    companyName?: string;
  }) => ResumeEnhancement;

  updateEnhancement: (id: string, updates: Partial<ResumeEnhancement>) => void;
  deleteEnhancement: (id: string) => void;
  getEnhancement: (id: string) => ResumeEnhancement | undefined;
  getEnhancementsByJob: (jobId: string) => ResumeEnhancement[];
  clearAll: () => void;
}

export const useEnhancementsStore = create<EnhancementsState>()(
  persist(
    (set, get) => ({
      enhancements: [],

      addEnhancement: (params) => {
        const now = new Date().toISOString();
        const newEnhancement: ResumeEnhancement = {
          id: generateId(),
          mode: params.mode,
          jobId: params.jobId,
          jobTitle: params.jobTitle,
          companyName: params.companyName,
          analysis: params.analysis,
          suggestions: params.suggestions,
          appliedSuggestionIds: [],
          enhancedProfile: params.enhancedProfile,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          enhancements: [newEnhancement, ...state.enhancements],
        }));

        return newEnhancement;
      },

      updateEnhancement: (id, updates) => {
        set((state) => ({
          enhancements: state.enhancements.map((e) =>
            e.id === id
              ? { ...e, ...updates, updatedAt: new Date().toISOString() }
              : e
          ),
        }));
      },

      deleteEnhancement: (id) => {
        set((state) => ({
          enhancements: state.enhancements.filter((e) => e.id !== id),
        }));
      },

      getEnhancement: (id) => {
        return get().enhancements.find((e) => e.id === id);
      },

      getEnhancementsByJob: (jobId) => {
        return get().enhancements.filter((e) => e.jobId === jobId);
      },

      clearAll: () => {
        set({ enhancements: [] });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
    }
  )
);

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Experience, STAR } from '@/src/types';
import { STORAGE_KEYS } from '@/src/lib/constants';
import { generateId } from '@/src/lib/utils';
import { createSyncedStorage, setupStoreSync } from '@/src/lib/storage-sync';

interface StoriesState {
  stories: Experience[];
  isLoading: boolean;

  // Actions
  addStory: (story: Partial<Experience>, profileId?: string) => Experience;
  updateStory: (id: string, updates: Partial<Experience>) => void;
  deleteStory: (id: string) => void;

  // Story usage tracking
  incrementUsage: (id: string) => void;
  recordUsedInInterview: (id: string, interviewId: string) => void;

  // Search & Filter
  getStoriesByTags: (tags: string[]) => Experience[];
  searchStories: (query: string) => Experience[];

  // Profile-filtered queries
  getStoriesByProfile: (profileId: string) => Experience[];

  // Import/Export
  importStories: (stories: Experience[]) => void;
  exportStories: () => Experience[];
}

export const useStoriesStore = create<StoriesState>()(
  persist(
    (set, get) => ({
      stories: [],
      isLoading: false,

      addStory: (partial, profileId) => {
        const now = new Date().toISOString();
        const newStory: Experience = {
          id: generateId(),
          title: partial.title || 'Untitled Story',
          rawInput: partial.rawInput || '',
          inputMethod: partial.inputMethod || 'manual',
          star: partial.star || {
            situation: '',
            task: '',
            action: '',
            result: '',
          },
          metrics: partial.metrics || {
            primary: undefined,
            secondary: [],
            missing: [],
          },
          tags: partial.tags || [],
          variations: partial.variations || {},
          followUpQuestions: partial.followUpQuestions || [],
          coachingNotes: partial.coachingNotes,
          usedInInterviews: [],
          timesUsed: 0,
          createdAt: now,
          updatedAt: now,
          profileId: profileId || partial.profileId,
        };

        set((state) => ({
          stories: [newStory, ...state.stories],
        }));

        return newStory;
      },

      updateStory: (id, updates) => {
        set((state) => ({
          stories: state.stories.map((story) =>
            story.id === id
              ? { ...story, ...updates, updatedAt: new Date().toISOString() }
              : story
          ),
        }));
      },

      deleteStory: (id) => {
        set((state) => ({
          stories: state.stories.filter((story) => story.id !== id),
        }));
      },

      incrementUsage: (id) => {
        set((state) => ({
          stories: state.stories.map((story) =>
            story.id === id
              ? {
                  ...story,
                  timesUsed: story.timesUsed + 1,
                  updatedAt: new Date().toISOString(),
                }
              : story
          ),
        }));
      },

      recordUsedInInterview: (id, interviewId) => {
        set((state) => ({
          stories: state.stories.map((story) =>
            story.id === id
              ? {
                  ...story,
                  usedInInterviews: [...(story.usedInInterviews || []), interviewId],
                  timesUsed: story.timesUsed + 1,
                  updatedAt: new Date().toISOString(),
                }
              : story
          ),
        }));
      },

      getStoriesByTags: (tags) => {
        const stories = get().stories;
        if (tags.length === 0) return stories;
        return stories.filter((story) =>
          tags.some((tag) => story.tags.includes(tag))
        );
      },

      searchStories: (query) => {
        const stories = get().stories;
        const lowerQuery = query.toLowerCase();
        return stories.filter(
          (story) =>
            story.title.toLowerCase().includes(lowerQuery) ||
            story.star.situation.toLowerCase().includes(lowerQuery) ||
            story.star.action.toLowerCase().includes(lowerQuery) ||
            story.star.result.toLowerCase().includes(lowerQuery) ||
            story.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
        );
      },

      getStoriesByProfile: (profileId) => {
        return get().stories.filter((story) => story.profileId === profileId);
      },

      importStories: (stories) => {
        set((state) => {
          // Deduplicate by ID first
          const existingIds = new Set(state.stories.map((s) => s.id));
          // Then deduplicate by title to prevent duplicate entries
          const existingTitles = new Set(state.stories.map((s) => s.title.toLowerCase()));
          const newStories = stories.filter((s) =>
            !existingIds.has(s.id) &&
            !existingTitles.has(s.title.toLowerCase())
          );
          return {
            stories: [...newStories, ...state.stories],
          };
        });
      },

      exportStories: () => {
        return get().stories;
      },
    }),
    {
      name: STORAGE_KEYS.STORIES,
      storage: createJSONStorage(() => createSyncedStorage()),
      partialize: (state) => ({ stories: state.stories }),
    }
  )
);

// Set up cross-tab sync for stories store
let storiesSyncUnsubscribe: (() => void) | null = null;

export function initStoriesSync(): void {
  if (storiesSyncUnsubscribe) return;

  storiesSyncUnsubscribe = setupStoreSync<StoriesState>(
    STORAGE_KEYS.STORIES,
    (updates) => useStoriesStore.setState(updates),
    () => ['stories']
  );
}

export function destroyStoriesSync(): void {
  if (storiesSyncUnsubscribe) {
    storiesSyncUnsubscribe();
    storiesSyncUnsubscribe = null;
  }
}

// Migration helper for legacy data
export function migrateLegacyStories(): void {
  const legacyData = localStorage.getItem(STORAGE_KEYS.LEGACY_STORIES);
  if (legacyData && !localStorage.getItem(STORAGE_KEYS.STORIES)) {
    try {
      const stories = JSON.parse(legacyData) as Experience[];
      useStoriesStore.getState().importStories(stories);
      console.log(`Migrated ${stories.length} stories from legacy storage`);
    } catch (error) {
      console.error('Failed to migrate legacy stories:', error);
    }
  }
}

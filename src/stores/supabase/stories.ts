/**
 * Stories Store - Supabase Version
 * Manages experience stories with Supabase backend
 */
import { create } from 'zustand';
import type { Experience } from '@/src/types';
import { storiesService } from '@/src/services/database';
import { generateId } from '@/src/lib/utils';

interface StoriesState {
  stories: Experience[];
  isLoading: boolean;
  error: string | null;

  // Data fetching
  fetchStories: () => Promise<void>;

  // Actions
  addStory: (story: Partial<Experience>, profileId?: string) => Promise<Experience>;
  updateStory: (id: string, updates: Partial<Experience>) => Promise<void>;
  deleteStory: (id: string) => Promise<void>;

  // Story usage tracking
  incrementUsage: (id: string) => Promise<void>;
  recordUsedInInterview: (id: string, interviewId: string) => Promise<void>;

  // Search & Filter
  getStoriesByTags: (tags: string[]) => Experience[];
  searchStories: (query: string) => Experience[];

  // Profile-filtered queries
  getStoriesByProfile: (profileId: string) => Experience[];

  // Import/Export
  importStories: (stories: Experience[]) => Promise<void>;
  exportStories: () => Experience[];

  // Real-time subscription
  subscribeToChanges: () => () => void;
}

export const useSupabaseStoriesStore = create<StoriesState>()((set, get) => ({
  stories: [],
  isLoading: false,
  error: null,

  fetchStories: async () => {
    set({ isLoading: true, error: null });
    try {
      const stories = await storiesService.list();
      set({ stories, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch stories',
        isLoading: false,
      });
    }
  },

  addStory: async (partial, profileId) => {
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
      // Preserve generated answer metadata for rich viewing of AI-generated answers
      generatedAnswerMetadata: partial.generatedAnswerMetadata,
    };

    try {
      const created = await storiesService.create(newStory);
      set((state) => ({
        stories: [created, ...state.stories],
      }));
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add story' });
      throw error;
    }
  },

  updateStory: async (id, updates) => {
    try {
      const updated = await storiesService.update(id, updates);
      set((state) => ({
        stories: state.stories.map((story) =>
          story.id === id ? updated : story
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update story' });
      throw error;
    }
  },

  deleteStory: async (id) => {
    try {
      await storiesService.delete(id);
      set((state) => ({
        stories: state.stories.filter((story) => story.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete story' });
      throw error;
    }
  },

  incrementUsage: async (id) => {
    try {
      await storiesService.incrementUsage(id);
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
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to increment usage' });
      throw error;
    }
  },

  recordUsedInInterview: async (id, interviewId) => {
    try {
      await storiesService.recordUsedInInterview(id, interviewId);
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
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to record interview usage' });
      throw error;
    }
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

  importStories: async (stories) => {
    try {
      await storiesService.upsertMany(stories);
      await get().fetchStories();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to import stories' });
      throw error;
    }
  },

  exportStories: () => {
    return get().stories;
  },

  subscribeToChanges: () => {
    return storiesService.subscribe((stories) => {
      set({ stories });
    });
  },
}));

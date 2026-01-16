/**
 * Preferences Store
 *
 * Manages user preferences for the AI Assistant.
 * Handles loading, saving, and filtering preferences.
 */
import { create } from 'zustand';
import type {
  UserPreference,
  MessageFeedback,
  PreferenceCategory,
  PreferenceSource,
  PreferenceConfidence,
  FeedbackType,
} from '@/src/types';
import { preferencesService, messageFeedbackService } from '@/src/services/database';
import { filterPreferencesForContext, sortPreferencesByRelevance } from '@/src/types/preferences';

// ============================================
// STATE TYPES
// ============================================

interface PreferencesState {
  // Preferences
  preferences: UserPreference[];
  isLoading: boolean;
  error: string | null;

  // Feedback state
  pendingFeedback: Map<string, 'positive' | 'negative'>;

  // Toast notification state
  lastLearnedPreference: UserPreference | null;
  showLearningToast: boolean;

  // Actions
  loadPreferences: () => Promise<void>;
  addPreference: (
    category: PreferenceCategory,
    key: string,
    value: string | boolean | number,
    source: PreferenceSource,
    confidence?: PreferenceConfidence,
    description?: string
  ) => Promise<UserPreference>;
  updatePreference: (id: string, updates: Partial<UserPreference>) => Promise<void>;
  deletePreference: (id: string) => Promise<void>;
  togglePreference: (id: string) => Promise<void>;
  reinforcePreference: (id: string) => Promise<void>;
  recordUsage: (id: string) => Promise<void>;
  resetAllPreferences: () => Promise<void>;

  // Feedback actions
  submitFeedback: (
    messageId: string,
    chatId: string,
    rating: 'positive' | 'negative',
    messagePreview: string,
    userQuery: string,
    category: PreferenceCategory,
    feedbackType?: FeedbackType,
    correction?: string
  ) => Promise<MessageFeedback>;

  // Selectors (computed)
  getPreferencesForContext: (contextType: PreferenceCategory) => UserPreference[];
  getActivePreferences: () => UserPreference[];
  getPreferenceByKey: (category: PreferenceCategory, key: string) => UserPreference | undefined;

  // Toast actions
  dismissLearningToast: () => void;
  showPreferenceLearned: (preference: UserPreference) => void;

  // Reset
  clearError: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState = {
  preferences: [] as UserPreference[],
  isLoading: false,
  error: null as string | null,
  pendingFeedback: new Map<string, 'positive' | 'negative'>(),
  lastLearnedPreference: null as UserPreference | null,
  showLearningToast: false,
};

// ============================================
// STORE
// ============================================

export const usePreferencesStore = create<PreferencesState>()((set, get) => ({
  ...initialState,

  // ============================================
  // LOAD PREFERENCES
  // ============================================

  loadPreferences: async () => {
    set({ isLoading: true, error: null });

    try {
      const preferences = await preferencesService.getActive();
      set({ preferences, isLoading: false });
    } catch (error) {
      console.error('Failed to load preferences:', error);
      set({
        error: 'Failed to load preferences',
        isLoading: false,
      });
    }
  },

  // ============================================
  // ADD PREFERENCE
  // ============================================

  addPreference: async (
    category,
    key,
    value,
    source,
    confidence = 'medium',
    description
  ) => {
    set({ error: null });

    try {
      // Check if preference already exists
      const existing = get().getPreferenceByKey(category, key);

      if (existing) {
        // Update existing preference with new value
        // If same value, reinforce confidence
        if (existing.value === value) {
          await get().reinforcePreference(existing.id);
          return existing;
        } else {
          // Different value - update with new value (recent action wins)
          const updated = await preferencesService.update(existing.id, {
            value,
            source,
            confidence: source === 'explicit' ? 'high' : confidence,
          });
          set((state) => ({
            preferences: state.preferences.map((p) =>
              p.id === existing.id ? updated : p
            ),
          }));
          get().showPreferenceLearned(updated);
          return updated;
        }
      }

      // Create new preference
      const newPref = await preferencesService.create({
        category,
        key,
        value,
        source,
        confidence: source === 'explicit' ? 'high' : confidence,
        description,
        appliedCount: 0,
        isActive: true,
      });

      set((state) => ({
        preferences: [...state.preferences, newPref],
      }));

      // Show toast for newly learned preference
      get().showPreferenceLearned(newPref);

      return newPref;
    } catch (error) {
      console.error('Failed to add preference:', error);
      set({ error: 'Failed to save preference' });
      throw error;
    }
  },

  // ============================================
  // UPDATE PREFERENCE
  // ============================================

  updatePreference: async (id, updates) => {
    set({ error: null });

    try {
      const updated = await preferencesService.update(id, updates);
      set((state) => ({
        preferences: state.preferences.map((p) =>
          p.id === id ? updated : p
        ),
      }));
    } catch (error) {
      console.error('Failed to update preference:', error);
      set({ error: 'Failed to update preference' });
      throw error;
    }
  },

  // ============================================
  // DELETE PREFERENCE
  // ============================================

  deletePreference: async (id) => {
    set({ error: null });

    try {
      await preferencesService.delete(id);
      set((state) => ({
        preferences: state.preferences.filter((p) => p.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete preference:', error);
      set({ error: 'Failed to delete preference' });
      throw error;
    }
  },

  // ============================================
  // TOGGLE PREFERENCE
  // ============================================

  togglePreference: async (id) => {
    set({ error: null });

    try {
      const updated = await preferencesService.toggleActive(id);
      set((state) => ({
        preferences: state.preferences.map((p) =>
          p.id === id ? updated : p
        ),
      }));
    } catch (error) {
      console.error('Failed to toggle preference:', error);
      set({ error: 'Failed to toggle preference' });
      throw error;
    }
  },

  // ============================================
  // REINFORCE PREFERENCE
  // ============================================

  reinforcePreference: async (id) => {
    try {
      const updated = await preferencesService.reinforceConfidence(id);
      set((state) => ({
        preferences: state.preferences.map((p) =>
          p.id === id ? updated : p
        ),
      }));
    } catch (error) {
      console.error('Failed to reinforce preference:', error);
    }
  },

  // ============================================
  // RECORD USAGE
  // ============================================

  recordUsage: async (id) => {
    try {
      const updated = await preferencesService.recordUsage(id);
      set((state) => ({
        preferences: state.preferences.map((p) =>
          p.id === id ? updated : p
        ),
      }));
    } catch (error) {
      console.error('Failed to record usage:', error);
    }
  },

  // ============================================
  // RESET ALL PREFERENCES
  // ============================================

  resetAllPreferences: async () => {
    set({ isLoading: true, error: null });

    try {
      await preferencesService.resetAll();
      set({ preferences: [], isLoading: false });
    } catch (error) {
      console.error('Failed to reset preferences:', error);
      set({
        error: 'Failed to reset preferences',
        isLoading: false,
      });
      throw error;
    }
  },

  // ============================================
  // SUBMIT FEEDBACK
  // ============================================

  submitFeedback: async (
    messageId,
    chatId,
    rating,
    messagePreview,
    userQuery,
    category,
    feedbackType,
    correction
  ) => {
    // Track pending feedback
    set((state) => {
      const newPending = new Map(state.pendingFeedback);
      newPending.set(messageId, rating);
      return { pendingFeedback: newPending };
    });

    try {
      const feedback = await messageFeedbackService.submit({
        messageId,
        chatId,
        rating,
        feedbackType,
        correction,
        context: {
          category,
          messagePreview: messagePreview.slice(0, 200),
          userQuery: userQuery.slice(0, 200),
        },
      });

      return feedback;
    } catch (error) {
      // Remove from pending on error
      set((state) => {
        const newPending = new Map(state.pendingFeedback);
        newPending.delete(messageId);
        return { pendingFeedback: newPending };
      });
      throw error;
    }
  },

  // ============================================
  // SELECTORS
  // ============================================

  getPreferencesForContext: (contextType) => {
    const { preferences } = get();
    const filtered = filterPreferencesForContext(preferences, contextType);
    return sortPreferencesByRelevance(filtered);
  },

  getActivePreferences: () => {
    return get().preferences.filter((p) => p.isActive);
  },

  getPreferenceByKey: (category, key) => {
    return get().preferences.find(
      (p) => p.category === category && p.key === key
    );
  },

  // ============================================
  // TOAST ACTIONS
  // ============================================

  dismissLearningToast: () => {
    set({ showLearningToast: false });
  },

  showPreferenceLearned: (preference) => {
    set({
      lastLearnedPreference: preference,
      showLearningToast: true,
    });

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      set((state) => {
        // Only dismiss if it's still the same preference
        if (state.lastLearnedPreference?.id === preference.id) {
          return { showLearningToast: false };
        }
        return {};
      });
    }, 4000);
  },

  // ============================================
  // CLEAR ERROR
  // ============================================

  clearError: () => {
    set({ error: null });
  },
}));

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Check if the user has any preferences
 */
export function useHasPreferences(): boolean {
  return usePreferencesStore((state) => state.preferences.length > 0);
}

/**
 * Get the count of active preferences
 */
export function useActivePreferenceCount(): number {
  return usePreferencesStore(
    (state) => state.preferences.filter((p) => p.isActive).length
  );
}

/**
 * Check if feedback was given for a message
 */
export function useFeedbackForMessage(messageId: string): 'positive' | 'negative' | null {
  return usePreferencesStore((state) => state.pendingFeedback.get(messageId) || null);
}

/**
 * Flashcards Store - localStorage Version
 * Manages study sessions and progress for spaced repetition flashcard practice
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StudySession, StudyProgress, SRSRating, StudyMode, TechnicalAnswer, SRSData } from '@/src/types';
import { STORAGE_KEYS } from '@/src/lib/constants';
import { generateId } from '@/src/lib/utils';
import { createSyncedStorage, setupStoreSync } from '@/src/lib/storage-sync';
import {
  calculateNextReview,
  getStudyQueue,
  calculateStudyStats,
  getMasteryLevel,
  calculateStreak,
  initializeSRSData,
} from '@/src/services/srs';

interface FlashcardsState {
  // Active session
  activeSession: StudySession | null;
  currentCardIndex: number;

  // Session history
  sessions: StudySession[];

  // Overall progress (per profile)
  progress: Record<string, StudyProgress>; // keyed by profileId or 'default'

  isLoading: boolean;

  // Session actions
  startSession: (options: {
    mode: StudyMode;
    applicationId?: string;
    profileId?: string;
    totalCards: number;
  }) => StudySession;
  recordReview: (answerId: string, rating: SRSRating, updateAnswer: (id: string, updates: Partial<TechnicalAnswer>) => void) => void;
  endSession: () => StudySession | null;
  abandonSession: () => void;

  // Progress tracking
  getProgress: (profileId?: string) => StudyProgress;
  updateProgress: (profileId: string, updates: Partial<StudyProgress>) => void;

  // Session queries
  getSession: (id: string) => StudySession | undefined;
  getRecentSessions: (limit?: number, profileId?: string) => StudySession[];
  getSessionStats: (profileId?: string) => {
    totalSessions: number;
    totalCardsStudied: number;
    averageRating: number;
    currentStreak: number;
    longestStreak: number;
  };

  // Card navigation
  nextCard: () => void;
  previousCard: () => void;
  skipCard: () => void;

  // Import/Export
  importSessions: (sessions: StudySession[]) => void;
  exportSessions: () => StudySession[];
}

// Default empty progress
const createDefaultProgress = (profileId?: string): StudyProgress => ({
  id: generateId(),
  profileId,
  currentStreak: 0,
  longestStreak: 0,
  totalCardsStudied: 0,
  totalReviews: 0,
  cardsNew: 0,
  cardsLearning: 0,
  cardsReviewing: 0,
  cardsMastered: 0,
  averageEasinessFactor: 2.5,
  averageRating: 0,
  sessionsCompleted: 0,
  totalStudyTimeMinutes: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useFlashcardsStore = create<FlashcardsState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      currentCardIndex: 0,
      sessions: [],
      progress: {},
      isLoading: false,

      startSession: (options) => {
        const { mode, applicationId, profileId, totalCards } = options;
        const now = new Date().toISOString();

        const session: StudySession = {
          id: generateId(),
          mode,
          applicationId,
          startedAt: now,
          totalCards,
          cardsReviewed: 0,
          cardsRemaining: totalCards,
          ratings: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          averageRating: 0,
        };

        set({
          activeSession: session,
          currentCardIndex: 0,
        });

        return session;
      },

      recordReview: (answerId, rating, updateAnswer) => {
        const { activeSession } = get();
        if (!activeSession) return;

        // Update session stats
        const newRatings = { ...activeSession.ratings };
        newRatings[rating]++;

        const totalRatings = Object.values(newRatings).reduce((a, b) => a + b, 0);
        const ratingSum = Object.entries(newRatings).reduce(
          (sum, [r, count]) => sum + parseInt(r) * count,
          0
        );
        const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;

        const updatedSession: StudySession = {
          ...activeSession,
          cardsReviewed: activeSession.cardsReviewed + 1,
          cardsRemaining: activeSession.cardsRemaining - 1,
          ratings: newRatings,
          averageRating: Math.round(avgRating * 100) / 100,
        };

        set({ activeSession: updatedSession });

        // Update the answer's SRS data via the callback
        // This ensures the technical answers store is updated
        updateAnswer(answerId, {});
      },

      endSession: () => {
        const { activeSession, sessions, progress } = get();
        if (!activeSession) return null;

        const now = new Date().toISOString();
        const completedSession: StudySession = {
          ...activeSession,
          endedAt: now,
        };

        // Update progress
        const profileId = 'default'; // Could be extended to use actual profileId
        const currentProgress = progress[profileId] || createDefaultProgress(profileId);

        // Calculate session duration in minutes
        const startTime = new Date(activeSession.startedAt).getTime();
        const endTime = new Date(now).getTime();
        const durationMinutes = Math.round((endTime - startTime) / 60000);

        // Update streak
        const studyDates = sessions
          .filter((s) => s.endedAt)
          .map((s) => s.startedAt);
        studyDates.push(now);
        const streakData = calculateStreak(studyDates);

        const updatedProgress: StudyProgress = {
          ...currentProgress,
          lastStudyDate: now,
          currentStreak: streakData.current,
          longestStreak: Math.max(currentProgress.longestStreak, streakData.longest),
          totalCardsStudied: currentProgress.totalCardsStudied + activeSession.cardsReviewed,
          totalReviews: currentProgress.totalReviews + activeSession.cardsReviewed,
          sessionsCompleted: currentProgress.sessionsCompleted + 1,
          totalStudyTimeMinutes: currentProgress.totalStudyTimeMinutes + durationMinutes,
          averageRating:
            (currentProgress.averageRating * currentProgress.totalReviews +
              activeSession.averageRating * activeSession.cardsReviewed) /
            (currentProgress.totalReviews + activeSession.cardsReviewed || 1),
          updatedAt: now,
        };

        set({
          activeSession: null,
          currentCardIndex: 0,
          sessions: [completedSession, ...sessions],
          progress: { ...progress, [profileId]: updatedProgress },
        });

        return completedSession;
      },

      abandonSession: () => {
        set({
          activeSession: null,
          currentCardIndex: 0,
        });
      },

      getProgress: (profileId) => {
        const key = profileId || 'default';
        return get().progress[key] || createDefaultProgress(key);
      },

      updateProgress: (profileId, updates) => {
        const { progress } = get();
        const key = profileId || 'default';
        const current = progress[key] || createDefaultProgress(key);

        set({
          progress: {
            ...progress,
            [key]: {
              ...current,
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      },

      getSession: (id) => {
        return get().sessions.find((s) => s.id === id);
      },

      getRecentSessions: (limit = 10, profileId) => {
        const { sessions } = get();
        // Could filter by profileId if sessions had profileId field
        return sessions.slice(0, limit);
      },

      getSessionStats: (profileId) => {
        const progress = get().getProgress(profileId);
        return {
          totalSessions: progress.sessionsCompleted,
          totalCardsStudied: progress.totalCardsStudied,
          averageRating: progress.averageRating,
          currentStreak: progress.currentStreak,
          longestStreak: progress.longestStreak,
        };
      },

      nextCard: () => {
        const { currentCardIndex, activeSession } = get();
        if (!activeSession) return;

        if (currentCardIndex < activeSession.totalCards - 1) {
          set({ currentCardIndex: currentCardIndex + 1 });
        }
      },

      previousCard: () => {
        const { currentCardIndex } = get();
        if (currentCardIndex > 0) {
          set({ currentCardIndex: currentCardIndex - 1 });
        }
      },

      skipCard: () => {
        // Move to next card without recording a review
        get().nextCard();
      },

      importSessions: (newSessions) => {
        set((state) => {
          const existingIds = new Set(state.sessions.map((s) => s.id));
          const unique = newSessions.filter((s) => !existingIds.has(s.id));
          return {
            sessions: [...unique, ...state.sessions],
          };
        });
      },

      exportSessions: () => {
        return get().sessions;
      },
    }),
    {
      name: STORAGE_KEYS.FLASHCARDS,
      storage: createJSONStorage(() => createSyncedStorage()),
      partialize: (state) => ({
        sessions: state.sessions,
        progress: state.progress,
      }),
    }
  )
);

// Set up cross-tab sync for flashcards store
let flashcardsSyncUnsubscribe: (() => void) | null = null;

export function initFlashcardsSync(): void {
  if (flashcardsSyncUnsubscribe) return;

  flashcardsSyncUnsubscribe = setupStoreSync<FlashcardsState>(
    STORAGE_KEYS.FLASHCARDS,
    (updates) => useFlashcardsStore.setState(updates),
    () => ['sessions', 'progress']
  );
}

export function destroyFlashcardsSync(): void {
  if (flashcardsSyncUnsubscribe) {
    flashcardsSyncUnsubscribe();
    flashcardsSyncUnsubscribe = null;
  }
}

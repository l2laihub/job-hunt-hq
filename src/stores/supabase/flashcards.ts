/**
 * Flashcards Store - Supabase Version
 * Manages study sessions and progress with Supabase backend
 */
import { create } from 'zustand';
import type { StudySession, StudyProgress, SRSRating, StudyMode, TechnicalAnswer } from '@/src/types';
import { supabase, from } from '@/src/lib/supabase';
import { generateId } from '@/src/lib/utils';
import { calculateStreak } from '@/src/services/srs';

// Row types for database
interface StudySessionRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  mode: string;
  application_id: string | null;
  started_at: string;
  ended_at: string | null;
  total_cards: number;
  cards_reviewed: number;
  cards_remaining: number;
  ratings: Record<string, number>;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

interface StudyProgressRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  total_cards_studied: number;
  total_reviews: number;
  cards_new: number;
  cards_learning: number;
  cards_reviewing: number;
  cards_mastered: number;
  average_easiness_factor: number;
  average_rating: number;
  sessions_completed: number;
  total_study_time_minutes: number;
  created_at: string;
  updated_at: string;
}

// Type converters
function rowToStudySession(row: StudySessionRow): StudySession {
  return {
    id: row.id,
    mode: row.mode as StudyMode,
    applicationId: row.application_id || undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at || undefined,
    totalCards: row.total_cards,
    cardsReviewed: row.cards_reviewed,
    cardsRemaining: row.cards_remaining,
    ratings: {
      0: row.ratings?.['0'] || 0,
      1: row.ratings?.['1'] || 0,
      2: row.ratings?.['2'] || 0,
      3: row.ratings?.['3'] || 0,
      4: row.ratings?.['4'] || 0,
      5: row.ratings?.['5'] || 0,
    },
    averageRating: row.average_rating,
  };
}

function rowToStudyProgress(row: StudyProgressRow): StudyProgress {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id || undefined,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastStudyDate: row.last_study_date || undefined,
    totalCardsStudied: row.total_cards_studied,
    totalReviews: row.total_reviews,
    cardsNew: row.cards_new,
    cardsLearning: row.cards_learning,
    cardsReviewing: row.cards_reviewing,
    cardsMastered: row.cards_mastered,
    averageEasinessFactor: row.average_easiness_factor,
    averageRating: row.average_rating,
    sessionsCompleted: row.sessions_completed,
    totalStudyTimeMinutes: row.total_study_time_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface FlashcardsState {
  // Active session
  activeSession: StudySession | null;
  currentCardIndex: number;

  // Session history
  sessions: StudySession[];

  // Overall progress (per profile)
  progress: Record<string, StudyProgress>;

  isLoading: boolean;
  error: string | null;

  // Data fetching
  fetchSessions: (profileId?: string) => Promise<void>;
  fetchProgress: (profileId?: string) => Promise<void>;

  // Session actions
  startSession: (options: {
    mode: StudyMode;
    applicationId?: string;
    profileId?: string;
    totalCards: number;
  }) => Promise<StudySession>;
  recordReview: (
    answerId: string,
    rating: SRSRating,
    updateAnswer: (id: string, updates: Partial<TechnicalAnswer>) => void
  ) => Promise<void>;
  endSession: () => Promise<StudySession | null>;
  abandonSession: () => void;

  // Progress tracking
  getProgress: (profileId?: string) => StudyProgress | undefined;
  updateProgress: (profileId: string, updates: Partial<StudyProgress>) => Promise<void>;

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

  // Real-time subscription
  subscribeToChanges: () => () => void;
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

export const useSupabaseFlashcardsStore = create<FlashcardsState>()((set, get) => ({
  activeSession: null,
  currentCardIndex: 0,
  sessions: [],
  progress: {},
  isLoading: false,
  error: null,

  fetchSessions: async (profileId) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (profileId) {
        query = query.eq('profile_id', profileId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const sessions = (data || []).map(rowToStudySession);
      set({ sessions, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
        isLoading: false,
      });
    }
  },

  fetchProgress: async (profileId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = from('study_progress')
        .select('*')
        .eq('user_id', user.id);

      if (profileId) {
        query = query.eq('profile_id', profileId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const progressMap: Record<string, StudyProgress> = {};
      for (const row of data || []) {
        const progress = rowToStudyProgress(row);
        const key = progress.profileId || 'default';
        progressMap[key] = progress;
      }

      set((state) => ({
        progress: { ...state.progress, ...progressMap },
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch progress',
      });
    }
  },

  startSession: async (options) => {
    const { mode, applicationId, profileId, totalCards } = options;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      const sessionData = {
        user_id: user.id,
        profile_id: profileId || null,
        mode,
        application_id: applicationId || null,
        started_at: now,
        total_cards: totalCards,
        cards_reviewed: 0,
        cards_remaining: totalCards,
        ratings: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        average_rating: 0,
      };

      const { data, error } = await from('study_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      const session = rowToStudySession(data);
      set({
        activeSession: session,
        currentCardIndex: 0,
      });

      return session;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to start session' });
      throw error;
    }
  },

  recordReview: async (answerId, rating, updateAnswer) => {
    const { activeSession } = get();
    if (!activeSession) return;

    try {
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

      // Update in database
      const { error } = await from('study_sessions')
        .update({
          cards_reviewed: updatedSession.cardsReviewed,
          cards_remaining: updatedSession.cardsRemaining,
          ratings: Object.fromEntries(
            Object.entries(newRatings).map(([k, v]) => [k.toString(), v])
          ),
          average_rating: updatedSession.averageRating,
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      set({ activeSession: updatedSession });

      // Update the answer's SRS data via the callback
      updateAnswer(answerId, {});
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to record review' });
    }
  },

  endSession: async () => {
    const { activeSession, sessions, progress } = get();
    if (!activeSession) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();

      // Update session in database
      const { error: sessionError } = await from('study_sessions')
        .update({ ended_at: now })
        .eq('id', activeSession.id);

      if (sessionError) throw sessionError;

      const completedSession: StudySession = {
        ...activeSession,
        endedAt: now,
      };

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

      // Get or create progress
      const profileId = 'default';
      const currentProgress = progress[profileId] || createDefaultProgress(profileId);

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

      // Upsert progress in database
      const { error: progressError } = await from('study_progress')
        .upsert({
          id: currentProgress.id,
          user_id: user.id,
          profile_id: null,
          current_streak: updatedProgress.currentStreak,
          longest_streak: updatedProgress.longestStreak,
          last_study_date: now,
          total_cards_studied: updatedProgress.totalCardsStudied,
          total_reviews: updatedProgress.totalReviews,
          cards_new: updatedProgress.cardsNew,
          cards_learning: updatedProgress.cardsLearning,
          cards_reviewing: updatedProgress.cardsReviewing,
          cards_mastered: updatedProgress.cardsMastered,
          average_easiness_factor: updatedProgress.averageEasinessFactor,
          average_rating: updatedProgress.averageRating,
          sessions_completed: updatedProgress.sessionsCompleted,
          total_study_time_minutes: updatedProgress.totalStudyTimeMinutes,
        });

      if (progressError) throw progressError;

      set({
        activeSession: null,
        currentCardIndex: 0,
        sessions: [completedSession, ...sessions],
        progress: { ...progress, [profileId]: updatedProgress },
      });

      return completedSession;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to end session' });
      return null;
    }
  },

  abandonSession: () => {
    // Just clear local state, don't update database
    set({
      activeSession: null,
      currentCardIndex: 0,
    });
  },

  getProgress: (profileId) => {
    const key = profileId || 'default';
    return get().progress[key];
  },

  updateProgress: async (profileId, updates) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { progress } = get();
      const key = profileId || 'default';
      const current = progress[key] || createDefaultProgress(key);

      const updated = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Update in database
      const { error } = await from('study_progress')
        .upsert({
          id: current.id,
          user_id: user.id,
          profile_id: profileId || null,
          current_streak: updated.currentStreak,
          longest_streak: updated.longestStreak,
          last_study_date: updated.lastStudyDate || null,
          total_cards_studied: updated.totalCardsStudied,
          total_reviews: updated.totalReviews,
          cards_new: updated.cardsNew,
          cards_learning: updated.cardsLearning,
          cards_reviewing: updated.cardsReviewing,
          cards_mastered: updated.cardsMastered,
          average_easiness_factor: updated.averageEasinessFactor,
          average_rating: updated.averageRating,
          sessions_completed: updated.sessionsCompleted,
          total_study_time_minutes: updated.totalStudyTimeMinutes,
        });

      if (error) throw error;

      set({
        progress: { ...progress, [key]: updated },
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update progress' });
    }
  },

  getSession: (id) => {
    return get().sessions.find((s) => s.id === id);
  },

  getRecentSessions: (limit = 10, profileId) => {
    const { sessions } = get();
    return sessions.slice(0, limit);
  },

  getSessionStats: (profileId) => {
    const progress = get().getProgress(profileId);
    if (!progress) {
      return {
        totalSessions: 0,
        totalCardsStudied: 0,
        averageRating: 0,
        currentStreak: 0,
        longestStreak: 0,
      };
    }
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
    get().nextCard();
  },

  subscribeToChanges: () => {
    const channel = supabase
      .channel('flashcards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_sessions',
        },
        async () => {
          await get().fetchSessions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_progress',
        },
        async () => {
          await get().fetchProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));

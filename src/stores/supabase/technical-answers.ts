/**
 * Technical Answers Store - Supabase Version
 * Manages technical interview answers with Supabase backend
 */
import { create } from 'zustand';
import type { TechnicalAnswer, TechnicalQuestionType, PracticeSession } from '@/src/types';
import { technicalAnswersService } from '@/src/services/database';
import { generateId } from '@/src/lib/utils';

interface TechnicalAnswersState {
  answers: TechnicalAnswer[];
  practiceSessions: Map<string, PracticeSession[]>;
  isLoading: boolean;
  error: string | null;

  // Data fetching
  fetchAnswers: () => Promise<void>;

  // Actions
  addAnswer: (answer: Partial<TechnicalAnswer>, profileId?: string) => Promise<TechnicalAnswer>;
  updateAnswer: (id: string, updates: Partial<TechnicalAnswer>) => Promise<void>;
  deleteAnswer: (id: string) => Promise<void>;

  // Usage tracking
  incrementUsage: (id: string) => Promise<void>;
  recordUsedInInterview: (id: string, interviewId: string) => Promise<void>;

  // Practice sessions
  recordPractice: (answerId: string, session: Omit<PracticeSession, 'id' | 'answerId' | 'createdAt'>) => Promise<void>;
  getPracticeSessions: (answerId: string) => PracticeSession[];
  fetchPracticeSessions: (answerId: string) => Promise<void>;

  // Search & Filter
  searchAnswers: (query: string) => TechnicalAnswer[];
  getAnswersByType: (type: TechnicalQuestionType) => TechnicalAnswer[];
  getAnswersByProfile: (profileId: string) => TechnicalAnswer[];

  // Import/Export
  importAnswers: (answers: TechnicalAnswer[]) => Promise<void>;
  exportAnswers: () => TechnicalAnswer[];

  // Real-time subscription
  subscribeToChanges: () => () => void;
}

export const useSupabaseTechnicalAnswersStore = create<TechnicalAnswersState>()((set, get) => ({
  answers: [],
  practiceSessions: new Map(),
  isLoading: false,
  error: null,

  fetchAnswers: async () => {
    set({ isLoading: true, error: null });
    try {
      const answers = await technicalAnswersService.list();
      set({ answers, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch answers',
        isLoading: false,
      });
    }
  },

  addAnswer: async (partial, profileId) => {
    const now = new Date().toISOString();
    const newAnswer: Partial<TechnicalAnswer> = {
      id: generateId(),
      question: partial.question || '',
      questionType: partial.questionType || 'conceptual',
      format: partial.format || { type: 'Explain-Example-Tradeoffs', sections: [] },
      sources: partial.sources || { storyIds: [], profileSections: [], synthesized: false },
      answer: partial.answer || { structured: [], narrative: '', bulletPoints: [] },
      followUps: partial.followUps || [],
      metadata: partial.metadata || { difficulty: 'mid', tags: [] },
      usedInInterviews: [],
      timesUsed: 0,
      practiceCount: 0,
      profileId: profileId || partial.profileId,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const created = await technicalAnswersService.create(newAnswer, profileId);
      set((state) => ({
        answers: [created, ...state.answers],
      }));
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add answer' });
      throw error;
    }
  },

  updateAnswer: async (id, updates) => {
    try {
      const updated = await technicalAnswersService.update(id, updates);
      set((state) => ({
        answers: state.answers.map((answer) =>
          answer.id === id ? updated : answer
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update answer' });
      throw error;
    }
  },

  deleteAnswer: async (id) => {
    try {
      await technicalAnswersService.delete(id);
      set((state) => ({
        answers: state.answers.filter((answer) => answer.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete answer' });
      throw error;
    }
  },

  incrementUsage: async (id) => {
    try {
      await technicalAnswersService.incrementUsage(id);
      set((state) => ({
        answers: state.answers.map((answer) =>
          answer.id === id
            ? {
                ...answer,
                timesUsed: answer.timesUsed + 1,
                updatedAt: new Date().toISOString(),
              }
            : answer
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to increment usage' });
      throw error;
    }
  },

  recordUsedInInterview: async (id, interviewId) => {
    try {
      await technicalAnswersService.recordUsedInInterview(id, interviewId);
      set((state) => ({
        answers: state.answers.map((answer) =>
          answer.id === id
            ? {
                ...answer,
                usedInInterviews: [...(answer.usedInInterviews || []), interviewId],
                timesUsed: answer.timesUsed + 1,
                updatedAt: new Date().toISOString(),
              }
            : answer
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to record interview usage' });
      throw error;
    }
  },

  recordPractice: async (answerId, session) => {
    try {
      await technicalAnswersService.recordPractice(answerId, session);
      const now = new Date().toISOString();

      // Update local state
      set((state) => {
        const newSession: PracticeSession = {
          id: generateId(),
          answerId,
          ...session,
          createdAt: now,
        };

        const currentSessions = state.practiceSessions.get(answerId) || [];
        const newSessions = new Map(state.practiceSessions);
        newSessions.set(answerId, [newSession, ...currentSessions]);

        return {
          practiceSessions: newSessions,
          answers: state.answers.map((answer) =>
            answer.id === answerId
              ? {
                  ...answer,
                  practiceCount: answer.practiceCount + 1,
                  lastPracticedAt: now,
                }
              : answer
          ),
        };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to record practice' });
      throw error;
    }
  },

  getPracticeSessions: (answerId) => {
    return get().practiceSessions.get(answerId) || [];
  },

  fetchPracticeSessions: async (answerId) => {
    try {
      const sessions = await technicalAnswersService.getPracticeSessions(answerId);
      set((state) => {
        const newSessions = new Map(state.practiceSessions);
        newSessions.set(answerId, sessions);
        return { practiceSessions: newSessions };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch practice sessions' });
    }
  },

  searchAnswers: (query) => {
    const answers = get().answers;
    const lowerQuery = query.toLowerCase();
    return answers.filter(
      (answer) =>
        answer.question.toLowerCase().includes(lowerQuery) ||
        answer.answer.narrative.toLowerCase().includes(lowerQuery) ||
        answer.metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },

  getAnswersByType: (type) => {
    return get().answers.filter((answer) => answer.questionType === type);
  },

  getAnswersByProfile: (profileId) => {
    return get().answers.filter((answer) => answer.profileId === profileId);
  },

  importAnswers: async (answers) => {
    try {
      await technicalAnswersService.upsertMany(answers);
      await get().fetchAnswers();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to import answers' });
      throw error;
    }
  },

  exportAnswers: () => {
    return get().answers;
  },

  subscribeToChanges: () => {
    return technicalAnswersService.subscribe((answers) => {
      set({ answers });
    });
  },
}));

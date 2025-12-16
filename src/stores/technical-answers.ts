import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TechnicalAnswer, PracticeSession, TechnicalQuestionType } from '@/src/types';
import { STORAGE_KEYS } from '@/src/lib/constants';
import { generateId } from '@/src/lib/utils';

interface TechnicalAnswersState {
  answers: TechnicalAnswer[];
  practiceSessions: PracticeSession[];
  isLoading: boolean;

  // CRUD Operations
  addAnswer: (answer: Partial<TechnicalAnswer>) => TechnicalAnswer;
  updateAnswer: (id: string, updates: Partial<TechnicalAnswer>) => void;
  deleteAnswer: (id: string) => void;

  // Usage tracking
  incrementUsage: (id: string) => void;
  recordUsedInInterview: (id: string, interviewId: string) => void;
  recordPractice: (id: string, session: Omit<PracticeSession, 'id' | 'answerId' | 'createdAt'>) => void;

  // Search & Filter
  getAnswersByType: (type: TechnicalQuestionType) => TechnicalAnswer[];
  getAnswersByTags: (tags: string[]) => TechnicalAnswer[];
  searchAnswers: (query: string) => TechnicalAnswer[];
  getAnswersForApplication: (appId: string) => TechnicalAnswer[];
  getMostUsedAnswers: (limit?: number) => TechnicalAnswer[];

  // Practice Sessions
  getPracticeSessions: (answerId: string) => PracticeSession[];

  // Import/Export
  importAnswers: (answers: TechnicalAnswer[]) => void;
  importPracticeSessions: (sessions: PracticeSession[]) => void;
  exportAnswers: () => TechnicalAnswer[];
}

export const useTechnicalAnswersStore = create<TechnicalAnswersState>()(
  persist(
    (set, get) => ({
      answers: [],
      practiceSessions: [],
      isLoading: false,

      addAnswer: (partial) => {
        const now = new Date().toISOString();
        const newAnswer: TechnicalAnswer = {
          id: generateId(),
          question: partial.question || '',
          questionType: partial.questionType || 'conceptual',
          format: partial.format || { type: 'Explain-Example-Tradeoffs', sections: [] },
          sources: partial.sources || { storyIds: [], profileSections: [], synthesized: false },
          answer: partial.answer || { structured: [], narrative: '', bulletPoints: [] },
          followUps: partial.followUps || [],
          metadata: {
            difficulty: partial.metadata?.difficulty || 'mid',
            tags: partial.metadata?.tags || [],
            targetRole: partial.metadata?.targetRole,
            targetCompany: partial.metadata?.targetCompany,
            applicationId: partial.metadata?.applicationId,
          },
          usedInInterviews: [],
          timesUsed: 0,
          practiceCount: 0,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          answers: [newAnswer, ...state.answers],
        }));

        return newAnswer;
      },

      updateAnswer: (id, updates) => {
        set((state) => ({
          answers: state.answers.map((answer) =>
            answer.id === id
              ? {
                  ...answer,
                  ...updates,
                  metadata: {
                    ...answer.metadata,
                    ...updates.metadata,
                  },
                  updatedAt: new Date().toISOString(),
                }
              : answer
          ),
        }));
      },

      deleteAnswer: (id) => {
        set((state) => ({
          answers: state.answers.filter((a) => a.id !== id),
          practiceSessions: state.practiceSessions.filter((s) => s.answerId !== id),
        }));
      },

      incrementUsage: (id) => {
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
      },

      recordUsedInInterview: (id, interviewId) => {
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
      },

      recordPractice: (id, session) => {
        const now = new Date().toISOString();
        const newSession: PracticeSession = {
          id: generateId(),
          answerId: id,
          ...session,
          createdAt: now,
        };

        set((state) => ({
          practiceSessions: [newSession, ...state.practiceSessions],
          answers: state.answers.map((answer) =>
            answer.id === id
              ? {
                  ...answer,
                  practiceCount: answer.practiceCount + 1,
                  lastPracticedAt: now,
                  updatedAt: now,
                }
              : answer
          ),
        }));
      },

      getAnswersByType: (type) => {
        return get().answers.filter((a) => a.questionType === type);
      },

      getAnswersByTags: (tags) => {
        const answers = get().answers;
        if (tags.length === 0) return answers;
        return answers.filter((a) =>
          tags.some((tag) => a.metadata.tags.includes(tag))
        );
      },

      searchAnswers: (query) => {
        const answers = get().answers;
        const lowerQuery = query.toLowerCase();
        return answers.filter(
          (a) =>
            a.question.toLowerCase().includes(lowerQuery) ||
            a.answer.narrative.toLowerCase().includes(lowerQuery) ||
            a.metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
        );
      },

      getAnswersForApplication: (appId) => {
        return get().answers.filter((a) => a.metadata.applicationId === appId);
      },

      getMostUsedAnswers: (limit = 5) => {
        return [...get().answers]
          .sort((a, b) => b.timesUsed - a.timesUsed)
          .slice(0, limit);
      },

      getPracticeSessions: (answerId) => {
        return get().practiceSessions.filter((s) => s.answerId === answerId);
      },

      importAnswers: (answers) => {
        set((state) => {
          const existingIds = new Set(state.answers.map((a) => a.id));
          const newAnswers = answers.filter((a) => !existingIds.has(a.id));
          return {
            answers: [...newAnswers, ...state.answers],
          };
        });
      },

      importPracticeSessions: (sessions) => {
        set((state) => {
          const existingIds = new Set(state.practiceSessions.map((s) => s.id));
          const newSessions = sessions.filter((s) => !existingIds.has(s.id));
          return {
            practiceSessions: [...newSessions, ...state.practiceSessions],
          };
        });
      },

      exportAnswers: () => {
        return get().answers;
      },
    }),
    {
      name: STORAGE_KEYS.TECHNICAL_ANSWERS,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        answers: state.answers,
        practiceSessions: state.practiceSessions,
      }),
    }
  )
);

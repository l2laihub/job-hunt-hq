import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  InterviewPrepSession,
  PrepChecklistItem,
  PredictedQuestion,
  PrepPracticeSession,
  InterviewStage,
  PrepItemStatus,
  QuickReference,
} from '@/src/types';
import { generateId } from '@/src/lib/utils';
import { STORAGE_KEYS } from '@/src/lib/constants';
import { createSyncedStorage, setupStoreSync } from '@/src/lib/storage-sync';

/**
 * Generate default checklist items based on interview type
 */
function generateDefaultChecklist(type: InterviewStage): PrepChecklistItem[] {
  // Common items for all interview types
  const common: Omit<PrepChecklistItem, 'id'>[] = [
    { category: 'research', label: 'Review company research', priority: 'required', status: 'not-started' },
    { category: 'research', label: 'Review job analysis', priority: 'required', status: 'not-started' },
    { category: 'stories', label: 'Prepare 3+ relevant STAR stories', priority: 'required', status: 'not-started' },
    { category: 'questions', label: 'Prepare questions to ask interviewer', priority: 'required', status: 'not-started' },
    { category: 'logistics', label: 'Confirm interview time and link/location', priority: 'required', status: 'not-started' },
  ];

  // Type-specific items
  const typeSpecific: Record<InterviewStage, Omit<PrepChecklistItem, 'id'>[]> = {
    'phone-screen': [
      { category: 'stories', label: 'Practice elevator pitch', priority: 'required', status: 'not-started' },
      { category: 'research', label: 'Research interviewer on LinkedIn', priority: 'recommended', status: 'not-started' },
      { category: 'stories', label: 'Prepare "Tell me about yourself" response', priority: 'required', status: 'not-started' },
    ],
    'technical': [
      { category: 'technical', label: 'Review core data structures and algorithms', priority: 'required', status: 'not-started' },
      { category: 'technical', label: 'Practice coding problems (LeetCode/HackerRank)', priority: 'required', status: 'not-started' },
      { category: 'technical', label: 'Review tech stack mentioned in JD', priority: 'required', status: 'not-started' },
      { category: 'technical', label: 'Practice explaining technical decisions', priority: 'recommended', status: 'not-started' },
    ],
    'behavioral': [
      { category: 'stories', label: 'Match stories to common behavioral questions', priority: 'required', status: 'not-started' },
      { category: 'stories', label: 'Practice STAR responses aloud', priority: 'required', status: 'not-started' },
      { category: 'stories', label: 'Prepare leadership and conflict stories', priority: 'recommended', status: 'not-started' },
    ],
    'system-design': [
      { category: 'technical', label: 'Review system design patterns', priority: 'required', status: 'not-started' },
      { category: 'technical', label: 'Practice estimation questions', priority: 'recommended', status: 'not-started' },
      { category: 'technical', label: 'Review distributed systems concepts', priority: 'required', status: 'not-started' },
      { category: 'technical', label: 'Prepare to discuss past architecture decisions', priority: 'required', status: 'not-started' },
    ],
    'hiring-manager': [
      { category: 'research', label: 'Research hiring manager background', priority: 'required', status: 'not-started' },
      { category: 'questions', label: 'Prepare team and culture questions', priority: 'required', status: 'not-started' },
      { category: 'stories', label: 'Prepare management/leadership examples', priority: 'recommended', status: 'not-started' },
    ],
    'final-round': [
      { category: 'stories', label: 'Prepare salary negotiation points', priority: 'recommended', status: 'not-started' },
      { category: 'questions', label: 'Prepare offer evaluation questions', priority: 'recommended', status: 'not-started' },
      { category: 'research', label: 'Research company benefits and perks', priority: 'optional', status: 'not-started' },
    ],
    'onsite': [
      { category: 'logistics', label: 'Plan route and transportation', priority: 'required', status: 'not-started' },
      { category: 'logistics', label: 'Prepare professional attire', priority: 'recommended', status: 'not-started' },
      { category: 'logistics', label: 'Pack essentials (ID, resume copies, water)', priority: 'recommended', status: 'not-started' },
    ],
  };

  // Combine and add IDs
  return [...common, ...(typeSpecific[type] || [])].map((item) => ({
    ...item,
    id: generateId(),
  }));
}

interface InterviewPrepState {
  sessions: InterviewPrepSession[];
  practiceSessions: PrepPracticeSession[];
  isLoading: boolean;

  // Session CRUD
  createSession: (applicationId: string, interviewType: InterviewStage, profileId?: string) => InterviewPrepSession;
  getSession: (applicationId: string) => InterviewPrepSession | undefined;
  getSessionById: (sessionId: string) => InterviewPrepSession | undefined;
  updateSession: (sessionId: string, updates: Partial<InterviewPrepSession>) => void;
  deleteSession: (sessionId: string) => void;

  // Checklist management
  updateChecklistItem: (sessionId: string, itemId: string, status: PrepItemStatus) => void;
  addChecklistItem: (sessionId: string, item: Omit<PrepChecklistItem, 'id'>) => void;
  removeChecklistItem: (sessionId: string, itemId: string) => void;

  // Question management
  setPredictedQuestions: (sessionId: string, questions: PredictedQuestion[]) => void;
  markQuestionPrepared: (sessionId: string, questionId: string, storyId?: string, answerId?: string) => void;
  recordQuestionPractice: (sessionId: string, questionId: string) => void;

  // Quick reference
  setQuickReference: (sessionId: string, quickRef: QuickReference) => void;

  // Practice sessions
  addPracticeSession: (session: Omit<PrepPracticeSession, 'id' | 'createdAt'>) => PrepPracticeSession;
  getPracticeSessions: (sessionId: string) => PrepPracticeSession[];

  // Readiness calculation
  calculateReadiness: (sessionId: string) => number;

  // Queries
  getSessionsByProfile: (profileId: string) => InterviewPrepSession[];
  getUpcomingSessions: () => InterviewPrepSession[];
  getSessionsForApplication: (applicationId: string) => InterviewPrepSession[];

  // Import/Export
  importSessions: (sessions: InterviewPrepSession[]) => void;
  exportSessions: () => InterviewPrepSession[];
}

export const useInterviewPrepStore = create<InterviewPrepState>()(
  persist(
    (set, get) => ({
      sessions: [],
      practiceSessions: [],
      isLoading: false,

      createSession: (applicationId, interviewType, profileId) => {
        const now = new Date().toISOString();
        const session: InterviewPrepSession = {
          id: generateId(),
          applicationId,
          profileId,
          interviewType,
          checklist: generateDefaultChecklist(interviewType),
          predictedQuestions: [],
          readinessScore: 0,
          practiceSessionIds: [],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          sessions: [session, ...state.sessions],
        }));

        return session;
      },

      getSession: (applicationId) => {
        return get().sessions.find((s) => s.applicationId === applicationId);
      },

      getSessionById: (sessionId) => {
        return get().sessions.find((s) => s.id === sessionId);
      },

      updateSession: (sessionId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, ...updates, updatedAt: new Date().toISOString() }
              : s
          ),
        }));
      },

      deleteSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          practiceSessions: state.practiceSessions.filter((p) => p.sessionId !== sessionId),
        }));
      },

      updateChecklistItem: (sessionId, itemId, status) => {
        set((state) => {
          const updatedSessions = state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              checklist: s.checklist.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      status,
                      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
                    }
                  : item
              ),
              updatedAt: new Date().toISOString(),
            };
          });

          return { sessions: updatedSessions };
        });

        // Recalculate readiness after update
        const readiness = get().calculateReadiness(sessionId);
        get().updateSession(sessionId, { readinessScore: readiness });
      },

      addChecklistItem: (sessionId, item) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  checklist: [...s.checklist, { ...item, id: generateId() }],
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }));
      },

      removeChecklistItem: (sessionId, itemId) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  checklist: s.checklist.filter((item) => item.id !== itemId),
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }));
      },

      setPredictedQuestions: (sessionId, questions) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  predictedQuestions: questions,
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }));

        // Recalculate readiness
        const readiness = get().calculateReadiness(sessionId);
        get().updateSession(sessionId, { readinessScore: readiness });
      },

      markQuestionPrepared: (sessionId, questionId, storyId, answerId) => {
        console.log('=== markQuestionPrepared STORE START ===');
        console.log('sessionId:', sessionId);
        console.log('questionId:', questionId);
        console.log('storyId:', storyId);
        console.log('answerId:', answerId);

        const currentSessions = get().sessions;
        console.log('Current sessions count:', currentSessions.length);

        const targetSession = currentSessions.find((s) => s.id === sessionId);
        if (!targetSession) {
          console.error('ERROR: Session not found!', sessionId);
          console.log('Available session IDs:', currentSessions.map((s) => s.id));
        } else {
          console.log('Found session:', targetSession.id);
          const targetQuestion = targetSession.predictedQuestions.find((q) => q.id === questionId);
          if (!targetQuestion) {
            console.error('ERROR: Question not found!', questionId);
            console.log('Available question IDs:', targetSession.predictedQuestions.map((q) => q.id));
          } else {
            console.log('Found question:', targetQuestion.id, targetQuestion.question.substring(0, 50));
          }
        }

        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              predictedQuestions: s.predictedQuestions.map((q) =>
                q.id === questionId
                  ? {
                      ...q,
                      // When both storyId and answerId are undefined, mark as unprepared (unlink)
                      isPrepared: storyId !== undefined || answerId !== undefined,
                      // Use explicit undefined to clear, otherwise keep existing value
                      matchedStoryId: storyId,
                      matchedAnswerId: answerId,
                    }
                  : q
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));

        console.log('State updated');

        // Verify the update happened
        const updatedSessions = get().sessions;
        const updatedSession = updatedSessions.find((s) => s.id === sessionId);
        const updatedQuestion = updatedSession?.predictedQuestions.find((q) => q.id === questionId);
        console.log('Verification - Updated question matchedStoryId:', updatedQuestion?.matchedStoryId);
        console.log('Verification - Updated question isPrepared:', updatedQuestion?.isPrepared);
        console.log('=== markQuestionPrepared STORE END ===');

        // Recalculate readiness
        const readiness = get().calculateReadiness(sessionId);
        get().updateSession(sessionId, { readinessScore: readiness });
      },

      recordQuestionPractice: (sessionId, questionId) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              predictedQuestions: s.predictedQuestions.map((q) =>
                q.id === questionId
                  ? { ...q, practiceCount: q.practiceCount + 1 }
                  : q
              ),
              lastPracticedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      setQuickReference: (sessionId, quickRef) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  quickReference: quickRef,
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }));
      },

      addPracticeSession: (sessionData) => {
        const now = new Date().toISOString();
        const practiceSession: PrepPracticeSession = {
          ...sessionData,
          id: generateId(),
          createdAt: now,
        };

        set((state) => ({
          practiceSessions: [practiceSession, ...state.practiceSessions],
          sessions: state.sessions.map((s) =>
            s.id === sessionData.sessionId
              ? {
                  ...s,
                  practiceSessionIds: [practiceSession.id, ...s.practiceSessionIds],
                  lastPracticedAt: now,
                  updatedAt: now,
                }
              : s
          ),
        }));

        // Recalculate readiness
        const readiness = get().calculateReadiness(sessionData.sessionId);
        get().updateSession(sessionData.sessionId, { readinessScore: readiness });

        return practiceSession;
      },

      getPracticeSessions: (sessionId) => {
        return get().practiceSessions.filter((p) => p.sessionId === sessionId);
      },

      calculateReadiness: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) return 0;

        // Checklist weight: 50%
        const requiredItems = session.checklist.filter((i) => i.priority === 'required');
        const completedRequired = requiredItems.filter((i) => i.status === 'completed').length;
        const checklistScore =
          requiredItems.length > 0
            ? (completedRequired / requiredItems.length) * 50
            : 25; // Default if no required items

        // Questions weight: 30%
        const highLikelihood = session.predictedQuestions.filter((q) => q.likelihood === 'high');
        const preparedHigh = highLikelihood.filter((q) => q.isPrepared).length;
        const questionScore =
          highLikelihood.length > 0
            ? (preparedHigh / highLikelihood.length) * 30
            : 15; // Default if no high-priority questions

        // Practice weight: 20%
        const practicedQuestions = session.predictedQuestions.filter((q) => q.practiceCount > 0).length;
        const practiceScore =
          session.predictedQuestions.length > 0
            ? (practicedQuestions / session.predictedQuestions.length) * 20
            : 10; // Default if no questions

        return Math.round(checklistScore + questionScore + practiceScore);
      },

      getSessionsByProfile: (profileId) => {
        return get().sessions.filter((s) => s.profileId === profileId);
      },

      getUpcomingSessions: () => {
        const now = new Date();
        return get()
          .sessions.filter((s) => s.interviewDate && new Date(s.interviewDate) > now)
          .sort(
            (a, b) =>
              new Date(a.interviewDate!).getTime() - new Date(b.interviewDate!).getTime()
          );
      },

      getSessionsForApplication: (applicationId) => {
        return get().sessions.filter((s) => s.applicationId === applicationId);
      },

      importSessions: (sessions) => {
        set((state) => ({
          sessions: [...sessions, ...state.sessions.filter(
            (existing) => !sessions.some((imported) => imported.id === existing.id)
          )],
        }));
      },

      exportSessions: () => {
        return get().sessions;
      },
    }),
    {
      name: STORAGE_KEYS.INTERVIEW_PREP,
      storage: createJSONStorage(() => createSyncedStorage()),
      partialize: (state) => ({
        sessions: state.sessions,
        practiceSessions: state.practiceSessions,
      }),
    }
  )
);

// Set up cross-tab sync for interview prep store
let interviewPrepSyncUnsubscribe: (() => void) | null = null;

export function initInterviewPrepSync(): void {
  if (interviewPrepSyncUnsubscribe) return;

  interviewPrepSyncUnsubscribe = setupStoreSync<InterviewPrepState>(
    STORAGE_KEYS.INTERVIEW_PREP,
    (updates) => useInterviewPrepStore.setState(updates),
    () => ['sessions', 'practiceSessions']
  );
}

export function destroyInterviewPrepSync(): void {
  if (interviewPrepSyncUnsubscribe) {
    interviewPrepSyncUnsubscribe();
    interviewPrepSyncUnsubscribe = null;
  }
}

// Migration helper for legacy data
export function migrateLegacyInterviewPrep(): void {
  const legacyData = localStorage.getItem(STORAGE_KEYS.LEGACY_INTERVIEW_PREP);
  if (legacyData && !localStorage.getItem(STORAGE_KEYS.INTERVIEW_PREP)) {
    try {
      const parsed = JSON.parse(legacyData);
      // The legacy storage format has a 'state' wrapper from Zustand persist
      const sessions = parsed?.state?.sessions || [];
      const practiceSessions = parsed?.state?.practiceSessions || [];
      if (sessions.length > 0 || practiceSessions.length > 0) {
        useInterviewPrepStore.getState().importSessions(sessions);
        // Set practice sessions directly
        useInterviewPrepStore.setState({ practiceSessions });
        console.log(`Migrated ${sessions.length} interview prep sessions from legacy storage`);
      }
    } catch (error) {
      console.error('Failed to migrate legacy interview prep:', error);
    }
  }
}

// Export helper for checking if session exists
export function hasSessionForApplication(applicationId: string): boolean {
  return useInterviewPrepStore.getState().getSession(applicationId) !== undefined;
}

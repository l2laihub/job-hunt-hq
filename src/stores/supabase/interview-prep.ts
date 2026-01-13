/**
 * Interview Prep Store - Supabase Version
 * Manages interview prep sessions with Supabase backend
 */
import { create } from 'zustand';
import type {
  InterviewPrepSession,
  PrepChecklistItem,
  PredictedQuestion,
  PrepPracticeSession,
  InterviewStage,
  PrepItemStatus,
  QuickReference,
} from '@/src/types';
import { interviewPrepService } from '@/src/services/database';
import { generateId } from '@/src/lib/utils';

/**
 * Generate default checklist items based on interview type
 */
function generateDefaultChecklist(type: InterviewStage): PrepChecklistItem[] {
  const common: Omit<PrepChecklistItem, 'id'>[] = [
    { category: 'research', label: 'Review company research', priority: 'required', status: 'not-started' },
    { category: 'research', label: 'Review job analysis', priority: 'required', status: 'not-started' },
    { category: 'stories', label: 'Prepare 3+ relevant STAR stories', priority: 'required', status: 'not-started' },
    { category: 'questions', label: 'Prepare questions to ask interviewer', priority: 'required', status: 'not-started' },
    { category: 'logistics', label: 'Confirm interview time and link/location', priority: 'required', status: 'not-started' },
  ];

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

  return [...common, ...(typeSpecific[type] || [])].map((item) => ({
    ...item,
    id: generateId(),
  }));
}

interface InterviewPrepState {
  sessions: InterviewPrepSession[];
  practiceSessions: PrepPracticeSession[];
  isLoading: boolean;
  error: string | null;

  // Data fetching
  fetchSessions: () => Promise<void>;

  // Session CRUD
  createSession: (applicationId: string, interviewType: InterviewStage, profileId?: string) => Promise<InterviewPrepSession>;
  getSession: (applicationId: string) => InterviewPrepSession | undefined;
  getSessionById: (sessionId: string) => InterviewPrepSession | undefined;
  updateSession: (sessionId: string, updates: Partial<InterviewPrepSession>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;

  // Checklist management
  updateChecklistItem: (sessionId: string, itemId: string, status: PrepItemStatus) => Promise<void>;
  addChecklistItem: (sessionId: string, item: Omit<PrepChecklistItem, 'id'>) => Promise<void>;
  removeChecklistItem: (sessionId: string, itemId: string) => Promise<void>;

  // Question management
  setPredictedQuestions: (sessionId: string, questions: PredictedQuestion[]) => Promise<void>;
  markQuestionPrepared: (sessionId: string, questionId: string, storyId?: string, answerId?: string) => Promise<void>;
  recordQuestionPractice: (sessionId: string, questionId: string) => Promise<void>;

  // Quick reference
  setQuickReference: (sessionId: string, quickRef: QuickReference) => Promise<void>;

  // Practice sessions
  addPracticeSession: (session: Omit<PrepPracticeSession, 'id' | 'createdAt'>) => Promise<PrepPracticeSession>;
  getPracticeSessions: (sessionId: string) => PrepPracticeSession[];

  // Readiness calculation
  calculateReadiness: (sessionId: string) => number;

  // Queries
  getSessionsByProfile: (profileId: string) => InterviewPrepSession[];
  getUpcomingSessions: () => InterviewPrepSession[];
  getSessionsForApplication: (applicationId: string) => InterviewPrepSession[];

  // Import/Export
  importSessions: (sessions: InterviewPrepSession[]) => Promise<void>;
  exportSessions: () => InterviewPrepSession[];

  // Real-time subscription
  subscribeToChanges: () => () => void;
}

export const useSupabaseInterviewPrepStore = create<InterviewPrepState>()((set, get) => ({
  sessions: [],
  practiceSessions: [],
  isLoading: false,
  error: null,

  fetchSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const sessions = await interviewPrepService.list();
      set({ sessions, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
        isLoading: false,
      });
    }
  },

  createSession: async (applicationId, interviewType, profileId) => {
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

    try {
      const created = await interviewPrepService.create(session);
      set((state) => ({
        sessions: [created, ...state.sessions],
      }));
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create session' });
      throw error;
    }
  },

  getSession: (applicationId) => {
    return get().sessions.find((s) => s.applicationId === applicationId);
  },

  getSessionById: (sessionId) => {
    return get().sessions.find((s) => s.id === sessionId);
  },

  updateSession: async (sessionId, updates) => {
    try {
      const updated = await interviewPrepService.update(sessionId, updates);
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? updated : s
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update session' });
      throw error;
    }
  },

  deleteSession: async (sessionId) => {
    try {
      await interviewPrepService.delete(sessionId);
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        practiceSessions: state.practiceSessions.filter((p) => p.sessionId !== sessionId),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete session' });
      throw error;
    }
  },

  updateChecklistItem: async (sessionId, itemId, status) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const updatedChecklist = session.checklist.map((item) =>
      item.id === itemId
        ? {
            ...item,
            status,
            completedAt: status === 'completed' ? new Date().toISOString() : undefined,
          }
        : item
    );

    await get().updateSession(sessionId, { checklist: updatedChecklist });

    // Recalculate readiness after update
    const readiness = get().calculateReadiness(sessionId);
    await get().updateSession(sessionId, { readinessScore: readiness });
  },

  addChecklistItem: async (sessionId, item) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const newItem: PrepChecklistItem = { ...item, id: generateId() };
    await get().updateSession(sessionId, {
      checklist: [...session.checklist, newItem],
    });
  },

  removeChecklistItem: async (sessionId, itemId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) return;

    await get().updateSession(sessionId, {
      checklist: session.checklist.filter((item) => item.id !== itemId),
    });
  },

  setPredictedQuestions: async (sessionId, questions) => {
    await get().updateSession(sessionId, { predictedQuestions: questions });

    // Recalculate readiness
    const readiness = get().calculateReadiness(sessionId);
    await get().updateSession(sessionId, { readinessScore: readiness });
  },

  markQuestionPrepared: async (sessionId, questionId, storyId, answerId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const updatedQuestions = session.predictedQuestions.map((q) =>
      q.id === questionId
        ? {
            ...q,
            isPrepared: storyId !== undefined || answerId !== undefined,
            matchedStoryId: storyId,
            matchedAnswerId: answerId,
          }
        : q
    );

    await get().updateSession(sessionId, { predictedQuestions: updatedQuestions });

    // Recalculate readiness
    const readiness = get().calculateReadiness(sessionId);
    await get().updateSession(sessionId, { readinessScore: readiness });
  },

  recordQuestionPractice: async (sessionId, questionId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const updatedQuestions = session.predictedQuestions.map((q) =>
      q.id === questionId
        ? { ...q, practiceCount: q.practiceCount + 1 }
        : q
    );

    await get().updateSession(sessionId, {
      predictedQuestions: updatedQuestions,
      lastPracticedAt: new Date().toISOString(),
    });
  },

  setQuickReference: async (sessionId, quickRef) => {
    await get().updateSession(sessionId, { quickReference: quickRef });
  },

  addPracticeSession: async (sessionData) => {
    const now = new Date().toISOString();
    const practiceSession: PrepPracticeSession = {
      ...sessionData,
      id: generateId(),
      createdAt: now,
    };

    try {
      const created = await interviewPrepService.practice.create(sessionData);

      // Update local state
      set((state) => ({
        practiceSessions: [created, ...state.practiceSessions],
      }));

      // Update parent session
      const session = get().sessions.find((s) => s.id === sessionData.sessionId);
      if (session) {
        await get().updateSession(sessionData.sessionId, {
          practiceSessionIds: [created.id, ...session.practiceSessionIds],
          lastPracticedAt: now,
        });

        // Recalculate readiness
        const readiness = get().calculateReadiness(sessionData.sessionId);
        await get().updateSession(sessionData.sessionId, { readinessScore: readiness });
      }

      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add practice session' });
      throw error;
    }
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
        : 25;

    // Questions weight: 30%
    const highLikelihood = session.predictedQuestions.filter((q) => q.likelihood === 'high');
    const preparedHigh = highLikelihood.filter((q) => q.isPrepared).length;
    const questionScore =
      highLikelihood.length > 0
        ? (preparedHigh / highLikelihood.length) * 30
        : 15;

    // Practice weight: 20%
    const practicedQuestions = session.predictedQuestions.filter((q) => q.practiceCount > 0).length;
    const practiceScore =
      session.predictedQuestions.length > 0
        ? (practicedQuestions / session.predictedQuestions.length) * 20
        : 10;

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

  importSessions: async (sessions) => {
    try {
      await interviewPrepService.upsertMany(sessions);
      await get().fetchSessions();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to import sessions' });
      throw error;
    }
  },

  exportSessions: () => {
    return get().sessions;
  },

  subscribeToChanges: () => {
    return interviewPrepService.subscribe((sessions) => {
      set({ sessions });
    });
  },
}));

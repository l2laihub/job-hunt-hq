/**
 * Copilot Sessions Store - Supabase Version
 * Manages Interview Copilot session history with Supabase backend
 */
import { create } from 'zustand';
import type {
  SavedCopilotSession,
  CopilotSession,
  CopilotSessionFeedback,
} from '@/src/types';
import { copilotSessionsService } from '@/src/services/database';

interface CopilotSessionsState {
  sessions: SavedCopilotSession[];
  isLoading: boolean;
  error: string | null;

  // Data fetching
  fetchSessions: () => Promise<void>;

  // Session CRUD
  saveSession: (
    session: CopilotSession,
    metadata: {
      profileId?: string;
      company?: string;
      role?: string;
    }
  ) => Promise<SavedCopilotSession>;
  getSession: (id: string) => SavedCopilotSession | undefined;
  deleteSession: (id: string) => Promise<void>;

  // Feedback
  submitFeedback: (sessionId: string, feedback: CopilotSessionFeedback) => Promise<void>;

  // Queries
  getSessionsByApplication: (applicationId: string) => SavedCopilotSession[];
  getSessionsByCompany: (company: string) => SavedCopilotSession[];
  getRecentSessions: (limit?: number) => SavedCopilotSession[];

  // Stats
  getStats: () => Promise<{
    totalSessions: number;
    totalQuestions: number;
    avgSessionDurationMs: number;
    avgQuestionsPerSession: number;
  }>;

  // Real-time subscription
  subscribeToChanges: () => () => void;
}

// Helper to generate session title
function generateSessionTitle(
  session: CopilotSession,
  company?: string,
  role?: string
): string {
  const date = new Date(session.startedAt);
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (company && role) {
    return `${company} - ${role} (${dateStr})`;
  } else if (company) {
    return `${company} Interview (${dateStr})`;
  } else {
    return `Interview Practice (${dateStr})`;
  }
}

// Helper to calculate session duration
function calculateDuration(startedAt: string, endedAt?: string): number {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  return end - start;
}

export const useSupabaseCopilotSessionsStore = create<CopilotSessionsState>()(
  (set, get) => ({
    sessions: [],
    isLoading: false,
    error: null,

    fetchSessions: async () => {
      set({ isLoading: true, error: null });
      try {
        const sessions = await copilotSessionsService.list();
        set({ sessions, isLoading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch sessions',
          isLoading: false,
        });
      }
    },

    saveSession: async (session, metadata) => {
      const now = new Date().toISOString();
      const endedAt = session.endedAt || now;

      const savedSession: Omit<SavedCopilotSession, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        profileId: metadata.profileId,
        applicationId: session.applicationId,
        title: generateSessionTitle(session, metadata.company, metadata.role),
        company: metadata.company,
        role: metadata.role,
        startedAt: session.startedAt,
        endedAt,
        durationMs: calculateDuration(session.startedAt, endedAt),
        transcript: session.transcript,
        detectedQuestions: session.detectedQuestions,
        suggestions: session.suggestions,
        contextUsed: session.contextUsed,
        stats: session.stats,
      };

      try {
        const created = await copilotSessionsService.create(savedSession);
        set((state) => ({
          sessions: [created, ...state.sessions],
        }));
        return created;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to save session' });
        throw error;
      }
    },

    getSession: (id) => {
      return get().sessions.find((s) => s.id === id);
    },

    deleteSession: async (id) => {
      try {
        await copilotSessionsService.delete(id);
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
        }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete session' });
        throw error;
      }
    },

    submitFeedback: async (sessionId, feedback) => {
      try {
        const updated = await copilotSessionsService.updateFeedback(sessionId, feedback);
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? updated : s
          ),
        }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to submit feedback' });
        throw error;
      }
    },

    getSessionsByApplication: (applicationId) => {
      return get().sessions.filter((s) => s.applicationId === applicationId);
    },

    getSessionsByCompany: (company) => {
      return get().sessions.filter(
        (s) => s.company?.toLowerCase() === company.toLowerCase()
      );
    },

    getRecentSessions: (limit = 10) => {
      return get().sessions.slice(0, limit);
    },

    getStats: async () => {
      try {
        return await copilotSessionsService.getStats();
      } catch (error) {
        console.error('Failed to get stats:', error);
        return {
          totalSessions: 0,
          totalQuestions: 0,
          avgSessionDurationMs: 0,
          avgQuestionsPerSession: 0,
        };
      }
    },

    subscribeToChanges: () => {
      return copilotSessionsService.subscribe((sessions) => {
        set({ sessions });
      });
    },
  })
);

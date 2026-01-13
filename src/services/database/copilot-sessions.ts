/**
 * Copilot Sessions Database Service
 * Handles CRUD operations for Interview Copilot session history
 */
import { supabase } from '@/src/lib/supabase';
import type { CopilotSessionRow } from '@/src/lib/supabase/types';
import type {
  SavedCopilotSession,
  CopilotTranscriptEntry,
  DetectedQuestion,
  CopilotSuggestion,
  CopilotSession,
  CopilotSessionFeedback,
} from '@/src/types';

// Type converters
function rowToSavedSession(row: CopilotSessionRow): SavedCopilotSession {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id || undefined,
    applicationId: row.application_id || undefined,
    title: row.title,
    company: row.company || undefined,
    role: row.role || undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    transcript: row.transcript as CopilotTranscriptEntry[],
    detectedQuestions: row.detected_questions as DetectedQuestion[],
    suggestions: row.suggestions as CopilotSuggestion[],
    contextUsed: row.context_used as CopilotSession['contextUsed'],
    stats: row.stats as CopilotSession['stats'],
    feedback: row.feedback as CopilotSessionFeedback | undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function savedSessionToInsert(
  session: Omit<SavedCopilotSession, 'createdAt' | 'updatedAt'>,
  userId: string
): Omit<CopilotSessionRow, 'created_at' | 'updated_at'> {
  return {
    id: session.id,
    user_id: userId,
    profile_id: session.profileId || null,
    application_id: session.applicationId || null,
    title: session.title,
    company: session.company || null,
    role: session.role || null,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    duration_ms: session.durationMs,
    transcript: session.transcript as unknown as CopilotSessionRow['transcript'],
    detected_questions: session.detectedQuestions as unknown as CopilotSessionRow['detected_questions'],
    suggestions: session.suggestions as unknown as CopilotSessionRow['suggestions'],
    context_used: session.contextUsed as unknown as CopilotSessionRow['context_used'],
    stats: session.stats as unknown as CopilotSessionRow['stats'],
    feedback: session.feedback as unknown as CopilotSessionRow['feedback'] || null,
  };
}

export const copilotSessionsService = {
  /**
   * List all copilot sessions for the current user
   */
  async list(): Promise<SavedCopilotSession[]> {
    const { data, error } = await supabase
      .from('copilot_sessions')
      .select('*')
      .order('started_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToSavedSession);
  },

  /**
   * Get a single copilot session by ID
   */
  async get(id: string): Promise<SavedCopilotSession | null> {
    const { data, error } = await supabase
      .from('copilot_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data ? rowToSavedSession(data) : null;
  },

  /**
   * Create a new copilot session
   */
  async create(
    session: Omit<SavedCopilotSession, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<SavedCopilotSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const id = crypto.randomUUID();
    const insertData = savedSessionToInsert({ ...session, id }, user.id);

    const { data, error } = await supabase
      .from('copilot_sessions')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return rowToSavedSession(data);
  },

  /**
   * Update an existing copilot session
   */
  async update(
    id: string,
    updates: Partial<SavedCopilotSession>
  ): Promise<SavedCopilotSession> {
    const updateData: Record<string, unknown> = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.feedback !== undefined) updateData.feedback = updates.feedback;
    if (updates.transcript !== undefined) updateData.transcript = updates.transcript;
    if (updates.detectedQuestions !== undefined) updateData.detected_questions = updates.detectedQuestions;
    if (updates.suggestions !== undefined) updateData.suggestions = updates.suggestions;

    const { data, error } = await supabase
      .from('copilot_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return rowToSavedSession(data);
  },

  /**
   * Add or update feedback for a session
   */
  async updateFeedback(
    id: string,
    feedback: CopilotSessionFeedback
  ): Promise<SavedCopilotSession> {
    return this.update(id, { feedback });
  },

  /**
   * Delete a copilot session
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('copilot_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get sessions for a specific application
   */
  async getByApplication(applicationId: string): Promise<SavedCopilotSession[]> {
    const { data, error } = await supabase
      .from('copilot_sessions')
      .select('*')
      .eq('application_id', applicationId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToSavedSession);
  },

  /**
   * Get sessions for a specific company
   */
  async getByCompany(company: string): Promise<SavedCopilotSession[]> {
    const { data, error } = await supabase
      .from('copilot_sessions')
      .select('*')
      .eq('company', company)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToSavedSession);
  },

  /**
   * Get recent sessions (last 30 days)
   */
  async getRecent(limit = 10): Promise<SavedCopilotSession[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('copilot_sessions')
      .select('*')
      .gte('started_at', thirtyDaysAgo.toISOString())
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(rowToSavedSession);
  },

  /**
   * Get session statistics for the current user
   */
  async getStats(): Promise<{
    totalSessions: number;
    totalQuestions: number;
    avgSessionDurationMs: number;
    avgQuestionsPerSession: number;
  }> {
    const { data, error } = await supabase
      .from('copilot_sessions')
      .select('duration_ms, stats');

    if (error) throw error;

    const sessions = data || [];
    const totalSessions = sessions.length;

    if (totalSessions === 0) {
      return {
        totalSessions: 0,
        totalQuestions: 0,
        avgSessionDurationMs: 0,
        avgQuestionsPerSession: 0,
      };
    }

    const totalDurationMs = sessions.reduce((sum, s) => sum + (s.duration_ms || 0), 0);
    const totalQuestions = sessions.reduce((sum, s) => {
      const stats = s.stats as CopilotSession['stats'];
      return sum + (stats?.questionsDetected || 0);
    }, 0);

    return {
      totalSessions,
      totalQuestions,
      avgSessionDurationMs: Math.round(totalDurationMs / totalSessions),
      avgQuestionsPerSession: Math.round(totalQuestions / totalSessions),
    };
  },

  /**
   * Subscribe to changes
   */
  subscribe(callback: (sessions: SavedCopilotSession[]) => void): () => void {
    const channel = supabase
      .channel('copilot_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'copilot_sessions',
        },
        async () => {
          // Refetch all sessions on any change
          const sessions = await this.list();
          callback(sessions);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

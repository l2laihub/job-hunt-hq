/**
 * Interview Prep Database Service
 * Handles all interview prep session database operations
 */
import { supabase, from } from '@/src/lib/supabase';
import type { InterviewPrepSession, PrepPracticeSession } from '@/src/types';
import type { Json, InterviewPrepSessionRow, InterviewPracticeSessionRow } from '@/src/lib/supabase/types';

// Type converters
function prepSessionRowToInterviewPrepSession(row: InterviewPrepSessionRow): InterviewPrepSession {
  return {
    id: row.id,
    applicationId: row.application_id,
    profileId: row.profile_id || undefined,
    interviewDate: row.interview_date || undefined,
    interviewTime: row.interview_time || undefined,
    interviewType: row.interview_type,
    interviewerName: row.interviewer_name || undefined,
    interviewerRole: row.interviewer_role || undefined,
    interviewLocation: row.interview_location || undefined,
    notes: row.notes || undefined,
    checklist: (row.checklist as unknown as InterviewPrepSession['checklist']) || [],
    predictedQuestions: (row.predicted_questions as unknown as InterviewPrepSession['predictedQuestions']) || [],
    readinessScore: row.readiness_score,
    phoneScreenPrep: (row.phone_screen_prep as unknown as InterviewPrepSession['phoneScreenPrep']) || undefined,
    technicalPrep: (row.technical_prep as unknown as InterviewPrepSession['technicalPrep']) || undefined,
    applicationStrategy: (row.application_strategy as unknown as InterviewPrepSession['applicationStrategy']) || undefined,
    quickReference: (row.quick_reference as unknown as InterviewPrepSession['quickReference']) || undefined,
    practiceSessionIds: row.practice_session_ids || [],
    lastPracticedAt: row.last_practiced_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function interviewPrepSessionToRow(
  session: InterviewPrepSession,
  userId: string
): Omit<InterviewPrepSessionRow, 'created_at' | 'updated_at'> {
  return {
    id: session.id,
    user_id: userId,
    profile_id: session.profileId || null,
    application_id: session.applicationId,
    interview_date: session.interviewDate || null,
    interview_time: session.interviewTime || null,
    interview_type: session.interviewType,
    interviewer_name: session.interviewerName || null,
    interviewer_role: session.interviewerRole || null,
    interview_location: session.interviewLocation || null,
    notes: session.notes || null,
    checklist: session.checklist as unknown as Json,
    predicted_questions: session.predictedQuestions as unknown as Json,
    readiness_score: session.readinessScore,
    phone_screen_prep: (session.phoneScreenPrep || null) as Json | null,
    technical_prep: (session.technicalPrep || null) as Json | null,
    application_strategy: (session.applicationStrategy || null) as Json | null,
    quick_reference: (session.quickReference || null) as Json | null,
    practice_session_ids: session.practiceSessionIds,
    last_practiced_at: session.lastPracticedAt || null,
  };
}

function practiceSessionRowToPrepPracticeSession(row: InterviewPracticeSessionRow): PrepPracticeSession {
  return {
    id: row.id,
    sessionId: row.prep_session_id,
    mode: row.mode,
    questionIds: row.question_ids || [],
    durationSeconds: row.duration_seconds || 0,
    selfRating: row.self_rating || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

function prepPracticeSessionToRow(
  session: PrepPracticeSession,
  userId: string
): Omit<InterviewPracticeSessionRow, 'created_at'> {
  return {
    id: session.id,
    user_id: userId,
    prep_session_id: session.sessionId,
    mode: session.mode,
    question_ids: session.questionIds,
    duration_seconds: session.durationSeconds || null,
    self_rating: session.selfRating || null,
    notes: session.notes || null,
    question_results: [],
    feedback: null,
    config: null,
  };
}

export const interviewPrepService = {
  /**
   * Fetch all prep sessions for the current user
   */
  async list(): Promise<InterviewPrepSession[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('interview_prep_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(prepSessionRowToInterviewPrepSession);
  },

  /**
   * Get prep sessions for a specific profile
   */
  async listByProfile(profileId: string): Promise<InterviewPrepSession[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('interview_prep_sessions')
      .select('*')
      .eq('user_id', user.id)
      .or(`profile_id.eq.${profileId},profile_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(prepSessionRowToInterviewPrepSession);
  },

  /**
   * Get prep session for a specific application
   */
  async getByApplication(applicationId: string): Promise<InterviewPrepSession | null> {
    const { data, error } = await from('interview_prep_sessions')
      .select('*')
      .eq('application_id', applicationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return prepSessionRowToInterviewPrepSession(data);
  },

  /**
   * Get a single prep session by ID
   */
  async get(id: string): Promise<InterviewPrepSession | null> {
    const { data, error } = await from('interview_prep_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return prepSessionRowToInterviewPrepSession(data);
  },

  /**
   * Create a new prep session
   */
  async create(session: Omit<InterviewPrepSession, 'createdAt' | 'updatedAt'>): Promise<InterviewPrepSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const now = new Date().toISOString();
    const fullSession: InterviewPrepSession = {
      ...session,
      createdAt: now,
      updatedAt: now,
    };

    const row = interviewPrepSessionToRow(fullSession, user.id);

    const { data, error } = await from('interview_prep_sessions')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return prepSessionRowToInterviewPrepSession(data);
  },

  /**
   * Update an existing prep session
   */
  async update(id: string, updates: Partial<InterviewPrepSession>): Promise<InterviewPrepSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const updateData: Record<string, unknown> = {};

    if (updates.profileId !== undefined) updateData.profile_id = updates.profileId || null;
    if (updates.interviewDate !== undefined) updateData.interview_date = updates.interviewDate || null;
    if (updates.interviewTime !== undefined) updateData.interview_time = updates.interviewTime || null;
    if (updates.interviewType !== undefined) updateData.interview_type = updates.interviewType;
    if (updates.interviewerName !== undefined) updateData.interviewer_name = updates.interviewerName || null;
    if (updates.interviewerRole !== undefined) updateData.interviewer_role = updates.interviewerRole || null;
    if (updates.interviewLocation !== undefined) updateData.interview_location = updates.interviewLocation || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;
    if (updates.checklist !== undefined) updateData.checklist = updates.checklist as unknown as Json;
    if (updates.predictedQuestions !== undefined) updateData.predicted_questions = updates.predictedQuestions as unknown as Json;
    if (updates.readinessScore !== undefined) updateData.readiness_score = updates.readinessScore;
    if (updates.phoneScreenPrep !== undefined) updateData.phone_screen_prep = (updates.phoneScreenPrep || null) as Json | null;
    if (updates.technicalPrep !== undefined) updateData.technical_prep = (updates.technicalPrep || null) as Json | null;
    if (updates.applicationStrategy !== undefined) updateData.application_strategy = (updates.applicationStrategy || null) as Json | null;
    if (updates.quickReference !== undefined) updateData.quick_reference = (updates.quickReference || null) as Json | null;
    if (updates.practiceSessionIds !== undefined) updateData.practice_session_ids = updates.practiceSessionIds;
    if (updates.lastPracticedAt !== undefined) updateData.last_practiced_at = updates.lastPracticedAt || null;

    const { data, error } = await from('interview_prep_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return prepSessionRowToInterviewPrepSession(data);
  },

  /**
   * Delete a prep session
   */
  async delete(id: string): Promise<void> {
    const { error } = await from('interview_prep_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Batch upsert prep sessions (for migration)
   */
  async upsertMany(sessions: InterviewPrepSession[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const rows = sessions.map((s) => interviewPrepSessionToRow(s, user.id));

    const { error } = await from('interview_prep_sessions')
      .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
  },

  /**
   * Subscribe to prep session changes
   */
  subscribe(callback: (sessions: InterviewPrepSession[]) => void) {
    const channel = supabase
      .channel('interview-prep-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_prep_sessions',
        },
        async () => {
          const sessions = await this.list();
          callback(sessions);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Practice sessions
  practice: {
    /**
     * List all practice sessions for a prep session
     */
    async list(prepSessionId: string): Promise<PrepPracticeSession[]> {
      const { data, error } = await from('interview_practice_sessions')
        .select('*')
        .eq('prep_session_id', prepSessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(practiceSessionRowToPrepPracticeSession);
    },

    /**
     * Create a practice session
     */
    async create(session: Omit<PrepPracticeSession, 'id' | 'createdAt'>): Promise<PrepPracticeSession> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await from('interview_practice_sessions')
        .insert({
          user_id: user.id,
          prep_session_id: session.sessionId,
          mode: session.mode,
          question_ids: session.questionIds,
          duration_seconds: session.durationSeconds || null,
          self_rating: session.selfRating || null,
          notes: session.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return practiceSessionRowToPrepPracticeSession(data);
    },

    /**
     * Batch upsert practice sessions (for migration)
     */
    async upsertMany(sessions: PrepPracticeSession[]): Promise<void> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const rows = sessions.map((s) => prepPracticeSessionToRow(s, user.id));

      const { error } = await from('interview_practice_sessions')
        .upsert(rows, { onConflict: 'id' });

      if (error) throw error;
    },
  },
};

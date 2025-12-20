/**
 * Technical Answers Database Service
 * Handles all technical answer-related database operations
 */
import { supabase, from } from '@/src/lib/supabase';
import type { TechnicalAnswer, PracticeSession, TechnicalQuestionType } from '@/src/types';
import type { TechnicalAnswerRow, PracticeSessionRow, Json } from '@/src/lib/supabase/types';

// Type converters
function rowToTechnicalAnswer(row: TechnicalAnswerRow): TechnicalAnswer {
  return {
    id: row.id,
    question: row.question,
    questionType: row.question_type,
    format: (row.format as unknown as TechnicalAnswer['format']) || { type: 'Explain-Example-Tradeoffs', sections: [] },
    sources: (row.sources as unknown as TechnicalAnswer['sources']) || { storyIds: [], profileSections: [], synthesized: false },
    answer: (row.answer as unknown as TechnicalAnswer['answer']) || { structured: [], narrative: '', bulletPoints: [] },
    followUps: (row.follow_ups as unknown as TechnicalAnswer['followUps']) || [],
    metadata: (row.metadata as unknown as TechnicalAnswer['metadata']) || { difficulty: 'mid', tags: [] },
    usedInInterviews: row.used_in_interviews || [],
    timesUsed: row.times_used,
    practiceCount: row.practice_count,
    lastPracticedAt: row.last_practiced_at || undefined,
    profileId: row.profile_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPracticeSession(row: PracticeSessionRow): PracticeSession {
  return {
    id: row.id,
    answerId: row.answer_id,
    durationSeconds: row.duration_seconds || undefined,
    notes: row.notes || undefined,
    selfRating: row.self_rating || undefined,
    areasToImprove: row.areas_to_improve || [],
    createdAt: row.created_at,
  };
}

export const technicalAnswersService = {
  /**
   * Fetch all answers for the current user
   */
  async list(): Promise<TechnicalAnswer[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('technical_answers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToTechnicalAnswer);
  },

  /**
   * Get answers for a specific profile
   */
  async listByProfile(profileId: string): Promise<TechnicalAnswer[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('technical_answers')
      .select('*')
      .eq('user_id', user.id)
      .or(`profile_id.eq.${profileId},profile_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToTechnicalAnswer);
  },

  /**
   * Get a single answer by ID
   */
  async get(id: string): Promise<TechnicalAnswer | null> {
    const { data, error } = await from('technical_answers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return rowToTechnicalAnswer(data);
  },

  /**
   * Create a new answer
   */
  async create(answer: Partial<TechnicalAnswer>, profileId?: string): Promise<TechnicalAnswer> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const now = new Date().toISOString();
    const row = {
      user_id: user.id,
      profile_id: profileId || answer.profileId || null,
      question: answer.question || '',
      question_type: answer.questionType || 'conceptual',
      format: (answer.format || { type: 'Explain-Example-Tradeoffs', sections: [] }) as unknown as Json,
      sources: (answer.sources || { storyIds: [], profileSections: [], synthesized: false }) as unknown as Json,
      answer: (answer.answer || { structured: [], narrative: '', bulletPoints: [] }) as unknown as Json,
      follow_ups: (answer.followUps || []) as unknown as Json,
      metadata: (answer.metadata || { difficulty: 'mid', tags: [] }) as unknown as Json,
      used_in_interviews: [],
      times_used: 0,
      practice_count: 0,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await from('technical_answers')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return rowToTechnicalAnswer(data);
  },

  /**
   * Update an existing answer
   */
  async update(id: string, updates: Partial<TechnicalAnswer>): Promise<TechnicalAnswer> {
    const updateData: Record<string, unknown> = {};

    if (updates.question !== undefined) updateData.question = updates.question;
    if (updates.questionType !== undefined) updateData.question_type = updates.questionType;
    if (updates.format !== undefined) updateData.format = updates.format as unknown as Json;
    if (updates.sources !== undefined) updateData.sources = updates.sources as unknown as Json;
    if (updates.answer !== undefined) updateData.answer = updates.answer as unknown as Json;
    if (updates.followUps !== undefined) updateData.follow_ups = updates.followUps as unknown as Json;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata as unknown as Json;
    if (updates.usedInInterviews !== undefined) updateData.used_in_interviews = updates.usedInInterviews;
    if (updates.timesUsed !== undefined) updateData.times_used = updates.timesUsed;
    if (updates.practiceCount !== undefined) updateData.practice_count = updates.practiceCount;
    if (updates.lastPracticedAt !== undefined) updateData.last_practiced_at = updates.lastPracticedAt;
    if (updates.profileId !== undefined) updateData.profile_id = updates.profileId;

    const { data, error } = await from('technical_answers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return rowToTechnicalAnswer(data);
  },

  /**
   * Delete an answer
   */
  async delete(id: string): Promise<void> {
    const { error } = await from('technical_answers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Increment usage count
   */
  async incrementUsage(id: string): Promise<void> {
    const answer = await this.get(id);
    if (!answer) throw new Error('Answer not found');

    await this.update(id, { timesUsed: answer.timesUsed + 1 });
  },

  /**
   * Record used in interview
   */
  async recordUsedInInterview(id: string, interviewId: string): Promise<void> {
    const answer = await this.get(id);
    if (!answer) throw new Error('Answer not found');

    await this.update(id, {
      usedInInterviews: [...(answer.usedInInterviews || []), interviewId],
      timesUsed: answer.timesUsed + 1,
    });
  },

  /**
   * Record a practice session
   */
  async recordPractice(
    answerId: string,
    session: Omit<PracticeSession, 'id' | 'answerId' | 'createdAt'>
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const now = new Date().toISOString();

    // Create practice session
    const practiceData = {
      user_id: user.id,
      answer_id: answerId,
      duration_seconds: session.durationSeconds,
      notes: session.notes,
      self_rating: session.selfRating,
      areas_to_improve: session.areasToImprove || [],
      created_at: now,
    };
    const { error: sessionError } = await from('practice_sessions')
      .insert(practiceData);

    if (sessionError) throw sessionError;

    // Update answer practice count
    const answer = await this.get(answerId);
    if (answer) {
      await this.update(answerId, {
        practiceCount: answer.practiceCount + 1,
        lastPracticedAt: now,
      });
    }
  },

  /**
   * Get practice sessions for an answer
   */
  async getPracticeSessions(answerId: string): Promise<PracticeSession[]> {
    const { data, error } = await from('practice_sessions')
      .select('*')
      .eq('answer_id', answerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToPracticeSession);
  },

  /**
   * Get answers by type
   */
  async getByType(type: TechnicalQuestionType): Promise<TechnicalAnswer[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('technical_answers')
      .select('*')
      .eq('user_id', user.id)
      .eq('question_type', type)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToTechnicalAnswer);
  },

  /**
   * Search answers
   */
  async search(query: string): Promise<TechnicalAnswer[]> {
    const allAnswers = await this.list();
    const lowerQuery = query.toLowerCase();

    return allAnswers.filter(
      (a) =>
        a.question.toLowerCase().includes(lowerQuery) ||
        a.answer.narrative.toLowerCase().includes(lowerQuery) ||
        a.metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * Batch upsert answers (for migration)
   */
  async upsertMany(answers: TechnicalAnswer[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const rows = answers.map((a) => ({
      id: a.id,
      user_id: user.id,
      profile_id: a.profileId || null,
      question: a.question,
      question_type: a.questionType,
      format: a.format as unknown as Json,
      sources: a.sources as unknown as Json,
      answer: a.answer as unknown as Json,
      follow_ups: a.followUps as unknown as Json,
      metadata: a.metadata as unknown as Json,
      used_in_interviews: a.usedInInterviews || [],
      times_used: a.timesUsed,
      practice_count: a.practiceCount,
      last_practiced_at: a.lastPracticedAt || null,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    }));

    const { error } = await from('technical_answers')
      .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
  },

  /**
   * Subscribe to answer changes
   */
  subscribe(callback: (answers: TechnicalAnswer[]) => void) {
    const channel = supabase
      .channel('technical-answers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'technical_answers',
        },
        async () => {
          const answers = await this.list();
          callback(answers);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

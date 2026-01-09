/**
 * Interview Notes Database Service
 * Handles all interview note-related database operations
 */
import { supabase, from } from '@/src/lib/supabase';
import type {
  InterviewNote,
  InterviewStage,
  InterviewOutcome,
  InterviewProcessingStatus,
  NextStepPrep,
  InterviewQuestionAsked,
  DEFAULT_NEXT_STEP_PREP,
} from '@/src/types';
import type { InterviewNoteRow, Json } from '@/src/lib/supabase/types';

// ============================================
// Type Converters
// ============================================

export function interviewNoteRowToInterviewNote(row: InterviewNoteRow): InterviewNote {
  return {
    id: row.id,
    applicationId: row.application_id,
    stage: row.stage,
    interviewDate: row.interview_date,
    interviewerName: row.interviewer_name || undefined,
    interviewerRole: row.interviewer_role || undefined,
    durationMinutes: row.duration_minutes || undefined,
    rawNotes: row.raw_notes,
    audioRecording: row.audio_path
      ? {
          path: row.audio_path,
          durationSeconds: row.audio_duration_seconds || 0,
          sizeBytes: row.audio_size_bytes || 0,
          mimeType: row.audio_mime_type || 'audio/webm',
          uploadedAt: row.created_at, // Use created_at as upload time
        }
      : undefined,
    transcript: row.transcript || undefined,
    summary: row.summary || undefined,
    keyTakeaways: (row.key_takeaways as unknown as string[]) || [],
    questionsAsked: (row.questions_asked as unknown as InterviewQuestionAsked[]) || [],
    nextStepPrep: (row.next_step_prep as unknown as NextStepPrep) || {
      areasToReview: [],
      suggestedStories: [],
      anticipatedQuestions: [],
      strengthsShown: [],
      areasToImprove: [],
      followUpActions: [],
      redFlags: [],
      greenFlags: [],
    },
    outcome: row.outcome,
    outcomeNotes: row.outcome_notes || undefined,
    processingStatus: row.processing_status,
    processingError: row.processing_error || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function interviewNoteToRow(
  note: Omit<InterviewNote, 'createdAt' | 'updatedAt'>,
  userId: string
): Omit<InterviewNoteRow, 'created_at' | 'updated_at'> {
  return {
    id: note.id,
    user_id: userId,
    application_id: note.applicationId,
    stage: note.stage,
    interview_date: note.interviewDate,
    interviewer_name: note.interviewerName || null,
    interviewer_role: note.interviewerRole || null,
    duration_minutes: note.durationMinutes || null,
    raw_notes: note.rawNotes,
    audio_path: note.audioRecording?.path || null,
    audio_duration_seconds: note.audioRecording?.durationSeconds || null,
    audio_size_bytes: note.audioRecording?.sizeBytes || null,
    audio_mime_type: note.audioRecording?.mimeType || null,
    transcript: note.transcript || null,
    summary: note.summary || null,
    key_takeaways: note.keyTakeaways as unknown as Json,
    questions_asked: note.questionsAsked as unknown as Json,
    your_answers: [] as unknown as Json, // Reserved for future use
    next_step_prep: note.nextStepPrep as unknown as Json,
    outcome: note.outcome,
    outcome_notes: note.outcomeNotes || null,
    processing_status: note.processingStatus,
    processing_error: note.processingError || null,
  };
}

// ============================================
// Service
// ============================================

export const interviewNotesService = {
  /**
   * Fetch all interview notes for an application
   */
  async listByApplication(applicationId: string): Promise<InterviewNote[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('interview_notes')
      .select('*')
      .eq('application_id', applicationId)
      .eq('user_id', user.id)
      .order('interview_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(interviewNoteRowToInterviewNote);
  },

  /**
   * Get a single interview note by ID
   */
  async get(id: string): Promise<InterviewNote | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('interview_notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return interviewNoteRowToInterviewNote(data);
  },

  /**
   * Create a new interview note
   */
  async create(
    note: Omit<InterviewNote, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<InterviewNote> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const id = crypto.randomUUID();
    const row = interviewNoteToRow({ ...note, id }, user.id);

    const { data, error } = await from('interview_notes')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return interviewNoteRowToInterviewNote(data);
  },

  /**
   * Update an existing interview note
   */
  async update(
    id: string,
    updates: Partial<Omit<InterviewNote, 'id' | 'applicationId' | 'createdAt' | 'updatedAt'>>
  ): Promise<InterviewNote> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Build update object with snake_case keys
    const updateData: Record<string, unknown> = {};

    if (updates.stage !== undefined) updateData.stage = updates.stage;
    if (updates.interviewDate !== undefined) updateData.interview_date = updates.interviewDate;
    if (updates.interviewerName !== undefined) updateData.interviewer_name = updates.interviewerName;
    if (updates.interviewerRole !== undefined) updateData.interviewer_role = updates.interviewerRole;
    if (updates.durationMinutes !== undefined) updateData.duration_minutes = updates.durationMinutes;
    if (updates.rawNotes !== undefined) updateData.raw_notes = updates.rawNotes;
    if (updates.audioRecording !== undefined) {
      updateData.audio_path = updates.audioRecording?.path || null;
      updateData.audio_duration_seconds = updates.audioRecording?.durationSeconds || null;
      updateData.audio_size_bytes = updates.audioRecording?.sizeBytes || null;
      updateData.audio_mime_type = updates.audioRecording?.mimeType || null;
    }
    if (updates.transcript !== undefined) updateData.transcript = updates.transcript;
    if (updates.summary !== undefined) updateData.summary = updates.summary;
    if (updates.keyTakeaways !== undefined) updateData.key_takeaways = updates.keyTakeaways as unknown as Json;
    if (updates.questionsAsked !== undefined) updateData.questions_asked = updates.questionsAsked as unknown as Json;
    if (updates.nextStepPrep !== undefined) updateData.next_step_prep = updates.nextStepPrep as unknown as Json;
    if (updates.outcome !== undefined) updateData.outcome = updates.outcome;
    if (updates.outcomeNotes !== undefined) updateData.outcome_notes = updates.outcomeNotes;
    if (updates.processingStatus !== undefined) updateData.processing_status = updates.processingStatus;
    if (updates.processingError !== undefined) updateData.processing_error = updates.processingError;

    const { data, error } = await from('interview_notes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return interviewNoteRowToInterviewNote(data);
  },

  /**
   * Delete an interview note
   */
  async delete(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await from('interview_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Update processing status
   */
  async updateProcessingStatus(
    id: string,
    status: InterviewProcessingStatus,
    error?: string
  ): Promise<InterviewNote> {
    return this.update(id, {
      processingStatus: status,
      processingError: error,
    });
  },

  /**
   * Update outcome
   */
  async updateOutcome(
    id: string,
    outcome: InterviewOutcome,
    notes?: string
  ): Promise<InterviewNote> {
    return this.update(id, {
      outcome,
      outcomeNotes: notes,
    });
  },

  /**
   * Set AI-generated analysis results
   */
  async setAnalysisResults(
    id: string,
    results: {
      transcript?: string;
      summary?: string;
      keyTakeaways?: string[];
      questionsAsked?: InterviewQuestionAsked[];
      nextStepPrep?: NextStepPrep;
    }
  ): Promise<InterviewNote> {
    return this.update(id, {
      ...results,
      processingStatus: 'completed',
      processingError: undefined,
    });
  },

  /**
   * Get count of interview notes for an application
   */
  async countByApplication(applicationId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { count, error } = await from('interview_notes')
      .select('*', { count: 'exact', head: true })
      .eq('application_id', applicationId)
      .eq('user_id', user.id);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Get interview notes counts for multiple applications (batch)
   */
  async countByApplications(applicationIds: string[]): Promise<Record<string, number>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('interview_notes')
      .select('application_id')
      .eq('user_id', user.id)
      .in('application_id', applicationIds);

    if (error) throw error;

    // Count occurrences
    const counts: Record<string, number> = {};
    applicationIds.forEach(id => counts[id] = 0);
    (data || []).forEach(row => {
      counts[row.application_id] = (counts[row.application_id] || 0) + 1;
    });

    return counts;
  },

  /**
   * Subscribe to interview note changes for an application
   */
  subscribe(
    applicationId: string,
    callback: (notes: InterviewNote[]) => void
  ) {
    const channel = supabase
      .channel(`interview-notes-${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_notes',
          filter: `application_id=eq.${applicationId}`,
        },
        async () => {
          const notes = await this.listByApplication(applicationId);
          callback(notes);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

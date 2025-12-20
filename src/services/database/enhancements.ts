/**
 * Enhancements Database Service
 * Handles all resume enhancement-related database operations
 */
import { supabase, from } from '@/src/lib/supabase';
import type {
  ResumeEnhancement,
  ResumeAnalysis,
  EnhancementSuggestion,
  EnhancedProfile,
  EnhancementMode,
} from '@/src/types';
import type { EnhancementRow, Json } from '@/src/lib/supabase/types';
import { generateId } from '@/src/lib/utils';

// Type converter
function rowToEnhancement(row: EnhancementRow): ResumeEnhancement {
  return {
    id: row.id,
    mode: row.mode as EnhancementMode,
    jobId: row.job_id || undefined,
    jobTitle: row.job_title || undefined,
    companyName: row.company_name || undefined,
    analysis: row.analysis as unknown as ResumeAnalysis,
    suggestions: (row.suggestions as unknown as EnhancementSuggestion[]) || [],
    appliedSuggestionIds: row.applied_suggestion_ids || [],
    enhancedProfile: row.enhanced_profile as unknown as EnhancedProfile,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const enhancementsService = {
  /**
   * Fetch all enhancements for the current user
   */
  async list(): Promise<ResumeEnhancement[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('enhancements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToEnhancement);
  },

  /**
   * Get a single enhancement by ID
   */
  async get(id: string): Promise<ResumeEnhancement | null> {
    const { data, error } = await from('enhancements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return rowToEnhancement(data);
  },

  /**
   * Get enhancements for a specific job
   */
  async getByJob(jobId: string): Promise<ResumeEnhancement[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('enhancements')
      .select('*')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToEnhancement);
  },

  /**
   * Create a new enhancement
   */
  async create(params: {
    mode: EnhancementMode;
    analysis: ResumeAnalysis;
    suggestions: EnhancementSuggestion[];
    enhancedProfile: EnhancedProfile;
    jobId?: string;
    jobTitle?: string;
    companyName?: string;
    profileId?: string;
  }): Promise<ResumeEnhancement> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const now = new Date().toISOString();
    const row = {
      id: generateId(),
      user_id: user.id,
      profile_id: params.profileId || null,
      mode: params.mode as 'professional' | 'job-tailored',
      job_id: params.jobId || null,
      job_title: params.jobTitle || null,
      company_name: params.companyName || null,
      analysis: params.analysis as unknown as Json,
      suggestions: params.suggestions as unknown as Json,
      applied_suggestion_ids: [],
      enhanced_profile: params.enhancedProfile as unknown as Json,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await from('enhancements')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return rowToEnhancement(data);
  },

  /**
   * Update an existing enhancement
   */
  async update(id: string, updates: Partial<ResumeEnhancement>): Promise<ResumeEnhancement> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.mode !== undefined) updateData.mode = updates.mode;
    if (updates.jobId !== undefined) updateData.job_id = updates.jobId;
    if (updates.jobTitle !== undefined) updateData.job_title = updates.jobTitle;
    if (updates.companyName !== undefined) updateData.company_name = updates.companyName;
    if (updates.analysis !== undefined) updateData.analysis = updates.analysis as unknown as Json;
    if (updates.suggestions !== undefined) updateData.suggestions = updates.suggestions as unknown as Json;
    if (updates.appliedSuggestionIds !== undefined) updateData.applied_suggestion_ids = updates.appliedSuggestionIds;
    if (updates.enhancedProfile !== undefined) updateData.enhanced_profile = updates.enhancedProfile as unknown as Json;

    const { data, error } = await from('enhancements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return rowToEnhancement(data);
  },

  /**
   * Delete an enhancement
   */
  async delete(id: string): Promise<void> {
    const { error } = await from('enhancements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Apply a suggestion
   */
  async applySuggestion(enhancementId: string, suggestionId: string): Promise<void> {
    const enhancement = await this.get(enhancementId);
    if (!enhancement) throw new Error('Enhancement not found');

    if (!enhancement.appliedSuggestionIds.includes(suggestionId)) {
      await this.update(enhancementId, {
        appliedSuggestionIds: [...enhancement.appliedSuggestionIds, suggestionId],
      });
    }
  },

  /**
   * Batch upsert enhancements (for migration)
   */
  async upsertMany(enhancements: ResumeEnhancement[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const rows = enhancements.map((e) => ({
      id: e.id,
      user_id: user.id,
      profile_id: null,
      mode: e.mode as 'professional' | 'job-tailored',
      job_id: e.jobId || null,
      job_title: e.jobTitle || null,
      company_name: e.companyName || null,
      analysis: e.analysis as unknown as Json,
      suggestions: e.suggestions as unknown as Json,
      applied_suggestion_ids: e.appliedSuggestionIds || [],
      enhanced_profile: e.enhancedProfile as unknown as Json,
      created_at: e.createdAt,
      updated_at: e.updatedAt,
    }));

    const { error } = await from('enhancements')
      .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
  },

  /**
   * Subscribe to enhancement changes
   */
  subscribe(callback: (enhancements: ResumeEnhancement[]) => void) {
    const channel = supabase
      .channel('enhancements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enhancements',
        },
        async () => {
          const enhancements = await this.list();
          callback(enhancements);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

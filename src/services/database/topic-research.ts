/**
 * Topic Research Database Service
 * Handles all topic research-related database operations
 */
import { supabase, from } from '@/src/lib/supabase';
import type {
  TopicResearch,
  TopicResearchType,
  TopicResearchRow,
} from '@/src/types/topic-research';
import {
  topicResearchRowToResearch,
  topicResearchToRow,
} from '@/src/types/topic-research';

export const topicResearchService = {
  /**
   * Fetch all research for the current user
   */
  async list(): Promise<TopicResearch[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('topic_research')
      .select('*')
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => topicResearchRowToResearch(row as TopicResearchRow));
  },

  /**
   * Get research by ID
   */
  async get(id: string): Promise<TopicResearch | null> {
    const { data, error } = await from('topic_research')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return topicResearchRowToResearch(data as TopicResearchRow);
  },

  /**
   * Get research by type
   */
  async getByType(type: TopicResearchType): Promise<TopicResearch[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('topic_research')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', type)
      .order('searched_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => topicResearchRowToResearch(row as TopicResearchRow));
  },

  /**
   * Get research by application
   */
  async getByApplication(applicationId: string): Promise<TopicResearch[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('topic_research')
      .select('*')
      .eq('user_id', user.id)
      .eq('application_id', applicationId)
      .order('searched_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => topicResearchRowToResearch(row as TopicResearchRow));
  },

  /**
   * Get favorite research
   */
  async getFavorites(): Promise<TopicResearch[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('topic_research')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_favorite', true)
      .order('searched_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => topicResearchRowToResearch(row as TopicResearchRow));
  },

  /**
   * Get recent research
   */
  async getRecent(limit = 10): Promise<TopicResearch[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('topic_research')
      .select('*')
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((row) => topicResearchRowToResearch(row as TopicResearchRow));
  },

  /**
   * Create new research
   */
  async create(research: Omit<TopicResearch, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<TopicResearch> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const row = topicResearchToRow(research as Omit<TopicResearch, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, user.id);

    const { data, error } = await from('topic_research')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return topicResearchRowToResearch(data as TopicResearchRow);
  },

  /**
   * Update research
   */
  async update(id: string, updates: Partial<TopicResearch>): Promise<TopicResearch> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Build update object with snake_case keys
    const updateRow: Record<string, unknown> = {};
    if (updates.isFavorite !== undefined) updateRow.is_favorite = updates.isFavorite;
    if (updates.tags !== undefined) updateRow.tags = updates.tags;
    if (updates.applicationId !== undefined) updateRow.application_id = updates.applicationId;
    if (updates.data !== undefined) updateRow.data = updates.data;

    const { data, error } = await from('topic_research')
      .update(updateRow)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return topicResearchRowToResearch(data as TopicResearchRow);
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<TopicResearch> {
    const research = await this.get(id);
    if (!research) throw new Error('Research not found');

    return this.update(id, { isFavorite: !research.isFavorite });
  },

  /**
   * Delete research
   */
  async delete(id: string): Promise<void> {
    const { error } = await from('topic_research')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Search research by query text
   */
  async search(searchQuery: string): Promise<TopicResearch[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('topic_research')
      .select('*')
      .eq('user_id', user.id)
      .ilike('query', `%${searchQuery}%`)
      .order('searched_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => topicResearchRowToResearch(row as TopicResearchRow));
  },

  /**
   * Get stats
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<TopicResearchType, number>;
    favorites: number;
  }> {
    const researches = await this.list();
    const total = researches.length;
    const favorites = researches.filter((r) => r.isFavorite).length;

    const byType = researches.reduce(
      (acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      },
      { salary: 0, industry: 0, technical: 0, interview: 0 } as Record<TopicResearchType, number>
    );

    return { total, byType, favorites };
  },

  /**
   * Batch insert research (for migration)
   */
  async insertMany(researches: TopicResearch[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const rows = researches.map((r) =>
      topicResearchToRow(r as Omit<TopicResearch, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, user.id)
    );

    const { error } = await from('topic_research')
      .insert(rows);

    if (error) throw error;
  },

  /**
   * Subscribe to research changes
   */
  subscribe(callback: (researches: TopicResearch[]) => void) {
    const channel = supabase
      .channel('topic-research-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topic_research',
        },
        async () => {
          const researches = await this.list();
          callback(researches);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

/**
 * Stories Database Service
 * Handles all experience/story-related database operations
 */
import { supabase, from } from '@/src/lib/supabase';
import type { Experience } from '@/src/types';
import type { Json } from '@/src/lib/supabase/types';
import {
  storyRowToExperience,
  experienceToRow,
} from './types';

export const storiesService = {
  /**
   * Fetch all stories for the current user
   */
  async list(): Promise<Experience[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('stories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(storyRowToExperience);
  },

  /**
   * Get stories for a specific profile
   */
  async listByProfile(profileId: string): Promise<Experience[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('stories')
      .select('*')
      .eq('user_id', user.id)
      .or(`profile_id.eq.${profileId},profile_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(storyRowToExperience);
  },

  /**
   * Get a single story by ID
   */
  async get(id: string): Promise<Experience | null> {
    const { data, error } = await from('stories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return storyRowToExperience(data);
  },

  /**
   * Create a new story
   */
  async create(story: Omit<Experience, 'createdAt' | 'updatedAt'>): Promise<Experience> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const now = new Date().toISOString();
    const fullStory: Experience = {
      ...story,
      createdAt: now,
      updatedAt: now,
    };

    const row = experienceToRow(fullStory, user.id);

    const { data, error } = await from('stories')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return storyRowToExperience(data);
  },

  /**
   * Update an existing story
   */
  async update(id: string, updates: Partial<Experience>): Promise<Experience> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Build update object - always set updated_at
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.rawInput !== undefined) updateData.raw_input = updates.rawInput;
    if (updates.inputMethod !== undefined) updateData.input_method = updates.inputMethod;
    if (updates.star !== undefined) updateData.star = updates.star as unknown as Json;
    if (updates.metrics !== undefined) updateData.metrics = updates.metrics as unknown as Json;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.variations !== undefined) updateData.variations = updates.variations as unknown as Json;
    if (updates.followUpQuestions !== undefined) updateData.follow_up_questions = updates.followUpQuestions;
    if (updates.coachingNotes !== undefined) updateData.coaching_notes = updates.coachingNotes;
    if (updates.usedInInterviews !== undefined) updateData.used_in_interviews = updates.usedInInterviews;
    if (updates.timesUsed !== undefined) updateData.times_used = updates.timesUsed;
    if (updates.profileId !== undefined) updateData.profile_id = updates.profileId;
    if (updates.generatedAnswerMetadata !== undefined) updateData.generated_answer_metadata = updates.generatedAnswerMetadata as unknown as Json;

    const { data, error } = await from('stories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return storyRowToExperience(data);
  },

  /**
   * Delete a story
   */
  async delete(id: string): Promise<void> {
    const { error } = await from('stories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Increment usage count
   */
  async incrementUsage(id: string): Promise<void> {
    const story = await this.get(id);
    if (!story) throw new Error('Story not found');

    await this.update(id, { timesUsed: story.timesUsed + 1 });
  },

  /**
   * Record story used in interview
   */
  async recordUsedInInterview(id: string, interviewId: string): Promise<void> {
    const story = await this.get(id);
    if (!story) throw new Error('Story not found');

    await this.update(id, {
      usedInInterviews: [...(story.usedInInterviews || []), interviewId],
      timesUsed: story.timesUsed + 1,
    });
  },

  /**
   * Search stories by tags
   */
  async searchByTags(tags: string[]): Promise<Experience[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('stories')
      .select('*')
      .eq('user_id', user.id)
      .overlaps('tags', tags)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(storyRowToExperience);
  },

  /**
   * Full-text search stories
   */
  async search(query: string): Promise<Experience[]> {
    const allStories = await this.list();
    const lowerQuery = query.toLowerCase();

    return allStories.filter(
      (story) =>
        story.title.toLowerCase().includes(lowerQuery) ||
        story.star.situation.toLowerCase().includes(lowerQuery) ||
        story.star.action.toLowerCase().includes(lowerQuery) ||
        story.star.result.toLowerCase().includes(lowerQuery) ||
        story.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * Batch upsert stories (for migration)
   */
  async upsertMany(stories: Experience[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const rows = stories.map((s) => experienceToRow(s, user.id));

    const { error } = await from('stories')
      .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
  },

  /**
   * Subscribe to story changes
   */
  subscribe(callback: (stories: Experience[]) => void) {
    const channel = supabase
      .channel('stories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
        },
        async () => {
          const stories = await this.list();
          callback(stories);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

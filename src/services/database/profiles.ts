/**
 * Profiles Database Service
 * Handles all profile-related database operations
 */
import { supabase, from } from '@/src/lib/supabase';
import type { UserProfileWithMeta } from '@/src/types';
import {
  profileRowToUserProfileWithMeta,
  userProfileWithMetaToRow,
} from './types';

export const profilesService = {
  /**
   * Fetch all profiles for the current user
   */
  async list(): Promise<UserProfileWithMeta[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(profileRowToUserProfileWithMeta);
  },

  /**
   * Get a single profile by ID
   */
  async get(id: string): Promise<UserProfileWithMeta | null> {
    const { data, error } = await from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return profileRowToUserProfileWithMeta(data);
  },

  /**
   * Get the default profile for the current user
   */
  async getDefault(): Promise<UserProfileWithMeta | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return profileRowToUserProfileWithMeta(data);
  },

  /**
   * Create a new profile
   */
  async create(profile: UserProfileWithMeta): Promise<UserProfileWithMeta> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const row = userProfileWithMetaToRow(profile, user.id);

    const { data, error } = await from('profiles')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return profileRowToUserProfileWithMeta(data);
  },

  /**
   * Update an existing profile
   */
  async update(id: string, updates: Partial<UserProfileWithMeta>): Promise<UserProfileWithMeta> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current profile to merge updates
    const current = await this.get(id);
    if (!current) throw new Error('Profile not found');

    const merged = { ...current, ...updates };
    if (updates.metadata) {
      merged.metadata = { ...current.metadata, ...updates.metadata };
    }

    const row = userProfileWithMetaToRow(merged, user.id);

    const { data, error } = await from('profiles')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return profileRowToUserProfileWithMeta(data);
  },

  /**
   * Delete a profile
   */
  async delete(id: string): Promise<void> {
    const { error } = await from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Set a profile as default (will unset other defaults via trigger)
   */
  async setDefault(id: string): Promise<void> {
    const { error } = await from('profiles')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Batch upsert profiles (for migration)
   */
  async upsertMany(profiles: UserProfileWithMeta[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const rows = profiles.map((p) => userProfileWithMetaToRow(p, user.id));

    const { error } = await from('profiles')
      .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
  },

  /**
   * Subscribe to profile changes
   */
  subscribe(callback: (profiles: UserProfileWithMeta[]) => void) {
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        async () => {
          // Refetch all profiles on any change
          const profiles = await this.list();
          callback(profiles);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Delete all profiles for the current user (for cleanup)
   */
  async deleteAll(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await from('profiles')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Clean up duplicate profiles by keeping only the most recent unique ones
   * Identifies duplicates by matching display_name (user's name) and headline
   */
  async cleanupDuplicates(): Promise<{ deleted: number; kept: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get all profiles
    const profiles = await this.list();
    if (profiles.length <= 1) {
      return { deleted: 0, kept: profiles.length };
    }

    // Group profiles by display_name + headline (content-based deduplication)
    const groups = new Map<string, UserProfileWithMeta[]>();
    for (const profile of profiles) {
      const key = `${profile.name}::${profile.headline}`;
      const existing = groups.get(key) || [];
      existing.push(profile);
      groups.set(key, existing);
    }

    // Find duplicates to delete (keep the most recent one in each group)
    const toDelete: string[] = [];
    const toKeep: UserProfileWithMeta[] = [];

    for (const [_key, group] of groups) {
      // Sort by updatedAt descending, keep the newest
      group.sort((a, b) =>
        new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime()
      );

      toKeep.push(group[0]);
      for (let i = 1; i < group.length; i++) {
        toDelete.push(group[i].metadata.id);
      }
    }

    // Delete duplicates
    if (toDelete.length > 0) {
      const { error } = await from('profiles')
        .delete()
        .in('id', toDelete);

      if (error) throw error;
    }

    // Ensure at least one profile is marked as default
    const hasDefault = toKeep.some(p => p.metadata.isDefault);
    if (!hasDefault && toKeep.length > 0) {
      await this.setDefault(toKeep[0].metadata.id);
    }

    return { deleted: toDelete.length, kept: toKeep.length };
  },
};

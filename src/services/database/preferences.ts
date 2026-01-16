/**
 * Preferences Database Service
 * Handles CRUD operations for user preferences and message feedback
 * Used by the AI Assistant to learn and personalize responses
 */
import { supabase } from '@/src/lib/supabase';
import type {
  UserPreference,
  MessageFeedback,
  PreferenceCategory,
  PreferenceSource,
  PreferenceConfidence,
  FeedbackType,
} from '@/src/types';

// ============================================
// DATABASE ROW TYPES
// ============================================

interface UserPreferenceRow {
  id: string;
  user_id: string;
  category: string;
  key: string;
  value: unknown;
  source: string;
  confidence: string;
  description: string | null;
  applied_count: number;
  last_applied_at: string | null;
  is_active: boolean;
  examples: string[];
  created_at: string;
  updated_at: string;
}

interface MessageFeedbackRow {
  id: string;
  user_id: string;
  message_id: string;
  chat_id: string | null;
  rating: string;
  feedback_type: string | null;
  correction: string | null;
  context: MessageFeedback['context'];
  created_at: string;
}

// ============================================
// TYPE CONVERTERS
// ============================================

function rowToPreference(row: UserPreferenceRow): UserPreference {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category as PreferenceCategory,
    key: row.key,
    value: row.value as string | boolean | number,
    source: row.source as PreferenceSource,
    confidence: row.confidence as PreferenceConfidence,
    description: row.description || undefined,
    appliedCount: row.applied_count,
    lastAppliedAt: row.last_applied_at || undefined,
    isActive: row.is_active,
    examples: row.examples || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function preferenceToInsert(
  pref: Omit<UserPreference, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Omit<UserPreferenceRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    category: pref.category,
    key: pref.key,
    value: pref.value,
    source: pref.source,
    confidence: pref.confidence,
    description: pref.description || null,
    applied_count: pref.appliedCount || 0,
    last_applied_at: pref.lastAppliedAt || null,
    is_active: pref.isActive ?? true,
    examples: pref.examples || [],
  };
}

function rowToFeedback(row: MessageFeedbackRow): MessageFeedback {
  return {
    id: row.id,
    userId: row.user_id,
    messageId: row.message_id,
    chatId: row.chat_id || '',
    rating: row.rating as 'positive' | 'negative',
    feedbackType: row.feedback_type as FeedbackType | undefined,
    correction: row.correction || undefined,
    context: row.context,
    createdAt: row.created_at,
  };
}

function feedbackToInsert(
  feedback: Omit<MessageFeedback, 'id' | 'createdAt'>,
  userId: string
): Omit<MessageFeedbackRow, 'id' | 'created_at'> {
  return {
    user_id: userId,
    message_id: feedback.messageId,
    chat_id: feedback.chatId || null,
    rating: feedback.rating,
    feedback_type: feedback.feedbackType || null,
    correction: feedback.correction || null,
    context: feedback.context,
  };
}

// ============================================
// PREFERENCES SERVICE
// ============================================

export const preferencesService = {
  /**
   * Get all preferences for the current user
   */
  async list(): Promise<UserPreference[]> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => rowToPreference(row as UserPreferenceRow));
  },

  /**
   * Get active preferences for the current user
   */
  async getActive(): Promise<UserPreference[]> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('is_active', true)
      .order('confidence', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => rowToPreference(row as UserPreferenceRow));
  },

  /**
   * Get preferences by category
   */
  async getByCategory(category: PreferenceCategory): Promise<UserPreference[]> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('confidence', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => rowToPreference(row as UserPreferenceRow));
  },

  /**
   * Get preferences for multiple categories (e.g., general + context-specific)
   */
  async getForContext(contextType: PreferenceCategory): Promise<UserPreference[]> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .in('category', ['general', 'communication', contextType])
      .eq('is_active', true)
      .order('confidence', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => rowToPreference(row as UserPreferenceRow));
  },

  /**
   * Get a single preference by ID
   */
  async get(id: string): Promise<UserPreference | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data ? rowToPreference(data as UserPreferenceRow) : null;
  },

  /**
   * Get a preference by category and key
   */
  async getByKey(category: PreferenceCategory, key: string): Promise<UserPreference | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category)
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data ? rowToPreference(data as UserPreferenceRow) : null;
  },

  /**
   * Create a new preference
   */
  async create(
    pref: Omit<UserPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<UserPreference> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const insertData = preferenceToInsert({ ...pref, userId: user.id }, user.id);

    const { data, error } = await supabase
      .from('user_preferences')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return rowToPreference(data as UserPreferenceRow);
  },

  /**
   * Create or update a preference (upsert by category + key)
   */
  async upsert(
    pref: Omit<UserPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<UserPreference> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const insertData = preferenceToInsert({ ...pref, userId: user.id }, user.id);

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(insertData, {
        onConflict: 'user_id,category,key',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw error;
    return rowToPreference(data as UserPreferenceRow);
  },

  /**
   * Update an existing preference
   */
  async update(
    id: string,
    updates: Partial<UserPreference>
  ): Promise<UserPreference> {
    const updateData: Record<string, unknown> = {};

    if (updates.value !== undefined) updateData.value = updates.value;
    if (updates.confidence !== undefined) updateData.confidence = updates.confidence;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.appliedCount !== undefined) updateData.applied_count = updates.appliedCount;
    if (updates.lastAppliedAt !== undefined) updateData.last_applied_at = updates.lastAppliedAt;
    if (updates.examples !== undefined) updateData.examples = updates.examples;

    const { data, error } = await supabase
      .from('user_preferences')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return rowToPreference(data as UserPreferenceRow);
  },

  /**
   * Record that a preference was applied
   */
  async recordUsage(id: string): Promise<UserPreference> {
    const pref = await this.get(id);
    if (!pref) throw new Error('Preference not found');

    return this.update(id, {
      appliedCount: pref.appliedCount + 1,
      lastAppliedAt: new Date().toISOString(),
    });
  },

  /**
   * Increase confidence level of a preference
   */
  async reinforceConfidence(id: string): Promise<UserPreference> {
    const pref = await this.get(id);
    if (!pref) throw new Error('Preference not found');

    const confidenceLevels: PreferenceConfidence[] = ['low', 'medium', 'high', 'confirmed'];
    const currentIndex = confidenceLevels.indexOf(pref.confidence);

    if (currentIndex < confidenceLevels.length - 1) {
      return this.update(id, {
        confidence: confidenceLevels[currentIndex + 1],
      });
    }

    return pref;
  },

  /**
   * Toggle active state
   */
  async toggleActive(id: string): Promise<UserPreference> {
    const pref = await this.get(id);
    if (!pref) throw new Error('Preference not found');

    return this.update(id, { isActive: !pref.isActive });
  },

  /**
   * Delete a preference
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('user_preferences')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Delete all preferences for a category
   */
  async deleteByCategory(category: PreferenceCategory): Promise<void> {
    const { error } = await supabase
      .from('user_preferences')
      .delete()
      .eq('category', category);

    if (error) throw error;
  },

  /**
   * Reset all preferences (delete all for current user)
   */
  async resetAll(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Get preference statistics
   */
  async getStats(): Promise<{
    totalPreferences: number;
    activePreferences: number;
    byCategory: Record<PreferenceCategory, number>;
    byConfidence: Record<PreferenceConfidence, number>;
  }> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*');

    if (error) throw error;

    const preferences = (data || []).map((row) => rowToPreference(row as UserPreferenceRow));

    const byCategory = preferences.reduce(
      (acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      },
      {} as Record<PreferenceCategory, number>
    );

    const byConfidence = preferences.reduce(
      (acc, p) => {
        acc[p.confidence] = (acc[p.confidence] || 0) + 1;
        return acc;
      },
      {} as Record<PreferenceConfidence, number>
    );

    return {
      totalPreferences: preferences.length,
      activePreferences: preferences.filter((p) => p.isActive).length,
      byCategory,
      byConfidence,
    };
  },
};

// ============================================
// MESSAGE FEEDBACK SERVICE
// ============================================

export const messageFeedbackService = {
  /**
   * Get all feedback for the current user
   */
  async list(): Promise<MessageFeedback[]> {
    const { data, error } = await supabase
      .from('message_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => rowToFeedback(row as MessageFeedbackRow));
  },

  /**
   * Get feedback for a specific chat
   */
  async getByChat(chatId: string): Promise<MessageFeedback[]> {
    const { data, error } = await supabase
      .from('message_feedback')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => rowToFeedback(row as MessageFeedbackRow));
  },

  /**
   * Get recent feedback
   */
  async getRecent(limit = 50): Promise<MessageFeedback[]> {
    const { data, error } = await supabase
      .from('message_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((row) => rowToFeedback(row as MessageFeedbackRow));
  },

  /**
   * Get feedback by type
   */
  async getByType(feedbackType: FeedbackType): Promise<MessageFeedback[]> {
    const { data, error } = await supabase
      .from('message_feedback')
      .select('*')
      .eq('feedback_type', feedbackType)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => rowToFeedback(row as MessageFeedbackRow));
  },

  /**
   * Submit new feedback
   */
  async submit(
    feedback: Omit<MessageFeedback, 'id' | 'userId' | 'createdAt'>
  ): Promise<MessageFeedback> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const insertData = feedbackToInsert({ ...feedback, userId: user.id }, user.id);

    const { data, error } = await supabase
      .from('message_feedback')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return rowToFeedback(data as MessageFeedbackRow);
  },

  /**
   * Get feedback statistics
   */
  async getStats(): Promise<{
    totalFeedback: number;
    positiveCount: number;
    negativeCount: number;
    positiveRate: number;
    byType: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from('message_feedback')
      .select('*');

    if (error) throw error;

    const feedback = (data || []).map((row) => rowToFeedback(row as MessageFeedbackRow));
    const positiveCount = feedback.filter((f) => f.rating === 'positive').length;
    const negativeCount = feedback.filter((f) => f.rating === 'negative').length;

    const byType = feedback.reduce(
      (acc, f) => {
        if (f.feedbackType) {
          acc[f.feedbackType] = (acc[f.feedbackType] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalFeedback: feedback.length,
      positiveCount,
      negativeCount,
      positiveRate: feedback.length > 0 ? (positiveCount / feedback.length) * 100 : 0,
      byType,
    };
  },
};

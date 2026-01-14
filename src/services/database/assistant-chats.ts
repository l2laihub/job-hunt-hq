/**
 * Assistant Chats Database Service
 * Handles CRUD operations for AI Assistant (Prep) chat history
 */
import { supabase } from '@/src/lib/supabase';
import type {
  AssistantChat,
  AssistantMessage,
  AssistantContextType,
  ChatContextSummary,
} from '@/src/types';

// Database row type (will be auto-generated after migration is applied)
interface AssistantChatRow {
  id: string;
  user_id: string;
  application_id: string | null;
  profile_id: string | null;
  title: string;
  context_type: string;
  context_summary: ChatContextSummary;
  messages: AssistantMessage[];
  message_count: number;
  last_message_at: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

// Type converters
function rowToChat(row: AssistantChatRow): AssistantChat {
  return {
    id: row.id,
    userId: row.user_id,
    applicationId: row.application_id || undefined,
    profileId: row.profile_id || undefined,
    title: row.title,
    contextType: row.context_type as AssistantContextType,
    contextSummary: row.context_summary,
    messages: row.messages,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at || undefined,
    isPinned: row.is_pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function chatToInsert(
  chat: Omit<AssistantChat, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  userId: string
): Omit<AssistantChatRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    application_id: chat.applicationId || null,
    // Note: profile_id is intentionally set to null to avoid FK constraint issues
    // Profile info is captured in context_summary instead
    profile_id: null,
    title: chat.title,
    context_type: chat.contextType,
    context_summary: chat.contextSummary,
    messages: chat.messages,
    message_count: chat.messageCount,
    last_message_at: chat.lastMessageAt || null,
    is_pinned: chat.isPinned,
  };
}

export const assistantChatsService = {
  /**
   * List all assistant chats for the current user
   */
  async list(): Promise<AssistantChat[]> {
    const { data, error } = await supabase
      .from('assistant_chats')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return (data || []).map(row => rowToChat(row as AssistantChatRow));
  },

  /**
   * Get a single chat by ID
   */
  async get(id: string): Promise<AssistantChat | null> {
    const { data, error } = await supabase
      .from('assistant_chats')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data ? rowToChat(data as AssistantChatRow) : null;
  },

  /**
   * Create a new chat
   */
  async create(
    chat: Omit<AssistantChat, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<AssistantChat> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const insertData = chatToInsert(chat, user.id);

    const { data, error } = await supabase
      .from('assistant_chats')
      .insert(insertData)
      .select()
      .single();

    // If there's a foreign key constraint error, retry without the FK fields
    if (error?.code === '23503') {
      console.warn('FK constraint error, retrying without application_id:', error.details);
      const fallbackData = {
        ...insertData,
        application_id: null,
      };

      const { data: retryData, error: retryError } = await supabase
        .from('assistant_chats')
        .insert(fallbackData)
        .select()
        .single();

      if (retryError) throw retryError;
      return rowToChat(retryData as AssistantChatRow);
    }

    if (error) throw error;
    return rowToChat(data as AssistantChatRow);
  },

  /**
   * Update an existing chat
   */
  async update(
    id: string,
    updates: Partial<AssistantChat>
  ): Promise<AssistantChat> {
    const updateData: Record<string, unknown> = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.messages !== undefined) {
      updateData.messages = updates.messages;
      updateData.message_count = updates.messages.length;
      updateData.last_message_at = updates.messages.length > 0
        ? updates.messages[updates.messages.length - 1].timestamp
        : null;
    }
    if (updates.isPinned !== undefined) updateData.is_pinned = updates.isPinned;
    if (updates.contextSummary !== undefined) updateData.context_summary = updates.contextSummary;

    const { data, error } = await supabase
      .from('assistant_chats')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return rowToChat(data as AssistantChatRow);
  },

  /**
   * Add a message to a chat
   */
  async addMessage(chatId: string, message: AssistantMessage): Promise<AssistantChat> {
    // First get the current chat
    const chat = await this.get(chatId);
    if (!chat) throw new Error('Chat not found');

    // Append the new message
    const updatedMessages = [...chat.messages, message];

    return this.update(chatId, { messages: updatedMessages });
  },

  /**
   * Delete a chat
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('assistant_chats')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get chats for a specific application
   */
  async getByApplication(applicationId: string): Promise<AssistantChat[]> {
    const { data, error } = await supabase
      .from('assistant_chats')
      .select('*')
      .eq('application_id', applicationId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return (data || []).map(row => rowToChat(row as AssistantChatRow));
  },

  /**
   * Get recent chats
   */
  async getRecent(limit = 10): Promise<AssistantChat[]> {
    const { data, error } = await supabase
      .from('assistant_chats')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(row => rowToChat(row as AssistantChatRow));
  },

  /**
   * Get pinned chats
   */
  async getPinned(): Promise<AssistantChat[]> {
    const { data, error } = await supabase
      .from('assistant_chats')
      .select('*')
      .eq('is_pinned', true)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return (data || []).map(row => rowToChat(row as AssistantChatRow));
  },

  /**
   * Toggle pin status
   */
  async togglePin(id: string): Promise<AssistantChat> {
    const chat = await this.get(id);
    if (!chat) throw new Error('Chat not found');

    return this.update(id, { isPinned: !chat.isPinned });
  },

  /**
   * Get chat statistics
   */
  async getStats(): Promise<{
    totalChats: number;
    totalMessages: number;
    avgMessagesPerChat: number;
  }> {
    const { data, error } = await supabase
      .from('assistant_chats')
      .select('message_count');

    if (error) throw error;

    const chats = data || [];
    const totalChats = chats.length;

    if (totalChats === 0) {
      return {
        totalChats: 0,
        totalMessages: 0,
        avgMessagesPerChat: 0,
      };
    }

    const totalMessages = chats.reduce((sum, c) => sum + (c.message_count || 0), 0);

    return {
      totalChats,
      totalMessages,
      avgMessagesPerChat: Math.round(totalMessages / totalChats),
    };
  },

  /**
   * Subscribe to changes
   */
  subscribe(callback: (chats: AssistantChat[]) => void): () => void {
    const channel = supabase
      .channel('assistant_chats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assistant_chats',
        },
        async () => {
          // Refetch all chats on any change
          const chats = await this.list();
          callback(chats);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

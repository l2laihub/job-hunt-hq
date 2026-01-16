/**
 * AI Assistant Store
 *
 * Manages the state for the Prep AI assistant, including:
 * - UI state (sidebar open/closed, minimized)
 * - Current chat session and messages
 * - Context detection and loading
 * - Chat history persistence
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AssistantChat,
  AssistantMessage,
  AssistantContext,
} from '@/src/types/assistant';
import { createAssistantMessage, createAssistantChat, ASSISTANT_NAME } from '@/src/types/assistant';
import { assistantChatsService } from '@/src/services/database';
import {
  generateAssistantResponse,
  generateAssistantResponseWithResearch,
  classifyResearchIntent,
  shouldPerformResearch,
  researchTopic,
  mightContainPreferences,
} from '@/src/services/gemini';
import { supabase } from '@/src/lib/supabase';
import { useTopicResearchStore } from './topic-research';
import { usePreferencesStore } from './preferences';
import { processMessageForLearning } from '@/src/services/preference-learning';

// ============================================
// STATE TYPES
// ============================================

interface AssistantState {
  // UI state
  isOpen: boolean;
  isMinimized: boolean;
  showContextPanel: boolean;

  // Current chat
  currentChatId: string | null;
  currentChat: AssistantChat | null;

  // Chat history
  recentChats: AssistantChat[];

  // Processing state
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;

  // Context
  currentContext: AssistantContext | null;

  // Error state
  error: string | null;

  // Actions
  toggleSidebar: () => void;
  open: () => void;
  close: () => void;
  minimize: () => void;
  maximize: () => void;
  toggleContextPanel: () => void;

  setContext: (context: AssistantContext | null) => void;

  // Chat actions
  startNewChat: (context?: AssistantContext) => Promise<void>;
  loadChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string, profile: Parameters<typeof generateAssistantResponse>[0]['profile'], context?: AssistantContext | null) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  pinChat: (chatId: string) => Promise<void>;

  // History
  loadRecentChats: () => Promise<void>;

  // Reset
  reset: () => void;
  clearError: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState = {
  isOpen: false,
  isMinimized: false,
  showContextPanel: true,
  currentChatId: null,
  currentChat: null,
  recentChats: [],
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  currentContext: null,
  error: null,
};

// ============================================
// STORE
// ============================================

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ============================================
      // UI ACTIONS
      // ============================================

      toggleSidebar: () => {
        const { isOpen, isMinimized } = get();
        if (isMinimized) {
          set({ isMinimized: false });
        } else {
          set({ isOpen: !isOpen });
        }
      },

      open: () => {
        set({ isOpen: true, isMinimized: false });
      },

      close: () => {
        set({ isOpen: false });
      },

      minimize: () => {
        set({ isMinimized: true });
      },

      maximize: () => {
        set({ isMinimized: false });
      },

      toggleContextPanel: () => {
        set((state) => ({ showContextPanel: !state.showContextPanel }));
      },

      // ============================================
      // CONTEXT ACTIONS
      // ============================================

      setContext: (context) => {
        set({ currentContext: context });
      },

      // ============================================
      // CHAT ACTIONS
      // ============================================

      startNewChat: async (context) => {
        const contextToUse = context || get().currentContext;

        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Create in database
          try {
            const chatData = createAssistantChat(contextToUse || undefined);
            const created = await assistantChatsService.create(chatData);
            set({
              currentChatId: created.id,
              currentChat: created,
              error: null,
            });

            // Refresh recent chats
            get().loadRecentChats();
          } catch (error) {
            console.error('Failed to create chat:', error);
            set({ error: 'Failed to create chat. Please try again.' });
          }
        } else {
          // Create local-only chat
          const localChat: AssistantChat = {
            id: crypto.randomUUID(),
            ...createAssistantChat(contextToUse || undefined),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set({
            currentChatId: localChat.id,
            currentChat: localChat,
            error: null,
          });
        }
      },

      loadChat: async (chatId) => {
        set({ isLoading: true, error: null });

        try {
          const chat = await assistantChatsService.get(chatId);
          if (chat) {
            set({
              currentChatId: chat.id,
              currentChat: chat,
              isLoading: false,
            });
          } else {
            set({
              error: 'Chat not found',
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Failed to load chat:', error);
          set({
            error: 'Failed to load chat. Please try again.',
            isLoading: false,
          });
        }
      },

      sendMessage: async (content, profile, contextOverride) => {
        const { currentChat, currentContext } = get();
        // Use the passed context if provided, otherwise fall back to store context
        const contextToUse = contextOverride !== undefined ? contextOverride : currentContext;

        // Ensure we have a chat
        if (!currentChat) {
          await get().startNewChat();
        }

        const chat = get().currentChat;
        if (!chat) {
          set({ error: 'Failed to create chat session' });
          return;
        }

        // Create user message
        const userMessage = createAssistantMessage('user', content);

        // Optimistically add user message
        const updatedMessages = [...chat.messages, userMessage];
        set({
          currentChat: {
            ...chat,
            messages: updatedMessages,
            messageCount: updatedMessages.length,
          },
          isLoading: true,
          error: null,
        });

        try {
          // Step 0: Get user preferences for personalization
          const preferencesStore = usePreferencesStore.getState();
          const preferences = preferencesStore.getPreferencesForContext(
            contextToUse?.type || 'general'
          );

          // Step 0.5: Check for preference statements in user message (async, non-blocking)
          if (mightContainPreferences(content)) {
            processMessageForLearning(content, contextToUse?.type || 'general').catch((err) => {
              console.warn('Failed to process message for learning:', err);
            });
          }

          // Step 1: Classify if message needs research
          const classification = await classifyResearchIntent(content, contextToUse);
          const needsResearch = shouldPerformResearch(classification, 70);

          let responseContent: string;
          let metadata: { generationTimeMs: number; contextUsed: Record<string, unknown> };
          let researchUsed: { id: string; type: string; savedToBank: boolean } | undefined;

          if (needsResearch && classification.researchType) {
            // Step 2: Perform grounded research
            try {
              const research = await researchTopic(
                classification.researchType,
                classification.extractedQuery,
                {
                  company: contextToUse?.application?.company || contextToUse?.companyResearch?.companyName,
                  role: contextToUse?.application?.role,
                  profile: profile && 'metadata' in profile ? profile : undefined,
                  applicationId: contextToUse?.applicationId,
                  analyzedJobId: contextToUse?.analyzedJob?.id,
                }
              );

              // Step 3: Save to research bank (localStorage)
              const topicResearchStore = useTopicResearchStore.getState();
              const savedResearch = topicResearchStore.addResearch(research);

              researchUsed = {
                id: savedResearch.id,
                type: research.type,
                savedToBank: true,
              };

              // Step 4: Generate response with research context and preferences
              const result = await generateAssistantResponseWithResearch({
                message: content,
                context: contextToUse,
                conversationHistory: chat.messages,
                profile,
                preferences,
                research: {
                  type: research.type,
                  data: research.data,
                  sources: research.sources,
                },
              });

              responseContent = result.content;
              metadata = result.metadata;
            } catch (researchError) {
              // Research failed, fall back to regular response
              console.warn('Research failed, falling back to regular response:', researchError);
              const result = await generateAssistantResponse({
                message: content,
                context: contextToUse,
                conversationHistory: chat.messages,
                profile,
                preferences,
              });
              responseContent = result.content;
              metadata = result.metadata;
            }
          } else {
            // Regular conversation flow (no research needed)
            const result = await generateAssistantResponse({
              message: content,
              context: contextToUse,
              conversationHistory: chat.messages,
              profile,
              preferences,
            });
            responseContent = result.content;
            metadata = result.metadata;
          }

          // Create assistant message with research metadata if applicable
          const assistantMessage = createAssistantMessage('assistant', responseContent, {
            generationTimeMs: metadata.generationTimeMs,
            contextUsed: metadata.contextUsed,
            ...(researchUsed && { researchUsed }),
          });

          // Update local state
          const finalMessages = [...updatedMessages, assistantMessage];
          const updatedChat: AssistantChat = {
            ...chat,
            messages: finalMessages,
            messageCount: finalMessages.length,
            lastMessageAt: assistantMessage.timestamp,
            updatedAt: new Date().toISOString(),
          };

          set({
            currentChat: updatedChat,
            isLoading: false,
          });

          // Persist to database if authenticated
          const { data: { user } } = await supabase.auth.getUser();
          if (user && chat.id) {
            try {
              await assistantChatsService.update(chat.id, {
                messages: finalMessages,
              });
            } catch (error) {
              console.error('Failed to save messages:', error);
              // Don't show error to user, messages are saved locally
            }
          }
        } catch (error) {
          console.error('Failed to generate response:', error);

          // Create error message
          const errorMessage = createAssistantMessage(
            'assistant',
            'I apologize, but I encountered an error generating a response. Please try again.',
            { isError: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' }
          );

          const finalMessages = [...updatedMessages, errorMessage];
          set({
            currentChat: {
              ...chat,
              messages: finalMessages,
              messageCount: finalMessages.length,
            },
            isLoading: false,
            error: 'Failed to generate response. Please try again.',
          });
        }
      },

      deleteChat: async (chatId) => {
        try {
          await assistantChatsService.delete(chatId);

          // If deleting current chat, clear it
          if (get().currentChatId === chatId) {
            set({
              currentChatId: null,
              currentChat: null,
            });
          }

          // Refresh recent chats
          get().loadRecentChats();
        } catch (error) {
          console.error('Failed to delete chat:', error);
          set({ error: 'Failed to delete chat. Please try again.' });
        }
      },

      pinChat: async (chatId) => {
        try {
          const updated = await assistantChatsService.togglePin(chatId);

          // Update current chat if it's the one being pinned
          if (get().currentChatId === chatId) {
            set({ currentChat: updated });
          }

          // Refresh recent chats
          get().loadRecentChats();
        } catch (error) {
          console.error('Failed to pin chat:', error);
          set({ error: 'Failed to pin chat. Please try again.' });
        }
      },

      // ============================================
      // HISTORY ACTIONS
      // ============================================

      loadRecentChats: async () => {
        try {
          const chats = await assistantChatsService.getRecent(20);
          set({ recentChats: chats });
        } catch (error) {
          console.error('Failed to load recent chats:', error);
          // Don't set error state for background refresh
        }
      },

      // ============================================
      // UTILITY ACTIONS
      // ============================================

      reset: () => {
        set(initialState);
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'assistant-store',
      // Only persist UI preferences, not chat data
      partialize: (state) => ({
        isOpen: state.isOpen,
        showContextPanel: state.showContextPanel,
      }),
    }
  )
);

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Check if assistant is available (has messages)
 */
export function useAssistantHasMessages(): boolean {
  return useAssistantStore((state) => (state.currentChat?.messages.length ?? 0) > 0);
}

/**
 * Get assistant name
 */
export function useAssistantName(): string {
  return ASSISTANT_NAME;
}

/**
 * AI Assistant (Prep) - Main Sidebar Component
 *
 * A collapsible sidebar that provides context-aware AI assistance
 * for job search, interview prep, and career guidance.
 */
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/src/lib/utils';
import { useAssistantStore } from '@/src/stores';
import { useAssistantContext, useProfileData } from '@/src/hooks';
import { ASSISTANT_NAME } from '@/src/types/assistant';
import { AssistantHeader } from './AssistantHeader';
import { ContextPanel } from './ContextPanel';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { QuickActions } from './QuickActions';
import { AssistantTrigger } from './AssistantTrigger';
import { ChatHistory } from './ChatHistory';
import { ResearchBank } from './ResearchBank';

export const AIAssistant: React.FC = () => {
  const {
    isOpen,
    isMinimized,
    showContextPanel,
    currentChat,
    currentChatId,
    recentChats,
    isLoading,
    error,
    sendMessage,
    setContext,
    startNewChat,
    loadChat,
    deleteChat,
    pinChat,
    loadRecentChats,
  } = useAssistantStore();

  const [showHistory, setShowHistory] = useState(false);
  const [showResearchBank, setShowResearchBank] = useState(false);
  const context = useAssistantContext();
  const { activeProfile: profile } = useProfileData();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastContextRef = useRef<string>('');

  // Sync context when it changes - use stable comparison to prevent infinite loops
  useEffect(() => {
    // Create a stable key from context values that matter
    const contextKey = JSON.stringify({
      type: context.type,
      route: context.route,
      applicationId: context.applicationId,
      analyzedJobId: context.analyzedJob?.id,
      profileId: context.profile?.metadata?.id,
    });

    // Only update if context actually changed
    if (contextKey !== lastContextRef.current) {
      lastContextRef.current = contextKey;
      setContext(context);
    }
  }, [context, setContext]);

  // Load recent chats on mount
  useEffect(() => {
    loadRecentChats();
  }, [loadRecentChats]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChat?.messages.length]);

  // Handle sending a message - pass context directly to ensure freshness
  const handleSendMessage = async (content: string) => {
    await sendMessage(content, profile, context);
  };

  // Handle starting a new chat
  const handleNewChat = async () => {
    await startNewChat(context);
    setShowHistory(false);
    setShowResearchBank(false);
  };

  // Handle quick action click
  const handleQuickAction = async (prompt: string) => {
    if (!currentChat) {
      await startNewChat(context);
    }
    await handleSendMessage(prompt);
  };

  // Handle selecting a chat from history
  const handleSelectChat = async (chatId: string) => {
    await loadChat(chatId);
    setShowHistory(false);
  };

  // Handle pin toggle
  const handlePinChat = async (chatId: string) => {
    await pinChat(chatId);
  };

  // If closed, show only the trigger button
  if (!isOpen) {
    return <AssistantTrigger />;
  }

  // If minimized, show a smaller bar
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <AssistantTrigger minimized />
      </div>
    );
  }

  return (
    <aside
      className={cn(
        'fixed right-0 top-0 bottom-0 z-40',
        'w-[400px] max-w-[90vw]',
        'bg-gray-900/95 backdrop-blur-lg',
        'border-l border-gray-800',
        'flex flex-col',
        'shadow-2xl shadow-black/50',
        'animate-slide-in-right'
      )}
    >
      {/* Header */}
      <AssistantHeader
        onNewChat={handleNewChat}
        onShowHistory={() => {
          setShowHistory(true);
          setShowResearchBank(false);
        }}
        onShowResearchBank={() => {
          setShowResearchBank(true);
          setShowHistory(false);
        }}
        hasMessages={(currentChat?.messages.length ?? 0) > 0}
      />

      {/* Context Panel (collapsible) */}
      {showContextPanel && context && (
        <ContextPanel context={context} />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Message List or Empty State */}
        {currentChat?.messages.length ? (
          <MessageList
            messages={currentChat.messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Hi! I'm {ASSISTANT_NAME}
            </h3>
            <p className="text-sm text-gray-400 max-w-[280px] mb-6">
              Your AI career coach. Ask me anything about job search, interview prep, or career guidance.
            </p>

            {/* Quick Actions */}
            <QuickActions
              context={context}
              onSelect={handleQuickAction}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Chat History (overlay) */}
        {showHistory && (
          <ChatHistory
            chats={recentChats}
            currentChatId={currentChatId}
            onSelect={handleSelectChat}
            onDelete={deleteChat}
            onPin={handlePinChat}
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* Research Bank (overlay) */}
        {showResearchBank && (
          <ResearchBank
            onClose={() => setShowResearchBank(false)}
          />
        )}
      </div>

      {/* Input Area */}
      <InputArea
        onSend={handleSendMessage}
        isLoading={isLoading}
        placeholder={currentChat?.messages.length ? 'Type a message...' : 'Ask me anything...'}
      />
    </aside>
  );
};

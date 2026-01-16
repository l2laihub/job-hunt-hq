/**
 * Message List
 *
 * Displays the conversation between user and assistant.
 */
import React from 'react';
import { cn } from '@/src/lib/utils';
import { MessageBubble } from './MessageBubble';
import type { AssistantMessage } from '@/src/types/assistant';
import type { FeedbackType, PreferenceCategory } from '@/src/types/preferences';

interface MessageListProps {
  messages: AssistantMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  chatId?: string;
  contextType?: PreferenceCategory;
  onFeedback?: (
    messageId: string,
    rating: 'positive' | 'negative',
    feedbackType?: FeedbackType
  ) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  messagesEndRef,
  chatId,
  contextType,
  onFeedback,
}) => {
  // Get the previous user message for context when providing feedback
  const getUserQueryForMessage = (index: number): string | undefined => {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return undefined;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          chatId={chatId}
          contextType={contextType}
          userQuery={getUserQueryForMessage(index)}
          onFeedback={onFeedback}
        />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
            <span className="text-xs">✨</span>
          </div>
          <div className="flex-1 p-4 rounded-2xl bg-gray-800/50 border border-gray-700">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-gray-400">Thinking...</span>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

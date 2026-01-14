/**
 * Chat History
 *
 * Displays list of previous chat sessions.
 */
import React from 'react';
import { MessageSquare, Pin, Trash2, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { AssistantChat } from '@/src/types/assistant';

interface ChatHistoryProps {
  chats: AssistantChat[];
  currentChatId: string | null;
  onSelect: (chatId: string) => void;
  onDelete: (chatId: string) => void;
  onPin: (chatId: string, pinned: boolean) => void;
  onClose: () => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  chats,
  currentChatId,
  onSelect,
  onDelete,
  onPin,
  onClose,
}) => {
  // Separate pinned and recent chats
  const pinnedChats = chats.filter((chat) => chat.isPinned);
  const recentChats = chats.filter((chat) => !chat.isPinned);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="absolute inset-0 bg-gray-900 z-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="font-medium text-gray-100">Chat History</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No chat history yet</p>
            <p className="text-sm mt-1">Start a conversation to see it here</p>
          </div>
        ) : (
          <>
            {/* Pinned section */}
            {pinnedChats.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-xs text-gray-500 uppercase tracking-wide">
                  Pinned
                </div>
                {pinnedChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChatId}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onPin={onPin}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}

            {/* Recent section */}
            {recentChats.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-xs text-gray-500 uppercase tracking-wide">
                  Recent
                </div>
                {recentChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChatId}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onPin={onPin}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface ChatItemProps {
  chat: AssistantChat;
  isActive: boolean;
  onSelect: (chatId: string) => void;
  onDelete: (chatId: string) => void;
  onPin: (chatId: string, pinned: boolean) => void;
  formatDate: (dateStr: string) => string;
}

const ChatItem: React.FC<ChatItemProps> = ({
  chat,
  isActive,
  onSelect,
  onDelete,
  onPin,
  formatDate,
}) => {
  const [showActions, setShowActions] = React.useState(false);

  return (
    <div
      className={cn(
        'group relative rounded-lg p-3 cursor-pointer',
        'hover:bg-gray-800',
        isActive && 'bg-gray-800 border border-gray-700'
      )}
      onClick={() => onSelect(chat.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {chat.isPinned && <Pin className="w-3 h-3 text-blue-400 shrink-0" />}
            <span className="text-sm font-medium text-gray-200 truncate">
              {chat.title}
            </span>
          </div>

          {chat.contextSummary.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {chat.contextSummary.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span>{chat.messageCount} messages</span>
            <span>·</span>
            <span>{formatDate(chat.updatedAt)}</span>
          </div>
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin(chat.id, !chat.isPinned);
              }}
              className={cn(
                'p-1 rounded hover:bg-gray-700 transition-colors',
                chat.isPinned ? 'text-blue-400' : 'text-gray-400'
              )}
              title={chat.isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(chat.id);
              }}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

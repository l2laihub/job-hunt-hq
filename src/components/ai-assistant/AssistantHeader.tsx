/**
 * Assistant Header
 *
 * Header bar for the AI assistant sidebar with context display and controls.
 */
import React from 'react';
import {
  X,
  Minus,
  Plus,
  History,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Library,
  Settings,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAssistantStore } from '@/src/stores';
import { ASSISTANT_NAME } from '@/src/types/assistant';

interface AssistantHeaderProps {
  onNewChat: () => void;
  onShowHistory: () => void;
  onShowResearchBank: () => void;
  onShowSettings: () => void;
  hasMessages: boolean;
}

export const AssistantHeader: React.FC<AssistantHeaderProps> = ({
  onNewChat,
  onShowHistory,
  onShowResearchBank,
  onShowSettings,
  hasMessages,
}) => {
  const {
    close,
    minimize,
    showContextPanel,
    toggleContextPanel,
    currentContext,
  } = useAssistantStore();

  return (
    <header className="shrink-0 border-b border-gray-800">
      {/* Main header row */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo and name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              {ASSISTANT_NAME}
            </h2>
            <p className="text-xs text-gray-500">
              AI Career Coach
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* New chat */}
          {hasMessages && (
            <button
              onClick={onNewChat}
              className={cn(
                'p-2 rounded-lg',
                'text-gray-400 hover:text-white hover:bg-gray-800',
                'transition-colors'
              )}
              title="New chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          {/* History */}
          <button
            onClick={onShowHistory}
            className={cn(
              'p-2 rounded-lg',
              'text-gray-400 hover:text-white hover:bg-gray-800',
              'transition-colors'
            )}
            title="Chat history"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Research Bank */}
          <button
            onClick={onShowResearchBank}
            className={cn(
              'p-2 rounded-lg',
              'text-gray-400 hover:text-white hover:bg-gray-800',
              'transition-colors'
            )}
            title="Research bank"
          >
            <Library className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={onShowSettings}
            className={cn(
              'p-2 rounded-lg',
              'text-gray-400 hover:text-white hover:bg-gray-800',
              'transition-colors'
            )}
            title="Preferences"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Minimize */}
          <button
            onClick={minimize}
            className={cn(
              'p-2 rounded-lg',
              'text-gray-400 hover:text-white hover:bg-gray-800',
              'transition-colors'
            )}
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={close}
            className={cn(
              'p-2 rounded-lg',
              'text-gray-400 hover:text-white hover:bg-gray-800',
              'transition-colors'
            )}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context toggle bar */}
      {currentContext && (
        <button
          onClick={toggleContextPanel}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2',
            'bg-gray-800/50 hover:bg-gray-800',
            'transition-colors',
            'text-left'
          )}
        >
          <span className="text-xs text-gray-400 truncate pr-2">
            {currentContext.summary}
          </span>
          {showContextPanel ? (
            <ChevronUp className="w-3 h-3 text-gray-500 shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
          )}
        </button>
      )}
    </header>
  );
};

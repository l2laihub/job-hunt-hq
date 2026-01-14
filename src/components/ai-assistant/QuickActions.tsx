/**
 * Quick Actions
 *
 * Displays suggested prompts based on current context.
 */
import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { AssistantContext } from '@/src/types/assistant';
import { CONTEXT_SUGGESTIONS } from '@/src/types/assistant';

interface QuickActionsProps {
  context: AssistantContext | null;
  onSelect: (prompt: string) => void;
  isLoading: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  context,
  onSelect,
  isLoading,
}) => {
  // Get suggestions based on context type
  const suggestions = context
    ? context.suggestions.length > 0
      ? context.suggestions
      : CONTEXT_SUGGESTIONS[context.type]
    : CONTEXT_SUGGESTIONS.general;

  return (
    <div className="p-4 border-b border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span className="text-xs text-gray-400">Quick actions</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {suggestions.slice(0, 4).map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(suggestion)}
            disabled={isLoading}
            className={cn(
              'text-left px-3 py-2 rounded-lg',
              'text-sm text-gray-300',
              'bg-gray-800/50 hover:bg-gray-700/50',
              'border border-gray-700/50 hover:border-gray-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all'
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

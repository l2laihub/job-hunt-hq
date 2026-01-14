/**
 * Assistant Trigger Button
 *
 * Floating button that opens the AI assistant sidebar.
 */
import React from 'react';
import { MessageCircle, ChevronUp } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAssistantStore } from '@/src/stores';
import { ASSISTANT_NAME } from '@/src/types/assistant';

interface AssistantTriggerProps {
  minimized?: boolean;
}

export const AssistantTrigger: React.FC<AssistantTriggerProps> = ({ minimized = false }) => {
  const { open, maximize, isMinimized } = useAssistantStore();

  const handleClick = () => {
    if (isMinimized) {
      maximize();
    } else {
      open();
    }
  };

  if (minimized) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 px-4 py-2',
          'bg-gradient-to-r from-blue-600 to-purple-600',
          'rounded-full shadow-lg shadow-blue-500/25',
          'text-white text-sm font-medium',
          'hover:shadow-xl hover:shadow-blue-500/30',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900'
        )}
      >
        <MessageCircle className="w-4 h-4" />
        <span>{ASSISTANT_NAME}</span>
        <ChevronUp className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-14 h-14 rounded-full',
        'bg-gradient-to-r from-blue-600 to-purple-600',
        'shadow-lg shadow-blue-500/25',
        'flex items-center justify-center',
        'hover:scale-110 hover:shadow-xl hover:shadow-blue-500/30',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900',
        'group'
      )}
      title={`Open ${ASSISTANT_NAME} assistant`}
    >
      <MessageCircle className="w-6 h-6 text-white" />

      {/* Tooltip */}
      <div className={cn(
        'absolute right-full mr-3 px-3 py-1.5',
        'bg-gray-800 rounded-lg border border-gray-700',
        'text-sm text-white whitespace-nowrap',
        'opacity-0 group-hover:opacity-100',
        'pointer-events-none',
        'transition-opacity duration-200'
      )}>
        Ask {ASSISTANT_NAME}
      </div>

      {/* Pulse animation */}
      <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping pointer-events-none" />
    </button>
  );
};

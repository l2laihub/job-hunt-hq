/**
 * Message Bubble
 *
 * Renders an individual chat message with markdown support and feedback buttons.
 */
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThumbsUp, ThumbsDown, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { AssistantMessage } from '@/src/types/assistant';
import type { FeedbackType, PreferenceCategory } from '@/src/types/preferences';
import { ASSISTANT_NAME } from '@/src/types/assistant';

interface MessageBubbleProps {
  message: AssistantMessage;
  chatId?: string;
  userQuery?: string;
  contextType?: PreferenceCategory;
  onFeedback?: (
    messageId: string,
    rating: 'positive' | 'negative',
    feedbackType?: FeedbackType
  ) => void;
  feedbackGiven?: 'positive' | 'negative' | null;
}

// Feedback type options for negative feedback
const FEEDBACK_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'too_long', label: 'Too long' },
  { value: 'too_short', label: 'Too short' },
  { value: 'not_helpful', label: 'Not helpful' },
  { value: 'wrong_tone', label: 'Wrong tone' },
  { value: 'too_generic', label: 'Too generic' },
  { value: 'too_technical', label: 'Too technical' },
  { value: 'not_technical_enough', label: 'Not technical enough' },
  { value: 'off_topic', label: 'Off topic' },
];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onFeedback,
  feedbackGiven,
}) => {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const [showFeedbackOptions, setShowFeedbackOptions] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<'positive' | 'negative' | null>(null);

  // Use prop feedback if available, otherwise use local state
  const currentFeedback = feedbackGiven ?? localFeedback;

  const handleFeedback = (rating: 'positive' | 'negative', feedbackType?: FeedbackType) => {
    setLocalFeedback(rating);
    setShowFeedbackOptions(false);
    onFeedback?.(message.id, rating, feedbackType);
  };

  const handleThumbsDown = () => {
    if (currentFeedback === 'negative') return; // Already negative
    setShowFeedbackOptions(true);
  };

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isUser
            ? 'bg-gray-700'
            : 'bg-gradient-to-br from-blue-500 to-purple-500'
        )}
      >
        {isUser ? (
          <span className="text-xs text-gray-300">You</span>
        ) : (
          <span className="text-xs">✨</span>
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          'flex-1 max-w-[85%] p-4 rounded-2xl',
          isUser
            ? 'bg-blue-600 text-white'
            : isError
            ? 'bg-red-900/30 border border-red-700/50'
            : 'bg-gray-800/50 border border-gray-700'
        )}
      >
        {/* Sender label */}
        <div
          className={cn(
            'text-xs mb-1 font-medium',
            isUser ? 'text-blue-200' : 'text-gray-400'
          )}
        >
          {isUser ? 'You' : ASSISTANT_NAME}
        </div>

        {/* Message text with full markdown rendering */}
        <div className="prose prose-invert prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom styling for markdown elements
              h1: ({ children }) => (
                <h1 className="text-xl font-bold mt-4 mb-2 text-white">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold mt-4 mb-2 text-white">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold mt-3 mb-1 text-white">{children}</h3>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-white">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-gray-200">{children}</em>
              ),
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-gray-700 text-blue-300 text-xs font-mono">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={cn('block p-3 rounded-lg bg-gray-800 text-sm font-mono overflow-x-auto', className)} {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="my-3 p-3 rounded-lg bg-gray-800 overflow-x-auto">
                  {children}
                </pre>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1 my-2 text-gray-200">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1 my-2 text-gray-200">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-gray-200">{children}</li>
              ),
              p: ({ children }) => (
                <p className="my-2 text-gray-200 leading-relaxed">{children}</p>
              ),
              a: ({ href, children }) => (
                <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              hr: () => (
                <hr className="my-4 border-gray-700" />
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 my-3 italic text-gray-300">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-3">
                  <table className="min-w-full border-collapse border border-gray-700">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-gray-700 px-3 py-2 bg-gray-800 text-left font-semibold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-700 px-3 py-2">{children}</td>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Error message */}
        {isError && message.errorMessage && (
          <div className="mt-2 text-xs text-red-400">
            {message.errorMessage}
          </div>
        )}

        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Suggested follow-ups:</div>
            <div className="flex flex-wrap gap-2">
              {message.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  className="text-xs px-2 py-1 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action items */}
        {message.actionItems && message.actionItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Action items:</div>
            <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
              {message.actionItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Generation time and feedback */}
        <div className="mt-2 flex items-center justify-between">
          {message.generationTimeMs && (
            <div className="text-xs text-gray-500">
              Generated in {(message.generationTimeMs / 1000).toFixed(1)}s
            </div>
          )}

          {/* Feedback buttons - only for assistant messages */}
          {!isUser && !isError && onFeedback && (
            <div className="flex items-center gap-1">
              {/* Thumbs up */}
              <button
                onClick={() => handleFeedback('positive')}
                disabled={currentFeedback !== null}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  currentFeedback === 'positive'
                    ? 'text-green-400 bg-green-500/20'
                    : currentFeedback === null
                    ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 cursor-not-allowed'
                )}
                title="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              {/* Thumbs down */}
              <div className="relative">
                <button
                  onClick={handleThumbsDown}
                  disabled={currentFeedback !== null}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    currentFeedback === 'negative'
                      ? 'text-red-400 bg-red-500/20'
                      : currentFeedback === null
                      ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 cursor-not-allowed'
                  )}
                  title="Not helpful"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>

                {/* Feedback type dropdown */}
                {showFeedbackOptions && (
                  <div className="absolute right-0 bottom-full mb-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-10">
                    <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-700">
                      What was wrong?
                    </div>
                    {FEEDBACK_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleFeedback('negative', option.value)}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                    <button
                      onClick={() => handleFeedback('negative')}
                      className="w-full px-3 py-1.5 text-left text-sm text-gray-400 hover:bg-gray-700 transition-colors border-t border-gray-700"
                    >
                      Skip feedback type
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

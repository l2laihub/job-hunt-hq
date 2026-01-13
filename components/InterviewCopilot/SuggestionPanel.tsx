/**
 * Suggestion Panel Component
 * Displays AI-generated answer suggestions for interview questions
 */

import React, { useState } from 'react';
import { CopilotSuggestion, Experience } from '../../types';
import {
  Lightbulb,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  BookOpen,
  AlertTriangle,
  HelpCircle,
  Loader2,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface SuggestionPanelProps {
  suggestion: CopilotSuggestion | null;
  isProcessing: boolean;
  stories: Experience[];
}

export const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
  suggestion,
  isProcessing,
  stories,
}) => {
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [showStar, setShowStar] = useState(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Processing state
  if (isProcessing && !suggestion) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-purple-900/30 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-yellow-400 animate-pulse" />
        </div>
        <p className="text-gray-400 mt-4">Analyzing question...</p>
        <p className="text-gray-500 text-sm mt-1">Generating personalized response</p>
      </div>
    );
  }

  // No suggestion yet
  if (!suggestion) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
          <Lightbulb className="w-10 h-10 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-400">Ready to Help</h3>
        <p className="text-gray-500 text-sm mt-2 max-w-md">
          When the interviewer asks a question, suggestions will appear here instantly.
          Keep this window visible during your interview.
        </p>
      </div>
    );
  }

  // Get full story details for matched stories
  const getStoryDetails = (storyId: string): Experience | undefined => {
    return stories.find(s => s.id === storyId);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Question Header */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-5 border border-purple-800/30">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg shrink-0">
            <MessageSquare className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">
                {suggestion.questionType.replace('-', ' ')}
              </span>
              <span className="text-xs text-gray-500">
                {suggestion.generationTimeMs}ms
              </span>
            </div>
            <p className="text-white font-medium leading-relaxed">
              "{suggestion.questionText}"
            </p>
          </div>
        </div>
      </div>

      {/* Key Talking Points */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            Key Points to Mention
          </h3>
          <button
            type="button"
            onClick={() => handleCopy(suggestion.keyPoints.join('\n'), 'keypoints')}
            className="p-1.5 text-gray-500 hover:text-gray-300 rounded"
            title="Copy key points"
            aria-label="Copy key points"
          >
            {copiedText === 'keypoints' ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="grid gap-2">
          {suggestion.keyPoints.map((point, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-yellow-700/50 transition-colors"
            >
              <span className="w-6 h-6 bg-yellow-900/30 text-yellow-400 rounded-full flex items-center justify-center shrink-0 text-sm font-medium">
                {i + 1}
              </span>
              <p className="text-gray-200 text-sm leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      </div>

      {/* STAR Response (if available) */}
      {suggestion.starResponse && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowStar(!showStar)}
            className="flex items-center justify-between w-full"
          >
            <h3 className="font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              STAR Response
            </h3>
            {showStar ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {showStar && (
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 divide-y divide-gray-700/50">
              {[
                { label: 'Situation', content: suggestion.starResponse.situation, color: 'blue' },
                { label: 'Task', content: suggestion.starResponse.task, color: 'purple' },
                { label: 'Action', content: suggestion.starResponse.action, color: 'green' },
                { label: 'Result', content: suggestion.starResponse.result, color: 'yellow' },
              ].map((item) => (
                <div key={item.label} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      item.color === 'blue' && 'text-blue-400',
                      item.color === 'purple' && 'text-purple-400',
                      item.color === 'green' && 'text-green-400',
                      item.color === 'yellow' && 'text-yellow-400',
                    )}>
                      {item.label}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Matched Stories */}
      {suggestion.matchedStories.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-green-400" />
            Relevant Stories ({suggestion.matchedStories.length})
          </h3>
          <div className="space-y-2">
            {suggestion.matchedStories.map((match) => {
              const story = getStoryDetails(match.storyId);
              const isExpanded = expandedStory === match.storyId;

              return (
                <div
                  key={match.storyId}
                  className="bg-gray-800/30 rounded-lg border border-gray-700/50"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedStory(isExpanded ? null : match.storyId)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center shrink-0">
                        <span className="text-green-400 font-bold text-sm">
                          {match.relevance}%
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{match.storyTitle}</p>
                        {match.openingLine && (
                          <p className="text-gray-400 text-xs truncate mt-0.5">
                            "{match.openingLine}"
                          </p>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {/* Key points from this story */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Key Points to Mention
                        </p>
                        <ul className="space-y-1.5">
                          {match.keyPoints.map((point, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-gray-300"
                            >
                              <span className="text-green-500 mt-1">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Full story details if available */}
                      {story && (
                        <div className="pt-3 border-t border-gray-700/50">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                            Full Story
                          </p>
                          <div className="text-sm text-gray-400 space-y-2">
                            <p><strong className="text-gray-300">S:</strong> {story.star.situation}</p>
                            <p><strong className="text-gray-300">T:</strong> {story.star.task}</p>
                            <p><strong className="text-gray-300">A:</strong> {story.star.action}</p>
                            <p><strong className="text-gray-300">R:</strong> {story.star.result}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Anticipated Follow-ups */}
      {suggestion.anticipatedFollowUps && suggestion.anticipatedFollowUps.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            Likely Follow-up Questions
          </h3>
          <div className="bg-blue-900/10 border border-blue-800/30 rounded-lg p-4">
            <ul className="space-y-2">
              {suggestion.anticipatedFollowUps.map((followUp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-blue-400 shrink-0">→</span>
                  {followUp}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Warnings */}
      {suggestion.warnings && suggestion.warnings.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Things to Avoid
          </h3>
          <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-4">
            <ul className="space-y-2">
              {suggestion.warnings.map((warning, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-300">
                  <span className="text-red-400 shrink-0">!</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionPanel;

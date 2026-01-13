/**
 * Question History Component
 * Shows list of detected questions during the interview session
 */

import React from 'react';
import { DetectedQuestion, CopilotSuggestion, CopilotQuestionType } from '../../types';
import { Check, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface QuestionHistoryProps {
  questions: DetectedQuestion[];
  suggestions: CopilotSuggestion[];
  selectedQuestionId?: string | null;
  onSelectQuestion: (questionId: string) => void;
}

// Question type colors
const questionTypeColors: Record<CopilotQuestionType, string> = {
  'behavioral': 'bg-purple-900/30 text-purple-400 border-purple-800/50',
  'technical': 'bg-blue-900/30 text-blue-400 border-blue-800/50',
  'situational': 'bg-green-900/30 text-green-400 border-green-800/50',
  'experience': 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
  'motivation': 'bg-pink-900/30 text-pink-400 border-pink-800/50',
  'culture-fit': 'bg-cyan-900/30 text-cyan-400 border-cyan-800/50',
  'clarifying': 'bg-gray-800/30 text-gray-400 border-gray-700/50',
  'follow-up': 'bg-orange-900/30 text-orange-400 border-orange-800/50',
  'general': 'bg-gray-800/30 text-gray-400 border-gray-700/50',
};

export const QuestionHistory: React.FC<QuestionHistoryProps> = ({
  questions,
  suggestions,
  selectedQuestionId,
  onSelectQuestion,
}) => {
  // Format time ago
  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  // Check if question has a suggestion
  const hasSuggestion = (questionId: string): boolean => {
    return suggestions.some(s => s.questionId === questionId);
  };

  // Get suggestion for question
  const getSuggestion = (questionId: string): CopilotSuggestion | undefined => {
    return suggestions.find(s => s.questionId === questionId);
  };

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center mb-3">
          <Clock className="w-6 h-6 text-gray-600" />
        </div>
        <p className="text-gray-500 text-sm">No questions detected yet</p>
        <p className="text-gray-600 text-xs mt-1">
          Questions will appear here as they're asked
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2 space-y-2">
        {questions.slice().reverse().map((question) => {
          const suggestion = getSuggestion(question.id);
          const hasResponse = hasSuggestion(question.id);
          const isSelected = selectedQuestionId === question.id;

          return (
            <button
              type="button"
              key={question.id}
              onClick={() => onSelectQuestion(question.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all",
                "hover:bg-gray-800/50",
                isSelected
                  ? 'border-purple-500 bg-purple-900/20 ring-1 ring-purple-500/50'
                  : hasResponse ? 'border-gray-700/50' : 'border-gray-800/30'
              )}
            >
              {/* Type Badge */}
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-medium",
                  questionTypeColors[question.type]
                )}>
                  {question.type.replace('-', ' ')}
                </span>
                <span className="text-[10px] text-gray-500">
                  {formatTimeAgo(question.detectedAt)}
                </span>
              </div>

              {/* Question Text */}
              <p className="text-sm text-gray-200 line-clamp-2 mb-2">
                {question.text}
              </p>

              {/* Status */}
              <div className="flex items-center gap-2">
                {hasResponse ? (
                  <div className="flex items-center gap-1 text-green-400">
                    <Check className="w-3 h-3" />
                    <span className="text-[10px]">
                      {suggestion?.matchedStories.length || 0} stories matched
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px]">Processing...</span>
                  </div>
                )}

                {suggestion && (
                  <span className="text-[10px] text-gray-500 ml-auto">
                    {suggestion.generationTimeMs}ms
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionHistory;

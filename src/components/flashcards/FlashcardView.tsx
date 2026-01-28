/**
 * FlashcardView Component
 * Displays a flashcard with question on front and answer on back
 * Includes flip animation and keyboard navigation
 */
import React, { useState, useCallback, useEffect } from 'react';
import { cn, parseMarkdown } from '@/src/lib/utils';
import { Button } from '@/src/components/ui';
import type { TechnicalAnswer } from '@/src/types';
import { getMasteryLevel, formatInterval, getDaysUntilReview } from '@/src/services/srs';
import { MASTERY_LEVEL_CONFIG, QUESTION_TYPE_COLORS } from './constants';
import { Eye, EyeOff, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

// Question type colors
const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'behavioral-technical': { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-700/50' },
  conceptual: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-700/50' },
  'system-design': { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-700/50' },
  'problem-solving': { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-700/50' },
  experience: { bg: 'bg-pink-900/30', text: 'text-pink-400', border: 'border-pink-700/50' },
};

interface FlashcardViewProps {
  answer: TechnicalAnswer;
  isFlipped: boolean;
  onFlip: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  showProgress?: boolean;
  currentIndex?: number;
  totalCards?: number;
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({
  answer,
  isFlipped,
  onFlip,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  showProgress = false,
  currentIndex = 0,
  totalCards = 0,
}) => {
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onFlip();
      } else if (e.key === 'ArrowLeft' && hasPrevious) {
        onPrevious?.();
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNext?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFlip, onPrevious, onNext, hasPrevious, hasNext]);

  const masteryLevel = getMasteryLevel(answer.srsData);
  const masteryConfig = MASTERY_LEVEL_CONFIG[masteryLevel];
  const typeColors = TYPE_COLORS[answer.questionType] || TYPE_COLORS.conceptual;
  const daysUntil = getDaysUntilReview(answer.srsData);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Progress indicator */}
      {showProgress && totalCards > 0 && (
        <div className="mb-4 flex items-center justify-between text-sm text-gray-400">
          <span>Card {currentIndex + 1} of {totalCards}</span>
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-0.5 rounded text-xs', masteryConfig.bgColor, masteryConfig.color)}>
              {masteryConfig.label}
            </span>
            {answer.srsData && (
              <span className="text-xs text-gray-500">
                {daysUntil <= 0 ? 'Due now' : `Due in ${formatInterval(daysUntil)}`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Flashcard container with 3D flip effect */}
      <div
        className="relative w-full perspective-1000"
        style={{ perspective: '1000px', minHeight: '400px' }}
      >
        <div
          className={cn(
            'relative w-full h-full transition-transform duration-500 transform-style-preserve-3d cursor-pointer',
            isFlipped && 'rotate-y-180'
          )}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
          }}
          onClick={onFlip}
        >
          {/* Front - Question */}
          <div
            className="absolute w-full backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 min-h-[400px] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <span
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-bold uppercase border',
                    typeColors.bg,
                    typeColors.text,
                    typeColors.border
                  )}
                >
                  {answer.questionType.replace('-', ' ')}
                </span>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <EyeOff className="w-4 h-4" />
                  <span>Click to reveal answer</span>
                </div>
              </div>

              {/* Question */}
              <div className="flex-1 flex items-center justify-center">
                <h2 className="text-xl md:text-2xl font-semibold text-white text-center leading-relaxed">
                  {answer.question}
                </h2>
              </div>

              {/* Footer */}
              <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
                {answer.metadata.targetCompany && (
                  <span className="text-blue-400">{answer.metadata.targetCompany}</span>
                )}
                <span>Press Space or click to flip</span>
              </div>
            </div>
          </div>

          {/* Back - Answer */}
          <div
            className="absolute w-full backface-hidden rotate-y-180"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 min-h-[400px] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-gray-500 uppercase">Answer</span>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Eye className="w-4 h-4" />
                  <span>Rate your recall below</span>
                </div>
              </div>

              {/* Answer content */}
              <div className="flex-1 overflow-y-auto">
                {/* Structured sections if available */}
                {answer.answer.structured && answer.answer.structured.length > 0 ? (
                  <div className="space-y-4">
                    {answer.answer.structured.map((section, i) => (
                      <div key={i} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                        <span className="text-xs font-bold text-blue-400 uppercase block mb-2">
                          {section.label}
                        </span>
                        <div
                          className="text-gray-300 text-sm leading-relaxed prose-invert"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(section.content) }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Narrative fallback */
                  <div
                    className="text-gray-300 leading-relaxed prose-invert"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(answer.answer.narrative) }}
                  />
                )}

                {/* Key points */}
                {answer.answer.bulletPoints && answer.answer.bulletPoints.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <span className="text-xs font-bold text-gray-500 uppercase block mb-2">Key Points</span>
                    <ul className="space-y-1">
                      {answer.answer.bulletPoints.slice(0, 3).map((point, i) => (
                        <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                          <span className="text-green-400">-</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
                <span>Practiced {answer.practiceCount}x</span>
                <span>Click to flip back</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={!hasPrevious}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFlip}
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          Flip Card
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={!hasNext}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

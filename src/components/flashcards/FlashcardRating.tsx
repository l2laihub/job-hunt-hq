/**
 * FlashcardRating Component
 * Rating buttons for self-assessment after reviewing a flashcard
 * Uses SM-2 algorithm ratings (0-5)
 */
import React, { useEffect } from 'react';
import { cn } from '@/src/lib/utils';
import type { SRSRating } from '@/src/types';
import { RATING_CONFIG } from './constants';

interface FlashcardRatingProps {
  onRate: (rating: SRSRating) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const FlashcardRating: React.FC<FlashcardRatingProps> = ({
  onRate,
  disabled = false,
  compact = false,
}) => {
  // Keyboard shortcuts (1-6 for ratings 0-5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      const key = e.key;
      if (key >= '1' && key <= '6') {
        e.preventDefault();
        onRate((parseInt(key) - 1) as SRSRating);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRate, disabled]);

  const ratings: SRSRating[] = [0, 1, 2, 3, 4, 5];

  if (compact) {
    return (
      <div className="flex gap-2 justify-center">
        {ratings.map((rating) => {
          const config = RATING_CONFIG[rating];
          return (
            <button
              key={rating}
              onClick={() => onRate(rating)}
              disabled={disabled}
              className={cn(
                'w-10 h-10 rounded-lg border-2 font-bold text-lg transition-all',
                config.bgColor,
                config.borderColor,
                config.hoverBg,
                config.color,
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title={`${config.label}: ${config.description}`}
            >
              {rating}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-center text-sm text-gray-400 font-medium">
        How well did you remember the answer?
      </h3>

      {/* Rating buttons grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {ratings.map((rating) => {
          const config = RATING_CONFIG[rating];
          return (
            <button
              key={rating}
              onClick={() => onRate(rating)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center p-3 rounded-xl border-2 transition-all',
                config.bgColor,
                config.borderColor,
                config.hoverBg,
                'hover:scale-105 active:scale-95',
                disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
              )}
            >
              <span className="text-2xl mb-1">{config.emoji}</span>
              <span className={cn('text-sm font-bold', config.color)}>
                {config.label}
              </span>
              <span className="text-xs text-gray-500 mt-0.5">
                ({rating})
              </span>
            </button>
          );
        })}
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-gray-500">
        Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">1-6</kbd> for quick rating
      </p>
    </div>
  );
};

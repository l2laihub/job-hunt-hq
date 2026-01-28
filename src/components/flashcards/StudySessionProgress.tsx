/**
 * StudySessionProgress Component
 * Progress bar and stats displayed during an active study session
 */
import React from 'react';
import { cn } from '@/src/lib/utils';
import type { StudySession, SRSRating } from '@/src/types';
import { RATING_CONFIG } from './constants';
import { Clock, Target, TrendingUp } from 'lucide-react';

interface StudySessionProgressProps {
  session: StudySession;
  elapsedTime?: number; // in seconds
  className?: string;
}

export const StudySessionProgress: React.FC<StudySessionProgressProps> = ({
  session,
  elapsedTime = 0,
  className,
}) => {
  const progress = session.totalCards > 0
    ? (session.cardsReviewed / session.totalCards) * 100
    : 0;

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate rating distribution
  const totalRatings = Object.values(session.ratings).reduce((a, b) => a + b, 0);
  const goodRatings = (session.ratings[3] || 0) + (session.ratings[4] || 0) + (session.ratings[5] || 0);
  const successRate = totalRatings > 0 ? Math.round((goodRatings / totalRatings) * 100) : 0;

  return (
    <div className={cn('bg-gray-900/50 rounded-xl border border-gray-800 p-4', className)}>
      {/* Main progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">
            {session.cardsReviewed} of {session.totalCards} cards
          </span>
          <span className="text-sm font-mono text-white">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <div>
            <span className="text-sm font-mono text-white">{formatTime(elapsedTime)}</span>
            <span className="text-xs text-gray-500 block">Time</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-500" />
          <div>
            <span className="text-sm font-mono text-white">{session.cardsRemaining}</span>
            <span className="text-xs text-gray-500 block">Remaining</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          <div>
            <span className={cn(
              'text-sm font-mono',
              successRate >= 70 ? 'text-green-400' : successRate >= 40 ? 'text-yellow-400' : 'text-red-400'
            )}>
              {successRate}%
            </span>
            <span className="text-xs text-gray-500 block">Success</span>
          </div>
        </div>
      </div>

      {/* Rating distribution mini chart */}
      {totalRatings > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-1 h-6">
            {([0, 1, 2, 3, 4, 5] as SRSRating[]).map((rating) => {
              const count = session.ratings[rating] || 0;
              const width = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
              const config = RATING_CONFIG[rating];

              if (width === 0) return null;

              return (
                <div
                  key={rating}
                  className={cn('h-full rounded transition-all', config.bgColor)}
                  style={{ width: `${width}%` }}
                  title={`${config.label}: ${count} cards`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>Failed</span>
            <span>Perfect</span>
          </div>
        </div>
      )}
    </div>
  );
};

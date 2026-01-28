/**
 * StudySessionComplete Component
 * Summary screen shown after completing a study session
 */
import React from 'react';
import { cn } from '@/src/lib/utils';
import { Button, Card } from '@/src/components/ui';
import type { StudySession, SRSRating } from '@/src/types';
import { RATING_CONFIG } from './constants';
import { Trophy, Clock, Target, TrendingUp, RotateCcw, Home, Flame } from 'lucide-react';

interface StudySessionCompleteProps {
  session: StudySession;
  currentStreak?: number;
  onPracticeAgain: () => void;
  onGoHome: () => void;
}

export const StudySessionComplete: React.FC<StudySessionCompleteProps> = ({
  session,
  currentStreak = 0,
  onPracticeAgain,
  onGoHome,
}) => {
  // Calculate stats
  const totalRatings = Object.values(session.ratings).reduce((a, b) => a + b, 0);
  const goodRatings = (session.ratings[3] || 0) + (session.ratings[4] || 0) + (session.ratings[5] || 0);
  const successRate = totalRatings > 0 ? Math.round((goodRatings / totalRatings) * 100) : 0;

  // Calculate session duration
  const startTime = new Date(session.startedAt).getTime();
  const endTime = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  const durationMinutes = Math.round((endTime - startTime) / 60000);

  // Determine performance message
  let performanceMessage = '';
  let performanceColor = '';
  let performanceEmoji = '';

  if (successRate >= 90) {
    performanceMessage = 'Outstanding! You crushed it!';
    performanceColor = 'text-green-400';
    performanceEmoji = '🎉';
  } else if (successRate >= 70) {
    performanceMessage = 'Great job! Keep it up!';
    performanceColor = 'text-green-400';
    performanceEmoji = '👍';
  } else if (successRate >= 50) {
    performanceMessage = 'Good effort! Room for improvement.';
    performanceColor = 'text-yellow-400';
    performanceEmoji = '💪';
  } else {
    performanceMessage = 'Keep practicing! You\'ll get there.';
    performanceColor = 'text-orange-400';
    performanceEmoji = '📚';
  }

  return (
    <Card className="max-w-lg mx-auto p-8 text-center bg-gray-900 border-gray-700">
      {/* Trophy icon */}
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-900/30 flex items-center justify-center">
        <Trophy className="w-10 h-10 text-yellow-400" />
      </div>

      {/* Completion message */}
      <h2 className="text-2xl font-bold text-white mb-2">Session Complete!</h2>
      <p className={cn('text-lg mb-6', performanceColor)}>
        {performanceEmoji} {performanceMessage}
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800/50 rounded-xl p-4">
          <Target className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <span className="text-2xl font-mono text-white block">{session.cardsReviewed}</span>
          <span className="text-xs text-gray-500">Cards Reviewed</span>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4">
          <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <span className={cn('text-2xl font-mono block', successRate >= 70 ? 'text-green-400' : 'text-yellow-400')}>
            {successRate}%
          </span>
          <span className="text-xs text-gray-500">Success Rate</span>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4">
          <Clock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <span className="text-2xl font-mono text-white block">{durationMinutes}</span>
          <span className="text-xs text-gray-500">Minutes</span>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4">
          <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
          <span className="text-2xl font-mono text-orange-400 block">{currentStreak}</span>
          <span className="text-xs text-gray-500">Day Streak</span>
        </div>
      </div>

      {/* Rating breakdown */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Rating Breakdown</h3>
        <div className="flex justify-center gap-2">
          {([0, 1, 2, 3, 4, 5] as SRSRating[]).map((rating) => {
            const count = session.ratings[rating] || 0;
            const config = RATING_CONFIG[rating];

            return (
              <div
                key={rating}
                className={cn(
                  'px-3 py-2 rounded-lg border',
                  config.bgColor,
                  config.borderColor,
                  count === 0 && 'opacity-40'
                )}
              >
                <span className={cn('text-lg font-bold', config.color)}>{count}</span>
                <span className="text-xs text-gray-500 block">{config.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Average rating */}
      <div className="mb-8">
        <span className="text-sm text-gray-400">Average Rating</span>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-3xl font-mono text-white">
            {session.averageRating.toFixed(1)}
          </span>
          <span className="text-gray-500">/ 5.0</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={onGoHome}
          leftIcon={<Home className="w-4 h-4" />}
          className="flex-1"
        >
          Back to Home
        </Button>
        <Button
          variant="primary"
          onClick={onPracticeAgain}
          leftIcon={<RotateCcw className="w-4 h-4" />}
          className="flex-1 bg-blue-600 hover:bg-blue-500"
        >
          Practice Again
        </Button>
      </div>
    </Card>
  );
};

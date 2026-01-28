/**
 * DailyReviewWidget Component
 * Dashboard widget showing daily review status and quick access to practice
 */
import React from 'react';
import { cn } from '@/src/lib/utils';
import { Button, Card } from '@/src/components/ui';
import type { TechnicalAnswer, StudyProgress } from '@/src/types';
import { calculateStudyStats, calculateReadinessScore } from '@/src/services/srs';
import { Brain, Flame, Target, Play, ChevronRight } from 'lucide-react';

interface DailyReviewWidgetProps {
  answers: TechnicalAnswer[];
  progress?: StudyProgress;
  onStartPractice: () => void;
  className?: string;
}

export const DailyReviewWidget: React.FC<DailyReviewWidgetProps> = ({
  answers,
  progress,
  onStartPractice,
  className,
}) => {
  const stats = calculateStudyStats(answers);
  const readinessScore = calculateReadinessScore(answers);

  // Determine readiness color
  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  // Determine readiness status
  const getReadinessStatus = (score: number) => {
    if (score >= 80) return 'Ready';
    if (score >= 60) return 'Almost Ready';
    if (score >= 40) return 'Needs Work';
    return 'Not Ready';
  };

  return (
    <Card className={cn('p-5 bg-gray-900/50 border-gray-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Practice Cards</h3>
            <p className="text-xs text-gray-400">
              {stats.dueToday} due today
            </p>
          </div>
        </div>
        {progress && progress.currentStreak > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-900/30 rounded-lg">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-bold text-orange-400">{progress.currentStreak}</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center">
          <span className="text-lg font-mono text-gray-400">{stats.new}</span>
          <span className="text-xs text-gray-500 block">New</span>
        </div>
        <div className="text-center">
          <span className="text-lg font-mono text-blue-400">{stats.learning}</span>
          <span className="text-xs text-gray-500 block">Learning</span>
        </div>
        <div className="text-center">
          <span className="text-lg font-mono text-yellow-400">{stats.reviewing}</span>
          <span className="text-xs text-gray-500 block">Review</span>
        </div>
        <div className="text-center">
          <span className="text-lg font-mono text-green-400">{stats.mastered}</span>
          <span className="text-xs text-gray-500 block">Mastered</span>
        </div>
      </div>

      {/* Readiness score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">Interview Readiness</span>
          <span className={cn('text-xs font-medium', getReadinessColor(readinessScore))}>
            {getReadinessStatus(readinessScore)}
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              readinessScore >= 80 ? 'bg-green-500' :
              readinessScore >= 60 ? 'bg-yellow-500' :
              readinessScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
            )}
            style={{ width: `${readinessScore}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">0%</span>
          <span className={cn('text-sm font-mono', getReadinessColor(readinessScore))}>
            {readinessScore}%
          </span>
          <span className="text-xs text-gray-500">100%</span>
        </div>
      </div>

      {/* Action button */}
      {stats.dueToday > 0 || stats.new > 0 ? (
        <Button
          variant="primary"
          onClick={onStartPractice}
          className="w-full bg-blue-600 hover:bg-blue-500"
          leftIcon={<Play className="w-4 h-4" />}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Start Practice ({stats.dueToday + Math.min(stats.new, 10)} cards)
        </Button>
      ) : (
        <div className="text-center py-3 bg-gray-800/50 rounded-lg">
          <Target className="w-6 h-6 text-green-400 mx-auto mb-1" />
          <p className="text-sm text-gray-400">All caught up! Check back later.</p>
        </div>
      )}
    </Card>
  );
};

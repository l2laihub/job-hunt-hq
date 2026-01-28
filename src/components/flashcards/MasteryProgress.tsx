/**
 * MasteryProgress Component
 * Badge showing mastery level for a flashcard
 */
import React from 'react';
import { cn } from '@/src/lib/utils';
import type { SRSData, MasteryLevel } from '@/src/types';
import { getMasteryLevel, formatInterval, getDaysUntilReview, isDue } from '@/src/services/srs';
import { MASTERY_LEVEL_CONFIG } from './constants';
import { Clock, CheckCircle, BookOpen, Sparkles, Circle } from 'lucide-react';

const MASTERY_ICONS = {
  new: Circle,
  learning: BookOpen,
  reviewing: Clock,
  mastered: CheckCircle,
};

interface MasteryProgressProps {
  srsData?: SRSData;
  size?: 'sm' | 'md' | 'lg';
  showDueDate?: boolean;
  showInterval?: boolean;
  className?: string;
}

export const MasteryProgress: React.FC<MasteryProgressProps> = ({
  srsData,
  size = 'md',
  showDueDate = false,
  showInterval = false,
  className,
}) => {
  const level = getMasteryLevel(srsData);
  const config = MASTERY_LEVEL_CONFIG[level];
  const Icon = MASTERY_ICONS[level];
  const dueNow = isDue(srsData);
  const daysUntil = getDaysUntilReview(srsData);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-2.5 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Mastery badge */}
      <span
        className={cn(
          'inline-flex items-center rounded-md border font-medium',
          sizeClasses[size],
          config.bgColor,
          config.color,
          level === 'new' ? 'border-gray-600' :
          level === 'learning' ? 'border-blue-700/50' :
          level === 'reviewing' ? 'border-yellow-700/50' :
          'border-green-700/50'
        )}
      >
        <Icon className={iconSizes[size]} />
        <span>{config.label}</span>
      </span>

      {/* Due indicator */}
      {showDueDate && srsData && (
        <span className={cn(
          'text-xs',
          dueNow ? 'text-red-400' : 'text-gray-500'
        )}>
          {dueNow
            ? (daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : 'Due now')
            : `Due in ${formatInterval(daysUntil)}`}
        </span>
      )}

      {/* Interval indicator */}
      {showInterval && srsData && srsData.interval > 0 && (
        <span className="text-xs text-gray-500">
          ({formatInterval(srsData.interval)} interval)
        </span>
      )}
    </div>
  );
};

/**
 * MasteryProgressBar Component
 * Horizontal progress bar showing mastery distribution
 */
interface MasteryProgressBarProps {
  counts: {
    new: number;
    learning: number;
    reviewing: number;
    mastered: number;
  };
  showLabels?: boolean;
  className?: string;
}

export const MasteryProgressBar: React.FC<MasteryProgressBarProps> = ({
  counts,
  showLabels = false,
  className,
}) => {
  const total = counts.new + counts.learning + counts.reviewing + counts.mastered;

  if (total === 0) {
    return (
      <div className={cn('h-2 bg-gray-800 rounded-full', className)} />
    );
  }

  const segments: { level: MasteryLevel; count: number; width: number }[] = [
    { level: 'new', count: counts.new, width: (counts.new / total) * 100 },
    { level: 'learning', count: counts.learning, width: (counts.learning / total) * 100 },
    { level: 'reviewing', count: counts.reviewing, width: (counts.reviewing / total) * 100 },
    { level: 'mastered', count: counts.mastered, width: (counts.mastered / total) * 100 },
  ];

  const segmentColors = {
    new: 'bg-gray-600',
    learning: 'bg-blue-500',
    reviewing: 'bg-yellow-500',
    mastered: 'bg-green-500',
  };

  return (
    <div className={className}>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
        {segments.map(({ level, count, width }) => (
          count > 0 && (
            <div
              key={level}
              className={cn('h-full transition-all', segmentColors[level])}
              style={{ width: `${width}%` }}
              title={`${MASTERY_LEVEL_CONFIG[level].label}: ${count}`}
            />
          )
        ))}
      </div>

      {showLabels && (
        <div className="flex justify-between mt-1.5 text-xs">
          {segments.map(({ level, count }) => {
            const config = MASTERY_LEVEL_CONFIG[level];
            return (
              <div key={level} className="flex items-center gap-1">
                <span className={cn('w-2 h-2 rounded-full', segmentColors[level])} />
                <span className={config.color}>{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

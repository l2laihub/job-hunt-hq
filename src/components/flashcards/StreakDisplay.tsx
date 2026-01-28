/**
 * StreakDisplay Component
 * Shows the current study streak with fire icon
 */
import React from 'react';
import { cn } from '@/src/lib/utils';
import { Flame, Trophy } from 'lucide-react';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak?: number;
  size?: 'sm' | 'md' | 'lg';
  showLongest?: boolean;
  className?: string;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  currentStreak,
  longestStreak = 0,
  size = 'md',
  showLongest = false,
  className,
}) => {
  const sizeClasses = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-1.5',
    lg: 'text-lg gap-2',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Determine streak intensity for visual feedback
  const getIntensity = (streak: number) => {
    if (streak >= 30) return 'high';
    if (streak >= 7) return 'medium';
    if (streak > 0) return 'low';
    return 'none';
  };

  const intensity = getIntensity(currentStreak);

  const intensityClasses = {
    none: 'text-gray-500',
    low: 'text-orange-400',
    medium: 'text-orange-400',
    high: 'text-orange-300',
  };

  const intensityBgClasses = {
    none: 'bg-gray-800',
    low: 'bg-orange-900/20',
    medium: 'bg-orange-900/30',
    high: 'bg-gradient-to-r from-orange-900/40 to-red-900/40',
  };

  return (
    <div className={cn('flex items-center', className)}>
      {/* Current streak */}
      <div
        className={cn(
          'flex items-center rounded-lg px-3 py-1.5',
          sizeClasses[size],
          intensityBgClasses[intensity]
        )}
      >
        <Flame
          className={cn(
            iconSizes[size],
            intensityClasses[intensity],
            intensity !== 'none' && 'animate-pulse'
          )}
        />
        <span className={cn('font-bold', intensityClasses[intensity])}>
          {currentStreak}
        </span>
        <span className="text-gray-500 ml-1">
          {currentStreak === 1 ? 'day' : 'days'}
        </span>
      </div>

      {/* Longest streak */}
      {showLongest && longestStreak > 0 && (
        <div
          className={cn(
            'flex items-center rounded-lg px-2 py-1 ml-2 bg-yellow-900/20',
            sizeClasses.sm
          )}
          title="Longest streak"
        >
          <Trophy className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-yellow-500 font-medium ml-1">{longestStreak}</span>
        </div>
      )}
    </div>
  );
};

/**
 * StreakMilestone Component
 * Shows streak milestone achievements
 */
interface StreakMilestoneProps {
  streak: number;
  className?: string;
}

export const StreakMilestone: React.FC<StreakMilestoneProps> = ({
  streak,
  className,
}) => {
  // Define milestones
  const milestones = [
    { days: 7, label: '1 Week', icon: '🔥' },
    { days: 14, label: '2 Weeks', icon: '💪' },
    { days: 30, label: '1 Month', icon: '🏆' },
    { days: 60, label: '2 Months', icon: '⭐' },
    { days: 90, label: '3 Months', icon: '🎯' },
    { days: 180, label: '6 Months', icon: '👑' },
    { days: 365, label: '1 Year', icon: '🎉' },
  ];

  // Find next milestone
  const nextMilestone = milestones.find((m) => m.days > streak);
  const achievedMilestones = milestones.filter((m) => m.days <= streak);

  if (!nextMilestone && achievedMilestones.length === 0) {
    return null;
  }

  return (
    <div className={cn('text-center', className)}>
      {/* Achieved milestones */}
      {achievedMilestones.length > 0 && (
        <div className="flex justify-center gap-2 mb-2">
          {achievedMilestones.slice(-3).map((milestone) => (
            <span
              key={milestone.days}
              className="text-2xl"
              title={milestone.label}
            >
              {milestone.icon}
            </span>
          ))}
        </div>
      )}

      {/* Next milestone progress */}
      {nextMilestone && (
        <div>
          <div className="text-xs text-gray-400 mb-1">
            {nextMilestone.days - streak} days to {nextMilestone.label}
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden max-w-[200px] mx-auto">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
              style={{
                width: `${Math.min((streak / nextMilestone.days) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

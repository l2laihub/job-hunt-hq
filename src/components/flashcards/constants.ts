/**
 * Flashcard Component Constants
 */
import type { MasteryLevel, SRSRating } from '@/src/types';

// Mastery level display configuration
export const MASTERY_LEVEL_CONFIG: Record<MasteryLevel, {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  new: {
    label: 'New',
    color: 'text-gray-400',
    bgColor: 'bg-gray-800',
    description: 'Not yet reviewed',
  },
  learning: {
    label: 'Learning',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/30',
    description: 'Recently started learning',
  },
  reviewing: {
    label: 'Reviewing',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/30',
    description: 'Building long-term memory',
  },
  mastered: {
    label: 'Mastered',
    color: 'text-green-400',
    bgColor: 'bg-green-900/30',
    description: 'Well memorized',
  },
};

// Rating button configuration
export const RATING_CONFIG: Record<SRSRating, {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgColor: string;
  hoverBg: string;
  borderColor: string;
  emoji: string;
}> = {
  0: {
    label: 'Blackout',
    shortLabel: '0',
    description: "Complete blank",
    color: 'text-red-500',
    bgColor: 'bg-red-900/30',
    hoverBg: 'hover:bg-red-900/50',
    borderColor: 'border-red-700/50',
    emoji: '😵',
  },
  1: {
    label: 'Failed',
    shortLabel: '1',
    description: 'Incorrect',
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    hoverBg: 'hover:bg-red-900/40',
    borderColor: 'border-red-700/30',
    emoji: '😟',
  },
  2: {
    label: 'Hard',
    shortLabel: '2',
    description: 'Struggled',
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20',
    hoverBg: 'hover:bg-orange-900/40',
    borderColor: 'border-orange-700/30',
    emoji: '😬',
  },
  3: {
    label: 'Good',
    shortLabel: '3',
    description: 'Some hesitation',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    hoverBg: 'hover:bg-yellow-900/40',
    borderColor: 'border-yellow-700/30',
    emoji: '🙂',
  },
  4: {
    label: 'Easy',
    shortLabel: '4',
    description: 'Little hesitation',
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
    hoverBg: 'hover:bg-green-900/40',
    borderColor: 'border-green-700/30',
    emoji: '😊',
  },
  5: {
    label: 'Perfect',
    shortLabel: '5',
    description: 'Instant recall',
    color: 'text-green-500',
    bgColor: 'bg-green-900/30',
    hoverBg: 'hover:bg-green-900/50',
    borderColor: 'border-green-700/50',
    emoji: '🎉',
  },
};

// Question type colors
export const QUESTION_TYPE_COLORS: Record<string, {
  bg: string;
  text: string;
  border: string;
}> = {
  'behavioral-technical': {
    bg: 'bg-purple-900/30',
    text: 'text-purple-400',
    border: 'border-purple-700/50',
  },
  conceptual: {
    bg: 'bg-blue-900/30',
    text: 'text-blue-400',
    border: 'border-blue-700/50',
  },
  'system-design': {
    bg: 'bg-green-900/30',
    text: 'text-green-400',
    border: 'border-green-700/50',
  },
  'problem-solving': {
    bg: 'bg-yellow-900/30',
    text: 'text-yellow-400',
    border: 'border-yellow-700/50',
  },
  experience: {
    bg: 'bg-pink-900/30',
    text: 'text-pink-400',
    border: 'border-pink-700/50',
  },
};

// Study mode configuration
export const STUDY_MODE_CONFIG = {
  daily: {
    label: 'Daily Review',
    description: 'Review all due cards',
    icon: 'Calendar',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
  },
  application: {
    label: 'Job-Specific',
    description: 'Focus on a specific job application',
    icon: 'Briefcase',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/20',
  },
  quick: {
    label: 'Quick Session',
    description: '5-minute practice session',
    icon: 'Zap',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
  },
  'all-due': {
    label: 'All Due',
    description: 'Review all overdue and due cards',
    icon: 'Clock',
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
  },
};

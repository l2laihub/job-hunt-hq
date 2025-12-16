import type { ApplicationStatus } from '@/src/types';

// Storage Keys
export const STORAGE_KEYS = {
  APPLICATIONS: 'jhq:applications:v2',
  PROFILE: 'jhq:profile:v2',
  STORIES: 'jhq:stories:v2',
  SETTINGS: 'jhq:settings:v2',
  // Legacy keys for migration
  LEGACY_APPLICATIONS: 'jobhunt-hq-applications',
  LEGACY_PROFILE: 'jobhunt-hq-profile',
  LEGACY_STORIES: 'jobhunt-hq-experiences',
} as const;

// Application Status Config
export const APPLICATION_STATUSES: {
  id: ApplicationStatus;
  label: string;
  color: string;
  bgColor: string;
}[] = [
  { id: 'wishlist', label: 'Wishlist', color: 'text-gray-400', bgColor: 'bg-gray-800' },
  { id: 'applied', label: 'Applied', color: 'text-blue-400', bgColor: 'bg-blue-900/30' },
  { id: 'interviewing', label: 'Interviewing', color: 'text-purple-400', bgColor: 'bg-purple-900/30' },
  { id: 'offer', label: 'Offer', color: 'text-green-400', bgColor: 'bg-green-900/30' },
  { id: 'rejected', label: 'Rejected', color: 'text-red-400', bgColor: 'bg-red-900/30' },
];

// Common Interview Questions
export const COMMON_INTERVIEW_QUESTIONS = [
  'Tell me about a time you led a project or team.',
  'Describe a challenging technical problem you solved.',
  'Tell me about a time you failed or made a mistake.',
  'Describe a situation where you influenced without authority.',
  'What is your proudest professional achievement?',
  'Tell me about a conflict with a coworker.',
  'Describe a time you had to deliver under tight deadlines.',
  'Tell me about a time you dealt with ambiguity.',
  'How do you handle disagreements with your manager?',
  'Tell me about a time you had to learn something quickly.',
];

// Interview Focus Areas
export const INTERVIEW_FOCUS_AREAS = [
  'Leadership',
  'Conflict Resolution',
  'Technical Depth',
  'System Architecture',
  'Career Goals',
  'Problem Solving',
  'Communication',
  'Teamwork',
];

// Application Sources
export const APPLICATION_SOURCES = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'upwork', label: 'Upwork' },
  { value: 'direct', label: 'Direct Application' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
] as const;

// Work Styles
export const WORK_STYLES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
  { value: 'flexible', label: 'Flexible' },
] as const;

// API Config
export const API_CONFIG = {
  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_LIVE_MODEL: 'gemini-2.5-flash-native-audio-preview-09-2025',
  THINKING_BUDGET: 1024,
  MAX_THINKING_BUDGET: 2048,
} as const;

// Cache TTL (in milliseconds)
export const CACHE_TTL = {
  RESEARCH: 7 * 24 * 60 * 60 * 1000, // 7 days
  ANALYSIS: 24 * 60 * 60 * 1000, // 1 day
} as const;

// UI Config
export const UI_CONFIG = {
  TOAST_DURATION: 4000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  MAX_VISIBLE_SKILLS: 10,
  MAX_VISIBLE_NEWS: 5,
} as const;

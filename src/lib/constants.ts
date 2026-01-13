import type { ApplicationStatus } from '@/src/types';

// Storage Keys
export const STORAGE_KEYS = {
  APPLICATIONS: 'jhq:applications:v2',
  PROFILE: 'jhq:profile:v2',
  STORIES: 'jhq:stories:v2',
  SETTINGS: 'jhq:settings:v2',
  TECHNICAL_ANSWERS: 'jhq:technical-answers:v1',
  ANALYZED_JOBS: 'jhq:analyzed-jobs:v1',
  COMPANY_RESEARCH: 'jhq:company-research:v1',
  INTERVIEW_PREP: 'jhq:interview-prep:v1',
  // Legacy keys for migration
  LEGACY_APPLICATIONS: 'jobhunt-hq-applications',
  LEGACY_PROFILE: 'jobhunt-hq-profile',
  LEGACY_STORIES: 'jobhunt-hq-experiences',
  LEGACY_INTERVIEW_PREP: 'prepprly:interview-prep:v1',
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

// Technical Question Types
export const TECHNICAL_QUESTION_TYPES = [
  { value: 'behavioral-technical', label: 'Behavioral-Technical', format: 'STAR' },
  { value: 'conceptual', label: 'Conceptual/Theory', format: 'Explain-Example-Tradeoffs' },
  { value: 'system-design', label: 'System Design', format: 'Requirements-Design-Tradeoffs' },
  { value: 'problem-solving', label: 'Problem Solving', format: 'Approach-Implementation-Complexity' },
  { value: 'experience', label: 'Experience-Based', format: 'STAR' },
] as const;

// Common Technical Questions
export const COMMON_TECHNICAL_QUESTIONS = [
  'Explain how you would design a rate limiter.',
  'Describe a time you optimized a slow database query.',
  'What is your approach to debugging production issues?',
  'How do you handle technical debt in your projects?',
  'Explain the difference between SQL and NoSQL databases.',
  'Tell me about a challenging architectural decision you made.',
  'How would you design a URL shortener?',
  'Describe your testing strategy for a new feature.',
] as const;

// Difficulty Levels
export const DIFFICULTY_LEVELS = [
  { value: 'junior', label: 'Junior (0-2 years)' },
  { value: 'mid', label: 'Mid-level (2-5 years)' },
  { value: 'senior', label: 'Senior (5-10 years)' },
  { value: 'staff', label: 'Staff+ (10+ years)' },
] as const;

// Job Types for JD Analyzer
export const JOB_TYPES = [
  { value: 'fulltime', label: 'Full-Time', description: 'Permanent employment with benefits' },
  { value: 'contract', label: 'Contract', description: 'W-2/1099 fixed-term contract' },
  { value: 'freelance', label: 'Freelance', description: 'Project-based or platform work' },
] as const;

// Cover Letter Styles
export const COVER_LETTER_STYLES = [
  { value: 'professional', label: 'Professional', description: 'Traditional, formal tone for corporate roles' },
  { value: 'story-driven', label: 'Story-Driven', description: 'Narrative approach highlighting key experiences' },
  { value: 'technical-focused', label: 'Technical', description: 'Emphasizes technical skills and achievements' },
  { value: 'startup-casual', label: 'Startup Casual', description: 'Relaxed, personality-forward for startups' },
] as const;

// Contract Types
export const CONTRACT_TYPES = [
  { value: 'W-2', label: 'W-2', description: 'Employee of staffing agency' },
  { value: '1099', label: '1099', description: 'Independent contractor' },
  { value: 'corp-to-corp', label: 'Corp-to-Corp', description: 'Your business to their business' },
  { value: 'unknown', label: 'Unknown', description: 'Not specified in job posting' },
] as const;

// Interview Prep Priorities
export const PREP_PRIORITIES = [
  { value: 'high', label: 'High Priority', color: 'text-red-400' },
  { value: 'medium', label: 'Medium Priority', color: 'text-yellow-400' },
  { value: 'low', label: 'Low Priority', color: 'text-gray-400' },
] as const;

// Topic Depth Levels
export const TOPIC_DEPTHS = [
  { value: 'basic', label: 'Basic', description: 'Conceptual understanding' },
  { value: 'intermediate', label: 'Intermediate', description: 'Working knowledge with examples' },
  { value: 'deep', label: 'Deep Dive', description: 'Expert-level discussion expected' },
] as const;

// Resume Enhancement Modes
export const ENHANCEMENT_MODES = [
  { value: 'professional', label: 'Professional Enhancement', description: 'General improvements for ATS and readability', icon: 'Sparkles' },
  { value: 'job-tailored', label: 'Job-Tailored', description: 'Optimize for a specific job description', icon: 'Target' },
] as const;

// Suggestion Types
export const SUGGESTION_TYPES = [
  { value: 'rewrite', label: 'Rewrite', description: 'Improve wording and clarity', color: 'text-blue-400', bgColor: 'bg-blue-900/30' },
  { value: 'reorder', label: 'Reorder', description: 'Change position for relevance', color: 'text-purple-400', bgColor: 'bg-purple-900/30' },
  { value: 'add', label: 'Add', description: 'Add missing content', color: 'text-green-400', bgColor: 'bg-green-900/30' },
  { value: 'remove', label: 'Remove', description: 'Remove irrelevant content', color: 'text-red-400', bgColor: 'bg-red-900/30' },
  { value: 'quantify', label: 'Quantify', description: 'Add metrics and numbers', color: 'text-amber-400', bgColor: 'bg-amber-900/30' },
  { value: 'keyword', label: 'Keyword', description: 'Add ATS keywords', color: 'text-cyan-400', bgColor: 'bg-cyan-900/30' },
] as const;

// Suggestion Sections
export const SUGGESTION_SECTIONS = [
  { value: 'headline', label: 'Professional Headline', icon: 'User' },
  { value: 'summary', label: 'Summary', icon: 'FileText' },
  { value: 'experience', label: 'Work Experience', icon: 'Briefcase' },
  { value: 'skills', label: 'Skills', icon: 'Code' },
  { value: 'achievements', label: 'Key Achievements', icon: 'Trophy' },
  { value: 'projects', label: 'Projects', icon: 'Folder' },
] as const;

// Impact Levels
export const IMPACT_LEVELS = [
  { value: 'high', label: 'High Impact', color: 'text-red-400', bgColor: 'bg-red-900/30' },
  { value: 'medium', label: 'Medium Impact', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30' },
  { value: 'low', label: 'Low Impact', color: 'text-gray-400', bgColor: 'bg-gray-800' },
] as const;

// Common Resume Keywords by Industry
export const RESUME_POWER_WORDS = [
  'Achieved', 'Architected', 'Automated', 'Built', 'Collaborated',
  'Delivered', 'Designed', 'Developed', 'Drove', 'Enhanced',
  'Established', 'Implemented', 'Improved', 'Increased', 'Integrated',
  'Led', 'Managed', 'Mentored', 'Optimized', 'Orchestrated',
  'Reduced', 'Scaled', 'Shipped', 'Simplified', 'Spearheaded',
  'Streamlined', 'Transformed', 'Upgraded',
] as const;

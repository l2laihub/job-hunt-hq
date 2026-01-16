/**
 * Preference Types
 *
 * Types for the AI Assistant preference learning system.
 * Enables the assistant to learn user preferences through:
 * - Explicit statements ("I prefer concise answers")
 * - Feedback (thumbs up/down on responses)
 * - Corrections ("Make it shorter")
 */

// ============================================
// PREFERENCE CATEGORIES
// ============================================

/**
 * Categories for organizing preferences by context
 */
export type PreferenceCategory =
  | 'general'           // Applies to all interactions
  | 'communication'     // Response style (length, tone, format)
  | 'job-analysis'      // Job description analysis preferences
  | 'interview-prep'    // Interview preparation preferences
  | 'company-research'  // Company research preferences
  | 'stories'           // STAR story formatting preferences
  | 'resume'            // Resume enhancement preferences
  | 'copilot';          // Interview copilot preferences

/**
 * How the preference was learned
 */
export type PreferenceSource =
  | 'explicit'          // User directly stated preference
  | 'feedback'          // Learned from thumbs up/down
  | 'correction'        // User corrected AI response
  | 'behavior'          // Inferred from usage patterns
  | 'manual';           // User set in settings UI

/**
 * Confidence level for learned preferences
 * - low: Inferred with uncertainty
 * - medium: From feedback or single statement
 * - high: Explicit statement or multiple confirmations
 * - confirmed: User explicitly confirmed in settings
 */
export type PreferenceConfidence = 'low' | 'medium' | 'high' | 'confirmed';

// ============================================
// PREFERENCE DATA TYPES
// ============================================

/**
 * Individual user preference
 */
export interface UserPreference {
  id: string;
  userId: string;
  category: PreferenceCategory;
  key: string;                    // Semantic key like "response_length", "include_metrics"
  value: string | boolean | number;
  source: PreferenceSource;
  confidence: PreferenceConfidence;
  description?: string;           // Human-readable description of the preference
  examples?: string[];            // Examples of when this preference was applied
  appliedCount: number;           // How many times this was used
  lastAppliedAt?: string;         // When last used
  createdAt: string;
  updatedAt: string;
  isActive: boolean;              // Can be toggled off without deleting
}

/**
 * Feedback type for categorizing negative feedback
 */
export type FeedbackType =
  | 'too_long'
  | 'too_short'
  | 'not_helpful'
  | 'wrong_tone'
  | 'off_topic'
  | 'too_generic'
  | 'too_technical'
  | 'not_technical_enough'
  | 'perfect'
  | 'other';

/**
 * Message feedback for learning from user responses
 */
export interface MessageFeedback {
  id: string;
  userId: string;
  messageId: string;
  chatId: string;
  rating: 'positive' | 'negative';
  feedbackType?: FeedbackType;
  correction?: string;            // User's correction if provided
  context: {
    category: PreferenceCategory;
    messagePreview: string;       // First 200 chars of assistant response
    userQuery: string;            // First 200 chars of user message
  };
  createdAt: string;
}

// ============================================
// PREFERENCE PROFILE
// ============================================

/**
 * Aggregated preference profile for a user
 */
export interface PreferenceProfile {
  userId: string;
  preferences: UserPreference[];
  feedbackStats: {
    totalPositive: number;
    totalNegative: number;
    commonFeedbackTypes: FeedbackType[];
  };
  learningEnabled: boolean;
  lastUpdatedAt: string;
}

// ============================================
// DETECTED PREFERENCE (from parsing)
// ============================================

/**
 * A preference detected from user message
 */
export interface DetectedPreference {
  category: PreferenceCategory;
  key: string;
  value: string | boolean;
  confidence: PreferenceConfidence;
  originalStatement: string;      // The text that triggered detection
  isNegation: boolean;            // "Don't" vs "Do"
}

// ============================================
// DEFAULT PREFERENCE KEYS
// ============================================

/**
 * Well-known preference keys the system recognizes
 */
export const PREFERENCE_KEYS = {
  // Communication preferences
  RESPONSE_LENGTH: 'response_length',           // 'concise' | 'moderate' | 'detailed'
  RESPONSE_TONE: 'response_tone',               // 'professional' | 'casual' | 'friendly'
  INCLUDE_EXAMPLES: 'include_examples',         // boolean
  INCLUDE_METRICS: 'include_metrics',           // boolean
  USE_BULLET_POINTS: 'use_bullet_points',       // boolean
  ASK_FOLLOWUPS: 'ask_followups',               // boolean

  // Job analysis preferences
  INCLUDE_SALARY_INFO: 'include_salary_info',   // boolean
  COVER_LETTER_STYLE: 'cover_letter_style',     // 'formal' | 'conversational' | 'bold'
  HIGHLIGHT_RED_FLAGS: 'highlight_red_flags',   // boolean
  FOCUS_ON_TECH: 'focus_on_tech',               // boolean

  // Interview prep preferences
  INCLUDE_STAR_FORMAT: 'include_star_format',   // boolean
  PRACTICE_DIFFICULTY: 'practice_difficulty',   // 'easy' | 'medium' | 'hard'
  INCLUDE_FOLLOWUPS: 'include_followups',       // boolean

  // Story preferences
  STORY_DETAIL_LEVEL: 'story_detail_level',     // 'brief' | 'standard' | 'comprehensive'
  EMPHASIZE_METRICS: 'emphasize_metrics',       // boolean

  // Resume preferences
  RESUME_STYLE: 'resume_style',                 // 'traditional' | 'modern' | 'creative'
  PRIORITIZE_ATS: 'prioritize_ats',             // boolean
} as const;

/**
 * Human-readable labels for preference keys
 */
export const PREFERENCE_LABELS: Record<string, string> = {
  [PREFERENCE_KEYS.RESPONSE_LENGTH]: 'Response length',
  [PREFERENCE_KEYS.RESPONSE_TONE]: 'Response tone',
  [PREFERENCE_KEYS.INCLUDE_EXAMPLES]: 'Include examples',
  [PREFERENCE_KEYS.INCLUDE_METRICS]: 'Include metrics',
  [PREFERENCE_KEYS.USE_BULLET_POINTS]: 'Use bullet points',
  [PREFERENCE_KEYS.ASK_FOLLOWUPS]: 'Ask follow-up questions',
  [PREFERENCE_KEYS.INCLUDE_SALARY_INFO]: 'Include salary information',
  [PREFERENCE_KEYS.COVER_LETTER_STYLE]: 'Cover letter style',
  [PREFERENCE_KEYS.HIGHLIGHT_RED_FLAGS]: 'Highlight red flags',
  [PREFERENCE_KEYS.FOCUS_ON_TECH]: 'Focus on technical details',
  [PREFERENCE_KEYS.INCLUDE_STAR_FORMAT]: 'Use STAR format',
  [PREFERENCE_KEYS.PRACTICE_DIFFICULTY]: 'Practice difficulty',
  [PREFERENCE_KEYS.INCLUDE_FOLLOWUPS]: 'Include follow-up questions',
  [PREFERENCE_KEYS.STORY_DETAIL_LEVEL]: 'Story detail level',
  [PREFERENCE_KEYS.EMPHASIZE_METRICS]: 'Emphasize metrics',
  [PREFERENCE_KEYS.RESUME_STYLE]: 'Resume style',
  [PREFERENCE_KEYS.PRIORITIZE_ATS]: 'Prioritize ATS compatibility',
};

// ============================================
// FEEDBACK TYPE MAPPINGS
// ============================================

/**
 * Map feedback types to potential preference adjustments
 */
export const FEEDBACK_TO_PREFERENCE: Record<FeedbackType, { key: string; value: string | boolean } | null> = {
  too_long: { key: PREFERENCE_KEYS.RESPONSE_LENGTH, value: 'concise' },
  too_short: { key: PREFERENCE_KEYS.RESPONSE_LENGTH, value: 'detailed' },
  not_helpful: null, // Too vague to derive preference
  wrong_tone: null,  // Need more context
  off_topic: null,   // Not a preference issue
  too_generic: { key: PREFERENCE_KEYS.INCLUDE_EXAMPLES, value: true },
  too_technical: { key: PREFERENCE_KEYS.FOCUS_ON_TECH, value: false },
  not_technical_enough: { key: PREFERENCE_KEYS.FOCUS_ON_TECH, value: true },
  perfect: null,     // Positive, no change needed
  other: null,       // Too vague
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a new preference object
 */
export function createPreference(
  userId: string,
  category: PreferenceCategory,
  key: string,
  value: string | boolean | number,
  source: PreferenceSource,
  confidence: PreferenceConfidence = 'medium',
  description?: string
): Omit<UserPreference, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    userId,
    category,
    key,
    value,
    source,
    confidence,
    description,
    appliedCount: 0,
    isActive: true,
  };
}

/**
 * Create a new feedback object
 */
export function createFeedback(
  userId: string,
  messageId: string,
  chatId: string,
  rating: 'positive' | 'negative',
  context: MessageFeedback['context'],
  feedbackType?: FeedbackType,
  correction?: string
): Omit<MessageFeedback, 'id' | 'createdAt'> {
  return {
    userId,
    messageId,
    chatId,
    rating,
    feedbackType,
    correction,
    context,
  };
}

/**
 * Get preferences for a specific context type
 */
export function filterPreferencesForContext(
  preferences: UserPreference[],
  contextType: PreferenceCategory
): UserPreference[] {
  return preferences.filter(
    (p) => p.isActive && (p.category === 'general' || p.category === 'communication' || p.category === contextType)
  );
}

/**
 * Sort preferences by relevance (confidence, then recency)
 */
export function sortPreferencesByRelevance(preferences: UserPreference[]): UserPreference[] {
  const confidenceOrder: Record<PreferenceConfidence, number> = {
    confirmed: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return [...preferences].sort((a, b) => {
    // First by confidence
    const confDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    if (confDiff !== 0) return confDiff;

    // Then by recency
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

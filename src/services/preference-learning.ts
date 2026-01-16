/**
 * Preference Learning Service
 *
 * Central service for learning user preferences from:
 * - Explicit statements in messages
 * - Feedback (thumbs up/down)
 * - Corrections to AI responses
 *
 * Orchestrates the learning pipeline and manages preference persistence.
 */

import type {
  UserPreference,
  MessageFeedback,
  PreferenceCategory,
  PreferenceSource,
  PreferenceConfidence,
  FeedbackType,
  DetectedPreference,
} from '@/src/types/preferences';
import { FEEDBACK_TO_PREFERENCE, PREFERENCE_KEYS } from '@/src/types/preferences';
import { parsePreferences, isCorrection, parseCorrection } from '@/src/services/gemini';
import { usePreferencesStore } from '@/src/stores/preferences';

// ============================================
// LEARNING FROM FEEDBACK
// ============================================

/**
 * Process feedback and extract a learnable preference
 */
export function extractPreferenceFromFeedback(
  feedback: MessageFeedback
): DetectedPreference | null {
  // Only learn from negative feedback with a type
  if (feedback.rating === 'positive' || !feedback.feedbackType) {
    return null;
  }

  const mapping = FEEDBACK_TO_PREFERENCE[feedback.feedbackType];
  if (!mapping) {
    return null;
  }

  return {
    category: feedback.context.category,
    key: mapping.key,
    value: mapping.value,
    confidence: 'medium' as PreferenceConfidence,
    originalStatement: `User feedback: ${feedback.feedbackType}`,
    isNegation: false,
  };
}

/**
 * Process feedback and save preference if applicable
 */
export async function learnFromFeedback(
  feedback: MessageFeedback
): Promise<UserPreference | null> {
  const detected = extractPreferenceFromFeedback(feedback);

  if (!detected) {
    return null;
  }

  const store = usePreferencesStore.getState();

  try {
    const preference = await store.addPreference(
      detected.category,
      detected.key,
      detected.value,
      'feedback',
      detected.confidence
    );
    return preference;
  } catch (error) {
    console.error('Failed to learn from feedback:', error);
    return null;
  }
}

// ============================================
// LEARNING FROM MESSAGES
// ============================================

/**
 * Process a user message for preference statements
 */
export function detectPreferencesInMessage(
  message: string,
  contextType: PreferenceCategory = 'general'
): DetectedPreference[] {
  // Check for explicit preference statements
  const parseResult = parsePreferences(message);

  if (parseResult.hasPreferences) {
    return parseResult.preferences;
  }

  // Check if it's a correction
  if (isCorrection(message)) {
    const correction = parseCorrection(message);
    if (correction) {
      return [correction];
    }
  }

  return [];
}

/**
 * Process detected preferences and save them
 */
export async function learnFromMessage(
  message: string,
  contextType: PreferenceCategory = 'general'
): Promise<UserPreference[]> {
  const detected = detectPreferencesInMessage(message, contextType);

  if (detected.length === 0) {
    return [];
  }

  const store = usePreferencesStore.getState();
  const savedPreferences: UserPreference[] = [];

  for (const pref of detected) {
    try {
      const saved = await store.addPreference(
        pref.category,
        pref.key,
        pref.value,
        'explicit',
        pref.confidence,
        `Detected from: "${pref.originalStatement}"`
      );
      savedPreferences.push(saved);
    } catch (error) {
      console.error('Failed to save detected preference:', error);
    }
  }

  return savedPreferences;
}

// ============================================
// PREFERENCE REINFORCEMENT
// ============================================

/**
 * Reinforce a preference when reconfirmed
 * (e.g., user says "keep it short" again)
 */
export async function reinforcePreference(
  category: PreferenceCategory,
  key: string,
  value: string | boolean | number
): Promise<UserPreference | null> {
  const store = usePreferencesStore.getState();
  const existing = store.getPreferenceByKey(category, key);

  if (!existing) {
    return null;
  }

  // If same value, increase confidence
  if (existing.value === value) {
    await store.reinforcePreference(existing.id);
    return store.getPreferenceByKey(category, key) || null;
  }

  // If different value, update (recent action wins)
  try {
    await store.updatePreference(existing.id, {
      value,
      confidence: 'high',
    });
    return store.getPreferenceByKey(category, key) || null;
  } catch (error) {
    console.error('Failed to update preference:', error);
    return null;
  }
}

// ============================================
// CONFIDENCE MANAGEMENT
// ============================================

/**
 * Confidence level order for comparison
 */
const CONFIDENCE_ORDER: Record<PreferenceConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
  confirmed: 4,
};

/**
 * Get the next confidence level
 */
export function getNextConfidenceLevel(
  current: PreferenceConfidence
): PreferenceConfidence {
  switch (current) {
    case 'low':
      return 'medium';
    case 'medium':
      return 'high';
    case 'high':
      return 'confirmed';
    case 'confirmed':
      return 'confirmed';
    default:
      return 'medium';
  }
}

/**
 * Compare two confidence levels
 */
export function compareConfidence(
  a: PreferenceConfidence,
  b: PreferenceConfidence
): number {
  return CONFIDENCE_ORDER[a] - CONFIDENCE_ORDER[b];
}

// ============================================
// PREFERENCE MERGING
// ============================================

/**
 * Merge a new preference with an existing one
 * Returns the merged preference data
 */
export function mergePreferences(
  existing: UserPreference,
  learned: DetectedPreference
): Partial<UserPreference> {
  // Same value - reinforce confidence
  if (existing.value === learned.value) {
    return {
      confidence: getNextConfidenceLevel(existing.confidence),
      appliedCount: existing.appliedCount + 1,
      lastAppliedAt: new Date().toISOString(),
    };
  }

  // Different value - recent action wins
  // Determine new confidence based on source
  const newConfidence: PreferenceConfidence =
    learned.confidence === 'high' ? 'high' : 'medium';

  return {
    value: learned.value,
    confidence: newConfidence,
    source: 'explicit' as PreferenceSource,
  };
}

// ============================================
// BATCH LEARNING
// ============================================

/**
 * Process a conversation and learn from all messages
 */
export async function learnFromConversation(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  contextType: PreferenceCategory = 'general'
): Promise<UserPreference[]> {
  const allLearned: UserPreference[] = [];

  for (const message of messages) {
    if (message.role === 'user') {
      const learned = await learnFromMessage(message.content, contextType);
      allLearned.push(...learned);
    }
  }

  return allLearned;
}

// ============================================
// LEARNING HOOKS
// ============================================

/**
 * Hook to automatically learn from user messages
 * Call this when sending a message to the assistant
 */
export async function processMessageForLearning(
  message: string,
  contextType: PreferenceCategory
): Promise<{
  learnedPreferences: UserPreference[];
  shouldNotifyUser: boolean;
}> {
  const learned = await learnFromMessage(message, contextType);

  return {
    learnedPreferences: learned,
    shouldNotifyUser: learned.length > 0,
  };
}

/**
 * Hook to learn from feedback submission
 * Call this when user submits feedback on a response
 */
export async function processFeedbackForLearning(
  feedback: MessageFeedback
): Promise<{
  learnedPreference: UserPreference | null;
  shouldNotifyUser: boolean;
}> {
  const learned = await learnFromFeedback(feedback);

  return {
    learnedPreference: learned,
    shouldNotifyUser: learned !== null,
  };
}

/**
 * Preference Builder Service
 *
 * Builds the preference section for the AI Assistant system prompt.
 * Filters, prioritizes, and formats preferences for injection.
 */

import type { UserPreference, PreferenceCategory } from '@/src/types/preferences';
import {
  PREFERENCE_KEYS,
  filterPreferencesForContext,
  sortPreferencesByRelevance,
} from '@/src/types/preferences';

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum number of preferences to include in the prompt
 * to avoid bloating and overwhelming the model
 */
const MAX_PREFERENCES_IN_PROMPT = 8;

/**
 * Human-readable descriptions for preference values
 */
const VALUE_DESCRIPTIONS: Record<string, Record<string, string>> = {
  [PREFERENCE_KEYS.RESPONSE_LENGTH]: {
    concise: 'Keep responses short and to the point (2-3 paragraphs max)',
    moderate: 'Use moderate-length responses (3-5 paragraphs)',
    detailed: 'Provide comprehensive, detailed responses',
  },
  [PREFERENCE_KEYS.RESPONSE_TONE]: {
    professional: 'Use a professional, formal tone',
    casual: 'Use a casual, conversational tone',
    friendly: 'Use a friendly, approachable tone',
  },
  [PREFERENCE_KEYS.COVER_LETTER_STYLE]: {
    formal: 'Write formal, traditional cover letters',
    conversational: 'Write conversational, personable cover letters',
    bold: 'Write bold, standout cover letters',
  },
  [PREFERENCE_KEYS.STORY_DETAIL_LEVEL]: {
    brief: 'Keep STAR stories brief and focused',
    standard: 'Use standard STAR story detail',
    comprehensive: 'Provide comprehensive STAR stories with full context',
  },
  [PREFERENCE_KEYS.PRACTICE_DIFFICULTY]: {
    easy: 'Use easier practice questions',
    medium: 'Use moderate difficulty practice questions',
    hard: 'Challenge with difficult practice questions',
  },
};

/**
 * Format a boolean preference into an instruction
 */
function formatBooleanPreference(key: string, value: boolean): string {
  const positiveInstructions: Record<string, string> = {
    [PREFERENCE_KEYS.INCLUDE_EXAMPLES]: 'Include specific examples in responses',
    [PREFERENCE_KEYS.INCLUDE_METRICS]: 'Emphasize metrics, numbers, and quantifiable results',
    [PREFERENCE_KEYS.USE_BULLET_POINTS]: 'Format key information with bullet points',
    [PREFERENCE_KEYS.ASK_FOLLOWUPS]: 'Ask clarifying follow-up questions when helpful',
    [PREFERENCE_KEYS.INCLUDE_SALARY_INFO]: 'Include salary and compensation information when relevant',
    [PREFERENCE_KEYS.HIGHLIGHT_RED_FLAGS]: 'Proactively highlight potential red flags',
    [PREFERENCE_KEYS.FOCUS_ON_TECH]: 'Focus on technical details and implementation specifics',
    [PREFERENCE_KEYS.INCLUDE_STAR_FORMAT]: 'Structure behavioral answers using STAR format',
    [PREFERENCE_KEYS.INCLUDE_FOLLOWUPS]: 'Include likely follow-up questions and how to handle them',
    [PREFERENCE_KEYS.EMPHASIZE_METRICS]: 'Emphasize metrics and measurable outcomes in stories',
    [PREFERENCE_KEYS.PRIORITIZE_ATS]: 'Optimize content for ATS (Applicant Tracking Systems)',
  };

  const negativeInstructions: Record<string, string> = {
    [PREFERENCE_KEYS.INCLUDE_EXAMPLES]: 'Skip examples unless specifically requested',
    [PREFERENCE_KEYS.INCLUDE_METRICS]: 'Don\'t over-emphasize metrics and numbers',
    [PREFERENCE_KEYS.USE_BULLET_POINTS]: 'Use flowing prose instead of bullet points',
    [PREFERENCE_KEYS.ASK_FOLLOWUPS]: 'Provide direct answers without asking follow-up questions',
    [PREFERENCE_KEYS.INCLUDE_SALARY_INFO]: 'Don\'t bring up salary unless the user asks',
    [PREFERENCE_KEYS.HIGHLIGHT_RED_FLAGS]: 'Focus on positives; don\'t proactively highlight concerns',
    [PREFERENCE_KEYS.FOCUS_ON_TECH]: 'Keep responses high-level and accessible, not overly technical',
    [PREFERENCE_KEYS.INCLUDE_STAR_FORMAT]: 'Use flexible answer formats, not always STAR',
    [PREFERENCE_KEYS.INCLUDE_FOLLOWUPS]: 'Focus on the main answer without anticipating follow-ups',
    [PREFERENCE_KEYS.EMPHASIZE_METRICS]: 'Focus on narrative impact rather than numbers',
    [PREFERENCE_KEYS.PRIORITIZE_ATS]: 'Focus on readability over ATS optimization',
  };

  const instruction = value
    ? positiveInstructions[key]
    : negativeInstructions[key];

  return instruction || `${key}: ${value}`;
}

/**
 * Format a string/enum preference into an instruction
 */
function formatStringPreference(key: string, value: string): string {
  const descriptions = VALUE_DESCRIPTIONS[key];
  if (descriptions && descriptions[value]) {
    return descriptions[value];
  }

  // Fallback for unknown values
  return `${key.replace(/_/g, ' ')}: ${value}`;
}

/**
 * Format a single preference into an instruction string
 */
function formatPreference(pref: UserPreference): string {
  const { key, value } = pref;

  if (typeof value === 'boolean') {
    return formatBooleanPreference(key, value);
  }

  if (typeof value === 'string') {
    return formatStringPreference(key, value);
  }

  // Fallback for other types
  return `${key.replace(/_/g, ' ')}: ${value}`;
}

// ============================================
// MAIN BUILDER FUNCTION
// ============================================

/**
 * Build the preference section for the system prompt
 */
export function buildPreferencePrompt(
  preferences: UserPreference[],
  contextType: PreferenceCategory
): string {
  // Filter and sort preferences for the current context
  const filtered = filterPreferencesForContext(preferences, contextType);
  const sorted = sortPreferencesByRelevance(filtered);

  // Limit to max preferences
  const limited = sorted.slice(0, MAX_PREFERENCES_IN_PROMPT);

  if (limited.length === 0) {
    return '';
  }

  // Format preferences as bullet points
  const instructions = limited
    .map((pref) => `- ${formatPreference(pref)}`)
    .join('\n');

  return `## User Preferences (IMPORTANT - Follow These Guidelines)

The user has indicated the following preferences through their feedback and explicit statements. Follow these guidelines in your responses:

${instructions}

These preferences should inform your response style, content, and format.`;
}

/**
 * Build a compact version of preferences for token-limited contexts
 */
export function buildCompactPreferencePrompt(
  preferences: UserPreference[],
  contextType: PreferenceCategory
): string {
  // Filter and sort
  const filtered = filterPreferencesForContext(preferences, contextType);
  const sorted = sortPreferencesByRelevance(filtered);

  // Even more limited for compact version
  const limited = sorted.slice(0, 5);

  if (limited.length === 0) {
    return '';
  }

  // Compact format
  const instructions = limited
    .map((pref) => {
      if (typeof pref.value === 'boolean') {
        return pref.value ? `+${pref.key}` : `-${pref.key}`;
      }
      return `${pref.key}:${pref.value}`;
    })
    .join(', ');

  return `[User prefs: ${instructions}]`;
}

/**
 * Check if there are significant preferences that should affect the response
 */
export function hasSignificantPreferences(
  preferences: UserPreference[],
  contextType: PreferenceCategory
): boolean {
  const filtered = filterPreferencesForContext(preferences, contextType);

  // Consider preferences significant if:
  // 1. There are any high-confidence preferences
  // 2. There are multiple preferences
  const hasHighConfidence = filtered.some(
    (p) => p.confidence === 'high' || p.confidence === 'confirmed'
  );

  return hasHighConfidence || filtered.length >= 2;
}

/**
 * Get a summary of active preferences for display
 */
export function getPreferenceSummary(preferences: UserPreference[]): string[] {
  const active = preferences.filter((p) => p.isActive);

  return active.map((pref) => {
    const desc = formatPreference(pref);
    const confidence =
      pref.confidence === 'confirmed'
        ? ' (confirmed)'
        : pref.confidence === 'high'
        ? ''
        : ` (${pref.confidence})`;

    return `${desc}${confidence}`;
  });
}

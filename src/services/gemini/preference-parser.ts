/**
 * Preference Parser Service
 *
 * Detects explicit preference statements in user messages.
 * Uses pattern matching for common phrases and AI classification for ambiguous cases.
 */

import type {
  DetectedPreference,
  PreferenceCategory,
  PreferenceConfidence,
} from '@/src/types/preferences';
import { PREFERENCE_KEYS } from '@/src/types/preferences';

// ============================================
// PATTERN DEFINITIONS
// ============================================

interface PreferencePattern {
  patterns: RegExp[];
  key: string;
  value: string | boolean;
  isNegation: boolean;
  confidence: PreferenceConfidence;
}

/**
 * Patterns for detecting response length preferences
 */
const LENGTH_PATTERNS: PreferencePattern[] = [
  {
    patterns: [
      /\b(keep|make|be)\s+(it\s+)?(short|brief|concise|succinct)\b/i,
      /\b(shorter|briefer)\s+(response|answer|reply)s?\b/i,
      /\bdon't\s+(be\s+)?(too\s+)?(long|verbose|wordy)\b/i,
      /\bi\s+(prefer|like|want)\s+(short|brief|concise)\b/i,
      /\bless\s+(detail|text|words)\b/i,
    ],
    key: PREFERENCE_KEYS.RESPONSE_LENGTH,
    value: 'concise',
    isNegation: false,
    confidence: 'high',
  },
  {
    patterns: [
      /\b(more|give|provide)\s+(detail|details|information|context)\b/i,
      /\b(longer|detailed|comprehensive|thorough)\s+(response|answer|reply)s?\b/i,
      /\bdon't\s+be\s+(too\s+)?(brief|short|concise)\b/i,
      /\bi\s+(prefer|like|want)\s+(detailed|comprehensive|thorough)\b/i,
      /\bmore\s+(text|words|depth)\b/i,
    ],
    key: PREFERENCE_KEYS.RESPONSE_LENGTH,
    value: 'detailed',
    isNegation: false,
    confidence: 'high',
  },
];

/**
 * Patterns for detecting tone preferences
 */
const TONE_PATTERNS: PreferencePattern[] = [
  {
    patterns: [
      /\b(be\s+)?(more\s+)?(professional|formal)\b/i,
      /\bless\s+(casual|informal)\b/i,
    ],
    key: PREFERENCE_KEYS.RESPONSE_TONE,
    value: 'professional',
    isNegation: false,
    confidence: 'high',
  },
  {
    patterns: [
      /\b(be\s+)?(more\s+)?(casual|informal|friendly|conversational)\b/i,
      /\bless\s+(formal|stiff)\b/i,
    ],
    key: PREFERENCE_KEYS.RESPONSE_TONE,
    value: 'casual',
    isNegation: false,
    confidence: 'high',
  },
];

/**
 * Patterns for detecting technical level preferences
 */
const TECHNICAL_PATTERNS: PreferencePattern[] = [
  {
    patterns: [
      /\bfocus\s+(on|more\s+on)\s+technical\b/i,
      /\bmore\s+technical\s+(detail|information|depth)\b/i,
      /\bi\s+(prefer|like|want)\s+technical\b/i,
      /\binclude\s+(technical|code|implementation)\b/i,
    ],
    key: PREFERENCE_KEYS.FOCUS_ON_TECH,
    value: true,
    isNegation: false,
    confidence: 'high',
  },
  {
    patterns: [
      /\bless\s+technical\b/i,
      /\b(skip|avoid)\s+(the\s+)?(technical|code)\b/i,
      /\bdon't\s+(be\s+)?(too\s+)?technical\b/i,
      /\bkeep\s+it\s+(simple|high-level)\b/i,
    ],
    key: PREFERENCE_KEYS.FOCUS_ON_TECH,
    value: false,
    isNegation: true,
    confidence: 'high',
  },
];

/**
 * Patterns for detecting example preferences
 */
const EXAMPLE_PATTERNS: PreferencePattern[] = [
  {
    patterns: [
      /\b(include|add|give)\s+(more\s+)?examples?\b/i,
      /\bi\s+(prefer|like|want)\s+examples?\b/i,
      /\bwith\s+examples?\b/i,
    ],
    key: PREFERENCE_KEYS.INCLUDE_EXAMPLES,
    value: true,
    isNegation: false,
    confidence: 'high',
  },
  {
    patterns: [
      /\b(skip|don't\s+include|no)\s+examples?\b/i,
      /\bwithout\s+examples?\b/i,
    ],
    key: PREFERENCE_KEYS.INCLUDE_EXAMPLES,
    value: false,
    isNegation: true,
    confidence: 'high',
  },
];

/**
 * Patterns for detecting metrics preferences
 */
const METRICS_PATTERNS: PreferencePattern[] = [
  {
    patterns: [
      /\b(include|add|mention)\s+(metrics?|numbers?|data|stats)\b/i,
      /\bfocus\s+on\s+(metrics?|numbers?|quantitative)\b/i,
      /\bmore\s+(metrics?|numbers?|quantitative)\b/i,
    ],
    key: PREFERENCE_KEYS.INCLUDE_METRICS,
    value: true,
    isNegation: false,
    confidence: 'high',
  },
  {
    patterns: [
      /\b(skip|don't\s+include|no)\s+(metrics?|numbers?|stats)\b/i,
      /\bless\s+(metrics?|numbers?)\b/i,
    ],
    key: PREFERENCE_KEYS.INCLUDE_METRICS,
    value: false,
    isNegation: true,
    confidence: 'high',
  },
];

/**
 * Patterns for detecting bullet point preferences
 */
const BULLET_PATTERNS: PreferencePattern[] = [
  {
    patterns: [
      /\buse\s+(bullet\s+)?points\b/i,
      /\b(format|write)\s+(as|with|in)\s+(bullet\s+)?points\b/i,
      /\bi\s+(prefer|like)\s+(bullet\s+)?points\b/i,
    ],
    key: PREFERENCE_KEYS.USE_BULLET_POINTS,
    value: true,
    isNegation: false,
    confidence: 'high',
  },
  {
    patterns: [
      /\bno\s+(bullet\s+)?points\b/i,
      /\bwrite\s+(in\s+)?prose\b/i,
      /\bparagraph\s+form(at)?\b/i,
    ],
    key: PREFERENCE_KEYS.USE_BULLET_POINTS,
    value: false,
    isNegation: true,
    confidence: 'high',
  },
];

/**
 * Patterns for detecting follow-up question preferences
 */
const FOLLOWUP_PATTERNS: PreferencePattern[] = [
  {
    patterns: [
      /\b(ask|include)\s+(follow-?up|clarifying)\s+questions?\b/i,
      /\bfeel\s+free\s+to\s+ask\b/i,
    ],
    key: PREFERENCE_KEYS.ASK_FOLLOWUPS,
    value: true,
    isNegation: false,
    confidence: 'high',
  },
  {
    patterns: [
      /\bdon't\s+ask\s+(questions?|follow-?ups?)\b/i,
      /\bno\s+(follow-?up|clarifying)\s+questions?\b/i,
      /\bjust\s+(answer|respond)\b/i,
    ],
    key: PREFERENCE_KEYS.ASK_FOLLOWUPS,
    value: false,
    isNegation: true,
    confidence: 'high',
  },
];

/**
 * Patterns for cover letter preferences
 */
const COVER_LETTER_PATTERNS: PreferencePattern[] = [
  {
    patterns: [
      /\bdon't\s+(suggest|include|generate)\s+cover\s+letters?\b/i,
      /\bno\s+cover\s+letters?\b/i,
      /\bskip\s+(the\s+)?cover\s+letters?\b/i,
    ],
    key: 'skip_cover_letters',
    value: true,
    isNegation: true,
    confidence: 'high',
  },
];

/**
 * Patterns for salary information preferences
 */
const SALARY_PATTERNS: PreferencePattern[] = [
  {
    patterns: [
      /\b(include|add|mention)\s+salary\b/i,
      /\balways\s+mention\s+salary\b/i,
    ],
    key: PREFERENCE_KEYS.INCLUDE_SALARY_INFO,
    value: true,
    isNegation: false,
    confidence: 'high',
  },
  {
    patterns: [
      /\bdon't\s+(mention|include)\s+salary\b/i,
      /\bskip\s+salary\b/i,
    ],
    key: PREFERENCE_KEYS.INCLUDE_SALARY_INFO,
    value: false,
    isNegation: true,
    confidence: 'high',
  },
];

// Combine all patterns
const ALL_PATTERNS: PreferencePattern[] = [
  ...LENGTH_PATTERNS,
  ...TONE_PATTERNS,
  ...TECHNICAL_PATTERNS,
  ...EXAMPLE_PATTERNS,
  ...METRICS_PATTERNS,
  ...BULLET_PATTERNS,
  ...FOLLOWUP_PATTERNS,
  ...COVER_LETTER_PATTERNS,
  ...SALARY_PATTERNS,
];

// ============================================
// CONTEXT DETECTION
// ============================================

/**
 * Determine the category based on keywords in the message
 */
function detectCategory(message: string): PreferenceCategory {
  const lower = message.toLowerCase();

  if (/\bcover\s+letter|application|apply\b/.test(lower)) {
    return 'job-analysis';
  }
  if (/\binterview|prep|question|practice\b/.test(lower)) {
    return 'interview-prep';
  }
  if (/\bcompany|research|culture\b/.test(lower)) {
    return 'company-research';
  }
  if (/\bstory|star|experience|achievement\b/.test(lower)) {
    return 'stories';
  }
  if (/\bresume|profile|skills?\b/.test(lower)) {
    return 'resume';
  }
  if (/\bresponse|answer|tone|format|length\b/.test(lower)) {
    return 'communication';
  }

  return 'general';
}

// ============================================
// MAIN PARSING FUNCTION
// ============================================

export interface ParsePreferencesResult {
  hasPreferences: boolean;
  preferences: DetectedPreference[];
}

/**
 * Parse a user message to detect explicit preference statements
 */
export function parsePreferences(message: string): ParsePreferencesResult {
  const preferences: DetectedPreference[] = [];
  const category = detectCategory(message);

  // Check all patterns
  for (const patternDef of ALL_PATTERNS) {
    for (const pattern of patternDef.patterns) {
      const match = message.match(pattern);
      if (match) {
        // Check if we already have a preference for this key
        const existingIndex = preferences.findIndex((p) => p.key === patternDef.key);

        if (existingIndex === -1) {
          preferences.push({
            category: patternDef.key.includes('cover_letter') || patternDef.key.includes('salary')
              ? 'job-analysis'
              : category,
            key: patternDef.key,
            value: patternDef.value,
            confidence: patternDef.confidence,
            originalStatement: match[0],
            isNegation: patternDef.isNegation,
          });
        }

        break; // Found a match for this pattern definition, move to next
      }
    }
  }

  return {
    hasPreferences: preferences.length > 0,
    preferences,
  };
}

/**
 * Quick check if a message might contain preference statements
 * (faster than full parsing, useful for pre-filtering)
 */
export function mightContainPreferences(message: string): boolean {
  const lower = message.toLowerCase();

  const quickPatterns = [
    /\bi\s+(prefer|like|want)\b/,
    /\b(keep|make)\s+(it\s+)?(short|brief|detailed|longer)\b/,
    /\bdon't\s+(include|mention|add|be|ask)\b/,
    /\b(more|less)\s+(detail|technical|formal|casual)\b/,
    /\b(skip|avoid)\s+(the\s+)?\w+\b/,
    /\balways\s+(include|mention|add)\b/,
    /\bnever\s+(include|mention|add)\b/,
    /\bfocus\s+(on|more)\b/,
    /\b(use|format)\s+(bullet|points|prose)\b/,
  ];

  return quickPatterns.some((pattern) => pattern.test(lower));
}

/**
 * Check if a message is a correction of a previous response
 */
export function isCorrection(message: string): boolean {
  const lower = message.toLowerCase();

  const correctionPatterns = [
    /^(no,?\s+)?(that's\s+)?(too\s+)(long|short|technical|generic|brief)/,
    /^(no,?\s+)?(i\s+meant|actually|instead)/,
    /^(make\s+it|try\s+again)/,
    /^(shorter|longer|simpler|more\s+detail)/,
    /^(not\s+quite|that's\s+not)/,
  ];

  return correctionPatterns.some((pattern) => pattern.test(lower));
}

/**
 * Extract preference from a correction message
 */
export function parseCorrection(message: string): DetectedPreference | null {
  const lower = message.toLowerCase();

  // Check for length corrections
  if (/\b(too\s+long|shorter|more\s+concise|brief)\b/.test(lower)) {
    return {
      category: 'communication',
      key: PREFERENCE_KEYS.RESPONSE_LENGTH,
      value: 'concise',
      confidence: 'high',
      originalStatement: message,
      isNegation: false,
    };
  }

  if (/\b(too\s+short|longer|more\s+detail)\b/.test(lower)) {
    return {
      category: 'communication',
      key: PREFERENCE_KEYS.RESPONSE_LENGTH,
      value: 'detailed',
      confidence: 'high',
      originalStatement: message,
      isNegation: false,
    };
  }

  // Check for technical level corrections
  if (/\b(too\s+technical|simpler|less\s+tech)\b/.test(lower)) {
    return {
      category: 'communication',
      key: PREFERENCE_KEYS.FOCUS_ON_TECH,
      value: false,
      confidence: 'high',
      originalStatement: message,
      isNegation: true,
    };
  }

  if (/\b(more\s+technical|not\s+technical\s+enough)\b/.test(lower)) {
    return {
      category: 'communication',
      key: PREFERENCE_KEYS.FOCUS_ON_TECH,
      value: true,
      confidence: 'high',
      originalStatement: message,
      isNegation: false,
    };
  }

  // Check for generic corrections
  if (/\b(too\s+generic|more\s+specific|concrete)\b/.test(lower)) {
    return {
      category: 'communication',
      key: PREFERENCE_KEYS.INCLUDE_EXAMPLES,
      value: true,
      confidence: 'medium',
      originalStatement: message,
      isNegation: false,
    };
  }

  return null;
}

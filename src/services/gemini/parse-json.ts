/**
 * Safe JSON parsing for Gemini API responses.
 *
 * Handles two common failure modes:
 * 1. Code-fence wrapped responses (```json ... ```)
 * 2. Truncated JSON when the response hits MAX_TOKENS
 *
 * Uses `jsonrepair` as a fallback to recover partial/malformed JSON
 * before giving up.
 */
import { jsonrepair } from 'jsonrepair';

export interface ParseGeminiJsonOptions {
  /** Label for error/warning logs (e.g. function name) */
  context?: string;
  /** Value to return instead of throwing on parse failure */
  fallback?: unknown;
}

/**
 * Strip markdown code fences that Gemini sometimes wraps around JSON.
 */
function stripCodeFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    // Remove opening fence (```json or ```)
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '');
    // Remove closing fence
    cleaned = cleaned.replace(/\n?\s*```\s*$/, '');
  }
  return cleaned;
}

/**
 * Parse a Gemini API text response as JSON with automatic repair.
 *
 * Flow: strip fences → JSON.parse → on failure → jsonrepair → JSON.parse → fallback/throw
 */
export function parseGeminiJson<T = unknown>(
  text: string | undefined | null,
  options: ParseGeminiJsonOptions = {},
): T {
  const { context = 'parseGeminiJson', fallback } = options;

  if (!text) {
    if (fallback !== undefined) return fallback as T;
    throw new Error(`[${context}] Empty response text`);
  }

  const cleaned = stripCodeFences(text);

  // Fast path: standard JSON.parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall through to repair
  }

  // Slow path: attempt repair of truncated/malformed JSON
  try {
    const repaired = jsonrepair(cleaned);
    console.warn(`[${context}] JSON was malformed — repaired successfully`);
    return JSON.parse(repaired) as T;
  } catch (repairError) {
    const msg = `[${context}] JSON parse failed even after repair attempt`;
    console.error(msg, repairError);
    if (fallback !== undefined) return fallback as T;
    throw new Error(msg);
  }
}

/**
 * Check whether a Gemini response was truncated due to output token limit.
 */
export function wasResponseTruncated(response: {
  candidates?: Array<{ finishReason?: string }>;
}): boolean {
  return response?.candidates?.[0]?.finishReason === 'MAX_TOKENS';
}

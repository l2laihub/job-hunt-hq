/**
 * Job Description hashing utilities for duplicate detection
 */

/**
 * Normalize a job description for consistent hashing
 * - Lowercase
 * - Collapse whitespace
 * - Remove punctuation
 */
export function normalizeJD(jd: string): string {
  return jd
    .toLowerCase()
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/[^\w\s]/g, '')        // Remove punctuation
    .trim();
}

/**
 * Generate a hash for a job description
 * Used for duplicate detection and caching
 */
export function hashJD(jd: string): string {
  const normalized = normalizeJD(jd);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

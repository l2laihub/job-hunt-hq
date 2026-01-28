/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Based on the SuperMemo 2 algorithm, which is the foundation for Anki.
 * This implementation calculates optimal review intervals based on user ratings.
 *
 * Rating Scale (0-5):
 * 0 - Complete blackout, no recall
 * 1 - Incorrect response, but recognized answer when shown
 * 2 - Incorrect response, but recalled easily after seeing answer
 * 3 - Correct response with serious difficulty
 * 4 - Correct response with some hesitation
 * 5 - Perfect response
 *
 * Key Formula:
 * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 * where q is the quality rating (0-5) and EF is easiness factor
 */

import type { SRSData, SRSRating, MasteryLevel, TechnicalAnswer } from '@/src/types';

// Constants
const MIN_EASINESS_FACTOR = 1.3;
const DEFAULT_EASINESS_FACTOR = 2.5;
const PASSING_GRADE = 3; // Ratings >= 3 are considered "correct"

/**
 * Calculate the new easiness factor based on rating
 * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 */
export function calculateEasinessFactor(currentEF: number, rating: SRSRating): number {
  const newEF = currentEF + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  return Math.max(MIN_EASINESS_FACTOR, newEF);
}

/**
 * Calculate the next review interval in days
 *
 * SM-2 interval rules:
 * - If rating < 3: Reset to interval 1 (next day)
 * - If rating >= 3:
 *   - First successful review: interval = 1
 *   - Second successful review: interval = 6
 *   - Subsequent reviews: interval = previousInterval * EF
 */
export function calculateInterval(
  currentInterval: number,
  repetitionCount: number,
  easinessFactor: number,
  rating: SRSRating
): number {
  // Failed review - reset
  if (rating < PASSING_GRADE) {
    return 1; // Review tomorrow
  }

  // Successful review
  if (repetitionCount === 0) {
    return 1; // First review - tomorrow
  } else if (repetitionCount === 1) {
    return 6; // Second review - 6 days
  } else {
    // Subsequent reviews - multiply by easiness factor
    return Math.round(currentInterval * easinessFactor);
  }
}

/**
 * Calculate next repetition count
 * Reset to 0 if rating < 3, otherwise increment
 */
export function calculateRepetitionCount(currentCount: number, rating: SRSRating): number {
  if (rating < PASSING_GRADE) {
    return 0;
  }
  return currentCount + 1;
}

/**
 * Main function: Calculate all SRS data for next review
 */
export function calculateNextReview(currentData: SRSData, rating: SRSRating): SRSData {
  const now = new Date().toISOString();

  // Calculate new values
  const newEF = calculateEasinessFactor(currentData.easinessFactor, rating);
  const newRepCount = calculateRepetitionCount(currentData.repetitionCount, rating);
  const newInterval = calculateInterval(
    currentData.interval,
    currentData.repetitionCount, // Use current count to determine interval logic
    newEF,
    rating
  );

  // Calculate next review date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);

  // Add to review history
  const newHistory = [
    ...currentData.reviewHistory,
    {
      date: now,
      rating,
      intervalAtReview: currentData.interval,
    },
  ];

  return {
    easinessFactor: newEF,
    repetitionCount: newRepCount,
    interval: newInterval,
    nextReviewDate: nextDate.toISOString(),
    lastReviewDate: now,
    reviewHistory: newHistory,
  };
}

/**
 * Get mastery level based on SRS data
 */
export function getMasteryLevel(srsData?: SRSData): MasteryLevel {
  if (!srsData) return 'new';

  const { repetitionCount, interval } = srsData;

  if (repetitionCount === 0) {
    return 'new';
  } else if (repetitionCount <= 2 || interval <= 6) {
    return 'learning';
  } else if (interval <= 21) {
    return 'reviewing';
  } else {
    return 'mastered';
  }
}

/**
 * Check if a card is due for review
 */
export function isDue(srsData?: SRSData): boolean {
  if (!srsData) return true; // New cards are always "due"

  const now = new Date();
  const dueDate = new Date(srsData.nextReviewDate);

  return now >= dueDate;
}

/**
 * Get days until next review (negative if overdue)
 */
export function getDaysUntilReview(srsData?: SRSData): number {
  if (!srsData) return 0;

  const now = new Date();
  const dueDate = new Date(srsData.nextReviewDate);

  const diffTime = dueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Sort cards by review priority
 * Priority order:
 * 1. Overdue cards (most overdue first)
 * 2. Due today
 * 3. New cards
 * 4. Future cards
 */
export function sortByReviewPriority<T extends { srsData?: SRSData }>(cards: T[]): T[] {
  return [...cards].sort((a, b) => {
    const daysA = getDaysUntilReview(a.srsData);
    const daysB = getDaysUntilReview(b.srsData);

    // Both are new cards - maintain original order
    if (!a.srsData && !b.srsData) return 0;

    // New cards come after due cards but before future cards
    if (!a.srsData) return daysB <= 0 ? 1 : -1;
    if (!b.srsData) return daysA <= 0 ? -1 : 1;

    // Sort by days until review (overdue first)
    return daysA - daysB;
  });
}

/**
 * Get cards that are due for review
 */
export function getDueCards<T extends { srsData?: SRSData }>(cards: T[]): T[] {
  return cards.filter((card) => isDue(card.srsData));
}

/**
 * Get new cards (no SRS data yet)
 */
export function getNewCards<T extends { srsData?: SRSData }>(cards: T[]): T[] {
  return cards.filter((card) => !card.srsData);
}

/**
 * Get cards by mastery level
 */
export function getCardsByMastery<T extends { srsData?: SRSData }>(
  cards: T[],
  level: MasteryLevel
): T[] {
  return cards.filter((card) => getMasteryLevel(card.srsData) === level);
}

/**
 * Calculate study queue for a session
 * Returns cards sorted by priority with optional limits
 */
export function getStudyQueue(
  answers: TechnicalAnswer[],
  options: {
    maxNew?: number;
    maxReview?: number;
    applicationId?: string;
    profileId?: string;
  } = {}
): TechnicalAnswer[] {
  const { maxNew = 10, maxReview = 50, applicationId, profileId } = options;

  // Filter by profile/application if specified
  let filtered = answers;
  if (profileId) {
    filtered = filtered.filter((a) => !a.profileId || a.profileId === profileId);
  }
  if (applicationId) {
    filtered = filtered.filter((a) => a.metadata.applicationId === applicationId);
  }

  // Separate into categories
  const dueCards = getDueCards(filtered).filter((c) => c.srsData); // Due and not new
  const newCards = getNewCards(filtered);

  // Sort each category
  const sortedDue = sortByReviewPriority(dueCards);
  const shuffledNew = [...newCards].sort(() => Math.random() - 0.5);

  // Apply limits and combine
  const limitedDue = sortedDue.slice(0, maxReview);
  const limitedNew = shuffledNew.slice(0, maxNew);

  // Interleave new cards with review cards (1 new for every 5 reviews)
  const result: TechnicalAnswer[] = [];
  let reviewIndex = 0;
  let newIndex = 0;

  while (reviewIndex < limitedDue.length || newIndex < limitedNew.length) {
    // Add up to 5 review cards
    for (let i = 0; i < 5 && reviewIndex < limitedDue.length; i++) {
      result.push(limitedDue[reviewIndex++]);
    }
    // Add 1 new card
    if (newIndex < limitedNew.length) {
      result.push(limitedNew[newIndex++]);
    }
  }

  return result;
}

/**
 * Calculate study statistics
 */
export function calculateStudyStats(answers: TechnicalAnswer[]): {
  total: number;
  new: number;
  learning: number;
  reviewing: number;
  mastered: number;
  dueToday: number;
  overdue: number;
} {
  const stats = {
    total: answers.length,
    new: 0,
    learning: 0,
    reviewing: 0,
    mastered: 0,
    dueToday: 0,
    overdue: 0,
  };

  for (const answer of answers) {
    const level = getMasteryLevel(answer.srsData);
    stats[level]++;

    if (isDue(answer.srsData)) {
      const days = getDaysUntilReview(answer.srsData);
      if (days < 0) {
        stats.overdue++;
      }
      stats.dueToday++;
    }
  }

  return stats;
}

/**
 * Calculate readiness score (0-100) for an interview
 * Based on how well-prepared the flashcards are
 */
export function calculateReadinessScore(answers: TechnicalAnswer[]): number {
  if (answers.length === 0) return 0;

  let totalScore = 0;

  for (const answer of answers) {
    const level = getMasteryLevel(answer.srsData);
    const isDueNow = isDue(answer.srsData);

    // Base score by mastery level
    let cardScore = 0;
    switch (level) {
      case 'mastered':
        cardScore = 100;
        break;
      case 'reviewing':
        cardScore = 70;
        break;
      case 'learning':
        cardScore = 40;
        break;
      case 'new':
        cardScore = 10;
        break;
    }

    // Penalize if due/overdue
    if (isDueNow && level !== 'new') {
      const daysOverdue = Math.abs(getDaysUntilReview(answer.srsData));
      cardScore = Math.max(cardScore - daysOverdue * 5, 10);
    }

    totalScore += cardScore;
  }

  return Math.round(totalScore / answers.length);
}

/**
 * Initialize SRS data for a new card
 */
export function initializeSRSData(): SRSData {
  return {
    easinessFactor: DEFAULT_EASINESS_FACTOR,
    repetitionCount: 0,
    interval: 0,
    nextReviewDate: new Date().toISOString(),
    reviewHistory: [],
  };
}

/**
 * Calculate streak (consecutive days studied)
 */
export function calculateStreak(studyDates: string[]): { current: number; longest: number } {
  if (studyDates.length === 0) return { current: 0, longest: 0 };

  // Sort dates (most recent first)
  const sorted = [...studyDates]
    .map((d) => new Date(d).toDateString())
    .filter((d, i, arr) => arr.indexOf(d) === i) // Unique dates only
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Check if studied today or yesterday to start current streak
  const startedRecently = sorted[0] === today || sorted[0] === yesterday;

  for (let i = 0; i < sorted.length; i++) {
    const current = new Date(sorted[i]);
    const prev = i > 0 ? new Date(sorted[i - 1]) : null;

    if (prev) {
      const diff = Math.floor((prev.getTime() - current.getTime()) / 86400000);
      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);
  currentStreak = startedRecently ? tempStreak : 0;

  // If studied today, include today in current streak
  if (sorted[0] === today && tempStreak > 0) {
    currentStreak = tempStreak;
  }

  return { current: currentStreak, longest: longestStreak };
}

/**
 * Format interval for display
 */
export function formatInterval(days: number): string {
  if (days === 0) return 'Now';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  }
  const years = Math.round(days / 365);
  return years === 1 ? '1 year' : `${years} years`;
}

/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Implementation of the SuperMemo SM-2 algorithm for optimal flashcard review scheduling.
 * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 *
 * Quality ratings:
 * - 0 (Again): Complete failure to recall
 * - 3 (Hard): Correct response with significant difficulty
 * - 4 (Good): Correct response after hesitation
 * - 5 (Easy): Perfect instant response
 */

/**
 * Quality ratings for SM-2 algorithm.
 * Uses only the ratings relevant to flashcard review UI:
 * - 0: Again (complete failure)
 * - 3: Hard (correct but difficult)
 * - 4: Good (correct with hesitation)
 * - 5: Easy (perfect response)
 */
export type QualityRating = 0 | 3 | 4 | 5;

/**
 * All possible quality ratings (0-5) for internal calculations.
 * The full range is used for ease factor calculation.
 */
export type FullQualityRating = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Result of SM-2 calculation after a review.
 */
export interface SM2Result {
  /** Updated ease factor (1.3 - 3.0) */
  easeFactor: number;
  /** Days until next review */
  interval: number;
  /** Number of consecutive successful reviews */
  repetitions: number;
  /** ISO datetime string for next review */
  nextReviewDate: string;
}

/**
 * Input parameters for SM-2 calculation.
 */
export interface SM2Input {
  /** Quality of recall (0, 3, 4, or 5) */
  quality: QualityRating;
  /** Current ease factor (default 2.5) */
  currentEaseFactor: number;
  /** Current interval in days */
  currentInterval: number;
  /** Current consecutive successful reviews */
  currentRepetitions: number;
}

/**
 * Default ease factor for new cards.
 */
export const DEFAULT_EASE_FACTOR = 2.5;

/**
 * Minimum allowed ease factor.
 */
export const MIN_EASE_FACTOR = 1.3;

/**
 * Maximum allowed ease factor.
 */
export const MAX_EASE_FACTOR = 3.0;

/**
 * Bonus multiplier for "Easy" rating.
 */
export const EASY_BONUS = 1.3;

/**
 * Add days to a date and return ISO string.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate new ease factor based on quality rating.
 * Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 *
 * @param currentEaseFactor - Current ease factor
 * @param quality - Quality rating (0-5)
 * @returns New ease factor, clamped to [1.3, 3.0]
 */
export function calculateEaseFactor(
  currentEaseFactor: number,
  quality: FullQualityRating
): number {
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const newEaseFactor = currentEaseFactor + delta;

  // Clamp to valid range
  return Math.max(MIN_EASE_FACTOR, Math.min(MAX_EASE_FACTOR, newEaseFactor));
}

/**
 * Calculate next review parameters using the SM-2 algorithm.
 *
 * Algorithm:
 * 1. If quality < 3 (failure), reset repetitions and review again tomorrow
 * 2. If quality >= 3 (success):
 *    - First success: interval = 1 day
 *    - Second success: interval = 3 days
 *    - Subsequent: interval = previous interval * ease factor
 * 3. Easy rating (5) gets a 1.3x bonus to interval
 * 4. Ease factor is always updated based on quality
 *
 * @param input - SM2 calculation input parameters
 * @returns SM2 result with new scheduling parameters
 */
export function calculateSM2(input: SM2Input): SM2Result {
  const { quality, currentEaseFactor, currentInterval, currentRepetitions } = input;

  // Always update ease factor based on quality
  const newEaseFactor = calculateEaseFactor(currentEaseFactor, quality);

  let newInterval: number;
  let newRepetitions: number;

  if (quality < 3) {
    // Failed recall: reset progress, review again tomorrow
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // Successful recall: increment repetitions and calculate new interval
    newRepetitions = currentRepetitions + 1;

    if (newRepetitions === 1) {
      // First successful review: review tomorrow
      newInterval = 1;
    } else if (newRepetitions === 2) {
      // Second successful review: review in 3 days
      newInterval = 3;
    } else {
      // Subsequent successful reviews: interval * ease factor
      newInterval = Math.round(currentInterval * newEaseFactor);
    }

    // Apply bonus for "Easy" rating
    if (quality === 5) {
      newInterval = Math.round(newInterval * EASY_BONUS);
    }
  }

  // Calculate next review date
  const nextReviewDate = addDays(new Date(), newInterval).toISOString();

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate,
  };
}

/**
 * Get the next review date based on interval in days.
 *
 * @param intervalDays - Number of days until next review
 * @returns ISO datetime string for next review
 */
export function getNextReviewDate(intervalDays: number): string {
  return addDays(new Date(), intervalDays).toISOString();
}

/**
 * Check if a card is due for review.
 *
 * @param nextReviewDate - ISO datetime string of next review, or null
 * @returns True if card is due (null date or past/present date)
 */
export function isCardDueForReview(nextReviewDate: string | null): boolean {
  if (nextReviewDate === null) {
    return true; // Never reviewed, due immediately
  }
  return new Date(nextReviewDate) <= new Date();
}

/**
 * Check if a card is considered "mastered" (interval > 21 days).
 *
 * @param interval - Current interval in days
 * @returns True if card is mastered
 */
export function isCardMastered(interval: number): boolean {
  return interval > 21;
}

/**
 * Get a human-readable description of the rating.
 */
export function getRatingLabel(quality: QualityRating): string {
  switch (quality) {
    case 0:
      return 'Again';
    case 3:
      return 'Hard';
    case 4:
      return 'Good';
    case 5:
      return 'Easy';
  }
}

/**
 * Get the estimated next interval based on rating (for UI preview).
 * Shows what the interval would be if the user selects this rating.
 *
 * @param quality - Potential quality rating
 * @param currentEaseFactor - Current ease factor
 * @param currentInterval - Current interval
 * @param currentRepetitions - Current repetitions
 * @returns Estimated interval in days
 */
export function getEstimatedInterval(
  quality: QualityRating,
  currentEaseFactor: number,
  currentInterval: number,
  currentRepetitions: number
): number {
  const result = calculateSM2({
    quality,
    currentEaseFactor,
    currentInterval,
    currentRepetitions,
  });
  return result.interval;
}

/**
 * Format interval as human-readable string.
 *
 * @param days - Interval in days
 * @returns Human-readable string like "1 day", "3 days", "2 weeks"
 */
export function formatInterval(days: number): string {
  if (days === 0) {
    return 'now';
  }
  if (days === 1) {
    return '1 day';
  }
  if (days < 7) {
    return `${days} days`;
  }
  if (days < 14) {
    return '1 week';
  }
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks} weeks`;
  }
  if (days < 60) {
    return '1 month';
  }
  const months = Math.round(days / 30);
  return `${months} months`;
}

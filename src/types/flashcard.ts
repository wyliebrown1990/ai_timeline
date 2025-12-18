import { z } from 'zod';

/**
 * Flashcard Types
 *
 * User-facing flashcard system with spaced repetition support (SM-2 algorithm).
 * Enables users to add milestones and concepts to personal flashcard collections,
 * organize them into custom packs, and track review sessions.
 */

// =============================================================================
// UserFlashcard Schema - Individual cards with spaced repetition fields
// =============================================================================

/**
 * A flashcard saved by a user, referencing a milestone or concept.
 * Includes SM-2 spaced repetition algorithm fields for optimal review scheduling.
 */
export const UserFlashcardSchema = z.object({
  id: z.string().uuid(),
  sourceType: z.enum(['milestone', 'concept']),
  sourceId: z.string(), // E2017_TRANSFORMER or C_SELF_ATTENTION
  packIds: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  // Spaced repetition (SM-2 algorithm)
  easeFactor: z.number().min(1.3).max(3.0).default(2.5),
  interval: z.number().int().min(0).default(0), // Days until next review
  repetitions: z.number().int().min(0).default(0), // Consecutive correct answers
  nextReviewDate: z.string().datetime().nullable().default(null),
  lastReviewedAt: z.string().datetime().nullable().default(null),
});

export type UserFlashcard = z.infer<typeof UserFlashcardSchema>;

// =============================================================================
// FlashcardPack Schema - Custom deck organization
// =============================================================================

/**
 * A collection/deck for organizing flashcards.
 * Users can create custom packs to group related cards.
 */
export const FlashcardPackSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  isDefault: z.boolean().default(false), // System packs can't be deleted
  createdAt: z.string().datetime(),
});

export type FlashcardPack = z.infer<typeof FlashcardPackSchema>;

// =============================================================================
// FlashcardReviewSession Schema - Session tracking
// =============================================================================

/**
 * Tracks a single review session for analytics and progress.
 * Sessions can be for a specific pack or all due cards.
 */
export const FlashcardReviewSessionSchema = z.object({
  id: z.string().uuid(),
  packId: z.string().nullable(), // null = all due cards
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  cardsReviewed: z.number().int().min(0),
  cardsCorrect: z.number().int().min(0),
  cardsToReview: z.number().int().min(0), // "Review Again" count
});

export type FlashcardReviewSession = z.infer<typeof FlashcardReviewSessionSchema>;

// =============================================================================
// FlashcardStats Schema - Aggregate statistics
// =============================================================================

/**
 * Aggregate statistics for the user's flashcard progress.
 * Updated after each review session.
 */
export const FlashcardStatsSchema = z.object({
  totalCards: z.number().int().min(0),
  cardsDueToday: z.number().int().min(0),
  cardsReviewedToday: z.number().int().min(0),
  currentStreak: z.number().int().min(0), // Days in a row of study
  longestStreak: z.number().int().min(0),
  masteredCards: z.number().int().min(0), // interval > 21 days
  lastStudyDate: z.string().datetime().nullable(),
});

export type FlashcardStats = z.infer<typeof FlashcardStatsSchema>;

// =============================================================================
// Constants - Default pack colors and system packs
// =============================================================================

/**
 * Available colors for flashcard packs.
 * Users select from this palette when creating custom packs.
 */
export const PACK_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6B7280', // Gray
] as const;

export type PackColor = (typeof PACK_COLORS)[number];

/**
 * Default system packs created on first use.
 * These cannot be deleted by the user.
 */
export const DEFAULT_PACKS: Omit<FlashcardPack, 'id' | 'createdAt'>[] = [
  { name: 'All Cards', color: '#3B82F6', isDefault: true },
  { name: 'Recently Added', color: '#10B981', isDefault: true },
];

// =============================================================================
// localStorage Keys
// =============================================================================

/**
 * Keys used for persisting flashcard data in localStorage.
 */
export const FLASHCARD_STORAGE_KEYS = {
  CARDS: 'ai-timeline-flashcards',
  PACKS: 'ai-timeline-flashcard-packs',
  STATS: 'ai-timeline-flashcard-stats',
  SESSIONS: 'ai-timeline-flashcard-sessions',
} as const;

// =============================================================================
// Helper Functions - Validation
// =============================================================================

/**
 * Validate a single user flashcard
 */
export function validateUserFlashcard(data: unknown): UserFlashcard {
  return UserFlashcardSchema.parse(data);
}

/**
 * Safely validate a user flashcard
 */
export function safeParseUserFlashcard(data: unknown) {
  return UserFlashcardSchema.safeParse(data);
}

/**
 * Validate a single flashcard pack
 */
export function validateFlashcardPack(data: unknown): FlashcardPack {
  return FlashcardPackSchema.parse(data);
}

/**
 * Safely validate a flashcard pack
 */
export function safeParseFlashcardPack(data: unknown) {
  return FlashcardPackSchema.safeParse(data);
}

/**
 * Validate a single review session
 */
export function validateFlashcardReviewSession(data: unknown): FlashcardReviewSession {
  return FlashcardReviewSessionSchema.parse(data);
}

/**
 * Safely validate a review session
 */
export function safeParseFlashcardReviewSession(data: unknown) {
  return FlashcardReviewSessionSchema.safeParse(data);
}

/**
 * Validate flashcard stats
 */
export function validateFlashcardStats(data: unknown): FlashcardStats {
  return FlashcardStatsSchema.parse(data);
}

/**
 * Safely validate flashcard stats
 */
export function safeParseFlashcardStats(data: unknown) {
  return FlashcardStatsSchema.safeParse(data);
}

// =============================================================================
// Helper Functions - Data Creation
// =============================================================================

/**
 * Create a new UserFlashcard with default SM-2 values.
 * Requires generateUUID from caller for consistent ID generation.
 */
export function createUserFlashcard(
  generateId: () => string,
  sourceType: UserFlashcard['sourceType'],
  sourceId: string,
  packIds: string[] = []
): UserFlashcard {
  return {
    id: generateId(),
    sourceType,
    sourceId,
    packIds,
    createdAt: new Date().toISOString(),
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(), // Due immediately
    lastReviewedAt: null,
  };
}

/**
 * Create a new FlashcardPack with specified properties.
 */
export function createFlashcardPack(
  generateId: () => string,
  name: string,
  color: string = PACK_COLORS[0],
  description?: string,
  isDefault: boolean = false
): FlashcardPack {
  return {
    id: generateId(),
    name,
    description,
    color,
    isDefault,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create initial empty stats object.
 */
export function createInitialStats(): FlashcardStats {
  return {
    totalCards: 0,
    cardsDueToday: 0,
    cardsReviewedToday: 0,
    currentStreak: 0,
    longestStreak: 0,
    masteredCards: 0,
    lastStudyDate: null,
  };
}

// =============================================================================
// SM-2 Algorithm Helpers
// =============================================================================

/**
 * Quality ratings for SM-2 algorithm.
 * 0-2: Failed (reset repetitions)
 * 3: Correct but difficult
 * 4: Correct with some hesitation
 * 5: Perfect recall
 */
export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Calculate next review parameters using SM-2 algorithm.
 * Returns updated easeFactor, interval, and repetitions.
 */
export function calculateNextReview(
  quality: QualityRating,
  currentEaseFactor: number,
  currentInterval: number,
  currentRepetitions: number
): { easeFactor: number; interval: number; repetitions: number } {
  // Update ease factor based on quality
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  let newEaseFactor =
    currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Clamp ease factor to valid range [1.3, 3.0]
  newEaseFactor = Math.max(1.3, Math.min(3.0, newEaseFactor));

  let newInterval: number;
  let newRepetitions: number;

  if (quality < 3) {
    // Failed: reset repetitions, interval = 0 (review again)
    newRepetitions = 0;
    newInterval = 0;
  } else {
    // Success: increment repetitions and calculate new interval
    newRepetitions = currentRepetitions + 1;

    if (newRepetitions === 1) {
      newInterval = 1; // First success: review tomorrow
    } else if (newRepetitions === 2) {
      newInterval = 6; // Second success: review in 6 days
    } else {
      // Subsequent successes: interval * ease factor
      newInterval = Math.round(currentInterval * newEaseFactor);
    }
  }

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
  };
}

/**
 * Get the next review date based on interval in days.
 */
export function getNextReviewDate(intervalDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + intervalDays);
  return date.toISOString();
}

/**
 * Check if a card is due for review.
 */
export function isCardDue(card: UserFlashcard): boolean {
  if (card.nextReviewDate === null) {
    return true; // Never reviewed, due immediately
  }
  return new Date(card.nextReviewDate) <= new Date();
}

/**
 * Check if a card is considered "mastered" (interval > 21 days).
 */
export function isCardMastered(card: UserFlashcard): boolean {
  return card.interval > 21;
}

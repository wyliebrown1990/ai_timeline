/**
 * User Flashcards Service
 *
 * Handles database operations for user flashcards with SM-2 spaced repetition.
 * Manages flashcard CRUD, review scheduling, and pack organization.
 *
 * Sprint 38 - User Data Migration
 */

import { prisma } from '../db';

// =============================================================================
// Types
// =============================================================================

/**
 * Flashcard response format for API
 */
export interface UserFlashcardResponse {
  id: string;
  sourceType: string;
  sourceId: string;
  packIds: string[];
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
}

/**
 * SM-2 review result with updated scheduling
 */
export interface ReviewResult {
  id: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  isMastered: boolean;
}

/**
 * User flashcard pack response
 */
export interface UserPackResponse {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isDefault: boolean;
  cardCount: number;
  createdAt: string;
}

// =============================================================================
// Flashcard Operations
// =============================================================================

/**
 * Get all flashcards for a session, optionally filtered by pack.
 *
 * @param sessionId - User session ID
 * @param packId - Optional pack ID to filter by
 * @returns Array of flashcards
 */
export async function getFlashcards(
  sessionId: string,
  packId?: string
): Promise<UserFlashcardResponse[]> {
  const flashcards = await prisma.userFlashcard.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
  });

  // Filter by pack if specified
  let filtered = flashcards;
  if (packId) {
    filtered = flashcards.filter((fc) => {
      const packs = JSON.parse(fc.packIds) as string[];
      return packs.includes(packId);
    });
  }

  return filtered.map(transformFlashcard);
}

/**
 * Get flashcards due for review (nextReviewDate <= now or null).
 *
 * @param sessionId - User session ID
 * @param packId - Optional pack ID to filter by
 * @returns Array of due flashcards
 */
export async function getDueCards(
  sessionId: string,
  packId?: string
): Promise<UserFlashcardResponse[]> {
  const dueCards = await prisma.userFlashcard.findMany({
    where: {
      sessionId,
      OR: [
        { nextReviewDate: null },
        { nextReviewDate: { lte: new Date() } },
      ],
    },
    orderBy: { nextReviewDate: 'asc' },
  });

  // Filter by pack if specified
  let filtered = dueCards;
  if (packId) {
    filtered = dueCards.filter((fc) => {
      const packs = JSON.parse(fc.packIds) as string[];
      return packs.includes(packId);
    });
  }

  return filtered.map(transformFlashcard);
}

/**
 * Get a single flashcard by ID.
 *
 * @param sessionId - User session ID
 * @param cardId - Flashcard ID
 * @returns Flashcard or null
 */
export async function getFlashcardById(
  sessionId: string,
  cardId: string
): Promise<UserFlashcardResponse | null> {
  const flashcard = await prisma.userFlashcard.findFirst({
    where: { id: cardId, sessionId },
  });

  if (!flashcard) return null;
  return transformFlashcard(flashcard);
}

/**
 * Check if a flashcard already exists for this source.
 *
 * @param sessionId - User session ID
 * @param sourceType - Source type (milestone, concept, flashcard)
 * @param sourceId - Source ID
 * @returns true if exists
 */
export async function flashcardExists(
  sessionId: string,
  sourceType: string,
  sourceId: string
): Promise<boolean> {
  const existing = await prisma.userFlashcard.findUnique({
    where: {
      sessionId_sourceType_sourceId: {
        sessionId,
        sourceType,
        sourceId,
      },
    },
    select: { id: true },
  });
  return existing !== null;
}

/**
 * Add a flashcard to user's collection.
 * Creates the card with default SM-2 values and schedules for immediate review.
 *
 * @param sessionId - User session ID
 * @param sourceType - Source type (milestone, concept, flashcard)
 * @param sourceId - Source ID
 * @param packIds - Optional pack IDs to assign
 * @returns Created flashcard
 */
export async function addFlashcard(
  sessionId: string,
  sourceType: string,
  sourceId: string,
  packIds: string[] = []
): Promise<UserFlashcardResponse> {
  const flashcard = await prisma.userFlashcard.create({
    data: {
      sessionId,
      sourceType,
      sourceId,
      packIds: JSON.stringify(packIds),
      nextReviewDate: new Date(), // Due immediately for first review
    },
  });

  // Update stats - increment total and due count
  await prisma.userStudyStats.upsert({
    where: { sessionId },
    update: {
      totalCards: { increment: 1 },
      cardsDueToday: { increment: 1 },
    },
    create: {
      sessionId,
      totalCards: 1,
      cardsDueToday: 1,
    },
  });

  return transformFlashcard(flashcard);
}

/**
 * Review a flashcard using the SM-2 spaced repetition algorithm.
 * Quality rating: 0 = complete blackout, 5 = perfect response
 *
 * @param sessionId - User session ID
 * @param cardId - Flashcard ID
 * @param quality - Review quality (0-5)
 * @returns Updated flashcard with new schedule
 */
export async function reviewFlashcard(
  sessionId: string,
  cardId: string,
  quality: number
): Promise<ReviewResult> {
  const flashcard = await prisma.userFlashcard.findFirst({
    where: { id: cardId, sessionId },
  });

  if (!flashcard) {
    throw new Error('Flashcard not found');
  }

  // SM-2 algorithm implementation
  // Calculate new ease factor (EF)
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  let newEaseFactor = flashcard.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  // Clamp ease factor between 1.3 and 3.0
  newEaseFactor = Math.max(1.3, Math.min(3.0, newEaseFactor));

  let newInterval: number;
  let newRepetitions: number;

  if (quality < 3) {
    // Failed review - reset repetitions and interval
    newRepetitions = 0;
    newInterval = 0;
  } else {
    // Successful review
    newRepetitions = flashcard.repetitions + 1;

    if (newRepetitions === 1) {
      // First successful review
      newInterval = 1;
    } else if (newRepetitions === 2) {
      // Second successful review
      newInterval = 6;
    } else {
      // Subsequent reviews: interval = previous interval * EF
      newInterval = Math.round(flashcard.interval * newEaseFactor);
    }
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  // Update the flashcard
  const updated = await prisma.userFlashcard.update({
    where: { id: cardId },
    data: {
      easeFactor: newEaseFactor,
      interval: newInterval,
      repetitions: newRepetitions,
      nextReviewDate,
      lastReviewedAt: new Date(),
    },
  });

  // Check if card is now "mastered" (interval > 21 days)
  const isMastered = newInterval > 21;
  const wasMastered = flashcard.interval > 21;

  // Update stats
  await prisma.userStudyStats.upsert({
    where: { sessionId },
    update: {
      cardsReviewedToday: { increment: 1 },
      lastStudyDate: new Date(),
      // Only increment mastered if newly mastered
      ...(isMastered && !wasMastered && { masteredCards: { increment: 1 } }),
      // Decrement if was mastered but now isn't
      ...(wasMastered && !isMastered && { masteredCards: { decrement: 1 } }),
    },
    create: {
      sessionId,
      cardsReviewedToday: 1,
      lastStudyDate: new Date(),
      masteredCards: isMastered ? 1 : 0,
    },
  });

  return {
    id: updated.id,
    easeFactor: updated.easeFactor,
    interval: updated.interval,
    repetitions: updated.repetitions,
    nextReviewDate: updated.nextReviewDate?.toISOString() ?? new Date().toISOString(),
    isMastered,
  };
}

/**
 * Remove a flashcard from user's collection.
 *
 * @param sessionId - User session ID
 * @param cardId - Flashcard ID
 * @returns true if deleted
 */
export async function removeFlashcard(
  sessionId: string,
  cardId: string
): Promise<boolean> {
  // Get the card first to check mastery status
  const card = await prisma.userFlashcard.findFirst({
    where: { id: cardId, sessionId },
  });

  if (!card) return false;

  const wasMastered = card.interval > 21;

  await prisma.userFlashcard.delete({
    where: { id: cardId },
  });

  // Update stats
  await prisma.userStudyStats.update({
    where: { sessionId },
    data: {
      totalCards: { decrement: 1 },
      ...(wasMastered && { masteredCards: { decrement: 1 } }),
    },
  });

  return true;
}

/**
 * Update flashcard's pack assignments.
 *
 * @param sessionId - User session ID
 * @param cardId - Flashcard ID
 * @param packIds - New pack IDs
 * @returns Updated flashcard
 */
export async function updateFlashcardPacks(
  sessionId: string,
  cardId: string,
  packIds: string[]
): Promise<UserFlashcardResponse | null> {
  const flashcard = await prisma.userFlashcard.findFirst({
    where: { id: cardId, sessionId },
  });

  if (!flashcard) return null;

  const updated = await prisma.userFlashcard.update({
    where: { id: cardId },
    data: { packIds: JSON.stringify(packIds) },
  });

  return transformFlashcard(updated);
}

// =============================================================================
// Pack Operations
// =============================================================================

/**
 * Get all packs for a session with card counts.
 *
 * @param sessionId - User session ID
 * @returns Array of packs with card counts
 */
export async function getPacks(sessionId: string): Promise<UserPackResponse[]> {
  const packs = await prisma.userFlashcardPack.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  // Get all flashcards to count per pack
  const flashcards = await prisma.userFlashcard.findMany({
    where: { sessionId },
    select: { packIds: true },
  });

  return packs.map((pack) => {
    // Count cards in this pack
    const cardCount = flashcards.filter((fc) => {
      const packIds = JSON.parse(fc.packIds) as string[];
      return packIds.includes(pack.id);
    }).length;

    return {
      id: pack.id,
      name: pack.name,
      description: pack.description,
      color: pack.color,
      isDefault: pack.isDefault,
      cardCount,
      createdAt: pack.createdAt.toISOString(),
    };
  });
}

/**
 * Create a new flashcard pack.
 *
 * @param sessionId - User session ID
 * @param name - Pack name
 * @param description - Optional description
 * @param color - Optional color (default: blue)
 * @returns Created pack
 */
export async function createPack(
  sessionId: string,
  name: string,
  description?: string,
  color?: string
): Promise<UserPackResponse> {
  const pack = await prisma.userFlashcardPack.create({
    data: {
      sessionId,
      name,
      description: description ?? null,
      color: color ?? '#3B82F6',
      isDefault: false,
    },
  });

  return {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    color: pack.color,
    isDefault: pack.isDefault,
    cardCount: 0,
    createdAt: pack.createdAt.toISOString(),
  };
}

/**
 * Update a flashcard pack.
 *
 * @param sessionId - User session ID
 * @param packId - Pack ID
 * @param data - Update data
 * @returns Updated pack or null
 */
export async function updatePack(
  sessionId: string,
  packId: string,
  data: { name?: string; description?: string; color?: string }
): Promise<UserPackResponse | null> {
  const pack = await prisma.userFlashcardPack.findFirst({
    where: { id: packId, sessionId },
  });

  if (!pack) return null;

  const updated = await prisma.userFlashcardPack.update({
    where: { id: packId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.color !== undefined && { color: data.color }),
    },
  });

  // Get card count
  const flashcards = await prisma.userFlashcard.findMany({
    where: { sessionId },
    select: { packIds: true },
  });

  const cardCount = flashcards.filter((fc) => {
    const packIds = JSON.parse(fc.packIds) as string[];
    return packIds.includes(packId);
  }).length;

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    color: updated.color,
    isDefault: updated.isDefault,
    cardCount,
    createdAt: updated.createdAt.toISOString(),
  };
}

/**
 * Delete a flashcard pack.
 * Removes pack ID from all flashcards in the pack.
 *
 * @param sessionId - User session ID
 * @param packId - Pack ID
 * @returns true if deleted
 */
export async function deletePack(
  sessionId: string,
  packId: string
): Promise<boolean> {
  const pack = await prisma.userFlashcardPack.findFirst({
    where: { id: packId, sessionId },
  });

  if (!pack) return false;

  // Don't allow deleting default packs
  if (pack.isDefault) return false;

  // Remove pack ID from all flashcards
  const flashcards = await prisma.userFlashcard.findMany({
    where: { sessionId },
  });

  for (const fc of flashcards) {
    const packIds = JSON.parse(fc.packIds) as string[];
    if (packIds.includes(packId)) {
      const newPackIds = packIds.filter((id) => id !== packId);
      await prisma.userFlashcard.update({
        where: { id: fc.id },
        data: { packIds: JSON.stringify(newPackIds) },
      });
    }
  }

  // Delete the pack
  await prisma.userFlashcardPack.delete({
    where: { id: packId },
  });

  return true;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Transform database flashcard to API response format.
 */
function transformFlashcard(flashcard: {
  id: string;
  sourceType: string;
  sourceId: string;
  packIds: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date | null;
  lastReviewedAt: Date | null;
  createdAt: Date;
}): UserFlashcardResponse {
  return {
    id: flashcard.id,
    sourceType: flashcard.sourceType,
    sourceId: flashcard.sourceId,
    packIds: JSON.parse(flashcard.packIds) as string[],
    easeFactor: flashcard.easeFactor,
    interval: flashcard.interval,
    repetitions: flashcard.repetitions,
    nextReviewDate: flashcard.nextReviewDate?.toISOString() ?? null,
    lastReviewedAt: flashcard.lastReviewedAt?.toISOString() ?? null,
    createdAt: flashcard.createdAt.toISOString(),
  };
}

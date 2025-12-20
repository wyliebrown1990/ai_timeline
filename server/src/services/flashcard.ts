/**
 * Flashcard Service
 *
 * Database operations for flashcards, prebuilt decks, and deck cards.
 * Sprint 36 - Flashcard Database Migration
 */

import { prisma } from '../db';
import type { Flashcard, PrebuiltDeck, PrebuiltDeckCard } from '@prisma/client';

// =============================================================================
// Types
// =============================================================================

/**
 * Flashcard category enum (matches frontend types)
 */
export type FlashcardCategory =
  | 'core_concept'
  | 'technical_term'
  | 'business_term'
  | 'model_architecture'
  | 'company_product';

/**
 * Prebuilt deck difficulty levels
 */
export type DeckDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Source types for deck cards
 */
export type CardSourceType = 'milestone' | 'concept' | 'custom' | 'flashcard';

/**
 * Pagination options
 */
interface PaginationOptions {
  skip?: number;
  limit?: number;
}

// =============================================================================
// Flashcard DTOs
// =============================================================================

export interface CreateFlashcardDto {
  term: string;
  definition: string;
  category: FlashcardCategory;
  relatedMilestoneIds?: string[];
}

export interface UpdateFlashcardDto {
  term?: string;
  definition?: string;
  category?: FlashcardCategory;
  relatedMilestoneIds?: string[];
}

// =============================================================================
// Prebuilt Deck DTOs
// =============================================================================

export interface CreatePrebuiltDeckDto {
  name: string;
  description: string;
  difficulty: DeckDifficulty;
  cardCount: number;
  estimatedMinutes: number;
  previewCardIds?: string[];
}

export interface UpdatePrebuiltDeckDto {
  name?: string;
  description?: string;
  difficulty?: DeckDifficulty;
  cardCount?: number;
  estimatedMinutes?: number;
  previewCardIds?: string[];
}

// =============================================================================
// Deck Card DTOs
// =============================================================================

export interface CreateDeckCardDto {
  deckId: string;
  cardId: string;
  sourceType: CardSourceType;
  sourceId: string;
  customTerm?: string;
  customDefinition?: string;
  sortOrder?: number;
}

// =============================================================================
// Flashcard Operations
// =============================================================================

/**
 * Get all flashcards with optional filtering and pagination
 */
export async function getAllFlashcards(
  options?: PaginationOptions & {
    category?: FlashcardCategory;
    search?: string;
  }
): Promise<{ flashcards: Flashcard[]; total: number }> {
  if (!prisma) throw new Error('Database not available');

  const where: Record<string, unknown> = {};

  if (options?.category) {
    where.category = options.category;
  }

  if (options?.search) {
    where.OR = [
      { term: { contains: options.search, mode: 'insensitive' } },
      { definition: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [flashcards, total] = await Promise.all([
    prisma.flashcard.findMany({
      where,
      skip: options?.skip ?? 0,
      take: options?.limit ?? 100,
      orderBy: { term: 'asc' },
    }),
    prisma.flashcard.count({ where }),
  ]);

  return { flashcards, total };
}

/**
 * Get a single flashcard by ID
 */
export async function getFlashcardById(id: string): Promise<Flashcard | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.flashcard.findUnique({
    where: { id },
  });
}

/**
 * Create a new flashcard
 */
export async function createFlashcard(data: CreateFlashcardDto): Promise<Flashcard> {
  if (!prisma) throw new Error('Database not available');

  return prisma.flashcard.create({
    data: {
      term: data.term,
      definition: data.definition,
      category: data.category,
      relatedMilestoneIds: JSON.stringify(data.relatedMilestoneIds ?? []),
    },
  });
}

/**
 * Update an existing flashcard
 */
export async function updateFlashcard(
  id: string,
  data: UpdateFlashcardDto
): Promise<Flashcard | null> {
  if (!prisma) throw new Error('Database not available');

  const updateData: Record<string, unknown> = {};

  if (data.term !== undefined) updateData.term = data.term;
  if (data.definition !== undefined) updateData.definition = data.definition;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.relatedMilestoneIds !== undefined) {
    updateData.relatedMilestoneIds = JSON.stringify(data.relatedMilestoneIds);
  }

  try {
    return await prisma.flashcard.update({
      where: { id },
      data: updateData,
    });
  } catch {
    return null;
  }
}

/**
 * Delete a flashcard by ID
 */
export async function deleteFlashcard(id: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  try {
    await prisma.flashcard.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get flashcards by category
 */
export async function getFlashcardsByCategory(
  category: FlashcardCategory
): Promise<Flashcard[]> {
  if (!prisma) throw new Error('Database not available');

  return prisma.flashcard.findMany({
    where: { category },
    orderBy: { term: 'asc' },
  });
}

/**
 * Get flashcard count
 */
export async function getFlashcardCount(): Promise<number> {
  if (!prisma) throw new Error('Database not available');

  return prisma.flashcard.count();
}

// =============================================================================
// Prebuilt Deck Operations
// =============================================================================

/**
 * Get all prebuilt decks with optional filtering
 */
export async function getAllDecks(
  options?: PaginationOptions & {
    difficulty?: DeckDifficulty;
  }
): Promise<{ decks: PrebuiltDeck[]; total: number }> {
  if (!prisma) throw new Error('Database not available');

  const where: Record<string, unknown> = {};

  if (options?.difficulty) {
    where.difficulty = options.difficulty;
  }

  const [decks, total] = await Promise.all([
    prisma.prebuiltDeck.findMany({
      where,
      skip: options?.skip ?? 0,
      take: options?.limit ?? 50,
      orderBy: { name: 'asc' },
    }),
    prisma.prebuiltDeck.count({ where }),
  ]);

  return { decks, total };
}

/**
 * Get a single prebuilt deck by ID, including its cards
 */
export async function getDeckById(id: string): Promise<
  | (PrebuiltDeck & { cards: PrebuiltDeckCard[] })
  | null
> {
  if (!prisma) throw new Error('Database not available');

  return prisma.prebuiltDeck.findUnique({
    where: { id },
    include: {
      cards: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}

/**
 * Get a prebuilt deck by name
 */
export async function getDeckByName(name: string): Promise<PrebuiltDeck | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.prebuiltDeck.findUnique({
    where: { name },
  });
}

/**
 * Create a new prebuilt deck
 */
export async function createDeck(data: CreatePrebuiltDeckDto): Promise<PrebuiltDeck> {
  if (!prisma) throw new Error('Database not available');

  return prisma.prebuiltDeck.create({
    data: {
      name: data.name,
      description: data.description,
      difficulty: data.difficulty,
      cardCount: data.cardCount,
      estimatedMinutes: data.estimatedMinutes,
      previewCardIds: JSON.stringify(data.previewCardIds ?? []),
    },
  });
}

/**
 * Update an existing prebuilt deck
 */
export async function updateDeck(
  id: string,
  data: UpdatePrebuiltDeckDto
): Promise<PrebuiltDeck | null> {
  if (!prisma) throw new Error('Database not available');

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
  if (data.cardCount !== undefined) updateData.cardCount = data.cardCount;
  if (data.estimatedMinutes !== undefined) updateData.estimatedMinutes = data.estimatedMinutes;
  if (data.previewCardIds !== undefined) {
    updateData.previewCardIds = JSON.stringify(data.previewCardIds);
  }

  try {
    return await prisma.prebuiltDeck.update({
      where: { id },
      data: updateData,
    });
  } catch {
    return null;
  }
}

/**
 * Delete a prebuilt deck by ID (cascades to cards)
 */
export async function deleteDeck(id: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  try {
    await prisma.prebuiltDeck.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a deck name already exists
 */
export async function deckNameExists(name: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  const existing = await prisma.prebuiltDeck.findUnique({
    where: { name },
    select: { id: true },
  });

  return existing !== null;
}

// =============================================================================
// Deck Card Operations
// =============================================================================

/**
 * Add a card to a deck
 */
export async function addCardToDeck(data: CreateDeckCardDto): Promise<PrebuiltDeckCard> {
  if (!prisma) throw new Error('Database not available');

  return prisma.prebuiltDeckCard.create({
    data: {
      deckId: data.deckId,
      cardId: data.cardId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      customTerm: data.customTerm ?? null,
      customDefinition: data.customDefinition ?? null,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

/**
 * Remove a card from a deck
 */
export async function removeCardFromDeck(deckId: string, cardId: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  try {
    await prisma.prebuiltDeckCard.delete({
      where: {
        deckId_cardId: { deckId, cardId },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all cards in a deck
 */
export async function getDeckCards(deckId: string): Promise<PrebuiltDeckCard[]> {
  if (!prisma) throw new Error('Database not available');

  return prisma.prebuiltDeckCard.findMany({
    where: { deckId },
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Update card sort order in bulk
 */
export async function updateCardSortOrder(
  deckId: string,
  cardOrders: { cardId: string; sortOrder: number }[]
): Promise<void> {
  if (!prisma) throw new Error('Database not available');

  // Use transaction to update all cards atomically
  await prisma.$transaction(
    cardOrders.map(({ cardId, sortOrder }) =>
      prisma.prebuiltDeckCard.update({
        where: { deckId_cardId: { deckId, cardId } },
        data: { sortOrder },
      })
    )
  );
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get flashcard statistics
 */
export async function getFlashcardStats(): Promise<{
  totalCards: number;
  byCategory: Record<string, number>;
  totalDecks: number;
  byDifficulty: Record<string, number>;
}> {
  if (!prisma) throw new Error('Database not available');

  const categories = [
    'core_concept',
    'technical_term',
    'business_term',
    'model_architecture',
    'company_product',
  ];
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  const [totalCards, totalDecks, ...categoryAndDifficultyCounts] = await Promise.all([
    prisma.flashcard.count(),
    prisma.prebuiltDeck.count(),
    ...categories.map((category) => prisma.flashcard.count({ where: { category } })),
    ...difficulties.map((difficulty) => prisma.prebuiltDeck.count({ where: { difficulty } })),
  ]);

  const byCategory: Record<string, number> = {};
  categories.forEach((cat, i) => {
    byCategory[cat] = categoryAndDifficultyCounts[i];
  });

  const byDifficulty: Record<string, number> = {};
  difficulties.forEach((diff, i) => {
    byDifficulty[diff] = categoryAndDifficultyCounts[categories.length + i];
  });

  return { totalCards, byCategory, totalDecks, byDifficulty };
}

/**
 * Bulk create flashcards (for migration/seeding)
 */
export async function createFlashcardsBulk(
  cards: CreateFlashcardDto[]
): Promise<{ created: number; skipped: number; errors: string[] }> {
  if (!prisma) throw new Error('Database not available');

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const cardData of cards) {
    try {
      await createFlashcard(cardData);
      created++;
    } catch (error) {
      errors.push(`Failed to create flashcard "${cardData.term}": ${error}`);
      skipped++;
    }
  }

  return { created, skipped, errors };
}

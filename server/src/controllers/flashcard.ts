/**
 * Flashcard Controller
 *
 * API endpoints for flashcards and prebuilt decks.
 * Sprint 36 - Flashcard Database Migration
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as flashcardService from '../services/flashcard';

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Valid flashcard categories
 */
const FlashcardCategoryEnum = z.enum([
  'core_concept',
  'technical_term',
  'business_term',
  'model_architecture',
  'company_product',
]);

/**
 * Valid deck difficulty levels
 */
const DeckDifficultyEnum = z.enum(['beginner', 'intermediate', 'advanced']);

/**
 * Valid card source types
 */
const CardSourceTypeEnum = z.enum(['milestone', 'concept', 'custom', 'flashcard']);

/**
 * Schema for creating a flashcard
 */
const CreateFlashcardSchema = z.object({
  term: z.string().min(1).max(200),
  definition: z.string().min(1).max(2000),
  category: FlashcardCategoryEnum,
  relatedMilestoneIds: z.array(z.string()).optional().default([]),
});

/**
 * Schema for updating a flashcard
 */
const UpdateFlashcardSchema = z.object({
  term: z.string().min(1).max(200).optional(),
  definition: z.string().min(1).max(2000).optional(),
  category: FlashcardCategoryEnum.optional(),
  relatedMilestoneIds: z.array(z.string()).optional(),
});

/**
 * Schema for creating a prebuilt deck
 */
const CreateDeckSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  difficulty: DeckDifficultyEnum,
  cardCount: z.number().int().min(0),
  estimatedMinutes: z.number().int().min(1),
  previewCardIds: z.array(z.string()).optional().default([]),
});

/**
 * Schema for updating a prebuilt deck
 */
const UpdateDeckSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  difficulty: DeckDifficultyEnum.optional(),
  cardCount: z.number().int().min(0).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  previewCardIds: z.array(z.string()).optional(),
});

/**
 * Schema for adding a card to a deck
 */
const AddCardToDeckSchema = z.object({
  cardId: z.string().min(1),
  sourceType: CardSourceTypeEnum,
  sourceId: z.string().min(1),
  customTerm: z.string().max(200).optional(),
  customDefinition: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// =============================================================================
// Transform Helpers
// =============================================================================

/**
 * Transform flashcard DB record to API response
 */
function transformFlashcard(card: {
  id: string;
  term: string;
  definition: string;
  category: string;
  relatedMilestoneIds: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: card.id,
    term: card.term,
    definition: card.definition,
    category: card.category,
    relatedMilestoneIds: JSON.parse(card.relatedMilestoneIds) as string[],
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

/**
 * Transform prebuilt deck DB record to API response
 */
function transformDeck(deck: {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  cardCount: number;
  estimatedMinutes: number;
  previewCardIds: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    difficulty: deck.difficulty,
    cardCount: deck.cardCount,
    estimatedMinutes: deck.estimatedMinutes,
    previewCardIds: JSON.parse(deck.previewCardIds) as string[],
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
  };
}

/**
 * Transform deck card DB record to API response
 */
function transformDeckCard(card: {
  id: string;
  deckId: string;
  cardId: string;
  sourceType: string;
  sourceId: string;
  customTerm: string | null;
  customDefinition: string | null;
  sortOrder: number;
}) {
  return {
    id: card.id,
    deckId: card.deckId,
    cardId: card.cardId,
    sourceType: card.sourceType,
    sourceId: card.sourceId,
    customTerm: card.customTerm,
    customDefinition: card.customDefinition,
    sortOrder: card.sortOrder,
  };
}

// =============================================================================
// Flashcard Endpoints
// =============================================================================

/**
 * GET /api/flashcards
 * Retrieve all flashcards (public endpoint)
 */
export async function getAllFlashcards(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { category, search, page, limit } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 100;
    const skip = (pageNum - 1) * limitNum;

    const { flashcards, total } = await flashcardService.getAllFlashcards({
      category: category as flashcardService.FlashcardCategory | undefined,
      search: search as string | undefined,
      skip,
      limit: limitNum,
    });

    res.json({
      data: flashcards.map(transformFlashcard),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/flashcards/:id
 * Retrieve a single flashcard (public endpoint)
 */
export async function getFlashcardById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const flashcard = await flashcardService.getFlashcardById(id);

    if (!flashcard) {
      throw ApiError.notFound(`Flashcard with ID ${id} not found`);
    }

    res.json(transformFlashcard(flashcard));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/flashcards
 * Create a new flashcard (admin only)
 */
export async function createFlashcard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = CreateFlashcardSchema.parse(req.body);
    const flashcard = await flashcardService.createFlashcard(validatedData);
    res.status(201).json(transformFlashcard(flashcard));
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/flashcards/:id
 * Update an existing flashcard (admin only)
 */
export async function updateFlashcard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const validatedData = UpdateFlashcardSchema.parse(req.body);

    const existing = await flashcardService.getFlashcardById(id);
    if (!existing) {
      throw ApiError.notFound(`Flashcard with ID ${id} not found`);
    }

    const flashcard = await flashcardService.updateFlashcard(id, validatedData);
    if (!flashcard) {
      throw ApiError.internal('Failed to update flashcard');
    }

    res.json(transformFlashcard(flashcard));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/flashcards/:id
 * Delete a flashcard (admin only)
 */
export async function deleteFlashcard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await flashcardService.getFlashcardById(id);
    if (!existing) {
      throw ApiError.notFound(`Flashcard with ID ${id} not found`);
    }

    const success = await flashcardService.deleteFlashcard(id);
    if (!success) {
      throw ApiError.internal('Failed to delete flashcard');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Prebuilt Deck Endpoints
// =============================================================================

/**
 * GET /api/decks
 * Retrieve all prebuilt decks (public endpoint)
 */
export async function getAllDecks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { difficulty, page, limit } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const { decks, total } = await flashcardService.getAllDecks({
      difficulty: difficulty as flashcardService.DeckDifficulty | undefined,
      skip,
      limit: limitNum,
    });

    res.json({
      data: decks.map(transformDeck),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/decks/:id
 * Retrieve a single prebuilt deck with its cards (public endpoint)
 */
export async function getDeckById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deck = await flashcardService.getDeckById(id);

    if (!deck) {
      throw ApiError.notFound(`Deck with ID ${id} not found`);
    }

    res.json({
      ...transformDeck(deck),
      cards: deck.cards.map(transformDeckCard),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/decks
 * Create a new prebuilt deck (admin only)
 */
export async function createDeck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = CreateDeckSchema.parse(req.body);

    // Check if deck name already exists
    const exists = await flashcardService.deckNameExists(validatedData.name);
    if (exists) {
      throw ApiError.badRequest(`Deck "${validatedData.name}" already exists`);
    }

    const deck = await flashcardService.createDeck(validatedData);
    res.status(201).json(transformDeck(deck));
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/decks/:id
 * Update an existing prebuilt deck (admin only)
 */
export async function updateDeck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const validatedData = UpdateDeckSchema.parse(req.body);

    const existing = await flashcardService.getDeckById(id);
    if (!existing) {
      throw ApiError.notFound(`Deck with ID ${id} not found`);
    }

    // If updating name, check for duplicates
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await flashcardService.deckNameExists(validatedData.name);
      if (duplicate) {
        throw ApiError.badRequest(`Deck "${validatedData.name}" already exists`);
      }
    }

    const deck = await flashcardService.updateDeck(id, validatedData);
    if (!deck) {
      throw ApiError.internal('Failed to update deck');
    }

    res.json(transformDeck(deck));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/decks/:id
 * Delete a prebuilt deck (admin only)
 */
export async function deleteDeck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await flashcardService.getDeckById(id);
    if (!existing) {
      throw ApiError.notFound(`Deck with ID ${id} not found`);
    }

    const success = await flashcardService.deleteDeck(id);
    if (!success) {
      throw ApiError.internal('Failed to delete deck');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Deck Card Endpoints
// =============================================================================

/**
 * GET /api/decks/:id/cards
 * Get all cards in a deck (public endpoint)
 */
export async function getDeckCards(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Verify deck exists
    const deck = await flashcardService.getDeckById(id);
    if (!deck) {
      throw ApiError.notFound(`Deck with ID ${id} not found`);
    }

    const cards = await flashcardService.getDeckCards(id);
    res.json({
      data: cards.map(transformDeckCard),
      total: cards.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/decks/:id/cards
 * Add a card to a deck (admin only)
 */
export async function addCardToDeck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id: deckId } = req.params;
    const validatedData = AddCardToDeckSchema.parse(req.body);

    // Verify deck exists
    const deck = await flashcardService.getDeckById(deckId);
    if (!deck) {
      throw ApiError.notFound(`Deck with ID ${deckId} not found`);
    }

    const card = await flashcardService.addCardToDeck({
      deckId,
      ...validatedData,
    });

    res.status(201).json(transformDeckCard(card));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/decks/:deckId/cards/:cardId
 * Remove a card from a deck (admin only)
 */
export async function removeCardFromDeck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { deckId, cardId } = req.params;

    const success = await flashcardService.removeCardFromDeck(deckId, cardId);
    if (!success) {
      throw ApiError.notFound(`Card ${cardId} not found in deck ${deckId}`);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Statistics Endpoints
// =============================================================================

/**
 * GET /api/admin/flashcards/stats
 * Get flashcard statistics (admin only)
 */
export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await flashcardService.getFlashcardStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/flashcards/bulk
 * Bulk create flashcards (admin only, for migration)
 */
export async function bulkCreateFlashcards(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { cards } = req.body;

    if (!Array.isArray(cards)) {
      throw ApiError.badRequest('Request body must contain a "cards" array');
    }

    // Validate each card
    const validatedCards = cards.map((card, index) => {
      try {
        return CreateFlashcardSchema.parse(card);
      } catch (error) {
        throw ApiError.badRequest(`Invalid card at index ${index}: ${error}`);
      }
    });

    const result = await flashcardService.createFlashcardsBulk(validatedCards);

    res.status(201).json({
      message: `Created ${result.created} cards, skipped ${result.skipped}`,
      created: result.created,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    next(error);
  }
}

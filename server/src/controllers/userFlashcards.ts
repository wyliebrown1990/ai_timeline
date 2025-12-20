/**
 * User Flashcards Controller
 *
 * API endpoints for user flashcard management with SM-2 spaced repetition.
 * Handles flashcard CRUD, reviews, and pack organization.
 *
 * Sprint 38 - User Data Migration
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as userFlashcardsService from '../services/userFlashcards';
import * as userSessionService from '../services/userSession';

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Schema for adding a flashcard
 */
const AddFlashcardSchema = z.object({
  sourceType: z.enum(['milestone', 'concept', 'flashcard', 'glossary']),
  sourceId: z.string().min(1, 'sourceId is required'),
  packIds: z.array(z.string()).optional().default([]),
});

/**
 * Schema for reviewing a flashcard
 */
const ReviewFlashcardSchema = z.object({
  quality: z.number().int().min(0).max(5, 'quality must be 0-5'),
});

/**
 * Schema for updating flashcard packs
 */
const UpdateFlashcardPacksSchema = z.object({
  packIds: z.array(z.string()),
});

/**
 * Schema for creating a pack
 */
const CreatePackSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

/**
 * Schema for updating a pack
 */
const UpdatePackSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

// =============================================================================
// Flashcard Endpoints
// =============================================================================

/**
 * GET /api/user/:sessionId/flashcards
 * Get all user flashcards, optionally filtered by pack.
 */
export async function getFlashcards(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;
    const { packId } = req.query;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const flashcards = await userFlashcardsService.getFlashcards(
      sessionId,
      packId as string | undefined
    );

    res.json({ data: flashcards });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/user/:sessionId/flashcards/due
 * Get flashcards due for review.
 */
export async function getDueCards(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;
    const { packId } = req.query;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const dueCards = await userFlashcardsService.getDueCards(
      sessionId,
      packId as string | undefined
    );

    res.json({ data: dueCards, count: dueCards.length });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/user/:sessionId/flashcards/:cardId
 * Get a single flashcard by ID.
 */
export async function getFlashcardById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, cardId } = req.params;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const flashcard = await userFlashcardsService.getFlashcardById(sessionId, cardId);

    if (!flashcard) {
      throw ApiError.notFound(`Flashcard ${cardId} not found`);
    }

    res.json(flashcard);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/user/:sessionId/flashcards
 * Add a flashcard to user's collection.
 */
export async function addFlashcard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;
    const validatedData = AddFlashcardSchema.parse(req.body);

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    // Check if flashcard already exists
    const cardExists = await userFlashcardsService.flashcardExists(
      sessionId,
      validatedData.sourceType,
      validatedData.sourceId
    );

    if (cardExists) {
      throw ApiError.badRequest('Flashcard already exists in collection');
    }

    const flashcard = await userFlashcardsService.addFlashcard(
      sessionId,
      validatedData.sourceType,
      validatedData.sourceId,
      validatedData.packIds
    );

    res.status(201).json(flashcard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0]?.message ?? 'Invalid request data'));
      return;
    }
    next(error);
  }
}

/**
 * POST /api/user/:sessionId/flashcards/:cardId/review
 * Review a flashcard with SM-2 algorithm.
 */
export async function reviewFlashcard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, cardId } = req.params;
    const validatedData = ReviewFlashcardSchema.parse(req.body);

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    // Check flashcard exists
    const flashcard = await userFlashcardsService.getFlashcardById(sessionId, cardId);
    if (!flashcard) {
      throw ApiError.notFound(`Flashcard ${cardId} not found`);
    }

    const result = await userFlashcardsService.reviewFlashcard(
      sessionId,
      cardId,
      validatedData.quality
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0]?.message ?? 'Invalid request data'));
      return;
    }
    if (error instanceof Error && error.message === 'Flashcard not found') {
      next(ApiError.notFound('Flashcard not found'));
      return;
    }
    next(error);
  }
}

/**
 * PUT /api/user/:sessionId/flashcards/:cardId/packs
 * Update flashcard's pack assignments.
 */
export async function updateFlashcardPacks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, cardId } = req.params;
    const validatedData = UpdateFlashcardPacksSchema.parse(req.body);

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const flashcard = await userFlashcardsService.updateFlashcardPacks(
      sessionId,
      cardId,
      validatedData.packIds
    );

    if (!flashcard) {
      throw ApiError.notFound(`Flashcard ${cardId} not found`);
    }

    res.json(flashcard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0]?.message ?? 'Invalid request data'));
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/user/:sessionId/flashcards/:cardId
 * Remove a flashcard from user's collection.
 */
export async function removeFlashcard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, cardId } = req.params;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const deleted = await userFlashcardsService.removeFlashcard(sessionId, cardId);

    if (!deleted) {
      throw ApiError.notFound(`Flashcard ${cardId} not found`);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Pack Endpoints
// =============================================================================

/**
 * GET /api/user/:sessionId/packs
 * Get all user packs with card counts.
 */
export async function getPacks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const packs = await userFlashcardsService.getPacks(sessionId);

    res.json({ data: packs });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/user/:sessionId/packs
 * Create a new flashcard pack.
 */
export async function createPack(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;
    const validatedData = CreatePackSchema.parse(req.body);

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const pack = await userFlashcardsService.createPack(
      sessionId,
      validatedData.name,
      validatedData.description,
      validatedData.color
    );

    res.status(201).json(pack);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0]?.message ?? 'Invalid request data'));
      return;
    }
    next(error);
  }
}

/**
 * PUT /api/user/:sessionId/packs/:packId
 * Update a flashcard pack.
 */
export async function updatePack(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, packId } = req.params;
    const validatedData = UpdatePackSchema.parse(req.body);

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const pack = await userFlashcardsService.updatePack(sessionId, packId, validatedData);

    if (!pack) {
      throw ApiError.notFound(`Pack ${packId} not found`);
    }

    res.json(pack);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0]?.message ?? 'Invalid request data'));
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/user/:sessionId/packs/:packId
 * Delete a flashcard pack.
 */
export async function deletePack(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, packId } = req.params;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const deleted = await userFlashcardsService.deletePack(sessionId, packId);

    if (!deleted) {
      throw ApiError.notFound(`Pack ${packId} not found or is a default pack`);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * User Flashcards Routes
 *
 * API routes for user flashcard management and pack organization.
 * All routes are public (session-based, no admin auth required).
 *
 * Sprint 38 - User Data Migration
 */

import { Router } from 'express';
import * as userFlashcardsController from '../controllers/userFlashcards';

const router = Router();

/**
 * User Flashcard API routes
 * All routes mounted under /api/user/:sessionId/flashcards
 */

// GET /api/user/:sessionId/flashcards
// Get all user flashcards, optionally filtered by packId query param
router.get('/:sessionId/flashcards', userFlashcardsController.getFlashcards);

// GET /api/user/:sessionId/flashcards/due
// Get flashcards due for review
router.get('/:sessionId/flashcards/due', userFlashcardsController.getDueCards);

// GET /api/user/:sessionId/flashcards/:cardId
// Get a single flashcard by ID
router.get('/:sessionId/flashcards/:cardId', userFlashcardsController.getFlashcardById);

// POST /api/user/:sessionId/flashcards
// Add a flashcard to user's collection
router.post('/:sessionId/flashcards', userFlashcardsController.addFlashcard);

// POST /api/user/:sessionId/flashcards/:cardId/review
// Review a flashcard with SM-2 algorithm
router.post('/:sessionId/flashcards/:cardId/review', userFlashcardsController.reviewFlashcard);

// PUT /api/user/:sessionId/flashcards/:cardId/packs
// Update flashcard's pack assignments
router.put('/:sessionId/flashcards/:cardId/packs', userFlashcardsController.updateFlashcardPacks);

// DELETE /api/user/:sessionId/flashcards/:cardId
// Remove a flashcard from user's collection
router.delete('/:sessionId/flashcards/:cardId', userFlashcardsController.removeFlashcard);

/**
 * User Pack API routes
 * All routes mounted under /api/user/:sessionId/packs
 */

// GET /api/user/:sessionId/packs
// Get all user packs with card counts
router.get('/:sessionId/packs', userFlashcardsController.getPacks);

// POST /api/user/:sessionId/packs
// Create a new flashcard pack
router.post('/:sessionId/packs', userFlashcardsController.createPack);

// PUT /api/user/:sessionId/packs/:packId
// Update a flashcard pack
router.put('/:sessionId/packs/:packId', userFlashcardsController.updatePack);

// DELETE /api/user/:sessionId/packs/:packId
// Delete a flashcard pack
router.delete('/:sessionId/packs/:packId', userFlashcardsController.deletePack);

export default router;

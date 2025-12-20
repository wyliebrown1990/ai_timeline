/**
 * Flashcard API Routes
 *
 * Public routes: /api/flashcards, /api/decks
 * Admin routes: /api/admin/flashcards, /api/admin/decks
 *
 * Sprint 36 - Flashcard Database Migration
 */

import { Router } from 'express';
import * as flashcardController from '../controllers/flashcard';
import { requireAdmin } from '../middleware/auth';

// =============================================================================
// Public Flashcard Routes
// =============================================================================

const flashcardRouter = Router();

// GET /api/flashcards - List all flashcards
flashcardRouter.get('/', flashcardController.getAllFlashcards);

// GET /api/flashcards/:id - Get flashcard by ID
flashcardRouter.get('/:id', flashcardController.getFlashcardById);

export { flashcardRouter };

// =============================================================================
// Public Deck Routes
// =============================================================================

const deckRouter = Router();

// GET /api/decks - List all prebuilt decks
deckRouter.get('/', flashcardController.getAllDecks);

// GET /api/decks/:id - Get deck by ID with cards
deckRouter.get('/:id', flashcardController.getDeckById);

// GET /api/decks/:id/cards - Get all cards in a deck
deckRouter.get('/:id/cards', flashcardController.getDeckCards);

export { deckRouter };

// =============================================================================
// Admin Flashcard Routes (require authentication)
// =============================================================================

const adminFlashcardRouter = Router();

// GET /api/admin/flashcards/stats - Get flashcard statistics
adminFlashcardRouter.get('/stats', requireAdmin, flashcardController.getStats);

// POST /api/admin/flashcards/bulk - Bulk create flashcards (for migration)
adminFlashcardRouter.post('/bulk', requireAdmin, flashcardController.bulkCreateFlashcards);

// POST /api/admin/flashcards - Create a new flashcard
adminFlashcardRouter.post('/', requireAdmin, flashcardController.createFlashcard);

// PUT /api/admin/flashcards/:id - Update a flashcard
adminFlashcardRouter.put('/:id', requireAdmin, flashcardController.updateFlashcard);

// DELETE /api/admin/flashcards/:id - Delete a flashcard
adminFlashcardRouter.delete('/:id', requireAdmin, flashcardController.deleteFlashcard);

export { adminFlashcardRouter };

// =============================================================================
// Admin Deck Routes (require authentication)
// =============================================================================

const adminDeckRouter = Router();

// POST /api/admin/decks - Create a new deck
adminDeckRouter.post('/', requireAdmin, flashcardController.createDeck);

// PUT /api/admin/decks/:id - Update a deck
adminDeckRouter.put('/:id', requireAdmin, flashcardController.updateDeck);

// DELETE /api/admin/decks/:id - Delete a deck
adminDeckRouter.delete('/:id', requireAdmin, flashcardController.deleteDeck);

// POST /api/admin/decks/:id/cards - Add card to deck
adminDeckRouter.post('/:id/cards', requireAdmin, flashcardController.addCardToDeck);

// DELETE /api/admin/decks/:deckId/cards/:cardId - Remove card from deck
adminDeckRouter.delete('/:deckId/cards/:cardId', requireAdmin, flashcardController.removeCardFromDeck);

export { adminDeckRouter };

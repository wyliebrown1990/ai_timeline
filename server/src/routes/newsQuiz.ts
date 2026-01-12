/**
 * News Quiz Routes (Sprint LEarn-2)
 *
 * Public routes: /api/news-quiz
 * Admin routes: /api/admin/news-quiz
 */

import { Router } from 'express';
import * as newsQuizController from '../controllers/newsQuiz';
import { requireAdmin } from '../middleware/auth';

// =============================================================================
// Public Routes
// =============================================================================

const router = Router();

// GET /api/news-quiz/current - Get this week's quiz
router.get('/current', newsQuizController.getCurrentQuiz);

// GET /api/news-quiz/history - Get past quizzes
router.get('/history', newsQuizController.getQuizHistory);

// GET /api/news-quiz/user-history - Get user's quiz history
router.get('/user-history', newsQuizController.getUserHistory);

// GET /api/news-quiz/:id - Get a specific quiz
router.get('/:id', newsQuizController.getQuizById);

// POST /api/news-quiz/:id/submit - Submit quiz answers
router.post('/:id/submit', newsQuizController.submitQuiz);

export default router;

// =============================================================================
// Admin Routes
// =============================================================================

export const adminRouter = Router();

// POST /api/admin/news-quiz/generate - Generate a new weekly quiz
adminRouter.post('/generate', requireAdmin, newsQuizController.generateQuiz);

// DELETE /api/admin/news-quiz/:id - Delete a quiz
adminRouter.delete('/:id', requireAdmin, newsQuizController.deleteQuiz);

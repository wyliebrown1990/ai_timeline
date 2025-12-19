/**
 * Articles Routes
 *
 * API endpoints for article analysis and management.
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import * as articlesController from '../controllers/articles';

const router = Router();

// All routes require admin authentication
router.use(requireAdmin);

// GET /api/admin/articles/stats - Get analysis statistics
router.get('/stats', articlesController.getAnalysisStats);

// POST /api/admin/articles/analyze-pending - Analyze all pending articles
router.post('/analyze-pending', articlesController.analyzePending);

// GET /api/admin/articles/:id - Get single article with drafts
router.get('/:id', articlesController.getArticle);

// GET /api/admin/articles/:id/drafts - Get drafts for an article
router.get('/:id/drafts', articlesController.getArticleDrafts);

// POST /api/admin/articles/:id/analyze - Analyze single article
router.post('/:id/analyze', articlesController.analyzeOne);

// POST /api/admin/articles/:id/reanalyze - Re-analyze article (delete drafts and redo)
router.post('/:id/reanalyze', articlesController.reanalyzeArticle);

export default router;

/**
 * Articles Routes
 *
 * API endpoints for article analysis and management.
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import * as articlesController from '../controllers/articles';
import * as sourcesController from '../controllers/sources';

const router = Router();

// All routes require admin authentication
router.use(requireAdmin);

// GET /api/admin/articles - List all articles with pagination
router.get('/', sourcesController.getAllArticles);

// GET /api/admin/articles/stats - Get analysis statistics
router.get('/stats', articlesController.getAnalysisStats);

// POST /api/admin/articles/analyze-pending - Analyze all pending articles
router.post('/analyze-pending', articlesController.analyzePending);

// POST /api/admin/articles/submit - Submit article manually (paste content + source URL)
// Must be before /:id routes to avoid matching "submit" as an ID
router.post('/submit', articlesController.submitArticle);

// POST /api/admin/articles/submit-youtube - Submit a YouTube video for analysis
router.post('/submit-youtube', articlesController.submitYouTubeVideo);

// POST /api/admin/articles/scrape - Scrape article content from URL
router.post('/scrape', articlesController.scrapeArticleUrl);

// DELETE /api/admin/articles/by-url - Delete article by external URL (cleanup bad scrapes)
router.delete('/by-url', articlesController.deleteArticleByUrl);

// POST /api/admin/articles/delete-duplicates - Delete all duplicate articles
router.post('/delete-duplicates', articlesController.deleteAllDuplicates);

// POST /api/admin/articles/bulk-delete - Delete multiple articles by IDs
router.post('/bulk-delete', articlesController.bulkDelete);

// POST /api/admin/articles/bulk-analyze - Analyze multiple articles by IDs
router.post('/bulk-analyze', articlesController.bulkAnalyze);

// GET /api/admin/articles/:id - Get single article with drafts
router.get('/:id', articlesController.getArticle);

// GET /api/admin/articles/:id/drafts - Get drafts for an article
router.get('/:id/drafts', articlesController.getArticleDrafts);

// POST /api/admin/articles/:id/analyze - Analyze single article
router.post('/:id/analyze', articlesController.analyzeOne);

// POST /api/admin/articles/:id/reanalyze - Re-analyze article (delete drafts and redo)
router.post('/:id/reanalyze', articlesController.reanalyzeArticle);

// POST /api/admin/articles/:id/generate - Generate content for screened article
router.post('/:id/generate', articlesController.generateContent);

// DELETE /api/admin/articles/:id - Delete article by ID
router.delete('/:id', articlesController.deleteArticle);

export default router;

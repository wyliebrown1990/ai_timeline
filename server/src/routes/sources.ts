import { Router } from 'express';
import * as sourcesController from '../controllers/sources';
import { requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * News Source and Article Ingestion API routes
 * All routes require admin authentication
 * Prefix: /api/admin
 */

// Source management routes
// GET /api/admin/sources - List all sources with article counts
router.get('/sources', requireAdmin, sourcesController.getAllSources);

// GET /api/admin/sources/:id - Get a single source
router.get('/sources/:id', requireAdmin, sourcesController.getSourceById);

// POST /api/admin/sources - Create a new source
router.post('/sources', requireAdmin, sourcesController.createSource);

// PUT /api/admin/sources/:id - Update a source
router.put('/sources/:id', requireAdmin, sourcesController.updateSource);

// DELETE /api/admin/sources/:id - Delete a source
router.delete('/sources/:id', requireAdmin, sourcesController.deleteSource);

// POST /api/admin/sources/:id/fetch - Manually fetch articles from a source
router.post('/sources/:id/fetch', requireAdmin, sourcesController.fetchSourceArticles);

// Ingestion routes
// POST /api/admin/ingestion/fetch-all - Fetch articles from all active sources
router.post('/ingestion/fetch-all', requireAdmin, sourcesController.fetchAllSources);

// Article routes
// GET /api/admin/articles - List all ingested articles with pagination
router.get('/articles', requireAdmin, sourcesController.getAllArticles);

// GET /api/admin/articles/:id - Get a single article
router.get('/articles/:id', requireAdmin, sourcesController.getArticleById);

export default router;

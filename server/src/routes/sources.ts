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

// POST /api/admin/sources/test - Test connection to a source without saving
router.post('/sources/test', requireAdmin, sourcesController.testSourceConnection);

// PUT /api/admin/sources/:id - Update a source
router.put('/sources/:id', requireAdmin, sourcesController.updateSource);

// DELETE /api/admin/sources/:id - Delete a source
router.delete('/sources/:id', requireAdmin, sourcesController.deleteSource);

// POST /api/admin/sources/:id/fetch - Manually fetch articles from a source
router.post('/sources/:id/fetch', requireAdmin, sourcesController.fetchSourceArticles);

// Ingestion routes
// POST /api/admin/ingestion/fetch-all - Fetch articles from all active sources
router.post('/ingestion/fetch-all', requireAdmin, sourcesController.fetchAllSources);

// Note: Article routes moved to server/src/routes/articles.ts
// GET /api/admin/articles - now handled by articlesRoutes
// GET /api/admin/articles/:id - now handled by articlesRoutes

export default router;

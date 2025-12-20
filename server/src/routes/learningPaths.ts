import { Router } from 'express';
import * as learningPathsController from '../controllers/learningPaths';
import { requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Learning Paths API routes (Sprint 37)
 * Public routes: /api/learning-paths
 * Admin routes: /api/admin/learning-paths
 */

// Public routes - no authentication required
// GET /api/learning-paths - List all learning paths
router.get('/', learningPathsController.getAllPaths);

// GET /api/learning-paths/difficulty/:difficulty - Filter by difficulty
router.get('/difficulty/:difficulty', learningPathsController.getPathsByDifficulty);

// GET /api/learning-paths/:slug - Get single path with checkpoints
router.get('/:slug', learningPathsController.getPathBySlug);

export default router;

/**
 * Admin learning paths routes (require authentication)
 * These are mounted separately on /api/admin/learning-paths
 */
export const adminRouter = Router();

// POST /api/admin/learning-paths/bulk - Bulk create/update paths (for seeding)
adminRouter.post('/bulk', requireAdmin, learningPathsController.bulkCreatePaths);

// POST /api/admin/learning-paths - Create a new path
adminRouter.post('/', requireAdmin, learningPathsController.createPath);

// PUT /api/admin/learning-paths/:slug - Update a path
adminRouter.put('/:slug', requireAdmin, learningPathsController.updatePath);

// DELETE /api/admin/learning-paths/:slug - Delete a path
adminRouter.delete('/:slug', requireAdmin, learningPathsController.deletePath);

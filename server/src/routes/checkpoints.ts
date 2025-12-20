import { Router } from 'express';
import * as checkpointsController from '../controllers/checkpoints';
import { requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Checkpoints API routes (Sprint 37)
 * Public routes: /api/checkpoints
 * Admin routes: /api/admin/checkpoints
 */

// Public routes - no authentication required
// GET /api/checkpoints/path/:pathSlug - Get checkpoints for a learning path
router.get('/path/:pathSlug', checkpointsController.getCheckpointsForPath);

// GET /api/checkpoints/:id - Get single checkpoint
router.get('/:id', checkpointsController.getCheckpointById);

export default router;

/**
 * Admin checkpoints routes (require authentication)
 * These are mounted separately on /api/admin/checkpoints
 */
export const adminRouter = Router();

// POST /api/admin/checkpoints/bulk - Bulk create checkpoints (for seeding)
adminRouter.post('/bulk', requireAdmin, checkpointsController.bulkCreateCheckpoints);

// POST /api/admin/checkpoints - Create a new checkpoint
adminRouter.post('/', requireAdmin, checkpointsController.createCheckpoint);

// PUT /api/admin/checkpoints/:id - Update a checkpoint
adminRouter.put('/:id', requireAdmin, checkpointsController.updateCheckpoint);

// DELETE /api/admin/checkpoints/:id - Delete a checkpoint
adminRouter.delete('/:id', requireAdmin, checkpointsController.deleteCheckpoint);

/**
 * Key Figures API Routes
 * Sprint 45 - Key Figures API & Admin CRUD
 *
 * Public routes: /api/key-figures
 * Admin routes: /api/admin/key-figures
 */

import { Router } from 'express';
import * as keyFiguresController from '../controllers/keyFigures';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Public routes - no authentication required

// GET /api/key-figures - List key figures with filters and pagination
router.get('/', keyFiguresController.listKeyFigures);

// GET /api/key-figures/search - Quick search for autocomplete
router.get('/search', keyFiguresController.searchKeyFigures);

// GET /api/key-figures/:id - Get single key figure
router.get('/:id', keyFiguresController.getKeyFigure);

// GET /api/key-figures/:id/milestones - Get milestones for a key figure
router.get('/:id/milestones', keyFiguresController.getKeyFigureMilestones);

export default router;

/**
 * Admin key figures routes (require authentication)
 * Mounted on /api/admin/key-figures
 */
export const adminRouter = Router();

// GET /api/admin/key-figures/stats - Get statistics
adminRouter.get('/stats', requireAdmin, keyFiguresController.getStats);

// POST /api/admin/key-figures/generate-variants - Generate name variants
adminRouter.post('/generate-variants', requireAdmin, keyFiguresController.generateVariants);

// POST /api/admin/key-figures/merge - Merge multiple key figures into one
adminRouter.post('/merge', requireAdmin, keyFiguresController.mergeKeyFigures);

// POST /api/admin/key-figures - Create new key figure
adminRouter.post('/', requireAdmin, keyFiguresController.createKeyFigure);

// PUT /api/admin/key-figures/:id - Update key figure
adminRouter.put('/:id', requireAdmin, keyFiguresController.updateKeyFigure);

// DELETE /api/admin/key-figures/:id - Delete key figure
adminRouter.delete('/:id', requireAdmin, keyFiguresController.deleteKeyFigure);

/**
 * Milestone contributor routes
 * Public: /api/milestones/:id/contributors (GET)
 * Admin: /api/admin/milestones/:id/contributors (POST, DELETE)
 */
export const milestoneContributorRouter = Router();

// GET /api/milestones/:id/contributors - Get contributors for a milestone
milestoneContributorRouter.get('/:id/contributors', keyFiguresController.getMilestoneContributors);

export const adminMilestoneContributorRouter = Router();

// POST /api/admin/milestones/:id/contributors - Add contributor
adminMilestoneContributorRouter.post('/:id/contributors', requireAdmin, keyFiguresController.addMilestoneContributor);

// DELETE /api/admin/milestones/:id/contributors/:keyFigureId - Remove contributor
adminMilestoneContributorRouter.delete('/:id/contributors/:keyFigureId', requireAdmin, keyFiguresController.removeMilestoneContributor);

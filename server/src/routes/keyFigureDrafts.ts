/**
 * Key Figure Drafts API Routes
 * Sprint 46 - Key Figures Pipeline Integration
 *
 * Admin routes: /api/admin/key-figure-drafts
 * Handles review queue for key figures extracted from articles
 */

import { Router } from 'express';
import * as keyFigureDraftsController from '../controllers/keyFigureDrafts';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require admin authentication

// GET /api/admin/key-figure-drafts - List drafts with filters and pagination
router.get('/', requireAdmin, keyFigureDraftsController.listDrafts);

// GET /api/admin/key-figure-drafts/stats - Get draft statistics by status
router.get('/stats', requireAdmin, keyFigureDraftsController.getDraftStats);

// POST /api/admin/key-figure-drafts/batch-reject - Reject multiple drafts
router.post('/batch-reject', requireAdmin, keyFigureDraftsController.batchRejectDrafts);

// GET /api/admin/key-figure-drafts/:id - Get single draft
router.get('/:id', requireAdmin, keyFigureDraftsController.getDraft);

// POST /api/admin/key-figure-drafts/:id/approve - Approve and create KeyFigure
router.post('/:id/approve', requireAdmin, keyFigureDraftsController.approveDraft);

// POST /api/admin/key-figure-drafts/:id/reject - Reject draft
router.post('/:id/reject', requireAdmin, keyFigureDraftsController.rejectDraft);

// POST /api/admin/key-figure-drafts/:id/merge - Merge with existing KeyFigure
router.post('/:id/merge', requireAdmin, keyFigureDraftsController.mergeDraft);

export default router;

/**
 * Person Drafts API Routes
 * Sprint KPC-4 - AI Entity Detection & Auto-Linking
 *
 * Admin routes: /api/admin/person-drafts
 * Handles review queue for persons extracted from articles via entity detection
 */

import { Router } from 'express';
import * as personDraftsController from '../controllers/personDrafts';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require admin authentication

// GET /api/admin/person-drafts - List drafts with filters and pagination
router.get('/', requireAdmin, personDraftsController.listDrafts);

// GET /api/admin/person-drafts/stats - Get draft statistics by status
router.get('/stats', requireAdmin, personDraftsController.getDraftStats);

// POST /api/admin/person-drafts/batch-reject - Reject multiple drafts
router.post('/batch-reject', requireAdmin, personDraftsController.batchRejectDrafts);

// GET /api/admin/person-drafts/:id - Get single draft
router.get('/:id', requireAdmin, personDraftsController.getDraft);

// POST /api/admin/person-drafts/:id/approve - Approve and create Person
router.post('/:id/approve', requireAdmin, personDraftsController.approveDraft);

// POST /api/admin/person-drafts/:id/reject - Reject draft
router.post('/:id/reject', requireAdmin, personDraftsController.rejectDraft);

// POST /api/admin/person-drafts/:id/merge - Merge with existing Person
router.post('/:id/merge', requireAdmin, personDraftsController.mergeDraft);

export default router;

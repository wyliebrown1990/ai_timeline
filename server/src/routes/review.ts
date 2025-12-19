/**
 * Review Routes
 *
 * API endpoints for the admin review queue workflow.
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import * as reviewController from '../controllers/review';

const router = Router();

// All routes require admin authentication
router.use(requireAdmin);

// GET /api/admin/review/queue - Get pending drafts with filters
router.get('/queue', reviewController.getQueue);

// GET /api/admin/review/counts - Get queue counts by type
router.get('/counts', reviewController.getQueueCounts);

// GET /api/admin/review/published - Get recently published items
router.get('/published', reviewController.getPublished);

// GET /api/admin/review/:id - Get single draft with article context
router.get('/:id', reviewController.getDraft);

// PUT /api/admin/review/:id - Update draft content
router.put('/:id', reviewController.updateDraft);

// POST /api/admin/review/:id/approve - Approve and publish
router.post('/:id/approve', reviewController.approveDraft);

// POST /api/admin/review/:id/reject - Reject with notes
router.post('/:id/reject', reviewController.rejectDraft);

export default router;

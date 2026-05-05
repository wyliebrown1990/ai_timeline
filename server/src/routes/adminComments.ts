/**
 * Admin Comment Moderation Routes
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 *
 * Routes for admin moderation of reported comments.
 * Mounted at /api/admin/comments
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import * as commentService from '../services/commentService';

const router = Router();

// All routes require admin auth
router.use(requireAuth);

/**
 * GET /api/admin/comments/reported
 * Get reported comments for moderation
 */
router.get('/reported', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const minReports = parseInt(req.query.minReports as string) || 1;

    const result = await commentService.getReportedCommentsForAdmin(limit, offset, minReports);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/comments/:id/hide
 * Hide a comment from public view
 */
router.post('/:id/hide', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id;
    const comment = await commentService.hideComment(commentId);
    res.json(comment);
  } catch (error) {
    if (error instanceof Error && error.message === 'Comment not found') {
      next(ApiError.notFound('Comment not found'));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/admin/comments/:id/unhide
 * Unhide a comment
 */
router.post('/:id/unhide', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id;
    const comment = await commentService.unhideComment(commentId);
    res.json(comment);
  } catch (error) {
    if (error instanceof Error && error.message === 'Comment not found') {
      next(ApiError.notFound('Comment not found'));
    } else {
      next(error);
    }
  }
});

/**
 * DELETE /api/admin/comments/:id
 * Force delete a comment (permanent soft delete)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id;
    await commentService.adminDeleteComment(commentId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Comment not found') {
      next(ApiError.notFound('Comment not found'));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/admin/comments/:id/dismiss-reports
 * Dismiss all reports for a comment without taking action
 */
router.post('/:id/dismiss-reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id;
    const comment = await commentService.dismissReports(commentId);
    res.json(comment);
  } catch (error) {
    if (error instanceof Error && error.message === 'Comment not found') {
      next(ApiError.notFound('Comment not found'));
    } else {
      next(error);
    }
  }
});

export default router;

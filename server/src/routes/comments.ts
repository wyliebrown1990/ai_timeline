/**
 * Comment Routes
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth as requireUserAuth,
  optionalAuth,
  type AuthenticatedRequest,
} from '../middleware/authMiddleware';
import { requireAuth as requireAdminAuth } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import * as commentService from '../services/commentService';

const router = Router();

// Validation schemas
const targetTypeSchema = z.enum(['milestone', 'news_event', 'glossary_term', 'person', 'organization']);
const sortModeSchema = z.enum(['best', 'new', 'controversial']);

const createCommentSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
  parentId: z.string().optional(),
  body: z.string().min(1).max(10000),
});

const updateCommentSchema = z.object({
  body: z.string().min(1).max(10000),
});

const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

const reportSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'misinformation', 'off_topic', 'other']),
  details: z.string().max(1000).optional(),
});

// =============================================================================
// Public Routes
// =============================================================================

/**
 * GET /api/comments/:targetType/:targetId
 * Get comments for a target with threading
 */
router.get('/:targetType/:targetId', optionalAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const targetType = targetTypeSchema.parse(req.params.targetType);
    const targetId = req.params.targetId;
    const sortBy = sortModeSchema.optional().parse(req.query.sort) || 'best';
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const userId = req.user?.userId;

    const result = await commentService.getCommentsForTarget(
      targetType,
      targetId,
      sortBy,
      userId,
      limit,
      offset
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/comments/count/:targetType/:targetId
 * Get comment count for a target
 */
router.get('/count/:targetType/:targetId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetType = targetTypeSchema.parse(req.params.targetType);
    const targetId = req.params.targetId;

    const count = await commentService.getCommentCount(targetType, targetId);

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/comments/user/:username
 * Get a user's comment history
 */
router.get('/user/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await commentService.getUserComments(username, limit, offset);

    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      next(ApiError.notFound('User not found'));
    } else {
      next(error);
    }
  }
});

// =============================================================================
// Authenticated Routes
// =============================================================================

/**
 * POST /api/comments
 * Create a new comment
 */
router.post('/', requireUserAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createCommentSchema.parse(req.body);
    const authorId = req.user!.userId;

    const comment = await commentService.createComment({
      authorId,
      ...data,
    });

    res.status(201).json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest('Invalid comment data', error.errors));
    } else if (error instanceof Error) {
      next(ApiError.badRequest(error.message));
    } else {
      next(error);
    }
  }
});

/**
 * PUT /api/comments/:id
 * Edit a comment (author only)
 */
router.put('/:id', requireUserAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id;
    const authorId = req.user!.userId;
    const data = updateCommentSchema.parse(req.body);

    const comment = await commentService.updateComment(commentId, authorId, data.body);

    res.json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest('Invalid comment data', error.errors));
    } else if (error instanceof Error) {
      if (error.message === 'Comment not found') {
        next(ApiError.notFound('Comment not found'));
      } else if (error.message === 'Not authorized to edit this comment') {
        next(ApiError.forbidden('Not authorized to edit this comment'));
      } else {
        next(ApiError.badRequest(error.message));
      }
    } else {
      next(error);
    }
  }
});

/**
 * DELETE /api/comments/:id
 * Delete a comment (author only, soft delete)
 */
router.delete('/:id', requireUserAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id;
    const requesterId = req.user!.userId;

    await commentService.deleteComment(commentId, requesterId);

    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Comment not found') {
        next(ApiError.notFound('Comment not found'));
      } else if (error.message === 'Not authorized to delete this comment') {
        next(ApiError.forbidden('Not authorized to delete this comment'));
      } else {
        next(ApiError.badRequest(error.message));
      }
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/comments/:id/vote
 * Vote on a comment (upvote, downvote, or remove vote)
 */
router.post('/:id/vote', requireUserAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id;
    const userId = req.user!.userId;
    const data = voteSchema.parse(req.body);

    const result = await commentService.voteOnComment(commentId, userId, data.value);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest('Invalid vote data', error.errors));
    } else if (error instanceof Error) {
      if (error.message === 'Comment not found') {
        next(ApiError.notFound('Comment not found'));
      } else {
        next(ApiError.badRequest(error.message));
      }
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/comments/:id/report
 * Report a comment
 */
router.post('/:id/report', requireUserAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id;
    const reporterId = req.user!.userId;
    const data = reportSchema.parse(req.body);

    await commentService.reportComment(commentId, reporterId, data.reason, data.details);

    res.json({ success: true, message: 'Comment reported' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest('Invalid report data', error.errors));
    } else if (error instanceof Error) {
      if (error.message === 'Comment not found') {
        next(ApiError.notFound('Comment not found'));
      } else {
        next(ApiError.badRequest(error.message));
      }
    } else {
      next(error);
    }
  }
});

// =============================================================================
// Admin Routes
// =============================================================================

/**
 * GET /api/admin/comments/reported
 * Get reported comments (admin only)
 */
router.get('/admin/reported', requireAdminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = (req.query.status as 'pending' | 'reviewed' | 'dismissed') || 'pending';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const reports = await commentService.getReportedComments(status, limit);

    res.json(reports);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/comments/:id/hide
 * Hide a comment (admin only)
 */
router.post('/admin/:id/hide', requireAdminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id;
    await commentService.hideComment(commentId);
    res.json({ success: true, message: 'Comment hidden' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/comments/:id/unhide
 * Unhide a comment (admin only)
 */
router.post('/admin/:id/unhide', requireAdminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id;
    await commentService.unhideComment(commentId);
    res.json({ success: true, message: 'Comment unhidden' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/comments/:id
 * Force delete a comment (admin only)
 */
router.delete('/admin/:id', requireAdminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id;
    // Admins can delete any comment
    await commentService.deleteComment(commentId, '', true);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/comments/reports/:id/review
 * Review a report (admin only)
 */
router.post('/admin/reports/:id/review', requireAdminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.id;
    const action = req.body.action as 'dismiss' | 'hide_comment' | 'delete_comment';
    const reviewerId = 'admin'; // In a real app, get from req.user

    if (!['dismiss', 'hide_comment', 'delete_comment'].includes(action)) {
      throw ApiError.badRequest('Invalid action');
    }

    await commentService.reviewReport(reportId, reviewerId, action);

    res.json({ success: true, message: 'Report reviewed' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Report not found') {
      next(ApiError.notFound('Report not found'));
    } else {
      next(error);
    }
  }
});

export default router;

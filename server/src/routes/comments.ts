/**
 * Comment Routes
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 * Sprint Spam-1 - Rate Limiting & Content Filtering
 * Sprint Spam-2 - Account Trust & Verification
 * Sprint Spam-3 - Auto-Flagging & Shadowban
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
import { prisma } from '../db';
import * as commentService from '../services/commentService';
import {
  checkCommentRateLimit,
  incrementCommentCount,
  checkVoteRateLimit,
  incrementVoteCount,
  getRateLimitHeaders,
} from '../services/rateLimiter';
import { filterComment } from '../services/contentFilter';
import { checkAndFlagComment, createFlag } from '../services/autoFlagService';

const router = Router();

// Validation schemas
const targetTypeSchema = z.enum(['milestone', 'news_event', 'glossary_term', 'person', 'organization']);
const sortModeSchema = z.enum(['best', 'new', 'controversial']);

const createCommentSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
  parentId: z.string().optional(),
  body: z.string().min(1).max(10000),
  // Honeypot field - should always be empty if submitted by a human
  website: z.string().max(0).optional(),
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

    // Honeypot check - if website field is filled, silently reject (bot detected)
    if (data.website && data.website.length > 0) {
      // Log for monitoring but don't reveal to client
      console.log(`[SPAM] Honeypot triggered by user ${authorId}`);
      // Return fake success to not alert the bot
      res.status(201).json({
        id: 'fake-' + Date.now(),
        body: data.body,
        authorId,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    // Fetch user to check verification status (Sprint Spam-2)
    const user = await prisma.user.findUnique({
      where: { id: authorId },
      select: {
        emailVerifiedAt: true,
        canComment: true,
        learningActionsCount: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Email verification gate (Sprint Spam-2)
    if (!user.emailVerifiedAt) {
      res.status(403).json({
        error: 'Email Verification Required',
        message: 'Please verify your email address before commenting. Check your inbox for a verification link.',
        code: 'EMAIL_NOT_VERIFIED',
      });
      return;
    }

    // Learning action gate (Sprint Spam-2)
    // Users must complete at least 1 learning action OR have canComment = true (admin override)
    if (!user.canComment && user.learningActionsCount < 1) {
      res.status(403).json({
        error: 'Learning Activity Required',
        message: 'Complete a learning activity (view a milestone, study flashcards, or take a quiz) to unlock commenting.',
        code: 'LEARNING_ACTION_REQUIRED',
      });
      return;
    }

    // Rate limit check
    const rateLimitResult = await checkCommentRateLimit(authorId);
    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult, 'comment');
      Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
      res.status(429).json({
        error: 'Too Many Requests',
        message: rateLimitResult.reason,
        retryAfter: rateLimitResult.retryAfter,
      });
      return;
    }

    // Content filter check
    const filterResult = await filterComment(data.body);
    if (!filterResult.allowed) {
      res.status(400).json({
        error: 'Content Blocked',
        message: filterResult.reason,
      });
      return;
    }

    // Fetch full user info for auto-flagging
    const fullUser = await prisma.user.findUnique({
      where: { id: authorId },
      select: {
        id: true,
        createdAt: true,
        trustScore: true,
        learningActionsCount: true,
      },
    });

    // Create the comment
    const comment = await commentService.createComment({
      authorId,
      targetType: data.targetType,
      targetId: data.targetId,
      parentId: data.parentId,
      body: data.body,
    });

    // Auto-flag check (Sprint Spam-3)
    // Check if this comment should be flagged for review
    if (fullUser) {
      const flagResult = await checkAndFlagComment(
        { id: comment.id, body: comment.body, createdAt: comment.createdAt },
        fullUser
      );
      if (flagResult.shouldFlag && flagResult.reason && flagResult.severity) {
        // Create flag asynchronously (don't block response)
        createFlag('comment', comment.id, flagResult.reason, flagResult.severity).catch(
          (err) => console.error('[AutoFlag] Error creating flag:', err)
        );
      }
    }

    // Increment rate limit counter
    await incrementCommentCount(authorId);

    // Add rate limit headers to response
    const headers = getRateLimitHeaders(
      { allowed: true, remaining: (rateLimitResult.remaining || 1) - 1 },
      'comment'
    );
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

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
 * Extract voter IP from request (Sprint Spam-4)
 * Handles x-forwarded-for header from CloudFront/Cloudflare
 */
function extractVoterIp(req: Request): string | null {
  // Check x-forwarded-for (from CloudFront/Cloudflare)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can be comma-separated list; take first one
    const ips = typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0];
    const firstIp = ips?.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  // Cloudflare specific header
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    return typeof cfConnectingIp === 'string' ? cfConnectingIp : cfConnectingIp[0] || null;
  }

  // Fallback to req.ip
  return req.ip || null;
}

/**
 * POST /api/comments/:id/vote
 * Vote on a comment (upvote, downvote, or remove vote)
 */
router.post('/:id/vote', requireUserAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id;
    const userId = req.user!.userId;
    const data = voteSchema.parse(req.body);

    // Extract voter IP for integrity checks (Sprint Spam-4)
    const voterIp = extractVoterIp(req);

    // Rate limit check (only for new votes, not removing votes)
    if (data.value !== 0) {
      const rateLimitResult = await checkVoteRateLimit(userId);
      if (!rateLimitResult.allowed) {
        const headers = getRateLimitHeaders(rateLimitResult, 'vote');
        Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
        res.status(429).json({
          error: 'Too Many Requests',
          message: rateLimitResult.reason,
          retryAfter: rateLimitResult.retryAfter,
        });
        return;
      }
    }

    const result = await commentService.voteOnComment(commentId, userId, data.value, voterIp);

    // Increment rate limit counter (only for new votes)
    if (data.value !== 0) {
      await incrementVoteCount(userId);
    }

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest('Invalid vote data', error.errors));
    } else if (error instanceof Error) {
      if (error.message === 'Comment not found') {
        next(ApiError.notFound('Comment not found'));
      } else if (error.message === 'Cannot vote on your own comment') {
        // Self-vote prevention (Sprint Spam-4)
        res.status(400).json({
          error: 'Self-Vote Not Allowed',
          message: 'You cannot vote on your own comment',
        });
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

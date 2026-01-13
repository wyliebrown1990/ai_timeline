/**
 * Admin User Management Routes (Sprint Spam-2)
 *
 * Endpoints for managing users, viewing trust scores, and admin overrides.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import * as trustService from '../services/trustService';
import { prisma } from '../db';

const router = Router();

// Validation schemas
const trustTierSchema = z.enum(['new', 'member', 'trusted', 'veteran']);

/**
 * GET /api/admin/users
 * List users with trust info
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sortBy = (req.query.sortBy as 'trustScore' | 'createdAt' | 'commentKarma') || 'trustScore';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
    const tier = req.query.tier ? trustTierSchema.parse(req.query.tier) : undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await trustService.getUsersWithTrust({
      sortBy,
      sortOrder,
      tier,
      limit,
      offset,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest('Invalid query parameters', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/admin/users/:id
 * Get user details with trust breakdown
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        emailVerifiedAt: true,
        canComment: true,
        commentUnlockedAt: true,
        commentKarma: true,
        trustScore: true,
        totalUpvotesReceived: true,
        totalDownvotesReceived: true,
        commentsRemovedCount: true,
        learningActionsCount: true,
        lastCommentAt: true,
        hourlyCommentCount: true,
        dailyCommentCount: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Calculate full trust breakdown
    const trustInfo = await trustService.calculateTrustScore(userId);
    const limits = trustService.getLimitsForTier(trustInfo.tier);

    res.json({
      user: {
        ...user,
        totalComments: user._count.comments,
      },
      trust: {
        score: trustInfo.score,
        tier: trustInfo.tier,
        breakdown: trustInfo.breakdown,
      },
      limits,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:id/grant-comment
 * Admin override to grant commenting permission
 */
router.post('/:id/grant-comment', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, canComment: true },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.canComment) {
      res.json({
        success: true,
        message: 'User already has commenting permission',
        user: { id: user.id, username: user.username, canComment: true },
      });
      return;
    }

    await trustService.grantCommentPermission(userId);

    res.json({
      success: true,
      message: 'Commenting permission granted',
      user: { id: user.id, username: user.username, canComment: true },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:id/reset-trust
 * Reset user's trust score to 0
 */
router.post('/:id/reset-trust', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    await trustService.resetTrustScore(userId);

    res.json({
      success: true,
      message: 'Trust score reset to 0',
      user: { id: user.id, username: user.username, trustScore: 0 },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:id/revoke-comment
 * Revoke commenting permission from user
 */
router.post('/:id/revoke-comment', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, canComment: true },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { canComment: false },
    });

    res.json({
      success: true,
      message: 'Commenting permission revoked',
      user: { id: user.id, username: user.username, canComment: false },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

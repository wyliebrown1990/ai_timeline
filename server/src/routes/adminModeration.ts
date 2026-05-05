/**
 * Admin Moderation Routes (Sprint Spam-3, Sprint Spam-4)
 *
 * Endpoints for managing flagged content, shadowbans, moderation logs,
 * and suspicious vote monitoring.
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import * as autoFlagService from '../services/autoFlagService';
import * as shadowbanService from '../services/shadowbanService';
import * as moderationLogger from '../services/moderationLogger';
import * as votePatternService from '../services/votePatternService';

const router = Router();

// =============================================================================
// Flagged Content Routes
// =============================================================================

/**
 * GET /api/admin/moderation/flagged
 * List flagged content for review
 */
router.get('/flagged', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as 'pending' | 'approved' | 'removed' | undefined;
    const severity = req.query.severity as 'low' | 'medium' | 'high' | undefined;
    const reason = req.query.reason as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await autoFlagService.getFlaggedContent({
      status,
      severity,
      reason: reason as autoFlagService.FlagReason | undefined,
      limit,
      offset,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/moderation/flagged/counts
 * Get pending flag counts by severity
 */
router.get('/flagged/counts', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const counts = await autoFlagService.getPendingFlagCount();
    res.json(counts);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/moderation/flagged/:id/approve
 * Approve flagged content (mark as safe)
 */
router.post('/flagged/:id/approve', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flagId = req.params.id;
    const moderatorId = 'admin'; // In real app, get from req.user

    await autoFlagService.approveFlaggedContent(flagId, moderatorId);

    res.json({ success: true, message: 'Content approved' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/moderation/flagged/:id/remove
 * Remove flagged content
 */
router.post('/flagged/:id/remove', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flagId = req.params.id;
    const moderatorId = 'admin'; // In real app, get from req.user

    await autoFlagService.removeFlaggedContent(flagId, moderatorId);

    res.json({ success: true, message: 'Content removed' });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Shadowban Routes
// =============================================================================

/**
 * GET /api/admin/moderation/shadowbanned
 * List shadowbanned users
 */
router.get('/shadowbanned', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await shadowbanService.getShadowbannedUsers({ limit, offset });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/moderation/users/:id/shadowban
 * Shadowban a user
 */
router.post('/users/:id/shadowban', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;
    const reason = req.body.reason as string | undefined;
    const moderatorId = 'admin'; // In real app, get from req.user

    const result = await shadowbanService.shadowbanUser(userId, moderatorId, reason);

    res.json({
      success: true,
      message: 'User shadowbanned',
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/moderation/users/:id/unshadowban
 * Remove shadowban from a user
 */
router.post('/users/:id/unshadowban', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;
    const moderatorId = 'admin'; // In real app, get from req.user

    const result = await shadowbanService.unshadowbanUser(userId, moderatorId);

    res.json({
      success: true,
      message: 'Shadowban removed',
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/moderation/users/:id/shadowban-status
 * Get shadowban status for a user
 */
router.get('/users/:id/shadowban-status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;

    const info = await shadowbanService.getShadowbanInfo(userId);

    if (!info) {
      throw ApiError.notFound('User not found');
    }

    res.json(info);
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Moderation Log Routes
// =============================================================================

/**
 * GET /api/admin/moderation/logs
 * List moderation logs
 */
router.get('/logs', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetType = req.query.targetType as 'user' | 'comment' | undefined;
    const action = req.query.action as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await moderationLogger.getModerationLogs({
      targetType,
      action: action as moderationLogger.ModerationAction | undefined,
      limit,
      offset,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/moderation/logs/target/:type/:id
 * Get moderation history for a specific target
 */
router.get('/logs/target/:type/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetType = req.params.type as 'user' | 'comment';
    const targetId = req.params.id;

    if (!['user', 'comment'].includes(targetType)) {
      throw ApiError.badRequest('Invalid target type');
    }

    const history = await moderationLogger.getTargetHistory(targetType, targetId);

    res.json({ history });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/moderation/stats
 * Get moderation statistics
 */
router.get('/stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const stats = await moderationLogger.getModerationStats(days);
    const flagCounts = await autoFlagService.getPendingFlagCount();
    const shadowbanned = await shadowbanService.getShadowbannedUsers({ limit: 0 });

    res.json({
      ...stats,
      pendingFlags: flagCounts,
      shadowbannedUsers: shadowbanned.total,
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Suspicious Vote Routes (Sprint Spam-4)
// =============================================================================

/**
 * GET /api/admin/moderation/suspicious-votes
 * List suspicious votes for review
 */
router.get('/suspicious-votes', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reason = req.query.reason as votePatternService.SuspiciousReason | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await votePatternService.getSuspiciousVotes({
      reason,
      limit,
      offset,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/moderation/votes/:id/clear
 * Clear suspicious flag from a vote
 */
router.post('/votes/:id/clear', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const voteId = req.params.id;
    const moderatorId = 'admin'; // In real app, get from req.user

    await votePatternService.clearVoteFlag(voteId, moderatorId);

    res.json({ success: true, message: 'Vote flag cleared' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Vote not found') {
      next(ApiError.notFound('Vote not found'));
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/admin/moderation/users/:id/voting-patterns
 * Get voting patterns for a specific user
 */
router.get('/users/:id/voting-patterns', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;

    const patterns = await votePatternService.getUserVotingPatterns(userId);

    res.json(patterns);
  } catch (error) {
    next(error);
  }
});

export default router;

/**
 * Moderation Logger Service (Sprint Spam-3)
 *
 * Provides audit trail for all moderation actions.
 * All moderation actions should be logged through this service.
 */

import { prisma } from '../db';

// =============================================================================
// Types
// =============================================================================

export type ModerationAction =
  | 'shadowban'
  | 'unshadowban'
  | 'remove_comment'
  | 'hide_comment'
  | 'restore_comment'
  | 'flag'
  | 'approve'
  | 'reject'
  | 'grant_comment'
  | 'revoke_comment'
  | 'reset_trust';

export type TargetType = 'user' | 'comment';

export interface LogActionParams {
  action: ModerationAction;
  targetType: TargetType;
  targetId: string;
  moderatorId: string | null;
  reason?: string;
  automated?: boolean;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Log a moderation action for audit trail
 */
export async function logModerationAction(params: LogActionParams): Promise<string> {
  const { action, targetType, targetId, moderatorId, reason, automated = false, metadata } = params;

  const log = await prisma.moderationLog.create({
    data: {
      action,
      targetType,
      targetId,
      moderatorId,
      reason,
      automated,
      metadata: metadata || null,
    },
  });

  return log.id;
}

/**
 * Get moderation logs with filtering and pagination
 */
export async function getModerationLogs(options?: {
  targetType?: TargetType;
  targetId?: string;
  action?: ModerationAction;
  moderatorId?: string;
  automated?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{
  logs: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    moderatorId: string | null;
    reason: string | null;
    automated: boolean;
    metadata: unknown;
    createdAt: Date;
  }>;
  total: number;
}> {
  const {
    targetType,
    targetId,
    action,
    moderatorId,
    automated,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options || {};

  // Build where clause
  const where: Record<string, unknown> = {};

  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;
  if (action) where.action = action;
  if (moderatorId) where.moderatorId = moderatorId;
  if (automated !== undefined) where.automated = automated;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.moderationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.moderationLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Get moderation history for a specific target (user or comment)
 */
export async function getTargetHistory(
  targetType: TargetType,
  targetId: string
): Promise<Array<{
  id: string;
  action: string;
  moderatorId: string | null;
  reason: string | null;
  automated: boolean;
  createdAt: Date;
}>> {
  return prisma.moderationLog.findMany({
    where: { targetType, targetId },
    select: {
      id: true,
      action: true,
      moderatorId: true,
      reason: true,
      automated: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get recent actions by a moderator
 */
export async function getModeratorActions(
  moderatorId: string,
  limit = 20
): Promise<Array<{
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  createdAt: Date;
}>> {
  return prisma.moderationLog.findMany({
    where: { moderatorId },
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      reason: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get summary statistics for moderation activity
 */
export async function getModerationStats(
  days = 30
): Promise<{
  totalActions: number;
  byAction: Record<string, number>;
  automatedCount: number;
  manualCount: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await prisma.moderationLog.findMany({
    where: { createdAt: { gte: startDate } },
    select: { action: true, automated: true },
  });

  const byAction: Record<string, number> = {};
  let automatedCount = 0;
  let manualCount = 0;

  for (const log of logs) {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
    if (log.automated) {
      automatedCount++;
    } else {
      manualCount++;
    }
  }

  return {
    totalActions: logs.length,
    byAction,
    automatedCount,
    manualCount,
  };
}

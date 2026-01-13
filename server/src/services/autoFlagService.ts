/**
 * Auto-Flag Service (Sprint Spam-3)
 *
 * Automatically flags suspicious content for moderation review.
 * Uses heuristics to detect potential spam or abuse.
 */

import { prisma } from '../db';
import { logModerationAction } from './moderationLogger';

// =============================================================================
// Types
// =============================================================================

export type FlagReason =
  | 'new_account_link'
  | 'similar_text'
  | 'rapid_posting'
  | 'low_trust_long_comment'
  | 'user_report'
  | 'vote_surge';  // Sprint Spam-4

export type FlagSeverity = 'low' | 'medium' | 'high';

export interface FlagResult {
  shouldFlag: boolean;
  reason?: FlagReason;
  severity?: FlagSeverity;
}

export interface AuthorInfo {
  id: string;
  createdAt: Date;
  trustScore: number;
  learningActionsCount: number;
}

// =============================================================================
// Configuration
// =============================================================================

const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
const NEW_ACCOUNT_DAYS = 7;
const SIMILARITY_THRESHOLD = 0.8;
const RAPID_POSTING_THRESHOLD = 5;
const RAPID_POSTING_WINDOW_MINUTES = 10;
const LOW_TRUST_THRESHOLD = 5;
const LONG_COMMENT_LENGTH = 500;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Check if a comment should be flagged for review
 */
export async function checkAndFlagComment(
  comment: { id: string; body: string; createdAt: Date },
  author: AuthorInfo
): Promise<FlagResult> {
  // Check in order of severity (high to low)

  // HIGH: New account with URLs
  const hasUrls = URL_REGEX.test(comment.body);
  URL_REGEX.lastIndex = 0; // Reset regex state
  const accountAgeDays = Math.floor(
    (Date.now() - author.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (accountAgeDays < NEW_ACCOUNT_DAYS && hasUrls) {
    return { shouldFlag: true, reason: 'new_account_link', severity: 'high' };
  }

  // MEDIUM: Similar text to recent comments (spam pattern)
  if (await hasSimilarRecentComment(author.id, comment.body)) {
    return { shouldFlag: true, reason: 'similar_text', severity: 'medium' };
  }

  // MEDIUM: Rapid posting
  if (await isRapidPosting(author.id)) {
    return { shouldFlag: true, reason: 'rapid_posting', severity: 'medium' };
  }

  // LOW: Low trust user with long comment
  if (author.trustScore < LOW_TRUST_THRESHOLD && comment.body.length > LONG_COMMENT_LENGTH) {
    return { shouldFlag: true, reason: 'low_trust_long_comment', severity: 'low' };
  }

  return { shouldFlag: false };
}

/**
 * Create a flag for content
 */
export async function createFlag(
  contentType: string,
  contentId: string,
  reason: FlagReason,
  severity: FlagSeverity
): Promise<string> {
  // Upsert to avoid duplicate flags
  const flag = await prisma.flaggedContent.upsert({
    where: {
      contentType_contentId: { contentType, contentId },
    },
    create: {
      contentType,
      contentId,
      reason,
      severity,
      status: 'pending',
    },
    update: {
      // If already exists, update severity if new one is higher
      severity: severity === 'high' ? 'high' : undefined,
      reason,
    },
  });

  // Log the flag
  await logModerationAction({
    action: 'flag',
    targetType: 'comment',
    targetId: contentId,
    moderatorId: null,
    reason: `Auto-flagged: ${reason}`,
    automated: true,
    metadata: { severity },
  });

  return flag.id;
}

/**
 * Flag content from user report
 */
export async function createUserReportFlag(
  contentType: string,
  contentId: string,
  reporterId: string,
  reportReason: string
): Promise<string> {
  const flag = await prisma.flaggedContent.upsert({
    where: {
      contentType_contentId: { contentType, contentId },
    },
    create: {
      contentType,
      contentId,
      reason: 'user_report',
      severity: 'medium',
      status: 'pending',
    },
    update: {
      // Bump to medium if was low
      severity: 'medium',
    },
  });

  await logModerationAction({
    action: 'flag',
    targetType: 'comment',
    targetId: contentId,
    moderatorId: reporterId,
    reason: `User report: ${reportReason}`,
    automated: false,
  });

  return flag.id;
}

// =============================================================================
// Detection Helpers
// =============================================================================

/**
 * Check if user has posted similar content recently
 * Uses simple similarity check (percentage of matching words)
 */
async function hasSimilarRecentComment(userId: string, newText: string): Promise<boolean> {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const recentComments = await prisma.comment.findMany({
    where: {
      authorId: userId,
      createdAt: { gte: oneDayAgo },
      isHidden: false,
    },
    select: { body: true },
    take: 20,
  });

  for (const comment of recentComments) {
    const similarity = calculateSimilarity(newText, comment.body);
    if (similarity >= SIMILARITY_THRESHOLD) {
      return true;
    }
  }

  return false;
}

/**
 * Check if user is posting too rapidly
 */
async function isRapidPosting(userId: string): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - RAPID_POSTING_WINDOW_MINUTES);

  const recentCount = await prisma.comment.count({
    where: {
      authorId: userId,
      createdAt: { gte: windowStart },
    },
  });

  return recentCount >= RAPID_POSTING_THRESHOLD;
}

/**
 * Calculate similarity between two texts (0-1)
 * Uses word overlap method for simplicity
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

  if (words1.size === 0 || words2.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      intersection++;
    }
  }

  // Jaccard similarity
  const union = words1.size + words2.size - intersection;
  return intersection / union;
}

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Get flagged content for review
 */
export async function getFlaggedContent(options?: {
  status?: 'pending' | 'approved' | 'removed';
  severity?: FlagSeverity;
  reason?: FlagReason;
  limit?: number;
  offset?: number;
}): Promise<{
  items: Array<{
    id: string;
    contentType: string;
    contentId: string;
    reason: string;
    severity: string;
    status: string;
    createdAt: Date;
    comment?: {
      id: string;
      body: string;
      author: { id: string; username: string };
      createdAt: Date;
    };
  }>;
  total: number;
}> {
  const { status, severity, reason, limit = 50, offset = 0 } = options || {};

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (reason) where.reason = reason;

  const [flags, total] = await Promise.all([
    prisma.flaggedContent.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.flaggedContent.count({ where }),
  ]);

  // Fetch comment details for each flag
  const items = await Promise.all(
    flags.map(async (flag) => {
      let comment;
      if (flag.contentType === 'comment') {
        comment = await prisma.comment.findUnique({
          where: { id: flag.contentId },
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: {
              select: { id: true, username: true },
            },
          },
        });
      }

      return {
        ...flag,
        comment: comment || undefined,
      };
    })
  );

  return { items, total };
}

/**
 * Approve flagged content (mark as safe)
 */
export async function approveFlaggedContent(
  flagId: string,
  moderatorId: string
): Promise<void> {
  const flag = await prisma.flaggedContent.update({
    where: { id: flagId },
    data: {
      status: 'approved',
      reviewedBy: moderatorId,
      reviewedAt: new Date(),
    },
  });

  await logModerationAction({
    action: 'approve',
    targetType: 'comment',
    targetId: flag.contentId,
    moderatorId,
    reason: 'Flagged content approved',
    automated: false,
  });
}

/**
 * Remove flagged content and optionally update author stats
 */
export async function removeFlaggedContent(
  flagId: string,
  moderatorId: string
): Promise<void> {
  const flag = await prisma.flaggedContent.update({
    where: { id: flagId },
    data: {
      status: 'removed',
      reviewedBy: moderatorId,
      reviewedAt: new Date(),
    },
  });

  // If it's a comment, hide it and update author's removed count
  if (flag.contentType === 'comment') {
    const comment = await prisma.comment.findUnique({
      where: { id: flag.contentId },
      select: { authorId: true },
    });

    if (comment) {
      await prisma.$transaction([
        prisma.comment.update({
          where: { id: flag.contentId },
          data: { isHidden: true },
        }),
        prisma.user.update({
          where: { id: comment.authorId },
          data: { commentsRemovedCount: { increment: 1 } },
        }),
      ]);
    }
  }

  await logModerationAction({
    action: 'remove_comment',
    targetType: 'comment',
    targetId: flag.contentId,
    moderatorId,
    reason: `Removed via flag review (reason: ${flag.reason})`,
    automated: false,
  });
}

/**
 * Get pending flag count for dashboard
 */
export async function getPendingFlagCount(): Promise<{
  total: number;
  high: number;
  medium: number;
  low: number;
}> {
  const [total, high, medium, low] = await Promise.all([
    prisma.flaggedContent.count({ where: { status: 'pending' } }),
    prisma.flaggedContent.count({ where: { status: 'pending', severity: 'high' } }),
    prisma.flaggedContent.count({ where: { status: 'pending', severity: 'medium' } }),
    prisma.flaggedContent.count({ where: { status: 'pending', severity: 'low' } }),
  ]);

  return { total, high, medium, low };
}

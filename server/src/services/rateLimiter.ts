/**
 * Rate Limiter Service (Sprint Spam-1, Spam-2)
 *
 * Provides rate limiting for comments and votes to prevent spam.
 * Limits are stored in the database (persistent across Lambda invocations).
 *
 * Sprint Spam-2: Limits now vary by user trust tier.
 */

import { prisma } from '../db';
import { type TrustTier, getTrustTier, getLimitsForTier } from './trustService';

// =============================================================================
// Configuration (Default limits for backward compatibility)
// =============================================================================

const DEFAULT_COMMENTS_PER_HOUR = 10;
const DEFAULT_VOTES_PER_HOUR = 50;

// =============================================================================
// Types
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number; // Seconds until user can try again
  remaining?: number; // Remaining actions in current window
}

// =============================================================================
// Comment Rate Limiting
// =============================================================================

/**
 * Check if user can post a comment
 * @param userId - The user ID
 * @param trustScore - Optional trust score (if not provided, will be fetched from DB)
 */
export async function checkCommentRateLimit(
  userId: string,
  trustScore?: number
): Promise<RateLimitResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastCommentAt: true,
      hourlyCommentCount: true,
      hourlyCommentResetAt: true,
      dailyCommentCount: true,
      dailyCommentResetAt: true,
      trustScore: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  // Determine trust tier and limits
  const score = trustScore ?? user.trustScore;
  const tier = getTrustTier(score);
  const limits = getLimitsForTier(tier);

  const now = new Date();

  // Check cooldown between comments
  if (user.lastCommentAt) {
    const secondsSinceLastComment = Math.floor(
      (now.getTime() - user.lastCommentAt.getTime()) / 1000
    );
    if (secondsSinceLastComment < limits.cooldownSeconds) {
      const retryAfter = limits.cooldownSeconds - secondsSinceLastComment;
      return {
        allowed: false,
        reason: `Please wait ${retryAfter} seconds before posting another comment`,
        retryAfter,
      };
    }
  }

  // Check hourly limit
  const hourlyCount = getCountWithReset(
    user.hourlyCommentCount,
    user.hourlyCommentResetAt,
    now,
    60 * 60 * 1000 // 1 hour in ms
  );

  if (hourlyCount >= limits.commentsPerHour) {
    const resetTime = user.hourlyCommentResetAt || now;
    const retryAfter = Math.max(
      0,
      Math.ceil((resetTime.getTime() + 60 * 60 * 1000 - now.getTime()) / 1000)
    );
    return {
      allowed: false,
      reason: `You've reached the limit of ${limits.commentsPerHour} comments per hour`,
      retryAfter,
      remaining: 0,
    };
  }

  // Check daily limit
  const dailyCount = getCountWithReset(
    user.dailyCommentCount,
    user.dailyCommentResetAt,
    now,
    24 * 60 * 60 * 1000 // 24 hours in ms
  );

  if (dailyCount >= limits.commentsPerDay) {
    const resetTime = user.dailyCommentResetAt || now;
    const retryAfter = Math.max(
      0,
      Math.ceil((resetTime.getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / 1000)
    );
    return {
      allowed: false,
      reason: `You've reached the limit of ${limits.commentsPerDay} comments per day`,
      retryAfter,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: Math.min(limits.commentsPerHour - hourlyCount, limits.commentsPerDay - dailyCount),
  };
}

/**
 * Increment user's comment count after successful post
 */
export async function incrementCommentCount(userId: string): Promise<void> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      hourlyCommentCount: true,
      hourlyCommentResetAt: true,
      dailyCommentCount: true,
      dailyCommentResetAt: true,
    },
  });

  if (!user) return;

  // Calculate new counts, resetting if window expired
  const hourlyReset = shouldReset(user.hourlyCommentResetAt, now, 60 * 60 * 1000);
  const dailyReset = shouldReset(user.dailyCommentResetAt, now, 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastCommentAt: now,
      hourlyCommentCount: hourlyReset ? 1 : user.hourlyCommentCount + 1,
      hourlyCommentResetAt: hourlyReset ? now : user.hourlyCommentResetAt ?? now,
      dailyCommentCount: dailyReset ? 1 : user.dailyCommentCount + 1,
      dailyCommentResetAt: dailyReset ? now : user.dailyCommentResetAt ?? now,
    },
  });
}

// =============================================================================
// Vote Rate Limiting
// =============================================================================

/**
 * Check if user can cast a vote
 * @param userId - The user ID
 * @param trustScore - Optional trust score (if not provided, will be fetched from DB)
 */
export async function checkVoteRateLimit(
  userId: string,
  trustScore?: number
): Promise<RateLimitResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      hourlyVoteCount: true,
      hourlyVoteResetAt: true,
      trustScore: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  // Determine trust tier and limits
  const score = trustScore ?? user.trustScore;
  const tier = getTrustTier(score);
  const limits = getLimitsForTier(tier);

  const now = new Date();

  // Check hourly limit
  const hourlyCount = getCountWithReset(
    user.hourlyVoteCount,
    user.hourlyVoteResetAt,
    now,
    60 * 60 * 1000
  );

  if (hourlyCount >= limits.votesPerHour) {
    const resetTime = user.hourlyVoteResetAt || now;
    const retryAfter = Math.max(
      0,
      Math.ceil((resetTime.getTime() + 60 * 60 * 1000 - now.getTime()) / 1000)
    );
    return {
      allowed: false,
      reason: `You've reached the limit of ${limits.votesPerHour} votes per hour`,
      retryAfter,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: limits.votesPerHour - hourlyCount,
  };
}

/**
 * Increment user's vote count after successful vote
 */
export async function incrementVoteCount(userId: string): Promise<void> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      hourlyVoteCount: true,
      hourlyVoteResetAt: true,
    },
  });

  if (!user) return;

  const hourlyReset = shouldReset(user.hourlyVoteResetAt, now, 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      hourlyVoteCount: hourlyReset ? 1 : user.hourlyVoteCount + 1,
      hourlyVoteResetAt: hourlyReset ? now : user.hourlyVoteResetAt ?? now,
    },
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get count, returning 0 if window has expired
 */
function getCountWithReset(
  count: number,
  resetAt: Date | null,
  now: Date,
  windowMs: number
): number {
  if (!resetAt) return 0;
  if (now.getTime() - resetAt.getTime() >= windowMs) return 0;
  return count;
}

/**
 * Check if the window should reset
 */
function shouldReset(resetAt: Date | null, now: Date, windowMs: number): boolean {
  if (!resetAt) return true;
  return now.getTime() - resetAt.getTime() >= windowMs;
}

/**
 * Get rate limit headers for HTTP response
 * @param result - The rate limit result
 * @param limitType - Type of limit ('comment' or 'vote')
 * @param tier - Optional trust tier for accurate limit display
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
  limitType: 'comment' | 'vote',
  tier?: TrustTier
): Record<string, string> {
  // Get limits for the tier (or use defaults)
  const limits = tier ? getLimitsForTier(tier) : {
    commentsPerHour: DEFAULT_COMMENTS_PER_HOUR,
    votesPerHour: DEFAULT_VOTES_PER_HOUR,
  };

  const limit = limitType === 'comment' ? limits.commentsPerHour : limits.votesPerHour;
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
  };

  if (result.remaining !== undefined) {
    headers['X-RateLimit-Remaining'] = String(result.remaining);
  }

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = String(result.retryAfter);
    headers['X-RateLimit-Reset'] = String(
      Math.floor(Date.now() / 1000) + result.retryAfter
    );
  }

  return headers;
}

// Re-export trust tier types for convenience
export type { TrustTier };

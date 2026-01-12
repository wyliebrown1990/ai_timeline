/**
 * Rate Limiter Service (Sprint Spam-1)
 *
 * Provides rate limiting for comments and votes to prevent spam.
 * Limits are stored in the database (persistent across Lambda invocations).
 */

import { prisma } from '../db';

// =============================================================================
// Configuration
// =============================================================================

// Comment rate limits
const COMMENT_COOLDOWN_SECONDS = 30; // Minimum seconds between comments
const COMMENTS_PER_HOUR = 10;
const COMMENTS_PER_DAY = 30;

// Vote rate limits
const VOTES_PER_HOUR = 50;

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
 */
export async function checkCommentRateLimit(userId: string): Promise<RateLimitResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastCommentAt: true,
      hourlyCommentCount: true,
      hourlyCommentResetAt: true,
      dailyCommentCount: true,
      dailyCommentResetAt: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  const now = new Date();

  // Check cooldown between comments
  if (user.lastCommentAt) {
    const secondsSinceLastComment = Math.floor(
      (now.getTime() - user.lastCommentAt.getTime()) / 1000
    );
    if (secondsSinceLastComment < COMMENT_COOLDOWN_SECONDS) {
      const retryAfter = COMMENT_COOLDOWN_SECONDS - secondsSinceLastComment;
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

  if (hourlyCount >= COMMENTS_PER_HOUR) {
    const resetTime = user.hourlyCommentResetAt || now;
    const retryAfter = Math.max(
      0,
      Math.ceil((resetTime.getTime() + 60 * 60 * 1000 - now.getTime()) / 1000)
    );
    return {
      allowed: false,
      reason: `You've reached the limit of ${COMMENTS_PER_HOUR} comments per hour`,
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

  if (dailyCount >= COMMENTS_PER_DAY) {
    const resetTime = user.dailyCommentResetAt || now;
    const retryAfter = Math.max(
      0,
      Math.ceil((resetTime.getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / 1000)
    );
    return {
      allowed: false,
      reason: `You've reached the limit of ${COMMENTS_PER_DAY} comments per day`,
      retryAfter,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: Math.min(COMMENTS_PER_HOUR - hourlyCount, COMMENTS_PER_DAY - dailyCount),
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
 */
export async function checkVoteRateLimit(userId: string): Promise<RateLimitResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      hourlyVoteCount: true,
      hourlyVoteResetAt: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  const now = new Date();

  // Check hourly limit
  const hourlyCount = getCountWithReset(
    user.hourlyVoteCount,
    user.hourlyVoteResetAt,
    now,
    60 * 60 * 1000
  );

  if (hourlyCount >= VOTES_PER_HOUR) {
    const resetTime = user.hourlyVoteResetAt || now;
    const retryAfter = Math.max(
      0,
      Math.ceil((resetTime.getTime() + 60 * 60 * 1000 - now.getTime()) / 1000)
    );
    return {
      allowed: false,
      reason: `You've reached the limit of ${VOTES_PER_HOUR} votes per hour`,
      retryAfter,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: VOTES_PER_HOUR - hourlyCount,
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
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
  limitType: 'comment' | 'vote'
): Record<string, string> {
  const limit = limitType === 'comment' ? COMMENTS_PER_HOUR : VOTES_PER_HOUR;
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

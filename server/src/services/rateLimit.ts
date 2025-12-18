/**
 * Rate Limiting Service
 * Implements per-session rate limiting for the chat API
 * Limits: 10 requests per minute per session
 */

import type { RateLimitEntry } from '../types/chat';

// In-memory store for rate limit tracking
// Note: This resets on Lambda cold starts; for production persistence,
// consider using DynamoDB or ElastiCache
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

/**
 * Checks if a session is rate limited and updates the counter
 * @param sessionId - Unique session identifier
 * @returns Rate limit check result
 */
export function checkRateLimit(sessionId: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(sessionId);

  // Clean up expired entries periodically
  cleanupExpiredEntries(now);

  // No existing entry - create new window
  if (!entry) {
    rateLimitStore.set(sessionId, {
      count: 1,
      windowStart: now,
    });

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  const windowEnd = entry.windowStart + RATE_LIMIT_WINDOW_MS;

  // Window has expired - reset counter
  if (now >= windowEnd) {
    rateLimitStore.set(sessionId, {
      count: 1,
      windowStart: now,
    });

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  // Within window - check limit
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: windowEnd,
      retryAfterMs: windowEnd - now,
    };
  }

  // Increment counter
  entry.count += 1;
  rateLimitStore.set(sessionId, entry);

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
    resetAt: windowEnd,
  };
}

/**
 * Removes expired rate limit entries to prevent memory leaks
 * Called periodically during rate limit checks
 */
function cleanupExpiredEntries(now: number): void {
  // Only clean up occasionally to avoid performance impact
  if (Math.random() > 0.1) return;

  for (const [sessionId, entry] of rateLimitStore.entries()) {
    const windowEnd = entry.windowStart + RATE_LIMIT_WINDOW_MS;
    if (now >= windowEnd) {
      rateLimitStore.delete(sessionId);
    }
  }
}

/**
 * Clears rate limit data for a specific session (useful for testing)
 */
export function clearRateLimitForSession(sessionId: string): void {
  rateLimitStore.delete(sessionId);
}

/**
 * Gets current rate limit status without incrementing counter
 */
/**
 * Gets aggregate rate limit statistics for admin monitoring
 */
export function getRateLimitStats(): {
  activeSessions: number;
  totalRequestsInWindow: number;
  sessionsAtLimit: number;
} {
  const now = Date.now();
  let activeSessions = 0;
  let totalRequestsInWindow = 0;
  let sessionsAtLimit = 0;

  for (const [, entry] of rateLimitStore.entries()) {
    const windowEnd = entry.windowStart + RATE_LIMIT_WINDOW_MS;
    if (now < windowEnd) {
      activeSessions++;
      totalRequestsInWindow += entry.count;
      if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        sessionsAtLimit++;
      }
    }
  }

  return {
    activeSessions,
    totalRequestsInWindow,
    sessionsAtLimit,
  };
}

export function getRateLimitStatus(sessionId: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(sessionId);

  if (!entry) {
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  const windowEnd = entry.windowStart + RATE_LIMIT_WINDOW_MS;

  if (now >= windowEnd) {
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  return {
    allowed: entry.count < RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count),
    resetAt: windowEnd,
  };
}

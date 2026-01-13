/**
 * Trust Service (Sprint Spam-2)
 *
 * Calculates and manages user trust scores based on:
 * - Account age
 * - Votes received (upvotes positive, downvotes negative)
 * - Learning engagement
 * - Email verification
 * - Comment removal history
 *
 * Trust tiers affect rate limits and permissions.
 */

import { prisma } from '../db';

// =============================================================================
// Types
// =============================================================================

export type TrustTier = 'new' | 'member' | 'trusted' | 'veteran';

export interface TrustScore {
  score: number;
  tier: TrustTier;
  breakdown: {
    accountAge: number;
    upvotes: number;
    learningActions: number;
    emailVerified: number;
    downvotes: number;
    removedComments: number;
  };
}

export interface TrustLimits {
  commentsPerHour: number;
  commentsPerDay: number;
  votesPerHour: number;
  cooldownSeconds: number;
}

// =============================================================================
// Configuration
// =============================================================================

// Trust tier thresholds
const TIER_THRESHOLDS = {
  new: 0,
  member: 10,
  trusted: 50,
  veteran: 200,
};

// Tier-based rate limits
const TIER_LIMITS: Record<TrustTier, TrustLimits> = {
  new: {
    commentsPerHour: 5,
    commentsPerDay: 15,
    votesPerHour: 25,
    cooldownSeconds: 60,
  },
  member: {
    commentsPerHour: 10,
    commentsPerDay: 30,
    votesPerHour: 50,
    cooldownSeconds: 30,
  },
  trusted: {
    commentsPerHour: 20,
    commentsPerDay: 60,
    votesPerHour: 100,
    cooldownSeconds: 15,
  },
  veteran: {
    commentsPerHour: 30,
    commentsPerDay: 100,
    votesPerHour: 150,
    cooldownSeconds: 10,
  },
};

// Score weights
const WEIGHTS = {
  accountAgeDays: 0.5,       // Max ~180 points for 1 year
  upvote: 1.0,               // Direct reputation
  learningAction: 2.0,       // Engagement with educational content
  emailVerified: 10,         // Verification bonus
  downvote: -0.5,            // Penalty for bad content
  removedComment: -15,       // Strong penalty for removed content
};

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Calculate trust score for a user
 * Returns detailed breakdown of score components
 */
export async function calculateTrustScore(userId: string): Promise<TrustScore> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      emailVerifiedAt: true,
      totalUpvotesReceived: true,
      totalDownvotesReceived: true,
      commentsRemovedCount: true,
      learningActionsCount: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Calculate account age in days
  const accountAgeDays = Math.floor(
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate score breakdown
  const breakdown = {
    accountAge: Math.min(accountAgeDays * WEIGHTS.accountAgeDays, 180), // Cap at 180
    upvotes: user.totalUpvotesReceived * WEIGHTS.upvote,
    learningActions: user.learningActionsCount * WEIGHTS.learningAction,
    emailVerified: user.emailVerifiedAt ? WEIGHTS.emailVerified : 0,
    downvotes: user.totalDownvotesReceived * WEIGHTS.downvote,
    removedComments: user.commentsRemovedCount * WEIGHTS.removedComment,
  };

  // Calculate total score (floor at 0)
  const score = Math.max(
    0,
    breakdown.accountAge +
      breakdown.upvotes +
      breakdown.learningActions +
      breakdown.emailVerified +
      breakdown.downvotes +
      breakdown.removedComments
  );

  return {
    score,
    tier: getTrustTier(score),
    breakdown,
  };
}

/**
 * Get trust tier based on score
 */
export function getTrustTier(score: number): TrustTier {
  if (score >= TIER_THRESHOLDS.veteran) return 'veteran';
  if (score >= TIER_THRESHOLDS.trusted) return 'trusted';
  if (score >= TIER_THRESHOLDS.member) return 'member';
  return 'new';
}

/**
 * Get rate limits for a trust tier
 */
export function getLimitsForTier(tier: TrustTier): TrustLimits {
  return TIER_LIMITS[tier];
}

/**
 * Update and save trust score for a user
 */
export async function updateTrustScore(userId: string): Promise<TrustScore> {
  const trustScore = await calculateTrustScore(userId);

  await prisma.user.update({
    where: { id: userId },
    data: {
      trustScore: trustScore.score,
    },
  });

  return trustScore;
}

/**
 * Get trust score and limits for a user
 */
export async function getUserTrustInfo(userId: string): Promise<{
  score: TrustScore;
  limits: TrustLimits;
}> {
  const score = await calculateTrustScore(userId);
  const limits = getLimitsForTier(score.tier);
  return { score, limits };
}

// =============================================================================
// Stat Update Functions
// =============================================================================

/**
 * Increment upvotes received and update trust score
 */
export async function incrementUpvotesReceived(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalUpvotesReceived: { increment: 1 },
    },
  });
  // Recalculate trust score
  await updateTrustScore(userId);
}

/**
 * Decrement upvotes received (when vote is removed)
 */
export async function decrementUpvotesReceived(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalUpvotesReceived: { decrement: 1 },
    },
  });
  await updateTrustScore(userId);
}

/**
 * Increment downvotes received and update trust score
 */
export async function incrementDownvotesReceived(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalDownvotesReceived: { increment: 1 },
    },
  });
  await updateTrustScore(userId);
}

/**
 * Decrement downvotes received (when vote is removed)
 */
export async function decrementDownvotesReceived(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalDownvotesReceived: { decrement: 1 },
    },
  });
  await updateTrustScore(userId);
}

/**
 * Increment comments removed count and update trust score
 */
export async function incrementCommentsRemoved(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      commentsRemovedCount: { increment: 1 },
    },
  });
  await updateTrustScore(userId);
}

/**
 * Increment learning actions count and update trust score
 * Also unlocks commenting if threshold is met
 */
export async function incrementLearningActions(
  userId: string,
  actionType: 'milestone_view' | 'flashcard_complete' | 'quiz_complete'
): Promise<{ unlocked: boolean; trustScore: TrustScore }> {
  // Different actions give different points
  const actionPoints = {
    milestone_view: 1,
    flashcard_complete: 2,
    quiz_complete: 3,
  };

  const increment = actionPoints[actionType];

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      learningActionsCount: { increment },
    },
    select: {
      learningActionsCount: true,
      canComment: true,
    },
  });

  // Check if this unlocks commenting (threshold: 1 learning action)
  let unlocked = false;
  if (!user.canComment && user.learningActionsCount >= 1) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        canComment: true,
        commentUnlockedAt: new Date(),
      },
    });
    unlocked = true;
  }

  const trustScore = await updateTrustScore(userId);

  return { unlocked, trustScore };
}

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Manually grant commenting permission to a user
 */
export async function grantCommentPermission(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      canComment: true,
      commentUnlockedAt: new Date(),
    },
  });
}

/**
 * Reset trust score to 0 (admin action)
 */
export async function resetTrustScore(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      trustScore: 0,
      totalUpvotesReceived: 0,
      totalDownvotesReceived: 0,
      commentsRemovedCount: 0,
    },
  });
}

/**
 * Get all users with trust info for admin dashboard
 */
export async function getUsersWithTrust(options?: {
  sortBy?: 'trustScore' | 'createdAt' | 'commentKarma';
  sortOrder?: 'asc' | 'desc';
  tier?: TrustTier;
  limit?: number;
  offset?: number;
}): Promise<{
  users: Array<{
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    trustScore: number;
    tier: TrustTier;
    createdAt: Date;
    emailVerifiedAt: Date | null;
    commentKarma: number;
    canComment: boolean;
  }>;
  total: number;
}> {
  const {
    sortBy = 'trustScore',
    sortOrder = 'desc',
    tier,
    limit = 50,
    offset = 0,
  } = options || {};

  // Build where clause for tier filtering
  let whereClause = {};
  if (tier) {
    const thresholds = TIER_THRESHOLDS;
    switch (tier) {
      case 'veteran':
        whereClause = { trustScore: { gte: thresholds.veteran } };
        break;
      case 'trusted':
        whereClause = {
          trustScore: { gte: thresholds.trusted, lt: thresholds.veteran },
        };
        break;
      case 'member':
        whereClause = {
          trustScore: { gte: thresholds.member, lt: thresholds.trusted },
        };
        break;
      case 'new':
        whereClause = { trustScore: { lt: thresholds.member } };
        break;
    }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        trustScore: true,
        createdAt: true,
        emailVerifiedAt: true,
        commentKarma: true,
        canComment: true,
      },
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: offset,
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  return {
    users: users.map((user) => ({
      ...user,
      tier: getTrustTier(user.trustScore),
    })),
    total,
  };
}

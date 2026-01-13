/**
 * Vote Pattern Detection Service (Sprint Spam-4)
 *
 * Detects suspicious voting patterns:
 * - Same IP as comment author
 * - User consistently voting on same author
 * - Vote brigades (sudden vote surges)
 */

import { prisma } from '../db';
import { logModerationAction } from './moderationLogger';

export type SuspiciousReason =
  | 'same_ip_as_author'
  | 'vote_pattern'
  | 'vote_brigade';

interface VoteCheckResult {
  isSuspicious: boolean;
  reason?: SuspiciousReason;
  details?: string;
}

/**
 * Check if a vote is from the same IP as the comment author
 */
export async function checkSameIpAsAuthor(
  commentId: string,
  voterIp: string | null
): Promise<VoteCheckResult> {
  if (!voterIp) {
    return { isSuspicious: false };
  }

  // Get the comment and author's last known IP
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      authorId: true,
      author: {
        select: { lastIp: true },
      },
    },
  });

  if (!comment) {
    return { isSuspicious: false };
  }

  // Check if voter IP matches author's last IP
  if (comment.author.lastIp && comment.author.lastIp === voterIp) {
    return {
      isSuspicious: true,
      reason: 'same_ip_as_author',
      details: `Voter IP ${voterIp} matches comment author's IP`,
    };
  }

  return { isSuspicious: false };
}

/**
 * Detect if a user consistently votes on the same author's content
 * Flags if >80% of votes in last 7 days target the same author
 */
export async function detectVotePattern(
  voterId: string,
  targetAuthorId: string
): Promise<VoteCheckResult> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get all votes by this user in the last 7 days
  const recentVotes = await prisma.commentVote.findMany({
    where: {
      userId: voterId,
      createdAt: { gte: sevenDaysAgo },
    },
    select: {
      comment: {
        select: { authorId: true },
      },
    },
  });

  if (recentVotes.length < 5) {
    // Not enough data to detect patterns
    return { isSuspicious: false };
  }

  // Count votes per author
  const votesByAuthor = recentVotes.reduce(
    (acc, vote) => {
      const authorId = vote.comment.authorId;
      acc[authorId] = (acc[authorId] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Check if target author has >80% of votes
  const votesForTarget = votesByAuthor[targetAuthorId] || 0;
  const percentage = votesForTarget / recentVotes.length;

  if (percentage >= 0.8) {
    return {
      isSuspicious: true,
      reason: 'vote_pattern',
      details: `User has voted on this author ${votesForTarget}/${recentVotes.length} times (${Math.round(percentage * 100)}%)`,
    };
  }

  return { isSuspicious: false };
}

/**
 * Detect vote brigades - sudden surge in votes on a comment
 * Flags if comment gets >10 votes in 5 minutes
 */
export async function detectVoteBrigade(commentId: string): Promise<VoteCheckResult> {
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

  const recentVoteCount = await prisma.commentVote.count({
    where: {
      commentId,
      createdAt: { gte: fiveMinutesAgo },
    },
  });

  if (recentVoteCount > 10) {
    return {
      isSuspicious: true,
      reason: 'vote_brigade',
      details: `Comment received ${recentVoteCount} votes in 5 minutes`,
    };
  }

  return { isSuspicious: false };
}

/**
 * Check for vote velocity surge - flag comment for review if >20 votes in 10 minutes
 */
export async function checkVoteVelocity(commentId: string): Promise<boolean> {
  const tenMinutesAgo = new Date();
  tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

  const recentVoteCount = await prisma.commentVote.count({
    where: {
      commentId,
      createdAt: { gte: tenMinutesAgo },
    },
  });

  return recentVoteCount > 20;
}

/**
 * Flag a vote as suspicious
 */
export async function flagVote(
  voteId: string,
  reason: SuspiciousReason,
  details?: string
): Promise<void> {
  await prisma.commentVote.update({
    where: { id: voteId },
    data: {
      isSuspicious: true,
      suspiciousReason: reason,
    },
  });

  // Log to moderation system
  await logModerationAction(
    'flag_vote',
    'vote',
    voteId,
    null,
    reason,
    true,
    { details }
  );
}

/**
 * Flag multiple votes as suspicious
 */
export async function flagSuspiciousVotes(
  voteIds: string[],
  reason: SuspiciousReason,
  details?: string
): Promise<void> {
  await prisma.commentVote.updateMany({
    where: { id: { in: voteIds } },
    data: {
      isSuspicious: true,
      suspiciousReason: reason,
    },
  });

  // Log each flag
  for (const voteId of voteIds) {
    await logModerationAction(
      'flag_vote',
      'vote',
      voteId,
      null,
      reason,
      true,
      { details }
    );
  }
}

/**
 * Clear suspicious flag from a vote
 */
export async function clearVoteFlag(
  voteId: string,
  moderatorId: string
): Promise<void> {
  const vote = await prisma.commentVote.findUnique({
    where: { id: voteId },
    select: { commentId: true },
  });

  if (!vote) {
    throw new Error('Vote not found');
  }

  await prisma.commentVote.update({
    where: { id: voteId },
    data: {
      isSuspicious: false,
      suspiciousReason: null,
    },
  });

  // Recalculate comment's legitimate score
  await recalculateLegitimateScore(vote.commentId);

  // Log the action
  await logModerationAction(
    'clear_vote_flag',
    'vote',
    voteId,
    moderatorId,
    'Flag cleared by moderator',
    false
  );
}

/**
 * Recalculate legitimate score for a comment (excluding suspicious votes)
 */
export async function recalculateLegitimateScore(commentId: string): Promise<number> {
  const result = await prisma.commentVote.aggregate({
    where: {
      commentId,
      isSuspicious: false,
    },
    _sum: { value: true },
  });

  const legitimateScore = result._sum.value || 0;

  await prisma.comment.update({
    where: { id: commentId },
    data: { legitimateScore },
  });

  return legitimateScore;
}

/**
 * Get suspicious votes for admin review
 */
export async function getSuspiciousVotes(options: {
  reason?: SuspiciousReason;
  limit?: number;
  offset?: number;
}): Promise<{
  votes: Array<{
    id: string;
    commentId: string;
    userId: string;
    value: number;
    voterIp: string | null;
    suspiciousReason: string | null;
    createdAt: Date;
    user: { id: string; username: string };
    comment: {
      id: string;
      body: string;
      author: { id: string; username: string };
    };
  }>;
  total: number;
}> {
  const { reason, limit = 50, offset = 0 } = options;

  const where = {
    isSuspicious: true,
    ...(reason && { suspiciousReason: reason }),
  };

  const [votes, total] = await Promise.all([
    prisma.commentVote.findMany({
      where,
      select: {
        id: true,
        commentId: true,
        userId: true,
        value: true,
        voterIp: true,
        suspiciousReason: true,
        createdAt: true,
        user: {
          select: { id: true, username: true },
        },
        comment: {
          select: {
            id: true,
            body: true,
            author: {
              select: { id: true, username: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.commentVote.count({ where }),
  ]);

  return { votes, total };
}

/**
 * Get voting patterns for a user (for admin review)
 */
export async function getUserVotingPatterns(userId: string): Promise<{
  totalVotes: number;
  votesByAuthor: Array<{
    authorId: string;
    authorUsername: string;
    voteCount: number;
    percentage: number;
  }>;
  suspiciousVoteCount: number;
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all votes by this user in the last 30 days
  const votes = await prisma.commentVote.findMany({
    where: {
      userId,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      isSuspicious: true,
      comment: {
        select: {
          authorId: true,
          author: { select: { username: true } },
        },
      },
    },
  });

  const totalVotes = votes.length;
  const suspiciousVoteCount = votes.filter((v) => v.isSuspicious).length;

  // Count votes per author
  const authorCounts: Record<string, { username: string; count: number }> = {};
  for (const vote of votes) {
    const { authorId } = vote.comment;
    const { username } = vote.comment.author;
    if (!authorCounts[authorId]) {
      authorCounts[authorId] = { username, count: 0 };
    }
    authorCounts[authorId].count++;
  }

  // Convert to sorted array
  const votesByAuthor = Object.entries(authorCounts)
    .map(([authorId, { username, count }]) => ({
      authorId,
      authorUsername: username,
      voteCount: count,
      percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
    }))
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, 10); // Top 10 authors

  return { totalVotes, votesByAuthor, suspiciousVoteCount };
}

/**
 * Run all vote checks and return combined result
 */
export async function runVoteChecks(
  commentId: string,
  voterId: string,
  voterIp: string | null
): Promise<VoteCheckResult> {
  // Get comment author
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });

  if (!comment) {
    return { isSuspicious: false };
  }

  // Check 1: Same IP as author
  const ipCheck = await checkSameIpAsAuthor(commentId, voterIp);
  if (ipCheck.isSuspicious) {
    return ipCheck;
  }

  // Check 2: Voting pattern (too many votes on same author)
  const patternCheck = await detectVotePattern(voterId, comment.authorId);
  if (patternCheck.isSuspicious) {
    return patternCheck;
  }

  // Check 3: Vote brigade (too many votes in short time)
  const brigadeCheck = await detectVoteBrigade(commentId);
  if (brigadeCheck.isSuspicious) {
    return brigadeCheck;
  }

  return { isSuspicious: false };
}

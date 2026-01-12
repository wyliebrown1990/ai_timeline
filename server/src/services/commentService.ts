/**
 * Comment Service
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 *
 * Handles comment CRUD, voting, and scoring algorithms
 */

import { prisma } from '../db';
import { CommentTargetType, Prisma } from '@prisma/client';

// Types
export type SortMode = 'best' | 'new' | 'controversial';
export type TargetType = 'milestone' | 'news_event' | 'glossary_term' | 'person' | 'organization';

export interface CreateCommentInput {
  authorId: string;
  targetType: TargetType;
  targetId: string;
  parentId?: string;
  body: string;
}

export interface CommentWithAuthor {
  id: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  body: string;
  bodyHtml: string | null;
  parentId: string | null;
  depth: number;
  targetType: CommentTargetType;
  targetId: string;
  upvotes: number;
  downvotes: number;
  score: number;
  hotScore: number;
  controversyScore: number;
  isDeleted: boolean;
  isHidden: boolean;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  userVote?: number | null; // 1, -1, or null
  replies?: CommentWithAuthor[];
}

// Hot score algorithm (Reddit-style)
function calculateHotScore(upvotes: number, downvotes: number, createdAt: Date): number {
  const score = upvotes - downvotes;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
  // Reference epoch: 2024-01-01
  const seconds = (createdAt.getTime() - new Date('2024-01-01').getTime()) / 1000;
  return sign * order + seconds / 45000;
}

// Controversy score (high engagement, mixed votes)
function calculateControversyScore(upvotes: number, downvotes: number): number {
  if (upvotes === 0 || downvotes === 0) return 0;
  const total = upvotes + downvotes;
  const balance = Math.min(upvotes, downvotes) / Math.max(upvotes, downvotes);
  return total * balance;
}

/**
 * Create a new comment
 */
export async function createComment(input: CreateCommentInput): Promise<CommentWithAuthor> {
  const { authorId, targetType, targetId, parentId, body } = input;

  // Calculate depth from parent
  let depth = 0;
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { depth: true, targetType: true, targetId: true },
    });
    if (!parent) {
      throw new Error('Parent comment not found');
    }
    // Ensure reply is on same target
    if (parent.targetType !== targetType || parent.targetId !== targetId) {
      throw new Error('Reply must be on the same target as parent');
    }
    depth = parent.depth + 1;
  }

  const now = new Date();
  const hotScore = calculateHotScore(0, 0, now);

  const comment = await prisma.comment.create({
    data: {
      authorId,
      targetType: targetType as CommentTargetType,
      targetId,
      parentId,
      body,
      depth,
      hotScore,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return {
    ...comment,
    userVote: null,
    replies: [],
  };
}

/**
 * Get comments for a target with threading
 */
export async function getCommentsForTarget(
  targetType: TargetType,
  targetId: string,
  sortBy: SortMode = 'best',
  userId?: string,
  limit = 25,
  offset = 0
): Promise<{ comments: CommentWithAuthor[]; total: number }> {
  // Build order clause
  let orderBy: Prisma.CommentOrderByWithRelationInput;
  switch (sortBy) {
    case 'new':
      orderBy = { createdAt: 'desc' };
      break;
    case 'controversial':
      orderBy = { controversyScore: 'desc' };
      break;
    case 'best':
    default:
      orderBy = { hotScore: 'desc' };
      break;
  }

  // Get total count of top-level comments
  const total = await prisma.comment.count({
    where: {
      targetType: targetType as CommentTargetType,
      targetId,
      parentId: null,
      isDeleted: false,
      isHidden: false,
    },
  });

  // Get top-level comments
  const topLevelComments = await prisma.comment.findMany({
    where: {
      targetType: targetType as CommentTargetType,
      targetId,
      parentId: null,
      isDeleted: false,
      isHidden: false,
    },
    orderBy,
    skip: offset,
    take: limit,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      votes: userId ? {
        where: { userId },
        select: { value: true },
      } : false,
    },
  });

  // Get all replies for these top-level comments (recursive fetch)
  const commentIds = topLevelComments.map(c => c.id);
  const allReplies = await fetchRepliesRecursive(commentIds, userId, orderBy);

  // Build user votes map
  const userVotes = new Map<string, number>();
  if (userId) {
    for (const comment of topLevelComments) {
      if (comment.votes && comment.votes.length > 0) {
        userVotes.set(comment.id, comment.votes[0].value);
      }
    }
    for (const reply of allReplies) {
      if (reply.votes && reply.votes.length > 0) {
        userVotes.set(reply.id, reply.votes[0].value);
      }
    }
  }

  // Build reply tree
  const repliesByParent = new Map<string, typeof allReplies>();
  for (const reply of allReplies) {
    if (reply.parentId) {
      const existing = repliesByParent.get(reply.parentId) || [];
      existing.push(reply);
      repliesByParent.set(reply.parentId, existing);
    }
  }

  // Recursively attach replies to comments
  function attachReplies(commentId: string): CommentWithAuthor[] {
    const replies = repliesByParent.get(commentId) || [];
    return replies.map(reply => ({
      id: reply.id,
      authorId: reply.authorId,
      author: reply.author,
      body: reply.isDeleted ? '[deleted]' : reply.body,
      bodyHtml: reply.isDeleted ? null : reply.bodyHtml,
      parentId: reply.parentId,
      depth: reply.depth,
      targetType: reply.targetType,
      targetId: reply.targetId,
      upvotes: reply.upvotes,
      downvotes: reply.downvotes,
      score: reply.score,
      hotScore: reply.hotScore,
      controversyScore: reply.controversyScore,
      isDeleted: reply.isDeleted,
      isHidden: reply.isHidden,
      reportCount: reply.reportCount,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
      editedAt: reply.editedAt,
      userVote: userVotes.get(reply.id) || null,
      replies: attachReplies(reply.id),
    }));
  }

  const comments: CommentWithAuthor[] = topLevelComments.map(comment => ({
    id: comment.id,
    authorId: comment.authorId,
    author: comment.author,
    body: comment.isDeleted ? '[deleted]' : comment.body,
    bodyHtml: comment.isDeleted ? null : comment.bodyHtml,
    parentId: comment.parentId,
    depth: comment.depth,
    targetType: comment.targetType,
    targetId: comment.targetId,
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
    score: comment.score,
    hotScore: comment.hotScore,
    controversyScore: comment.controversyScore,
    isDeleted: comment.isDeleted,
    isHidden: comment.isHidden,
    reportCount: comment.reportCount,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    editedAt: comment.editedAt,
    userVote: userVotes.get(comment.id) || null,
    replies: attachReplies(comment.id),
  }));

  return { comments, total };
}

/**
 * Fetch all replies recursively for given parent IDs
 */
async function fetchRepliesRecursive(
  parentIds: string[],
  userId?: string,
  orderBy?: Prisma.CommentOrderByWithRelationInput
): Promise<Array<{
  id: string;
  authorId: string;
  author: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  body: string;
  bodyHtml: string | null;
  parentId: string | null;
  depth: number;
  targetType: CommentTargetType;
  targetId: string;
  upvotes: number;
  downvotes: number;
  score: number;
  hotScore: number;
  controversyScore: number;
  isDeleted: boolean;
  isHidden: boolean;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  votes?: Array<{ value: number }>;
}>> {
  if (parentIds.length === 0) return [];

  const replies = await prisma.comment.findMany({
    where: {
      parentId: { in: parentIds },
      isHidden: false,
    },
    orderBy,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      votes: userId ? {
        where: { userId },
        select: { value: true },
      } : false,
    },
  });

  if (replies.length === 0) return replies;

  // Get nested replies
  const childIds = replies.map(r => r.id);
  const nestedReplies = await fetchRepliesRecursive(childIds, userId, orderBy);

  return [...replies, ...nestedReplies];
}

/**
 * Update a comment (author only)
 */
export async function updateComment(
  commentId: string,
  authorId: string,
  body: string
): Promise<CommentWithAuthor> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, isDeleted: true },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }
  if (comment.authorId !== authorId) {
    throw new Error('Not authorized to edit this comment');
  }
  if (comment.isDeleted) {
    throw new Error('Cannot edit a deleted comment');
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: {
      body,
      editedAt: new Date(),
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return {
    ...updated,
    userVote: null,
  };
}

/**
 * Delete a comment (soft delete - preserves thread structure)
 */
export async function deleteComment(
  commentId: string,
  requesterId: string,
  isAdmin = false
): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }
  if (!isAdmin && comment.authorId !== requesterId) {
    throw new Error('Not authorized to delete this comment');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      isDeleted: true,
      body: '[deleted]',
      bodyHtml: null,
    },
  });
}

/**
 * Vote on a comment (upvote, downvote, or remove vote)
 */
export async function voteOnComment(
  commentId: string,
  userId: string,
  value: 1 | -1 | 0
): Promise<{ upvotes: number; downvotes: number; score: number; userVote: number | null }> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, upvotes: true, downvotes: true, createdAt: true },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  // Get existing vote
  const existingVote = await prisma.commentVote.findUnique({
    where: {
      commentId_userId: { commentId, userId },
    },
  });

  let upvotesDelta = 0;
  let downvotesDelta = 0;

  // Remove existing vote effect
  if (existingVote) {
    if (existingVote.value === 1) upvotesDelta -= 1;
    if (existingVote.value === -1) downvotesDelta -= 1;
  }

  // Apply new vote effect
  if (value === 1) upvotesDelta += 1;
  if (value === -1) downvotesDelta += 1;

  // Update or delete vote record
  if (value === 0) {
    // Remove vote
    if (existingVote) {
      await prisma.commentVote.delete({
        where: { id: existingVote.id },
      });
    }
  } else {
    // Upsert vote
    await prisma.commentVote.upsert({
      where: {
        commentId_userId: { commentId, userId },
      },
      update: { value },
      create: {
        commentId,
        userId,
        value,
      },
    });
  }

  // Update comment scores
  const newUpvotes = comment.upvotes + upvotesDelta;
  const newDownvotes = comment.downvotes + downvotesDelta;
  const newScore = newUpvotes - newDownvotes;
  const newHotScore = calculateHotScore(newUpvotes, newDownvotes, comment.createdAt);
  const newControversyScore = calculateControversyScore(newUpvotes, newDownvotes);

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      score: newScore,
      hotScore: newHotScore,
      controversyScore: newControversyScore,
    },
  });

  // Update author's karma (async, don't await)
  updateUserKarma(comment.authorId).catch(console.error);

  return {
    upvotes: newUpvotes,
    downvotes: newDownvotes,
    score: newScore,
    userVote: value === 0 ? null : value,
  };
}

/**
 * Update user's comment karma based on their comments' scores
 */
async function updateUserKarma(userId: string): Promise<void> {
  const result = await prisma.comment.aggregate({
    where: {
      authorId: userId,
      isDeleted: false,
    },
    _sum: {
      score: true,
    },
  });

  const karma = result._sum.score || 0;

  await prisma.user.update({
    where: { id: userId },
    data: { commentKarma: karma },
  });
}

/**
 * Report a comment
 */
export async function reportComment(
  commentId: string,
  reporterId: string,
  reason: 'spam' | 'harassment' | 'misinformation' | 'off_topic' | 'other',
  details?: string
): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, reportCount: true },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  await prisma.commentReport.create({
    data: {
      commentId,
      reporterId,
      reason,
      details,
    },
  });

  // Increment report count
  const newReportCount = comment.reportCount + 1;
  const shouldAutoHide = newReportCount >= 5;

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      reportCount: newReportCount,
      isHidden: shouldAutoHide ? true : undefined,
    },
  });
}

/**
 * Get user's comment history
 */
export async function getUserComments(
  username: string,
  limit = 25,
  offset = 0
): Promise<{ comments: CommentWithAuthor[]; total: number }> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const total = await prisma.comment.count({
    where: {
      authorId: user.id,
      isDeleted: false,
    },
  });

  const comments = await prisma.comment.findMany({
    where: {
      authorId: user.id,
      isDeleted: false,
    },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return {
    comments: comments.map(c => ({
      ...c,
      userVote: null,
    })),
    total,
  };
}

/**
 * Get comment count for a target
 */
export async function getCommentCount(
  targetType: TargetType,
  targetId: string
): Promise<number> {
  return prisma.comment.count({
    where: {
      targetType: targetType as CommentTargetType,
      targetId,
      isDeleted: false,
      isHidden: false,
    },
  });
}

/**
 * Admin: Hide a comment
 */
export async function hideComment(commentId: string): Promise<CommentWithAuthor> {
  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: { isHidden: true },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  return { ...comment, userVote: null };
}

/**
 * Admin: Unhide a comment
 */
export async function unhideComment(commentId: string): Promise<CommentWithAuthor> {
  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: { isHidden: false },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  return { ...comment, userVote: null };
}

/**
 * Admin: Get reported comments
 */
export async function getReportedComments(
  status: 'pending' | 'reviewed' | 'dismissed' = 'pending',
  limit = 50
): Promise<Array<{
  id: string;
  commentId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: Date;
  comment: CommentWithAuthor;
}>> {
  const reports = await prisma.commentReport.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // Get unique comment IDs
  const commentIds = [...new Set(reports.map(r => r.commentId))];

  const comments = await prisma.comment.findMany({
    where: { id: { in: commentIds } },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  const commentMap = new Map(comments.map(c => [c.id, c]));

  return reports.map(report => {
    const comment = commentMap.get(report.commentId)!;
    return {
      id: report.id,
      commentId: report.commentId,
      reason: report.reason,
      details: report.details,
      status: report.status,
      createdAt: report.createdAt,
      comment: {
        ...comment,
        userVote: null,
      },
    };
  });
}

/**
 * Admin: Review a report
 */
export async function reviewReport(
  reportId: string,
  reviewerId: string,
  action: 'dismiss' | 'hide_comment' | 'delete_comment'
): Promise<void> {
  const report = await prisma.commentReport.findUnique({
    where: { id: reportId },
    select: { commentId: true },
  });

  if (!report) {
    throw new Error('Report not found');
  }

  // Update report status
  await prisma.commentReport.update({
    where: { id: reportId },
    data: {
      status: 'reviewed',
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
    },
  });

  // Take action on comment
  if (action === 'hide_comment') {
    await hideComment(report.commentId);
  } else if (action === 'delete_comment') {
    await prisma.comment.update({
      where: { id: report.commentId },
      data: {
        isDeleted: true,
        body: '[deleted]',
        bodyHtml: null,
      },
    });
  }
}

/**
 * Admin: Get reported comments with their reports for moderation UI
 * Returns comments that have at least one report, grouped with their reports
 */
export async function getReportedCommentsForAdmin(
  limit = 50,
  offset = 0,
  minReports = 1
): Promise<{
  comments: Array<CommentWithAuthor & { reports: Array<{
    id: string;
    reason: string;
    details: string | null;
    reporterId: string;
    reporter: { username: string };
    createdAt: Date;
  }> }>;
  total: number;
}> {
  // Get comments that have reports with pending status
  const commentsWithReports = await prisma.comment.findMany({
    where: {
      reportCount: { gte: minReports },
      isDeleted: false,
    },
    orderBy: [
      { reportCount: 'desc' },
      { createdAt: 'desc' },
    ],
    skip: offset,
    take: limit,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      reports: {
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: { username: true },
          },
        },
      },
    },
  });

  const total = await prisma.comment.count({
    where: {
      reportCount: { gte: minReports },
      isDeleted: false,
    },
  });

  return {
    comments: commentsWithReports.map(c => ({
      ...c,
      userVote: null,
      reports: c.reports.map(r => ({
        id: r.id,
        reason: r.reason,
        details: r.details,
        reporterId: r.reporterId,
        reporter: r.reporter,
        createdAt: r.createdAt,
      })),
    })),
    total,
  };
}

/**
 * Admin: Force delete a comment
 */
export async function adminDeleteComment(commentId: string): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      isDeleted: true,
      body: '[deleted]',
      bodyHtml: null,
    },
  });
}

/**
 * Admin: Dismiss all reports for a comment
 */
export async function dismissReports(commentId: string): Promise<CommentWithAuthor> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  // Update all pending reports to dismissed
  await prisma.commentReport.updateMany({
    where: {
      commentId,
      status: 'pending',
    },
    data: {
      status: 'dismissed',
      reviewedAt: new Date(),
    },
  });

  // Reset report count on comment
  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: { reportCount: 0 },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return { ...updatedComment, userVote: null };
}

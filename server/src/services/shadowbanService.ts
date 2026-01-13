/**
 * Shadowban Service (Sprint Spam-3)
 *
 * Implements shadowbanning - users can post but their content is invisible to others.
 * This is more effective than banning because spammers don't realize they're blocked.
 */

import { prisma } from '../db';
import { logModerationAction } from './moderationLogger';

// =============================================================================
// Core Shadowban Functions
// =============================================================================

/**
 * Shadowban a user - their content becomes invisible to others
 */
export async function shadowbanUser(
  userId: string,
  moderatorId: string | null,
  reason?: string
): Promise<{ success: boolean; user: { id: string; username: string } }> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isShadowbanned: true,
      shadowbannedAt: new Date(),
      shadowbanReason: reason || 'Spam or abuse',
    },
    select: {
      id: true,
      username: true,
    },
  });

  // Log the action
  await logModerationAction({
    action: 'shadowban',
    targetType: 'user',
    targetId: userId,
    moderatorId,
    reason,
    automated: moderatorId === null,
  });

  return { success: true, user };
}

/**
 * Remove shadowban from a user
 */
export async function unshadowbanUser(
  userId: string,
  moderatorId: string
): Promise<{ success: boolean; user: { id: string; username: string } }> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isShadowbanned: false,
      shadowbannedAt: null,
      shadowbanReason: null,
    },
    select: {
      id: true,
      username: true,
    },
  });

  // Log the action
  await logModerationAction({
    action: 'unshadowban',
    targetType: 'user',
    targetId: userId,
    moderatorId,
    reason: 'Shadowban removed by admin',
    automated: false,
  });

  return { success: true, user };
}

/**
 * Check if a user is shadowbanned (quick lookup)
 */
export async function isUserShadowbanned(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isShadowbanned: true },
  });

  return user?.isShadowbanned ?? false;
}

/**
 * Get shadowban info for a user
 */
export async function getShadowbanInfo(userId: string): Promise<{
  isShadowbanned: boolean;
  shadowbannedAt: Date | null;
  reason: string | null;
} | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isShadowbanned: true,
      shadowbannedAt: true,
      shadowbanReason: true,
    },
  });

  if (!user) return null;

  return {
    isShadowbanned: user.isShadowbanned,
    shadowbannedAt: user.shadowbannedAt,
    reason: user.shadowbanReason,
  };
}

// =============================================================================
// Admin Query Functions
// =============================================================================

/**
 * Get all shadowbanned users
 */
export async function getShadowbannedUsers(options?: {
  limit?: number;
  offset?: number;
}): Promise<{
  users: Array<{
    id: string;
    username: string;
    email: string;
    shadowbannedAt: Date | null;
    shadowbanReason: string | null;
  }>;
  total: number;
}> {
  const { limit = 50, offset = 0 } = options || {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { isShadowbanned: true },
      select: {
        id: true,
        username: true,
        email: true,
        shadowbannedAt: true,
        shadowbanReason: true,
      },
      orderBy: { shadowbannedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.user.count({ where: { isShadowbanned: true } }),
  ]);

  return { users, total };
}

// =============================================================================
// Comment Filtering Helpers
// =============================================================================

/**
 * Build Prisma where clause for filtering out shadowbanned users' content
 *
 * @param requestingUserId - The user making the request (or null for anonymous)
 * @returns Where clause to add to comment queries
 */
export async function buildShadowbanFilter(
  requestingUserId: string | null
): Promise<{ author?: { isShadowbanned: boolean } }> {
  // If no requesting user, filter out all shadowbanned content
  if (!requestingUserId) {
    return { author: { isShadowbanned: false } };
  }

  // Check if the requesting user is shadowbanned
  const isShadowbanned = await isUserShadowbanned(requestingUserId);

  // If the requesting user is shadowbanned, they can see their own content
  // but we still filter out OTHER shadowbanned users
  // Actually, for simplicity, shadowbanned users see all content including their own
  // We just hide shadowbanned content from non-shadowbanned users
  if (isShadowbanned) {
    // Shadowbanned user sees everything (including their own posts)
    return {};
  }

  // Non-shadowbanned users don't see shadowbanned content
  return { author: { isShadowbanned: false } };
}

/**
 * Check if a specific comment should be visible to a user
 *
 * @param commentAuthorId - The author of the comment
 * @param requestingUserId - The user viewing the comment (or null for anonymous)
 */
export async function isCommentVisibleToUser(
  commentAuthorId: string,
  requestingUserId: string | null
): Promise<boolean> {
  // Check if comment author is shadowbanned
  const authorShadowbanned = await isUserShadowbanned(commentAuthorId);

  // If author is not shadowbanned, comment is visible to everyone
  if (!authorShadowbanned) {
    return true;
  }

  // Author is shadowbanned...

  // Anonymous users can't see shadowbanned content
  if (!requestingUserId) {
    return false;
  }

  // If requesting user is the author, they can see their own content
  if (requestingUserId === commentAuthorId) {
    return true;
  }

  // Other users can't see shadowbanned content
  return false;
}

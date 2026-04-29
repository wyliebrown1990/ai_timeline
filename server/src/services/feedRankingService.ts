/**
 * Feed Ranking Service (Sprint Feed-1)
 *
 * Handles hot score calculation for news feed ranking.
 * Uses a Reddit-style algorithm with time decay.
 */

import { prisma } from '../db';

interface EventEngagementData {
  upvotes: number;
  downvotes: number;
  completionCount: number;
  viewCount: number;
  publishedDate: Date;
}

/**
 * Calculate hot score for a news event.
 * Higher scores = more prominent in feed.
 *
 * Formula:
 * hotScore = (engagementScore + freshnessBoost) / (ageHours + 2)^gravity
 *
 * Where:
 * - engagementScore = (upvotes * 1.0) - (downvotes * 0.5) + (completionCount * 0.3) + (viewCount * 0.1)
 * - freshnessBoost = decaying boost for content < 48 hours old (max 5 points, linear decay)
 * - gravity = 1.8 (controls how quickly older content decays)
 * - +2 prevents division issues for very new content
 */
export function calculateHotScore(event: EventEngagementData): number {
  const ageHours =
    (Date.now() - event.publishedDate.getTime()) / (1000 * 60 * 60);
  const gravity = 1.8;

  // Calculate engagement score with weighted components
  const engagementScore =
    event.upvotes * 1.0 -
    event.downvotes * 0.5 +
    event.completionCount * 0.3 +
    event.viewCount * 0.1;

  // Freshness boost: new content gets a boost that decays over 48 hours
  // This ensures new content surfaces even with zero engagement
  const freshnessBoostMax = 5; // Equivalent to 5 upvotes
  const freshnessDecayHours = 48;
  const freshnessBoost =
    ageHours < freshnessDecayHours
      ? freshnessBoostMax * (1 - ageHours / freshnessDecayHours)
      : 0;

  // Ensure minimum score of 0 to avoid negative rankings
  const normalizedEngagement = Math.max(0, engagementScore + freshnessBoost);

  // Reddit-style hot ranking with time decay
  // Adding 2 to age prevents division by near-zero for very new content
  const hotScore = normalizedEngagement / Math.pow(ageHours + 2, gravity);

  return hotScore;
}

/**
 * Update hot score for a single event.
 * Called after votes or significant engagement changes.
 */
export async function updateEventHotScore(eventId: string): Promise<void> {
  const event = await prisma.currentEvent.findUnique({
    where: { id: eventId },
    select: {
      upvotes: true,
      downvotes: true,
      completionCount: true,
      viewCount: true,
      publishedDate: true,
    },
  });

  if (!event) {
    return;
  }

  const hotScore = calculateHotScore(event);

  await prisma.currentEvent.update({
    where: { id: eventId },
    data: { hotScore },
  });
}

/**
 * Batch update hot scores for all published events.
 * Should be called periodically (every 15 minutes) via scheduled job.
 */
export async function updateAllHotScores(): Promise<{
  updated: number;
  errors: number;
}> {
  const events = await prisma.currentEvent.findMany({
    where: {
      isPublished: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      upvotes: true,
      downvotes: true,
      completionCount: true,
      viewCount: true,
      publishedDate: true,
    },
  });

  let updated = 0;
  let errors = 0;

  // Process in batches to avoid overwhelming the database
  const batchSize = 50;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);

    const updates = batch.map((event) => {
      const hotScore = calculateHotScore(event);
      return prisma.currentEvent.update({
        where: { id: event.id },
        data: { hotScore },
      });
    });

    try {
      await Promise.all(updates);
      updated += batch.length;
    } catch (error) {
      console.error('Error updating hot scores batch:', error);
      errors += batch.length;
    }
  }

  return { updated, errors };
}

/**
 * Get events sorted by recency first, then by upvotes within the same day.
 * This ensures newest content always appears first, with popular content
 * rising to the top within each day.
 *
 * Excludes events the user has already seen (by session).
 */
export async function getFeedEvents(options: {
  limit?: number;
  excludeIds?: string[];
  sessionId?: string;
}): Promise<
  Array<{
    id: string;
    headline: string;
    summary: string;
    sourceUrl: string | null;
    sourcePublisher: string | null;
    publishedDate: Date;
    featured: boolean;
    mediaType: string;
    videoId: string | null;
    thumbnailUrl: string | null;
    upvotes: number;
    downvotes: number;
    viewCount: number;
    hotScore: number;
    whyItMatters: string | null;
    connectionExplanation: string;
    commentCount: number;
    isPaywalled: boolean;
    paywallReason: string | null;
  }>
> {
  const { limit = 10, excludeIds = [] } = options;

  // Build exclude list from provided IDs
  const excludeCondition =
    excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {};

  // Fetch more events than needed so we can sort by day + upvotes in memory
  const events = await prisma.currentEvent.findMany({
    where: {
      isPublished: true,
      ...excludeCondition,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: [
      { publishedDate: 'desc' },
      { upvotes: 'desc' },
    ],
    take: limit * 3, // Fetch more to allow proper day-based sorting
    select: {
      id: true,
      headline: true,
      summary: true,
      sourceUrl: true,
      sourcePublisher: true,
      publishedDate: true,
      featured: true,
      mediaType: true,
      videoId: true,
      thumbnailUrl: true,
      upvotes: true,
      downvotes: true,
      viewCount: true,
      hotScore: true,
      whyItMatters: true,
      connectionExplanation: true,
      isPaywalled: true,
      paywallReason: true,
    },
  });

  // Sort by day (most recent first), then by upvotes within each day
  const sortedEvents = events.sort((a, b) => {
    // Get date only (no time) for comparison
    const dayA = new Date(a.publishedDate).toISOString().split('T')[0];
    const dayB = new Date(b.publishedDate).toISOString().split('T')[0];

    // If different days, sort by date (newest first)
    if (dayA !== dayB) {
      return dayB.localeCompare(dayA);
    }

    // Same day: sort by upvotes (highest first)
    return b.upvotes - a.upvotes;
  });

  // Return only the requested limit
  const limitedEvents = sortedEvents.slice(0, limit);

  // Get comment counts for all events in a single query
  const eventIds = limitedEvents.map((e) => e.id);
  const commentCounts = await prisma.comment.groupBy({
    by: ['targetId'],
    where: {
      targetType: 'news_event',
      targetId: { in: eventIds },
      isDeleted: false,
      isHidden: false,
    },
    _count: { id: true },
  });

  // Create a map for quick lookup
  const countMap = new Map(
    commentCounts.map((c) => [c.targetId, c._count.id])
  );

  // Attach comment counts to events
  return limitedEvents.map((event) => ({
    ...event,
    commentCount: countMap.get(event.id) || 0,
  }));
}

/**
 * Get trending events (highest hot scores from last 24 hours).
 */
export async function getTrendingEvents(
  limit = 10
): Promise<
  Array<{
    id: string;
    headline: string;
    summary: string;
    sourcePublisher: string | null;
    publishedDate: Date;
    upvotes: number;
    downvotes: number;
    hotScore: number;
    thumbnailUrl: string | null;
    commentCount: number;
    isPaywalled: boolean;
    paywallReason: string | null;
  }>
> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const events = await prisma.currentEvent.findMany({
    where: {
      isPublished: true,
      publishedDate: { gte: oneDayAgo },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: {
      hotScore: 'desc',
    },
    take: limit,
    select: {
      id: true,
      headline: true,
      summary: true,
      sourcePublisher: true,
      publishedDate: true,
      upvotes: true,
      downvotes: true,
      hotScore: true,
      thumbnailUrl: true,
      isPaywalled: true,
      paywallReason: true,
    },
  });

  // Get comment counts for all events
  const eventIds = events.map((e) => e.id);
  const commentCounts = await prisma.comment.groupBy({
    by: ['targetId'],
    where: {
      targetType: 'news_event',
      targetId: { in: eventIds },
      isDeleted: false,
      isHidden: false,
    },
    _count: { id: true },
  });

  const countMap = new Map(
    commentCounts.map((c) => [c.targetId, c._count.id])
  );

  return events.map((event) => ({
    ...event,
    commentCount: countMap.get(event.id) || 0,
  }));
}

/**
 * Get fresh events (newest, regardless of engagement).
 */
export async function getFreshEvents(
  limit = 10
): Promise<
  Array<{
    id: string;
    headline: string;
    summary: string;
    sourcePublisher: string | null;
    publishedDate: Date;
    upvotes: number;
    downvotes: number;
    hotScore: number;
    thumbnailUrl: string | null;
    commentCount: number;
    isPaywalled: boolean;
    paywallReason: string | null;
  }>
> {
  const events = await prisma.currentEvent.findMany({
    where: {
      isPublished: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: {
      publishedDate: 'desc',
    },
    take: limit,
    select: {
      id: true,
      headline: true,
      summary: true,
      sourcePublisher: true,
      publishedDate: true,
      upvotes: true,
      downvotes: true,
      hotScore: true,
      thumbnailUrl: true,
      isPaywalled: true,
      paywallReason: true,
    },
  });

  // Get comment counts for all events
  const eventIds = events.map((e) => e.id);
  const commentCounts = await prisma.comment.groupBy({
    by: ['targetId'],
    where: {
      targetType: 'news_event',
      targetId: { in: eventIds },
      isDeleted: false,
      isHidden: false,
    },
    _count: { id: true },
  });

  const countMap = new Map(
    commentCounts.map((c) => [c.targetId, c._count.id])
  );

  return events.map((event) => ({
    ...event,
    commentCount: countMap.get(event.id) || 0,
  }));
}

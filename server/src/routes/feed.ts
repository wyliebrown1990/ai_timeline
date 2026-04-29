/**
 * Feed Routes (Sprint Feed-1)
 *
 * API endpoints for the TikTok-style news feed:
 * - Feed retrieval (ranked by hot score)
 * - Trending and fresh content
 * - Interaction tracking (views, votes, engagement)
 * - Collections management (save/organize items)
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import {
  getFeedEvents,
  getTrendingEvents,
  getFreshEvents,
  updateEventHotScore,
  updateAllHotScores,
} from '../services/feedRankingService';

// ============================================================================
// Feed Routes (Public)
// ============================================================================

export const feedRouter = Router();

/**
 * GET /api/feed
 * Get personalized feed sorted by hot score
 *
 * Query params:
 * - limit: number of items (default: 10, max: 50)
 * - exclude: comma-separated event IDs to exclude (seen items)
 * - sessionId: for personalization (optional)
 */
feedRouter.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const excludeStr = (req.query.exclude as string) || '';
    const excludeIds = excludeStr ? excludeStr.split(',').filter(Boolean) : [];

    const events = await getFeedEvents({
      limit,
      excludeIds,
      sessionId: req.query.sessionId as string,
    });

    res.json({
      items: events,
      hasMore: events.length === limit,
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

/**
 * GET /api/feed/trending
 * Get trending items (high engagement in last 24 hours)
 */
feedRouter.get('/trending', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const events = await getTrendingEvents(limit);

    res.json({ items: events });
  } catch (error) {
    console.error('Error fetching trending:', error);
    res.status(500).json({ error: 'Failed to fetch trending' });
  }
});

/**
 * GET /api/feed/fresh
 * Get newest items (sorted by published date)
 */
feedRouter.get('/fresh', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const events = await getFreshEvents(limit);

    res.json({ items: events });
  } catch (error) {
    console.error('Error fetching fresh:', error);
    res.status(500).json({ error: 'Failed to fetch fresh' });
  }
});

// ============================================================================
// Interaction Routes (Public)
// ============================================================================

export const interactionRouter = Router();

/**
 * POST /api/news/:id/vote
 * Record upvote or downvote on a news event
 *
 * Body: { vote: 'up' | 'down', sessionId: string }
 */
interactionRouter.post('/:id/vote', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { vote, sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!['up', 'down'].includes(vote)) {
      return res.status(400).json({ error: 'vote must be "up" or "down"' });
    }

    const action = vote === 'up' ? 'upvote' : 'downvote';
    const oppositeAction = vote === 'up' ? 'downvote' : 'upvote';

    // Check for existing vote from this session
    const existingVote = await prisma.newsInteraction.findFirst({
      where: {
        eventId: id,
        sessionId,
        action: { in: ['upvote', 'downvote'] },
      },
    });

    // Start a transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      if (existingVote) {
        if (existingVote.action === action) {
          // Same vote - remove it (toggle off)
          await tx.newsInteraction.delete({
            where: { id: existingVote.id },
          });

          // Decrement the count
          const updateData =
            action === 'upvote'
              ? { upvotes: { decrement: 1 } }
              : { downvotes: { decrement: 1 } };

          return await tx.currentEvent.update({
            where: { id },
            data: updateData,
            select: { upvotes: true, downvotes: true },
          });
        } else {
          // Different vote - switch
          await tx.newsInteraction.update({
            where: { id: existingVote.id },
            data: { action },
          });

          // Adjust counts (decrement old, increment new)
          const updateData =
            action === 'upvote'
              ? { upvotes: { increment: 1 }, downvotes: { decrement: 1 } }
              : { upvotes: { decrement: 1 }, downvotes: { increment: 1 } };

          return await tx.currentEvent.update({
            where: { id },
            data: updateData,
            select: { upvotes: true, downvotes: true },
          });
        }
      } else {
        // New vote
        await tx.newsInteraction.create({
          data: {
            eventId: id,
            sessionId,
            action,
          },
        });

        // Increment the count
        const updateData =
          action === 'upvote'
            ? { upvotes: { increment: 1 } }
            : { downvotes: { increment: 1 } };

        return await tx.currentEvent.update({
          where: { id },
          data: updateData,
          select: { upvotes: true, downvotes: true },
        });
      }
    });

    // Update hot score in background (don't wait)
    updateEventHotScore(id).catch(console.error);

    // Determine user's current vote state
    const userVote = existingVote?.action === action ? null : action;

    res.json({
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      userVote: userVote === 'upvote' ? 'up' : userVote === 'downvote' ? 'down' : null,
    });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

/**
 * DELETE /api/news/:id/vote
 * Remove vote from a news event
 *
 * Body: { sessionId: string }
 */
interactionRouter.delete('/:id/vote', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const existingVote = await prisma.newsInteraction.findFirst({
      where: {
        eventId: id,
        sessionId,
        action: { in: ['upvote', 'downvote'] },
      },
    });

    if (!existingVote) {
      return res.status(404).json({ error: 'No vote found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.newsInteraction.delete({
        where: { id: existingVote.id },
      });

      const updateData =
        existingVote.action === 'upvote'
          ? { upvotes: { decrement: 1 } }
          : { downvotes: { decrement: 1 } };

      await tx.currentEvent.update({
        where: { id },
        data: updateData,
      });
    });

    // Update hot score in background
    updateEventHotScore(id).catch(console.error);

    const event = await prisma.currentEvent.findUnique({
      where: { id },
      select: { upvotes: true, downvotes: true },
    });

    res.json({
      upvotes: event?.upvotes ?? 0,
      downvotes: event?.downvotes ?? 0,
      userVote: null,
    });
  } catch (error) {
    console.error('Error removing vote:', error);
    res.status(500).json({ error: 'Failed to remove vote' });
  }
});

/**
 * POST /api/news/:id/view
 * Record a view on a news event (dedupe by session)
 *
 * Body: { sessionId: string }
 */
interactionRouter.post('/:id/view', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Check if already viewed in this session
    const existingView = await prisma.newsInteraction.findFirst({
      where: {
        eventId: id,
        sessionId,
        action: 'view',
      },
    });

    if (!existingView) {
      // Record new view
      await prisma.newsInteraction.create({
        data: {
          eventId: id,
          sessionId,
          action: 'view',
        },
      });

      // Increment view count
      await prisma.currentEvent.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording view:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

/**
 * POST /api/news/:id/engage
 * Record meaningful engagement (completion) on a news event
 *
 * Body: { sessionId: string, engagementType: string }
 * engagementType: 'read_context' | 'watch_video' | 'view_concepts' | 'chat'
 */
interactionRouter.post('/:id/engage', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sessionId, engagementType } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Check if already engaged in this session (any type)
    const existingEngagement = await prisma.newsInteraction.findFirst({
      where: {
        eventId: id,
        sessionId,
        action: { in: ['engage', 'chat', 'read_context', 'watch_video', 'view_concepts'] },
      },
    });

    if (!existingEngagement) {
      // Record engagement
      await prisma.newsInteraction.create({
        data: {
          eventId: id,
          sessionId,
          action: engagementType || 'engage',
          metadata: engagementType ? JSON.stringify({ type: engagementType }) : null,
        },
      });

      // Increment completion count
      await prisma.currentEvent.update({
        where: { id },
        data: { completionCount: { increment: 1 } },
      });

      // Update hot score in background
      updateEventHotScore(id).catch(console.error);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording engagement:', error);
    res.status(500).json({ error: 'Failed to record engagement' });
  }
});

/**
 * POST /api/news/:id/share
 * Record a share action
 *
 * Body: { sessionId: string, platform: string }
 */
interactionRouter.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sessionId, platform } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    await prisma.newsInteraction.create({
      data: {
        eventId: id,
        sessionId,
        action: 'share',
        metadata: platform ? JSON.stringify({ platform }) : null,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording share:', error);
    res.status(500).json({ error: 'Failed to record share' });
  }
});

/**
 * POST /api/news/:id/not-interested
 * Record a "not interested" action (swipe left)
 *
 * Body: { sessionId: string }
 */
interactionRouter.post('/:id/not-interested', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Check if already marked as not interested in this session
    const existing = await prisma.newsInteraction.findFirst({
      where: {
        eventId: id,
        sessionId,
        action: 'not_interested',
      },
    });

    if (!existing) {
      await prisma.newsInteraction.create({
        data: {
          eventId: id,
          sessionId,
          action: 'not_interested',
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording not interested:', error);
    res.status(500).json({ error: 'Failed to record not interested' });
  }
});

/**
 * POST /api/news/:id/share
 * Record a share action with platform metadata
 *
 * Body: { platform: string, sessionId?: string }
 */
interactionRouter.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { platform, sessionId } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'platform is required' });
    }

    // Record share interaction
    await prisma.newsInteraction.create({
      data: {
        eventId: id,
        sessionId: sessionId || 'anonymous',
        action: 'share',
        metadata: JSON.stringify({ platform }),
      },
    });

    // Increment share count on the event if field exists
    try {
      await prisma.currentEvent.update({
        where: { id },
        data: {
          // shareCount field may not exist yet
        },
      });
    } catch {
      // Field doesn't exist, ignore
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording share:', error);
    res.status(500).json({ error: 'Failed to record share' });
  }
});

/**
 * GET /api/news/:id
 * Get a single news event by ID (for sharing/deep linking)
 * Sprint Feed-5: OG tags support
 */
interactionRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.currentEvent.findUnique({
      where: { id },
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

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * GET /api/news/:id/user-vote
 * Get current user's vote on an event
 *
 * Query: sessionId
 */
interactionRouter.get('/:id/user-vote', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const vote = await prisma.newsInteraction.findFirst({
      where: {
        eventId: id,
        sessionId,
        action: { in: ['upvote', 'downvote'] },
      },
      select: { action: true },
    });

    res.json({
      userVote: vote?.action === 'upvote' ? 'up' : vote?.action === 'downvote' ? 'down' : null,
    });
  } catch (error) {
    console.error('Error fetching user vote:', error);
    res.status(500).json({ error: 'Failed to fetch user vote' });
  }
});

// ============================================================================
// Collections Routes (Public)
// ============================================================================

export const collectionsRouter = Router();

/**
 * GET /api/collections
 * Get all collections for a session
 *
 * Query: sessionId (required)
 */
collectionsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const collections = await prisma.savedCollection.findMany({
      where: { sessionId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    // Parse items JSON for each collection
    const parsed = collections.map((c) => ({
      ...c,
      items: JSON.parse(c.items),
    }));

    res.json({ collections: parsed });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

/**
 * POST /api/collections
 * Create a new collection
 *
 * Body: { sessionId: string, name: string, isPublic?: boolean }
 */
collectionsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { sessionId, name, isPublic = false } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (name.length > 50) {
      return res.status(400).json({ error: 'name must be 50 characters or less' });
    }

    const collection = await prisma.savedCollection.create({
      data: {
        sessionId,
        name: name.trim(),
        isPublic,
        items: '[]',
      },
    });

    res.status(201).json({
      ...collection,
      items: [],
    });
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

/**
 * PUT /api/collections/:id
 * Update a collection
 *
 * Body: { name?: string, isPublic?: boolean }
 */
collectionsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isPublic } = req.body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return res.status(400).json({ error: 'name cannot be empty' });
      }
      if (name.length > 50) {
        return res.status(400).json({ error: 'name must be 50 characters or less' });
      }
      updateData.name = name.trim();
    }

    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
    }

    const collection = await prisma.savedCollection.update({
      where: { id },
      data: updateData,
    });

    res.json({
      ...collection,
      items: JSON.parse(collection.items),
    });
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

/**
 * DELETE /api/collections/:id
 * Delete a collection
 */
collectionsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if it's the default collection
    const collection = await prisma.savedCollection.findUnique({
      where: { id },
      select: { isDefault: true },
    });

    if (collection?.isDefault) {
      return res.status(400).json({ error: 'Cannot delete the default collection' });
    }

    await prisma.savedCollection.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

/**
 * POST /api/collections/:id/items
 * Add an item to a collection
 *
 * Body: { eventId: string }
 */
collectionsRouter.post('/:id/items', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    const collection = await prisma.savedCollection.findUnique({
      where: { id },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const items: string[] = JSON.parse(collection.items);

    // Don't add duplicates
    if (!items.includes(eventId)) {
      items.push(eventId);

      await prisma.savedCollection.update({
        where: { id },
        data: { items: JSON.stringify(items) },
      });
    }

    res.json({ items });
  } catch (error) {
    console.error('Error adding item to collection:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

/**
 * DELETE /api/collections/:id/items/:eventId
 * Remove an item from a collection
 */
collectionsRouter.delete('/:id/items/:eventId', async (req: Request, res: Response) => {
  try {
    const { id, eventId } = req.params;

    const collection = await prisma.savedCollection.findUnique({
      where: { id },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const items: string[] = JSON.parse(collection.items);
    const newItems = items.filter((item) => item !== eventId);

    await prisma.savedCollection.update({
      where: { id },
      data: { items: JSON.stringify(newItems) },
    });

    res.json({ items: newItems });
  } catch (error) {
    console.error('Error removing item from collection:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

/**
 * POST /api/collections/save
 * Quick save to default "Saved" collection (creates if doesn't exist)
 *
 * Body: { sessionId: string, eventId: string }
 */
collectionsRouter.post('/save', async (req: Request, res: Response) => {
  try {
    const { sessionId, eventId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    // Find or create default collection
    let defaultCollection = await prisma.savedCollection.findFirst({
      where: {
        sessionId,
        isDefault: true,
      },
    });

    if (!defaultCollection) {
      defaultCollection = await prisma.savedCollection.create({
        data: {
          sessionId,
          name: 'Saved',
          isDefault: true,
          items: '[]',
        },
      });
    }

    const items: string[] = JSON.parse(defaultCollection.items);

    // Toggle save state
    let isSaved: boolean;
    if (items.includes(eventId)) {
      // Remove from saved
      const newItems = items.filter((item) => item !== eventId);
      await prisma.savedCollection.update({
        where: { id: defaultCollection.id },
        data: { items: JSON.stringify(newItems) },
      });
      isSaved = false;
    } else {
      // Add to saved
      items.push(eventId);
      await prisma.savedCollection.update({
        where: { id: defaultCollection.id },
        data: { items: JSON.stringify(items) },
      });
      isSaved = true;

      // Record save interaction
      await prisma.newsInteraction.create({
        data: {
          eventId,
          sessionId,
          action: 'save',
        },
      });
    }

    res.json({ isSaved });
  } catch (error) {
    console.error('Error saving item:', error);
    res.status(500).json({ error: 'Failed to save item' });
  }
});

/**
 * GET /api/collections/check-saved
 * Check if an item is in the default saved collection
 *
 * Query: sessionId, eventId
 */
collectionsRouter.get('/check-saved', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    const eventId = req.query.eventId as string;

    if (!sessionId || !eventId) {
      return res.status(400).json({ error: 'sessionId and eventId are required' });
    }

    const defaultCollection = await prisma.savedCollection.findFirst({
      where: {
        sessionId,
        isDefault: true,
      },
    });

    if (!defaultCollection) {
      return res.json({ isSaved: false });
    }

    const items: string[] = JSON.parse(defaultCollection.items);
    res.json({ isSaved: items.includes(eventId) });
  } catch (error) {
    console.error('Error checking saved status:', error);
    res.status(500).json({ error: 'Failed to check saved status' });
  }
});

// ============================================================================
// Admin Routes
// ============================================================================

export const adminFeedRouter = Router();

/**
 * POST /api/admin/feed/update-hot-scores
 * Manually trigger hot score recalculation for all events
 */
adminFeedRouter.post('/update-hot-scores', async (req: Request, res: Response) => {
  try {
    const result = await updateAllHotScores();
    res.json(result);
  } catch (error) {
    console.error('Error updating hot scores:', error);
    res.status(500).json({ error: 'Failed to update hot scores' });
  }
});

/**
 * GET /api/admin/feed/stats
 * Get feed engagement statistics
 */
adminFeedRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalEvents,
      totalInteractions,
      interactionsByType,
      topEngagedEvents,
      recentActivity,
    ] = await Promise.all([
      // Total published events
      prisma.currentEvent.count({
        where: { isPublished: true },
      }),
      // Total interactions
      prisma.newsInteraction.count(),
      // Interactions by type
      prisma.newsInteraction.groupBy({
        by: ['action'],
        _count: { action: true },
      }),
      // Top engaged events
      prisma.currentEvent.findMany({
        where: { isPublished: true },
        orderBy: { hotScore: 'desc' },
        take: 10,
        select: {
          id: true,
          headline: true,
          upvotes: true,
          downvotes: true,
          viewCount: true,
          completionCount: true,
          hotScore: true,
        },
      }),
      // Recent activity (last 24 hours)
      prisma.newsInteraction.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    res.json({
      totalEvents,
      totalInteractions,
      interactionsByType: Object.fromEntries(
        interactionsByType.map((i) => [i.action, i._count.action])
      ),
      topEngagedEvents,
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching feed stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

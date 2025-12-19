/**
 * Review Controller
 *
 * Handles review queue endpoints for approving/rejecting AI-generated drafts.
 */

import { Request, Response } from 'express';
import { prisma } from '../db';
import { publishMilestone } from '../services/publishing/milestonePublisher';
import { publishNewsEvent } from '../services/publishing/newsPublisher';
import { publishGlossaryTerm } from '../services/publishing/glossaryPublisher';

/**
 * Get review queue with filters
 */
export async function getQueue(req: Request, res: Response) {
  try {
    const { type, status = 'pending', limit = 50, offset = 0 } = req.query;

    const where: Record<string, unknown> = {
      status: status as string,
    };

    if (type) {
      where.contentType = type as string;
    }

    const [drafts, total] = await Promise.all([
      prisma.contentDraft.findMany({
        where,
        include: {
          article: {
            include: {
              source: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.contentDraft.count({ where }),
    ]);

    // Prepare drafts for response - draftData is already parsed (PostgreSQL Json type)
    const parsedDrafts = drafts.map((draft) => ({
      ...draft,
      draftData: draft.draftData, // Already an object from PostgreSQL Json type
      validationErrors: draft.validationErrors ? JSON.parse(draft.validationErrors) : null,
    }));

    return res.json({
      drafts: parsedDrafts,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Error getting review queue:', error);
    return res.status(500).json({ error: 'Failed to get review queue' });
  }
}

/**
 * Get queue counts by type
 */
export async function getQueueCounts(req: Request, res: Response) {
  try {
    const [pendingByType, publishedThisWeek] = await Promise.all([
      prisma.contentDraft.groupBy({
        by: ['contentType'],
        where: { status: 'pending' },
        _count: true,
      }),
      prisma.contentDraft.count({
        where: {
          status: 'published',
          publishedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    const counts = {
      news_event: 0,
      milestone: 0,
      glossary_term: 0,
      total: 0,
      publishedThisWeek,
    };

    for (const item of pendingByType) {
      const type = item.contentType as keyof typeof counts;
      if (type in counts) {
        counts[type] = item._count;
      }
      counts.total += item._count;
    }

    return res.json(counts);
  } catch (error) {
    console.error('Error getting queue counts:', error);
    return res.status(500).json({ error: 'Failed to get queue counts' });
  }
}

/**
 * Get a single draft with article context
 */
export async function getDraft(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const draft = await prisma.contentDraft.findUnique({
      where: { id },
      include: {
        article: {
          include: {
            source: true,
          },
        },
      },
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    return res.json({
      ...draft,
      draftData: draft.draftData, // Already an object from PostgreSQL Json type
      validationErrors: draft.validationErrors ? JSON.parse(draft.validationErrors) : null,
    });
  } catch (error) {
    console.error('Error getting draft:', error);
    return res.status(500).json({ error: 'Failed to get draft' });
  }
}

/**
 * Update draft content (edit before approval)
 */
export async function updateDraft(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { draftData } = req.body;

    if (!draftData) {
      return res.status(400).json({ error: 'draftData is required' });
    }

    const draft = await prisma.contentDraft.findUnique({
      where: { id },
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (draft.status !== 'pending') {
      return res.status(400).json({ error: 'Can only edit pending drafts' });
    }

    const updated = await prisma.contentDraft.update({
      where: { id },
      data: {
        draftData, // Native PostgreSQL Json type - pass object directly
        updatedAt: new Date(),
      },
      include: {
        article: {
          include: {
            source: true,
          },
        },
      },
    });

    return res.json({
      ...updated,
      draftData: updated.draftData, // Already an object from PostgreSQL Json type
      validationErrors: updated.validationErrors ? JSON.parse(updated.validationErrors) : null,
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    return res.status(500).json({ error: 'Failed to update draft' });
  }
}

/**
 * Approve and publish a draft
 */
export async function approveDraft(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const draft = await prisma.contentDraft.findUnique({
      where: { id },
      include: {
        article: {
          include: {
            source: true,
          },
        },
      },
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (draft.status !== 'pending') {
      return res.status(400).json({ error: 'Draft is not pending' });
    }

    // draftData is already an object from PostgreSQL Json type
    const draftData = draft.draftData as Record<string, unknown>;

    let publishedId: string;

    // Publish based on content type
    switch (draft.contentType) {
      case 'milestone':
        publishedId = await publishMilestone(draftData);
        break;
      case 'news_event':
        publishedId = await publishNewsEvent(draftData);
        break;
      case 'glossary_term':
        // Publish glossary term to database, passing source article ID
        publishedId = await publishGlossaryTerm(draftData, draft.articleId);
        break;
      default:
        return res.status(400).json({ error: `Unknown content type: ${draft.contentType}` });
    }

    // Update draft status
    const updated = await prisma.contentDraft.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedId,
      },
    });

    return res.json({
      message: 'Draft published successfully',
      draft: {
        ...updated,
        draftData,
      },
      publishedId,
    });
  } catch (error) {
    console.error('Error approving draft:', error);
    return res.status(500).json({
      error: 'Failed to approve draft',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Reject a draft with notes
 */
export async function rejectDraft(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const draft = await prisma.contentDraft.findUnique({
      where: { id },
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (draft.status !== 'pending') {
      return res.status(400).json({ error: 'Draft is not pending' });
    }

    const updated = await prisma.contentDraft.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: reason || null,
      },
    });

    return res.json({
      message: 'Draft rejected',
      draft: {
        ...updated,
        draftData: updated.draftData, // Already an object from PostgreSQL Json type
      },
    });
  } catch (error) {
    console.error('Error rejecting draft:', error);
    return res.status(500).json({ error: 'Failed to reject draft' });
  }
}

/**
 * Get recently published items
 */
export async function getPublished(req: Request, res: Response) {
  try {
    const { type, limit = 20, offset = 0 } = req.query;

    const where: Record<string, unknown> = {
      status: 'published',
    };

    if (type) {
      where.contentType = type as string;
    }

    const [drafts, total] = await Promise.all([
      prisma.contentDraft.findMany({
        where,
        include: {
          article: {
            include: {
              source: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.contentDraft.count({ where }),
    ]);

    // draftData is already an object from PostgreSQL Json type
    return res.json({
      drafts,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Error getting published items:', error);
    return res.status(500).json({ error: 'Failed to get published items' });
  }
}

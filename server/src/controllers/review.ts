/**
 * Review Controller
 *
 * Handles review queue endpoints for approving/rejecting AI-generated drafts.
 */

import { Request, Response } from 'express';
import { prisma } from '../db';
import { publishMilestone } from '../services/publishing/milestonePublisher';
import { publishNewsEvent, processNewsLearning } from '../services/publishing/newsPublisher';
import { publishGlossaryTerm } from '../services/publishing/glossaryPublisher';
import {
  promoteNewsEventToMilestone,
  type MilestoneOverrides,
} from '../services/publishing/milestonePromoter';

/**
 * Subject classification from draft data
 */
interface SuggestedSubject {
  subjectId: string;
  subjectSlug: string;
  confidence: number;
  isPrimary: boolean;
}

/**
 * Publish ContentSubject records for approved content
 * Sprint Subj-2: Creates ContentSubject records linking published content to subjects
 */
async function publishContentSubjects(
  contentType: string,
  contentId: string,
  suggestedSubjects: SuggestedSubject[] | undefined
): Promise<number> {
  if (!suggestedSubjects || suggestedSubjects.length === 0) {
    return 0;
  }

  let created = 0;

  for (const subject of suggestedSubjects) {
    // Verify subject exists before creating
    const subjectExists = await prisma.subject.findUnique({
      where: { id: subject.subjectId },
      select: { id: true },
    });

    if (!subjectExists) {
      console.warn(`[Review] Subject ${subject.subjectId} not found, skipping`);
      continue;
    }

    // Use upsert to prevent duplicates
    await prisma.contentSubject.upsert({
      where: {
        contentType_contentId_subjectId: {
          contentType,
          contentId,
          subjectId: subject.subjectId,
        },
      },
      create: {
        contentType,
        contentId,
        subjectId: subject.subjectId,
        isPrimary: subject.isPrimary,
        confidence: subject.confidence,
        source: 'auto',
      },
      update: {
        isPrimary: subject.isPrimary,
        confidence: subject.confidence,
      },
    });

    created++;
  }

  console.log(`[Review] Created ${created} ContentSubject records for ${contentType}/${contentId}`);
  return created;
}

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
 *
 * For news_event drafts, optionally promote to milestone by passing:
 * - promoteToMilestone: boolean
 * - milestoneOverrides: { category?, significance?, tags?, title?, description? }
 */
export async function approveDraft(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { promoteToMilestone, milestoneOverrides } = req.body as {
      promoteToMilestone?: boolean;
      milestoneOverrides?: MilestoneOverrides;
    };

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
    let promotedMilestoneId: string | undefined;

    // Publish based on content type
    switch (draft.contentType) {
      case 'milestone':
        publishedId = await publishMilestone(draftData);
        break;
      case 'news_event':
        publishedId = await publishNewsEvent(draftData);

        // If promoting to milestone, also create a milestone
        if (promoteToMilestone) {
          try {
            promotedMilestoneId = await promoteNewsEventToMilestone(
              draftData as Parameters<typeof promoteNewsEventToMilestone>[0],
              milestoneOverrides || {}
            );
            console.log(
              `[Review] Promoted news event ${publishedId} to milestone ${promotedMilestoneId}`
            );
          } catch (promoError) {
            console.error('[Review] Failed to promote to milestone:', promoError);
            // Don't fail the whole operation - the news event was published successfully
            // Log the error and continue
          }
        }
        break;
      case 'glossary_term':
        // Publish glossary term to database, passing source article ID
        publishedId = await publishGlossaryTerm(draftData, draft.articleId);
        break;
      default:
        return res.status(400).json({ error: `Unknown content type: ${draft.contentType}` });
    }

    // Publish ContentSubject records (Sprint Subj-2)
    const suggestedSubjects = draftData.suggestedSubjects as SuggestedSubject[] | undefined;
    const subjectsCreated = await publishContentSubjects(
      draft.contentType,
      publishedId,
      suggestedSubjects
    );

    // If milestone was promoted, also link subjects to it
    if (promotedMilestoneId) {
      await publishContentSubjects('milestone', promotedMilestoneId, suggestedSubjects);
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
      message: promotedMilestoneId
        ? 'Draft published and promoted to milestone'
        : 'Draft published successfully',
      draft: {
        ...updated,
        draftData,
      },
      publishedId,
      promotedMilestoneId,
      subjectsCreated,
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
 * Bulk approve multiple drafts
 */
export async function bulkApprove(req: Request, res: Response) {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (ids.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 drafts can be approved at once' });
    }

    // Get all pending drafts
    const drafts = await prisma.contentDraft.findMany({
      where: { id: { in: ids }, status: 'pending' },
      include: {
        article: {
          include: {
            source: true,
          },
        },
      },
    });

    if (drafts.length === 0) {
      return res.status(400).json({ error: 'No pending drafts found with provided IDs' });
    }

    const results: Array<{ id: string; success: boolean; publishedId?: string; error?: string }> = [];

    // Process each draft
    for (const draft of drafts) {
      try {
        const draftData = draft.draftData as Record<string, unknown>;
        let publishedId: string;

        switch (draft.contentType) {
          case 'milestone':
            publishedId = await publishMilestone(draftData);
            break;
          case 'news_event':
            // Skip AI learning processing during bulk approval to avoid timeout
            // Learning can be processed later via the process-learning endpoint
            publishedId = await publishNewsEvent(draftData, { skipLearning: true });
            break;
          case 'glossary_term':
            publishedId = await publishGlossaryTerm(draftData, draft.articleId);
            break;
          default:
            results.push({ id: draft.id, success: false, error: `Unknown content type: ${draft.contentType}` });
            continue;
        }

        // Publish ContentSubject records (Sprint Subj-2)
        const suggestedSubjects = draftData.suggestedSubjects as SuggestedSubject[] | undefined;
        await publishContentSubjects(draft.contentType, publishedId, suggestedSubjects);

        await prisma.contentDraft.update({
          where: { id: draft.id },
          data: {
            status: 'published',
            publishedAt: new Date(),
            publishedId,
          },
        });

        results.push({ id: draft.id, success: true, publishedId });
      } catch (err) {
        results.push({
          id: draft.id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const approved = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return res.json({
      message: `Approved ${approved} drafts, ${failed} failed`,
      approved,
      failed,
      results,
    });
  } catch (error) {
    console.error('Error bulk approving drafts:', error);
    return res.status(500).json({
      error: 'Failed to bulk approve drafts',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Bulk reject multiple drafts
 */
export async function bulkReject(req: Request, res: Response) {
  try {
    const { ids, reason } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (ids.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 drafts can be rejected at once' });
    }

    const result = await prisma.contentDraft.updateMany({
      where: { id: { in: ids }, status: 'pending' },
      data: {
        status: 'rejected',
        rejectionReason: reason || 'Bulk rejected',
      },
    });

    return res.json({
      message: `Rejected ${result.count} drafts`,
      rejected: result.count,
    });
  } catch (error) {
    console.error('Error bulk rejecting drafts:', error);
    return res.status(500).json({
      error: 'Failed to bulk reject drafts',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
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

/**
 * Process news learning for recently published events that were bulk approved
 * This runs AI concept linking and context generation for events that skipped it
 */
export async function processNewsEventLearning(req: Request, res: Response) {
  try {
    const { limit = 5 } = req.query;
    const batchSize = Math.min(Number(limit), 10); // Cap at 10 to avoid timeout

    // Find published news event drafts from the last 7 days that might need learning processing
    // We check CurrentEvent for events without concept links
    const recentEvents = await prisma.currentEvent.findMany({
      where: {
        isPublished: true,
        publishedDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: {
        id: true,
        headline: true,
        conceptLinks: {
          select: { id: true },
        },
      },
      orderBy: { publishedDate: 'desc' },
      take: 100, // Check up to 100 recent events
    });

    // Filter to events without concept links (likely skipped during bulk approval)
    const eventsNeedingProcessing = recentEvents.filter(
      (event) => event.conceptLinks.length === 0
    );

    if (eventsNeedingProcessing.length === 0) {
      return res.json({
        message: 'All recent news events already have learning processing',
        processed: 0,
        remaining: 0,
      });
    }

    // Process up to batchSize events
    const toProcess = eventsNeedingProcessing.slice(0, batchSize);
    const results: Array<{ id: string; headline: string; success: boolean; error?: string }> = [];

    for (const event of toProcess) {
      try {
        await processNewsLearning(event.id);
        results.push({ id: event.id, headline: event.headline, success: true });
      } catch (err) {
        results.push({
          id: event.id,
          headline: event.headline,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return res.json({
      message: `Processed ${successful} events, ${failed} failed`,
      processed: successful,
      failed,
      remaining: eventsNeedingProcessing.length - toProcess.length,
      results,
    });
  } catch (error) {
    console.error('Error processing news event learning:', error);
    return res.status(500).json({
      error: 'Failed to process news event learning',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

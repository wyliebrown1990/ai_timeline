/**
 * News Learning Controller (Sprint LEarn-2)
 *
 * Handles API endpoints for news-concept linking and context generation.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as newsConceptLinker from '../services/newsConceptLinker';
import * as newsContextGenerator from '../services/newsContextGenerator';

// =============================================================================
// Public Endpoints
// =============================================================================

/**
 * GET /api/news/:id/concepts
 * Get linked concepts for a news event
 */
export async function getEventConcepts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    // Verify event exists
    const event = await prisma.currentEvent.findUnique({
      where: { id },
      select: { id: true, isPublished: true },
    });

    if (!event) {
      throw ApiError.notFound(`News event not found: ${id}`);
    }

    if (!event.isPublished) {
      throw ApiError.notFound(`News event not found: ${id}`);
    }

    const concepts = await newsConceptLinker.getEventConcepts(id, prisma);

    res.json({
      data: concepts,
      total: concepts.length,
      keyTopics: concepts.filter((c) => c.isKeyTopic).length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/news/:id/context
 * Get historical context and related milestones for a news event
 */
export async function getEventContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    // Verify event exists
    const event = await prisma.currentEvent.findUnique({
      where: { id },
      select: { id: true, isPublished: true },
    });

    if (!event) {
      throw ApiError.notFound(`News event not found: ${id}`);
    }

    if (!event.isPublished) {
      throw ApiError.notFound(`News event not found: ${id}`);
    }

    const context = await newsContextGenerator.getNewsContext(id, prisma);

    res.json({
      data: {
        whyItMatters: context.whyItMatters,
        relatedMilestones: context.relatedMilestones.map((m) => ({
          id: m.id,
          title: m.title,
          date: m.date,
          category: m.category,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/news/concepts/:conceptId
 * Get all news mentioning a concept
 */
export async function getNewsByConceptId(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { conceptId } = req.params;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    // Verify concept exists
    const concept = await prisma.glossaryTerm.findUnique({
      where: { id: conceptId },
      select: { id: true, term: true },
    });

    if (!concept) {
      throw ApiError.notFound(`Concept not found: ${conceptId}`);
    }

    const news = await newsConceptLinker.getNewsByConceptId(conceptId, prisma, limit);

    res.json({
      data: news,
      total: news.length,
      concept: concept.term,
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Admin Endpoints
// =============================================================================

/**
 * POST /api/admin/news/:id/link-concepts
 * Manually trigger concept detection and linking for a news event
 */
export async function linkConcepts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    // Verify event exists
    const event = await prisma.currentEvent.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!event) {
      throw ApiError.notFound(`News event not found: ${id}`);
    }

    const result = await newsConceptLinker.processNewsEventConcepts(id, prisma);

    res.json({
      success: true,
      message: `Linked ${result.linkedCount} concepts to news event`,
      data: {
        matches: result.matches,
        keyTopics: result.keyTopics,
        reasoning: result.reasoning,
        linkedCount: result.linkedCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/news/:id/generate-context
 * Generate or regenerate "Why it matters" context for a news event
 */
export async function generateContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    // Verify event exists
    const event = await prisma.currentEvent.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!event) {
      throw ApiError.notFound(`News event not found: ${id}`);
    }

    const context = await newsContextGenerator.generateNewsContext(id, prisma);

    res.json({
      success: true,
      message: 'Context generated successfully',
      data: context,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/news/:id/concepts/:conceptId
 * Remove a concept link from a news event
 */
export async function removeConceptLink(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, conceptId } = req.params;

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    // Delete the link
    const deleted = await prisma.newsEventConcept.deleteMany({
      where: {
        eventId: id,
        conceptId: conceptId,
      },
    });

    if (deleted.count === 0) {
      throw ApiError.notFound(`Concept link not found`);
    }

    res.json({
      success: true,
      message: 'Concept link removed',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/news/:id/add-concept
 * Manually add a concept link to a news event
 */
export async function addConceptLink(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const schema = z.object({
      conceptId: z.string(),
      isKeyTopic: z.boolean().optional().default(false),
      mentionContext: z.string().optional(),
    });
    const { conceptId, isKeyTopic, mentionContext } = schema.parse(req.body);

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    // Verify event and concept exist
    const [event, concept] = await Promise.all([
      prisma.currentEvent.findUnique({ where: { id }, select: { id: true } }),
      prisma.glossaryTerm.findUnique({ where: { id: conceptId }, select: { id: true, term: true } }),
    ]);

    if (!event) throw ApiError.notFound(`News event not found: ${id}`);
    if (!concept) throw ApiError.notFound(`Concept not found: ${conceptId}`);

    // Create the link
    const link = await prisma.newsEventConcept.upsert({
      where: {
        eventId_conceptId: { eventId: id, conceptId },
      },
      create: {
        eventId: id,
        conceptId,
        isKeyTopic,
        mentionContext: mentionContext || null,
      },
      update: {
        isKeyTopic,
        mentionContext: mentionContext || null,
      },
    });

    res.json({
      success: true,
      message: `Linked concept "${concept.term}" to news event`,
      data: link,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/news/backfill
 * Backfill all unprocessed news events with concepts and context
 * Processes in batches to avoid timeout
 */
export async function backfillAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const schema = z.object({
      limit: z.number().min(1).max(50).optional().default(10),
      processAll: z.boolean().optional().default(false),
      includeConcepts: z.boolean().optional().default(true),
      includeContext: z.boolean().optional().default(true),
    });
    const { limit, processAll, includeConcepts, includeContext } = schema.parse(req.body);

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    // Query for unprocessed events (or all if processAll)
    const whereClause = processAll
      ? { isPublished: true }
      : {
          isPublished: true,
          OR: [{ whyItMatters: null }, { relatedMilestoneIds: '[]' }],
        };

    const events = await prisma.currentEvent.findMany({
      where: whereClause,
      select: { id: true, headline: true },
      orderBy: { publishedDate: 'desc' },
      take: limit,
    });

    const totalUnprocessed = await prisma.currentEvent.count({ where: whereClause });

    if (events.length === 0) {
      res.json({
        success: true,
        message: 'No events to process',
        data: {
          processed: 0,
          remaining: 0,
          results: [],
        },
      });
      return;
    }

    const results: Array<{
      eventId: string;
      headline: string;
      conceptsLinked?: number;
      milestonesLinked?: number;
      error?: string;
    }> = [];

    for (const event of events) {
      try {
        let conceptsLinked = 0;
        let milestonesLinked = 0;

        if (includeConcepts) {
          const conceptResult = await newsConceptLinker.processNewsEventConcepts(event.id, prisma);
          conceptsLinked = conceptResult.linkedCount;
        }

        if (includeContext) {
          const contextResult = await newsContextGenerator.generateNewsContext(event.id, prisma);
          milestonesLinked = contextResult.relatedMilestones.length;
        }

        results.push({
          eventId: event.id,
          headline: event.headline,
          conceptsLinked,
          milestonesLinked,
        });
      } catch (error) {
        results.push({
          eventId: event.id,
          headline: event.headline,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter((r) => !r.error).length;

    res.json({
      success: true,
      message: `Processed ${successful}/${events.length} events`,
      data: {
        processed: successful,
        remaining: totalUnprocessed - events.length,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/news/batch-process
 * Process multiple news events for concept linking and context generation
 */
export async function batchProcess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const schema = z.object({
      eventIds: z.array(z.string()).min(1).max(20),
      includeConcepts: z.boolean().optional().default(true),
      includeContext: z.boolean().optional().default(true),
    });
    const { eventIds, includeConcepts, includeContext } = schema.parse(req.body);

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    const results: Array<{
      eventId: string;
      conceptsLinked?: number;
      contextGenerated?: boolean;
      error?: string;
    }> = [];

    for (const eventId of eventIds) {
      try {
        let conceptsLinked = 0;
        let contextGenerated = false;

        if (includeConcepts) {
          const conceptResult = await newsConceptLinker.processNewsEventConcepts(eventId, prisma);
          conceptsLinked = conceptResult.linkedCount;
        }

        if (includeContext) {
          await newsContextGenerator.generateNewsContext(eventId, prisma);
          contextGenerated = true;
        }

        results.push({ eventId, conceptsLinked, contextGenerated });
      } catch (error) {
        results.push({
          eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter((r) => !r.error).length;

    res.json({
      success: true,
      message: `Processed ${successful}/${eventIds.length} events`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

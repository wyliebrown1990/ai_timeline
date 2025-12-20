import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/error';
import * as currentEventsService from '../services/currentEvents';

/**
 * GET /api/current-events
 * Retrieve all current events (excluding expired by default)
 */
export async function getAllEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { includeExpired, featured } = req.query;

    const events = await currentEventsService.getAll({
      includeExpired: includeExpired === 'true',
      featured: featured === 'true',
    });

    res.json({ data: events });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/current-events/featured
 * Get featured current events
 */
export async function getFeaturedEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 5));
    const events = await currentEventsService.getFeatured(limit);

    res.json({ data: events });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/current-events/milestone/:milestoneId
 * Get events related to a specific milestone
 */
export async function getEventsForMilestone(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { milestoneId } = req.params;
    const events = await currentEventsService.getForMilestone(milestoneId);

    res.json({ data: events });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/current-events/:id
 * Get a single event by ID
 */
export async function getEventById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const event = await currentEventsService.getById(id);

    if (!event) {
      throw ApiError.notFound(`Event with ID ${id} not found`);
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/current-events
 * Create a new current event (admin only)
 */
export async function createEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      headline,
      summary,
      sourceUrl,
      sourcePublisher,
      publishedDate,
      prerequisiteMilestoneIds,
      connectionExplanation,
      featured,
      expiresAt,
    } = req.body;

    if (!headline || !summary || !publishedDate || !connectionExplanation) {
      throw ApiError.badRequest('Missing required fields: headline, summary, publishedDate, connectionExplanation');
    }

    const event = await currentEventsService.create({
      headline,
      summary,
      sourceUrl,
      sourcePublisher,
      publishedDate,
      prerequisiteMilestoneIds,
      connectionExplanation,
      featured,
      expiresAt,
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/current-events/:id
 * Update an existing event (admin only)
 */
export async function updateEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const event = await currentEventsService.update(id, req.body);

    if (!event) {
      throw ApiError.notFound(`Event with ID ${id} not found`);
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/current-events/:id
 * Delete an event (admin only)
 */
export async function deleteEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await currentEventsService.remove(id);

    if (!deleted) {
      throw ApiError.notFound(`Event with ID ${id} not found`);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/current-events/bulk
 * Bulk create events (for seeding)
 */
export async function bulkCreateEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { events } = req.body;

    if (!Array.isArray(events)) {
      throw ApiError.badRequest('Request body must contain an "events" array');
    }

    const result = await currentEventsService.bulkCreate(events);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

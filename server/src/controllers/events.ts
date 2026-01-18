/**
 * Events Controller
 * Sprint SEO-4 Task 4 - Milestone Event Pages
 *
 * Handles API requests for event pages.
 */

import { Request, Response } from 'express';
import { getEventPageData, getEventList, getEventCount } from '../services/events';

/**
 * GET /api/events/:id
 * Get event page data for a milestone
 */
export async function getEventPage(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const data = await getEventPageData(id);

    if (!data) {
      return res.status(404).json({
        error: 'Event not found',
        id,
      });
    }

    // Add canonical URL
    const canonicalUrl = `https://letaiexplainai.com/events/${data.id}`;

    return res.json({
      ...data,
      canonicalUrl,
    });
  } catch (error) {
    console.error('[EventsController] Error getting event page:', error);
    return res.status(500).json({ error: 'Failed to get event page data' });
  }
}

/**
 * GET /api/events
 * Get list of all events (for hub page and sitemap)
 */
export async function getEventsList(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 100;

    const [events, total] = await Promise.all([
      getEventList(limit),
      getEventCount(),
    ]);

    return res.json({
      count: events.length,
      total,
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date.toISOString().split('T')[0],
        category: e.category,
        significance: e.significance,
        url: `/events/${e.id}`,
        tldr: e.tldr,
        organization: e.organization,
      })),
    });
  } catch (error) {
    console.error('[EventsController] Error getting events list:', error);
    return res.status(500).json({ error: 'Failed to get events list' });
  }
}

import { Router } from 'express';
import * as currentEventsController from '../controllers/currentEvents';
import { requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Current Events API routes (Sprint 37)
 * Public routes: /api/current-events
 * Admin routes: /api/admin/current-events
 */

// Public routes - no authentication required
// GET /api/current-events - List all current events
router.get('/', currentEventsController.getAllEvents);

// GET /api/current-events/featured - Get featured events
router.get('/featured', currentEventsController.getFeaturedEvents);

// GET /api/current-events/milestone/:milestoneId - Get events for a milestone
router.get('/milestone/:milestoneId', currentEventsController.getEventsForMilestone);

// GET /api/current-events/:id - Get single event
router.get('/:id', currentEventsController.getEventById);

export default router;

/**
 * Admin current events routes (require authentication)
 * These are mounted separately on /api/admin/current-events
 */
export const adminRouter = Router();

// POST /api/admin/current-events/bulk - Bulk create events (for seeding)
adminRouter.post('/bulk', requireAdmin, currentEventsController.bulkCreateEvents);

// POST /api/admin/current-events - Create a new event
adminRouter.post('/', requireAdmin, currentEventsController.createEvent);

// PUT /api/admin/current-events/:id - Update an event
adminRouter.put('/:id', requireAdmin, currentEventsController.updateEvent);

// DELETE /api/admin/current-events/:id - Delete an event
adminRouter.delete('/:id', requireAdmin, currentEventsController.deleteEvent);

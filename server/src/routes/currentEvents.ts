import { Router } from 'express';
import * as currentEventsController from '../controllers/currentEvents';
import * as newsLearningController from '../controllers/newsLearning';
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

// News Learning routes (Sprint LEarn-2)
// GET /api/current-events/concepts/:conceptId - Get all news mentioning a concept
router.get('/concepts/:conceptId', newsLearningController.getNewsByConceptId);

// GET /api/current-events/:id/concepts - Get linked concepts for a news event
router.get('/:id/concepts', newsLearningController.getEventConcepts);

// GET /api/current-events/:id/context - Get historical context for a news event
router.get('/:id/context', newsLearningController.getEventContext);

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

// News Learning Admin routes (Sprint LEarn-2)
// POST /api/admin/current-events/backfill - Backfill all unprocessed events
adminRouter.post('/backfill', requireAdmin, newsLearningController.backfillAll);

// POST /api/admin/current-events/batch-process - Batch process events for learning
adminRouter.post('/batch-process', requireAdmin, newsLearningController.batchProcess);

// POST /api/admin/current-events/:id/link-concepts - Auto-detect and link concepts
adminRouter.post('/:id/link-concepts', requireAdmin, newsLearningController.linkConcepts);

// POST /api/admin/current-events/:id/generate-context - Generate "Why it matters" context
adminRouter.post('/:id/generate-context', requireAdmin, newsLearningController.generateContext);

// POST /api/admin/current-events/:id/add-concept - Manually add a concept link
adminRouter.post('/:id/add-concept', requireAdmin, newsLearningController.addConceptLink);

// DELETE /api/admin/current-events/:id/concepts/:conceptId - Remove a concept link
adminRouter.delete('/:id/concepts/:conceptId', requireAdmin, newsLearningController.removeConceptLink);

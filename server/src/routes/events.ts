/**
 * Events Routes
 * Sprint SEO-4 Task 4 - Milestone Event Pages
 *
 * API routes for event page data.
 */

import { Router } from 'express';
import { getEventPage, getEventsList } from '../controllers/events';

const router = Router();

// GET /api/events - List of all events
router.get('/', getEventsList);

// GET /api/events/:id - Specific event page
router.get('/:id', getEventPage);

export default router;

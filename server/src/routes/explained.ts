/**
 * Explained Page Routes
 * Sprint SEO-4 Task 3 - "X Explained" Deep-Dive Pages
 *
 * API routes for explained page data.
 */

import { Router } from 'express';
import { getExplainedPage, getExplainedList } from '../controllers/explained';

const router = Router();

// GET /api/explained - List of all explained pages
router.get('/', getExplainedList);

// GET /api/explained/:slug - Specific explained page
router.get('/:slug', getExplainedPage);

export default router;

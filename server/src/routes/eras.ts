/**
 * Era Routes
 * Sprint SEO-3 Task 7 - Era/Decade Landing Pages
 *
 * Public API routes for era landing page data.
 */

import { Router } from 'express';
import * as erasController from '../controllers/eras';

const router = Router();

/**
 * GET /api/eras
 * Get list of all available eras
 */
router.get('/', erasController.getAllEras);

/**
 * GET /api/eras/:slug
 * Get era page data including milestones, key figures, and key terms
 * Query params:
 *   - milestoneLimit: Max milestones to return (default 20, max 50)
 *   - figureLimit: Max key figures to return (default 12, max 30)
 *   - termLimit: Max key terms to return (default 15, max 30)
 */
router.get('/:slug', erasController.getEraBySlug);

export default router;

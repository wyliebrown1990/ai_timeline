/**
 * Comparison Routes
 * Sprint SEO-4 Task 1 - Comparison Pages Infrastructure
 *
 * API routes for comparison page data.
 */

import { Router } from 'express';
import {
  getComparisonData,
  getComparisonList,
  getComparisonOverview,
} from '../controllers/comparison';

const router = Router();

// GET /api/compare - Overview of all comparison types
router.get('/', getComparisonOverview);

// GET /api/compare/:type - List of comparisons for a type
router.get('/:type', getComparisonList);

// GET /api/compare/:type/:slugA/:slugB - Specific comparison
router.get('/:type/:slugA/:slugB', getComparisonData);

export default router;

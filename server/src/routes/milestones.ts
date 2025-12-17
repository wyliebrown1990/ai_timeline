import { Router } from 'express';
import * as milestonesController from '../controllers/milestones';

const router = Router();

/**
 * Milestone API routes
 * All routes are prefixed with /api/milestones
 *
 * Note: Specific routes (search, filter, tags, category, year) must come
 * BEFORE the :id route to avoid Express matching them as IDs
 */

// GET /api/milestones - List all milestones with pagination
router.get('/', milestonesController.getAllMilestones);

// GET /api/milestones/search - Search milestones by query
router.get('/search', milestonesController.searchMilestones);

// GET /api/milestones/filter - Advanced filtering
router.get('/filter', milestonesController.filterMilestones);

// GET /api/milestones/tags - Get all unique tags
router.get('/tags', milestonesController.getTags);

// GET /api/milestones/category/:category - Filter milestones by category
router.get('/category/:category', milestonesController.getMilestonesByCategory);

// GET /api/milestones/year/:year - Filter milestones by year
router.get('/year/:year', milestonesController.getMilestonesByYear);

// GET /api/milestones/:id - Get a single milestone by ID
router.get('/:id', milestonesController.getMilestoneById);

// POST /api/milestones - Create a new milestone
router.post('/', milestonesController.createMilestone);

// PUT /api/milestones/:id - Update an existing milestone
router.put('/:id', milestonesController.updateMilestone);

// DELETE /api/milestones/:id - Delete a milestone
router.delete('/:id', milestonesController.deleteMilestone);

export default router;

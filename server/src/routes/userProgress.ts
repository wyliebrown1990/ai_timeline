/**
 * User Progress Routes
 *
 * API routes for user learning path and checkpoint progress.
 * All routes are public (session-based, no admin auth required).
 *
 * Sprint 38 - User Data Migration
 */

import { Router } from 'express';
import * as userProgressController from '../controllers/userProgress';

const router = Router();

/**
 * Learning Path Progress Routes
 * All routes mounted under /api/user/:sessionId/paths
 */

// GET /api/user/:sessionId/paths
// Get all path progress for a session
router.get('/:sessionId/paths', userProgressController.getAllPathProgress);

// GET /api/user/:sessionId/paths/:pathSlug
// Get progress for a specific learning path
router.get('/:sessionId/paths/:pathSlug', userProgressController.getPathProgress);

// PUT /api/user/:sessionId/paths/:pathSlug
// Update progress for a learning path
router.put('/:sessionId/paths/:pathSlug', userProgressController.updatePathProgress);

// POST /api/user/:sessionId/paths/:pathSlug/milestones
// Mark a milestone as completed in a path
router.post('/:sessionId/paths/:pathSlug/milestones', userProgressController.completeMilestone);

// DELETE /api/user/:sessionId/paths/:pathSlug
// Reset progress for a learning path
router.delete('/:sessionId/paths/:pathSlug', userProgressController.resetPathProgress);

/**
 * Checkpoint Progress Routes
 * All routes mounted under /api/user/:sessionId/checkpoints
 */

// GET /api/user/:sessionId/checkpoints
// Get all checkpoint progress for a session
router.get('/:sessionId/checkpoints', userProgressController.getAllCheckpointProgress);

// GET /api/user/:sessionId/checkpoints/:checkpointId
// Get progress for a specific checkpoint
router.get('/:sessionId/checkpoints/:checkpointId', userProgressController.getCheckpointProgress);

// POST /api/user/:sessionId/checkpoints/:checkpointId/submit
// Submit answers for a checkpoint quiz
router.post('/:sessionId/checkpoints/:checkpointId/submit', userProgressController.submitCheckpoint);

// DELETE /api/user/:sessionId/checkpoints/:checkpointId
// Reset progress for a checkpoint
router.delete('/:sessionId/checkpoints/:checkpointId', userProgressController.resetCheckpointProgress);

export default router;

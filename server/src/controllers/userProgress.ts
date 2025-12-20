/**
 * User Progress Controller
 *
 * API endpoints for user learning path and checkpoint progress.
 * Handles progress tracking, milestone completion, and checkpoint submissions.
 *
 * Sprint 38 - User Data Migration
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as userProgressService from '../services/userProgress';
import * as userSessionService from '../services/userSession';

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Schema for updating path progress
 */
const UpdatePathProgressSchema = z.object({
  completedMilestoneIds: z.array(z.string()).optional(),
  currentMilestoneId: z.string().nullable().optional(),
  completed: z.boolean().optional(),
});

/**
 * Schema for completing a milestone
 */
const CompleteMilestoneSchema = z.object({
  milestoneId: z.string().min(1, 'milestoneId is required'),
});

/**
 * Schema for submitting checkpoint answers
 */
const SubmitCheckpointSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedAnswer: z.string(),
      isCorrect: z.boolean(),
    })
  ).min(1, 'At least one answer is required'),
});

// =============================================================================
// Path Progress Endpoints
// =============================================================================

/**
 * GET /api/user/:sessionId/paths
 * Get all path progress for a session.
 */
export async function getAllPathProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const progress = await userProgressService.getAllPathProgress(sessionId);

    res.json({ data: progress });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/user/:sessionId/paths/:pathSlug
 * Get progress for a specific learning path.
 */
export async function getPathProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, pathSlug } = req.params;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const progress = await userProgressService.getPathProgress(sessionId, pathSlug);

    if (!progress) {
      // Return empty progress for paths not yet started
      res.json({
        pathSlug,
        completedMilestoneIds: [],
        currentMilestoneId: null,
        startedAt: null,
        completedAt: null,
        percentComplete: 0,
      });
      return;
    }

    res.json(progress);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/user/:sessionId/paths/:pathSlug
 * Update progress for a learning path.
 */
export async function updatePathProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, pathSlug } = req.params;
    const validatedData = UpdatePathProgressSchema.parse(req.body);

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const progress = await userProgressService.updatePathProgress(
      sessionId,
      pathSlug,
      validatedData
    );

    res.json(progress);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0]?.message ?? 'Invalid request data'));
      return;
    }
    next(error);
  }
}

/**
 * POST /api/user/:sessionId/paths/:pathSlug/milestones
 * Mark a milestone as completed in a path.
 */
export async function completeMilestone(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, pathSlug } = req.params;
    const validatedData = CompleteMilestoneSchema.parse(req.body);

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const progress = await userProgressService.completeMilestone(
      sessionId,
      pathSlug,
      validatedData.milestoneId
    );

    res.json(progress);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0]?.message ?? 'Invalid request data'));
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/user/:sessionId/paths/:pathSlug
 * Reset progress for a learning path.
 */
export async function resetPathProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, pathSlug } = req.params;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const deleted = await userProgressService.resetPathProgress(sessionId, pathSlug);

    if (!deleted) {
      throw ApiError.notFound(`Path progress for ${pathSlug} not found`);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Checkpoint Progress Endpoints
// =============================================================================

/**
 * GET /api/user/:sessionId/checkpoints
 * Get all checkpoint progress for a session.
 */
export async function getAllCheckpointProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const progress = await userProgressService.getAllCheckpointProgress(sessionId);

    res.json({ data: progress });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/user/:sessionId/checkpoints/:checkpointId
 * Get progress for a specific checkpoint.
 */
export async function getCheckpointProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, checkpointId } = req.params;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const progress = await userProgressService.getCheckpointProgress(
      sessionId,
      checkpointId
    );

    if (!progress) {
      // Return empty progress for checkpoints not yet attempted
      res.json({
        checkpointId,
        completed: false,
        score: null,
        attempts: 0,
        lastAttemptAt: null,
        answers: [],
      });
      return;
    }

    res.json(progress);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/user/:sessionId/checkpoints/:checkpointId/submit
 * Submit answers for a checkpoint quiz.
 */
export async function submitCheckpoint(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, checkpointId } = req.params;
    const validatedData = SubmitCheckpointSchema.parse(req.body);

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const progress = await userProgressService.submitCheckpoint(
      sessionId,
      checkpointId,
      validatedData.answers
    );

    res.json({
      ...progress,
      passed: progress.completed,
      message: progress.completed
        ? 'Congratulations! You passed the checkpoint.'
        : 'Keep studying and try again!',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0]?.message ?? 'Invalid request data'));
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/user/:sessionId/checkpoints/:checkpointId
 * Reset progress for a checkpoint.
 */
export async function resetCheckpointProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId, checkpointId } = req.params;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const deleted = await userProgressService.resetCheckpointProgress(
      sessionId,
      checkpointId
    );

    if (!deleted) {
      throw ApiError.notFound(`Checkpoint progress for ${checkpointId} not found`);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

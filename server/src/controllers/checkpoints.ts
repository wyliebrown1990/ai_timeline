import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/error';
import * as checkpointsService from '../services/checkpoints';

/**
 * GET /api/checkpoints/path/:pathSlug
 * Get checkpoints for a learning path
 */
export async function getCheckpointsForPath(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pathSlug } = req.params;
    const checkpoints = await checkpointsService.getForPath(pathSlug);

    res.json({ data: checkpoints });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/checkpoints/:id
 * Get a single checkpoint by ID
 */
export async function getCheckpointById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const checkpoint = await checkpointsService.getById(id);

    if (!checkpoint) {
      throw ApiError.notFound(`Checkpoint with ID ${id} not found`);
    }

    res.json(checkpoint);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/checkpoints
 * Create a new checkpoint (admin only)
 */
export async function createCheckpoint(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, pathSlug, afterMilestoneId, questions, sortOrder } = req.body;

    if (!title || !pathSlug || !afterMilestoneId) {
      throw ApiError.badRequest('Missing required fields: title, pathSlug, afterMilestoneId');
    }

    const checkpoint = await checkpointsService.create({
      title,
      pathSlug,
      afterMilestoneId,
      questions,
      sortOrder,
    });

    if (!checkpoint) {
      throw ApiError.notFound(`Learning path "${pathSlug}" not found`);
    }

    res.status(201).json(checkpoint);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/checkpoints/:id
 * Update an existing checkpoint (admin only)
 */
export async function updateCheckpoint(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const checkpoint = await checkpointsService.update(id, req.body);

    if (!checkpoint) {
      throw ApiError.notFound(`Checkpoint with ID ${id} not found`);
    }

    res.json(checkpoint);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/checkpoints/:id
 * Delete a checkpoint (admin only)
 */
export async function deleteCheckpoint(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await checkpointsService.remove(id);

    if (!deleted) {
      throw ApiError.notFound(`Checkpoint with ID ${id} not found`);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/checkpoints/bulk
 * Bulk create checkpoints (for seeding)
 */
export async function bulkCreateCheckpoints(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { checkpoints } = req.body;

    if (!Array.isArray(checkpoints)) {
      throw ApiError.badRequest('Request body must contain a "checkpoints" array');
    }

    const result = await checkpointsService.bulkCreate(checkpoints);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/error';
import * as learningPathsService from '../services/learningPaths';

/**
 * GET /api/learning-paths
 * Retrieve all learning paths with optional filtering
 */
export async function getAllPaths(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { difficulty, published } = req.query;

    const paths = await learningPathsService.getAll({
      difficulty: difficulty as string | undefined,
      includeUnpublished: published === 'false',
    });

    res.json({ data: paths });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/learning-paths/:slug
 * Retrieve a single learning path by slug with checkpoints
 */
export async function getPathBySlug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const path = await learningPathsService.getBySlug(slug);

    if (!path) {
      throw ApiError.notFound(`Learning path "${slug}" not found`);
    }

    res.json(path);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/learning-paths/difficulty/:difficulty
 * Filter learning paths by difficulty level
 */
export async function getPathsByDifficulty(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { difficulty } = req.params;

    if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
      throw ApiError.badRequest('Difficulty must be: beginner, intermediate, or advanced');
    }

    const paths = await learningPathsService.getByDifficulty(difficulty);

    res.json({ data: paths });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/learning-paths
 * Create a new learning path (admin only)
 */
export async function createPath(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      slug,
      title,
      description,
      targetAudience,
      milestoneIds,
      estimatedMinutes,
      difficulty,
      suggestedNextPathIds,
      keyTakeaways,
      conceptsCovered,
      icon,
      sortOrder,
    } = req.body;

    if (!slug || !title || !description || !targetAudience || !estimatedMinutes || !difficulty) {
      throw ApiError.badRequest('Missing required fields: slug, title, description, targetAudience, estimatedMinutes, difficulty');
    }

    const path = await learningPathsService.create({
      slug,
      title,
      description,
      targetAudience,
      milestoneIds,
      estimatedMinutes,
      difficulty,
      suggestedNextPathIds,
      keyTakeaways,
      conceptsCovered,
      icon,
      sortOrder,
    });

    res.status(201).json(path);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/learning-paths/:slug
 * Update an existing learning path (admin only)
 */
export async function updatePath(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const path = await learningPathsService.update(slug, req.body);

    if (!path) {
      throw ApiError.notFound(`Learning path "${slug}" not found`);
    }

    res.json(path);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/learning-paths/:slug
 * Delete a learning path (admin only)
 */
export async function deletePath(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const deleted = await learningPathsService.remove(slug);

    if (!deleted) {
      throw ApiError.notFound(`Learning path "${slug}" not found`);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/learning-paths/bulk
 * Bulk create/update learning paths (for seeding)
 */
export async function bulkCreatePaths(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { paths } = req.body;

    if (!Array.isArray(paths)) {
      throw ApiError.badRequest('Request body must contain a "paths" array');
    }

    const result = await learningPathsService.bulkCreate(paths);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

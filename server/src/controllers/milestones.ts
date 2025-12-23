import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/error';
import * as milestonesService from '../services/milestones';
import {
  CreateMilestoneDtoSchema,
  UpdateMilestoneDtoSchema,
  MilestoneCategorySchema,
} from '../../../src/types/milestone';
import type { MilestoneCategory } from '../../../src/types/milestone';
import type { FilterOptions } from '../services/milestones';

/**
 * GET /api/milestones
 * Retrieve all milestones with optional pagination
 * Query params:
 *   - page: Page number (default 1)
 *   - limit: Items per page (default 50, max 100)
 *   - includeContributors: Include linked key figures (Sprint 47)
 */
export async function getAllMilestones(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;
    const includeContributors = req.query.includeContributors === 'true';

    const { milestones, total } = await milestonesService.getAll({
      skip,
      limit,
      includeContributors,
    });

    res.json({
      data: milestones,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/milestones/:id
 * Retrieve a single milestone by ID
 */
export async function getMilestoneById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const milestone = await milestonesService.getById(id);

    if (!milestone) {
      throw ApiError.notFound(`Milestone with ID ${id} not found`);
    }

    res.json(milestone);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/milestones
 * Create a new milestone
 */
export async function createMilestone(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = CreateMilestoneDtoSchema.parse(req.body);
    const milestone = await milestonesService.create(validatedData);

    res.status(201).json(milestone);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/milestones/:id
 * Update an existing milestone
 */
export async function updateMilestone(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const validatedData = UpdateMilestoneDtoSchema.parse(req.body);
    const milestone = await milestonesService.update(id, validatedData);

    if (!milestone) {
      throw ApiError.notFound(`Milestone with ID ${id} not found`);
    }

    res.json(milestone);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/milestones/:id
 * Delete a milestone by ID
 */
export async function deleteMilestone(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await milestonesService.remove(id);

    if (!deleted) {
      throw ApiError.notFound(`Milestone with ID ${id} not found`);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/milestones/category/:category
 * Filter milestones by category
 */
export async function getMilestonesByCategory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { category } = req.params;
    const validatedCategory = MilestoneCategorySchema.parse(category);

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const { milestones, total } = await milestonesService.getByCategory(validatedCategory, {
      skip,
      limit,
    });

    res.json({
      data: milestones,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/milestones/year/:year
 * Filter milestones by year
 */
export async function getMilestonesByYear(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const year = parseInt(req.params.year);

    if (isNaN(year) || year < 1900 || year > 2100) {
      throw ApiError.badRequest('Year must be a valid number between 1900 and 2100');
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const { milestones, total } = await milestonesService.getByYear(year, { skip, limit });

    res.json({
      data: milestones,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/milestones/search
 * Search milestones by query string across title, description, organization, tags, contributors
 */
export async function searchMilestones(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = (req.query.q as string) || '';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const { results, total } = await milestonesService.search({ query, skip, limit });

    res.json({
      data: results,
      query,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/milestones/filter
 * Advanced filtering by categories, significance levels, date range, and tags
 * Query params:
 *   - categories: Comma-separated categories (model,benchmark,application)
 *   - significance: Comma-separated levels (1,2,3,4)
 *   - dateStart/dateEnd: ISO date strings
 *   - tags: Comma-separated tags
 *   - includeContributors: Include linked key figures (Sprint 47)
 */
export async function filterMilestones(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;
    const includeContributors = req.query.includeContributors === 'true';

    // Parse filter options from query parameters
    const filters: FilterOptions = {};

    // Categories: ?categories=model,benchmark,application
    if (req.query.categories) {
      const categoryStrings = (req.query.categories as string).split(',');
      const validCategories: typeof MilestoneCategory[keyof typeof MilestoneCategory][] = [];

      for (const cat of categoryStrings) {
        try {
          const validated = MilestoneCategorySchema.parse(cat.trim());
          validCategories.push(validated);
        } catch {
          // Skip invalid categories
        }
      }

      if (validCategories.length > 0) {
        filters.categories = validCategories;
      }
    }

    // Significance levels: ?significance=1,2,3
    if (req.query.significance) {
      const levels = (req.query.significance as string)
        .split(',')
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n) && n >= 1 && n <= 4);

      if (levels.length > 0) {
        filters.significanceLevels = levels;
      }
    }

    // Date range: ?dateStart=2020-01-01&dateEnd=2023-12-31
    if (req.query.dateStart) {
      const startDate = new Date(req.query.dateStart as string);
      if (!isNaN(startDate.getTime())) {
        filters.dateStart = startDate;
      }
    }

    if (req.query.dateEnd) {
      const endDate = new Date(req.query.dateEnd as string);
      if (!isNaN(endDate.getTime())) {
        filters.dateEnd = endDate;
      }
    }

    // Tags: ?tags=transformer,nlp,vision
    if (req.query.tags) {
      const tags = (req.query.tags as string)
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (tags.length > 0) {
        filters.tags = tags;
      }
    }

    const { milestones, total } = await milestonesService.getFiltered(filters, {
      skip,
      limit,
      includeContributors,
    });

    res.json({
      data: milestones,
      filters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/milestones/tags
 * Get all unique tags with their counts
 */
export async function getTags(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tags = await milestonesService.getAllTags();
    res.json({ data: tags });
  } catch (error) {
    next(error);
  }
}

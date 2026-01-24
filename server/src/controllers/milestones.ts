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
 *   - limit: Items per page (default 50, max 500)
 *   - includeContributors: Include linked key figures (Sprint 47)
 */
export async function getAllMilestones(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));
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
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));
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
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));
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
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));
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

    // Subject filter: ?subject=science-cs-nlp&includeSubjectChildren=true
    if (req.query.subject) {
      filters.subjectSlug = req.query.subject as string;
      filters.includeSubjectChildren = req.query.includeSubjectChildren === 'true';
    }

    // Organization filter: ?organization=openai (Sprint TD-2: SEO landing pages)
    if (req.query.organization) {
      filters.organization = req.query.organization as string;
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

// =============================================================================
// Sprint KPC-3: Contributor Management Endpoints
// =============================================================================

/**
 * GET /api/milestones/:id/contributors
 * Get linked person contributors for a milestone
 */
export async function getContributors(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Check if milestone exists
    const milestone = await milestonesService.getById(id);
    if (!milestone) {
      throw ApiError.notFound(`Milestone with ID ${id} not found`);
    }

    const contributors = await milestonesService.getContributors(id);
    res.json({ data: contributors });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/milestones/:id/contributors
 * Add a person as a contributor to a milestone
 */
export async function addContributor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { personId, contributionType } = req.body;

    if (!personId) {
      throw ApiError.badRequest('personId is required');
    }

    // Check if milestone exists
    const milestone = await milestonesService.getById(id);
    if (!milestone) {
      throw ApiError.notFound(`Milestone with ID ${id} not found`);
    }

    const result = await milestonesService.addContributor(
      id,
      personId,
      contributionType || 'mentioned'
    );

    if (!result.success) {
      throw ApiError.badRequest(result.error || 'Failed to add contributor');
    }

    // Return updated contributor list
    const contributors = await milestonesService.getContributors(id);
    res.status(201).json({ data: contributors });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/milestones/:id/contributors/:personId
 * Remove a person contributor from a milestone
 */
export async function removeContributor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, personId } = req.params;

    // Check if milestone exists
    const milestone = await milestonesService.getById(id);
    if (!milestone) {
      throw ApiError.notFound(`Milestone with ID ${id} not found`);
    }

    const result = await milestonesService.removeContributor(id, personId);

    if (!result.success) {
      throw ApiError.notFound(result.error || 'Contributor not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/milestones/:id/with-contributors
 * Get milestone with linked contributors (for admin edit page)
 */
export async function getMilestoneWithContributors(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const milestone = await milestonesService.getByIdWithContributors(id);

    if (!milestone) {
      throw ApiError.notFound(`Milestone with ID ${id} not found`);
    }

    res.json(milestone);
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Sprint SEO-3: Linked Glossary Terms Management
// =============================================================================

/**
 * GET /api/milestones/:id/linked-terms
 * Get glossary terms linked to a milestone
 */
export async function getLinkedTerms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Check if milestone exists
    const milestone = await milestonesService.getById(id);
    if (!milestone) {
      throw ApiError.notFound(`Milestone with ID ${id} not found`);
    }

    const linkedTerms = await milestonesService.getLinkedTerms(id);
    res.json({ data: linkedTerms });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/milestones/:id/linked-terms
 * Add a glossary term link to a milestone
 */
export async function addLinkedTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { glossaryTermId, relevanceNote } = req.body;

    if (!glossaryTermId) {
      throw ApiError.badRequest('glossaryTermId is required');
    }

    // Check if milestone exists
    const milestone = await milestonesService.getById(id);
    if (!milestone) {
      throw ApiError.notFound(`Milestone with ID ${id} not found`);
    }

    const result = await milestonesService.addLinkedTerm(
      id,
      glossaryTermId,
      relevanceNote || null
    );

    if (!result.success) {
      throw ApiError.badRequest(result.error || 'Failed to add linked term');
    }

    // Return updated linked terms list
    const linkedTerms = await milestonesService.getLinkedTerms(id);
    res.status(201).json({ data: linkedTerms });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/milestones/:id/linked-terms/:termId
 * Remove a glossary term link from a milestone
 */
export async function removeLinkedTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, termId } = req.params;

    // Check if milestone exists
    const milestone = await milestonesService.getById(id);
    if (!milestone) {
      throw ApiError.notFound(`Milestone with ID ${id} not found`);
    }

    const result = await milestonesService.removeLinkedTerm(id, termId);

    if (!result.success) {
      throw ApiError.notFound(result.error || 'Linked term not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/milestones/export
 * Export all milestones as JSON or CSV
 * Query params:
 *   - format: 'json' (default) or 'csv'
 * Sprint TD-4: Linkable Assets
 */
export async function exportMilestones(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const format = (req.query.format as string)?.toLowerCase() || 'json';

    // Get all milestones without pagination
    const { milestones } = await milestonesService.getAll({
      skip: 0,
      limit: 10000, // Get all
      includeContributors: false,
    });

    // Transform data for export (cleaner format)
    const exportData = milestones.map((m) => ({
      id: m.id,
      title: m.title,
      date: m.date,
      category: m.category,
      significance: m.significance,
      description: m.description,
      organization: m.organization,
      tags: Array.isArray(m.tags) ? m.tags : JSON.parse(m.tags as string || '[]'),
      sourceUrl: m.sourceUrl,
      tldr: m.tldr,
    }));

    if (format === 'csv') {
      // Generate CSV
      const headers = ['id', 'title', 'date', 'category', 'significance', 'description', 'organization', 'tags', 'sourceUrl'];
      const csvRows = [headers.join(',')];

      for (const m of exportData) {
        const row = [
          `"${m.id}"`,
          `"${(m.title || '').replace(/"/g, '""')}"`,
          `"${m.date}"`,
          `"${m.category}"`,
          m.significance,
          `"${(m.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${(m.organization || '').replace(/"/g, '""')}"`,
          `"${Array.isArray(m.tags) ? m.tags.join(';') : ''}"`,
          `"${m.sourceUrl || ''}"`,
        ];
        csvRows.push(row.join(','));
      }

      const csv = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=ai-timeline-data.csv');
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=ai-timeline-data.json');
      res.json({
        metadata: {
          source: 'Let AI Explain AI (letaiexplainai.com)',
          exportDate: new Date().toISOString(),
          totalMilestones: exportData.length,
          license: 'CC BY 4.0 - Attribution required',
          licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        },
        data: exportData,
      });
    }
  } catch (error) {
    next(error);
  }
}

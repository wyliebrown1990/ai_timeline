import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as glossaryService from '../services/glossary';

/**
 * Valid glossary categories
 */
const GlossaryCategoryEnum = z.enum([
  'core_concept',
  'technical_term',
  'business_term',
  'model_architecture',
  'company_product',
]);

/**
 * Zod schema for creating a glossary term
 */
const CreateGlossaryTermSchema = z.object({
  term: z.string().min(1).max(100),
  shortDefinition: z.string().min(1).max(200),
  fullDefinition: z.string().min(1).max(2000),
  businessContext: z.string().max(1000).optional(),
  example: z.string().max(1000).optional(),
  inMeetingExample: z.string().max(1000).optional(),
  category: GlossaryCategoryEnum,
  relatedTermIds: z.array(z.string()).optional().default([]),
  relatedMilestoneIds: z.array(z.string()).optional().default([]),
  sourceArticleId: z.string().optional(),
});

/**
 * Zod schema for updating a glossary term
 */
const UpdateGlossaryTermSchema = z.object({
  term: z.string().min(1).max(100).optional(),
  shortDefinition: z.string().min(1).max(200).optional(),
  fullDefinition: z.string().min(1).max(2000).optional(),
  businessContext: z.string().max(1000).nullable().optional(),
  example: z.string().max(1000).nullable().optional(),
  inMeetingExample: z.string().max(1000).nullable().optional(),
  category: GlossaryCategoryEnum.optional(),
  relatedTermIds: z.array(z.string()).optional(),
  relatedMilestoneIds: z.array(z.string()).optional(),
});

/**
 * Helper to transform DB term to API response format
 * Parses JSON arrays back to actual arrays
 */
function transformTerm(term: {
  id: string;
  term: string;
  shortDefinition: string;
  fullDefinition: string;
  businessContext: string | null;
  example: string | null;
  inMeetingExample: string | null;
  category: string;
  relatedTermIds: string;
  relatedMilestoneIds: string;
  createdAt: Date;
  updatedAt: Date;
  sourceArticleId: string | null;
}) {
  return {
    id: term.id,
    term: term.term,
    shortDefinition: term.shortDefinition,
    fullDefinition: term.fullDefinition,
    businessContext: term.businessContext,
    example: term.example,
    inMeetingExample: term.inMeetingExample,
    category: term.category,
    relatedTermIds: JSON.parse(term.relatedTermIds) as string[],
    relatedMilestoneIds: JSON.parse(term.relatedMilestoneIds) as string[],
    createdAt: term.createdAt.toISOString(),
    updatedAt: term.updatedAt.toISOString(),
    sourceArticleId: term.sourceArticleId,
  };
}

/**
 * GET /api/glossary
 * Retrieve all glossary terms (public endpoint)
 */
export async function getAllTerms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { category, search, page, limit } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 100;
    const skip = (pageNum - 1) * limitNum;

    const { terms, total } = await glossaryService.getAll({
      category: category as glossaryService.GlossaryCategory | undefined,
      search: search as string | undefined,
      skip,
      limit: limitNum,
    });

    res.json({
      data: terms.map(transformTerm),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/glossary/:id
 * Retrieve a single glossary term (public endpoint)
 */
export async function getTermById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const term = await glossaryService.getById(id);

    if (!term) {
      throw ApiError.notFound(`Glossary term with ID ${id} not found`);
    }

    res.json(transformTerm(term));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/glossary/term/:termName
 * Retrieve a glossary term by name (public endpoint)
 */
export async function getTermByName(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { termName } = req.params;
    const term = await glossaryService.getByTerm(decodeURIComponent(termName));

    if (!term) {
      throw ApiError.notFound(`Glossary term "${termName}" not found`);
    }

    res.json(transformTerm(term));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/glossary/search
 * Search glossary terms (public endpoint)
 */
export async function searchTerms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string') {
      throw ApiError.badRequest('Query parameter "q" is required');
    }

    const limitNum = parseInt(limit as string, 10) || 20;
    const terms = await glossaryService.search(q, limitNum);

    res.json({
      data: terms.map(transformTerm),
      total: terms.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/glossary
 * Create a new glossary term (admin only)
 */
export async function createTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = CreateGlossaryTermSchema.parse(req.body);

    // Check if term already exists
    const exists = await glossaryService.termExists(validatedData.term);
    if (exists) {
      throw ApiError.badRequest(`Glossary term "${validatedData.term}" already exists`);
    }

    const term = await glossaryService.create(validatedData);
    res.status(201).json(transformTerm(term));
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/glossary/:id
 * Update an existing glossary term (admin only)
 */
export async function updateTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const validatedData = UpdateGlossaryTermSchema.parse(req.body);

    // Check if term exists
    const existing = await glossaryService.getById(id);
    if (!existing) {
      throw ApiError.notFound(`Glossary term with ID ${id} not found`);
    }

    // If updating term name, check for duplicates
    if (validatedData.term && validatedData.term !== existing.term) {
      const duplicate = await glossaryService.termExists(validatedData.term);
      if (duplicate) {
        throw ApiError.badRequest(`Glossary term "${validatedData.term}" already exists`);
      }
    }

    const term = await glossaryService.update(id, validatedData);
    if (!term) {
      throw ApiError.internal('Failed to update glossary term');
    }

    res.json(transformTerm(term));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/glossary/:id
 * Delete a glossary term (admin only)
 */
export async function deleteTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Check if term exists
    const existing = await glossaryService.getById(id);
    if (!existing) {
      throw ApiError.notFound(`Glossary term with ID ${id} not found`);
    }

    const success = await glossaryService.remove(id);
    if (!success) {
      throw ApiError.internal('Failed to delete glossary term');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/glossary/stats
 * Get glossary statistics (admin only)
 */
export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [total, countByCategory] = await Promise.all([
      glossaryService.getCount(),
      glossaryService.getCountByCategory(),
    ]);

    res.json({
      total,
      byCategory: countByCategory,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/glossary/bulk
 * Bulk create glossary terms (admin only, for migration)
 */
export async function bulkCreateTerms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { terms } = req.body;

    if (!Array.isArray(terms)) {
      throw ApiError.badRequest('Request body must contain a "terms" array');
    }

    // Validate each term
    const validatedTerms = terms.map((term, index) => {
      try {
        return CreateGlossaryTermSchema.parse(term);
      } catch (error) {
        throw ApiError.badRequest(`Invalid term at index ${index}: ${error}`);
      }
    });

    const result = await glossaryService.createBulk(validatedTerms);

    res.status(201).json({
      message: `Created ${result.created} terms, skipped ${result.skipped}`,
      created: result.created,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    next(error);
  }
}

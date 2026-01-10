/**
 * Key Figures Controller
 * Sprint 45 - Key Figures API & Admin CRUD
 *
 * Handles HTTP requests for key figure management.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as keyFiguresService from '../services/keyFigures';

/**
 * Valid key figure roles
 */
const KeyFigureRoleEnum = z.enum([
  'researcher',
  'executive',
  'founder',
  'policy_maker',
  'engineer',
  'other',
]);

/**
 * Valid key figure statuses
 */
const KeyFigureStatusEnum = z.enum(['draft', 'pending_review', 'published']);

/**
 * Valid contribution types
 */
const ContributionTypeEnum = z.enum(['lead', 'co_author', 'advisor', 'founder', 'mentioned']);

/**
 * Zod schema for creating a key figure
 */
const CreateKeyFigureSchema = z.object({
  canonicalName: z.string().min(2).max(100),
  aliases: z.array(z.string()).optional().default([]),
  shortBio: z.string().min(1).max(500),
  fullBio: z.string().max(5000).optional(),
  primaryOrg: z.string().max(100).optional(),
  previousOrgs: z.array(z.string()).optional().default([]),
  role: KeyFigureRoleEnum,
  notableFor: z.string().min(1).max(500),
  imageUrl: z.string().url().optional().or(z.literal('')),
  wikipediaUrl: z.string().url().optional().or(z.literal('')),
  linkedInUrl: z.string().url().optional().or(z.literal('')),
  twitterHandle: z.string().max(50).optional(),
  status: KeyFigureStatusEnum.optional().default('published'),
});

/**
 * Zod schema for updating a key figure
 */
const UpdateKeyFigureSchema = z.object({
  canonicalName: z.string().min(2).max(100).optional(),
  aliases: z.array(z.string()).optional(),
  shortBio: z.string().min(1).max(500).optional(),
  fullBio: z.string().max(5000).nullable().optional(),
  primaryOrg: z.string().max(100).nullable().optional(),
  previousOrgs: z.array(z.string()).optional(),
  role: KeyFigureRoleEnum.optional(),
  notableFor: z.string().min(1).max(500).optional(),
  imageUrl: z.string().url().nullable().optional().or(z.literal('')),
  wikipediaUrl: z.string().url().nullable().optional().or(z.literal('')),
  linkedInUrl: z.string().url().nullable().optional().or(z.literal('')),
  twitterHandle: z.string().max(50).nullable().optional(),
  status: KeyFigureStatusEnum.optional(),
});

/**
 * Helper to transform DB key figure to API response format
 * Parses JSON arrays back to actual arrays
 */
function transformKeyFigure(keyFigure: {
  id: string;
  canonicalName: string;
  aliases: string;
  shortBio: string;
  fullBio: string | null;
  primaryOrg: string | null;
  previousOrgs: string;
  role: string;
  notableFor: string;
  imageUrl: string | null;
  wikipediaUrl: string | null;
  linkedInUrl: string | null;
  twitterHandle: string | null;
  status: string;
  sourceArticleId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: keyFigure.id,
    canonicalName: keyFigure.canonicalName,
    aliases: JSON.parse(keyFigure.aliases) as string[],
    shortBio: keyFigure.shortBio,
    fullBio: keyFigure.fullBio,
    primaryOrg: keyFigure.primaryOrg,
    previousOrgs: JSON.parse(keyFigure.previousOrgs) as string[],
    role: keyFigure.role,
    notableFor: keyFigure.notableFor,
    imageUrl: keyFigure.imageUrl,
    wikipediaUrl: keyFigure.wikipediaUrl,
    linkedInUrl: keyFigure.linkedInUrl,
    twitterHandle: keyFigure.twitterHandle,
    status: keyFigure.status,
    sourceArticleId: keyFigure.sourceArticleId,
    createdAt: keyFigure.createdAt.toISOString(),
    updatedAt: keyFigure.updatedAt.toISOString(),
  };
}

/**
 * GET /api/key-figures
 * List key figures with optional filters and pagination (public endpoint)
 */
export async function listKeyFigures(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { status, role, search, page, limit } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
    const skip = (pageNum - 1) * limitNum;

    const { keyFigures, total } = await keyFiguresService.getAll({
      status: status as keyFiguresService.KeyFigureStatus | undefined,
      role: role as keyFiguresService.KeyFigureRole | undefined,
      search: search as string | undefined,
      skip,
      limit: limitNum,
    });

    res.json({
      data: keyFigures.map(transformKeyFigure),
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
 * GET /api/key-figures/search
 * Quick search for autocomplete (public endpoint)
 */
export async function searchKeyFigures(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string') {
      throw ApiError.badRequest('Query parameter "q" is required');
    }

    const limitNum = Math.min(parseInt(limit as string, 10) || 10, 20);
    const keyFigures = await keyFiguresService.search(q, limitNum);

    res.json({
      data: keyFigures.map(transformKeyFigure),
      total: keyFigures.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/key-figures/:id
 * Get a single key figure by ID (public endpoint)
 */
export async function getKeyFigure(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const keyFigure = await keyFiguresService.getById(id);

    if (!keyFigure) {
      throw ApiError.notFound(`Key figure with ID "${id}" not found`);
    }

    res.json(transformKeyFigure(keyFigure));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/key-figures/:id/milestones
 * Get milestones associated with a key figure (public endpoint)
 */
export async function getKeyFigureMilestones(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Verify key figure exists
    const keyFigure = await keyFiguresService.getById(id);
    if (!keyFigure) {
      throw ApiError.notFound(`Key figure with ID "${id}" not found`);
    }

    const milestones = await keyFiguresService.getMilestones(id);

    res.json({
      data: milestones.map((m) => ({
        milestone: {
          id: m.milestone.id,
          title: m.milestone.title,
          description: m.milestone.description,
          date: m.milestone.date.toISOString(),
          category: m.milestone.category,
          significance: m.milestone.significance,
          organization: m.milestone.organization,
        },
        contributionType: m.contributionType,
      })),
      total: milestones.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/key-figures
 * Create a new key figure (admin only)
 */
export async function createKeyFigure(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = CreateKeyFigureSchema.parse(req.body);

    // Clean up empty strings to null for optional URL fields
    const cleanData = {
      ...validatedData,
      imageUrl: validatedData.imageUrl || undefined,
      wikipediaUrl: validatedData.wikipediaUrl || undefined,
      linkedInUrl: validatedData.linkedInUrl || undefined,
    };

    // Check if canonical name already exists
    const nameExists = await keyFiguresService.nameExists(cleanData.canonicalName);
    if (nameExists) {
      throw ApiError.badRequest(`Key figure "${cleanData.canonicalName}" already exists`);
    }

    // Check if generated ID already exists
    const generatedId = keyFiguresService.getIdFromName(cleanData.canonicalName);
    const idExists = await keyFiguresService.idExists(generatedId);
    if (idExists) {
      throw ApiError.badRequest(`A key figure with ID "${generatedId}" already exists`);
    }

    const keyFigure = await keyFiguresService.create(cleanData);
    res.status(201).json(transformKeyFigure(keyFigure));
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/key-figures/:id
 * Update an existing key figure (admin only)
 */
export async function updateKeyFigure(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const validatedData = UpdateKeyFigureSchema.parse(req.body);

    // Check if key figure exists
    const existing = await keyFiguresService.getById(id);
    if (!existing) {
      throw ApiError.notFound(`Key figure with ID "${id}" not found`);
    }

    // If updating canonical name, check for duplicates
    if (validatedData.canonicalName && validatedData.canonicalName !== existing.canonicalName) {
      const duplicate = await keyFiguresService.nameExists(validatedData.canonicalName);
      if (duplicate) {
        throw ApiError.badRequest(`Key figure "${validatedData.canonicalName}" already exists`);
      }
    }

    // Clean up empty strings to null for optional URL fields
    const cleanData = {
      ...validatedData,
      imageUrl: validatedData.imageUrl === '' ? null : validatedData.imageUrl,
      wikipediaUrl: validatedData.wikipediaUrl === '' ? null : validatedData.wikipediaUrl,
      linkedInUrl: validatedData.linkedInUrl === '' ? null : validatedData.linkedInUrl,
    };

    const keyFigure = await keyFiguresService.update(id, cleanData);
    if (!keyFigure) {
      throw ApiError.internal('Failed to update key figure');
    }

    res.json(transformKeyFigure(keyFigure));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/key-figures/:id
 * Delete a key figure (admin only)
 */
export async function deleteKeyFigure(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Check if key figure exists
    const existing = await keyFiguresService.getById(id);
    if (!existing) {
      throw ApiError.notFound(`Key figure with ID "${id}" not found`);
    }

    const success = await keyFiguresService.remove(id);
    if (!success) {
      throw ApiError.internal('Failed to delete key figure');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/key-figures/stats
 * Get key figures statistics (admin only)
 */
export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [total, byRole, byStatus] = await Promise.all([
      keyFiguresService.getCount(),
      keyFiguresService.getCountByRole(),
      keyFiguresService.getCountByStatus(),
    ]);

    res.json({
      total,
      byRole,
      byStatus,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/key-figures/generate-variants
 * Generate common name variants for a name (admin utility)
 */
export async function generateVariants(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      throw ApiError.badRequest('Name is required');
    }

    const variants = keyFiguresService.getNameVariants(name);
    const id = keyFiguresService.getIdFromName(name);

    res.json({
      id,
      variants,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/milestones/:id/contributors
 * Get contributors for a milestone (public endpoint)
 */
export async function getMilestoneContributors(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const contributors = await keyFiguresService.getMilestoneContributors(id);

    res.json({
      data: contributors.map((c) => ({
        keyFigure: transformKeyFigure(c.keyFigure),
        contributionType: c.contributionType,
      })),
      total: contributors.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/milestones/:id/contributors
 * Add a contributor to a milestone (admin only)
 */
export async function addMilestoneContributor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id: milestoneId } = req.params;
    const schema = z.object({
      keyFigureId: z.string(),
      contributionType: ContributionTypeEnum.optional(),
    });

    const { keyFigureId, contributionType } = schema.parse(req.body);

    // Verify key figure exists
    const keyFigure = await keyFiguresService.getById(keyFigureId);
    if (!keyFigure) {
      throw ApiError.notFound(`Key figure with ID "${keyFigureId}" not found`);
    }

    const contributor = await keyFiguresService.addMilestoneContributor(
      milestoneId,
      keyFigureId,
      contributionType
    );

    res.status(201).json({
      id: contributor.id,
      milestoneId: contributor.milestoneId,
      keyFigureId: contributor.keyFigureId,
      contributionType: contributor.contributionType,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/milestones/:id/contributors/:keyFigureId
 * Remove a contributor from a milestone (admin only)
 */
export async function removeMilestoneContributor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id: milestoneId, keyFigureId } = req.params;

    const success = await keyFiguresService.removeMilestoneContributor(milestoneId, keyFigureId);
    if (!success) {
      throw ApiError.notFound('Contributor relationship not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Zod schema for merge request
 */
const MergeKeyFiguresSchema = z.object({
  primaryId: z.string().min(1, 'Primary key figure ID is required'),
  secondaryIds: z.array(z.string()).min(1, 'At least one secondary key figure is required'),
});

/**
 * POST /api/admin/key-figures/merge
 * Merge multiple key figures into a primary record (admin only)
 *
 * This operation:
 * - Combines aliases from all records into the primary
 * - Reassigns MilestoneContributor records from secondary to primary
 * - Deletes the secondary KeyFigure records
 */
export async function mergeKeyFigures(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = MergeKeyFiguresSchema.parse(req.body);
    const { primaryId, secondaryIds } = validatedData;

    // Perform the merge
    const result = await keyFiguresService.mergeKeyFigures(primaryId, secondaryIds);

    res.json({
      success: true,
      mergedFigure: transformKeyFigure(result.mergedFigure),
      stats: {
        aliasesAdded: result.aliasesAdded,
        contributorsReassigned: result.contributorsReassigned,
        figuresDeleted: result.figuresDeleted,
      },
    });
  } catch (error) {
    // Handle specific merge errors with appropriate HTTP status
    if (error instanceof Error) {
      if (error.message.includes('Cannot merge a key figure with itself')) {
        return next(ApiError.badRequest(error.message));
      }
      if (error.message.includes('not found')) {
        return next(ApiError.notFound(error.message));
      }
      if (error.message.includes('Must provide')) {
        return next(ApiError.badRequest(error.message));
      }
    }
    next(error);
  }
}

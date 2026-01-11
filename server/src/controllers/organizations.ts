import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as organizationsService from '../services/organizations';

/**
 * Organizations Controller
 * Sprint KPC-1 - Key People & Companies
 */

/**
 * Valid organization types
 */
const OrgTypeEnum = z.enum([
  'company',
  'research_lab',
  'university',
  'nonprofit',
  'government',
]);

/**
 * Zod schema for creating an organization
 */
const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
  type: OrgTypeEnum,
  shortDescription: z.string().min(10).max(500),
  mission: z.string().max(2000).optional(),
  history: z.string().max(5000).optional(),
  currentFocus: z.string().max(2000).optional(),
  focusAreas: z.array(z.string()).optional().default([]),
  products: z.array(z.string()).optional().default([]),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  wikipediaUrl: z.string().url().optional(),
  linkedInUrl: z.string().url().optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
  headquarters: z.string().max(200).optional(),
  status: z.enum(['draft', 'pending_review', 'published']).optional().default('published'),
});

/**
 * Zod schema for updating an organization
 */
const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: OrgTypeEnum.optional(),
  shortDescription: z.string().min(10).max(500).optional(),
  mission: z.string().max(2000).nullable().optional(),
  history: z.string().max(5000).nullable().optional(),
  currentFocus: z.string().max(2000).nullable().optional(),
  focusAreas: z.array(z.string()).optional(),
  products: z.array(z.string()).optional(),
  logoUrl: z.string().url().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  wikipediaUrl: z.string().url().nullable().optional(),
  linkedInUrl: z.string().url().nullable().optional(),
  foundedYear: z.number().int().min(1800).max(2100).nullable().optional(),
  headquarters: z.string().max(200).nullable().optional(),
  status: z.enum(['draft', 'pending_review', 'published']).optional(),
});

/**
 * Helper to transform DB organization to API response format
 */
function transformOrganization(org: {
  id: string;
  name: string;
  slug: string;
  type: string;
  shortDescription: string;
  mission: string | null;
  history: string | null;
  currentFocus: string | null;
  currentFocusUpdatedAt: Date | null;
  focusAreas: string;
  products: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  wikipediaUrl: string | null;
  linkedInUrl: string | null;
  foundedYear: number | null;
  headquarters: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    type: org.type,
    shortDescription: org.shortDescription,
    mission: org.mission,
    history: org.history,
    currentFocus: org.currentFocus,
    currentFocusUpdatedAt: org.currentFocusUpdatedAt?.toISOString() ?? null,
    focusAreas: JSON.parse(org.focusAreas) as string[],
    products: JSON.parse(org.products) as string[],
    logoUrl: org.logoUrl,
    websiteUrl: org.websiteUrl,
    wikipediaUrl: org.wikipediaUrl,
    linkedInUrl: org.linkedInUrl,
    foundedYear: org.foundedYear,
    headquarters: org.headquarters,
    status: org.status,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

/**
 * GET /api/organizations
 * Retrieve all organizations (public endpoint)
 */
export async function getAllOrganizations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type, focusArea, search, page, limit, sort, status } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const { organizations, total } = await organizationsService.getAll({
      type: type as 'company' | 'research_lab' | 'university' | 'nonprofit' | 'government' | undefined,
      focusArea: focusArea as string | undefined,
      search: search as string | undefined,
      status: status as string | undefined,
      sort: sort as 'name' | 'foundedYear' | 'personCount' | 'milestoneCount' | undefined,
      skip,
      limit: limitNum,
    });

    res.json({
      data: organizations.map(transformOrganization),
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
 * GET /api/organizations/:slug
 * Retrieve a single organization by slug (public endpoint)
 */
export async function getOrganizationBySlug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const result = await organizationsService.getBySlugWithRelations(slug);

    if (!result) {
      throw ApiError.notFound(`Organization with slug "${slug}" not found`);
    }

    res.json({
      ...transformOrganization(result.organization),
      people: result.people,
      milestones: result.milestones.map((m) => ({
        ...m,
        date: m.date.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/organizations/search
 * Search organizations (public endpoint)
 */
export async function searchOrganizations(
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
    const organizations = await organizationsService.search(q, limitNum);

    res.json({
      data: organizations.map(transformOrganization),
      total: organizations.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/organizations/focus-areas
 * Get all unique focus areas (public endpoint)
 */
export async function getFocusAreas(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const focusAreas = await organizationsService.getAllFocusAreas();
    res.json({ data: focusAreas });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/organizations
 * Create a new organization (admin only)
 */
export async function createOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = CreateOrganizationSchema.parse(req.body);

    // Check if name already exists
    const exists = await organizationsService.nameExists(validatedData.name);
    if (exists) {
      throw ApiError.badRequest(`Organization "${validatedData.name}" already exists`);
    }

    const org = await organizationsService.create(validatedData);
    res.status(201).json(transformOrganization(org));
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/organizations/:id
 * Update an existing organization (admin only)
 */
export async function updateOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const validatedData = UpdateOrganizationSchema.parse(req.body);

    // Check if organization exists
    const existing = await organizationsService.getById(id);
    if (!existing) {
      throw ApiError.notFound(`Organization with ID ${id} not found`);
    }

    // If updating name, check for duplicates
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await organizationsService.nameExists(validatedData.name);
      if (duplicate) {
        throw ApiError.badRequest(`Organization "${validatedData.name}" already exists`);
      }
    }

    const org = await organizationsService.update(id, validatedData);
    if (!org) {
      throw ApiError.internal('Failed to update organization');
    }

    res.json(transformOrganization(org));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/organizations/:id
 * Delete an organization (admin only)
 */
export async function deleteOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Check if organization exists
    const existing = await organizationsService.getById(id);
    if (!existing) {
      throw ApiError.notFound(`Organization with ID ${id} not found`);
    }

    const success = await organizationsService.remove(id);
    if (!success) {
      throw ApiError.internal('Failed to delete organization');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/organizations/stats
 * Get organization statistics (admin only)
 */
export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [total, countByType] = await Promise.all([
      organizationsService.getCount(),
      organizationsService.getCountByType(),
    ]);

    res.json({
      total,
      byType: countByType,
    });
  } catch (error) {
    next(error);
  }
}

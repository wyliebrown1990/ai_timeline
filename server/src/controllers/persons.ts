import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as personsService from '../services/persons';
import * as affiliationsService from '../services/affiliations';

/**
 * Persons Controller
 * Sprint KPC-1 - Key People & Companies
 */

/**
 * Valid person roles
 */
const PersonRoleEnum = z.enum([
  'researcher',
  'executive',
  'founder',
  'policy_maker',
  'engineer',
  'other',
]);

/**
 * Zod schema for creating a person
 */
const CreatePersonSchema = z.object({
  canonicalName: z.string().min(2).max(100),
  aliases: z.array(z.string()).optional().default([]),
  shortBio: z.string().min(10).max(500),
  background: z.string().max(5000).optional(),
  careerHistory: z.string().max(5000).optional(),
  contributions: z.string().max(5000).optional(),
  philosophy: z.string().max(5000).optional(),
  currentlyDoing: z.string().max(2000).optional(),
  fullBio: z.string().max(10000).optional(),
  primaryOrg: z.string().max(200).optional(),
  previousOrgs: z.array(z.string()).optional().default([]),
  notableFor: z.string().max(500).optional(),
  role: PersonRoleEnum,
  focusAreas: z.array(z.string()).optional().default([]),
  currentOrgId: z.string().optional(),
  currentRole: z.string().max(200).optional(),
  imageUrl: z.string().url().optional(),
  wikipediaUrl: z.string().url().optional(),
  linkedInUrl: z.string().url().optional(),
  twitterHandle: z.string().max(50).optional(),
  personalWebsite: z.string().url().optional(),
  googleScholarUrl: z.string().url().optional(),
  status: z.enum(['draft', 'pending_review', 'published']).optional().default('published'),
});

/**
 * Zod schema for updating a person
 */
const UpdatePersonSchema = z.object({
  canonicalName: z.string().min(2).max(100).optional(),
  aliases: z.array(z.string()).optional(),
  shortBio: z.string().min(10).max(500).optional(),
  background: z.string().max(5000).nullable().optional(),
  careerHistory: z.string().max(5000).nullable().optional(),
  contributions: z.string().max(5000).nullable().optional(),
  philosophy: z.string().max(5000).nullable().optional(),
  currentlyDoing: z.string().max(2000).nullable().optional(),
  fullBio: z.string().max(10000).nullable().optional(),
  primaryOrg: z.string().max(200).nullable().optional(),
  previousOrgs: z.array(z.string()).optional(),
  notableFor: z.string().max(500).nullable().optional(),
  role: PersonRoleEnum.optional(),
  focusAreas: z.array(z.string()).optional(),
  currentOrgId: z.string().nullable().optional(),
  currentRole: z.string().max(200).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  wikipediaUrl: z.string().url().nullable().optional(),
  linkedInUrl: z.string().url().nullable().optional(),
  twitterHandle: z.string().max(50).nullable().optional(),
  personalWebsite: z.string().url().nullable().optional(),
  googleScholarUrl: z.string().url().nullable().optional(),
  status: z.enum(['draft', 'pending_review', 'published']).optional(),
});

/**
 * Zod schema for adding an affiliation
 */
const AddAffiliationSchema = z.object({
  orgId: z.string(),
  role: z.string().min(1).max(200),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional().default(false),
  notes: z.string().max(500).optional(),
});

/**
 * Helper to transform DB person to API response format
 */
function transformPerson(person: {
  id: string;
  canonicalName: string;
  slug: string;
  aliases: string;
  shortBio: string;
  background: string | null;
  careerHistory: string | null;
  contributions: string | null;
  philosophy: string | null;
  currentlyDoing: string | null;
  currentlyDoingUpdatedAt: Date | null;
  fullBio: string | null;
  primaryOrg: string | null;
  previousOrgs: string;
  notableFor: string | null;
  role: string;
  focusAreas: string;
  currentOrgId: string | null;
  currentRole: string | null;
  imageUrl: string | null;
  wikipediaUrl: string | null;
  linkedInUrl: string | null;
  twitterHandle: string | null;
  personalWebsite: string | null;
  googleScholarUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  currentOrg?: { id: string; name: string; slug: string } | null;
}) {
  return {
    id: person.id,
    canonicalName: person.canonicalName,
    slug: person.slug,
    aliases: JSON.parse(person.aliases) as string[],
    shortBio: person.shortBio,
    background: person.background,
    careerHistory: person.careerHistory,
    contributions: person.contributions,
    philosophy: person.philosophy,
    currentlyDoing: person.currentlyDoing,
    currentlyDoingUpdatedAt: person.currentlyDoingUpdatedAt?.toISOString() ?? null,
    fullBio: person.fullBio,
    primaryOrg: person.primaryOrg,
    previousOrgs: JSON.parse(person.previousOrgs) as string[],
    notableFor: person.notableFor,
    role: person.role,
    focusAreas: JSON.parse(person.focusAreas) as string[],
    currentOrgId: person.currentOrgId,
    currentRole: person.currentRole,
    currentOrg: person.currentOrg ?? null,
    imageUrl: person.imageUrl,
    wikipediaUrl: person.wikipediaUrl,
    linkedInUrl: person.linkedInUrl,
    twitterHandle: person.twitterHandle,
    personalWebsite: person.personalWebsite,
    googleScholarUrl: person.googleScholarUrl,
    status: person.status,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
  };
}

/**
 * GET /api/persons
 * Retrieve all persons (public endpoint)
 */
export async function getAllPersons(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { role, focusArea, orgId, search, page, limit, sort, status } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const { persons, total } = await personsService.getAll({
      role: role as personsService.PersonRole | undefined,
      focusArea: focusArea as string | undefined,
      orgId: orgId as string | undefined,
      search: search as string | undefined,
      status: status as personsService.PersonStatus | undefined,
      sort: sort as 'name' | 'recentActivity' | 'milestoneCount' | undefined,
      skip,
      limit: limitNum,
    });

    res.json({
      data: persons.map(transformPerson),
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
 * GET /api/persons/:slug
 * Retrieve a single person by slug (public endpoint)
 */
export async function getPersonBySlug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const result = await personsService.getBySlugWithRelations(slug);

    if (!result) {
      throw ApiError.notFound(`Person with slug "${slug}" not found`);
    }

    res.json({
      ...transformPerson(result.person),
      affiliations: result.affiliations.map((aff) => ({
        id: aff.id,
        orgId: aff.orgId,
        organization: {
          id: aff.organization.id,
          name: aff.organization.name,
          slug: aff.organization.slug,
        },
        role: aff.role,
        startDate: aff.startDate?.toISOString() ?? null,
        endDate: aff.endDate?.toISOString() ?? null,
        isCurrent: aff.isCurrent,
      })),
      milestones: result.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        date: m.date.toISOString(),
        category: m.category,
        contributionType: m.contributionType,
      })),
      newsEvents: result.newsEvents.map((ne) => ({
        id: ne.id,
        title: ne.title,
        date: ne.date.toISOString(),
        mentionType: ne.mentionType,
        isPaywalled: ne.isPaywalled,
        paywallReason: ne.paywallReason,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/persons/search
 * Search persons (public endpoint)
 */
export async function searchPersons(
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
    const persons = await personsService.search(q, limitNum);

    res.json({
      data: persons.map(transformPerson),
      total: persons.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/persons/focus-areas
 * Get all unique focus areas (public endpoint)
 */
export async function getFocusAreas(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const focusAreas = await personsService.getAllFocusAreas();
    res.json({ data: focusAreas });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/persons/:slug/affiliations
 * Get affiliations for a person (public endpoint)
 */
export async function getPersonAffiliations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const person = await personsService.getBySlug(slug);

    if (!person) {
      throw ApiError.notFound(`Person with slug "${slug}" not found`);
    }

    const affiliations = await affiliationsService.getByPerson(person.id);

    res.json({
      data: affiliations.map((aff) => ({
        id: aff.id,
        orgId: aff.orgId,
        organization: {
          id: aff.organization.id,
          name: aff.organization.name,
          slug: aff.organization.slug,
        },
        role: aff.role,
        startDate: aff.startDate?.toISOString() ?? null,
        endDate: aff.endDate?.toISOString() ?? null,
        isCurrent: aff.isCurrent,
        notes: aff.notes,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/persons/:slug/key-concepts
 * Get glossary terms linked to a person (Sprint SEO-3)
 */
export async function getPersonKeyConcepts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const person = await personsService.getBySlug(slug);

    if (!person) {
      throw ApiError.notFound(`Person with slug "${slug}" not found`);
    }

    const keyConcepts = await personsService.getKeyConcepts(person.id);

    res.json({
      data: keyConcepts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/persons
 * Create a new person (admin only)
 */
export async function createPerson(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = CreatePersonSchema.parse(req.body);

    // Check if slug already exists
    const slug = validatedData.canonicalName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const exists = await personsService.slugExists(slug);
    if (exists) {
      throw ApiError.badRequest(`Person with name "${validatedData.canonicalName}" already exists`);
    }

    const person = await personsService.create(validatedData);
    res.status(201).json(transformPerson(person));
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/persons/:id
 * Update an existing person (admin only)
 */
export async function updatePerson(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const validatedData = UpdatePersonSchema.parse(req.body);

    // Check if person exists
    const existing = await personsService.getById(id);
    if (!existing) {
      throw ApiError.notFound(`Person with ID ${id} not found`);
    }

    // If updating name, check for duplicates
    if (validatedData.canonicalName && validatedData.canonicalName !== existing.canonicalName) {
      const slug = validatedData.canonicalName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const duplicate = await personsService.slugExists(slug);
      if (duplicate) {
        throw ApiError.badRequest(`Person with name "${validatedData.canonicalName}" already exists`);
      }
    }

    const person = await personsService.update(id, validatedData);
    if (!person) {
      throw ApiError.internal('Failed to update person');
    }

    res.json(transformPerson(person));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/persons/:id
 * Delete a person (admin only)
 */
export async function deletePerson(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Check if person exists
    const existing = await personsService.getById(id);
    if (!existing) {
      throw ApiError.notFound(`Person with ID ${id} not found`);
    }

    const success = await personsService.remove(id);
    if (!success) {
      throw ApiError.internal('Failed to delete person');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/persons/:id/affiliations
 * Add an affiliation for a person (admin only)
 */
export async function addAffiliation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const validatedData = AddAffiliationSchema.parse(req.body);

    // Check if person exists
    const existing = await personsService.getById(id);
    if (!existing) {
      throw ApiError.notFound(`Person with ID ${id} not found`);
    }

    const affiliation = await affiliationsService.create({
      personId: id,
      ...validatedData,
    });

    res.status(201).json({
      id: affiliation.id,
      personId: affiliation.personId,
      orgId: affiliation.orgId,
      role: affiliation.role,
      startDate: affiliation.startDate?.toISOString() ?? null,
      endDate: affiliation.endDate?.toISOString() ?? null,
      isCurrent: affiliation.isCurrent,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/persons/:id/affiliations/:affId
 * Remove an affiliation (admin only)
 */
export async function removeAffiliation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, affId } = req.params;

    // Check if person exists
    const existing = await personsService.getById(id);
    if (!existing) {
      throw ApiError.notFound(`Person with ID ${id} not found`);
    }

    // Check if affiliation exists and belongs to this person
    const affiliation = await affiliationsService.getById(affId);
    if (!affiliation || affiliation.personId !== id) {
      throw ApiError.notFound(`Affiliation not found`);
    }

    const success = await affiliationsService.remove(affId);
    if (!success) {
      throw ApiError.internal('Failed to remove affiliation');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/persons/stats
 * Get person statistics (admin only)
 */
export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [total, countByRole] = await Promise.all([
      personsService.getCount(),
      personsService.getCountByRole(),
    ]);

    res.json({
      total,
      byRole: countByRole,
    });
  } catch (error) {
    next(error);
  }
}

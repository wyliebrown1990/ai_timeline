/**
 * Person Drafts Controller
 * Sprint KPC-4 - AI Entity Detection & Auto-Linking
 *
 * Handles HTTP requests for reviewing and processing person drafts
 * created by the entity extraction pipeline.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError } from '../middleware/error';
import { normalizeName, generateVariants } from '../lib/nameNormalizer';
import type { PersonDraft, Person } from '@prisma/client';

/**
 * Valid draft statuses
 */
const DraftStatusEnum = z.enum(['pending', 'approved', 'rejected', 'merged']);

/**
 * Transform draft for API response
 */
function transformDraft(
  draft: PersonDraft & {
    article?: { id: string; title: string; externalUrl: string } | null;
    matchedPerson?: Person | null;
  }
) {
  return {
    id: draft.id,
    articleId: draft.articleId,
    article: draft.article
      ? {
          id: draft.article.id,
          title: draft.article.title,
          externalUrl: draft.article.externalUrl,
        }
      : null,
    extractedName: draft.extractedName,
    normalizedName: draft.normalizedName,
    context: draft.context,
    suggestedBio: draft.suggestedBio,
    suggestedOrg: draft.suggestedOrg,
    suggestedRole: draft.suggestedRole,
    matchedPersonId: draft.matchedPersonId,
    matchedPerson: draft.matchedPerson
      ? {
          id: draft.matchedPerson.id,
          canonicalName: draft.matchedPerson.canonicalName,
          shortBio: draft.matchedPerson.shortBio,
          currentOrg: draft.matchedPerson.primaryOrg,
          role: draft.matchedPerson.role,
        }
      : null,
    matchConfidence: draft.matchConfidence,
    status: draft.status,
    reviewNotes: draft.reviewNotes,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

/**
 * GET /api/admin/person-drafts
 * List person drafts with optional filtering and pagination
 */
export async function listDrafts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { status, page, limit } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const [drafts, total] = await Promise.all([
      prisma.personDraft.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          article: {
            select: { id: true, title: true, externalUrl: true },
          },
          matchedPerson: true,
        },
      }),
      prisma.personDraft.count({ where }),
    ]);

    res.json({
      data: drafts.map(transformDraft),
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
 * GET /api/admin/person-drafts/stats
 * Get draft statistics by status
 */
export async function getDraftStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const statuses = ['pending', 'approved', 'rejected', 'merged'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      counts[status] = await prisma.personDraft.count({
        where: { status },
      });
    }

    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

    res.json({
      total,
      byStatus: counts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/person-drafts/:id
 * Get a single draft by ID
 */
export async function getDraft(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const draft = await prisma.personDraft.findUnique({
      where: { id },
      include: {
        article: {
          select: { id: true, title: true, externalUrl: true },
        },
        matchedPerson: true,
      },
    });

    if (!draft) {
      throw ApiError.notFound(`Person draft with ID "${id}" not found`);
    }

    res.json(transformDraft(draft));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/person-drafts/:id/approve
 * Approve a draft and create a new Person record
 */
export async function approveDraft(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Optional overrides from request body
    const schema = z.object({
      canonicalName: z.string().min(2).max(100).optional(),
      shortBio: z.string().min(1).max(500).optional(),
      currentOrg: z.string().max(100).optional(),
      role: z.enum(['researcher', 'executive', 'founder', 'policy_maker', 'engineer', 'other']).optional(),
    });

    const overrides = schema.parse(req.body);

    // Get the draft
    const draft = await prisma.personDraft.findUnique({
      where: { id },
      include: { article: true },
    });

    if (!draft) {
      throw ApiError.notFound(`Person draft with ID "${id}" not found`);
    }

    if (draft.status !== 'pending') {
      throw ApiError.badRequest(`Draft is already ${draft.status}`);
    }

    // Determine final values (overrides or draft suggestions)
    const canonicalName = overrides.canonicalName || draft.normalizedName;
    const shortBio = overrides.shortBio || draft.suggestedBio || `Mentioned in "${draft.article?.title}"`;
    const primaryOrg = overrides.currentOrg || draft.suggestedOrg || null;
    const role = overrides.role || (draft.suggestedRole as 'researcher' | 'executive' | 'founder' | 'policy_maker' | 'engineer' | 'other') || 'other';

    // Generate ID from canonical name
    const normalized = normalizeName(canonicalName);
    const personId = normalized.id;
    const slug = normalized.id;

    // Check if ID already exists
    const existing = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (existing) {
      throw ApiError.badRequest(
        `Person with ID "${personId}" already exists. Consider merging instead.`
      );
    }

    // Check if canonical name already exists
    const existingByName = await prisma.person.findUnique({
      where: { canonicalName: normalized.canonical },
    });

    if (existingByName) {
      throw ApiError.badRequest(
        `Person "${normalized.canonical}" already exists. Consider merging instead.`
      );
    }

    // Generate aliases from name variants
    const aliases = generateVariants(canonicalName);
    // Include original extracted name if different from canonical
    if (draft.extractedName.toLowerCase() !== normalized.canonical.toLowerCase()) {
      aliases.push(draft.extractedName);
    }

    // Create the new Person
    const person = await prisma.person.create({
      data: {
        id: personId,
        canonicalName: normalized.canonical,
        slug,
        aliases: JSON.stringify(aliases),
        shortBio,
        primaryOrg,
        role,
        status: 'published',
      },
    });

    // Update the draft status
    await prisma.personDraft.update({
      where: { id },
      data: {
        status: 'approved',
        reviewNotes: `Approved and created Person: ${personId}`,
      },
    });

    console.log(`[PersonDrafts] Approved draft ${id}, created Person ${person.id}`);

    res.status(201).json({
      message: 'Draft approved and person created',
      person: {
        id: person.id,
        canonicalName: person.canonicalName,
        role: person.role,
        shortBio: person.shortBio,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/person-drafts/:id/reject
 * Reject a draft without creating a Person
 */
export async function rejectDraft(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const schema = z.object({
      reason: z.string().max(500).optional(),
    });

    const { reason } = schema.parse(req.body);

    // Get the draft
    const draft = await prisma.personDraft.findUnique({
      where: { id },
    });

    if (!draft) {
      throw ApiError.notFound(`Person draft with ID "${id}" not found`);
    }

    if (draft.status !== 'pending') {
      throw ApiError.badRequest(`Draft is already ${draft.status}`);
    }

    // Update draft status
    await prisma.personDraft.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewNotes: reason || 'Rejected by admin',
      },
    });

    console.log(`[PersonDrafts] Rejected draft ${id}: ${reason || 'No reason provided'}`);

    res.json({
      message: 'Draft rejected',
      draftId: id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/person-drafts/:id/merge
 * Merge a draft with an existing Person (add as alias)
 */
export async function mergeDraft(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const schema = z.object({
      personId: z.string().min(1),
    });

    const { personId } = schema.parse(req.body);

    // Get the draft
    const draft = await prisma.personDraft.findUnique({
      where: { id },
    });

    if (!draft) {
      throw ApiError.notFound(`Person draft with ID "${id}" not found`);
    }

    if (draft.status !== 'pending') {
      throw ApiError.badRequest(`Draft is already ${draft.status}`);
    }

    // Get the target Person
    const person = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw ApiError.notFound(`Person with ID "${personId}" not found`);
    }

    // Add extracted name as alias if not already present
    const aliases: string[] = JSON.parse(person.aliases);
    const extractedLower = draft.extractedName.toLowerCase();
    const normalizedLower = draft.normalizedName.toLowerCase();

    const aliasesLower = aliases.map((a) => a.toLowerCase());
    let aliasAdded = false;

    if (
      !aliasesLower.includes(extractedLower) &&
      extractedLower !== person.canonicalName.toLowerCase()
    ) {
      aliases.push(draft.extractedName);
      aliasAdded = true;
    }

    if (
      !aliasesLower.includes(normalizedLower) &&
      normalizedLower !== person.canonicalName.toLowerCase() &&
      normalizedLower !== extractedLower
    ) {
      aliases.push(draft.normalizedName);
      aliasAdded = true;
    }

    // Update Person with new aliases
    if (aliasAdded) {
      await prisma.person.update({
        where: { id: personId },
        data: {
          aliases: JSON.stringify(aliases),
        },
      });
    }

    // Update draft status
    await prisma.personDraft.update({
      where: { id },
      data: {
        status: 'merged',
        matchedPersonId: personId,
        reviewNotes: `Merged with existing Person: ${person.canonicalName}`,
      },
    });

    console.log(
      `[PersonDrafts] Merged draft ${id} with Person ${personId}, alias added: ${aliasAdded}`
    );

    res.json({
      message: 'Draft merged with existing person',
      person: {
        id: person.id,
        canonicalName: person.canonicalName,
      },
      aliasAdded,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/person-drafts/batch-reject
 * Reject multiple drafts at once
 */
export async function batchRejectDrafts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const schema = z.object({
      draftIds: z.array(z.string()).min(1),
      reason: z.string().max(500).optional(),
    });

    const { draftIds, reason } = schema.parse(req.body);

    const result = await prisma.personDraft.updateMany({
      where: {
        id: { in: draftIds },
        status: 'pending',
      },
      data: {
        status: 'rejected',
        reviewNotes: reason || 'Batch rejected by admin',
      },
    });

    console.log(`[PersonDrafts] Batch rejected ${result.count} drafts`);

    res.json({
      message: `Rejected ${result.count} drafts`,
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Key Figure Drafts Controller
 * Sprint 46 - Key Figures Pipeline Integration
 *
 * Handles HTTP requests for reviewing and processing key figure drafts
 * created by the automated extraction pipeline.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError } from '../middleware/error';
import { normalizeName, generateVariants } from '../lib/nameNormalizer';
import type { KeyFigureDraft, KeyFigure } from '@prisma/client';

/**
 * Transform draft for API response
 */
function transformDraft(
  draft: KeyFigureDraft & {
    article?: { id: string; title: string; externalUrl: string } | null;
    matchedFigure?: KeyFigure | null;
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
    matchedFigureId: draft.matchedFigureId,
    matchedFigure: draft.matchedFigure
      ? {
          id: draft.matchedFigure.id,
          canonicalName: draft.matchedFigure.canonicalName,
          shortBio: draft.matchedFigure.shortBio,
          primaryOrg: draft.matchedFigure.primaryOrg,
          role: draft.matchedFigure.role,
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
 * GET /api/admin/key-figure-drafts
 * List key figure drafts with optional filtering and pagination
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
      prisma.keyFigureDraft.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          article: {
            select: { id: true, title: true, externalUrl: true },
          },
          matchedFigure: true,
        },
      }),
      prisma.keyFigureDraft.count({ where }),
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
 * GET /api/admin/key-figure-drafts/stats
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
      counts[status] = await prisma.keyFigureDraft.count({
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
 * GET /api/admin/key-figure-drafts/:id
 * Get a single draft by ID
 */
export async function getDraft(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const draft = await prisma.keyFigureDraft.findUnique({
      where: { id },
      include: {
        article: {
          select: { id: true, title: true, externalUrl: true },
        },
        matchedFigure: true,
      },
    });

    if (!draft) {
      throw ApiError.notFound(`Key figure draft with ID "${id}" not found`);
    }

    res.json(transformDraft(draft));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/key-figure-drafts/:id/approve
 * Approve a draft and create a new KeyFigure record
 *
 * 46.12: Creates new KeyFigure from draft data, generates ID from name,
 * sets status to published, links to source article, auto-links to milestones
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
      primaryOrg: z.string().max(100).optional(),
      role: z.enum(['researcher', 'executive', 'founder', 'policy_maker', 'engineer', 'other']).optional(),
      notableFor: z.string().min(1).max(500).optional(),
    });

    const overrides = schema.parse(req.body);

    // Get the draft
    const draft = await prisma.keyFigureDraft.findUnique({
      where: { id },
      include: { article: true },
    });

    if (!draft) {
      throw ApiError.notFound(`Key figure draft with ID "${id}" not found`);
    }

    if (draft.status !== 'pending') {
      throw ApiError.badRequest(`Draft is already ${draft.status}`);
    }

    // Determine final values (overrides or draft suggestions)
    const canonicalName = overrides.canonicalName || draft.normalizedName;
    const shortBio = overrides.shortBio || draft.suggestedBio || `Mentioned in "${draft.article?.title}"`;
    const primaryOrg = overrides.primaryOrg || draft.suggestedOrg || null;
    const role = overrides.role || (draft.suggestedRole as 'researcher' | 'executive' | 'founder' | 'policy_maker' | 'engineer' | 'other') || 'other';
    const notableFor = overrides.notableFor || draft.suggestedBio || draft.context.slice(0, 500);

    // Generate ID from canonical name
    const normalized = normalizeName(canonicalName);
    const keyFigureId = normalized.id;

    // Check if ID already exists
    const existing = await prisma.keyFigure.findUnique({
      where: { id: keyFigureId },
    });

    if (existing) {
      throw ApiError.badRequest(
        `Key figure with ID "${keyFigureId}" already exists. Consider merging instead.`
      );
    }

    // Check if canonical name already exists
    const existingByName = await prisma.keyFigure.findUnique({
      where: { canonicalName: normalized.canonical },
    });

    if (existingByName) {
      throw ApiError.badRequest(
        `Key figure "${normalized.canonical}" already exists. Consider merging instead.`
      );
    }

    // Generate aliases from name variants
    const aliases = generateVariants(canonicalName);
    // Include original extracted name if different from canonical
    if (draft.extractedName.toLowerCase() !== normalized.canonical.toLowerCase()) {
      aliases.push(draft.extractedName);
    }

    // Create the new KeyFigure
    const keyFigure = await prisma.keyFigure.create({
      data: {
        id: keyFigureId,
        canonicalName: normalized.canonical,
        aliases: JSON.stringify(aliases),
        shortBio,
        fullBio: null,
        primaryOrg,
        previousOrgs: JSON.stringify([]),
        role,
        notableFor,
        imageUrl: null,
        wikipediaUrl: null,
        linkedInUrl: null,
        twitterHandle: null,
        status: 'published',
        sourceArticleId: draft.articleId,
      },
    });

    // Update the draft status
    await prisma.keyFigureDraft.update({
      where: { id },
      data: {
        status: 'approved',
        reviewNotes: `Approved and created KeyFigure: ${keyFigureId}`,
      },
    });

    // Auto-link to any milestone drafts from the same article
    const milestoneDrafts = await prisma.contentDraft.findMany({
      where: {
        articleId: draft.articleId,
        contentType: 'milestone',
        status: 'published',
      },
      select: { publishedId: true },
    });

    // Create MilestoneContributor links for any published milestones
    for (const milestoneDraft of milestoneDrafts) {
      if (milestoneDraft.publishedId) {
        try {
          await prisma.milestoneContributor.create({
            data: {
              milestoneId: milestoneDraft.publishedId,
              keyFigureId: keyFigure.id,
              contributionType: 'mentioned',
            },
          });
        } catch {
          // Ignore if link already exists
        }
      }
    }

    console.log(`[KeyFigureDrafts] Approved draft ${id}, created KeyFigure ${keyFigure.id}`);

    res.status(201).json({
      message: 'Draft approved and key figure created',
      keyFigure: {
        id: keyFigure.id,
        canonicalName: keyFigure.canonicalName,
        role: keyFigure.role,
        shortBio: keyFigure.shortBio,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/key-figure-drafts/:id/reject
 * Reject a draft without creating a KeyFigure
 *
 * 46.13: Marks draft as rejected, stores rejection reason
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
    const draft = await prisma.keyFigureDraft.findUnique({
      where: { id },
    });

    if (!draft) {
      throw ApiError.notFound(`Key figure draft with ID "${id}" not found`);
    }

    if (draft.status !== 'pending') {
      throw ApiError.badRequest(`Draft is already ${draft.status}`);
    }

    // Update draft status
    await prisma.keyFigureDraft.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewNotes: reason || 'Rejected by admin',
      },
    });

    console.log(`[KeyFigureDrafts] Rejected draft ${id}: ${reason || 'No reason provided'}`);

    res.json({
      message: 'Draft rejected',
      draftId: id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/key-figure-drafts/:id/merge
 * Merge a draft with an existing KeyFigure (add as alias)
 *
 * 46.14: Accepts target keyFigureId, adds extracted name as alias,
 * creates MilestoneContributor links, marks draft as merged
 */
export async function mergeDraft(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const schema = z.object({
      keyFigureId: z.string().min(1),
    });

    const { keyFigureId } = schema.parse(req.body);

    // Get the draft
    const draft = await prisma.keyFigureDraft.findUnique({
      where: { id },
    });

    if (!draft) {
      throw ApiError.notFound(`Key figure draft with ID "${id}" not found`);
    }

    if (draft.status !== 'pending') {
      throw ApiError.badRequest(`Draft is already ${draft.status}`);
    }

    // Get the target KeyFigure
    const keyFigure = await prisma.keyFigure.findUnique({
      where: { id: keyFigureId },
    });

    if (!keyFigure) {
      throw ApiError.notFound(`Key figure with ID "${keyFigureId}" not found`);
    }

    // Add extracted name as alias if not already present
    const aliases: string[] = JSON.parse(keyFigure.aliases);
    const extractedLower = draft.extractedName.toLowerCase();
    const normalizedLower = draft.normalizedName.toLowerCase();

    const aliasesLower = aliases.map((a) => a.toLowerCase());
    let aliasAdded = false;

    if (
      !aliasesLower.includes(extractedLower) &&
      extractedLower !== keyFigure.canonicalName.toLowerCase()
    ) {
      aliases.push(draft.extractedName);
      aliasAdded = true;
    }

    if (
      !aliasesLower.includes(normalizedLower) &&
      normalizedLower !== keyFigure.canonicalName.toLowerCase() &&
      normalizedLower !== extractedLower
    ) {
      aliases.push(draft.normalizedName);
      aliasAdded = true;
    }

    // Update KeyFigure with new aliases
    if (aliasAdded) {
      await prisma.keyFigure.update({
        where: { id: keyFigureId },
        data: {
          aliases: JSON.stringify(aliases),
        },
      });
    }

    // Update draft status
    await prisma.keyFigureDraft.update({
      where: { id },
      data: {
        status: 'merged',
        matchedFigureId: keyFigureId,
        reviewNotes: `Merged with existing KeyFigure: ${keyFigure.canonicalName}`,
      },
    });

    // Create MilestoneContributor links for any published milestones from same article
    const milestoneDrafts = await prisma.contentDraft.findMany({
      where: {
        articleId: draft.articleId,
        contentType: 'milestone',
        status: 'published',
      },
      select: { publishedId: true },
    });

    let contributorLinksCreated = 0;
    for (const milestoneDraft of milestoneDrafts) {
      if (milestoneDraft.publishedId) {
        try {
          await prisma.milestoneContributor.create({
            data: {
              milestoneId: milestoneDraft.publishedId,
              keyFigureId: keyFigure.id,
              contributionType: 'mentioned',
            },
          });
          contributorLinksCreated++;
        } catch {
          // Ignore if link already exists
        }
      }
    }

    console.log(
      `[KeyFigureDrafts] Merged draft ${id} with KeyFigure ${keyFigureId}, ` +
      `alias added: ${aliasAdded}, milestone links created: ${contributorLinksCreated}`
    );

    res.json({
      message: 'Draft merged with existing key figure',
      keyFigure: {
        id: keyFigure.id,
        canonicalName: keyFigure.canonicalName,
      },
      aliasAdded,
      contributorLinksCreated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/key-figure-drafts/batch-reject
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

    const result = await prisma.keyFigureDraft.updateMany({
      where: {
        id: { in: draftIds },
        status: 'pending',
      },
      data: {
        status: 'rejected',
        reviewNotes: reason || 'Batch rejected by admin',
      },
    });

    console.log(`[KeyFigureDrafts] Batch rejected ${result.count} drafts`);

    res.json({
      message: `Rejected ${result.count} drafts`,
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
}

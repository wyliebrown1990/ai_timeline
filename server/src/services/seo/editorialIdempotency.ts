import { Prisma } from '@prisma/client';
import { prisma } from '../../db';
import type { EditorialOpportunity } from './editorialOpportunitySelector';

export type SeoEditorialOpportunityRunStatus =
  | 'processing'
  | 'draft_created'
  | 'auto_published'
  | 'skipped_by_gate'
  | 'failed';

export interface SeoEditorialOpportunityRunRecord {
  id: string;
  idempotencyKey: string;
  weekStart: string;
  sourceType: EditorialOpportunity['sourceType'];
  sourceId: string;
  targetKeyword: string;
  action: EditorialOpportunity['action'];
  status: SeoEditorialOpportunityRunStatus;
  postId: string | null;
  postSlug: string | null;
  postTitle: string | null;
  reason: string | null;
}

function normalizeKeyPart(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'unknown';
}

export function buildEditorialIdempotencyKey(weekStart: string, opportunity: EditorialOpportunity): string {
  return [
    'seo-editorial',
    weekStart.slice(0, 10),
    opportunity.sourceType,
    normalizeKeyPart(opportunity.id),
  ].join(':');
}

function serializeRun(row: {
  id: string;
  idempotencyKey: string;
  weekStart: Date;
  sourceType: string;
  sourceId: string;
  targetKeyword: string;
  action: string;
  status: string;
  postId: string | null;
  post?: { slug: string; title: string } | null;
  reason: string | null;
}): SeoEditorialOpportunityRunRecord {
  return {
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    weekStart: row.weekStart.toISOString().slice(0, 10),
    sourceType: row.sourceType === 'keyword' ? 'keyword' : 'proposal',
    sourceId: row.sourceId,
    targetKeyword: row.targetKeyword,
    action: row.action === 'draft_only' ? 'draft_only' : 'auto_publish',
    status: (
      row.status === 'draft_created' ||
      row.status === 'auto_published' ||
      row.status === 'skipped_by_gate' ||
      row.status === 'failed'
    ) ? row.status : 'processing',
    postId: row.postId,
    postSlug: row.post?.slug ?? null,
    postTitle: row.post?.title ?? null,
    reason: row.reason,
  };
}

export async function findExistingEditorialRun(
  weekStart: string,
  opportunity: EditorialOpportunity,
): Promise<SeoEditorialOpportunityRunRecord | null> {
  const row = await prisma.seoEditorialOpportunityRun.findUnique({
    where: { idempotencyKey: buildEditorialIdempotencyKey(weekStart, opportunity) },
    include: { post: { select: { slug: true, title: true } } },
  });

  return row ? serializeRun(row) : null;
}

export async function claimEditorialOpportunityRun(
  weekStart: string,
  opportunity: EditorialOpportunity,
): Promise<SeoEditorialOpportunityRunRecord> {
  const idempotencyKey = buildEditorialIdempotencyKey(weekStart, opportunity);
  const weekStartDate = new Date(`${weekStart.slice(0, 10)}T00:00:00.000Z`);

  try {
    const row = await prisma.seoEditorialOpportunityRun.create({
      data: {
        idempotencyKey,
        weekStart: weekStartDate,
        sourceType: opportunity.sourceType,
        sourceId: opportunity.id,
        targetKeyword: opportunity.targetKeyword,
        action: opportunity.action,
        status: 'processing',
      },
      include: { post: { select: { slug: true, title: true } } },
    });
    return serializeRun(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await findExistingEditorialRun(weekStart, opportunity);
      if (existing) return existing;
    }
    throw error;
  }
}

export async function completeEditorialOpportunityRun(
  idempotencyKey: string,
  input: {
    status: Exclude<SeoEditorialOpportunityRunStatus, 'processing'>;
    postId?: string | null;
    reason: string;
    metadata?: Record<string, unknown>;
  },
): Promise<SeoEditorialOpportunityRunRecord> {
  const row = await prisma.seoEditorialOpportunityRun.update({
    where: { idempotencyKey },
    data: {
      status: input.status,
      postId: input.postId ?? null,
      reason: input.reason,
      metadataJson: input.metadata as Prisma.InputJsonValue | undefined,
    },
    include: { post: { select: { slug: true, title: true } } },
  });
  return serializeRun(row);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[‘’']s\b/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function findDuplicateEditorialPost(input: {
  slug: string;
  title: string;
  targetKeyword: string;
}): Promise<{ id: string; slug: string; title: string; status: string } | null> {
  const titleSlug = slugify(input.title);
  const keywordSlug = slugify(input.targetKeyword);
  const candidates = [...new Set([input.slug, titleSlug, keywordSlug].filter(Boolean))];

  const existing = await prisma.blogPost.findFirst({
    where: {
      OR: [
        { slug: { in: candidates } },
        { title: { equals: input.title, mode: 'insensitive' } },
        { seoTitle: { equals: input.title, mode: 'insensitive' } },
      ],
      status: { not: 'archived' },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
    },
  });

  return existing;
}

/**
 * Public Blog service
 * Sprint Blog-1 — Data Model & API Foundation
 *
 * Read-path queries for published posts. Admin-only mutations live in blogAdmin.ts.
 */

import { prisma } from '../db';

// =============================================================================
// Small pure helpers
// =============================================================================

/**
 * Rounds words/200 up, minimum 1. Why: rendering "0 min" for a tiny post looks broken.
 */
export function computeReadingMinutes(markdown: string): number {
  if (!markdown || typeof markdown !== 'string') return 1;
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / 200));
}

function safeJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function safeJsonObject<T extends Record<string, unknown>>(value: string | null | undefined): T {
  if (!value) return {} as T;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? (parsed as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

// =============================================================================
// Types returned to controllers
// =============================================================================

export interface PublicAuthor {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  bio: string | null;
  avatarUrl: string | null;
  links: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicSubjectRef {
  subjectId: string;
  slug: string;
  name: string;
  isPrimary: boolean;
}

export interface PublicRelationRef {
  entityType: string;
  entityId: string;
  relationLabel: string | null;
}

export interface PublicBlogPostListItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  coverImageUrl: string | null;
  status: string;
  publishedAt: Date | null;
  readingMinutes: number;
  tags: string[];
  featured: boolean;
  author: { id: string; slug: string; name: string; avatarUrl: string | null };
  subjects: PublicSubjectRef[];
}

export interface PublicBlogPost extends PublicBlogPostListItem {
  bodyMarkdown: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  scheduledFor: Date | null;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  relations: PublicRelationRef[];
}

// =============================================================================
// List / fetch
// =============================================================================

export interface ListPublishedPostsOptions {
  page?: number;
  pageSize?: number;
  tag?: string;
  subjectSlug?: string;
  authorSlug?: string;
}

export interface ListPublishedPostsResult {
  posts: PublicBlogPostListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listPublishedPosts(
  options: ListPublishedPostsOptions = {}
): Promise<ListPublishedPostsResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 12));
  const skip = (page - 1) * pageSize;

  // Subject filter: resolve slug -> subjectId so we can filter via BlogPostSubject.
  let subjectId: string | undefined;
  if (options.subjectSlug) {
    const subject = await prisma.subject.findUnique({
      where: { slug: options.subjectSlug },
      select: { id: true },
    });
    if (!subject) {
      return { posts: [], total: 0, page, pageSize, totalPages: 0 };
    }
    subjectId = subject.id;
  }

  // Author filter: same deal via slug.
  let authorId: string | undefined;
  if (options.authorSlug) {
    const author = await prisma.author.findUnique({
      where: { slug: options.authorSlug },
      select: { id: true },
    });
    if (!author) {
      return { posts: [], total: 0, page, pageSize, totalPages: 0 };
    }
    authorId = author.id;
  }

  // tags is stored as JSON string — filter via `contains` on the stringified array.
  // Fine for small-to-medium dataset; if growth demands, promote to a tag table later.
  const where: Record<string, unknown> = {
    status: 'published',
    publishedAt: { lte: new Date() },
  };
  if (authorId) where.authorId = authorId;
  if (options.tag) where.tags = { contains: JSON.stringify(options.tag) };
  if (subjectId) where.subjects = { some: { subjectId } };

  const [rows, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        author: { select: { id: true, slug: true, name: true, avatarUrl: true } },
        subjects: {
          include: { subject: { select: { id: true, slug: true, name: true } } },
        },
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  const posts: PublicBlogPostListItem[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    coverImageUrl: row.coverImageUrl,
    status: row.status,
    publishedAt: row.publishedAt,
    readingMinutes: row.readingMinutes,
    tags: safeJsonArray(row.tags),
    featured: row.featured,
    author: row.author,
    subjects: row.subjects.map((s) => ({
      subjectId: s.subjectId,
      slug: s.subject.slug,
      name: s.subject.name,
      isPrimary: s.isPrimary,
    })),
  }));

  return {
    posts,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPublishedPostBySlug(slug: string): Promise<PublicBlogPost | null> {
  return fetchPostBySlug(slug, { requirePublished: true });
}

/**
 * Admin-preview variant: returns the post regardless of publish status, so
 * reviewers can see drafts and scheduled posts via a short-lived preview token.
 */
export async function getPostBySlugForPreview(slug: string): Promise<PublicBlogPost | null> {
  return fetchPostBySlug(slug, { requirePublished: false });
}

async function fetchPostBySlug(
  slug: string,
  opts: { requirePublished: boolean }
): Promise<PublicBlogPost | null> {
  const where: Record<string, unknown> = { slug };
  if (opts.requirePublished) {
    where.status = 'published';
    where.publishedAt = { lte: new Date() };
  }
  const row = await prisma.blogPost.findFirst({
    where,
    include: {
      author: true,
      subjects: { include: { subject: { select: { id: true, slug: true, name: true } } } },
      relations: true,
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    bodyMarkdown: row.bodyMarkdown,
    coverImageUrl: row.coverImageUrl,
    status: row.status,
    publishedAt: row.publishedAt,
    scheduledFor: row.scheduledFor,
    readingMinutes: row.readingMinutes,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    canonicalUrl: row.canonicalUrl,
    tags: safeJsonArray(row.tags),
    featured: row.featured,
    viewCount: row.viewCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      id: row.author.id,
      slug: row.author.slug,
      name: row.author.name,
      avatarUrl: row.author.avatarUrl,
    },
    subjects: row.subjects.map((s) => ({
      subjectId: s.subjectId,
      slug: s.subject.slug,
      name: s.subject.name,
      isPrimary: s.isPrimary,
    })),
    relations: row.relations.map((r) => ({
      entityType: r.entityType,
      entityId: r.entityId,
      relationLabel: r.relationLabel,
    })),
  };
}

/**
 * Rank candidates by: shared-subject count desc → shared-entity count desc → recency.
 * Why: both signals together produce tighter topical similarity than either alone.
 */
export async function getRelatedPosts(
  postId: string,
  limit = 3
): Promise<PublicBlogPostListItem[]> {
  const anchor = await prisma.blogPost.findUnique({
    where: { id: postId },
    include: {
      subjects: { select: { subjectId: true } },
      relations: { select: { entityType: true, entityId: true } },
    },
  });
  if (!anchor) return [];

  const anchorSubjectIds = new Set(anchor.subjects.map((s) => s.subjectId));
  const anchorRelationKeys = new Set(
    anchor.relations.map((r) => `${r.entityType}:${r.entityId}`)
  );

  // Pull a generous candidate pool (same subjects OR same entities), then score.
  const candidates = await prisma.blogPost.findMany({
    where: {
      id: { not: postId },
      status: 'published',
      publishedAt: { lte: new Date() },
      OR: [
        anchorSubjectIds.size > 0
          ? { subjects: { some: { subjectId: { in: [...anchorSubjectIds] } } } }
          : { id: '___never___' },
        anchorRelationKeys.size > 0
          ? {
              relations: {
                some: {
                  OR: [...anchorRelationKeys].map((k) => {
                    const [entityType, entityId] = k.split(':');
                    return { entityType, entityId };
                  }),
                },
              },
            }
          : { id: '___never___' },
      ],
    },
    take: 30,
    orderBy: { publishedAt: 'desc' },
    include: {
      author: { select: { id: true, slug: true, name: true, avatarUrl: true } },
      subjects: {
        include: { subject: { select: { id: true, slug: true, name: true } } },
      },
      relations: { select: { entityType: true, entityId: true } },
    },
  });

  const anchorTags = new Set(safeJsonArray(anchor.tags ?? '[]').map((t) => t.toLowerCase()));
  const now = Date.now();
  // 30 days — longer half-life than it sounds because the total score is
  // dominated by subject/entity overlap; recency is only a tie-breaker.
  const RECENCY_HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;

  const scored = candidates
    .map((c) => {
      const sharedSubjects = c.subjects.filter((s) => anchorSubjectIds.has(s.subjectId)).length;
      const sharedRelations = c.relations.filter((r) =>
        anchorRelationKeys.has(`${r.entityType}:${r.entityId}`)
      ).length;
      const candidateTags = safeJsonArray(c.tags ?? '[]').map((t) => t.toLowerCase());
      const sharedTags = candidateTags.filter((t) => anchorTags.has(t)).length;

      const publishedMs = c.publishedAt?.getTime() ?? 0;
      const ageDays = publishedMs ? (now - publishedMs) / RECENCY_HALF_LIFE_MS : 6;
      const recencyScore = 0.5 * Math.exp(-Math.max(0, ageDays));

      const score = 3 * sharedSubjects + 2 * sharedRelations + 1 * sharedTags + recencyScore;
      return { row: c, score, sharedSubjects, sharedRelations, sharedTags };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ad = a.row.publishedAt?.getTime() ?? 0;
      const bd = b.row.publishedAt?.getTime() ?? 0;
      return bd - ad;
    })
    .slice(0, limit);

  return scored.map(({ row }) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    coverImageUrl: row.coverImageUrl,
    status: row.status,
    publishedAt: row.publishedAt,
    readingMinutes: row.readingMinutes,
    tags: safeJsonArray(row.tags),
    featured: row.featured,
    author: row.author,
    subjects: row.subjects.map((s) => ({
      subjectId: s.subjectId,
      slug: s.subject.slug,
      name: s.subject.name,
      isPrimary: s.isPrimary,
    })),
  }));
}

/**
 * Posts for a specific entity (Milestone / Person / Organization / GlossaryTerm
 * / Subject). Used by the "From the blog" cross-page injection. Strategy:
 *   1. Direct BlogPostRelation match — highest signal, author explicitly linked
 *      this post to the entity.
 *   2. Fallback: subject overlap, via the entity's subject(s).
 */
export async function getPostsForEntity(
  entityType: 'milestone' | 'person' | 'organization' | 'glossary_term' | 'subject',
  entityId: string,
  limit = 3
): Promise<PublicBlogPostListItem[]> {
  const now = new Date();

  // Subjects aren't a BlogPostRelation target — subject posts come from the
  // BlogPostSubject join directly via subject slug OR id.
  if (entityType === 'subject') {
    // entityId can be either the UUID or the slug. Accept either.
    let subjectId = entityId;
    const bySlug = await prisma.subject.findUnique({ where: { slug: entityId }, select: { id: true } });
    if (bySlug) subjectId = bySlug.id;
    const rows = await prisma.blogPost.findMany({
      where: {
        status: 'published',
        publishedAt: { lte: now },
        subjects: { some: { subjectId } },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: {
        author: { select: { id: true, slug: true, name: true, avatarUrl: true } },
        subjects: { include: { subject: { select: { id: true, slug: true, name: true } } } },
      },
    });
    return rows.map(toListItem);
  }

  // Step 1: direct relation match.
  const direct = await prisma.blogPost.findMany({
    where: {
      status: 'published',
      publishedAt: { lte: now },
      relations: { some: { entityType, entityId } },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    include: {
      author: { select: { id: true, slug: true, name: true, avatarUrl: true } },
      subjects: { include: { subject: { select: { id: true, slug: true, name: true } } } },
    },
  });
  if (direct.length >= limit) return direct.map(toListItem);

  // Step 2: subject fallback. Pull the entity's subjects via ContentSubject
  // (the polymorphic table that Subject uses for milestone/person/org/glossary
  // classifications) and find posts sharing any of them. Cap at limit - direct.length.
  // contentType uses "glossary_term" in Blog-1 relations but ContentSubject
  // elsewhere uses "glossary_term" too, so they match.
  const contentSubjectRows = await prisma.contentSubject.findMany({
    where: { contentType: entityType, contentId: entityId },
    select: { subjectId: true },
  });
  const subjectIds = [...new Set(contentSubjectRows.map((r) => r.subjectId))];
  if (subjectIds.length === 0) return direct.map(toListItem);

  const usedIds = new Set(direct.map((d) => d.id));
  const fallback = await prisma.blogPost.findMany({
    where: {
      id: { notIn: [...usedIds] },
      status: 'published',
      publishedAt: { lte: now },
      subjects: { some: { subjectId: { in: subjectIds } } },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit - direct.length,
    include: {
      author: { select: { id: true, slug: true, name: true, avatarUrl: true } },
      subjects: { include: { subject: { select: { id: true, slug: true, name: true } } } },
    },
  });

  return [...direct.map(toListItem), ...fallback.map(toListItem)];
}

type ListRowShape = Awaited<
  ReturnType<typeof prisma.blogPost.findMany<{
    include: {
      author: { select: { id: true; slug: true; name: true; avatarUrl: true } };
      subjects: { include: { subject: { select: { id: true; slug: true; name: true } } } };
    };
  }>>
>[number];

function toListItem(row: ListRowShape): PublicBlogPostListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    coverImageUrl: row.coverImageUrl,
    status: row.status,
    publishedAt: row.publishedAt,
    readingMinutes: row.readingMinutes,
    tags: safeJsonArray(row.tags),
    featured: row.featured,
    author: row.author,
    subjects: row.subjects.map((s) => ({
      subjectId: s.subjectId,
      slug: s.subject.slug,
      name: s.subject.name,
      isPrimary: s.isPrimary,
    })),
  };
}

// =============================================================================
// Author fetch
// =============================================================================

export async function getAuthorBySlug(slug: string): Promise<PublicAuthor | null> {
  const row = await prisma.author.findUnique({ where: { slug } });
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    role: row.role,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    links: safeJsonObject<Record<string, string>>(row.links),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

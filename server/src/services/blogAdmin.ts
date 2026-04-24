/**
 * Admin Blog service
 * Sprint Blog-1 — Data Model & API Foundation
 *
 * All mutations + admin list/read helpers for BlogPost + Author + BlogPostSubject + BlogPostRelation.
 * S3 presigned upload URLs for cover / inline images also live here.
 */

import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../db';
import { computeReadingMinutes } from './blog';

const BLOG_UPLOAD_BUCKET =
  process.env.BLOG_UPLOAD_BUCKET ?? 'ai-timeline-frontend-1765916222';
const BLOG_UPLOAD_PREFIX = 'blog-uploads';
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';

// Single S3 client instance — SDK v3 clients are lightweight but reuse is still cheaper per Lambda.
let s3Client: S3Client | null = null;
function getS3(): S3Client {
  if (!s3Client) s3Client = new S3Client({ region: AWS_REGION });
  return s3Client;
}

// =============================================================================
// Admin list & read
// =============================================================================

export interface AdminListPostsOptions {
  status?: string;
  authorId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function listAllPosts(options: AdminListPostsOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 50));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (options.status) where.status = options.status;
  if (options.authorId) where.authorId = options.authorId;
  if (options.q) {
    where.OR = [
      { title: { contains: options.q, mode: 'insensitive' } },
      { excerpt: { contains: options.q, mode: 'insensitive' } },
      { slug: { contains: options.q, mode: 'insensitive' } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      skip,
      take: pageSize,
      include: {
        author: { select: { id: true, slug: true, name: true, avatarUrl: true } },
        subjects: {
          include: { subject: { select: { id: true, slug: true, name: true } } },
        },
        _count: { select: { relations: true } },
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    posts: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPostById(id: string) {
  return prisma.blogPost.findUnique({
    where: { id },
    include: {
      author: true,
      subjects: { include: { subject: true } },
      relations: true,
    },
  });
}

// =============================================================================
// Slug generation
// =============================================================================

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[‘’']s\b/g, '') // strip possessive 's so "AI's" becomes "AI" (not "AIs")
    .replace(/[^a-z0-9\s-]/g, ' ')      // other non-alphanumerics become separators, not silent strips
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'post';
}

/**
 * Ensures an author-supplied slug is unique, appending -2, -3, … as needed.
 * Takes an already-kebab-cased slug (Zod-validated at the controller layer).
 */
export async function ensureSlugAvailable(slug: string): Promise<string> {
  let candidate = slug;
  let suffix = 2;
  for (let i = 0; i < 100; i++) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }
  throw new Error(`Could not find a unique slug after 100 attempts for "${slug}"`);
}

/**
 * Ensures a slug is unique in BlogPost, appending -2, -3, … as needed.
 */
export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;
  // Bounded loop — paranoid cap so a pathological base can't lock us up.
  for (let i = 0; i < 100; i++) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  // If 100 collisions happen, punt with a random suffix.
  return `${base}-${randomUUID().slice(0, 6)}`;
}

// =============================================================================
// Mutations
// =============================================================================

export interface CreateDraftInput {
  title: string;
  slug?: string;
  subtitle?: string;
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  featured?: boolean;
  subjectIds?: string[];
  primarySubjectId?: string;
  relations?: Array<{ entityType: string; entityId: string; relationLabel?: string }>;
}

export async function createDraft(input: CreateDraftInput, authorId: string) {
  const slug = input.slug
    ? await ensureSlugAvailable(input.slug)
    : await generateUniqueSlug(input.title);
  const readingMinutes = computeReadingMinutes(input.bodyMarkdown);

  const post = await prisma.blogPost.create({
    data: {
      slug,
      title: input.title,
      subtitle: input.subtitle ?? null,
      excerpt: input.excerpt,
      bodyMarkdown: input.bodyMarkdown,
      coverImageUrl: input.coverImageUrl ?? null,
      authorId,
      status: 'draft',
      readingMinutes,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      canonicalUrl: input.canonicalUrl ?? null,
      tags: JSON.stringify(input.tags ?? []),
      featured: input.featured ?? false,
    },
  });

  if (input.subjectIds?.length) {
    await setSubjects(post.id, input.subjectIds, input.primarySubjectId);
  }
  if (input.relations?.length) {
    await setRelations(post.id, input.relations);
  }

  return getPostById(post.id);
}

export interface UpdatePostPatch {
  title?: string;
  slug?: string;
  subtitle?: string | null;
  excerpt?: string;
  bodyMarkdown?: string;
  coverImageUrl?: string | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  featured?: boolean;
  subjectIds?: string[];
  primarySubjectId?: string;
  relations?: Array<{ entityType: string; entityId: string; relationLabel?: string }>;
}

export async function updatePost(id: string, patch: UpdatePostPatch) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.slug !== undefined && patch.slug !== existing.slug) {
    // Rename: verify uniqueness against everyone else.
    const collision = await prisma.blogPost.findUnique({ where: { slug: patch.slug } });
    if (collision && collision.id !== id) {
      throw new Error(`Slug "${patch.slug}" is already taken`);
    }
    data.slug = patch.slug;
  }
  if (patch.subtitle !== undefined) data.subtitle = patch.subtitle;
  if (patch.excerpt !== undefined) data.excerpt = patch.excerpt;
  if (patch.bodyMarkdown !== undefined) {
    data.bodyMarkdown = patch.bodyMarkdown;
    data.readingMinutes = computeReadingMinutes(patch.bodyMarkdown);
  }
  if (patch.coverImageUrl !== undefined) data.coverImageUrl = patch.coverImageUrl;
  if (patch.tags !== undefined) data.tags = JSON.stringify(patch.tags);
  if (patch.seoTitle !== undefined) data.seoTitle = patch.seoTitle;
  if (patch.seoDescription !== undefined) data.seoDescription = patch.seoDescription;
  if (patch.canonicalUrl !== undefined) data.canonicalUrl = patch.canonicalUrl;
  if (patch.featured !== undefined) data.featured = patch.featured;

  await prisma.blogPost.update({ where: { id }, data });

  if (patch.subjectIds !== undefined) {
    await setSubjects(id, patch.subjectIds, patch.primarySubjectId);
  }
  if (patch.relations !== undefined) {
    await setRelations(id, patch.relations);
  }

  return getPostById(id);
}

export async function publishPost(id: string) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return null;
  const publishAt = existing.scheduledFor ?? new Date();
  return prisma.blogPost.update({
    where: { id },
    data: {
      status: 'published',
      publishedAt: publishAt,
      scheduledFor: null,
    },
  });
}

export async function schedulePost(id: string, scheduledFor: Date) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return null;
  return prisma.blogPost.update({
    where: { id },
    data: {
      status: 'scheduled',
      scheduledFor,
      publishedAt: null,
    },
  });
}

export async function archivePost(id: string) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return null;
  return prisma.blogPost.update({
    where: { id },
    data: { status: 'archived' },
  });
}

export async function deletePost(id: string) {
  await prisma.blogPost.delete({ where: { id } });
}

// =============================================================================
// Subject + relation join-table management
// =============================================================================

export async function setSubjects(
  postId: string,
  subjectIds: string[],
  primarySubjectId?: string
) {
  // Wipe and rewrite — simplest semantics; totals are small per-post.
  await prisma.blogPostSubject.deleteMany({ where: { postId } });
  if (subjectIds.length === 0) return;
  const data = subjectIds.map((subjectId) => ({
    postId,
    subjectId,
    isPrimary: primarySubjectId ? subjectId === primarySubjectId : false,
  }));
  await prisma.blogPostSubject.createMany({ data, skipDuplicates: true });
}

export interface RelationInput {
  entityType: string;
  entityId: string;
  relationLabel?: string;
}

export async function setRelations(postId: string, relations: RelationInput[]) {
  await prisma.blogPostRelation.deleteMany({ where: { postId } });
  if (relations.length === 0) return;
  // Dedupe by (entityType,entityId) to respect the unique constraint.
  const seen = new Set<string>();
  const data = relations
    .filter((r) => {
      const key = `${r.entityType}:${r.entityId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((r) => ({
      postId,
      entityType: r.entityType,
      entityId: r.entityId,
      relationLabel: r.relationLabel ?? null,
    }));
  await prisma.blogPostRelation.createMany({ data });
}

// =============================================================================
// Author CRUD
// =============================================================================

export interface CreateAuthorInput {
  name: string;
  slug?: string;
  role?: string;
  bio?: string;
  avatarUrl?: string;
  links?: Record<string, string>;
}

export async function listAuthors() {
  return prisma.author.findMany({ orderBy: { name: 'asc' } });
}

export async function createAuthor(input: CreateAuthorInput) {
  const slug = input.slug ?? slugify(input.name);
  return prisma.author.create({
    data: {
      slug,
      name: input.name,
      role: input.role ?? null,
      bio: input.bio ?? null,
      avatarUrl: input.avatarUrl ?? null,
      links: JSON.stringify(input.links ?? {}),
    },
  });
}

export async function updateAuthor(id: string, patch: Partial<CreateAuthorInput>) {
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.slug !== undefined) data.slug = patch.slug;
  if (patch.role !== undefined) data.role = patch.role;
  if (patch.bio !== undefined) data.bio = patch.bio;
  if (patch.avatarUrl !== undefined) data.avatarUrl = patch.avatarUrl;
  if (patch.links !== undefined) data.links = JSON.stringify(patch.links);
  return prisma.author.update({ where: { id }, data });
}

export async function getOrCreateDefaultAuthor(): Promise<{ id: string; slug: string }> {
  const existing = await prisma.author.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true, slug: true },
  });
  if (existing) return existing;
  const created = await prisma.author.create({
    data: {
      slug: 'wylie-brown',
      name: 'Wylie Brown',
      role: 'Editor',
      bio: 'Builder of LAEA.',
      links: JSON.stringify({}),
    },
    select: { id: true, slug: true },
  });
  return created;
}

// =============================================================================
// S3 presigned upload URLs (for cover + inline images)
// =============================================================================

export interface PresignedUploadResult {
  uploadUrl: string; // PUT here
  publicUrl: string; // final URL served from CloudFront
  key: string;
}

/**
 * Returns a presigned PUT URL for blog-uploads/{yyyy}/{mm}/{uuid}.{ext}.
 * Caller streams the raw file bytes with matching Content-Type.
 */
export async function getPresignedUploadUrl(
  filename: string,
  contentType: string
): Promise<PresignedUploadResult> {
  const safeExt = (filename.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const key = `${BLOG_UPLOAD_PREFIX}/${yyyy}/${mm}/${randomUUID()}.${safeExt || 'bin'}`;

  const command = new PutObjectCommand({
    Bucket: BLOG_UPLOAD_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getS3(), command, { expiresIn: 60 * 5 });
  // The frontend bucket is served via the main CloudFront distribution, so the public
  // URL mirrors the S3 key under the site origin.
  const publicUrl = `https://letaiexplainai.com/${key}`;

  return { uploadUrl, publicUrl, key };
}

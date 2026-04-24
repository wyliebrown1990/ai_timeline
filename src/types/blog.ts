/**
 * Blog & Editorial Types
 * Sprint Blog-1 — Data Model & API Foundation
 *
 * Contract for /api/blog and /api/admin/blog responses. bodyMarkdown is source of truth.
 */

import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

export const BlogPostStatusEnum = z.enum(['draft', 'scheduled', 'published', 'archived']);
export type BlogPostStatus = z.infer<typeof BlogPostStatusEnum>;

export const BlogRelationEntityTypeEnum = z.enum([
  'milestone',
  'person',
  'organization',
  'glossary_term',
]);
export type BlogRelationEntityType = z.infer<typeof BlogRelationEntityTypeEnum>;

// =============================================================================
// Author
// =============================================================================

export const AuthorLinksSchema = z
  .object({
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().optional(),
  })
  .partial();

export type AuthorLinks = z.infer<typeof AuthorLinksSchema>;

export const AuthorSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  role: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  links: AuthorLinksSchema.default({}),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export type Author = z.infer<typeof AuthorSchema>;

// =============================================================================
// Blog post — full + list item
// =============================================================================

export const BlogPostSubjectSchema = z.object({
  subjectId: z.string(),
  slug: z.string(),
  name: z.string(),
  isPrimary: z.boolean(),
});

export const BlogPostRelationSchema = z.object({
  entityType: BlogRelationEntityTypeEnum,
  entityId: z.string(),
  relationLabel: z.string().nullable().optional(),
  // Hydrated snapshot of the entity — optional; controllers may include for convenience.
  entity: z
    .object({
      title: z.string().optional(),
      slug: z.string().optional(),
      imageUrl: z.string().nullable().optional(),
    })
    .optional(),
});

export const BlogPostListItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  excerpt: z.string(),
  coverImageUrl: z.string().nullable().optional(),
  status: BlogPostStatusEnum,
  publishedAt: z.string().or(z.date()).nullable().optional(),
  readingMinutes: z.number().int(),
  tags: z.array(z.string()),
  featured: z.boolean(),
  author: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable().optional(),
  }),
  subjects: z.array(BlogPostSubjectSchema).default([]),
});

export type BlogPostListItem = z.infer<typeof BlogPostListItemSchema>;

export const BlogPostSchema = BlogPostListItemSchema.extend({
  bodyMarkdown: z.string(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  scheduledFor: z.string().or(z.date()).nullable().optional(),
  viewCount: z.number().int(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  relations: z.array(BlogPostRelationSchema).default([]),
});

export type BlogPost = z.infer<typeof BlogPostSchema>;

// =============================================================================
// Admin request schemas
// =============================================================================

export const CreateBlogPostRequestSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be kebab-case')
    .max(80)
    .optional(),
  subtitle: z.string().max(300).optional(),
  excerpt: z.string().min(1).max(500),
  bodyMarkdown: z.string().min(1),
  coverImageUrl: z.string().url().optional(),
  authorId: z.string().optional(), // falls back to default author in service
  tags: z.array(z.string()).optional().default([]),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  canonicalUrl: z.string().url().optional(),
  featured: z.boolean().optional().default(false),
  subjectIds: z.array(z.string()).optional().default([]),
  primarySubjectId: z.string().optional(),
  relations: z
    .array(
      z.object({
        entityType: BlogRelationEntityTypeEnum,
        entityId: z.string(),
        relationLabel: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export type CreateBlogPostRequest = z.infer<typeof CreateBlogPostRequestSchema>;

export const UpdateBlogPostRequestSchema = CreateBlogPostRequestSchema.partial().extend({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case')
    .optional(),
});

export type UpdateBlogPostRequest = z.infer<typeof UpdateBlogPostRequestSchema>;

export const SchedulePostRequestSchema = z.object({
  scheduledFor: z.string().datetime(),
});

export const BlogListParamsSchema = z.object({
  tag: z.string().optional(),
  subjectSlug: z.string().optional(),
  authorSlug: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(50).optional().default(12),
});

export type BlogListParams = z.infer<typeof BlogListParamsSchema>;

export const BlogListResponseSchema = z.object({
  posts: z.array(BlogPostListItemSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
});

export type BlogListResponse = z.infer<typeof BlogListResponseSchema>;

/**
 * Admin Blog controller
 * Sprint Blog-1 — Data Model & API Foundation
 *
 * Admin-only CRUD for BlogPost + Author + presigned S3 upload URLs. JWT-gated at the route layer.
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as blogAdminService from '../services/blogAdmin';
import {
  CreateBlogPostRequestSchema,
  UpdateBlogPostRequestSchema,
  SchedulePostRequestSchema,
} from '../../../src/types/blog';

const UploadUrlRequestSchema = z.object({
  filename: z.string().min(1).max(260),
  contentType: z.string().min(1).max(120),
});

const CreateAuthorRequestSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  role: z.string().max(120).optional(),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  links: z.record(z.string(), z.string()).optional(),
});

const UpdateAuthorRequestSchema = CreateAuthorRequestSchema.partial();

// =============================================================================
// Posts
// =============================================================================

export async function listPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, authorId, q, page, pageSize } = req.query;
    const result = await blogAdminService.listAllPosts({
      status: typeof status === 'string' ? status : undefined,
      authorId: typeof authorId === 'string' ? authorId : undefined,
      q: typeof q === 'string' ? q : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPost(req: Request, res: Response, next: NextFunction) {
  try {
    const post = await blogAdminService.getPostById(req.params.id);
    if (!post) throw ApiError.notFound('Blog post not found');
    res.json({ post });
  } catch (error) {
    next(error);
  }
}

export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateBlogPostRequestSchema.parse(req.body);
    const authorId = input.authorId ?? (await blogAdminService.getOrCreateDefaultAuthor()).id;
    const post = await blogAdminService.createDraft(
      {
        title: input.title,
        subtitle: input.subtitle,
        excerpt: input.excerpt,
        bodyMarkdown: input.bodyMarkdown,
        coverImageUrl: input.coverImageUrl,
        tags: input.tags,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        canonicalUrl: input.canonicalUrl,
        featured: input.featured,
        subjectIds: input.subjectIds,
        primarySubjectId: input.primarySubjectId,
        relations: input.relations,
      },
      authorId
    );
    res.status(201).json({ post });
  } catch (error) {
    next(error);
  }
}

export async function updatePost(req: Request, res: Response, next: NextFunction) {
  try {
    const patch = UpdateBlogPostRequestSchema.parse(req.body);
    const post = await blogAdminService.updatePost(req.params.id, patch);
    if (!post) throw ApiError.notFound('Blog post not found');
    res.json({ post });
  } catch (error) {
    next(error);
  }
}

export async function publishPost(req: Request, res: Response, next: NextFunction) {
  try {
    const post = await blogAdminService.publishPost(req.params.id);
    if (!post) throw ApiError.notFound('Blog post not found');
    res.json({ post });
  } catch (error) {
    next(error);
  }
}

export async function schedulePost(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduledFor } = SchedulePostRequestSchema.parse(req.body);
    const post = await blogAdminService.schedulePost(req.params.id, new Date(scheduledFor));
    if (!post) throw ApiError.notFound('Blog post not found');
    res.json({ post });
  } catch (error) {
    next(error);
  }
}

export async function archivePost(req: Request, res: Response, next: NextFunction) {
  try {
    const post = await blogAdminService.archivePost(req.params.id);
    if (!post) throw ApiError.notFound('Blog post not found');
    res.json({ post });
  } catch (error) {
    next(error);
  }
}

export async function deletePost(req: Request, res: Response, next: NextFunction) {
  try {
    await blogAdminService.deletePost(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Mint a 30-minute signed token the editor can embed in a preview URL
 * (`/blog/:slug?preview=TOKEN`). Validated server-side by the public
 * getPostBySlug controller. Scoped to a single post so a leaked token
 * can't be used to read other drafts.
 */
export async function getPreviewToken(req: Request, res: Response, next: NextFunction) {
  try {
    const post = await blogAdminService.getPostById(req.params.id);
    if (!post) throw ApiError.notFound('Blog post not found');

    const secret = process.env.JWT_SECRET;
    if (!secret) throw ApiError.internal('JWT secret not configured');

    const token = jwt.sign(
      { postId: post.id, kind: 'blog-preview' },
      secret,
      { expiresIn: '30m' }
    );
    res.json({
      token,
      previewUrl: `/blog/${post.slug}?preview=${token}`,
      expiresInSeconds: 30 * 60,
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Uploads
// =============================================================================

export async function getUploadUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { filename, contentType } = UploadUrlRequestSchema.parse(req.body);
    const result = await blogAdminService.getPresignedUploadUrl(filename, contentType);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Authors
// =============================================================================

export async function listAuthors(_req: Request, res: Response, next: NextFunction) {
  try {
    const authors = await blogAdminService.listAuthors();
    res.json({ authors });
  } catch (error) {
    next(error);
  }
}

export async function createAuthor(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateAuthorRequestSchema.parse(req.body);
    const author = await blogAdminService.createAuthor(input);
    res.status(201).json({ author });
  } catch (error) {
    next(error);
  }
}

export async function updateAuthor(req: Request, res: Response, next: NextFunction) {
  try {
    const patch = UpdateAuthorRequestSchema.parse(req.body);
    const author = await blogAdminService.updateAuthor(req.params.id, patch);
    res.json({ author });
  } catch (error) {
    next(error);
  }
}

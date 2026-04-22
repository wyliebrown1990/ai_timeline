/**
 * Public Blog controller
 * Sprint Blog-1 — Data Model & API Foundation
 *
 * Handles /api/blog, /api/blog/:slug, /api/blog/related, /api/authors/:slug, and /api/blog/rss.xml.
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../middleware/error';
import * as blogService from '../services/blog';
import { BlogListParamsSchema } from '../../../src/types/blog';

const SITE_URL = 'https://letaiexplainai.com';

function serializeListItem(post: blogService.PublicBlogPostListItem) {
  return {
    ...post,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
  };
}

function serializePost(post: blogService.PublicBlogPost) {
  return {
    ...post,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    scheduledFor: post.scheduledFor ? post.scheduledFor.toISOString() : null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export async function listPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const params = BlogListParamsSchema.parse(req.query);
    const result = await blogService.listPublishedPosts(params);
    res.json({
      posts: result.posts.map(serializeListItem),
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

interface PreviewClaims {
  postId: string;
  kind: 'blog-preview';
  iat: number;
  exp: number;
}

/** Verify the opaque preview token was signed by our JWT secret and not expired. */
function verifyPreviewToken(token: string): PreviewClaims | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const payload = jwt.verify(token, secret) as unknown as PreviewClaims;
    if (payload.kind !== 'blog-preview') return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getPostBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const previewToken = typeof req.query.preview === 'string' ? req.query.preview : null;

    if (previewToken) {
      const claims = verifyPreviewToken(previewToken);
      if (!claims) throw ApiError.notFound('Blog post not found');
      const post = await blogService.getPostBySlugForPreview(slug);
      if (!post || post.id !== claims.postId) {
        throw ApiError.notFound('Blog post not found');
      }
      res.set('X-Robots-Tag', 'noindex, nofollow');
      res.json({ post: serializePost(post), preview: true });
      return;
    }

    const post = await blogService.getPublishedPostBySlug(slug);
    if (!post) throw ApiError.notFound('Blog post not found');
    res.json({ post: serializePost(post) });
  } catch (error) {
    next(error);
  }
}

export async function getRelated(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.query;
    if (typeof slug !== 'string' || !slug) {
      throw ApiError.badRequest('slug query param is required');
    }
    const anchor = await blogService.getPublishedPostBySlug(slug);
    if (!anchor) throw ApiError.notFound('Blog post not found');
    const related = await blogService.getRelatedPosts(anchor.id, 3);
    res.json({ posts: related.map(serializeListItem) });
  } catch (error) {
    next(error);
  }
}

const VALID_ENTITY_TYPES = new Set([
  'milestone',
  'person',
  'organization',
  'glossary_term',
  'subject',
]);

export async function getPostsForEntity(req: Request, res: Response, next: NextFunction) {
  try {
    const type = typeof req.query.type === 'string' ? req.query.type : '';
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 3;
    const limit = Math.min(10, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 3));

    if (!VALID_ENTITY_TYPES.has(type) || !id) {
      throw ApiError.badRequest('type and id are required; type must be one of milestone|person|organization|glossary_term|subject');
    }

    const posts = await blogService.getPostsForEntity(
      type as Parameters<typeof blogService.getPostsForEntity>[0],
      id,
      limit
    );
    res.json({ posts: posts.map(serializeListItem) });
  } catch (error) {
    next(error);
  }
}

export async function getAuthor(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const author = await blogService.getAuthorBySlug(slug);
    if (!author) throw ApiError.notFound('Author not found');
    // Also pull their published posts.
    const posts = await blogService.listPublishedPosts({ authorSlug: slug, pageSize: 20 });
    res.json({
      author: {
        ...author,
        createdAt: author.createdAt.toISOString(),
        updatedAt: author.updatedAt.toISOString(),
      },
      posts: posts.posts.map(serializeListItem),
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// RSS 2.0 feed
// =============================================================================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function rssFeed(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await blogService.listPublishedPosts({ pageSize: 20 });
    const now = new Date().toUTCString();

    const items = result.posts
      .map((p) => {
        const link = `${SITE_URL}/blog/${p.slug}`;
        const pubDate = p.publishedAt ? new Date(p.publishedAt).toUTCString() : now;
        // Tag chips + subject names both surface as <category> — feed readers
        // surface these as topic chips / filters.
        const categories = [
          ...p.tags.map((t) => t),
          ...p.subjects.map((s) => s.name),
        ].map((c) => `      <category>${escapeXml(c)}</category>`);
        return [
          '    <item>',
          `      <title>${escapeXml(p.title)}</title>`,
          `      <link>${escapeXml(link)}</link>`,
          `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
          `      <pubDate>${pubDate}</pubDate>`,
          `      <description>${escapeXml(p.excerpt)}</description>`,
          `      <dc:creator>${escapeXml(p.author.name)}</dc:creator>`,
          ...categories,
          '    </item>',
        ].join('\n');
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LAEA Editorial — letaiexplainai.com</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/api/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Longform essays, explainers, and retrospectives from the AI Timeline Atlas.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
${items}
  </channel>
</rss>
`;

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=600');
    res.send(xml);
  } catch (error) {
    next(error);
  }
}

/**
 * Explained Page Controller
 * Sprint SEO-4 Task 3 - "X Explained" Deep-Dive Pages
 *
 * Handles API requests for explained pages.
 */

import { Request, Response } from 'express';
import { getExplainedPageData, getExplainedPageList } from '../services/explained';

/**
 * GET /api/explained/:slug
 * Get explained page data for a glossary term
 */
export async function getExplainedPage(req: Request, res: Response) {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    const data = await getExplainedPageData(slug);

    if (!data) {
      return res.status(404).json({
        error: 'Term not found',
        slug,
      });
    }

    // Add canonical URL
    const canonicalUrl = `https://letaiexplainai.com/explained/${data.slug || slug}`;

    return res.json({
      ...data,
      canonicalUrl,
    });
  } catch (error) {
    console.error('[ExplainedController] Error getting explained page:', error);
    return res.status(500).json({ error: 'Failed to get explained page data' });
  }
}

/**
 * GET /api/explained
 * Get list of all explained pages (for hub page and sitemap)
 */
export async function getExplainedList(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 100;

    const pages = await getExplainedPageList();

    return res.json({
      count: pages.length,
      pages: pages.slice(0, limit).map((p) => ({
        slug: p.slug,
        term: p.term,
        url: `/explained/${p.slug}`,
        lastmod: p.updatedAt.toISOString().split('T')[0],
      })),
    });
  } catch (error) {
    console.error('[ExplainedController] Error getting explained list:', error);
    return res.status(500).json({ error: 'Failed to get explained list' });
  }
}

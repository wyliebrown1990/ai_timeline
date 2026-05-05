/**
 * Who Invented Controller
 * Sprint SEO-4 Task 5 - "Who Invented X?" Pages
 *
 * Handles API requests for who-invented pages.
 */

import type { Request, Response } from 'express';
import { getWhoInventedPageData, getWhoInventedList } from '../services/whoInvented';

/**
 * GET /api/who-invented/:slug
 * Get who-invented page data for a glossary term
 */
export async function getWhoInventedPage(req: Request, res: Response) {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    const data = await getWhoInventedPageData(slug);

    if (!data) {
      return res.status(404).json({
        error: 'Term not found',
        slug,
      });
    }

    // Add canonical URL
    const canonicalUrl = `https://letaiexplainai.com/who-invented/${data.slug || slug}`;

    return res.json({
      ...data,
      canonicalUrl,
    });
  } catch (error) {
    console.error('[WhoInventedController] Error getting who-invented page:', error);
    return res.status(500).json({ error: 'Failed to get who-invented page data' });
  }
}

/**
 * GET /api/who-invented
 * Get list of all who-invented pages (for hub page and sitemap)
 */
export async function getWhoInventedListHandler(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 200;

    const pages = await getWhoInventedList();

    return res.json({
      count: pages.length,
      pages: pages.slice(0, limit).map((p) => ({
        slug: p.slug,
        term: p.term,
        shortDefinition: p.shortDefinition,
        url: `/who-invented/${p.slug}`,
        inventorCount: p.inventorCount,
        hasInventors: p.hasInventors,
      })),
    });
  } catch (error) {
    console.error('[WhoInventedController] Error getting who-invented list:', error);
    return res.status(500).json({ error: 'Failed to get who-invented list' });
  }
}

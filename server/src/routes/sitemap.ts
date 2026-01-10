/**
 * Dynamic Sitemap Generator
 *
 * Generates sitemap.xml dynamically from database content.
 * Includes all static pages and dynamic content (learning paths).
 */

import { Router } from 'express';
import { prisma } from '../db';

const router = Router();

const BASE_URL = 'https://letaiexplainai.com';

interface SitemapUrl {
  loc: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  lastmod?: string;
}

/**
 * Generate XML for a single URL entry
 */
function urlToXml(url: SitemapUrl): string {
  let xml = `  <url>\n    <loc>${url.loc}</loc>\n`;
  if (url.lastmod) {
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
  }
  xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
  xml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
  xml += `  </url>`;
  return xml;
}

/**
 * GET /api/sitemap.xml
 * Returns dynamically generated sitemap
 */
router.get('/', async (_req, res) => {
  try {
    const urls: SitemapUrl[] = [];
    const now = new Date().toISOString().split('T')[0];

    // Static pages
    urls.push(
      { loc: `${BASE_URL}/`, changefreq: 'weekly', priority: 1.0, lastmod: now },
      { loc: `${BASE_URL}/timeline`, changefreq: 'weekly', priority: 0.9, lastmod: now },
      { loc: `${BASE_URL}/learn`, changefreq: 'weekly', priority: 0.9, lastmod: now },
      { loc: `${BASE_URL}/news`, changefreq: 'daily', priority: 0.8, lastmod: now },
      { loc: `${BASE_URL}/glossary`, changefreq: 'weekly', priority: 0.8, lastmod: now },
      { loc: `${BASE_URL}/study`, changefreq: 'weekly', priority: 0.7 },
      { loc: `${BASE_URL}/study/stats`, changefreq: 'weekly', priority: 0.5 },
      { loc: `${BASE_URL}/settings`, changefreq: 'monthly', priority: 0.3 }
    );

    // Dynamic: Learning paths
    const learningPaths = await prisma.learningPath.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
      orderBy: { sortOrder: 'asc' },
    });

    for (const path of learningPaths) {
      urls.push({
        loc: `${BASE_URL}/learn/${path.slug}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: path.updatedAt.toISOString().split('T')[0],
      });
    }

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(urlToXml).join('\n')}
</urlset>
`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(xml);
  } catch (error) {
    console.error('[Sitemap] Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;

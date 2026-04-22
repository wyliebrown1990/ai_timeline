/**
 * Dynamic Sitemap Generator
 *
 * Generates sitemap.xml dynamically from database content.
 * Includes all static pages and dynamic content (learning paths).
 */

import { Router } from 'express';
import { prisma } from '../db';
import { getComparisonPairs, ComparisonEntityType } from '../services/comparison';

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

    // Static pages - Timeline gets highest priority for SEO targeting
    urls.push(
      { loc: `${BASE_URL}/`, changefreq: 'weekly', priority: 1.0, lastmod: now },
      { loc: `${BASE_URL}/timeline`, changefreq: 'daily', priority: 1.0, lastmod: now }, // Highest priority - main target
      { loc: `${BASE_URL}/learn`, changefreq: 'weekly', priority: 0.9, lastmod: now },
      { loc: `${BASE_URL}/news`, changefreq: 'daily', priority: 0.8, lastmod: now },
      { loc: `${BASE_URL}/feed`, changefreq: 'daily', priority: 0.8, lastmod: now },
      { loc: `${BASE_URL}/glossary`, changefreq: 'weekly', priority: 0.8, lastmod: now },
      { loc: `${BASE_URL}/study`, changefreq: 'weekly', priority: 0.7 },
      { loc: `${BASE_URL}/study/stats`, changefreq: 'weekly', priority: 0.5 },
      { loc: `${BASE_URL}/settings`, changefreq: 'monthly', priority: 0.3 }
    );

    // Company-specific timeline pages (Sprint TD-2 - SEO landing pages)
    const companyTimelines = ['openai', 'anthropic', 'google', 'meta'];
    for (const company of companyTimelines) {
      urls.push({
        loc: `${BASE_URL}/timeline/${company}`,
        changefreq: 'weekly',
        priority: 0.9,
        lastmod: now,
      });
    }

    // Category-specific timeline pages (Sprint TD-2)
    const categoryTimelines = ['generative-ai', 'llm', 'models', 'complete-history'];
    for (const category of categoryTimelines) {
      urls.push({
        loc: `${BASE_URL}/timeline/${category}`,
        changefreq: 'weekly',
        priority: 0.9,
        lastmod: now,
      });
    }

    // Era landing pages (Sprint SEO-3)
    const eras = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
    for (const era of eras) {
      urls.push({
        loc: `${BASE_URL}/timeline/${era}`,
        changefreq: 'monthly',
        priority: 0.8,
        lastmod: now,
      });
    }

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

    // Dynamic: Persons (key AI figures)
    const persons = await prisma.person.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { canonicalName: 'asc' },
    });

    for (const person of persons) {
      urls.push({
        loc: `${BASE_URL}/people/${person.slug}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: person.updatedAt.toISOString().split('T')[0],
      });
    }

    // Dynamic: Organizations (AI companies, labs, universities)
    const organizations = await prisma.organization.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { name: 'asc' },
    });

    for (const org of organizations) {
      urls.push({
        loc: `${BASE_URL}/organizations/${org.slug}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: org.updatedAt.toISOString().split('T')[0],
      });
    }

    // Dynamic: Glossary terms (Sprint SEO-3: use dedicated slug URLs)
    const glossaryTerms = await prisma.glossaryTerm.findMany({
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { term: 'asc' },
    });

    for (const term of glossaryTerms) {
      // Use slug URL if available, fallback to query param for unmigrated terms
      const termUrl = term.slug
        ? `${BASE_URL}/glossary/${term.slug}`
        : `${BASE_URL}/glossary?term=${term.id}`;
      urls.push({
        loc: termUrl,
        changefreq: 'monthly',
        priority: 0.6,
        lastmod: term.updatedAt.toISOString().split('T')[0],
      });
    }

    // Dynamic: Comparison pages (Sprint SEO-4)
    // Generate comparison URLs for persons and terms
    const comparisonTypes: ComparisonEntityType[] = ['person', 'term'];
    for (const type of comparisonTypes) {
      try {
        const pairs = await getComparisonPairs(type, 50); // Top 50 pairs per type
        for (const pair of pairs) {
          urls.push({
            loc: `${BASE_URL}/compare/${type}/${pair.slugA}-vs-${pair.slugB}`,
            changefreq: 'monthly',
            priority: 0.5,
            lastmod: now,
          });
        }
      } catch (err) {
        console.log(`[Sitemap] Could not generate ${type} comparisons:`, err);
      }
    }

    // Dynamic: Explained pages (Sprint SEO-4)
    // "X Explained" deep-dive pages for glossary terms with slugs
    for (const term of glossaryTerms) {
      if (term.slug) {
        urls.push({
          loc: `${BASE_URL}/explained/${term.slug}`,
          changefreq: 'monthly',
          priority: 0.6,
          lastmod: term.updatedAt.toISOString().split('T')[0],
        });
      }
    }

    // Dynamic: Event pages (Sprint SEO-4)
    // Milestone event pages with full narratives
    const milestones = await prisma.milestone.findMany({
      select: { id: true, updatedAt: true, significance: true },
      orderBy: { date: 'desc' },
      take: 500, // Limit to most recent 500 milestones
    });

    for (const milestone of milestones) {
      // Higher significance milestones get higher priority
      const priority = milestone.significance >= 3 ? 0.7 : 0.5;
      urls.push({
        loc: `${BASE_URL}/events/${milestone.id}`,
        changefreq: 'monthly',
        priority,
        lastmod: milestone.updatedAt.toISOString().split('T')[0],
      });
    }

    // Dynamic: Who Invented pages (Sprint SEO-4)
    // "Who Invented X?" pages for glossary terms with slugs
    for (const term of glossaryTerms) {
      if (term.slug) {
        urls.push({
          loc: `${BASE_URL}/who-invented/${term.slug}`,
          changefreq: 'monthly',
          priority: 0.5,
          lastmod: term.updatedAt.toISOString().split('T')[0],
        });
      }
    }

    // Blog index + published posts (Sprint Blog-1)
    urls.push({
      loc: `${BASE_URL}/blog`,
      changefreq: 'daily',
      priority: 0.9,
      lastmod: now,
    });

    const blogPosts = await prisma.blogPost.findMany({
      where: {
        status: 'published',
        publishedAt: { lte: new Date() },
      },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    });

    for (const post of blogPosts) {
      const lastmod = (post.publishedAt ?? post.updatedAt).toISOString().split('T')[0];
      urls.push({
        loc: `${BASE_URL}/blog/${post.slug}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod,
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

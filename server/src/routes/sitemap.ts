/**
 * Dynamic Sitemap Generator
 *
 * Generates sitemap.xml dynamically from database content.
 * Includes all static pages and dynamic content (learning paths).
 */

import { Router } from 'express';
import { prisma } from '../db';
import type { ComparisonEntityType } from '../services/comparison';
import { getComparisonPairs } from '../services/comparison';

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

    // Weekly news quiz parent page (Sprint Quiz-1).
    // /news/quiz/:id historical retake URLs are deliberately excluded — those pages
    // ship with noindex per AISEOReview to avoid thin-programmatic-content risk.
    const latestQuiz = await prisma.newsQuiz.findFirst({
      orderBy: { weekOf: 'desc' },
      select: { weekOf: true },
    });
    const quizLastmod = latestQuiz
      ? latestQuiz.weekOf.toISOString().split('T')[0]
      : now;

    // Static pages - Timeline gets highest priority for SEO targeting
    urls.push(
      { loc: `${BASE_URL}/`, changefreq: 'weekly', priority: 1.0, lastmod: now },
      { loc: `${BASE_URL}/timeline`, changefreq: 'daily', priority: 1.0, lastmod: now }, // Highest priority - main target
      { loc: `${BASE_URL}/learn`, changefreq: 'weekly', priority: 0.9, lastmod: now },
      { loc: `${BASE_URL}/news`, changefreq: 'daily', priority: 0.8, lastmod: now },
      { loc: `${BASE_URL}/news/quiz`, changefreq: 'weekly', priority: 0.7, lastmod: quizLastmod },
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

    // People hub
    urls.push({
      loc: `${BASE_URL}/people`,
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: now,
    });

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

    // Dynamic: Subject pages (Sprint SEO - indexing fix)
    const subjects = await prisma.subject.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { name: 'asc' },
    });

    for (const subject of subjects) {
      urls.push({
        loc: `${BASE_URL}/subjects/${subject.slug}`,
        changefreq: 'weekly',
        priority: 0.6,
        lastmod: subject.updatedAt.toISOString().split('T')[0],
      });
    }

    // Dynamic: News detail pages (Sprint SEO - indexing fix)
    const newsEvents = await prisma.currentEvent.findMany({
      where: { isPublished: true },
      select: { id: true, updatedAt: true },
      orderBy: { publishedDate: 'desc' },
      take: 500, // Limit to most recent 500 news items
    });

    for (const news of newsEvents) {
      urls.push({
        loc: `${BASE_URL}/news/${news.id}`,
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: news.updatedAt.toISOString().split('T')[0],
      });
    }

    // Static: Year report pages (Sprint SEO - indexing fix)
    const reportYears = [2025, 2024, 2023, 2022, 2021, 2020, 2019];
    for (const year of reportYears) {
      urls.push({
        loc: `${BASE_URL}/reports/${year}`,
        changefreq: 'yearly',
        priority: 0.5,
        lastmod: now,
      });
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
      select: { slug: true, publishedAt: true, updatedAt: true, tags: true, authorId: true },
      orderBy: { publishedAt: 'desc' },
    });

    for (const post of blogPosts) {
      const lastmod = post.updatedAt.toISOString().split('T')[0];
      urls.push({
        loc: `${BASE_URL}/blog/${post.slug}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod,
      });
    }

    // Tag archives — only tags with ≥3 posts. Blog-5 SEO rule: thinner tag
    // archives stay out of the sitemap (and carry noIndex on the page itself).
    const tagCounts = new Map<string, number>();
    for (const post of blogPosts) {
      try {
        const parsed = JSON.parse(post.tags ?? '[]') as unknown;
        if (!Array.isArray(parsed)) continue;
        for (const t of parsed) {
          if (typeof t !== 'string') continue;
          tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
        }
      } catch {
        // Malformed tag JSON — skip this post's tags silently, not a sitemap error.
      }
    }
    for (const [tag, count] of tagCounts) {
      if (count < 3) continue;
      urls.push({
        loc: `${BASE_URL}/blog/tag/${encodeURIComponent(tag)}`,
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: now,
      });
    }

    // Author archives — only authors with ≥1 post. Empty-archive pages are
    // also noIndex'd by the page itself, but keeping them out of the sitemap
    // avoids wasting Googlebot's crawl budget.
    const authorPostCounts = new Map<string, number>();
    for (const post of blogPosts) {
      authorPostCounts.set(post.authorId, (authorPostCounts.get(post.authorId) ?? 0) + 1);
    }
    if (authorPostCounts.size > 0) {
      const authors = await prisma.author.findMany({
        where: { id: { in: [...authorPostCounts.keys()] } },
        select: { slug: true, updatedAt: true },
      });
      for (const a of authors) {
        urls.push({
          loc: `${BASE_URL}/blog/author/${a.slug}`,
          changefreq: 'monthly',
          priority: 0.5,
          lastmod: a.updatedAt.toISOString().split('T')[0],
        });
      }
    }

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(urlToXml).join('\n')}
</urlset>
`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=1800'); // Cache for 30 minutes
    res.send(xml);
  } catch (error) {
    console.error('[Sitemap] Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;

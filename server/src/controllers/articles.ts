/**
 * Articles Controller
 *
 * Handles article analysis and management endpoints.
 */

import { Request, Response } from 'express';
import { prisma } from '../db';
import { analyzeArticle, analyzeAllPending } from '../services/ingestion/articleAnalyzer';
import { scrapeUrl } from '../services/scraper/urlScraper';

/**
 * Get a single article with its drafts
 */
export async function getArticle(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const article = await prisma.ingestedArticle.findUnique({
      where: { id },
      include: {
        source: true,
        drafts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Prepare drafts for response - draftData is already an object (PostgreSQL Json type)
    const articlesWithParsedDrafts = {
      ...article,
      drafts: article.drafts.map((draft) => ({
        ...draft,
        draftData: draft.draftData, // Already an object from PostgreSQL Json type
        validationErrors: draft.validationErrors ? JSON.parse(draft.validationErrors) : null,
      })),
    };

    return res.json(articlesWithParsedDrafts);
  } catch (error) {
    console.error('Error getting article:', error);
    return res.status(500).json({ error: 'Failed to get article' });
  }
}

/**
 * Analyze a single article
 */
export async function analyzeOne(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check article exists
    const article = await prisma.ingestedArticle.findUnique({
      where: { id },
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Check if already analyzed
    if (article.analysisStatus === 'complete') {
      return res.status(400).json({ error: 'Article already analyzed' });
    }

    // Check if currently being analyzed
    if (article.analysisStatus === 'screening' || article.analysisStatus === 'generating') {
      return res.status(400).json({ error: 'Article is currently being analyzed' });
    }

    // Run analysis
    const result = await analyzeArticle(id);

    return res.json({
      message: 'Analysis complete',
      articleId: id,
      screening: {
        relevanceScore: result.screening.relevanceScore,
        isMilestoneWorthy: result.screening.isMilestoneWorthy,
        suggestedCategory: result.screening.suggestedCategory,
      },
      draftsCreated: result.draftsCreated,
    });
  } catch (error) {
    console.error('Error analyzing article:', error);
    return res.status(500).json({
      error: 'Failed to analyze article',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Analyze all pending articles (with limit)
 */
export async function analyzePending(req: Request, res: Response) {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const result = await analyzeAllPending(limit);

    return res.json({
      message: `Analyzed ${result.analyzed} articles with ${result.errors} errors`,
      analyzed: result.analyzed,
      errors: result.errors,
      results: result.results,
    });
  } catch (error) {
    console.error('Error analyzing pending articles:', error);
    return res.status(500).json({
      error: 'Failed to analyze pending articles',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get analysis statistics
 */
export async function getAnalysisStats(req: Request, res: Response) {
  try {
    const [pending, screening, complete, error, milestoneWorthy, totalDrafts] = await Promise.all([
      prisma.ingestedArticle.count({ where: { analysisStatus: 'pending' } }),
      prisma.ingestedArticle.count({
        where: { analysisStatus: { in: ['screening', 'generating'] } },
      }),
      prisma.ingestedArticle.count({ where: { analysisStatus: 'complete' } }),
      prisma.ingestedArticle.count({ where: { analysisStatus: 'error' } }),
      prisma.ingestedArticle.count({ where: { isMilestoneWorthy: true } }),
      prisma.contentDraft.count(),
    ]);

    const draftsByType = await prisma.contentDraft.groupBy({
      by: ['contentType'],
      _count: true,
    });

    const draftsByStatus = await prisma.contentDraft.groupBy({
      by: ['status'],
      _count: true,
    });

    return res.json({
      articles: {
        pending,
        analyzing: screening,
        complete,
        error,
        milestoneWorthy,
      },
      drafts: {
        total: totalDrafts,
        byType: Object.fromEntries(draftsByType.map((d) => [d.contentType, d._count])),
        byStatus: Object.fromEntries(draftsByStatus.map((d) => [d.status, d._count])),
      },
    });
  } catch (error) {
    console.error('Error getting analysis stats:', error);
    return res.status(500).json({ error: 'Failed to get analysis stats' });
  }
}

/**
 * Get drafts for an article
 */
export async function getArticleDrafts(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const drafts = await prisma.contentDraft.findMany({
      where: { articleId: id },
      orderBy: { createdAt: 'desc' },
    });

    // draftData is already an object (PostgreSQL Json type)
    const parsedDrafts = drafts.map((draft) => ({
      ...draft,
      draftData: draft.draftData, // Already an object from PostgreSQL Json type
      validationErrors: draft.validationErrors ? JSON.parse(draft.validationErrors) : null,
    }));

    return res.json(parsedDrafts);
  } catch (error) {
    console.error('Error getting article drafts:', error);
    return res.status(500).json({ error: 'Failed to get article drafts' });
  }
}

/**
 * Submit an article manually (paste content + source URL)
 * Creates an IngestedArticle without a NewsSource and optionally triggers analysis
 */
export async function submitArticle(req: Request, res: Response) {
  try {
    const { sourceUrl, title, content, analyzeImmediately = true } = req.body;

    // Validate required fields
    if (!sourceUrl || typeof sourceUrl !== 'string') {
      return res.status(400).json({ error: 'sourceUrl is required' });
    }
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required' });
    }

    // Check for duplicate by URL
    const existing = await prisma.ingestedArticle.findUnique({
      where: { externalUrl: sourceUrl },
    });
    if (existing) {
      return res.status(409).json({
        error: 'Article with this URL already exists',
        existingId: existing.id,
      });
    }

    // Create the article (sourceId is null for manual submissions)
    const article = await prisma.ingestedArticle.create({
      data: {
        externalUrl: sourceUrl,
        title: title || 'Manual Submission',
        content: content,
        publishedAt: new Date(),
        analysisStatus: 'pending',
        // sourceId is null - indicates manual submission
      },
    });

    let analysisResult = null;
    let drafts: Array<{ id: string; contentType: string }> = [];

    // Optionally run analysis immediately
    if (analyzeImmediately) {
      try {
        analysisResult = await analyzeArticle(article.id);

        // Fetch created drafts
        const createdDrafts = await prisma.contentDraft.findMany({
          where: { articleId: article.id },
          select: { id: true, contentType: true },
        });
        drafts = createdDrafts;
      } catch (analysisError) {
        console.error('Analysis failed:', analysisError);
        // Article was created, just analysis failed
        return res.status(200).json({
          success: true,
          articleId: article.id,
          analysisStatus: 'error',
          message: 'Article created but analysis failed. You can retry analysis later.',
          error: analysisError instanceof Error ? analysisError.message : 'Unknown error',
        });
      }
    }

    return res.status(201).json({
      success: true,
      articleId: article.id,
      analysisStatus: analyzeImmediately ? 'complete' : 'pending',
      screening: analysisResult
        ? {
            relevanceScore: analysisResult.screening.relevanceScore,
            isMilestoneWorthy: analysisResult.screening.isMilestoneWorthy,
            suggestedCategory: analysisResult.screening.suggestedCategory,
          }
        : null,
      drafts,
    });
  } catch (error) {
    console.error('Error submitting article:', error);
    return res.status(500).json({
      error: 'Failed to submit article',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Re-analyze an article (reset and analyze again)
 * Sprint 43: Changed to async reset - doesn't run analysis synchronously
 * to avoid 30s API Gateway timeout. Analysis runs via next ingestion Lambda.
 */
export async function reanalyzeArticle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { runSync = false } = req.query;

    // Verify article exists
    const article = await prisma.ingestedArticle.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Delete existing drafts
    const deletedDrafts = await prisma.contentDraft.deleteMany({
      where: { articleId: id },
    });

    // Reset analysis status
    await prisma.ingestedArticle.update({
      where: { id },
      data: {
        analysisStatus: 'pending',
        analyzedAt: null,
        relevanceScore: null,
        isMilestoneWorthy: false,
        milestoneRationale: null,
        analysisError: null,
      },
    });

    // If runSync=true, attempt synchronous analysis (may timeout for long articles)
    if (runSync === 'true') {
      try {
        const result = await analyzeArticle(id);
        return res.json({
          message: 'Re-analysis complete',
          articleId: id,
          screening: {
            relevanceScore: result.screening.relevanceScore,
            isMilestoneWorthy: result.screening.isMilestoneWorthy,
            suggestedCategory: result.screening.suggestedCategory,
          },
          draftsCreated: result.draftsCreated,
        });
      } catch (syncError) {
        // If sync fails (timeout), article is still reset to pending
        console.warn('[ReanalyzeArticle] Sync analysis failed, article reset to pending:', syncError);
      }
    }

    // Default: Just reset, don't run analysis synchronously
    return res.json({
      message: 'Article reset to pending for re-analysis',
      articleId: id,
      title: article.title,
      draftsDeleted: deletedDrafts.count,
      note: 'Analysis will run on next ingestion Lambda invocation, or invoke Lambda manually',
    });
  } catch (error) {
    console.error('Error re-analyzing article:', error);
    return res.status(500).json({
      error: 'Failed to re-analyze article',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Scrape article content from a URL using Jina Reader API
 * Sprint 41: URL Scraper Integration
 */
export async function scrapeArticleUrl(req: Request, res: Response) {
  try {
    const { url, submitForAnalysis = false } = req.body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    // Scrape the URL
    const result = await scrapeUrl(url);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to scrape URL',
      });
    }

    // If submitForAnalysis is true, create article and run analysis
    if (submitForAnalysis && result.content) {
      // Check for duplicate
      const existing = await prisma.ingestedArticle.findUnique({
        where: { externalUrl: url },
      });
      if (existing) {
        return res.status(409).json({
          success: true,
          title: result.title,
          content: result.content,
          wordCount: result.wordCount,
          error: 'Article with this URL already exists',
          existingId: existing.id,
        });
      }

      // Create article
      const article = await prisma.ingestedArticle.create({
        data: {
          externalUrl: url,
          title: result.title || 'Scraped Article',
          content: result.content,
          publishedAt: new Date(),
          analysisStatus: 'pending',
        },
      });

      // Run analysis
      try {
        const analysisResult = await analyzeArticle(article.id);
        const drafts = await prisma.contentDraft.findMany({
          where: { articleId: article.id },
          select: { id: true, contentType: true },
        });

        return res.json({
          success: true,
          title: result.title,
          content: result.content,
          wordCount: result.wordCount,
          articleId: article.id,
          analysisStatus: 'complete',
          screening: {
            relevanceScore: analysisResult.screening.relevanceScore,
            isMilestoneWorthy: analysisResult.screening.isMilestoneWorthy,
            suggestedCategory: analysisResult.screening.suggestedCategory,
          },
          drafts,
        });
      } catch (analysisError) {
        console.error('Analysis failed:', analysisError);
        return res.json({
          success: true,
          title: result.title,
          content: result.content,
          wordCount: result.wordCount,
          articleId: article.id,
          analysisStatus: 'error',
          message: 'Article created but analysis failed',
          error: analysisError instanceof Error ? analysisError.message : 'Unknown error',
        });
      }
    }

    // Just return scraped content
    return res.json({
      success: true,
      title: result.title,
      content: result.content,
      wordCount: result.wordCount,
    });
  } catch (error) {
    console.error('Error scraping URL:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape URL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

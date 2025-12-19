/**
 * Articles Controller
 *
 * Handles article analysis and management endpoints.
 */

import { Request, Response } from 'express';
import { prisma } from '../db';
import { analyzeArticle, analyzeAllPending } from '../services/ingestion/articleAnalyzer';

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

    // Parse draft data for response
    const articlesWithParsedDrafts = {
      ...article,
      drafts: article.drafts.map((draft) => ({
        ...draft,
        draftData: JSON.parse(draft.draftData),
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

    // Parse draft data for response
    const parsedDrafts = drafts.map((draft) => ({
      ...draft,
      draftData: JSON.parse(draft.draftData),
      validationErrors: draft.validationErrors ? JSON.parse(draft.validationErrors) : null,
    }));

    return res.json(parsedDrafts);
  } catch (error) {
    console.error('Error getting article drafts:', error);
    return res.status(500).json({ error: 'Failed to get article drafts' });
  }
}

/**
 * Re-analyze an article (reset and analyze again)
 */
export async function reanalyzeArticle(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Delete existing drafts
    await prisma.contentDraft.deleteMany({
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

    // Run analysis
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
  } catch (error) {
    console.error('Error re-analyzing article:', error);
    return res.status(500).json({
      error: 'Failed to re-analyze article',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

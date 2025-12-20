/**
 * Pipeline Controller
 *
 * Provides monitoring stats for the ingestion pipeline including:
 * - Last run time and next scheduled run
 * - Articles fetched today
 * - Duplicate detection stats
 * - Analysis pipeline stats
 * - Per-source health
 *
 * Sprint 32.10 - Ingestion Monitoring Dashboard
 */

import { Request, Response } from 'express';
import { prisma } from '../db';
import { getDuplicateStats } from '../services/ingestion/duplicateDetector';
import { getErrorStats, clearAllUnresolved, clearOldErrors } from '../services/errorTracker';
import * as pipelineSettings from '../services/pipelineSettings';
import { analyzeAllPending } from '../services/ingestion/articleAnalyzer';

/**
 * Source health information
 */
interface SourceHealth {
  id: string;
  name: string;
  lastCheckedAt: string | null;
  articlesToday: number;
  articlesTotal: number;
  isActive: boolean;
  status: 'ok' | 'warning' | 'error';
}

/**
 * Get comprehensive pipeline monitoring stats
 */
export async function getPipelineStats(req: Request, res: Response) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // Get all sources with article counts
    const sources = await prisma.newsSource.findMany({
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    // Get articles ingested today per source
    const articlesTodayBySource = await prisma.ingestedArticle.groupBy({
      by: ['sourceId'],
      where: {
        ingestedAt: { gte: todayStart },
      },
      _count: true,
    });

    const todayCountMap = new Map(
      articlesTodayBySource.map((s) => [s.sourceId, s._count])
    );

    // Build source health array
    const sourceHealth: SourceHealth[] = sources.map((source) => {
      const articlesToday = todayCountMap.get(source.id) || 0;
      const hoursSinceCheck = source.lastCheckedAt
        ? (now.getTime() - new Date(source.lastCheckedAt).getTime()) / (1000 * 60 * 60)
        : null;

      // Determine status: ok if checked within 25 hours, warning if 25-48h, error if >48h or never
      let status: 'ok' | 'warning' | 'error' = 'ok';
      if (!source.isActive) {
        status = 'warning';
      } else if (hoursSinceCheck === null || hoursSinceCheck > 48) {
        status = 'error';
      } else if (hoursSinceCheck > 25) {
        status = 'warning';
      }

      return {
        id: source.id,
        name: source.name,
        lastCheckedAt: source.lastCheckedAt?.toISOString() || null,
        articlesToday,
        articlesTotal: source._count.articles,
        isActive: source.isActive,
        status,
      };
    });

    // Get ingestion stats
    const [
      fetchedToday,
      fetchedYesterday,
      totalArticles,
      duplicateStats,
    ] = await Promise.all([
      prisma.ingestedArticle.count({
        where: { ingestedAt: { gte: todayStart } },
      }),
      prisma.ingestedArticle.count({
        where: {
          ingestedAt: { gte: yesterdayStart, lt: todayStart },
        },
      }),
      prisma.ingestedArticle.count(),
      getDuplicateStats(),
    ]);

    // Get analysis pipeline stats
    const [pendingAnalysis, analyzing, analyzed, analysisErrors] = await Promise.all([
      prisma.ingestedArticle.count({
        where: { analysisStatus: 'pending', isDuplicate: false },
      }),
      prisma.ingestedArticle.count({
        where: { analysisStatus: { in: ['screening', 'generating'] } },
      }),
      prisma.ingestedArticle.count({
        where: { analysisStatus: 'complete' },
      }),
      prisma.ingestedArticle.count({
        where: { analysisStatus: 'error' },
      }),
    ]);

    // Get analysis done today
    const analyzedToday = await prisma.ingestedArticle.count({
      where: {
        analyzedAt: { gte: todayStart },
        analysisStatus: 'complete',
      },
    });

    // Calculate last run time (most recent lastCheckedAt across sources)
    const lastRunTime = sources
      .filter((s) => s.lastCheckedAt)
      .map((s) => new Date(s.lastCheckedAt!).getTime())
      .reduce((max, time) => Math.max(max, time), 0);

    // Next scheduled run is midnight EST (5:00 AM UTC)
    const nextRunDate = new Date(todayStart);
    nextRunDate.setUTCHours(5, 0, 0, 0);
    if (nextRunDate.getTime() <= now.getTime()) {
      nextRunDate.setDate(nextRunDate.getDate() + 1);
    }

    // Calculate error rate for analysis
    const totalAttempted = analyzed + analysisErrors;
    const errorRate = totalAttempted > 0 ? analysisErrors / totalAttempted : 0;

    // Get pipeline control settings
    const settings = await pipelineSettings.getSettings();

    return res.json({
      // Pipeline control settings
      settings: {
        ingestionPaused: settings.ingestionPaused,
        analysisPaused: settings.analysisPaused,
        lastIngestionRun: settings.lastIngestionRun?.toISOString() || null,
        lastAnalysisRun: settings.lastAnalysisRun?.toISOString() || null,
      },
      // Ingestion overview
      ingestion: {
        lastRunAt: lastRunTime > 0 ? new Date(lastRunTime).toISOString() : null,
        nextScheduledAt: nextRunDate.toISOString(),
        fetchedToday,
        fetchedYesterday,
        totalArticles,
      },
      // Duplicate detection stats
      duplicates: {
        foundToday: duplicateStats.recentDuplicates,
        total: duplicateStats.totalDuplicates,
        byReason: duplicateStats.byReason,
      },
      // Analysis pipeline stats
      analysis: {
        pending: pendingAnalysis,
        analyzing,
        analyzedToday,
        totalAnalyzed: analyzed,
        errors: analysisErrors,
        errorRate: Math.round(errorRate * 100) / 100, // 2 decimal places
      },
      // Per-source health
      sources: sourceHealth,
    });
  } catch (error) {
    console.error('Error getting pipeline stats:', error);
    return res.status(500).json({ error: 'Failed to get pipeline stats' });
  }
}

/**
 * Trigger manual ingestion run
 * (Placeholder - actual implementation depends on Lambda trigger setup)
 */
export async function triggerIngestion(req: Request, res: Response) {
  try {
    // In production, this would invoke the Lambda function
    // For now, return a message indicating it's not implemented
    return res.json({
      message: 'Manual ingestion trigger not yet implemented',
      note: 'In production, this would invoke the scheduled Lambda function',
    });
  } catch (error) {
    console.error('Error triggering ingestion:', error);
    return res.status(500).json({ error: 'Failed to trigger ingestion' });
  }
}

/**
 * Trigger manual duplicate detection
 */
export async function triggerDuplicateDetection(req: Request, res: Response) {
  try {
    const { detectDuplicates } = await import('../services/ingestion/duplicateDetector');

    // Run detection on articles from last 24 hours
    const batchDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const matches = await detectDuplicates(batchDate);

    return res.json({
      message: `Duplicate detection complete`,
      duplicatesFound: matches.length,
      matches: matches.map((m) => ({
        articleId: m.articleId,
        duplicateOfId: m.duplicateOfId,
        score: m.score,
        reason: m.reason,
      })),
    });
  } catch (error) {
    console.error('Error running duplicate detection:', error);
    return res.status(500).json({
      error: 'Failed to run duplicate detection',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get pipeline error statistics
 */
export async function getPipelineErrors(req: Request, res: Response) {
  try {
    const stats = await getErrorStats();
    return res.json(stats);
  } catch (error) {
    console.error('Error getting pipeline errors:', error);
    return res.status(500).json({ error: 'Failed to get pipeline errors' });
  }
}

/**
 * Clear all unresolved pipeline errors (admin action)
 */
export async function clearPipelineErrors(req: Request, res: Response) {
  try {
    const cleared = await clearAllUnresolved();
    return res.json({
      message: `Cleared ${cleared} unresolved errors`,
      cleared,
    });
  } catch (error) {
    console.error('Error clearing pipeline errors:', error);
    return res.status(500).json({ error: 'Failed to clear pipeline errors' });
  }
}

/**
 * Clear old resolved errors (cleanup)
 */
export async function cleanupOldErrors(req: Request, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const deleted = await clearOldErrors(days);
    return res.json({
      message: `Deleted ${deleted} resolved errors older than ${days} days`,
      deleted,
    });
  } catch (error) {
    console.error('Error cleaning up old errors:', error);
    return res.status(500).json({ error: 'Failed to cleanup old errors' });
  }
}

/**
 * Toggle ingestion pause state
 */
export async function toggleIngestionPause(req: Request, res: Response) {
  try {
    const { paused } = req.body;

    if (typeof paused !== 'boolean') {
      return res.status(400).json({ error: 'paused must be a boolean' });
    }

    const settings = await pipelineSettings.setIngestionPaused(paused);

    return res.json({
      message: `Ingestion ${paused ? 'paused' : 'resumed'}`,
      settings: {
        ingestionPaused: settings.ingestionPaused,
        analysisPaused: settings.analysisPaused,
      },
    });
  } catch (error) {
    console.error('Error toggling ingestion pause:', error);
    return res.status(500).json({ error: 'Failed to toggle ingestion pause' });
  }
}

/**
 * Toggle analysis pause state
 */
export async function toggleAnalysisPause(req: Request, res: Response) {
  try {
    const { paused } = req.body;

    if (typeof paused !== 'boolean') {
      return res.status(400).json({ error: 'paused must be a boolean' });
    }

    const settings = await pipelineSettings.setAnalysisPaused(paused);

    return res.json({
      message: `Analysis ${paused ? 'paused' : 'resumed'}`,
      settings: {
        ingestionPaused: settings.ingestionPaused,
        analysisPaused: settings.analysisPaused,
      },
    });
  } catch (error) {
    console.error('Error toggling analysis pause:', error);
    return res.status(500).json({ error: 'Failed to toggle analysis pause' });
  }
}

/**
 * Trigger manual analysis run
 */
export async function triggerAnalysis(req: Request, res: Response) {
  try {
    // Check if analysis is paused
    const isPaused = await pipelineSettings.isAnalysisPaused();
    if (isPaused) {
      return res.status(400).json({
        error: 'Analysis is paused',
        message: 'Resume analysis before triggering a manual run',
      });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const result = await analyzeAllPending(limit);

    // Record the run
    await pipelineSettings.recordAnalysisRun();

    return res.json({
      message: `Analyzed ${result.analyzed} articles with ${result.errors} errors`,
      analyzed: result.analyzed,
      errors: result.errors,
      results: result.results,
    });
  } catch (error) {
    console.error('Error triggering analysis:', error);
    return res.status(500).json({
      error: 'Failed to trigger analysis',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Migrate layered content to milestones (Sprint 35)
 * One-time migration to populate tldr, simpleExplanation, etc. from JSON
 */
export async function migrateLayeredContent(req: Request, res: Response) {
  try {
    // Import layered content JSON (bundled with Lambda)
    const layeredContentData = await import('../../../src/content/milestones/layered-content.json');
    const contentMap = layeredContentData.default || layeredContentData;

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    // Process each milestone in the JSON
    for (const [milestoneId, content] of Object.entries(contentMap)) {
      // Skip metadata fields
      if (milestoneId.startsWith('_')) continue;
      if (typeof content !== 'object' || content === null) continue;

      const layered = content as Record<string, string>;

      // Check if milestone exists
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
      });

      if (!milestone) {
        notFound++;
        continue;
      }

      // Skip if already has content
      if (milestone.tldr && milestone.simpleExplanation) {
        skipped++;
        continue;
      }

      // Update with layered content
      await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          tldr: layered.tldr || null,
          simpleExplanation: layered.simpleExplanation || null,
          technicalDepth: layered.technicalDepth || null,
          businessImpact: layered.businessImpact || null,
          whyItMattersToday: layered.whyItMattersToday || null,
          historicalContext: layered.historicalContext || null,
          commonMisconceptions: layered.commonMisconceptions || null,
        },
      });

      updated++;
    }

    return res.json({
      message: 'Layered content migration complete',
      updated,
      skipped,
      notFound,
    });
  } catch (error) {
    console.error('Error migrating layered content:', error);
    return res.status(500).json({
      error: 'Failed to migrate layered content',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

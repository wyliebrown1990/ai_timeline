/**
 * Articles Controller
 *
 * Handles article analysis and management endpoints.
 */

import { Request, Response } from 'express';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { prisma } from '../db';
import { screenOnly, analyzeAllPending, analyzeArticle } from '../services/ingestion/articleAnalyzer';
import { scrapeUrl } from '../services/scraper/urlScraper';
import { youtubeApi } from '../services/youtube/youtubeApi';
import { transcriptService } from '../services/youtube/transcriptService';
import { reclassifyArticle } from '../services/ingestion/subjectClassifier';

// Lambda client for async invocation of Ingestion Lambda
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Helper: Invoke Ingestion Lambda asynchronously for article analysis
 * This triggers the full pipeline: screening → content generation → entity extraction
 */
async function invokeAnalysisLambda(articleId: string): Promise<void> {
  const command = new InvokeCommand({
    FunctionName: process.env.INGESTION_FUNCTION_NAME || 'ai-timeline-ingestion-prod',
    InvocationType: 'Event', // Async - returns 202 immediately
    Payload: JSON.stringify({
      action: 'analyzeArticle',
      articleId,
    }),
  });

  await lambdaClient.send(command);
  console.log(`[Articles] Async Lambda invoked for article ${articleId}`);
}

/**
 * Strip tracking parameters (UTM, etc.) from URLs
 * Keeps only the base URL without marketing/tracking query params
 */
function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);
    const trackingPrefixes = ['utm_', '_bhlid', 'fbclid', 'gclid', 'mc_eid', 'oly_', 'ref_', 'source'];

    // Remove tracking params
    for (const key of [...parsed.searchParams.keys()]) {
      if (trackingPrefixes.some(prefix => key.startsWith(prefix) || key === prefix)) {
        parsed.searchParams.delete(key);
      }
    }

    // If no params left, return URL without trailing ?
    const result = parsed.toString();
    return result.endsWith('?') ? result.slice(0, -1) : result;
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

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
 *
 * This endpoint triggers the Ingestion Lambda asynchronously to avoid
 * the 30s API Gateway timeout. The Lambda has a 300s timeout.
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

    // Run screening only (fast - uses Haiku, ~5-10s)
    // If milestone-worthy, article is marked 'screened' for later content generation
    const result = await screenOnly(id);

    return res.json({
      message: result.isMilestoneWorthy
        ? 'Screening complete - article is milestone-worthy! Content generation pending.'
        : 'Screening complete - article not milestone-worthy.',
      articleId: id,
      screening: {
        relevanceScore: result.relevanceScore,
        isMilestoneWorthy: result.isMilestoneWorthy,
        suggestedCategory: result.suggestedCategory,
        rationale: result.milestoneRationale,
      },
      status: result.status,
      note: result.isMilestoneWorthy
        ? 'Click "Generate Content" to create drafts, or wait for the daily batch.'
        : undefined,
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
 * Sprint Subj-2: Added subject classification metrics
 */
export async function getAnalysisStats(req: Request, res: Response) {
  try {
    const [
      pending,
      screening,
      complete,
      error,
      milestoneWorthy,
      totalDrafts,
      // Subject classification metrics (Sprint Subj-2)
      subjectsClassified,
      totalContentSubjects,
    ] = await Promise.all([
      prisma.ingestedArticle.count({ where: { analysisStatus: 'pending' } }),
      prisma.ingestedArticle.count({
        where: { analysisStatus: { in: ['screening', 'generating'] } },
      }),
      prisma.ingestedArticle.count({ where: { analysisStatus: 'complete' } }),
      prisma.ingestedArticle.count({ where: { analysisStatus: 'error' } }),
      prisma.ingestedArticle.count({ where: { isMilestoneWorthy: true } }),
      prisma.contentDraft.count(),
      // Count articles that have been subject-classified
      prisma.ingestedArticle.count({ where: { subjectClassifiedAt: { not: null } } }),
      // Count published ContentSubject links
      prisma.contentSubject.count(),
    ]);

    const [draftsByType, draftsByStatus, contentSubjectsByType] = await Promise.all([
      prisma.contentDraft.groupBy({
        by: ['contentType'],
        _count: true,
      }),
      prisma.contentDraft.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Group content subjects by content type (Sprint Subj-2)
      prisma.contentSubject.groupBy({
        by: ['contentType'],
        _count: true,
      }),
    ]);

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
      // Subject classification stats (Sprint Subj-2)
      subjects: {
        articlesClassified: subjectsClassified,
        contentSubjectsLinked: totalContentSubjects,
        byContentType: Object.fromEntries(contentSubjectsByType.map((d) => [d.contentType, d._count])),
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
 * Creates a NewsSource (one-time, no daily sync) + IngestedArticle
 * Automatically triggers analysis via Lambda - results appear in Review Queue
 */
export async function submitArticle(req: Request, res: Response) {
  try {
    const { sourceUrl, title, content } = req.body;

    // Validate required fields
    if (!sourceUrl || typeof sourceUrl !== 'string') {
      return res.status(400).json({ error: 'sourceUrl is required' });
    }
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required' });
    }

    // Strip tracking params (UTM, etc.) from URL
    const cleanUrl = stripTrackingParams(sourceUrl);

    // Check for duplicate article by URL
    const existingArticle = await prisma.ingestedArticle.findUnique({
      where: { externalUrl: cleanUrl },
    });
    if (existingArticle) {
      return res.status(409).json({
        error: 'Article with this URL already exists',
        existingId: existingArticle.id,
      });
    }

    // Extract hostname for source name
    let hostname = 'Manual Submission';
    try {
      hostname = new URL(cleanUrl).hostname;
    } catch {
      // Keep default
    }

    // Check if source already exists (for this URL) or create a new one-time source
    let source = await prisma.newsSource.findUnique({
      where: { url: cleanUrl },
    });

    if (!source) {
      source = await prisma.newsSource.create({
        data: {
          name: title || `Submission: ${hostname}`,
          url: cleanUrl,
          sourceType: 'single_url',
          config: { usePlaywright: false },
          isActive: false, // One-time sources are never in daily sync
        },
      });
      console.log(`[Articles] Created one-time source: ${source.id}`);
    }

    // Create the article linked to the source with 'screening' status
    const article = await prisma.ingestedArticle.create({
      data: {
        sourceId: source.id,
        externalUrl: cleanUrl,
        title: title || 'Manual Submission',
        content: content,
        publishedAt: new Date(),
        analysisStatus: 'screening',
      },
    });

    console.log(`[Articles] Article submitted: ${article.id} (source: ${source.id})`);

    // Automatically trigger analysis via Lambda
    try {
      await invokeAnalysisLambda(article.id);
    } catch (lambdaError) {
      console.error(`[Articles] Lambda invocation failed for ${article.id}:`, lambdaError);
      // Reset to pending so user can manually retry
      await prisma.ingestedArticle.update({
        where: { id: article.id },
        data: { analysisStatus: 'pending' },
      });
    }

    return res.status(202).json({
      success: true,
      articleId: article.id,
      sourceId: source.id,
      analysisStatus: 'screening',
      message: 'Article submitted and processing. Check Review Queue in ~60 seconds for results.',
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
 * Submit a YouTube video for analysis
 * Creates a NewsSource (one-time, no daily sync) + IngestedArticle with transcript
 * Automatically triggers analysis via Lambda - results appear in Review Queue
 */
export async function submitYouTubeVideo(req: Request, res: Response) {
  try {
    const { videoUrl, transcriptLanguage = 'en' } = req.body;

    // Validate required fields
    if (!videoUrl || typeof videoUrl !== 'string') {
      return res.status(400).json({ error: 'videoUrl is required' });
    }

    // Initialize YouTube API if needed
    if (!youtubeApi.isInitialized()) {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'YouTube API not configured (missing YOUTUBE_API_KEY)' });
      }
      youtubeApi.initialize(apiKey);
    }

    // Extract video ID from URL
    const videoId = youtubeApi.extractVideoId(videoUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL. Please provide a valid video URL.' });
    }

    // Construct canonical URL
    const canonicalUrl = `https://youtube.com/watch?v=${videoId}`;

    // Check for duplicate article by URL
    const existingArticle = await prisma.ingestedArticle.findUnique({
      where: { externalUrl: canonicalUrl },
    });
    if (existingArticle) {
      return res.status(409).json({
        error: 'Video already exists in the system',
        existingId: existingArticle.id,
      });
    }

    // Fetch video details from YouTube API
    const video = await youtubeApi.getVideo(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found on YouTube' });
    }

    // Try to get transcript
    const transcriptResult = await transcriptService.getTranscript(videoId, transcriptLanguage);
    let content: string;
    let hasTranscript = false;

    if (transcriptResult.success && transcriptResult.transcript) {
      content = transcriptResult.transcript.fullText;
      hasTranscript = true;
      console.log(`[YouTube] Got transcript for ${videoId} (${transcriptResult.transcript.wordCount} words)`);
    } else {
      // Fall back to description
      content = video.description || 'No transcript or description available.';
      console.log(`[YouTube] No transcript for ${videoId}, using description`);
    }

    // Check if source already exists or create a new one-time source
    let source = await prisma.newsSource.findUnique({
      where: { url: canonicalUrl },
    });

    if (!source) {
      source = await prisma.newsSource.create({
        data: {
          name: `YouTube: ${video.title.substring(0, 100)}`,
          url: canonicalUrl,
          sourceType: 'youtube_video',
          config: {
            videoId,
            transcriptLanguage,
            channelId: video.channelId,
            channelTitle: video.channelTitle,
          },
          isActive: false, // One-time sources are never in daily sync
        },
      });
      console.log(`[YouTube] Created one-time source: ${source.id}`);
    }

    // Create the article linked to the source with 'screening' status
    const article = await prisma.ingestedArticle.create({
      data: {
        sourceId: source.id,
        externalUrl: canonicalUrl,
        title: video.title,
        content,
        publishedAt: video.publishedAt,
        analysisStatus: 'screening',
      },
    });

    console.log(`[YouTube] Video submitted: ${article.id} (source: ${source.id})`);

    // Automatically trigger analysis via Lambda
    try {
      await invokeAnalysisLambda(article.id);
    } catch (lambdaError) {
      console.error(`[YouTube] Lambda invocation failed for ${article.id}:`, lambdaError);
      // Reset to pending so user can manually retry
      await prisma.ingestedArticle.update({
        where: { id: article.id },
        data: { analysisStatus: 'pending' },
      });
    }

    return res.status(202).json({
      success: true,
      articleId: article.id,
      sourceId: source.id,
      videoId,
      title: video.title,
      hasTranscript,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      analysisStatus: 'screening',
      message: 'YouTube video submitted and processing. Check Review Queue in ~60 seconds for results.',
    });
  } catch (error) {
    console.error('Error submitting YouTube video:', error);
    return res.status(500).json({
      error: 'Failed to submit YouTube video',
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

    // Reset analysis status (including subject classification)
    await prisma.ingestedArticle.update({
      where: { id },
      data: {
        analysisStatus: 'pending',
        analyzedAt: null,
        relevanceScore: null,
        isMilestoneWorthy: false,
        milestoneRationale: null,
        analysisError: null,
        classifiedSubjects: null,
        subjectClassifiedAt: null,
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
 * Creates a NewsSource (one-time, no daily sync) + IngestedArticle
 */
export async function scrapeArticleUrl(req: Request, res: Response) {
  try {
    const { url, submitForAnalysis = false } = req.body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    // Strip tracking params (UTM, etc.) from URL for storage
    const cleanUrl = stripTrackingParams(url);

    // Scrape the URL (use original URL for fetching)
    const result = await scrapeUrl(url);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to scrape URL',
        failureType: result.failureType,
        // Include partial content so user can see what was scraped
        scrapedTitle: result.title,
        scrapedContent: result.content?.substring(0, 500),
      });
    }

    // If submitForAnalysis is true, create source + article and start async analysis
    if (submitForAnalysis && result.content) {
      // Check for duplicate article (use clean URL)
      const existingArticle = await prisma.ingestedArticle.findUnique({
        where: { externalUrl: cleanUrl },
      });
      if (existingArticle) {
        return res.status(409).json({
          success: true,
          title: result.title,
          content: result.content,
          wordCount: result.wordCount,
          error: 'Article with this URL already exists',
          existingId: existingArticle.id,
        });
      }

      // Extract hostname for source name
      let hostname = 'Scraped URL';
      try {
        hostname = new URL(cleanUrl).hostname;
      } catch {
        // Keep default
      }

      // Check if source already exists or create a new one-time source
      let source = await prisma.newsSource.findUnique({
        where: { url: cleanUrl },
      });

      if (!source) {
        source = await prisma.newsSource.create({
          data: {
            name: result.title || `Scraped: ${hostname}`,
            url: cleanUrl,
            sourceType: 'single_url',
            config: {
              usePlaywright: result.scrapedBy === 'playwright', // Track if Playwright was used
            },
            isActive: false, // One-time sources are never in daily sync
          },
        });
        console.log(`[Scraper] Created one-time source: ${source.id}`);
      }

      // Create article linked to the source
      const article = await prisma.ingestedArticle.create({
        data: {
          sourceId: source.id,
          externalUrl: cleanUrl,
          title: result.title || 'Scraped Article',
          content: result.content,
          publishedAt: new Date(),
          analysisStatus: 'screening',
        },
      });

      console.log(`[Scraper] Article created: ${article.id} (source: ${source.id})`);

      // Automatically trigger analysis via Lambda
      try {
        await invokeAnalysisLambda(article.id);
      } catch (lambdaError) {
        console.error(`[Scraper] Lambda invocation failed for ${article.id}:`, lambdaError);
        // Reset to pending so user can manually retry
        await prisma.ingestedArticle.update({
          where: { id: article.id },
          data: { analysisStatus: 'pending' },
        });
      }

      // Return immediately - analysis runs in Lambda background
      return res.status(202).json({
        success: true,
        title: result.title,
        content: result.content,
        wordCount: result.wordCount,
        articleId: article.id,
        sourceId: source.id,
        analysisStatus: 'screening',
        message: 'Article submitted and processing. Check Review Queue in ~60 seconds for results.',
      });
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

/**
 * Delete an article by its external URL
 * Used to clean up articles that were saved with garbage content (CAPTCHA pages, etc.)
 */
export async function deleteArticleByUrl(req: Request, res: Response) {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    // Strip tracking params for lookup (articles are stored with clean URLs)
    const cleanUrl = stripTrackingParams(url);

    // Find the article
    const article = await prisma.ingestedArticle.findUnique({
      where: { externalUrl: cleanUrl },
      include: { drafts: true },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'No article found with this URL',
      });
    }

    // Delete associated drafts first (foreign key constraint)
    if (article.drafts.length > 0) {
      await prisma.contentDraft.deleteMany({
        where: { articleId: article.id },
      });
    }

    // Delete the article
    await prisma.ingestedArticle.delete({
      where: { id: article.id },
    });

    console.log(`[Articles] Deleted article by URL: ${url}`);

    return res.json({
      success: true,
      message: 'Article deleted successfully',
      deletedId: article.id,
      deletedDrafts: article.drafts.length,
    });
  } catch (error) {
    console.error('Error deleting article by URL:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete article',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Generate content (Stage 2+) for a screened article
 *
 * Invokes the Ingestion Lambda asynchronously to avoid API Gateway 30s timeout.
 * The Lambda has a 300s timeout and will process the article in the background.
 */
export async function generateContent(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check article exists
    const article = await prisma.ingestedArticle.findUnique({
      where: { id },
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Only allow generation for screened or pending articles
    if (!['screened', 'pending'].includes(article.analysisStatus)) {
      return res.status(400).json({
        error: `Cannot generate content for article with status: ${article.analysisStatus}`,
        currentStatus: article.analysisStatus,
      });
    }

    // Mark article as generating to prevent duplicate invocations
    await prisma.ingestedArticle.update({
      where: { id },
      data: { analysisStatus: 'generating' },
    });

    // Invoke Ingestion Lambda asynchronously (Event invocation returns immediately)
    const command = new InvokeCommand({
      FunctionName: process.env.INGESTION_FUNCTION_NAME || 'ai-timeline-ingestion-prod',
      InvocationType: 'Event', // Async - returns 202 immediately
      Payload: JSON.stringify({
        action: 'analyzeArticle',
        articleId: id,
      }),
    });

    await lambdaClient.send(command);
    console.log(`[generateContent] Async Lambda invoked for article ${id}`);

    return res.status(202).json({
      message: 'Content generation started. Check Review Queue in ~60 seconds.',
      articleId: id,
      status: 'generating',
      note: 'The article is being processed in the background. Refresh the page to see updates.',
    });
  } catch (error) {
    console.error('Error triggering content generation:', error);

    // Reset status if Lambda invocation failed
    try {
      await prisma.ingestedArticle.update({
        where: { id: req.params.id },
        data: { analysisStatus: 'screened' },
      });
    } catch {
      // Ignore reset error
    }

    return res.status(500).json({
      error: 'Failed to start content generation',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Delete an article by ID
 */
export async function deleteArticle(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Find the article
    const article = await prisma.ingestedArticle.findUnique({
      where: { id },
      include: { drafts: true },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found',
      });
    }

    // Delete associated drafts first (foreign key constraint)
    if (article.drafts.length > 0) {
      await prisma.contentDraft.deleteMany({
        where: { articleId: article.id },
      });
    }

    // Delete the article
    await prisma.ingestedArticle.delete({
      where: { id },
    });

    console.log(`[Articles] Deleted article: ${id}`);

    return res.json({
      success: true,
      message: 'Article deleted successfully',
      deletedId: article.id,
      deletedDrafts: article.drafts.length,
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete article',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Delete all duplicate articles
 * Keeps the original articles, deletes only those marked as duplicates
 */
export async function deleteAllDuplicates(req: Request, res: Response) {
  try {
    // Find all duplicate articles
    const duplicates = await prisma.ingestedArticle.findMany({
      where: { isDuplicate: true },
      select: { id: true },
    });

    if (duplicates.length === 0) {
      return res.json({
        message: 'No duplicate articles found',
        deleted: 0,
      });
    }

    const duplicateIds = duplicates.map((d) => d.id);

    // Delete drafts associated with duplicate articles first
    await prisma.contentDraft.deleteMany({
      where: { articleId: { in: duplicateIds } },
    });

    // Delete the duplicate articles
    const result = await prisma.ingestedArticle.deleteMany({
      where: { id: { in: duplicateIds } },
    });

    console.log(`[Articles] Deleted ${result.count} duplicate articles`);

    return res.json({
      message: `Deleted ${result.count} duplicate articles`,
      deleted: result.count,
    });
  } catch (error) {
    console.error('Error deleting duplicate articles:', error);
    return res.status(500).json({
      error: 'Failed to delete duplicate articles',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Bulk delete multiple articles by IDs
 */
export async function bulkDelete(req: Request, res: Response) {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (ids.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 articles can be deleted at once' });
    }

    // Delete drafts first
    await prisma.contentDraft.deleteMany({
      where: { articleId: { in: ids } },
    });

    // Delete key figure drafts
    await prisma.keyFigureDraft.deleteMany({
      where: { articleId: { in: ids } },
    });

    // Delete articles
    const result = await prisma.ingestedArticle.deleteMany({
      where: { id: { in: ids } },
    });

    console.log(`[Articles] Bulk deleted ${result.count} articles`);

    return res.json({
      message: `Deleted ${result.count} articles`,
      deleted: result.count,
    });
  } catch (error) {
    console.error('Error bulk deleting articles:', error);
    return res.status(500).json({
      error: 'Failed to delete articles',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Bulk analyze multiple articles (screening only)
 * Invokes Ingestion Lambda asynchronously to avoid API Gateway 30s timeout.
 */
export async function bulkAnalyze(req: Request, res: Response) {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (ids.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 articles can be analyzed at once' });
    }

    // Verify all articles exist and are pending
    const articles = await prisma.ingestedArticle.findMany({
      where: { id: { in: ids }, analysisStatus: 'pending' },
      select: { id: true },
    });

    if (articles.length === 0) {
      return res.status(400).json({ error: 'No pending articles found with provided IDs' });
    }

    const validIds = articles.map((a) => a.id);

    // Mark as screening
    await prisma.ingestedArticle.updateMany({
      where: { id: { in: validIds } },
      data: { analysisStatus: 'screening' },
    });

    // Invoke Ingestion Lambda asynchronously for bulk screening
    const command = new InvokeCommand({
      FunctionName: process.env.INGESTION_FUNCTION_NAME || 'ai-timeline-ingestion-prod',
      InvocationType: 'Event', // Async - returns 202 immediately
      Payload: JSON.stringify({
        action: 'bulkScreen',
        articleIds: validIds,
      }),
    });

    await lambdaClient.send(command);
    console.log(`[bulkAnalyze] Async Lambda invoked for ${validIds.length} articles`);

    return res.status(202).json({
      message: `Started analysis for ${validIds.length} articles`,
      analyzing: validIds.length,
      skipped: ids.length - validIds.length,
    });
  } catch (error) {
    console.error('Error bulk analyzing articles:', error);
    return res.status(500).json({
      error: 'Failed to start bulk analysis',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Re-classify article subjects (Sprint Subj-2)
 * Clears taxonomy cache and re-runs subject classification
 * Used for taxonomy updates or manual re-classification
 */
export async function reclassifySubjects(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verify article exists
    const article = await prisma.ingestedArticle.findUnique({
      where: { id },
      select: { id: true, title: true, classifiedSubjects: true },
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Get Anthropic API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Anthropic API key not configured' });
    }

    // Store previous classification for comparison
    const previousSubjects = article.classifiedSubjects;

    // Re-classify (clears cache internally)
    const newClassifications = await reclassifyArticle(id, apiKey);

    return res.json({
      message: 'Article subjects re-classified',
      articleId: id,
      title: article.title,
      previousSubjects,
      newClassifications,
      subjectsCount: newClassifications.length,
      primarySubject: newClassifications.find((c) => c.isPrimary)?.subjectSlug || null,
    });
  } catch (error) {
    console.error('Error re-classifying article subjects:', error);
    return res.status(500).json({
      error: 'Failed to re-classify article subjects',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

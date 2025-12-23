/**
 * Ingestion Job - Scheduled Daily Pipeline
 *
 * This job orchestrates the daily ingestion pipeline:
 * 1. Fetch articles from all active sources
 * 2. Run duplicate detection across sources (Sprint 32.2)
 * 3. Queue non-duplicate articles for AI analysis
 *
 * Triggered by EventBridge at midnight EST (5:00 AM UTC)
 */

import { prisma } from '../db';
import * as sourcesService from '../services/sources';
import * as rssFetcher from '../services/ingestion/rssFetcher';
import { analyzeAllPending } from '../services/ingestion/articleAnalyzer';
import { detectDuplicates } from '../services/ingestion/duplicateDetector';

// Constants for rate limiting analysis
const MAX_ARTICLES_TO_ANALYZE = 20;

// Only process articles published within this window (in hours)
// Use 48 hours to account for timezone differences and delayed RSS updates
const ARTICLE_AGE_LIMIT_HOURS = 48;

/**
 * Result from a single source fetch
 */
interface SourceFetchResult {
  sourceId: string;
  sourceName: string;
  fetched: number;
  filtered: number;
  created: number;
  skipped: number;
  error?: string;
}

/**
 * Overall ingestion job result
 */
export interface IngestionJobResult {
  startTime: Date;
  endTime: Date;
  durationMs: number;
  sourcesProcessed: number;
  totalFetched: number;
  totalFiltered: number;
  totalCreated: number;
  totalSkipped: number;
  duplicatesFound: number;
  sourceResults: SourceFetchResult[];
  analysisResults: {
    analyzed: number;
    errors: number;
  };
  errors: string[];
}

/**
 * Run the full ingestion pipeline
 *
 * Pipeline order:
 * 1. Fetch from all active sources sequentially
 * 2. Trigger duplicate detection (future - Sprint 32.2)
 * 3. Run analysis on non-duplicate pending articles (limit 20)
 */
export async function runIngestionJob(): Promise<IngestionJobResult> {
  const startTime = new Date();
  const errors: string[] = [];
  const sourceResults: SourceFetchResult[] = [];

  // Calculate cutoff date - only process articles newer than this
  const cutoffDate = new Date(startTime.getTime() - ARTICLE_AGE_LIMIT_HOURS * 60 * 60 * 1000);

  console.log('[IngestionJob] Starting daily ingestion pipeline');
  console.log(`[IngestionJob] Start time: ${startTime.toISOString()}`);
  console.log(`[IngestionJob] Article cutoff: ${cutoffDate.toISOString()} (${ARTICLE_AGE_LIMIT_HOURS}h window)`);

  // Step 1: Fetch from all active sources
  try {
    const sources = await sourcesService.getAll();
    const activeSources = sources.filter((s) => s.isActive);

    console.log(`[IngestionJob] Found ${activeSources.length} active sources`);

    for (const source of activeSources) {
      const result = await fetchFromSource(source, cutoffDate);
      sourceResults.push(result);

      if (result.error) {
        errors.push(`Source ${source.name}: ${result.error}`);
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[IngestionJob] Error fetching sources:', errorMessage);
    errors.push(`Failed to fetch sources: ${errorMessage}`);
  }

  // Step 2: Run duplicate detection after all sources complete
  let duplicatesFound = 0;
  try {
    console.log('[IngestionJob] Starting duplicate detection');
    const duplicateMatches = await detectDuplicates(startTime);
    duplicatesFound = duplicateMatches.length;
    console.log(`[IngestionJob] Duplicate detection complete: ${duplicatesFound} duplicates found`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[IngestionJob] Error during duplicate detection:', errorMessage);
    errors.push(`Duplicate detection failed: ${errorMessage}`);
  }

  // Step 3: Run analysis on pending non-duplicate articles
  let analysisResults = { analyzed: 0, errors: 0 };
  try {
    console.log(`[IngestionJob] Starting analysis of pending articles (limit: ${MAX_ARTICLES_TO_ANALYZE})`);

    // Get count of pending non-duplicate articles
    const pendingCount = await prisma.ingestedArticle.count({
      where: {
        analysisStatus: 'pending',
        isDuplicate: false, // Skip duplicates to save API costs
      },
    });

    console.log(`[IngestionJob] Found ${pendingCount} pending non-duplicate articles for analysis`);

    if (pendingCount > 0) {
      const result = await analyzeAllPending(MAX_ARTICLES_TO_ANALYZE);
      analysisResults = { analyzed: result.analyzed, errors: result.errors };
      console.log(`[IngestionJob] Analysis complete: ${result.analyzed} analyzed, ${result.errors} errors`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[IngestionJob] Error during analysis:', errorMessage);
    errors.push(`Analysis failed: ${errorMessage}`);
  }

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();

  // Calculate totals
  const totalFetched = sourceResults.reduce((sum, r) => sum + r.fetched, 0);
  const totalFiltered = sourceResults.reduce((sum, r) => sum + r.filtered, 0);
  const totalCreated = sourceResults.reduce((sum, r) => sum + r.created, 0);
  const totalSkipped = sourceResults.reduce((sum, r) => sum + r.skipped, 0);

  const result: IngestionJobResult = {
    startTime,
    endTime,
    durationMs,
    sourcesProcessed: sourceResults.length,
    totalFetched,
    totalFiltered,
    totalCreated,
    totalSkipped,
    duplicatesFound,
    sourceResults,
    analysisResults,
    errors,
  };

  console.log('[IngestionJob] Pipeline complete');
  console.log(`[IngestionJob] Duration: ${durationMs}ms`);
  console.log(
    `[IngestionJob] Fetched: ${totalFetched}, Filtered (old): ${totalFiltered}, Created: ${totalCreated}, Skipped (dupe): ${totalSkipped}`
  );
  console.log(`[IngestionJob] Duplicates detected: ${duplicatesFound}`);
  console.log(`[IngestionJob] Analyzed: ${analysisResults.analyzed}, Analysis errors: ${analysisResults.errors}`);

  if (errors.length > 0) {
    console.warn(`[IngestionJob] Completed with ${errors.length} errors:`, errors);
  }

  return result;
}

/**
 * Filter articles to only include those published within the age limit
 */
function filterByDate(
  articles: rssFetcher.FetchedArticle[],
  cutoffDate: Date
): { recent: rssFetcher.FetchedArticle[]; filtered: number } {
  const recent = articles.filter((article) => article.publishedAt >= cutoffDate);
  const filtered = articles.length - recent.length;
  return { recent, filtered };
}

/**
 * Fetch articles from a single source
 */
async function fetchFromSource(
  source: {
    id: string;
    name: string;
    feedUrl: string;
  },
  cutoffDate: Date
): Promise<SourceFetchResult> {
  console.log(`[IngestionJob] Fetching from source: ${source.name}`);

  try {
    // Fetch articles from RSS
    const fetchedArticles = await rssFetcher.fetchFromRSS(source.feedUrl);

    // Filter to only recent articles (within ARTICLE_AGE_LIMIT_HOURS)
    const { recent: recentArticles, filtered } = filterByDate(fetchedArticles, cutoffDate);

    if (filtered > 0) {
      console.log(
        `[IngestionJob] Source ${source.name}: filtered out ${filtered} articles older than ${ARTICLE_AGE_LIMIT_HOURS}h`
      );
    }

    // Prepare articles for bulk insert
    const articlesToCreate = recentArticles.map((article) => ({
      sourceId: source.id,
      ...article,
    }));

    // Bulk create, skipping duplicates
    const { created, skipped } = await sourcesService.createArticlesBulk(articlesToCreate);

    // Update last checked timestamp
    await sourcesService.updateLastChecked(source.id);

    console.log(
      `[IngestionJob] Source ${source.name}: fetched=${fetchedArticles.length}, filtered=${filtered}, created=${created}, skipped=${skipped}`
    );

    return {
      sourceId: source.id,
      sourceName: source.name,
      fetched: fetchedArticles.length,
      filtered,
      created,
      skipped,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[IngestionJob] Error fetching from ${source.name}:`, errorMessage);

    return {
      sourceId: source.id,
      sourceName: source.name,
      fetched: 0,
      filtered: 0,
      created: 0,
      skipped: 0,
      error: errorMessage,
    };
  }
}

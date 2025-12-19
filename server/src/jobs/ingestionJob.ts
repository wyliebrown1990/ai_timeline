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

/**
 * Result from a single source fetch
 */
interface SourceFetchResult {
  sourceId: string;
  sourceName: string;
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

  console.log('[IngestionJob] Starting daily ingestion pipeline');
  console.log(`[IngestionJob] Start time: ${startTime.toISOString()}`);

  // Step 1: Fetch from all active sources
  try {
    const sources = await sourcesService.getAll();
    const activeSources = sources.filter((s) => s.isActive);

    console.log(`[IngestionJob] Found ${activeSources.length} active sources`);

    for (const source of activeSources) {
      const result = await fetchFromSource(source);
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
  const totalCreated = sourceResults.reduce((sum, r) => sum + r.created, 0);
  const totalSkipped = sourceResults.reduce((sum, r) => sum + r.skipped, 0);
  const totalFetched = totalCreated + totalSkipped;

  const result: IngestionJobResult = {
    startTime,
    endTime,
    durationMs,
    sourcesProcessed: sourceResults.length,
    totalFetched,
    totalCreated,
    totalSkipped,
    duplicatesFound,
    sourceResults,
    analysisResults,
    errors,
  };

  console.log('[IngestionJob] Pipeline complete');
  console.log(`[IngestionJob] Duration: ${durationMs}ms`);
  console.log(`[IngestionJob] Created: ${totalCreated}, Skipped: ${totalSkipped}, Duplicates: ${duplicatesFound}`);
  console.log(`[IngestionJob] Analyzed: ${analysisResults.analyzed}, Analysis errors: ${analysisResults.errors}`);

  if (errors.length > 0) {
    console.warn(`[IngestionJob] Completed with ${errors.length} errors:`, errors);
  }

  return result;
}

/**
 * Fetch articles from a single source
 */
async function fetchFromSource(source: {
  id: string;
  name: string;
  feedUrl: string;
}): Promise<SourceFetchResult> {
  console.log(`[IngestionJob] Fetching from source: ${source.name}`);

  try {
    // Fetch articles from RSS
    const fetchedArticles = await rssFetcher.fetchFromRSS(source.feedUrl);

    // Prepare articles for bulk insert
    const articlesToCreate = fetchedArticles.map((article) => ({
      sourceId: source.id,
      ...article,
    }));

    // Bulk create, skipping duplicates
    const { created, skipped } = await sourcesService.createArticlesBulk(articlesToCreate);

    // Update last checked timestamp
    await sourcesService.updateLastChecked(source.id);

    console.log(`[IngestionJob] Source ${source.name}: created=${created}, skipped=${skipped}`);

    return {
      sourceId: source.id,
      sourceName: source.name,
      created,
      skipped,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[IngestionJob] Error fetching from ${source.name}:`, errorMessage);

    return {
      sourceId: source.id,
      sourceName: source.name,
      created: 0,
      skipped: 0,
      error: errorMessage,
    };
  }
}

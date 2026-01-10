/**
 * Ingestion Lambda Handler
 *
 * AWS Lambda handler for scheduled ingestion triggered by EventBridge.
 * Runs daily at midnight EST (5:00 AM UTC) to:
 * 1. Fetch articles from all active news sources
 * 2. Detect duplicates across sources
 * 3. Queue non-duplicate articles for AI analysis
 *
 * Also supports "analysis only" mode for processing pending articles without RSS fetch.
 */

import type { ScheduledEvent, Context } from 'aws-lambda';
import { runIngestionJob } from './jobs/ingestionJob';
import type { IngestionJobResult } from './jobs/ingestionJob';
import { analyzeAllPending, analyzeArticle, screenOnly } from './services/ingestion/articleAnalyzer';

/**
 * Lambda response structure
 */
interface LambdaResponse {
  statusCode: number;
  body: string;
}

/**
 * Custom event payload for analysis-only mode
 */
interface AnalysisOnlyEvent {
  mode: 'analysis_only';
  limit?: number;
}

/**
 * Custom event payload for single article analysis
 * Invoked from API with async Lambda invocation
 */
interface SingleArticleEvent {
  action: 'analyzeArticle';
  articleId: string;
}

/**
 * Custom event payload for bulk article screening
 * Invoked from API with async Lambda invocation
 */
interface BulkScreenEvent {
  action: 'bulkScreen';
  articleIds: string[];
}

type LambdaEvent = ScheduledEvent | AnalysisOnlyEvent | SingleArticleEvent | BulkScreenEvent;

function isAnalysisOnlyEvent(event: LambdaEvent): event is AnalysisOnlyEvent {
  return (event as AnalysisOnlyEvent).mode === 'analysis_only';
}

function isSingleArticleEvent(event: LambdaEvent): event is SingleArticleEvent {
  return (event as SingleArticleEvent).action === 'analyzeArticle';
}

function isBulkScreenEvent(event: LambdaEvent): event is BulkScreenEvent {
  return (event as BulkScreenEvent).action === 'bulkScreen';
}

/**
 * Main Lambda handler for scheduled ingestion
 *
 * Triggered by EventBridge rule at cron(0 5 * * ? *)
 * This corresponds to midnight EST (5:00 AM UTC)
 *
 * Can also be invoked with { mode: 'analysis_only' } to skip RSS and just analyze pending articles
 */
export async function handler(
  event: LambdaEvent,
  context: Context
): Promise<LambdaResponse> {
  console.log(`[IngestionLambda] Request ID: ${context.awsRequestId}`);

  // Check for single article analysis mode (invoked from API via async Lambda)
  if (isSingleArticleEvent(event)) {
    console.log(`[IngestionLambda] Running single article analysis for: ${event.articleId}`);

    try {
      const result = await analyzeArticle(event.articleId);
      console.log(`[IngestionLambda] Single article analysis complete:`, {
        articleId: event.articleId,
        isMilestoneWorthy: result.screening.isMilestoneWorthy,
        draftsCreated: result.draftsCreated,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Single article analysis completed',
          articleId: event.articleId,
          isMilestoneWorthy: result.screening.isMilestoneWorthy,
          draftsCreated: result.draftsCreated,
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[IngestionLambda] Single article analysis error for ${event.articleId}:`, errorMessage);

      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Single article analysis failed',
          articleId: event.articleId,
          error: errorMessage,
        }),
      };
    }
  }

  // Check for bulk screen mode (invoked from API via async Lambda)
  if (isBulkScreenEvent(event)) {
    console.log(`[IngestionLambda] Running bulk screening for ${event.articleIds.length} articles`);

    const results: Array<{ articleId: string; success: boolean; error?: string }> = [];

    for (const articleId of event.articleIds) {
      try {
        await screenOnly(articleId);
        results.push({ articleId, success: true });
        console.log(`[IngestionLambda] Screened article ${articleId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ articleId, success: false, error: errorMessage });
        console.error(`[IngestionLambda] Failed to screen ${articleId}:`, errorMessage);
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`[IngestionLambda] Bulk screening complete: ${succeeded} succeeded, ${failed} failed`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Bulk screening completed: ${succeeded} succeeded, ${failed} failed`,
        succeeded,
        failed,
        results,
      }),
    };
  }

  // Check for analysis-only mode (invoked from API)
  if (isAnalysisOnlyEvent(event)) {
    console.log('[IngestionLambda] Running in analysis-only mode');
    const limit = event.limit || 10;

    try {
      const result = await analyzeAllPending(limit);
      console.log(`[IngestionLambda] Analysis complete: ${result.analyzed} analyzed, ${result.errors} errors`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Analysis job completed',
          analyzed: result.analyzed,
          errors: result.errors,
          results: result.results,
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[IngestionLambda] Analysis error:', errorMessage);

      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Analysis job failed',
          error: errorMessage,
        }),
      };
    }
  }

  // Standard scheduled ingestion mode
  console.log('[IngestionLambda] Invoked by EventBridge');
  console.log(`[IngestionLambda] Event source: ${(event as ScheduledEvent).source}`);
  console.log(`[IngestionLambda] Event time: ${(event as ScheduledEvent).time}`);

  try {
    // Run the ingestion pipeline
    const result = await runIngestionJob();

    // Log summary for CloudWatch
    logJobSummary(result);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Ingestion job completed successfully',
        summary: {
          durationMs: result.durationMs,
          sourcesProcessed: result.sourcesProcessed,
          articlesCreated: result.totalCreated,
          articlesSkipped: result.totalSkipped,
          duplicatesFound: result.duplicatesFound,
          articlesAnalyzed: result.analysisResults.analyzed,
          errorsCount: result.errors.length,
        },
      }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('[IngestionLambda] Fatal error:', errorMessage);
    console.error('[IngestionLambda] Stack trace:', error);

    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Ingestion job failed',
        error: errorMessage,
      }),
    };
  }
}

/**
 * Log job summary to CloudWatch in a structured format
 */
function logJobSummary(result: IngestionJobResult): void {
  // Log structured metrics for CloudWatch Logs Insights
  console.log(
    JSON.stringify({
      type: 'INGESTION_JOB_COMPLETE',
      timestamp: result.endTime.toISOString(),
      metrics: {
        durationMs: result.durationMs,
        sourcesProcessed: result.sourcesProcessed,
        totalFetched: result.totalFetched,
        totalCreated: result.totalCreated,
        totalSkipped: result.totalSkipped,
        duplicatesFound: result.duplicatesFound,
        articlesAnalyzed: result.analysisResults.analyzed,
        analysisErrors: result.analysisResults.errors,
        jobErrors: result.errors.length,
      },
      sourceResults: result.sourceResults.map((r) => ({
        sourceId: r.sourceId,
        sourceName: r.sourceName,
        created: r.created,
        skipped: r.skipped,
        hasError: !!r.error,
      })),
    })
  );

  // Log errors separately for easier alerting
  if (result.errors.length > 0) {
    console.warn(
      JSON.stringify({
        type: 'INGESTION_JOB_ERRORS',
        timestamp: result.endTime.toISOString(),
        errors: result.errors,
      })
    );
  }
}

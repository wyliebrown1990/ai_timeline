/**
 * Ingestion Lambda Handler
 *
 * AWS Lambda handler for scheduled ingestion triggered by EventBridge.
 * Runs daily at midnight EST (5:00 AM UTC) to:
 * 1. Fetch articles from all active news sources
 * 2. Detect duplicates across sources
 * 3. Queue non-duplicate articles for AI analysis
 */

import type { ScheduledEvent, Context } from 'aws-lambda';
import { runIngestionJob } from './jobs/ingestionJob';
import type { IngestionJobResult } from './jobs/ingestionJob';

/**
 * Lambda response structure
 */
interface LambdaResponse {
  statusCode: number;
  body: string;
}

/**
 * Main Lambda handler for scheduled ingestion
 *
 * Triggered by EventBridge rule at cron(0 5 * * ? *)
 * This corresponds to midnight EST (5:00 AM UTC)
 */
export async function handler(
  event: ScheduledEvent,
  context: Context
): Promise<LambdaResponse> {
  console.log('[IngestionLambda] Invoked by EventBridge');
  console.log(`[IngestionLambda] Event source: ${event.source}`);
  console.log(`[IngestionLambda] Event time: ${event.time}`);
  console.log(`[IngestionLambda] Request ID: ${context.awsRequestId}`);

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

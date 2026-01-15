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
import { ingestBibliography, generateMarkdownReport } from './services/ingestion/bibliographyIngestion';
import { prisma } from './db';

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

/**
 * Custom event payload for bibliography ingestion
 * Sprint Bib-1: Automated bibliography ingestion
 */
interface BibliographyIngestionEvent {
  action: 'bibliographyIngestion';
  sourceUrl?: string;
  maxEntries?: number;
  dryRun?: boolean;
  skipScraping?: boolean;
}

/**
 * Custom event payload for cleaning up invalid milestones
 */
interface CleanupMilestonesEvent {
  action: 'cleanupMilestones';
  dryRun?: boolean;
}

/**
 * Custom event payload for fixing contributors with invalid values
 */
interface FixContributorsEvent {
  action: 'fixContributors';
  dryRun?: boolean;
}

type LambdaEvent = ScheduledEvent | AnalysisOnlyEvent | SingleArticleEvent | BulkScreenEvent | BibliographyIngestionEvent | CleanupMilestonesEvent | FixContributorsEvent;

function isAnalysisOnlyEvent(event: LambdaEvent): event is AnalysisOnlyEvent {
  return (event as AnalysisOnlyEvent).mode === 'analysis_only';
}

function isSingleArticleEvent(event: LambdaEvent): event is SingleArticleEvent {
  return (event as SingleArticleEvent).action === 'analyzeArticle';
}

function isBulkScreenEvent(event: LambdaEvent): event is BulkScreenEvent {
  return (event as BulkScreenEvent).action === 'bulkScreen';
}

function isBibliographyIngestionEvent(event: LambdaEvent): event is BibliographyIngestionEvent {
  return (event as BibliographyIngestionEvent).action === 'bibliographyIngestion';
}

function isCleanupMilestonesEvent(event: LambdaEvent): event is CleanupMilestonesEvent {
  return (event as CleanupMilestonesEvent).action === 'cleanupMilestones';
}

function isFixContributorsEvent(event: LambdaEvent): event is FixContributorsEvent {
  return (event as FixContributorsEvent).action === 'fixContributors';
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

  // Check for bibliography ingestion mode (Sprint Bib-1)
  if (isBibliographyIngestionEvent(event)) {
    console.log(`[IngestionLambda] Running bibliography ingestion`);
    console.log(`  Source URL: ${event.sourceUrl || 'default'}`);
    console.log(`  Max entries: ${event.maxEntries || 'unlimited'}`);
    console.log(`  Dry run: ${event.dryRun ?? false}`);
    console.log(`  Skip scraping: ${event.skipScraping ?? false}`);

    try {
      const report = await ingestBibliography({
        sourceUrl: event.sourceUrl || 'https://www.abriefhistoryofintelligence.com/bibliography',
        maxEntries: event.maxEntries,
        dryRun: event.dryRun ?? false,
        skipScraping: event.skipScraping ?? false,
        onProgress: (progress) => {
          console.log(`[BibliographyIngestion] [${progress.phase}] ${progress.message}`);
        },
      });

      const markdownReport = generateMarkdownReport(report);
      console.log('[IngestionLambda] Bibliography ingestion complete');
      console.log(markdownReport);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Bibliography ingestion completed',
          summary: {
            totalParsed: report.totalEntriesParsed,
            aimlFiltered: report.aimlFiltered,
            duplicatesSkipped: report.duplicatesSkipped,
            scrapingSucceeded: report.scrapingSucceeded,
            scrapingFailed: report.scrapingFailed,
            llmGenerated: report.llmGenerated,
            milestonesCreated: report.milestonesCreated,
            errorCount: report.errors.length,
            processingTimeMs: report.processingTimeMs,
          },
          createdMilestoneIds: report.createdMilestoneIds,
          errors: report.errors.slice(0, 10), // Limit errors in response
          markdownReport,
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[IngestionLambda] Bibliography ingestion error:', errorMessage);

      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Bibliography ingestion failed',
          error: errorMessage,
        }),
      };
    }
  }

  // Check for milestone cleanup mode
  if (isCleanupMilestonesEvent(event)) {
    console.log('[IngestionLambda] Running milestone cleanup');
    const dryRun = event.dryRun ?? false;

    try {
      // Find milestones with invalid titles
      const invalidMilestones = await prisma.milestone.findMany({
        where: {
          OR: [
            { title: { contains: '&nbsp;' } },
            { title: { startsWith: ',' } },
            { title: { startsWith: ' ' } },
          ]
        },
        select: {
          id: true,
          title: true,
        }
      });

      console.log(`[IngestionLambda] Found ${invalidMilestones.length} milestones with invalid titles`);

      if (dryRun) {
        console.log('[IngestionLambda] DRY RUN - would delete:');
        for (const m of invalidMilestones) {
          console.log(`  - ${m.id}: "${m.title.slice(0, 50)}..."`);
        }

        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Cleanup dry run completed',
            dryRun: true,
            foundCount: invalidMilestones.length,
            milestones: invalidMilestones.map(m => ({ id: m.id, title: m.title.slice(0, 100) })),
          }),
        };
      }

      // Delete invalid milestones
      const deleteResult = await prisma.milestone.deleteMany({
        where: {
          id: { in: invalidMilestones.map(m => m.id) }
        }
      });

      console.log(`[IngestionLambda] Deleted ${deleteResult.count} milestones`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Cleanup completed',
          deletedCount: deleteResult.count,
          deletedIds: invalidMilestones.map(m => m.id),
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[IngestionLambda] Cleanup error:', errorMessage);

      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Cleanup failed',
          error: errorMessage,
        }),
      };
    }
  }

  // Check for fix contributors mode
  if (isFixContributorsEvent(event)) {
    console.log('[IngestionLambda] Running fix contributors');
    const dryRun = event.dryRun ?? false;

    try {
      // Find all milestones and check for invalid contributors
      const allMilestones = await prisma.milestone.findMany({
        select: {
          id: true,
          contributors: true,
        }
      });

      const milestonesToFix: Array<{ id: string; oldContributors: string[]; newContributors: string[] }> = [];

      for (const m of allMilestones) {
        let contributors: string[] = [];
        try {
          contributors = typeof m.contributors === 'string'
            ? JSON.parse(m.contributors)
            : (m.contributors as string[]) || [];
        } catch {
          contributors = [];
        }

        // Filter out invalid contributors (nbsp, empty, etc.)
        const validContributors = contributors.filter((c: string) => {
          if (!c || typeof c !== 'string') return false;
          const cleaned = c.trim();
          if (cleaned.length < 2) return false;
          if (/^[\s&;,.\-]+$/.test(cleaned)) return false;
          if (/nbsp/i.test(cleaned)) return false;
          if (!/[a-zA-Z]/.test(cleaned)) return false;
          return true;
        });

        // Check if we need to update
        if (validContributors.length !== contributors.length) {
          milestonesToFix.push({
            id: m.id,
            oldContributors: contributors,
            newContributors: validContributors,
          });
        }
      }

      console.log(`[IngestionLambda] Found ${milestonesToFix.length} milestones with invalid contributors`);

      if (dryRun) {
        console.log('[IngestionLambda] DRY RUN - would fix:');
        for (const m of milestonesToFix) {
          console.log(`  - ${m.id}: ${JSON.stringify(m.oldContributors)} -> ${JSON.stringify(m.newContributors)}`);
        }

        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Fix contributors dry run completed',
            dryRun: true,
            foundCount: milestonesToFix.length,
            milestones: milestonesToFix.map(m => ({
              id: m.id,
              oldContributors: m.oldContributors,
              newContributors: m.newContributors
            })),
          }),
        };
      }

      // Update milestones with valid contributors
      let updatedCount = 0;
      for (const m of milestonesToFix) {
        await prisma.milestone.update({
          where: { id: m.id },
          data: { contributors: JSON.stringify(m.newContributors) }
        });
        updatedCount++;
        console.log(`[IngestionLambda] Fixed contributors for ${m.id}`);
      }

      console.log(`[IngestionLambda] Fixed ${updatedCount} milestones`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Fix contributors completed',
          updatedCount,
          updatedIds: milestonesToFix.map(m => m.id),
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[IngestionLambda] Fix contributors error:', errorMessage);

      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Fix contributors failed',
          error: errorMessage,
        }),
      };
    }
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

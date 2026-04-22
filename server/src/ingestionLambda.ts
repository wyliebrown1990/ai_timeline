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

/**
 * Custom event payload for removing duplicate milestones
 */
interface RemoveDuplicatesEvent {
  action: 'removeDuplicates';
  dryRun?: boolean;
}

/**
 * Custom event payload for populating missing contributors using LLM
 */
interface PopulateContributorsEvent {
  action: 'populateContributors';
  dryRun?: boolean;
  limit?: number;
}

/**
 * Custom event payload for backfilling missing layered content fields
 */
interface BackfillLayeredContentEvent {
  action: 'backfillLayeredContent';
  dryRun?: boolean;
  limit?: number;
  batchSize?: number;
}

/**
 * Custom event payload for bulk updating layered content with pre-generated content
 */
interface BulkUpdateLayeredContentEvent {
  action: 'bulkUpdateLayeredContent';
  updates: Array<{
    id: string;
    whyItMattersToday?: string;
    commonMisconceptions?: string;
  }>;
}

/**
 * Custom event payload for weekly quiz generation
 * Triggered by EventBridge rule on Sunday evening EST (Monday 1:00 AM UTC)
 */
interface GenerateQuizEvent {
  action: 'generateQuiz';
  questionCount?: number;
  daysBack?: number;
  forceRegenerate?: boolean;
}

type LambdaEvent = ScheduledEvent | AnalysisOnlyEvent | SingleArticleEvent | BulkScreenEvent | BibliographyIngestionEvent | CleanupMilestonesEvent | FixContributorsEvent | RemoveDuplicatesEvent | PopulateContributorsEvent | BackfillLayeredContentEvent | BulkUpdateLayeredContentEvent | GenerateQuizEvent;

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

function isRemoveDuplicatesEvent(event: LambdaEvent): event is RemoveDuplicatesEvent {
  return (event as RemoveDuplicatesEvent).action === 'removeDuplicates';
}

function isPopulateContributorsEvent(event: LambdaEvent): event is PopulateContributorsEvent {
  return (event as PopulateContributorsEvent).action === 'populateContributors';
}

function isBackfillLayeredContentEvent(event: LambdaEvent): event is BackfillLayeredContentEvent {
  return (event as BackfillLayeredContentEvent).action === 'backfillLayeredContent';
}

function isBulkUpdateLayeredContentEvent(event: LambdaEvent): event is BulkUpdateLayeredContentEvent {
  return (event as BulkUpdateLayeredContentEvent).action === 'bulkUpdateLayeredContent';
}

function isGenerateQuizEvent(event: LambdaEvent): event is GenerateQuizEvent {
  return (event as GenerateQuizEvent).action === 'generateQuiz';
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

  // Check for remove duplicates mode
  if (isRemoveDuplicatesEvent(event)) {
    console.log('[IngestionLambda] Running remove duplicates');
    const dryRun = event.dryRun ?? false;

    try {
      // Find all milestones
      const allMilestones = await prisma.milestone.findMany({
        select: {
          id: true,
          title: true,
          date: true,
        },
        orderBy: { createdAt: 'asc' } // Keep oldest, remove newer duplicates
      });

      // Find duplicates: milestones with _N suffix where N >= 1
      const duplicateIds: string[] = [];
      const duplicateRegex = /_(\d+)$/;

      for (const m of allMilestones) {
        const match = m.id.match(duplicateRegex);
        if (match) {
          const suffix = parseInt(match[1], 10);
          if (suffix >= 1) {
            // This is a duplicate - check if the base milestone exists
            const baseId = m.id.replace(duplicateRegex, '');
            const baseExists = allMilestones.some(other => other.id === baseId);
            if (baseExists) {
              duplicateIds.push(m.id);
            }
          }
        }
      }

      // Also find near-duplicates by normalized title within same year
      const byYearTitle = new Map<string, typeof allMilestones>();
      for (const m of allMilestones) {
        if (duplicateIds.includes(m.id)) continue; // Already marked as duplicate

        const year = m.date ? new Date(m.date).getFullYear() : 0;
        const normalizedTitle = m.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
        const key = `${year}_${normalizedTitle}`;

        if (!byYearTitle.has(key)) {
          byYearTitle.set(key, []);
        }
        byYearTitle.get(key)!.push(m);
      }

      // Mark all but the first in each group as duplicates
      for (const [key, group] of byYearTitle) {
        if (group.length > 1) {
          // Keep the first (oldest), mark rest as duplicates
          for (let i = 1; i < group.length; i++) {
            if (!duplicateIds.includes(group[i].id)) {
              duplicateIds.push(group[i].id);
            }
          }
        }
      }

      console.log(`[IngestionLambda] Found ${duplicateIds.length} duplicate milestones`);

      if (dryRun) {
        console.log('[IngestionLambda] DRY RUN - would delete:');
        for (const id of duplicateIds) {
          const m = allMilestones.find(x => x.id === id);
          console.log(`  - ${id}: ${m?.title?.slice(0, 50)}...`);
        }

        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Remove duplicates dry run completed',
            dryRun: true,
            foundCount: duplicateIds.length,
            duplicateIds,
          }),
        };
      }

      // Delete duplicates
      const deleteResult = await prisma.milestone.deleteMany({
        where: {
          id: { in: duplicateIds }
        }
      });

      console.log(`[IngestionLambda] Deleted ${deleteResult.count} duplicate milestones`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Remove duplicates completed',
          deletedCount: deleteResult.count,
          deletedIds: duplicateIds,
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[IngestionLambda] Remove duplicates error:', errorMessage);

      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Remove duplicates failed',
          error: errorMessage,
        }),
      };
    }
  }

  // Check for populate contributors mode (use static mappings and title extraction)
  if (isPopulateContributorsEvent(event)) {
    console.log('[IngestionLambda] Running populate contributors');
    const dryRun = event.dryRun ?? false;

    try {
      // Title-only keywords (more accurate, must appear in title)
      const titleOnlyKeywords: Record<string, string[]> = {
        // People's names - these should only match in title
        'pavlov': ['Ivan Pavlov'],
        'thorndike': ['Edward Thorndike'],
        'hebb': ['Donald Hebb'],
        'turing': ['Alan Turing'],
        'mcculloch': ['Warren McCulloch', 'Walter Pitts'],
        'rosenblatt': ['Frank Rosenblatt'],
        'minsky': ['Marvin Minsky', 'Seymour Papert'],
        'weizenbaum': ['Joseph Weizenbaum'],
        'newell': ['Allen Newell', 'Herbert Simon'],
        'shannon': ['Claude Shannon'],
        'mccarthy': ['John McCarthy'],
        'samuel': ['Arthur Samuel'],
        'hopfield': ['John Hopfield'],
        'rumelhart': ['David Rumelhart', 'Geoffrey Hinton', 'Ronald Williams'],
        'lecun': ['Yann LeCun'],
        'hinton': ['Geoffrey Hinton'],
        'bengio': ['Yoshua Bengio'],
        'schmidhuber': ['Jürgen Schmidhuber'],
        'hochreiter': ['Sepp Hochreiter', 'Jürgen Schmidhuber'],
        'sutton': ['Richard Sutton'],
        'barto': ['Andrew Barto'],
        'watkins': ['Christopher Watkins'],
        'tesauro': ['Gerald Tesauro'],
        'schultz': ['Wolfram Schultz'],
        'maclean': ['Paul MacLean'],
        'berridge': ['Kent Berridge', 'Terry Robinson'],
        'friston': ['Karl Friston'],
        'rizzolatti': ['Giacomo Rizzolatti'],
        'andrew ng': ['Andrew Ng'],
        // Products/systems - title only
        'td-gammon': ['Gerald Tesauro'],
        'alphago': ['David Silver', 'Demis Hassabis'],
        'alphafold': ['Demis Hassabis', 'John Jumper'],
        'chatgpt': ['Sam Altman', 'Ilya Sutskever'],
        'gpt-4': ['Sam Altman', 'Ilya Sutskever'],
        'gpt-5': ['Sam Altman', 'Ilya Sutskever'],
        'claude': ['Dario Amodei', 'Daniela Amodei'],
        'gemini': ['Demis Hassabis', 'Jeff Dean'],
        'llama': ['Mark Zuckerberg', 'Yann LeCun'],
      };

      // Title+description keywords (broader but should match topic)
      const broadKeywords: Record<string, string[]> = {
        'triune brain': ['Paul MacLean'],
        'free energy principle': ['Karl Friston'],
        'active inference': ['Karl Friston'],
        'mirror neuron': ['Giacomo Rizzolatti'],
        'backpropagation': ['David Rumelhart', 'Geoffrey Hinton', 'Ronald Williams'],
        'lstm': ['Sepp Hochreiter', 'Jürgen Schmidhuber'],
        'transformer architecture': ['Ashish Vaswani'],
        'attention is all you need': ['Ashish Vaswani'],
        'social brain hypothesis': ['Robin Dunbar'],
        'autonomous helicopter': ['Andrew Ng', 'Pieter Abbeel'],
        'helicopter aerobatics': ['Andrew Ng', 'Pieter Abbeel'],
        'reinforcement learning: an introduction': ['Richard Sutton', 'Andrew Barto'],
      };

      // Organization-specific keywords (must be in title AND not about competitors)
      const orgKeywords: Record<string, { org: string; names: string[]; antiKeywords: string[] }> = {
        'openai': { org: 'openai', names: ['Sam Altman', 'Ilya Sutskever'], antiKeywords: ['google', 'anthropic', 'meta', 'deepmind', 'gemini'] },
        'deepmind': { org: 'deepmind', names: ['Demis Hassabis', 'Shane Legg'], antiKeywords: ['openai', 'anthropic', 'meta', 'chatgpt'] },
        'anthropic': { org: 'anthropic', names: ['Dario Amodei', 'Daniela Amodei'], antiKeywords: ['openai', 'deepmind', 'meta', 'chatgpt', 'gemini'] },
        'google ai': { org: 'google', names: ['Jeff Dean', 'Demis Hassabis'], antiKeywords: ['openai', 'anthropic', 'meta'] },
        'mistral': { org: 'mistral', names: ['Arthur Mensch', 'Guillaume Lample'], antiKeywords: ['openai', 'anthropic', 'google', 'deepmind'] },
      };

      // Find milestones with empty contributors
      const allMilestones = await prisma.milestone.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          contributors: true,
        },
      });

      const results: Array<{ id: string; title: string; contributors: string[]; method: string }> = [];

      for (const m of allMilestones) {
        let contributors: string[] = [];
        try {
          contributors = typeof m.contributors === 'string'
            ? JSON.parse(m.contributors)
            : (m.contributors as string[]) || [];
        } catch {
          contributors = [];
        }

        if (contributors && contributors.length > 0) {
          continue; // Already has contributors
        }

        const titleLower = m.title.toLowerCase();
        const descLower = (m.description || '').toLowerCase();
        const combined = titleLower + ' ' + descLower;

        let foundContributors: string[] = [];
        let method = 'none';

        // Priority 1: Title-only keywords (most accurate)
        for (const [keyword, names] of Object.entries(titleOnlyKeywords)) {
          // Use word boundary check for more accuracy
          const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
          if (regex.test(titleLower)) {
            foundContributors = names;
            method = `title:${keyword}`;
            break;
          }
        }

        // Priority 2: Broad keywords (title + description)
        if (foundContributors.length === 0) {
          for (const [keyword, names] of Object.entries(broadKeywords)) {
            if (combined.includes(keyword.toLowerCase())) {
              foundContributors = names;
              method = `broad:${keyword}`;
              break;
            }
          }
        }

        // Priority 3: Organization keywords (with anti-keyword filtering)
        if (foundContributors.length === 0) {
          for (const [keyword, config] of Object.entries(orgKeywords)) {
            const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(titleLower)) {
              // Check anti-keywords - if any appear in title, skip this match
              const hasAntiKeyword = config.antiKeywords.some(anti => titleLower.includes(anti));
              if (!hasAntiKeyword) {
                foundContributors = config.names;
                method = `org:${keyword}`;
                break;
              }
            }
          }
        }

        // Priority 4: Dopamine research (special case - only if title mentions dopamine AND prediction/reward)
        if (foundContributors.length === 0) {
          if (titleLower.includes('dopamine') && (titleLower.includes('reward') || titleLower.includes('prediction'))) {
            foundContributors = ['Wolfram Schultz'];
            method = 'pattern:dopamine_reward';
          }
        }

        if (foundContributors.length > 0) {
          if (!dryRun) {
            await prisma.milestone.update({
              where: { id: m.id },
              data: { contributors: JSON.stringify(foundContributors) }
            });
          }
          results.push({ id: m.id, title: m.title.slice(0, 50), contributors: foundContributors, method });
          console.log(`[IngestionLambda] ${dryRun ? 'Would populate' : 'Populated'} ${m.id}: ${foundContributors.join(', ')} (${method})`);
        } else {
          results.push({ id: m.id, title: m.title.slice(0, 50), contributors: [], method: 'no_match' });
        }
      }

      const populated = results.filter(r => r.contributors.length > 0).length;
      const notPopulated = results.filter(r => r.contributors.length === 0);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Populate contributors ${dryRun ? 'dry run ' : ''}completed`,
          dryRun,
          totalChecked: allMilestones.length,
          populated,
          notPopulated: notPopulated.length,
          results: results.filter(r => r.contributors.length > 0),
          unmatched: notPopulated.map(r => ({ id: r.id, title: r.title })),
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[IngestionLambda] Populate contributors error:', errorMessage);

      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Populate contributors failed',
          error: errorMessage,
        }),
      };
    }
  }

  // Check for backfill layered content mode (generate whyItMattersToday and commonMisconceptions)
  if (isBackfillLayeredContentEvent(event)) {
    console.log('[IngestionLambda] Running backfill layered content');
    const dryRun = event.dryRun ?? false;
    const limit = event.limit ?? 50;
    const batchSize = event.batchSize ?? 5;

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            message: 'ANTHROPIC_API_KEY not configured',
          }),
        };
      }

      // Find milestones missing layered content
      const milestonesNeedingContent = await prisma.milestone.findMany({
        where: {
          OR: [
            { whyItMattersToday: null },
            { whyItMattersToday: '' },
            { commonMisconceptions: null },
            { commonMisconceptions: '' },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          category: true,
          significance: true,
          era: true,
          contributors: true,
          whyItMattersToday: true,
          commonMisconceptions: true,
        },
        take: limit,
        orderBy: { significance: 'desc' }, // Prioritize high-significance milestones
      });

      console.log(`[IngestionLambda] Found ${milestonesNeedingContent.length} milestones needing layered content`);

      if (dryRun) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Backfill layered content dry run completed',
            dryRun: true,
            totalNeedingContent: milestonesNeedingContent.length,
            milestones: milestonesNeedingContent.map(m => ({
              id: m.id,
              title: m.title.slice(0, 60),
              significance: m.significance,
              missingWhyItMatters: !m.whyItMattersToday,
              missingMisconceptions: !m.commonMisconceptions,
            })),
          }),
        };
      }

      // Import Anthropic dynamically
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });

      const results: Array<{
        id: string;
        title: string;
        success: boolean;
        error?: string;
        fieldsGenerated: string[];
      }> = [];

      // Process in batches
      for (let i = 0; i < milestonesNeedingContent.length; i += batchSize) {
        const batch = milestonesNeedingContent.slice(i, i + batchSize);
        console.log(`[IngestionLambda] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(milestonesNeedingContent.length / batchSize)}`);

        for (const milestone of batch) {
          try {
            const fieldsToGenerate: string[] = [];
            if (!milestone.whyItMattersToday) fieldsToGenerate.push('whyItMattersToday');
            if (!milestone.commonMisconceptions) fieldsToGenerate.push('commonMisconceptions');

            let contributors: string[] = [];
            try {
              contributors = typeof milestone.contributors === 'string'
                ? JSON.parse(milestone.contributors)
                : (milestone.contributors as string[]) || [];
            } catch {
              contributors = [];
            }

            const prompt = `You are generating educational content for an AI history timeline milestone.

## Milestone Details:
Title: ${milestone.title}
Description: ${milestone.description}
Date: ${milestone.date ? new Date(milestone.date).toISOString().split('T')[0] : 'Unknown'}
Category: ${milestone.category}
Significance: ${milestone.significance}/4
Era: ${milestone.era || 'Unknown'}
Contributors: ${contributors.join(', ') || 'Unknown'}

## Generate the following JSON with ONLY the requested fields:
{
${fieldsToGenerate.includes('whyItMattersToday') ? `  "whyItMattersToday": "<2-3 sentences explaining why this work is still relevant today and how it connects to current AI developments. Be specific about modern applications or systems that build on this work.>",` : ''}
${fieldsToGenerate.includes('commonMisconceptions') ? `  "commonMisconceptions": "<2-3 common misconceptions people have about this work, topic, or technology, with brief corrections. Format as: 'Misconception 1: X. Reality: Y. Misconception 2: ...'>"` : ''}
}

Return ONLY the JSON object, no other text.`;

            const response = await client.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1000,
              messages: [{ role: 'user', content: prompt }],
            });

            const text = response.content[0].type === 'text' ? response.content[0].text : '';
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
              throw new Error('No JSON found in response');
            }

            const generated = JSON.parse(jsonMatch[0]) as {
              whyItMattersToday?: string;
              commonMisconceptions?: string;
            };

            // Update the milestone
            const updateData: { whyItMattersToday?: string; commonMisconceptions?: string } = {};
            if (generated.whyItMattersToday && fieldsToGenerate.includes('whyItMattersToday')) {
              updateData.whyItMattersToday = generated.whyItMattersToday;
            }
            if (generated.commonMisconceptions && fieldsToGenerate.includes('commonMisconceptions')) {
              updateData.commonMisconceptions = generated.commonMisconceptions;
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.milestone.update({
                where: { id: milestone.id },
                data: updateData,
              });

              results.push({
                id: milestone.id,
                title: milestone.title.slice(0, 50),
                success: true,
                fieldsGenerated: Object.keys(updateData),
              });
              console.log(`[IngestionLambda] Updated ${milestone.id}: ${Object.keys(updateData).join(', ')}`);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            results.push({
              id: milestone.id,
              title: milestone.title.slice(0, 50),
              success: false,
              error: errorMessage,
              fieldsGenerated: [],
            });
            console.error(`[IngestionLambda] Failed to process ${milestone.id}:`, errorMessage);
          }

          // Rate limiting delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Backfill layered content completed',
          dryRun: false,
          processed: results.length,
          succeeded: successCount,
          failed: failureCount,
          results: results,
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[IngestionLambda] Backfill layered content error:', errorMessage);

      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Backfill layered content failed',
          error: errorMessage,
        }),
      };
    }
  }

  // Check for bulk update layered content mode (manual content submission)
  if (isBulkUpdateLayeredContentEvent(event)) {
    console.log(`[IngestionLambda] Running bulk update layered content for ${event.updates.length} milestones`);

    try {
      const results: Array<{
        id: string;
        success: boolean;
        error?: string;
        fieldsUpdated: string[];
      }> = [];

      for (const update of event.updates) {
        try {
          const updateData: { whyItMattersToday?: string; commonMisconceptions?: string } = {};
          const fieldsUpdated: string[] = [];

          if (update.whyItMattersToday) {
            updateData.whyItMattersToday = update.whyItMattersToday;
            fieldsUpdated.push('whyItMattersToday');
          }
          if (update.commonMisconceptions) {
            updateData.commonMisconceptions = update.commonMisconceptions;
            fieldsUpdated.push('commonMisconceptions');
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.milestone.update({
              where: { id: update.id },
              data: updateData,
            });

            results.push({
              id: update.id,
              success: true,
              fieldsUpdated,
            });
            console.log(`[IngestionLambda] Updated ${update.id}: ${fieldsUpdated.join(', ')}`);
          } else {
            results.push({
              id: update.id,
              success: false,
              error: 'No fields provided',
              fieldsUpdated: [],
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            id: update.id,
            success: false,
            error: errorMessage,
            fieldsUpdated: [],
          });
          console.error(`[IngestionLambda] Failed to update ${update.id}:`, errorMessage);
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Bulk update layered content completed',
          processed: results.length,
          succeeded: successCount,
          failed: failureCount,
          results,
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[IngestionLambda] Bulk update layered content error:', errorMessage);

      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Bulk update layered content failed',
          error: errorMessage,
        }),
      };
    }
  }

  // Check for quiz generation mode (triggered by EventBridge weekly schedule)
  if (isGenerateQuizEvent(event)) {
    console.log('[IngestionLambda] Running weekly quiz generation');
    console.log(`  Question count: ${event.questionCount || 5}`);
    console.log(`  Days back: ${event.daysBack || 7}`);
    console.log(`  Force regenerate: ${event.forceRegenerate ?? false}`);

    try {
      const { generateWeeklyQuiz } = await import('./services/newsQuizGenerator');

      const result = await generateWeeklyQuiz(prisma, {
        questionCount: event.questionCount || 5,
        daysBack: event.daysBack || 7,
        forceRegenerate: event.forceRegenerate ?? false,
      });

      console.log(`[IngestionLambda] Quiz generation complete`);
      console.log(`  Week of: ${result.weekOf.toISOString()}`);
      console.log(`  Questions generated: ${result.questions.length}`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Weekly quiz generation completed',
          weekOf: result.weekOf.toISOString(),
          questionsGenerated: result.questions.length,
          questionTypes: result.questions.map(q => q.questionType),
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[IngestionLambda] Quiz generation FAILED:', errorMessage);
      console.error('[IngestionLambda] Full error:', error);

      // Re-throw so Lambda reports as failed — triggers CloudWatch alarm + EventBridge retry
      throw error;
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

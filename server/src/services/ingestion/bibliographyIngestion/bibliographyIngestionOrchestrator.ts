/**
 * Bibliography Ingestion Orchestrator
 * Sprint Bib-1: Main entry point for automated bibliography ingestion
 *
 * Orchestrates the full pipeline: parse → filter → dedupe → scrape → generate → publish
 */

import type {
  IngestionOptions,
  IngestionReport,
  ProcessingResult,
  ScrapedMetadata,
} from './types';
import { parseBibliography } from './bibliographyParser';
import { filterToAIML } from './aimlFilter';
import { checkDuplicates, clearMilestonesCache } from './bibliographyDeduplicator';
import { fetchSourceMetadata } from './sourceMetadataFetcher';
import { generateMilestoneData } from './milestoneGenerator';
import { publishMilestone } from './bibliographyPublisher';

/**
 * Get Anthropic API key from environment
 */
function getAnthropicApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable not set');
  }
  return apiKey;
}

/**
 * Main orchestrator function
 */
export async function ingestBibliography(options: IngestionOptions): Promise<IngestionReport> {
  const {
    sourceUrl,
    dryRun = false,
    batchSize = 30,
    maxEntries,
    skipScraping = false,
    onProgress,
  } = options;

  const startedAt = new Date();
  const apiKey = getAnthropicApiKey();

  const report: IngestionReport = {
    sourceUrl,
    startedAt,
    completedAt: new Date(),
    totalEntriesParsed: 0,
    aimlFiltered: 0,
    duplicatesSkipped: 0,
    scrapingSucceeded: 0,
    scrapingFailed: 0,
    llmGenerated: 0,
    milestonesCreated: 0,
    errors: [],
    processingTimeMs: 0,
    createdMilestoneIds: [],
  };

  try {
    // Phase 1: Parse bibliography
    console.log('\n========== PHASE 1: PARSING BIBLIOGRAPHY ==========');
    onProgress?.({
      phase: 'parsing',
      current: 0,
      total: 1,
      message: 'Fetching and parsing bibliography...',
    });

    const parsed = await parseBibliography(sourceUrl);
    report.totalEntriesParsed = parsed.entries.length;

    console.log(`Parsed ${parsed.entries.length} entries`);
    if (parsed.parseErrors.length > 0) {
      console.log(`Parse warnings: ${parsed.parseErrors.length}`);
    }

    // Limit entries if specified
    let entries = parsed.entries;
    if (maxEntries && entries.length > maxEntries) {
      console.log(`Limiting to ${maxEntries} entries`);
      entries = entries.slice(0, maxEntries);
    }

    // Phase 2: Filter to AI/ML
    console.log('\n========== PHASE 2: FILTERING TO AI/ML ==========');
    onProgress?.({
      phase: 'filtering',
      current: 0,
      total: entries.length,
      message: 'Classifying entries...',
    });

    const aimlEntries = await filterToAIML(entries, apiKey, {
      batchSize,
      onProgress: (processed, total) => {
        onProgress?.({
          phase: 'filtering',
          current: processed,
          total,
          message: `Classified ${processed}/${total} entries`,
        });
      },
    });

    report.aimlFiltered = aimlEntries.length;
    console.log(`Filtered to ${aimlEntries.length} AI/ML entries`);

    // Phase 3: Check for duplicates
    console.log('\n========== PHASE 3: CHECKING DUPLICATES ==========');
    onProgress?.({
      phase: 'deduplicating',
      current: 0,
      total: aimlEntries.length,
      message: 'Checking for duplicates...',
    });

    // Clear cache to ensure fresh data
    clearMilestonesCache();

    const { duplicates, unique } = await checkDuplicates(
      aimlEntries.map((r) => r.entry),
      {
        similarityThreshold: 0.85,
        onProgress: (processed, total) => {
          onProgress?.({
            phase: 'deduplicating',
            current: processed,
            total,
            message: `Checked ${processed}/${total} entries`,
          });
        },
      }
    );

    report.duplicatesSkipped = duplicates.length;
    console.log(`Found ${duplicates.length} duplicates, ${unique.length} unique entries`);

    // Map unique results back to classification results
    const uniqueEntries = unique.map((u) => {
      return aimlEntries.find((a) => a.entry.title === u.entry.title)!;
    });

    // Phase 4 & 5: Process each unique entry
    console.log('\n========== PHASE 4 & 5: PROCESSING ENTRIES ==========');
    const toProcess = uniqueEntries.slice(0, maxEntries || uniqueEntries.length);
    const results: ProcessingResult[] = [];

    for (let i = 0; i < toProcess.length; i++) {
      const classification = toProcess[i];
      const entry = classification.entry;

      onProgress?.({
        phase: 'processing',
        current: i + 1,
        total: toProcess.length,
        currentEntry: entry.title.slice(0, 50),
        message: `Processing ${i + 1}/${toProcess.length}: ${entry.title.slice(0, 40)}...`,
      });

      console.log(`\n--- Processing ${i + 1}/${toProcess.length}: "${entry.title.slice(0, 50)}..."`);

      // Try to fetch metadata
      let metadata: ScrapedMetadata | null = null;
      if (!skipScraping && (entry.sourceUrl || entry.doi)) {
        console.log('  Fetching metadata...');
        metadata = await fetchSourceMetadata(entry);
        if (metadata.success) {
          report.scrapingSucceeded++;
          console.log('  Metadata fetch succeeded');
        } else {
          report.scrapingFailed++;
          console.log(`  Metadata fetch failed: ${metadata.error}`);
        }
      } else {
        report.scrapingFailed++;
      }

      // Generate milestone data
      console.log('  Generating milestone data...');
      try {
        const milestoneData = await generateMilestoneData(entry, classification, metadata, apiKey);
        report.llmGenerated++;

        // Publish milestone
        console.log('  Publishing milestone...');
        const result = await publishMilestone(entry, milestoneData, metadata, dryRun);
        results.push(result);

        if (result.status === 'created') {
          report.milestonesCreated++;
          if (result.milestoneId) {
            report.createdMilestoneIds.push(result.milestoneId);
          }
          console.log(`  ✓ Created: ${result.milestoneId}`);
        } else if (result.status === 'error') {
          report.errors.push({ entry: entry.title, error: result.error || 'Unknown error' });
          console.log(`  ✗ Error: ${result.error}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        report.errors.push({ entry: entry.title, error: errorMsg });
        results.push({
          entry,
          status: 'error',
          scrapingSucceeded: metadata?.success ?? false,
          llmGenerated: false,
          error: errorMsg,
        });
        console.log(`  ✗ Error: ${errorMsg}`);
      }

      // Small delay between entries to avoid rate limiting
      if (i < toProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // Complete
    report.completedAt = new Date();
    report.processingTimeMs = report.completedAt.getTime() - startedAt.getTime();

    onProgress?.({
      phase: 'complete',
      current: toProcess.length,
      total: toProcess.length,
      message: `Completed: ${report.milestonesCreated} milestones created`,
    });

    console.log('\n========== INGESTION COMPLETE ==========');
    console.log(`Total parsed: ${report.totalEntriesParsed}`);
    console.log(`AI/ML filtered: ${report.aimlFiltered}`);
    console.log(`Duplicates skipped: ${report.duplicatesSkipped}`);
    console.log(`Scraping succeeded: ${report.scrapingSucceeded}`);
    console.log(`Scraping failed: ${report.scrapingFailed}`);
    console.log(`LLM generated: ${report.llmGenerated}`);
    console.log(`Milestones created: ${report.milestonesCreated}`);
    console.log(`Errors: ${report.errors.length}`);
    console.log(`Time: ${(report.processingTimeMs / 1000).toFixed(1)}s`);

    return report;
  } catch (error) {
    report.completedAt = new Date();
    report.processingTimeMs = report.completedAt.getTime() - startedAt.getTime();
    report.errors.push({
      entry: 'FATAL',
      error: error instanceof Error ? error.message : String(error),
    });

    console.error('\n========== INGESTION FAILED ==========');
    console.error(error);

    return report;
  }
}

/**
 * Generate a markdown report from ingestion results
 */
export function generateMarkdownReport(report: IngestionReport): string {
  const duration = (report.processingTimeMs / 1000).toFixed(1);

  let md = `# Bibliography Ingestion Report

## Summary

| Metric | Value |
|--------|-------|
| Source | ${report.sourceUrl} |
| Started | ${report.startedAt.toISOString()} |
| Completed | ${report.completedAt.toISOString()} |
| Duration | ${duration}s |

## Pipeline Statistics

| Stage | Count |
|-------|-------|
| Total Entries Parsed | ${report.totalEntriesParsed} |
| AI/ML Filtered | ${report.aimlFiltered} |
| Duplicates Skipped | ${report.duplicatesSkipped} |
| Scraping Succeeded | ${report.scrapingSucceeded} |
| Scraping Failed | ${report.scrapingFailed} |
| LLM Generated | ${report.llmGenerated} |
| **Milestones Created** | **${report.milestonesCreated}** |

## Success Rate

- Scraping success rate: ${report.scrapingSucceeded + report.scrapingFailed > 0 ? ((report.scrapingSucceeded / (report.scrapingSucceeded + report.scrapingFailed)) * 100).toFixed(1) : 0}%
- Overall success rate: ${report.aimlFiltered - report.duplicatesSkipped > 0 ? ((report.milestonesCreated / (report.aimlFiltered - report.duplicatesSkipped)) * 100).toFixed(1) : 0}%
`;

  if (report.createdMilestoneIds.length > 0) {
    md += `
## Created Milestones

${report.createdMilestoneIds.map((id) => `- \`${id}\``).join('\n')}
`;
  }

  if (report.errors.length > 0) {
    md += `
## Errors (${report.errors.length})

| Entry | Error |
|-------|-------|
${report.errors.map((e) => `| ${e.entry.slice(0, 50)}... | ${e.error.slice(0, 100)} |`).join('\n')}
`;
  }

  return md;
}

/**
 * Run a quick test with limited entries
 */
export async function testIngestion(
  sourceUrl: string,
  maxEntries: number = 5
): Promise<IngestionReport> {
  console.log(`\n===== TEST INGESTION (max ${maxEntries} entries) =====\n`);

  return ingestBibliography({
    sourceUrl,
    dryRun: true,
    maxEntries,
    onProgress: (progress) => {
      console.log(`[${progress.phase}] ${progress.message}`);
    },
  });
}

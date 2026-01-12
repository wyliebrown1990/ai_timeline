/**
 * Script: Backfill News Concepts and Context
 *
 * This script:
 * 1. Fetches all CurrentEvent records (optionally only those without context)
 * 2. For each one:
 *    - Detects and links glossary concepts
 *    - Generates "Why it matters" historical context
 *    - Finds and links related milestones
 *
 * Run with: npx tsx server/src/scripts/backfillNewsConcepts.ts
 * Options:
 *   --all          Process all events (default: only those without context)
 *   --limit=N      Process only N events
 *   --skip=N       Skip first N events
 *   --concepts     Only process concept detection (skip context)
 *   --context      Only process context generation (skip concepts)
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server/.env
config({ path: resolve(__dirname, '../../.env') });

import { prisma } from '../db';
import { processNewsEventConcepts } from '../services/newsConceptLinker';
import { generateNewsContext } from '../services/newsContextGenerator';

interface ProcessResult {
  id: string;
  headline: string;
  conceptsDetected: number;
  milestonesLinked: number;
  success: boolean;
  error?: string;
}

interface ProcessOptions {
  processAll: boolean;
  limit: number | null;
  skip: number;
  skipConcepts: boolean;
  skipContext: boolean;
}

function parseArgs(): ProcessOptions {
  const args = process.argv.slice(2);
  return {
    processAll: args.includes('--all'),
    limit: (() => {
      const limitArg = args.find((a) => a.startsWith('--limit='));
      return limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
    })(),
    skip: (() => {
      const skipArg = args.find((a) => a.startsWith('--skip='));
      return skipArg ? parseInt(skipArg.split('=')[1], 10) : 0;
    })(),
    skipConcepts: args.includes('--context'),
    skipContext: args.includes('--concepts'),
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfillNewsConcepts(): Promise<void> {
  const options = parseArgs();

  console.log('='.repeat(60));
  console.log('Backfill News Concepts and Context');
  console.log('='.repeat(60));
  console.log('');
  console.log('Options:');
  console.log(`  Process all events: ${options.processAll}`);
  console.log(`  Limit: ${options.limit || 'none'}`);
  console.log(`  Skip: ${options.skip}`);
  console.log(`  Process concepts: ${!options.skipConcepts}`);
  console.log(`  Process context: ${!options.skipContext}`);
  console.log('');

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not set in environment');
    process.exit(1);
  }

  // Build query for events to process
  const whereClause = options.processAll
    ? { isPublished: true }
    : {
        isPublished: true,
        OR: [{ whyItMatters: null }, { relatedMilestoneIds: '[]' }],
      };

  // Fetch events to process
  console.log('Fetching news events...');
  const events = await prisma.currentEvent.findMany({
    where: whereClause,
    select: {
      id: true,
      headline: true,
      summary: true,
      whyItMatters: true,
      relatedMilestoneIds: true,
    },
    orderBy: { publishedDate: 'desc' },
    skip: options.skip,
    take: options.limit || undefined,
  });

  console.log(`Found ${events.length} events to process\n`);

  if (events.length === 0) {
    console.log('No events to process. Exiting.');
    return;
  }

  const results: ProcessResult[] = [];
  let successCount = 0;
  let errorCount = 0;
  let totalConceptsDetected = 0;
  let totalMilestonesLinked = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const progress = `[${i + 1}/${events.length}]`;

    console.log(`${progress} Processing: ${event.headline.substring(0, 50)}...`);
    console.log(`${'─'.repeat(50)}`);

    let conceptsDetected = 0;
    let milestonesLinked = 0;

    try {
      // Step 1: Detect and link concepts
      if (!options.skipConcepts) {
        console.log(`  Detecting concepts...`);
        const conceptResult = await processNewsEventConcepts(event.id, prisma);
        conceptsDetected = conceptResult.linkedCount;
        console.log(
          `  Found ${conceptResult.matches.length} concepts, ${conceptsDetected} linked`
        );
        if (conceptResult.keyTopics.length > 0) {
          console.log(`  Key topics: ${conceptResult.keyTopics.join(', ')}`);
        }
      }

      // Step 2: Generate context (if not already present or if processAll)
      if (!options.skipContext) {
        const needsContext =
          options.processAll ||
          !event.whyItMatters ||
          event.relatedMilestoneIds === '[]';

        if (needsContext) {
          console.log(`  Generating historical context...`);
          const contextResult = await generateNewsContext(event.id, prisma);
          milestonesLinked = contextResult.relatedMilestones.length;
          console.log(`  Generated context with ${milestonesLinked} related milestones`);
          if (contextResult.whyItMatters) {
            console.log(
              `  Why it matters: ${contextResult.whyItMatters.substring(0, 80)}...`
            );
          }
        } else {
          console.log(`  Context already exists, skipping`);
        }
      }

      console.log(`  ✓ Completed: ${event.headline.substring(0, 40)}...`);
      results.push({
        id: event.id,
        headline: event.headline,
        conceptsDetected,
        milestonesLinked,
        success: true,
      });
      successCount++;
      totalConceptsDetected += conceptsDetected;
      totalMilestonesLinked += milestonesLinked;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ Error: ${errorMessage}`);
      results.push({
        id: event.id,
        headline: event.headline,
        conceptsDetected: 0,
        milestonesLinked: 0,
        success: false,
        error: errorMessage,
      });
      errorCount++;
    }

    console.log('');

    // Rate limiting - wait between API calls to avoid hitting limits
    // Each event makes 2-3 API calls (concepts analysis, milestone finding, context generation)
    if (i < events.length - 1) {
      const waitTime = 3000; // 3 seconds between events
      console.log(`  Waiting ${waitTime / 1000}s before next event...\n`);
      await sleep(waitTime);
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${events.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total concepts detected: ${totalConceptsDetected}`);
  console.log(`Total milestones linked: ${totalMilestonesLinked}`);
  console.log('');

  if (errorCount > 0) {
    console.log('Failed items:');
    results
      .filter((r) => !r.success)
      .forEach((r) => console.log(`  - ${r.headline.substring(0, 40)}...: ${r.error}`));
  }

  console.log('\nDone!');
}

// Run the script
backfillNewsConcepts()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

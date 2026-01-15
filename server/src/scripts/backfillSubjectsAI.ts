/**
 * Subject Backfill Script - AI Classification Pass
 * Sprint Subj-3 - Content Backfill
 *
 * Uses the SubjectClassifier to classify content that:
 * - Has no subjects assigned
 * - Has only low-confidence subjects
 * - Was assigned subjects via migration but needs verification
 *
 * Usage:
 *   npx ts-node server/src/scripts/backfillSubjectsAI.ts [contentType] [options]
 *
 * Options:
 *   --dry-run           Don't write to database
 *   --batch-size N      Process N items at a time (default: 20)
 *   --delay N           Wait N ms between API calls (default: 1000)
 *   --include-migration Also reclassify migration subjects
 *
 * Examples:
 *   npx ts-node server/src/scripts/backfillSubjectsAI.ts milestone --dry-run
 *   npx ts-node server/src/scripts/backfillSubjectsAI.ts all --batch-size 10
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { SubjectClassifier, SubjectClassification } from '../services/ingestion/subjectClassifier';

// Create Prisma client
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface BackfillOptions {
  dryRun: boolean;
  batchSize: number;
  delayMs: number;
  includeMigration: boolean;
}

interface BackfillStats {
  processed: number;
  classified: number;
  skipped: number;
  errors: number;
  apiCalls: number;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build classification text from content
 */
function buildClassificationText(contentType: string, item: Record<string, unknown>): string {
  switch (contentType) {
    case 'milestone':
      return `${item.title}\n\n${item.description}`;
    case 'glossary_term':
      return `${item.term}: ${item.definition || item.fullDefinition || ''}`;
    case 'current_event':
      return `${item.headline}\n\n${item.summary || ''}`;
    case 'person':
      return `${item.canonicalName}: ${item.shortBio || ''}\nRole: ${item.role || ''}\nFocus: ${item.focusAreas || '[]'}`;
    case 'organization':
      return `${item.name}: ${item.shortDescription || ''}\nType: ${item.type || ''}\nFocus: ${item.focusAreas || '[]'}`;
    default:
      return '';
  }
}

/**
 * Create or update ContentSubject records from classification
 */
async function upsertContentSubjects(
  contentType: string,
  contentId: string,
  classifications: SubjectClassification[],
  dryRun: boolean
): Promise<number> {
  if (classifications.length === 0) return 0;

  // Get subject IDs from slugs
  const slugs = classifications.map((c) => c.subjectSlug);
  const subjects = await prisma.subject.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });

  const slugToId = new Map(subjects.map((s) => [s.slug, s.id]));
  let created = 0;

  for (const classification of classifications) {
    const subjectId = slugToId.get(classification.subjectSlug);

    if (!subjectId) {
      console.warn(`  Subject not found: ${classification.subjectSlug}`);
      continue;
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would upsert: ${contentType}/${contentId} -> ${classification.subjectSlug} (conf: ${classification.confidence.toFixed(2)}, primary: ${classification.isPrimary})`);
      created++;
      continue;
    }

    try {
      await prisma.contentSubject.upsert({
        where: {
          contentType_contentId_subjectId: {
            contentType,
            contentId,
            subjectId,
          },
        },
        update: {
          confidence: classification.confidence,
          isPrimary: classification.isPrimary,
          source: 'auto',
        },
        create: {
          contentType,
          contentId,
          subjectId,
          isPrimary: classification.isPrimary,
          confidence: classification.confidence,
          source: 'auto',
        },
      });
      created++;
    } catch (error) {
      console.error(`  Error upserting ContentSubject: ${error}`);
    }
  }

  return created;
}

/**
 * Get content items needing classification
 */
async function getItemsNeedingClassification(
  contentType: string,
  batchSize: number,
  includeMigration: boolean
): Promise<Record<string, unknown>[]> {
  const baseWhere = includeMigration
    ? {
        OR: [
          { contentSubjects: { none: {} } },
          { contentSubjects: { every: { source: 'migration' } } },
        ],
      }
    : { contentSubjects: { none: {} } };

  switch (contentType) {
    case 'milestone':
      return prisma.milestone.findMany({
        where: baseWhere,
        take: batchSize,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
        },
      });

    case 'glossary_term':
      return prisma.glossaryTerm.findMany({
        where: baseWhere,
        take: batchSize,
        select: {
          id: true,
          term: true,
          definition: true,
          fullDefinition: true,
        },
      });

    case 'current_event':
      return prisma.currentEvent.findMany({
        where: baseWhere,
        take: batchSize,
        select: {
          id: true,
          headline: true,
          summary: true,
        },
      });

    case 'person':
      return prisma.person.findMany({
        where: baseWhere,
        take: batchSize,
        select: {
          id: true,
          canonicalName: true,
          shortBio: true,
          role: true,
          focusAreas: true,
        },
      });

    case 'organization':
      return prisma.organization.findMany({
        where: baseWhere,
        take: batchSize,
        select: {
          id: true,
          name: true,
          shortDescription: true,
          type: true,
          focusAreas: true,
        },
      });

    default:
      return [];
  }
}

/**
 * Backfill a content type with AI classification
 */
async function backfillContentType(
  contentType: string,
  classifier: SubjectClassifier,
  options: BackfillOptions
): Promise<BackfillStats> {
  console.log(`\n=== Backfilling ${contentType} with AI ===`);

  const stats: BackfillStats = {
    processed: 0,
    classified: 0,
    skipped: 0,
    errors: 0,
    apiCalls: 0,
  };

  const items = await getItemsNeedingClassification(
    contentType,
    options.batchSize,
    options.includeMigration
  );

  console.log(`Found ${items.length} ${contentType}(s) needing classification`);

  for (const item of items) {
    stats.processed++;
    const itemId = item.id as string;
    const itemLabel = (item.title || item.term || item.headline || item.canonicalName || item.name || itemId) as string;

    try {
      const text = buildClassificationText(contentType, item);

      if (!text || text.length < 20) {
        console.log(`  [${itemId}] Skipping - insufficient text`);
        stats.skipped++;
        continue;
      }

      console.log(`  [${itemId}] Classifying: ${itemLabel.slice(0, 50)}...`);

      if (!options.dryRun) {
        const classifications = await classifier.classifyText(text);
        stats.apiCalls++;

        if (classifications.length === 0) {
          console.log(`    No subjects classified`);
          stats.skipped++;
        } else {
          console.log(`    Classified: ${classifications.map((c) => `${c.subjectSlug}(${c.confidence.toFixed(2)})`).join(', ')}`);
          const created = await upsertContentSubjects(contentType, itemId, classifications, options.dryRun);
          stats.classified += created;
        }

        // Rate limiting delay
        if (stats.processed < items.length) {
          await sleep(options.delayMs);
        }
      } else {
        console.log(`    [DRY RUN] Would call classifier API`);
        stats.apiCalls++;
      }
    } catch (error) {
      console.error(`  Error processing ${contentType} ${itemId}: ${error}`);
      stats.errors++;

      // Longer delay on error
      await sleep(options.delayMs * 2);
    }
  }

  return stats;
}

/**
 * Main backfill function
 */
async function runBackfill(contentType: string, options: BackfillOptions) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Subject Backfill - AI Classification Pass`);
  console.log(`Content Type: ${contentType}`);
  console.log(`Batch Size: ${options.batchSize}`);
  console.log(`Delay: ${options.delayMs}ms`);
  console.log(`Include Migration: ${options.includeMigration}`);
  console.log(`Dry Run: ${options.dryRun}`);
  console.log(`${'='.repeat(60)}`);

  // Initialize classifier
  const classifier = new SubjectClassifier();
  await classifier.initialize();

  const allStats: Record<string, BackfillStats> = {};
  const contentTypes =
    contentType === 'all'
      ? ['milestone', 'glossary_term', 'current_event', 'person', 'organization']
      : [contentType];

  for (const type of contentTypes) {
    allStats[type] = await backfillContentType(type, classifier, options);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);

  let totalProcessed = 0;
  let totalClassified = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalApiCalls = 0;

  for (const [type, stats] of Object.entries(allStats)) {
    console.log(`${type}:`);
    console.log(`  Processed: ${stats.processed}`);
    console.log(`  Classified: ${stats.classified}`);
    console.log(`  Skipped: ${stats.skipped}`);
    console.log(`  Errors: ${stats.errors}`);
    console.log(`  API Calls: ${stats.apiCalls}`);

    totalProcessed += stats.processed;
    totalClassified += stats.classified;
    totalSkipped += stats.skipped;
    totalErrors += stats.errors;
    totalApiCalls += stats.apiCalls;
  }

  console.log(`\nTOTAL:`);
  console.log(`  Processed: ${totalProcessed}`);
  console.log(`  Classified: ${totalClassified}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  API Calls: ${totalApiCalls}`);

  // Cost estimate (Haiku pricing)
  const estimatedCost = totalApiCalls * 0.0002; // ~$0.0002 per classification
  console.log(`\nEstimated API Cost: $${estimatedCost.toFixed(4)}`);

  if (options.dryRun) {
    console.log(`\n[DRY RUN] No changes were made. Run without --dry-run to apply changes.`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const contentType = args.find((a) => !a.startsWith('--')) || 'all';
const dryRun = args.includes('--dry-run');
const includeMigration = args.includes('--include-migration');

const batchSizeArg = args.find((a) => a.startsWith('--batch-size'));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1] || args[args.indexOf(batchSizeArg) + 1] || '20') : 20;

const delayArg = args.find((a) => a.startsWith('--delay'));
const delayMs = delayArg ? parseInt(delayArg.split('=')[1] || args[args.indexOf(delayArg) + 1] || '1000') : 1000;

const validTypes = ['all', 'milestone', 'glossary_term', 'current_event', 'person', 'organization'];
if (!validTypes.includes(contentType)) {
  console.error(`Invalid content type: ${contentType}`);
  console.error(`Valid types: ${validTypes.join(', ')}`);
  process.exit(1);
}

runBackfill(contentType, { dryRun, batchSize, delayMs, includeMigration })
  .catch((error) => {
    console.error('Backfill error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

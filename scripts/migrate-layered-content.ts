/**
 * Migration script to populate Milestone layered content fields from JSON
 *
 * This script reads layered-content.json and updates the corresponding
 * milestones in the database with tldr, simpleExplanation, businessImpact,
 * technicalDepth, historicalContext, whyItMattersToday, and commonMisconceptions.
 *
 * Usage: npm run migrate:layered-content
 *
 * The script is idempotent - it will skip milestones that already have content.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Interface for layered content structure in the JSON file
interface LayeredContent {
  tldr: string;
  simpleExplanation: string;
  technicalDepth: string;
  businessImpact: string;
  whyItMattersToday: string;
  historicalContext: string;
  commonMisconceptions: string;
  // Optional nested content not stored in DB
  plainEnglish?: {
    whatHappened: string;
    thinkOfItLike: string;
    howItAffectsYou: string;
    tryItYourself?: string;
    watchOutFor: string;
  };
  executiveBrief?: Record<string, unknown>;
  appliedAIBrief?: Record<string, unknown>;
}

// Type for the entire JSON file structure
interface LayeredContentFile {
  _description?: string;
  _generatedAt?: string;
  _totalMilestones?: number;
  _note?: string;
  [milestoneId: string]: LayeredContent | string | number | undefined;
}

// Create Prisma client with PostgreSQL adapter
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Use Pool with SSL for RDS connections (local dev may not need SSL)
  const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString,
    ssl: isLocalhost ? undefined : { rejectUnauthorized: false },
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

/**
 * Check if a string is a metadata field (starts with underscore)
 */
function isMetadataField(key: string): boolean {
  return key.startsWith('_');
}

/**
 * Validate that content object has required layered content fields
 */
function isValidLayeredContent(content: unknown): content is LayeredContent {
  if (!content || typeof content !== 'object') return false;
  const c = content as Record<string, unknown>;
  return (
    typeof c.tldr === 'string' &&
    typeof c.simpleExplanation === 'string' &&
    typeof c.technicalDepth === 'string' &&
    typeof c.businessImpact === 'string' &&
    typeof c.whyItMattersToday === 'string' &&
    typeof c.historicalContext === 'string' &&
    typeof c.commonMisconceptions === 'string'
  );
}

/**
 * Main migration function
 */
async function migrateLayeredContent(): Promise<void> {
  console.log('Starting layered content migration...\n');

  const prisma = createPrismaClient();

  try {
    // Read layered content JSON file
    const contentPath = resolve(__dirname, '../src/content/milestones/layered-content.json');
    const rawData = readFileSync(contentPath, 'utf-8');
    const contentFile: LayeredContentFile = JSON.parse(rawData);

    // Track migration statistics
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    let invalid = 0;

    // Process each milestone in the JSON file
    for (const [milestoneId, content] of Object.entries(contentFile)) {
      // Skip metadata fields (keys starting with underscore)
      if (isMetadataField(milestoneId)) {
        continue;
      }

      // Validate content structure
      if (!isValidLayeredContent(content)) {
        console.log(`⚠️  Invalid content structure for: ${milestoneId}`);
        invalid++;
        continue;
      }

      // Find milestone in database by exact ID match
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
      });

      if (!milestone) {
        console.log(`❌ Milestone not found in database: ${milestoneId}`);
        notFound++;
        continue;
      }

      // Skip if milestone already has layered content populated
      if (milestone.tldr && milestone.simpleExplanation) {
        console.log(`⏭️  Already has content, skipping: ${milestoneId}`);
        skipped++;
        continue;
      }

      // Update milestone with layered content fields
      await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          tldr: content.tldr,
          simpleExplanation: content.simpleExplanation,
          technicalDepth: content.technicalDepth,
          businessImpact: content.businessImpact,
          whyItMattersToday: content.whyItMattersToday,
          historicalContext: content.historicalContext,
          commonMisconceptions: content.commonMisconceptions,
        },
      });

      console.log(`✅ Updated: ${milestoneId}`);
      updated++;
    }

    // Print migration summary
    console.log('\n' + '='.repeat(50));
    console.log('Migration Summary:');
    console.log('='.repeat(50));
    console.log(`  ✅ Updated:   ${updated}`);
    console.log(`  ⏭️  Skipped:   ${skipped} (already had content)`);
    console.log(`  ❌ Not found: ${notFound}`);
    console.log(`  ⚠️  Invalid:   ${invalid}`);
    console.log('='.repeat(50));
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateLayeredContent()
  .then(() => {
    console.log('\nMigration completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });

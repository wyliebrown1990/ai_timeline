/**
 * Migration script to import glossary terms from static JSON to database
 * Sprint 36 - Glossary Frontend + Flashcards Database Migration
 *
 * This script seeds glossary terms from the static JSON file into the PostgreSQL database.
 * It skips existing terms (idempotent) so can be run multiple times safely.
 *
 * Usage: npm run db:seed:glossary
 *        or: npx tsx scripts/migrateGlossary.ts
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Validate DATABASE_URL is set
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create PostgreSQL pool with SSL for RDS connections
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Term structure from the static JSON file
 */
interface StaticGlossaryTerm {
  id: string;
  term: string;
  shortDefinition: string;
  fullDefinition: string;
  businessContext?: string;
  example?: string;
  inMeetingExample?: string;
  relatedTermIds: string[];
  relatedMilestoneIds: string[];
  category: string;
}

async function main() {
  console.log('Starting glossary seed...\n');

  // Read the static terms.json file
  const termsPath = resolve(__dirname, '../src/content/glossary/terms.json');
  const rawData = readFileSync(termsPath, 'utf-8');
  const terms: StaticGlossaryTerm[] = JSON.parse(rawData);

  console.log(`Found ${terms.length} terms in ${termsPath}\n`);

  // Track results
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const term of terms) {
    try {
      // Check if term already exists
      const existing = await prisma.glossaryTerm.findFirst({
        where: { term: term.term },
      });

      if (existing) {
        console.log(`  [SKIP] "${term.term}" already exists`);
        skipped++;
        continue;
      }

      // Create the term
      await prisma.glossaryTerm.create({
        data: {
          term: term.term,
          shortDefinition: term.shortDefinition,
          fullDefinition: term.fullDefinition,
          businessContext: term.businessContext || null,
          example: term.example || null,
          inMeetingExample: term.inMeetingExample || null,
          category: term.category,
          relatedTermIds: JSON.stringify(term.relatedTermIds || []),
          relatedMilestoneIds: JSON.stringify(term.relatedMilestoneIds || []),
          sourceArticleId: null, // Static terms have no source article
        },
      });

      console.log(`  [OK] Created "${term.term}"`);
      created++;
    } catch (error) {
      console.error(`  [ERROR] Failed to create "${term.term}":`, error);
      errors++;
    }
  }

  console.log('\n--- Glossary Seed Complete ---');
  console.log(`Created: ${created}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total in file: ${terms.length}`);

  // Verify count
  const totalInDb = await prisma.glossaryTerm.count();
  console.log(`\nTotal terms in database: ${totalInDb}`);
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

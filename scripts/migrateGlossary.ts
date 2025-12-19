/**
 * Migration script to import glossary terms from static JSON to database
 * Sprint 32 - Glossary API
 *
 * Usage: npx tsx scripts/migrateGlossary.ts
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create Prisma adapter with file URL (database is in project root)
const dbPath = resolve(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
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
  console.log('Starting glossary migration...\n');

  // Read the static terms.json file
  const termsPath = 'src/content/glossary/terms.json';
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

  console.log('\n--- Migration Complete ---');
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${terms.length}`);

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

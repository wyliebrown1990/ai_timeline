/**
 * Subject Backfill Script - Rule-Based Pass
 * Sprint Subj-3 - Content Backfill
 *
 * Applies rule-based mappings from categories, tags, and focus areas
 * to create ContentSubject records for existing content.
 *
 * Usage:
 *   npx ts-node server/src/scripts/backfillSubjects.ts [contentType] [--dry-run]
 *
 * Examples:
 *   npx ts-node server/src/scripts/backfillSubjects.ts milestone
 *   npx ts-node server/src/scripts/backfillSubjects.ts all --dry-run
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  inferMilestoneSubjects,
  inferPersonSubjects,
  inferOrganizationSubjects,
  getSubjectsFromTags,
  glossaryCategoryToSubject,
} from '../services/migration/subjectMigration';

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

interface BackfillStats {
  processed: number;
  created: number;
  skipped: number;
  errors: number;
}

/**
 * Create ContentSubject records for a content item
 */
async function createContentSubjects(
  contentType: string,
  contentId: string,
  subjectSlugs: string[],
  dryRun: boolean
): Promise<number> {
  if (subjectSlugs.length === 0) return 0;

  // Get subject IDs from slugs
  const subjects = await prisma.subject.findMany({
    where: { slug: { in: subjectSlugs } },
    select: { id: true, slug: true },
  });

  const slugToId = new Map(subjects.map((s) => [s.slug, s.id]));
  let created = 0;

  for (let i = 0; i < subjectSlugs.length; i++) {
    const slug = subjectSlugs[i];
    const subjectId = slugToId.get(slug);

    if (!subjectId) {
      console.warn(`  Subject not found: ${slug}`);
      continue;
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would create: ${contentType}/${contentId} -> ${slug} (primary: ${i === 0})`);
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
        update: {}, // Don't update if exists
        create: {
          contentType,
          contentId,
          subjectId,
          isPrimary: i === 0, // First subject is primary
          source: 'migration',
        },
      });
      created++;
    } catch (error) {
      console.error(`  Error creating ContentSubject: ${error}`);
    }
  }

  return created;
}

/**
 * Backfill milestones with subjects
 */
async function backfillMilestones(dryRun: boolean): Promise<BackfillStats> {
  console.log('\n=== Backfilling Milestones ===');

  const stats: BackfillStats = { processed: 0, created: 0, skipped: 0, errors: 0 };

  // Get IDs of milestones that already have subjects
  const existingSubjects = await prisma.contentSubject.findMany({
    where: { contentType: 'milestone' },
    select: { contentId: true },
  });
  const classifiedIds = new Set(existingSubjects.map((s) => s.contentId));

  // Get all milestones
  const allMilestones = await prisma.milestone.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      tags: true,
    },
  });

  // Filter to only unclassified
  const milestones = allMilestones.filter((m) => !classifiedIds.has(m.id));

  console.log(`Found ${milestones.length} milestones without subjects`);

  for (const milestone of milestones) {
    stats.processed++;

    try {
      const tags = JSON.parse(milestone.tags || '[]') as string[];
      const subjects = inferMilestoneSubjects({
        category: milestone.category,
        tags,
        title: milestone.title,
      });

      if (subjects.length === 0) {
        console.log(`  [${milestone.id}] No subjects inferred from category "${milestone.category}" and ${tags.length} tags`);
        stats.skipped++;
        continue;
      }

      console.log(`  [${milestone.id}] ${milestone.title.slice(0, 50)}... -> ${subjects.join(', ')}`);
      const created = await createContentSubjects('milestone', milestone.id, subjects, dryRun);
      stats.created += created;
    } catch (error) {
      console.error(`  Error processing milestone ${milestone.id}: ${error}`);
      stats.errors++;
    }
  }

  return stats;
}

/**
 * Backfill glossary terms with subjects
 */
async function backfillGlossaryTerms(dryRun: boolean): Promise<BackfillStats> {
  console.log('\n=== Backfilling Glossary Terms ===');

  const stats: BackfillStats = { processed: 0, created: 0, skipped: 0, errors: 0 };

  // Get IDs of glossary terms that already have subjects
  const existingSubjects = await prisma.contentSubject.findMany({
    where: { contentType: 'glossary_term' },
    select: { contentId: true },
  });
  const classifiedIds = new Set(existingSubjects.map((s) => s.contentId));

  // Get all glossary terms
  const allTerms = await prisma.glossaryTerm.findMany({
    select: {
      id: true,
      term: true,
      category: true,
    },
  });

  // Filter to only unclassified
  const terms = allTerms.filter((t) => !classifiedIds.has(t.id));

  console.log(`Found ${terms.length} glossary terms without subjects`);

  for (const term of terms) {
    stats.processed++;

    try {
      const subjects: string[] = [];

      // From category
      if (term.category && glossaryCategoryToSubject[term.category]) {
        subjects.push(...glossaryCategoryToSubject[term.category]);
      }

      // From related terms (as tags)
      const relatedTerms = JSON.parse(term.relatedTerms || '[]') as string[];
      const tagSubjects = getSubjectsFromTags(relatedTerms);
      subjects.push(...tagSubjects);

      // Dedupe
      const uniqueSubjects = [...new Set(subjects)];

      if (uniqueSubjects.length === 0) {
        // Default to ML for glossary terms
        uniqueSubjects.push('science-cs-ml');
      }

      console.log(`  [${term.id}] ${term.term} -> ${uniqueSubjects.join(', ')}`);
      const created = await createContentSubjects('glossary_term', term.id, uniqueSubjects, dryRun);
      stats.created += created;
    } catch (error) {
      console.error(`  Error processing glossary term ${term.id}: ${error}`);
      stats.errors++;
    }
  }

  return stats;
}

/**
 * Backfill current events with subjects
 */
async function backfillCurrentEvents(dryRun: boolean): Promise<BackfillStats> {
  console.log('\n=== Backfilling Current Events ===');

  const stats: BackfillStats = { processed: 0, created: 0, skipped: 0, errors: 0 };

  // Get IDs of events that already have subjects
  const existingSubjects = await prisma.contentSubject.findMany({
    where: { contentType: 'current_event' },
    select: { contentId: true },
  });
  const classifiedIds = new Set(existingSubjects.map((s) => s.contentId));

  // Get all current events
  const allEvents = await prisma.currentEvent.findMany({
    select: {
      id: true,
      headline: true,
      summary: true,
    },
  });

  // Filter to only unclassified
  const events = allEvents.filter((e) => !classifiedIds.has(e.id));

  console.log(`Found ${events.length} current events without subjects`);

  for (const event of events) {
    stats.processed++;

    try {
      const tags = JSON.parse(event.tags || '[]') as string[];
      const subjects = inferMilestoneSubjects({
        category: event.category || 'INDUSTRY',
        tags,
        title: event.headline,
      });

      if (subjects.length === 0) {
        // Default for news events
        subjects.push('business-technology-software');
      }

      console.log(`  [${event.id}] ${event.headline.slice(0, 50)}... -> ${subjects.join(', ')}`);
      const created = await createContentSubjects('current_event', event.id, subjects, dryRun);
      stats.created += created;
    } catch (error) {
      console.error(`  Error processing current event ${event.id}: ${error}`);
      stats.errors++;
    }
  }

  return stats;
}

/**
 * Backfill persons with subjects
 */
async function backfillPersons(dryRun: boolean): Promise<BackfillStats> {
  console.log('\n=== Backfilling Persons ===');

  const stats: BackfillStats = { processed: 0, created: 0, skipped: 0, errors: 0 };

  // Get IDs of persons that already have subjects
  const existingSubjects = await prisma.contentSubject.findMany({
    where: { contentType: 'person' },
    select: { contentId: true },
  });
  const classifiedIds = new Set(existingSubjects.map((s) => s.contentId));

  // Get all persons
  const allPersons = await prisma.person.findMany({
    select: {
      id: true,
      canonicalName: true,
      role: true,
      focusAreas: true,
    },
  });

  // Filter to only unclassified
  const persons = allPersons.filter((p) => !classifiedIds.has(p.id));

  console.log(`Found ${persons.length} persons without subjects`);

  for (const person of persons) {
    stats.processed++;

    try {
      const focusAreas = JSON.parse(person.focusAreas || '[]') as string[];
      const subjects = inferPersonSubjects({
        role: person.role || undefined,
        focusAreas,
      });

      if (subjects.length === 0) {
        // Default for AI researchers
        subjects.push('science-cs-ml');
      }

      console.log(`  [${person.id}] ${person.canonicalName} -> ${subjects.join(', ')}`);
      const created = await createContentSubjects('person', person.id, subjects, dryRun);
      stats.created += created;
    } catch (error) {
      console.error(`  Error processing person ${person.id}: ${error}`);
      stats.errors++;
    }
  }

  return stats;
}

/**
 * Backfill organizations with subjects
 */
async function backfillOrganizations(dryRun: boolean): Promise<BackfillStats> {
  console.log('\n=== Backfilling Organizations ===');

  const stats: BackfillStats = { processed: 0, created: 0, skipped: 0, errors: 0 };

  // Get IDs of organizations that already have subjects
  const existingSubjects = await prisma.contentSubject.findMany({
    where: { contentType: 'organization' },
    select: { contentId: true },
  });
  const classifiedIds = new Set(existingSubjects.map((s) => s.contentId));

  // Get all organizations
  const allOrgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      focusAreas: true,
    },
  });

  // Filter to only unclassified
  const orgs = allOrgs.filter((o) => !classifiedIds.has(o.id));

  console.log(`Found ${orgs.length} organizations without subjects`);

  for (const org of orgs) {
    stats.processed++;

    try {
      const focusAreas = JSON.parse(org.focusAreas || '[]') as string[];
      const subjects = inferOrganizationSubjects({
        type: org.type || undefined,
        focusAreas,
      });

      console.log(`  [${org.id}] ${org.name} -> ${subjects.join(', ')}`);
      const created = await createContentSubjects('organization', org.id, subjects, dryRun);
      stats.created += created;
    } catch (error) {
      console.error(`  Error processing organization ${org.id}: ${error}`);
      stats.errors++;
    }
  }

  return stats;
}

/**
 * Main backfill function
 */
async function runBackfill(contentType: string, dryRun: boolean) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Subject Backfill - Rule-Based Pass`);
  console.log(`Content Type: ${contentType}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log(`${'='.repeat(60)}`);

  const allStats: Record<string, BackfillStats> = {};

  if (contentType === 'all' || contentType === 'milestone') {
    allStats.milestone = await backfillMilestones(dryRun);
  }

  if (contentType === 'all' || contentType === 'glossary_term') {
    allStats.glossary_term = await backfillGlossaryTerms(dryRun);
  }

  if (contentType === 'all' || contentType === 'current_event') {
    allStats.current_event = await backfillCurrentEvents(dryRun);
  }

  if (contentType === 'all' || contentType === 'person') {
    allStats.person = await backfillPersons(dryRun);
  }

  if (contentType === 'all' || contentType === 'organization') {
    allStats.organization = await backfillOrganizations(dryRun);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);

  let totalProcessed = 0;
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [type, stats] of Object.entries(allStats)) {
    console.log(`${type}:`);
    console.log(`  Processed: ${stats.processed}`);
    console.log(`  Created: ${stats.created}`);
    console.log(`  Skipped: ${stats.skipped}`);
    console.log(`  Errors: ${stats.errors}`);

    totalProcessed += stats.processed;
    totalCreated += stats.created;
    totalSkipped += stats.skipped;
    totalErrors += stats.errors;
  }

  console.log(`\nTOTAL:`);
  console.log(`  Processed: ${totalProcessed}`);
  console.log(`  Created: ${totalCreated}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);

  if (dryRun) {
    console.log(`\n[DRY RUN] No changes were made. Run without --dry-run to apply changes.`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const contentType = args[0] || 'all';
const dryRun = args.includes('--dry-run');

const validTypes = ['all', 'milestone', 'glossary_term', 'current_event', 'person', 'organization'];
if (!validTypes.includes(contentType)) {
  console.error(`Invalid content type: ${contentType}`);
  console.error(`Valid types: ${validTypes.join(', ')}`);
  process.exit(1);
}

runBackfill(contentType, dryRun)
  .catch((error) => {
    console.error('Backfill error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { MilestoneCategory, SignificanceLevel } from '../src/types/milestone';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create Prisma adapter with file URL (database is in project root)
const dbPath = resolve(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

/**
 * Raw event data from starter JSON file
 */
interface RawEvent {
  id: string;
  date: string;
  era: string;
  title: string;
  summary: string;
  coreConcepts: string[];
  keyPeople: string[];
  sources: Array<{ label: string; kind: string; url: string }>;
  guidedStart?: boolean;
}

/**
 * Map era names to categories based on content
 */
function mapEraToCategory(era: string): MilestoneCategory {
  const eraLower = era.toLowerCase();

  if (eraLower.includes('governance') || eraLower.includes('policy') || eraLower.includes('regulation')) {
    return MilestoneCategory.REGULATION;
  }
  if (eraLower.includes('product') || eraLower.includes('code models')) {
    return MilestoneCategory.PRODUCT;
  }
  if (eraLower.includes('milestone') || eraLower.includes('breakthrough')) {
    return MilestoneCategory.BREAKTHROUGH;
  }
  if (
    eraLower.includes('llm') ||
    eraLower.includes('transformer') ||
    eraLower.includes('model') ||
    eraLower.includes('multimodal') ||
    eraLower.includes('open model')
  ) {
    return MilestoneCategory.MODEL_RELEASE;
  }
  if (eraLower.includes('industry') || eraLower.includes('expert system') || eraLower.includes('infrastructure')) {
    return MilestoneCategory.INDUSTRY;
  }

  return MilestoneCategory.RESEARCH;
}

/**
 * Determine significance level based on event content
 */
function determineSignificance(event: RawEvent): SignificanceLevel {
  // Groundbreaking events are marked with guidedStart or have high-impact keywords
  if (event.guidedStart) {
    return SignificanceLevel.GROUNDBREAKING;
  }

  const titleLower = event.title.toLowerCase();
  const summaryLower = event.summary.toLowerCase();

  // Major breakthroughs and foundational work
  if (
    titleLower.includes('transformer') ||
    titleLower.includes('gpt-4') ||
    titleLower.includes('gpt-3') ||
    titleLower.includes('chatgpt') ||
    titleLower.includes('alphago') ||
    titleLower.includes('alphafold') ||
    titleLower.includes('backprop') ||
    titleLower.includes('deep blue') ||
    summaryLower.includes('breakthrough') ||
    summaryLower.includes('groundbreaking') ||
    summaryLower.includes('foundation') ||
    summaryLower.includes('first to train') ||
    summaryLower.includes('becomes first')
  ) {
    return SignificanceLevel.MAJOR;
  }

  // Significant contributions
  if (
    titleLower.includes('bert') ||
    titleLower.includes('lstm') ||
    titleLower.includes('alexnet') ||
    titleLower.includes('resnet') ||
    titleLower.includes('gan') ||
    titleLower.includes('attention') ||
    summaryLower.includes('popularize') ||
    summaryLower.includes('widely used') ||
    summaryLower.includes('standard')
  ) {
    return SignificanceLevel.MODERATE;
  }

  return SignificanceLevel.MINOR;
}

/**
 * Parse date string to Date object
 * Handles various formats: YYYY, YYYY-MM, YYYY-MM-DD
 */
function parseDate(dateStr: string): Date {
  // Handle year only
  if (/^\d{4}$/.test(dateStr)) {
    return new Date(`${dateStr}-01-01`);
  }
  // Handle year-month
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}-01`);
  }
  // Full date
  return new Date(dateStr);
}

/**
 * Seed the database with AI milestone data
 */
async function seed() {
  console.log('Starting database seed...');

  // Clear existing data
  await prisma.milestone.deleteMany();
  console.log('Cleared existing milestones');

  // Read starter events
  const eventsPath = resolve(__dirname, '../starter_50_events.json');
  const rawData = readFileSync(eventsPath, 'utf-8');
  const events: RawEvent[] = JSON.parse(rawData);
  console.log(`Loaded ${events.length} events from seed file`);

  // Transform and insert events
  const milestones = events.map((event) => ({
    title: event.title,
    description: event.summary,
    date: parseDate(event.date),
    category: mapEraToCategory(event.era),
    significance: determineSignificance(event),
    era: event.era,
    organization: null,
    contributors: JSON.stringify(event.keyPeople),
    sourceUrl: event.sources[0]?.url || null,
    imageUrl: null,
    tags: JSON.stringify(event.coreConcepts),
    sources: JSON.stringify(event.sources),
  }));

  // Batch insert
  const result = await prisma.milestone.createMany({
    data: milestones,
  });

  console.log(`Seeded ${result.count} milestones successfully`);

  // Verify seed
  const count = await prisma.milestone.count();
  console.log(`Database now contains ${count} milestones`);
}

seed()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { MilestoneCategory, SignificanceLevel } from '../src/types/milestone';
import type { MilestoneLayeredContent } from '../src/types/milestone';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Layered content map interface
 * The JSON file has metadata keys (starting with _) and milestone content
 */
interface LayeredContentFile {
  _description?: string;
  _generatedAt?: string;
  _totalMilestones?: number;
  _note?: string;
  [milestoneId: string]: MilestoneLayeredContent | string | number | undefined;
}

/**
 * Load layered content from JSON file
 * Filters out metadata keys (starting with _)
 */
function loadLayeredContent(): Map<string, MilestoneLayeredContent> {
  const contentPath = resolve(__dirname, '../src/content/milestones/layered-content.json');
  const rawData = readFileSync(contentPath, 'utf-8');
  const contentFile: LayeredContentFile = JSON.parse(rawData);

  const contentMap = new Map<string, MilestoneLayeredContent>();
  for (const [key, value] of Object.entries(contentFile)) {
    // Skip metadata keys and non-object values
    if (!key.startsWith('_') && typeof value === 'object' && value !== null) {
      contentMap.set(key, value as MilestoneLayeredContent);
    }
  }
  return contentMap;
}

// Create Prisma client with PostgreSQL adapter (required for Prisma 7.x)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Use Pool with SSL for RDS connections
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Required for RDS without specific CA certificate
  },
});
const adapter = new PrismaPg(pool);
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
  if (eraLower.includes('product') || eraLower.includes('code models') || eraLower.includes('ai agents')) {
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
    summaryLower.includes('becomes first') ||
    summaryLower.includes('sputnik moment') ||
    titleLower.includes('gpt-5') ||
    titleLower.includes('gemini 3') ||
    titleLower.includes('claude opus') ||
    titleLower.includes('llama 4') ||
    titleLower.includes('grok 3') ||
    titleLower.includes('deepseek')
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

  // Clear existing data using raw SQL (workaround for Prisma adapter issue)
  await prisma.$executeRaw`DELETE FROM "Milestone"`;
  console.log('Cleared existing milestones');

  // Load layered content for milestones (Sprint 35)
  const layeredContentMap = loadLayeredContent();
  console.log(`Loaded layered content for ${layeredContentMap.size} milestones`);

  // Read starter events
  const eventsPath = resolve(__dirname, '../starter_50_events.json');
  const rawData = readFileSync(eventsPath, 'utf-8');
  const events: RawEvent[] = JSON.parse(rawData);
  console.log(`Loaded ${events.length} events from seed file`);

  // Transform and insert events with layered content
  // Include the readable ID from the source file for consistent content linking
  const milestones = events.map((event) => {
    // Get layered content for this milestone if available
    const layered = layeredContentMap.get(event.id);

    return {
      id: event.id, // Use readable ID (e.g., E1943_MCCULLOCH_PITTS) instead of auto-generated cuid
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
      // Layered content fields (Sprint 35)
      tldr: layered?.tldr ?? null,
      simpleExplanation: layered?.simpleExplanation ?? null,
      technicalDepth: layered?.technicalDepth ?? null,
      businessImpact: layered?.businessImpact ?? null,
      whyItMattersToday: layered?.whyItMattersToday ?? null,
      historicalContext: layered?.historicalContext ?? null,
      commonMisconceptions: layered?.commonMisconceptions ?? null,
    };
  });

  // Batch insert
  const result = await prisma.milestone.createMany({
    data: milestones,
  });

  // Count milestones with layered content
  const withLayeredContent = milestones.filter((m) => m.tldr !== null).length;
  console.log(`Seeded ${result.count} milestones (${withLayeredContent} with layered content)`);

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

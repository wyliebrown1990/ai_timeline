/**
 * Bibliography Publisher
 * Sprint Bib-1: Create milestones from processed bibliography entries
 *
 * Validates and publishes milestone data to the database
 */

import { prisma } from '../../../db';
import type {
  BibliographyEntry,
  GeneratedMilestoneData,
  ProcessingResult,
  ScrapedMetadata,
} from './types';
import { clearMilestonesCache } from './bibliographyDeduplicator';

/**
 * Generate a milestone ID from entry data
 * Format: E{YEAR}_{SLUG}
 */
function generateMilestoneId(entry: BibliographyEntry, title: string): string {
  // Create a slug from the title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscores
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .slice(0, 40); // Limit length

  const id = `E${entry.year}_${slug}`;

  return id;
}

/**
 * Validate milestone data before publishing
 */
function validateMilestoneData(data: GeneratedMilestoneData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.title || data.title.length < 10) {
    errors.push('Title too short (min 10 chars)');
  }

  if (!data.description || data.description.length < 50) {
    errors.push('Description too short (min 50 chars)');
  }

  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push('Invalid date format (expected YYYY-MM-DD)');
  }

  if (!['research', 'model_release', 'breakthrough', 'product', 'regulation', 'industry'].includes(data.category)) {
    errors.push(`Invalid category: ${data.category}`);
  }

  if (typeof data.significance !== 'number' || data.significance < 1 || data.significance > 4) {
    errors.push(`Invalid significance: ${data.significance}`);
  }

  if (!data.era) {
    errors.push('Era is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if milestone ID already exists
 */
async function milestoneIdExists(id: string): Promise<boolean> {
  const existing = await prisma.milestone.findUnique({
    where: { id },
    select: { id: true },
  });
  return existing !== null;
}

/**
 * Generate unique milestone ID (add suffix if needed)
 */
async function generateUniqueId(entry: BibliographyEntry, title: string): Promise<string> {
  const baseId = generateMilestoneId(entry, title);
  let id = baseId;
  let suffix = 1;

  while (await milestoneIdExists(id)) {
    id = `${baseId}_${suffix}`;
    suffix++;
  }

  return id;
}

/**
 * Publish a single milestone to the database
 */
export async function publishMilestone(
  entry: BibliographyEntry,
  milestoneData: GeneratedMilestoneData,
  scrapedMetadata: ScrapedMetadata | null,
  dryRun: boolean = false
): Promise<ProcessingResult> {
  // Validate data
  const validation = validateMilestoneData(milestoneData);
  if (!validation.valid) {
    return {
      entry,
      status: 'error',
      scrapingSucceeded: scrapedMetadata?.success ?? false,
      llmGenerated: true,
      error: `Validation failed: ${validation.errors.join(', ')}`,
    };
  }

  // Generate unique ID
  const milestoneId = await generateUniqueId(entry, milestoneData.title);

  // Prepare source URL
  const sourceUrl = entry.doi
    ? `https://doi.org/${entry.doi}`
    : entry.sourceUrl || null;

  // Prepare sources array
  const sources = sourceUrl
    ? [{ label: entry.type === 'paper' ? 'Paper' : 'Source', kind: entry.type === 'paper' ? 'paper' : 'article', url: sourceUrl }]
    : [];

  if (dryRun) {
    console.log(`[BibliographyPublisher] DRY RUN - Would create milestone: ${milestoneId}`);
    console.log(`  Title: ${milestoneData.title}`);
    console.log(`  Date: ${milestoneData.date}`);
    console.log(`  Category: ${milestoneData.category}`);
    console.log(`  Significance: ${milestoneData.significance}`);

    return {
      entry,
      status: 'created',
      milestoneId,
      scrapingSucceeded: scrapedMetadata?.success ?? false,
      llmGenerated: true,
    };
  }

  try {
    // Create milestone in database
    await prisma.milestone.create({
      data: {
        id: milestoneId,
        title: milestoneData.title,
        description: milestoneData.description,
        date: new Date(milestoneData.date),
        category: milestoneData.category,
        significance: milestoneData.significance,
        era: milestoneData.era,
        organization: milestoneData.organization || null,
        contributors: JSON.stringify(milestoneData.contributors),
        sourceUrl,
        tags: JSON.stringify(milestoneData.tags),
        sources: JSON.stringify(sources),
        // Layered content
        tldr: milestoneData.tldr || null,
        simpleExplanation: milestoneData.simpleExplanation || null,
        businessImpact: milestoneData.businessImpact || null,
        historicalContext: milestoneData.historicalContext || null,
        technicalDepth: milestoneData.technicalDepth || null,
        whyItMattersToday: milestoneData.whyItMattersToday || null,
        commonMisconceptions: milestoneData.commonMisconceptions || null,
      },
    });

    console.log(`[BibliographyPublisher] Created milestone: ${milestoneId}`);

    // Clear the milestones cache so future duplicate checks see this milestone
    clearMilestonesCache();

    return {
      entry,
      status: 'created',
      milestoneId,
      scrapingSucceeded: scrapedMetadata?.success ?? false,
      llmGenerated: true,
    };
  } catch (error) {
    console.error(`[BibliographyPublisher] Failed to create milestone:`, error);

    return {
      entry,
      status: 'error',
      scrapingSucceeded: scrapedMetadata?.success ?? false,
      llmGenerated: true,
      error: `Database error: ${error}`,
    };
  }
}

/**
 * Batch publish milestones with progress tracking
 */
export async function publishMilestones(
  entries: Array<{
    entry: BibliographyEntry;
    milestoneData: GeneratedMilestoneData;
    scrapedMetadata: ScrapedMetadata | null;
  }>,
  options: {
    dryRun?: boolean;
    onProgress?: (processed: number, total: number, created: number) => void;
  } = {}
): Promise<ProcessingResult[]> {
  const { dryRun = false, onProgress } = options;
  const results: ProcessingResult[] = [];

  let createdCount = 0;

  for (let i = 0; i < entries.length; i++) {
    const { entry, milestoneData, scrapedMetadata } = entries[i];

    const result = await publishMilestone(entry, milestoneData, scrapedMetadata, dryRun);
    results.push(result);

    if (result.status === 'created') {
      createdCount++;
    }

    onProgress?.(i + 1, entries.length, createdCount);
  }

  console.log(
    `[BibliographyPublisher] Published ${createdCount}/${entries.length} milestones${dryRun ? ' (dry run)' : ''}`
  );

  return results;
}

/**
 * Get publishing statistics
 */
export function getPublishingStats(results: ProcessingResult[]): {
  total: number;
  created: number;
  errors: number;
  scrapingSucceeded: number;
  llmGenerated: number;
} {
  return {
    total: results.length,
    created: results.filter((r) => r.status === 'created').length,
    errors: results.filter((r) => r.status === 'error').length,
    scrapingSucceeded: results.filter((r) => r.scrapingSucceeded).length,
    llmGenerated: results.filter((r) => r.llmGenerated).length,
  };
}

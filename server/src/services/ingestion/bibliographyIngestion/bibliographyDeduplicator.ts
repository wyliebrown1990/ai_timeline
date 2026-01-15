/**
 * Bibliography Deduplicator
 * Sprint Bib-1: Check for duplicates against existing milestones
 *
 * Uses title similarity matching (Levenshtein distance)
 */

import { prisma } from '../../../db';
import { calculateTitleSimilarity } from '../duplicateDetector';
import type { BibliographyEntry, DuplicateCheckResult } from './types';

// Cache of existing milestones for faster duplicate checking
let cachedMilestones: Array<{ id: string; title: string; date: Date }> | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * Load existing milestones into cache
 */
async function loadMilestonesCache(): Promise<Array<{ id: string; title: string; date: Date }>> {
  const now = Date.now();

  if (cachedMilestones && now - cacheTime < CACHE_TTL) {
    return cachedMilestones;
  }

  console.log('[BibliographyDeduplicator] Loading milestones cache...');

  cachedMilestones = await prisma.milestone.findMany({
    select: {
      id: true,
      title: true,
      date: true,
    },
    orderBy: { date: 'asc' },
  });

  cacheTime = now;
  console.log(`[BibliographyDeduplicator] Cached ${cachedMilestones.length} milestones`);

  return cachedMilestones;
}

/**
 * Clear the milestones cache (call after creating new milestones)
 */
export function clearMilestonesCache(): void {
  cachedMilestones = null;
  cacheTime = 0;
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if an entry matches an existing milestone by author and year
 */
function checkAuthorYearMatch(
  entry: BibliographyEntry,
  milestone: { id: string; title: string; date: Date }
): boolean {
  const milestoneYear = milestone.date.getFullYear();

  // Check if year matches (within 1 year tolerance for publication delays)
  if (Math.abs(entry.year - milestoneYear) > 1) {
    return false;
  }

  // Check if any author appears in the milestone title
  for (const author of entry.authors) {
    const lastName = author.split(',')[0].trim().toLowerCase();
    if (lastName.length > 2 && milestone.title.toLowerCase().includes(lastName)) {
      return true;
    }
  }

  return false;
}

/**
 * Check a single entry for duplicates
 */
export async function checkDuplicate(
  entry: BibliographyEntry,
  similarityThreshold: number = 0.85
): Promise<DuplicateCheckResult> {
  const milestones = await loadMilestonesCache();

  const normalizedEntryTitle = normalizeTitle(entry.title);

  let bestMatch: {
    milestone: { id: string; title: string; date: Date };
    score: number;
    method: 'title' | 'author_year' | 'doi';
  } | null = null;

  for (const milestone of milestones) {
    const normalizedMilestoneTitle = normalizeTitle(milestone.title);

    // Check title similarity
    const similarity = calculateTitleSimilarity(normalizedEntryTitle, normalizedMilestoneTitle);

    if (similarity >= similarityThreshold) {
      if (!bestMatch || similarity > bestMatch.score) {
        bestMatch = { milestone, score: similarity, method: 'title' };
      }
    }

    // Check author + year match (lower threshold since it's a different method)
    if (similarity >= 0.5 && checkAuthorYearMatch(entry, milestone)) {
      // Boost score for author+year match
      const boostedScore = Math.min(1, similarity + 0.2);
      if (boostedScore >= similarityThreshold && (!bestMatch || boostedScore > bestMatch.score)) {
        bestMatch = { milestone, score: boostedScore, method: 'author_year' };
      }
    }
  }

  if (bestMatch) {
    return {
      entry,
      isDuplicate: true,
      matchedMilestoneId: bestMatch.milestone.id,
      matchedTitle: bestMatch.milestone.title,
      similarityScore: bestMatch.score,
      matchMethod: bestMatch.method,
    };
  }

  return {
    entry,
    isDuplicate: false,
    similarityScore: 0,
  };
}

/**
 * Check multiple entries for duplicates (batch operation)
 */
export async function checkDuplicates(
  entries: BibliographyEntry[],
  options: {
    similarityThreshold?: number;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<{
  duplicates: DuplicateCheckResult[];
  unique: DuplicateCheckResult[];
}> {
  const { similarityThreshold = 0.85, onProgress } = options;

  console.log(`[BibliographyDeduplicator] Checking ${entries.length} entries for duplicates`);

  // Pre-load cache
  await loadMilestonesCache();

  const duplicates: DuplicateCheckResult[] = [];
  const unique: DuplicateCheckResult[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const result = await checkDuplicate(entry, similarityThreshold);

    if (result.isDuplicate) {
      duplicates.push(result);
      console.log(
        `[BibliographyDeduplicator] Duplicate: "${entry.title.slice(0, 50)}..." ` +
          `matches "${result.matchedTitle?.slice(0, 50)}..." (${(result.similarityScore * 100).toFixed(0)}%)`
      );
    } else {
      unique.push(result);
    }

    onProgress?.(i + 1, entries.length);
  }

  console.log(
    `[BibliographyDeduplicator] Found ${duplicates.length} duplicates, ${unique.length} unique entries`
  );

  return { duplicates, unique };
}

/**
 * Get duplicate statistics
 */
export function getDuplicateStats(results: DuplicateCheckResult[]): {
  totalChecked: number;
  duplicatesFound: number;
  uniqueEntries: number;
  byMethod: Record<string, number>;
  avgSimilarity: number;
} {
  const duplicates = results.filter((r) => r.isDuplicate);
  const byMethod: Record<string, number> = {};

  let totalSimilarity = 0;
  for (const d of duplicates) {
    const method = d.matchMethod || 'unknown';
    byMethod[method] = (byMethod[method] || 0) + 1;
    totalSimilarity += d.similarityScore;
  }

  return {
    totalChecked: results.length,
    duplicatesFound: duplicates.length,
    uniqueEntries: results.length - duplicates.length,
    byMethod,
    avgSimilarity: duplicates.length > 0 ? totalSimilarity / duplicates.length : 0,
  };
}

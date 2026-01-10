/**
 * Key Figure Matching Service
 * Sprint 44 - Key Figures Data Foundation
 *
 * Matches extracted names against existing KeyFigure records using:
 * 1. Exact canonical name match
 * 2. Exact alias match
 * 3. Fuzzy matching with Jaro-Winkler similarity
 */

import { prisma } from '../db';
import { normalizeName, generateVariants } from '../lib/nameNormalizer';
import { areFirstNamesEquivalent } from '../lib/nameVariants';
import type { KeyFigure } from '@prisma/client';

export type MatchType = 'exact_canonical' | 'exact_alias' | 'fuzzy' | 'none';

export interface MatchResult {
  matched: boolean;
  keyFigure?: KeyFigure;
  matchType: MatchType;
  confidence: number; // 0-1
  candidates?: Array<{ keyFigure: KeyFigure; confidence: number }>;
}

// Thresholds for matching
const AUTO_MATCH_THRESHOLD = 0.95;
const CANDIDATE_THRESHOLD = 0.80;
const MAX_CANDIDATES = 3;

/**
 * Find a matching KeyFigure for the given name
 */
export async function findMatch(name: string): Promise<MatchResult> {
  const normalized = normalizeName(name);

  // Get all key figures (could be optimized with caching for large datasets)
  const allFigures = await prisma.keyFigure.findMany({
    where: { status: 'published' },
  });

  // Step 1: Exact canonical name match
  const exactCanonical = allFigures.find(
    (f) => f.canonicalName.toLowerCase() === normalized.canonical.toLowerCase()
  );
  if (exactCanonical) {
    return {
      matched: true,
      keyFigure: exactCanonical,
      matchType: 'exact_canonical',
      confidence: 1.0,
    };
  }

  // Step 2: Exact alias match
  for (const figure of allFigures) {
    const aliases: string[] = JSON.parse(figure.aliases);
    const aliasMatch = aliases.find(
      (alias) => alias.toLowerCase() === normalized.canonical.toLowerCase()
    );
    if (aliasMatch) {
      return {
        matched: true,
        keyFigure: figure,
        matchType: 'exact_alias',
        confidence: 1.0,
      };
    }
  }

  // Step 3: Fuzzy matching
  const candidates: Array<{ keyFigure: KeyFigure; confidence: number }> = [];

  for (const figure of allFigures) {
    const confidence = calculateMatchConfidence(normalized.canonical, figure);
    if (confidence >= CANDIDATE_THRESHOLD) {
      candidates.push({ keyFigure: figure, confidence });
    }
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  // If top candidate is above auto-match threshold, return as match
  if (candidates.length > 0 && candidates[0].confidence >= AUTO_MATCH_THRESHOLD) {
    return {
      matched: true,
      keyFigure: candidates[0].keyFigure,
      matchType: 'fuzzy',
      confidence: candidates[0].confidence,
      candidates: candidates.slice(0, MAX_CANDIDATES),
    };
  }

  // Return candidates but no auto-match
  if (candidates.length > 0) {
    return {
      matched: false,
      matchType: 'none',
      confidence: candidates[0].confidence,
      candidates: candidates.slice(0, MAX_CANDIDATES),
    };
  }

  // No match found
  return {
    matched: false,
    matchType: 'none',
    confidence: 0,
  };
}

/**
 * Calculate match confidence between a name and a KeyFigure
 */
function calculateMatchConfidence(name: string, figure: KeyFigure): number {
  const nameLower = name.toLowerCase();
  const canonicalLower = figure.canonicalName.toLowerCase();

  // Direct similarity on canonical name
  const directSimilarity = jaroWinkler(nameLower, canonicalLower);

  // Check aliases
  const aliases: string[] = JSON.parse(figure.aliases);
  let bestAliasSimilarity = 0;
  for (const alias of aliases) {
    const sim = jaroWinkler(nameLower, alias.toLowerCase());
    if (sim > bestAliasSimilarity) {
      bestAliasSimilarity = sim;
    }
  }

  // Check if first names are equivalent (nicknames)
  const inputParts = name.split(' ');
  const canonicalParts = figure.canonicalName.split(' ');
  if (inputParts.length >= 2 && canonicalParts.length >= 2) {
    const sameFirstName = areFirstNamesEquivalent(inputParts[0], canonicalParts[0]);
    const sameLastName = inputParts[inputParts.length - 1].toLowerCase() ===
                         canonicalParts[canonicalParts.length - 1].toLowerCase();
    if (sameFirstName && sameLastName) {
      return Math.max(directSimilarity, 0.92); // Boost for nickname match
    }
  }

  return Math.max(directSimilarity, bestAliasSimilarity);
}

/**
 * Jaro-Winkler similarity algorithm
 * Returns a value between 0 (no similarity) and 1 (exact match)
 * Particularly good for name matching
 */
function jaroWinkler(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2);

  // Find common prefix (up to 4 characters)
  let prefix = 0;
  const minLen = Math.min(s1.length, s2.length, 4);
  for (let i = 0; i < minLen; i++) {
    if (s1[i] === s2[i]) {
      prefix++;
    } else {
      break;
    }
  }

  // Winkler modification: boost for common prefix
  const p = 0.1; // Standard scaling factor
  return jaro + prefix * p * (1 - jaro);
}

/**
 * Jaro similarity (base algorithm)
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matching characters
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (
    matches / s1.length +
    matches / s2.length +
    (matches - transpositions / 2) / matches
  ) / 3;

  return jaro;
}

/**
 * Check if a name already exists in the database
 * (quick existence check without full match analysis)
 */
export async function nameExists(name: string): Promise<boolean> {
  const normalized = normalizeName(name);

  const existing = await prisma.keyFigure.findFirst({
    where: {
      OR: [
        { canonicalName: { equals: normalized.canonical, mode: 'insensitive' } },
        { aliases: { contains: normalized.canonical, mode: 'insensitive' } },
      ],
    },
  });

  return existing !== null;
}

/**
 * Get or create a KeyFigure ID for a name
 * Returns existing ID if found, or generates new ID if not
 */
export async function getOrGenerateId(name: string): Promise<{ id: string; exists: boolean }> {
  const normalized = normalizeName(name);

  const existing = await prisma.keyFigure.findFirst({
    where: {
      OR: [
        { canonicalName: { equals: normalized.canonical, mode: 'insensitive' } },
        { id: normalized.id },
      ],
    },
  });

  if (existing) {
    return { id: existing.id, exists: true };
  }

  return { id: normalized.id, exists: false };
}

/**
 * Suggest aliases for a new key figure
 */
export function suggestAliases(name: string): string[] {
  return generateVariants(name);
}

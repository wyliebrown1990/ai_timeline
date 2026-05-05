/**
 * Entity Matching Service
 * Sprint KPC-4 - AI Entity Detection & Auto-Linking
 *
 * Matches extracted entity names against existing Person and Organization records.
 * Uses exact matching, alias matching, and Jaro-Winkler fuzzy matching.
 */

import { prisma } from '../db';
import { normalizeName } from '../lib/nameNormalizer';
import { areFirstNamesEquivalent } from '../lib/nameVariants';
import type { Person, Organization } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export type PersonMatchType = 'exact_canonical' | 'exact_alias' | 'fuzzy' | 'none';
export type OrgMatchType = 'exact_name' | 'fuzzy' | 'none';

export interface PersonMatchResult {
  matched: boolean;
  person?: Person;
  matchType: PersonMatchType;
  confidence: number; // 0-1
  suggestedAction: 'link' | 'create_draft' | 'review';
  candidates?: Array<{ person: Person; confidence: number }>;
}

export interface OrgMatchResult {
  matched: boolean;
  organization?: Organization;
  matchType: OrgMatchType;
  confidence: number; // 0-1
  suggestedAction: 'link' | 'create_draft' | 'review';
  candidates?: Array<{ organization: Organization; confidence: number }>;
}

// ============================================================================
// Thresholds
// ============================================================================

const AUTO_LINK_THRESHOLD = 0.95;
const CANDIDATE_THRESHOLD = 0.80;
const MAX_CANDIDATES = 3;

// ============================================================================
// Person Matching
// ============================================================================

/**
 * Find a matching Person for the given name
 */
export async function matchPerson(name: string): Promise<PersonMatchResult> {
  const normalized = normalizeName(name);

  // Get all published persons
  const allPersons = await prisma.person.findMany({
    where: { status: 'published' },
  });

  // Step 1: Exact canonical name match
  const exactCanonical = allPersons.find(
    (p) => p.canonicalName.toLowerCase() === normalized.canonical.toLowerCase()
  );
  if (exactCanonical) {
    return {
      matched: true,
      person: exactCanonical,
      matchType: 'exact_canonical',
      confidence: 1.0,
      suggestedAction: 'link',
    };
  }

  // Step 2: Exact alias match
  for (const person of allPersons) {
    const aliases: string[] = JSON.parse(person.aliases || '[]');
    const aliasMatch = aliases.find(
      (alias) => alias.toLowerCase() === normalized.canonical.toLowerCase()
    );
    if (aliasMatch) {
      return {
        matched: true,
        person: person,
        matchType: 'exact_alias',
        confidence: 1.0,
        suggestedAction: 'link',
      };
    }
  }

  // Step 3: Fuzzy matching
  const candidates: Array<{ person: Person; confidence: number }> = [];

  for (const person of allPersons) {
    const confidence = calculatePersonMatchConfidence(normalized.canonical, person);
    if (confidence >= CANDIDATE_THRESHOLD) {
      candidates.push({ person, confidence });
    }
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  // If top candidate is above auto-link threshold, return as match
  if (candidates.length > 0 && candidates[0].confidence >= AUTO_LINK_THRESHOLD) {
    return {
      matched: true,
      person: candidates[0].person,
      matchType: 'fuzzy',
      confidence: candidates[0].confidence,
      suggestedAction: 'link',
      candidates: candidates.slice(0, MAX_CANDIDATES),
    };
  }

  // Return candidates for review
  if (candidates.length > 0) {
    return {
      matched: false,
      matchType: 'none',
      confidence: candidates[0].confidence,
      suggestedAction: 'review',
      candidates: candidates.slice(0, MAX_CANDIDATES),
    };
  }

  // No match found - suggest creating draft
  return {
    matched: false,
    matchType: 'none',
    confidence: 0,
    suggestedAction: 'create_draft',
  };
}

/**
 * Calculate match confidence between a name and a Person
 */
function calculatePersonMatchConfidence(name: string, person: Person): number {
  const nameLower = name.toLowerCase();
  const canonicalLower = person.canonicalName.toLowerCase();

  // Direct similarity on canonical name
  const directSimilarity = jaroWinkler(nameLower, canonicalLower);

  // Check aliases
  const aliases: string[] = JSON.parse(person.aliases || '[]');
  let bestAliasSimilarity = 0;
  for (const alias of aliases) {
    const sim = jaroWinkler(nameLower, alias.toLowerCase());
    if (sim > bestAliasSimilarity) {
      bestAliasSimilarity = sim;
    }
  }

  // Check if first names are equivalent (nicknames)
  const inputParts = name.split(' ');
  const canonicalParts = person.canonicalName.split(' ');
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

// ============================================================================
// Organization Matching
// ============================================================================

// Common organization name variations
const ORG_SUFFIXES = [
  'inc.', 'inc', 'incorporated',
  'corp.', 'corp', 'corporation',
  'llc', 'l.l.c.',
  'ltd.', 'ltd', 'limited',
  'co.', 'co', 'company',
  'plc', 'p.l.c.',
  'gmbh', 'ag', 's.a.', 'sa',
];

/**
 * Normalize organization name for matching
 */
function normalizeOrgName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Remove common suffixes
  for (const suffix of ORG_SUFFIXES) {
    const suffixPattern = new RegExp(`\\s*,?\\s*${suffix.replace('.', '\\.')}\\s*$`, 'i');
    normalized = normalized.replace(suffixPattern, '');
  }

  // Remove "the" prefix
  normalized = normalized.replace(/^the\s+/, '');

  return normalized.trim();
}

/**
 * Find a matching Organization for the given name
 */
export async function matchOrganization(name: string): Promise<OrgMatchResult> {
  const normalizedName = normalizeOrgName(name);

  // Get all published organizations
  const allOrgs = await prisma.organization.findMany({
    where: { status: 'published' },
  });

  // Step 1: Exact name match (with normalization)
  const exactMatch = allOrgs.find(
    (org) => normalizeOrgName(org.name) === normalizedName
  );
  if (exactMatch) {
    return {
      matched: true,
      organization: exactMatch,
      matchType: 'exact_name',
      confidence: 1.0,
      suggestedAction: 'link',
    };
  }

  // Step 2: Fuzzy matching
  const candidates: Array<{ organization: Organization; confidence: number }> = [];

  for (const org of allOrgs) {
    const confidence = calculateOrgMatchConfidence(normalizedName, org);
    if (confidence >= CANDIDATE_THRESHOLD) {
      candidates.push({ organization: org, confidence });
    }
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  // If top candidate is above auto-link threshold
  if (candidates.length > 0 && candidates[0].confidence >= AUTO_LINK_THRESHOLD) {
    return {
      matched: true,
      organization: candidates[0].organization,
      matchType: 'fuzzy',
      confidence: candidates[0].confidence,
      suggestedAction: 'link',
      candidates: candidates.slice(0, MAX_CANDIDATES),
    };
  }

  // Return candidates for review
  if (candidates.length > 0) {
    return {
      matched: false,
      matchType: 'none',
      confidence: candidates[0].confidence,
      suggestedAction: 'review',
      candidates: candidates.slice(0, MAX_CANDIDATES),
    };
  }

  // No match found
  return {
    matched: false,
    matchType: 'none',
    confidence: 0,
    suggestedAction: 'create_draft',
  };
}

/**
 * Calculate match confidence between a name and an Organization
 */
function calculateOrgMatchConfidence(normalizedName: string, org: Organization): number {
  const orgNormalized = normalizeOrgName(org.name);

  // Direct similarity
  const directSimilarity = jaroWinkler(normalizedName, orgNormalized);

  // Check for common abbreviations/variations
  // e.g., "OpenAI" vs "Open AI", "DeepMind" vs "Google DeepMind"
  if (normalizedName.includes(orgNormalized) || orgNormalized.includes(normalizedName)) {
    return Math.max(directSimilarity, 0.88);
  }

  return directSimilarity;
}

// ============================================================================
// Jaro-Winkler Similarity Algorithm
// (Copied from keyFigureMatcher for independence)
// ============================================================================

/**
 * Jaro-Winkler similarity algorithm
 * Returns a value between 0 (no similarity) and 1 (exact match)
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a person name already exists (quick check)
 */
export async function personNameExists(name: string): Promise<boolean> {
  const normalized = normalizeName(name);

  const existing = await prisma.person.findFirst({
    where: {
      OR: [
        { canonicalName: { equals: normalized.canonical, mode: 'insensitive' } },
        { aliases: { contains: normalized.canonical, mode: 'insensitive' } },
      ],
      status: 'published',
    },
  });

  return existing !== null;
}

/**
 * Check if an organization name already exists (quick check)
 */
export async function orgNameExists(name: string): Promise<boolean> {
  const normalized = normalizeOrgName(name);

  const existing = await prisma.organization.findFirst({
    where: {
      name: { equals: normalized, mode: 'insensitive' },
      status: 'published',
    },
  });

  return existing !== null;
}

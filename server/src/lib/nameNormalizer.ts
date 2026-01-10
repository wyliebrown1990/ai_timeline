/**
 * Name Normalization Utilities for Key Figures
 * Sprint 44 - Key Figures Data Foundation
 *
 * Handles normalization, ID generation, and common variant generation
 * for person names to enable robust matching and deduplication.
 */

import { NAME_VARIANTS } from './nameVariants';

// Titles and honorifics to remove
const PREFIXES = [
  'dr.',
  'dr',
  'prof.',
  'prof',
  'professor',
  'mr.',
  'mr',
  'mrs.',
  'mrs',
  'ms.',
  'ms',
  'sir',
  'dame',
  'hon.',
  'hon',
  'rev.',
  'rev',
];

// Suffixes to remove
const SUFFIXES = [
  'phd',
  'ph.d.',
  'ph.d',
  'md',
  'm.d.',
  'm.d',
  'jr.',
  'jr',
  'junior',
  'sr.',
  'sr',
  'senior',
  'ii',
  'iii',
  'iv',
  'esq.',
  'esq',
  'cbe',
  'obe',
  'mbe',
  'frs',
  'freng',
];

export interface NormalizedName {
  /** Original input name */
  original: string;
  /** Canonical form: proper case, no titles/suffixes */
  canonical: string;
  /** Normalized for comparison: lowercase, no titles/suffixes */
  normalized: string;
  /** Kebab-case ID for database */
  id: string;
  /** Middle initial if present */
  middleInitial?: string;
  /** Prefixes that were removed */
  removedPrefixes: string[];
  /** Suffixes that were removed */
  removedSuffixes: string[];
}

/**
 * Normalize a person's name for matching and storage
 *
 * @example
 * normalizeName("Dr. Geoffrey E. Hinton, PhD")
 * // Returns:
 * // {
 * //   original: "Dr. Geoffrey E. Hinton, PhD",
 * //   canonical: "Geoffrey Hinton",
 * //   normalized: "geoffrey hinton",
 * //   id: "geoffrey-hinton",
 * //   middleInitial: "E",
 * //   removedPrefixes: ["Dr."],
 * //   removedSuffixes: ["PhD"]
 * // }
 */
export function normalizeName(name: string): NormalizedName {
  const original = name.trim();
  const removedPrefixes: string[] = [];
  const removedSuffixes: string[] = [];

  // Split into parts
  let parts = original.split(/[\s,]+/).filter(Boolean);

  // Remove prefixes
  while (parts.length > 0) {
    const first = parts[0].toLowerCase().replace(/\.$/, '') + '.';
    const firstNoDot = parts[0].toLowerCase().replace(/\.$/, '');
    if (PREFIXES.includes(firstNoDot) || PREFIXES.includes(first.replace(/\.$/, ''))) {
      removedPrefixes.push(parts[0]);
      parts = parts.slice(1);
    } else {
      break;
    }
  }

  // Remove suffixes
  while (parts.length > 0) {
    const last = parts[parts.length - 1].toLowerCase().replace(/\.$/, '');
    if (SUFFIXES.includes(last)) {
      removedSuffixes.unshift(parts[parts.length - 1]);
      parts = parts.slice(0, -1);
    } else {
      break;
    }
  }

  // Extract middle initial (single letter, optionally with period)
  let middleInitial: string | undefined;
  if (parts.length >= 3) {
    const middleParts = parts.slice(1, -1);
    const initialPattern = /^[A-Z]\.?$/i;
    const initials = middleParts.filter((p) => initialPattern.test(p));
    if (initials.length > 0) {
      middleInitial = initials[0].replace('.', '').toUpperCase();
      // Remove middle initials from parts for canonical name
      parts = [parts[0], ...middleParts.filter((p) => !initialPattern.test(p)), parts[parts.length - 1]];
    }
  }

  // Build canonical name (proper case)
  const canonical = parts
    .map((part) => {
      // Handle hyphenated names
      if (part.includes('-')) {
        return part
          .split('-')
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
          .join('-');
      }
      // Handle special cases like "McDonald", "O'Brien"
      if (part.includes("'")) {
        const [before, after] = part.split("'");
        return before.charAt(0).toUpperCase() + before.slice(1).toLowerCase() + "'" + after.charAt(0).toUpperCase() + after.slice(1).toLowerCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');

  // Build normalized name (lowercase, for comparison)
  const normalized = canonical.toLowerCase();

  // Build ID (kebab-case)
  const id = normalized
    .replace(/['']/g, '') // Remove apostrophes
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except space and hyphen
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim hyphens

  return {
    original,
    canonical,
    normalized,
    id,
    middleInitial,
    removedPrefixes,
    removedSuffixes,
  };
}

/**
 * Generate common name variants for a given name
 *
 * @example
 * generateVariants("Geoffrey Hinton")
 * // Returns: ["Geoff Hinton", "Jeff Hinton", "G. Hinton", "G Hinton"]
 */
export function generateVariants(name: string): string[] {
  const { canonical, middleInitial } = normalizeName(name);
  const parts = canonical.split(' ');
  const variants: Set<string> = new Set();

  if (parts.length < 2) return [];

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const middleParts = parts.slice(1, -1);

  // Add nickname variants
  const firstLower = firstName.toLowerCase();
  const nicknames = NAME_VARIANTS[firstLower] || [];
  for (const nickname of nicknames) {
    const nicknameProper = nickname.charAt(0).toUpperCase() + nickname.slice(1);
    variants.add(`${nicknameProper} ${lastName}`);
  }

  // Add first initial variants
  const initial = firstName.charAt(0).toUpperCase();
  variants.add(`${initial}. ${lastName}`);
  variants.add(`${initial} ${lastName}`);

  // Add with middle initial if present
  if (middleInitial) {
    variants.add(`${firstName} ${middleInitial}. ${lastName}`);
    variants.add(`${firstName} ${middleInitial} ${lastName}`);
    variants.add(`${initial}. ${middleInitial}. ${lastName}`);
  }

  // Add with middle names if present
  if (middleParts.length > 0) {
    variants.add(`${firstName} ${middleParts.join(' ')} ${lastName}`);
  }

  return Array.from(variants);
}

/**
 * Check if two names likely refer to the same person
 * Uses normalized comparison
 */
export function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  return n1.normalized === n2.normalized || n1.id === n2.id;
}

/**
 * Extract last name from a full name
 */
export function extractLastName(name: string): string {
  const { canonical } = normalizeName(name);
  const parts = canonical.split(' ');
  return parts[parts.length - 1];
}

/**
 * Extract first name from a full name
 */
export function extractFirstName(name: string): string {
  const { canonical } = normalizeName(name);
  const parts = canonical.split(' ');
  return parts[0];
}

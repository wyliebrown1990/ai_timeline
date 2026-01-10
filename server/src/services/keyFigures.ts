/**
 * Key Figures Service
 * Sprint 45 - Key Figures API & Admin CRUD
 *
 * Database operations for managing key figures in AI history.
 */

import { prisma } from '../db';
import type { KeyFigure, MilestoneContributor, Milestone } from '@prisma/client';
import { normalizeName, generateVariants } from '../lib/nameNormalizer';

/**
 * Key figure role enum (matches Prisma schema)
 */
export type KeyFigureRole = 'researcher' | 'executive' | 'founder' | 'policy_maker' | 'engineer' | 'other';

/**
 * Key figure status enum
 */
export type KeyFigureStatus = 'draft' | 'pending_review' | 'published';

/**
 * Contribution type enum
 */
export type ContributionType = 'lead' | 'co_author' | 'advisor' | 'founder' | 'mentioned';

/**
 * Pagination options for list queries
 */
interface PaginationOptions {
  skip?: number;
  limit?: number;
}

/**
 * Create key figure DTO
 */
export interface CreateKeyFigureDto {
  canonicalName: string;
  aliases?: string[];
  shortBio: string;
  fullBio?: string;
  primaryOrg?: string;
  previousOrgs?: string[];
  role: KeyFigureRole;
  notableFor: string;
  imageUrl?: string;
  wikipediaUrl?: string;
  linkedInUrl?: string;
  twitterHandle?: string;
  status?: KeyFigureStatus;
}

/**
 * Update key figure DTO
 */
export interface UpdateKeyFigureDto {
  canonicalName?: string;
  aliases?: string[];
  shortBio?: string;
  fullBio?: string | null;
  primaryOrg?: string | null;
  previousOrgs?: string[];
  role?: KeyFigureRole;
  notableFor?: string;
  imageUrl?: string | null;
  wikipediaUrl?: string | null;
  linkedInUrl?: string | null;
  twitterHandle?: string | null;
  status?: KeyFigureStatus;
}

/**
 * Get all key figures with optional filtering and pagination
 */
export async function getAll(options?: PaginationOptions & {
  status?: KeyFigureStatus;
  role?: KeyFigureRole;
  search?: string;
}): Promise<{ keyFigures: KeyFigure[]; total: number }> {
  if (!prisma) throw new Error('Database not available');

  const where: Record<string, unknown> = {};

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.role) {
    where.role = options.role;
  }

  if (options?.search) {
    // Search in canonicalName and aliases (JSON contains for aliases)
    where.OR = [
      { canonicalName: { contains: options.search, mode: 'insensitive' } },
      { aliases: { contains: options.search } },
      { shortBio: { contains: options.search, mode: 'insensitive' } },
      { primaryOrg: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [keyFigures, total] = await Promise.all([
    prisma.keyFigure.findMany({
      where,
      skip: options?.skip ?? 0,
      take: options?.limit ?? 50,
      orderBy: { canonicalName: 'asc' },
    }),
    prisma.keyFigure.count({ where }),
  ]);

  return { keyFigures, total };
}

/**
 * Get a single key figure by ID
 */
export async function getById(id: string): Promise<KeyFigure | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.keyFigure.findUnique({
    where: { id },
  });
}

/**
 * Get a key figure by canonical name (case-insensitive)
 */
export async function getByCanonicalName(name: string): Promise<KeyFigure | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.keyFigure.findFirst({
    where: {
      canonicalName: {
        equals: name,
        mode: 'insensitive',
      },
    },
  });
}

/**
 * Search key figures by query string (for autocomplete)
 */
export async function search(query: string, limit = 10): Promise<KeyFigure[]> {
  if (!prisma) throw new Error('Database not available');

  // Search canonical name, aliases, and organization
  return prisma.keyFigure.findMany({
    where: {
      AND: [
        { status: 'published' },
        {
          OR: [
            { canonicalName: { contains: query, mode: 'insensitive' } },
            { aliases: { contains: query } },
            { primaryOrg: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    },
    take: limit,
    orderBy: { canonicalName: 'asc' },
  });
}

/**
 * Create a new key figure
 */
export async function create(data: CreateKeyFigureDto): Promise<KeyFigure> {
  if (!prisma) throw new Error('Database not available');

  // Generate ID from canonical name
  const { id } = normalizeName(data.canonicalName);

  // Generate common variants if aliases not provided
  let aliases = data.aliases || [];
  if (aliases.length === 0) {
    aliases = generateVariants(data.canonicalName);
  }

  return prisma.keyFigure.create({
    data: {
      id,
      canonicalName: data.canonicalName,
      aliases: JSON.stringify(aliases),
      shortBio: data.shortBio,
      fullBio: data.fullBio ?? null,
      primaryOrg: data.primaryOrg ?? null,
      previousOrgs: JSON.stringify(data.previousOrgs ?? []),
      role: data.role,
      notableFor: data.notableFor,
      imageUrl: data.imageUrl ?? null,
      wikipediaUrl: data.wikipediaUrl ?? null,
      linkedInUrl: data.linkedInUrl ?? null,
      twitterHandle: data.twitterHandle ?? null,
      status: data.status ?? 'published',
    },
  });
}

/**
 * Update an existing key figure
 */
export async function update(id: string, data: UpdateKeyFigureDto): Promise<KeyFigure | null> {
  if (!prisma) throw new Error('Database not available');

  // Build update data, only including fields that are provided
  const updateData: Record<string, unknown> = {};

  if (data.canonicalName !== undefined) updateData.canonicalName = data.canonicalName;
  if (data.aliases !== undefined) updateData.aliases = JSON.stringify(data.aliases);
  if (data.shortBio !== undefined) updateData.shortBio = data.shortBio;
  if (data.fullBio !== undefined) updateData.fullBio = data.fullBio;
  if (data.primaryOrg !== undefined) updateData.primaryOrg = data.primaryOrg;
  if (data.previousOrgs !== undefined) updateData.previousOrgs = JSON.stringify(data.previousOrgs);
  if (data.role !== undefined) updateData.role = data.role;
  if (data.notableFor !== undefined) updateData.notableFor = data.notableFor;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.wikipediaUrl !== undefined) updateData.wikipediaUrl = data.wikipediaUrl;
  if (data.linkedInUrl !== undefined) updateData.linkedInUrl = data.linkedInUrl;
  if (data.twitterHandle !== undefined) updateData.twitterHandle = data.twitterHandle;
  if (data.status !== undefined) updateData.status = data.status;

  try {
    return await prisma.keyFigure.update({
      where: { id },
      data: updateData,
    });
  } catch {
    return null;
  }
}

/**
 * Delete a key figure by ID
 */
export async function remove(id: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  try {
    await prisma.keyFigure.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a key figure ID already exists
 */
export async function idExists(id: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  const existing = await prisma.keyFigure.findUnique({
    where: { id },
    select: { id: true },
  });

  return existing !== null;
}

/**
 * Check if a canonical name already exists
 */
export async function nameExists(name: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  const existing = await prisma.keyFigure.findUnique({
    where: { canonicalName: name },
    select: { id: true },
  });

  return existing !== null;
}

/**
 * Get milestones associated with a key figure
 */
export async function getMilestones(keyFigureId: string): Promise<Array<{
  milestone: Milestone;
  contributionType: string | null;
}>> {
  if (!prisma) throw new Error('Database not available');

  const contributions = await prisma.milestoneContributor.findMany({
    where: { keyFigureId },
    include: {
      milestone: true,
    },
    orderBy: {
      milestone: {
        date: 'desc',
      },
    },
  });

  return contributions.map((c) => ({
    milestone: c.milestone,
    contributionType: c.contributionType,
  }));
}

/**
 * Get total count of key figures
 */
export async function getCount(): Promise<number> {
  if (!prisma) throw new Error('Database not available');

  return prisma.keyFigure.count();
}

/**
 * Get count by role
 */
export async function getCountByRole(): Promise<Record<string, number>> {
  if (!prisma) throw new Error('Database not available');

  const roles = ['researcher', 'executive', 'founder', 'policy_maker', 'engineer', 'other'];
  const counts: Record<string, number> = {};

  for (const role of roles) {
    counts[role] = await prisma.keyFigure.count({
      where: { role },
    });
  }

  return counts;
}

/**
 * Get count by status
 */
export async function getCountByStatus(): Promise<Record<string, number>> {
  if (!prisma) throw new Error('Database not available');

  const statuses = ['draft', 'pending_review', 'published'];
  const counts: Record<string, number> = {};

  for (const status of statuses) {
    counts[status] = await prisma.keyFigure.count({
      where: { status },
    });
  }

  return counts;
}

/**
 * Add a contributor to a milestone
 */
export async function addMilestoneContributor(
  milestoneId: string,
  keyFigureId: string,
  contributionType?: ContributionType
): Promise<MilestoneContributor> {
  if (!prisma) throw new Error('Database not available');

  return prisma.milestoneContributor.create({
    data: {
      milestoneId,
      keyFigureId,
      contributionType: contributionType ?? null,
    },
  });
}

/**
 * Remove a contributor from a milestone
 */
export async function removeMilestoneContributor(
  milestoneId: string,
  keyFigureId: string
): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  try {
    await prisma.milestoneContributor.delete({
      where: {
        milestoneId_keyFigureId: {
          milestoneId,
          keyFigureId,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get contributors for a milestone
 */
export async function getMilestoneContributors(milestoneId: string): Promise<Array<{
  keyFigure: KeyFigure;
  contributionType: string | null;
}>> {
  if (!prisma) throw new Error('Database not available');

  const contributions = await prisma.milestoneContributor.findMany({
    where: { milestoneId },
    include: {
      keyFigure: true,
    },
    orderBy: {
      keyFigure: {
        canonicalName: 'asc',
      },
    },
  });

  return contributions.map((c) => ({
    keyFigure: c.keyFigure,
    contributionType: c.contributionType,
  }));
}

/**
 * Generate common name variants for a name
 * Exposed for use in admin UI "Generate Variants" button
 */
export function getNameVariants(name: string): string[] {
  return generateVariants(name);
}

/**
 * Generate ID preview from a name
 * Exposed for use in admin UI ID preview
 */
export function getIdFromName(name: string): string {
  return normalizeName(name).id;
}

/**
 * Merge result including stats about what was changed
 */
export interface MergeResult {
  mergedFigure: KeyFigure;
  aliasesAdded: string[];
  contributorsReassigned: number;
  figuresDeleted: number;
}

/**
 * Merge multiple key figures into a primary record
 *
 * This operation:
 * 1. Combines aliases from all records into the primary
 * 2. Reassigns MilestoneContributor records from secondary to primary
 * 3. Deletes the secondary KeyFigure records
 *
 * @param primaryId - The key figure to keep
 * @param secondaryIds - The key figures to merge into primary, then delete
 * @returns The merged figure with stats
 */
export async function mergeKeyFigures(
  primaryId: string,
  secondaryIds: string[]
): Promise<MergeResult> {
  if (!prisma) throw new Error('Database not available');

  // Validate: cannot merge with self
  if (secondaryIds.includes(primaryId)) {
    throw new Error('Cannot merge a key figure with itself');
  }

  // Validate: need at least one secondary
  if (secondaryIds.length === 0) {
    throw new Error('Must provide at least one secondary key figure to merge');
  }

  // Fetch primary figure
  const primaryFigure = await prisma.keyFigure.findUnique({
    where: { id: primaryId },
  });
  if (!primaryFigure) {
    throw new Error(`Primary key figure "${primaryId}" not found`);
  }

  // Fetch all secondary figures
  const secondaryFigures = await prisma.keyFigure.findMany({
    where: { id: { in: secondaryIds } },
  });

  // Validate: all secondaries exist
  const foundIds = secondaryFigures.map((f) => f.id);
  const missingIds = secondaryIds.filter((id) => !foundIds.includes(id));
  if (missingIds.length > 0) {
    throw new Error(`Secondary key figures not found: ${missingIds.join(', ')}`);
  }

  // Collect all aliases from primary and secondaries
  const primaryAliases: string[] = JSON.parse(primaryFigure.aliases);
  const newAliases = new Set<string>(primaryAliases);
  const aliasesAdded: string[] = [];

  for (const secondary of secondaryFigures) {
    // Add secondary's canonical name as an alias (if not already present)
    const lowerCanonical = secondary.canonicalName.toLowerCase();
    const existingLower = Array.from(newAliases).map((a) => a.toLowerCase());
    if (
      lowerCanonical !== primaryFigure.canonicalName.toLowerCase() &&
      !existingLower.includes(lowerCanonical)
    ) {
      newAliases.add(secondary.canonicalName);
      aliasesAdded.push(secondary.canonicalName);
    }

    // Add secondary's aliases
    const secondaryAliases: string[] = JSON.parse(secondary.aliases);
    for (const alias of secondaryAliases) {
      const lowerAlias = alias.toLowerCase();
      if (!existingLower.includes(lowerAlias) && !aliasesAdded.map((a) => a.toLowerCase()).includes(lowerAlias)) {
        newAliases.add(alias);
        aliasesAdded.push(alias);
      }
    }
  }

  // Execute merge in a transaction
  let contributorsReassigned = 0;

  const mergedFigure = await prisma.$transaction(async (tx) => {
    // 1. Reassign MilestoneContributor records from secondaries to primary
    for (const secondaryId of secondaryIds) {
      // Get existing contributors for this secondary
      const existingContributions = await tx.milestoneContributor.findMany({
        where: { keyFigureId: secondaryId },
      });

      for (const contrib of existingContributions) {
        // Check if primary already has this milestone contribution
        const existingPrimary = await tx.milestoneContributor.findFirst({
          where: {
            milestoneId: contrib.milestoneId,
            keyFigureId: primaryId,
          },
        });

        if (existingPrimary) {
          // Primary already linked - just delete the secondary's contribution
          await tx.milestoneContributor.delete({
            where: { id: contrib.id },
          });
        } else {
          // Reassign to primary
          await tx.milestoneContributor.update({
            where: { id: contrib.id },
            data: { keyFigureId: primaryId },
          });
          contributorsReassigned++;
        }
      }
    }

    // 2. Update primary with combined aliases
    const updated = await tx.keyFigure.update({
      where: { id: primaryId },
      data: {
        aliases: JSON.stringify(Array.from(newAliases)),
      },
    });

    // 3. Delete secondary key figures
    await tx.keyFigure.deleteMany({
      where: { id: { in: secondaryIds } },
    });

    return updated;
  });

  return {
    mergedFigure,
    aliasesAdded,
    contributorsReassigned,
    figuresDeleted: secondaryIds.length,
  };
}

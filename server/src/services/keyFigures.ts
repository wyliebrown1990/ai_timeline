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

// =============================================================================
// AI Profile Generation
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';

/**
 * Generated profile fields from AI
 */
export interface GeneratedProfile {
  entityType: 'person' | 'organization';
  role: KeyFigureRole;
  shortBio: string;
  fullBio: string;
  notableFor: string;
  primaryOrg: string | null;
  previousOrgs: string[];
  wikipediaUrl: string | null;
  twitterHandle: string | null;
}

/**
 * Use Claude to generate profile fields for a key figure or organization
 */
export async function generateProfileWithAI(name: string): Promise<GeneratedProfile> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are an AI expert assistant that generates profile information for key figures and organizations in the AI/ML field. You have extensive knowledge of AI researchers, executives, founders, engineers, and organizations.

Your task is to generate accurate profile information based on your knowledge. If you don't have reliable information about someone, indicate that in your response rather than making up details.

IMPORTANT: First determine if the name refers to a PERSON or an ORGANIZATION (company, research lab, university, etc).`;

  const userPrompt = `Generate a profile for: "${name}"

First, determine if this is a PERSON or an ORGANIZATION.

Then provide the following fields in JSON format:

{
  "entityType": "person" or "organization",
  "role": one of ["researcher", "executive", "founder", "policy_maker", "engineer", "other"],
  "shortBio": "A concise 1-2 sentence biography (max 200 characters)",
  "fullBio": "A detailed 2-4 paragraph biography covering their background, career, and impact on AI",
  "notableFor": "Their key contribution or what they are most known for (max 300 characters)",
  "primaryOrg": "Current primary organization/company affiliation, or null if unknown",
  "previousOrgs": ["Array of previous notable organizations"],
  "wikipediaUrl": "Wikipedia URL if they have one, or null",
  "twitterHandle": "Twitter/X handle without @ symbol, or null"
}

For ORGANIZATIONS:
- role should be "other"
- shortBio should describe what the organization does
- fullBio should cover founding, mission, key products/research, and impact
- notableFor should be their main achievement or focus area
- primaryOrg should be null (they ARE the org)
- previousOrgs can include parent companies or acquisitions

Guidelines:
- Be accurate - only include information you're confident about
- For role: use "researcher" for academics/scientists, "executive" for C-level, "founder" for company founders, "engineer" for technical leaders
- If you're not sure about URLs or handles, set them to null
- Keep shortBio under 200 characters
- Keep notableFor under 300 characters

Return ONLY valid JSON, no markdown or explanation.`;

  console.log(`[KeyFigures] Generating AI profile for: ${name}`);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    console.log(`[KeyFigures] AI response length: ${text.length}`);

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and clean the response
    const profile: GeneratedProfile = {
      entityType: parsed.entityType === 'organization' ? 'organization' : 'person',
      role: validateRole(parsed.role),
      shortBio: String(parsed.shortBio || '').slice(0, 500),
      fullBio: String(parsed.fullBio || ''),
      notableFor: String(parsed.notableFor || '').slice(0, 500),
      primaryOrg: parsed.primaryOrg || null,
      previousOrgs: Array.isArray(parsed.previousOrgs) ? parsed.previousOrgs : [],
      wikipediaUrl: parsed.wikipediaUrl || null,
      twitterHandle: parsed.twitterHandle?.replace('@', '') || null,
    };

    console.log(`[KeyFigures] Generated profile for ${name}: entityType=${profile.entityType}, role=${profile.role}`);

    return profile;
  } catch (error) {
    console.error(`[KeyFigures] AI profile generation error:`, error);
    throw error;
  }
}

/**
 * Validate role is one of the allowed values
 */
function validateRole(role: unknown): KeyFigureRole {
  const validRoles: KeyFigureRole[] = ['researcher', 'executive', 'founder', 'policy_maker', 'engineer', 'other'];
  if (typeof role === 'string' && validRoles.includes(role as KeyFigureRole)) {
    return role as KeyFigureRole;
  }
  return 'other';
}

/**
 * Persons Service
 * Sprint KPC-1 - Key People & Companies
 *
 * Database operations for managing persons (evolved from KeyFigure).
 * Works alongside keyFigures.ts for backwards compatibility.
 */

import { prisma } from '../db';
import type { Person, Affiliation, Organization, Milestone } from '@prisma/client';

/**
 * Person role enum
 */
export type PersonRole = 'researcher' | 'executive' | 'founder' | 'policy_maker' | 'engineer' | 'other';

/**
 * Person status enum
 */
export type PersonStatus = 'draft' | 'pending_review' | 'published';

/**
 * Pagination options
 */
interface PaginationOptions {
  skip?: number;
  limit?: number;
}

/**
 * Create person DTO with structured biography fields
 */
export interface CreatePersonDto {
  canonicalName: string;
  aliases?: string[];
  shortBio: string;
  // Structured biography sections
  background?: string;
  careerHistory?: string;
  contributions?: string;
  philosophy?: string;
  currentlyDoing?: string;
  // Legacy fields
  fullBio?: string;
  primaryOrg?: string;
  previousOrgs?: string[];
  notableFor?: string;
  // Core fields
  role: PersonRole;
  focusAreas?: string[];
  currentOrgId?: string;
  currentRole?: string;
  // Links
  imageUrl?: string;
  wikipediaUrl?: string;
  linkedInUrl?: string;
  twitterHandle?: string;
  personalWebsite?: string;
  googleScholarUrl?: string;
  // Meta
  status?: PersonStatus;
}

/**
 * Update person DTO
 */
export interface UpdatePersonDto {
  canonicalName?: string;
  aliases?: string[];
  shortBio?: string;
  background?: string | null;
  careerHistory?: string | null;
  contributions?: string | null;
  philosophy?: string | null;
  currentlyDoing?: string | null;
  fullBio?: string | null;
  primaryOrg?: string | null;
  previousOrgs?: string[];
  notableFor?: string | null;
  role?: PersonRole;
  focusAreas?: string[];
  currentOrgId?: string | null;
  currentRole?: string | null;
  imageUrl?: string | null;
  wikipediaUrl?: string | null;
  linkedInUrl?: string | null;
  twitterHandle?: string | null;
  personalWebsite?: string | null;
  googleScholarUrl?: string | null;
  status?: PersonStatus;
}

/**
 * Generate slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Generate ID from name
 */
function generateId(name: string): string {
  return generateSlug(name);
}

/**
 * Get all persons with optional filtering and pagination
 */
export async function getAll(options?: PaginationOptions & {
  status?: PersonStatus;
  role?: PersonRole;
  focusArea?: string;
  orgId?: string;
  search?: string;
  sort?: 'name' | 'recentActivity' | 'milestoneCount';
}): Promise<{ persons: Person[]; total: number }> {
  if (!prisma) throw new Error('Database not available');

  const where: Record<string, unknown> = {};

  if (options?.status) {
    where.status = options.status;
  } else {
    where.status = 'published';
  }

  if (options?.role) {
    where.role = options.role;
  }

  if (options?.focusArea) {
    where.focusAreas = { contains: options.focusArea };
  }

  if (options?.orgId) {
    where.currentOrgId = options.orgId;
  }

  if (options?.search) {
    where.OR = [
      { canonicalName: { contains: options.search, mode: 'insensitive' } },
      { aliases: { contains: options.search } },
      { shortBio: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const orderBy: Record<string, string> = {};
  switch (options?.sort) {
    case 'recentActivity':
      orderBy.updatedAt = 'desc';
      break;
    case 'name':
    default:
      orderBy.canonicalName = 'asc';
  }

  const [persons, total] = await Promise.all([
    prisma.person.findMany({
      where,
      skip: options?.skip ?? 0,
      take: options?.limit ?? 50,
      orderBy,
      include: {
        currentOrg: true,
      },
    }),
    prisma.person.count({ where }),
  ]);

  return { persons, total };
}

/**
 * Get a single person by ID
 */
export async function getById(id: string): Promise<Person | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.person.findUnique({
    where: { id },
    include: {
      currentOrg: true,
    },
  });
}

/**
 * Get a single person by slug
 */
export async function getBySlug(slug: string): Promise<Person | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.person.findUnique({
    where: { slug },
    include: {
      currentOrg: true,
    },
  });
}

/**
 * Get person with all related data (affiliations, milestones, news mentions)
 */
export async function getBySlugWithRelations(slug: string): Promise<{
  person: Person & { currentOrg: Organization | null };
  affiliations: Array<Affiliation & { organization: Organization }>;
  milestones: Array<{
    id: string;
    title: string;
    date: Date;
    category: string;
    contributionType: string | null;
  }>;
  newsEvents: Array<{
    id: string;
    title: string;
    date: Date;
    mentionType: string;
  }>;
} | null> {
  if (!prisma) throw new Error('Database not available');

  const person = await prisma.person.findUnique({
    where: { slug },
    include: {
      currentOrg: true,
    },
  });

  if (!person) return null;

  // Get affiliations (career history)
  const affiliations = await prisma.affiliation.findMany({
    where: { personId: person.id },
    include: {
      organization: true,
    },
    orderBy: [
      { isCurrent: 'desc' },
      { endDate: 'desc' },
      { startDate: 'desc' },
    ],
  });

  // Get milestones this person contributed to
  const milestoneContributions = await prisma.milestoneContributor.findMany({
    where: { personId: person.id },
    include: {
      milestone: {
        select: {
          id: true,
          title: true,
          date: true,
          category: true,
        },
      },
    },
    orderBy: {
      milestone: {
        date: 'desc',
      },
    },
    take: 20,
  });

  const milestones = milestoneContributions.map((mc) => ({
    ...mc.milestone,
    contributionType: mc.contributionType,
  }));

  // Get news events mentioning this person
  const newsEventMentions = await prisma.newsEventPersonMention.findMany({
    where: { personId: person.id },
    include: {
      event: {
        select: {
          id: true,
          headline: true,
          publishedDate: true,
        },
      },
    },
    orderBy: {
      event: {
        publishedDate: 'desc',
      },
    },
    take: 20,
  });

  const newsEvents = newsEventMentions.map((nem) => ({
    id: nem.event.id,
    title: nem.event.headline, // Map headline to title for API consistency
    date: nem.event.publishedDate,
    mentionType: nem.mentionType,
  }));

  return {
    person,
    affiliations,
    milestones,
    newsEvents,
  };
}

/**
 * Create a new person
 */
export async function create(data: CreatePersonDto): Promise<Person> {
  if (!prisma) throw new Error('Database not available');

  const id = generateId(data.canonicalName);
  const slug = generateSlug(data.canonicalName);

  return prisma.person.create({
    data: {
      id,
      canonicalName: data.canonicalName,
      slug,
      aliases: JSON.stringify(data.aliases ?? []),
      shortBio: data.shortBio,
      background: data.background ?? null,
      careerHistory: data.careerHistory ?? null,
      contributions: data.contributions ?? null,
      philosophy: data.philosophy ?? null,
      currentlyDoing: data.currentlyDoing ?? null,
      currentlyDoingUpdatedAt: data.currentlyDoing ? new Date() : null,
      fullBio: data.fullBio ?? null,
      primaryOrg: data.primaryOrg ?? null,
      previousOrgs: JSON.stringify(data.previousOrgs ?? []),
      notableFor: data.notableFor ?? null,
      role: data.role,
      focusAreas: JSON.stringify(data.focusAreas ?? []),
      currentOrgId: data.currentOrgId ?? null,
      currentRole: data.currentRole ?? null,
      imageUrl: data.imageUrl ?? null,
      wikipediaUrl: data.wikipediaUrl ?? null,
      linkedInUrl: data.linkedInUrl ?? null,
      twitterHandle: data.twitterHandle ?? null,
      personalWebsite: data.personalWebsite ?? null,
      googleScholarUrl: data.googleScholarUrl ?? null,
      status: data.status ?? 'published',
    },
    include: {
      currentOrg: true,
    },
  });
}

/**
 * Update an existing person
 */
export async function update(id: string, data: UpdatePersonDto): Promise<Person | null> {
  if (!prisma) throw new Error('Database not available');

  const updateData: Record<string, unknown> = {};

  if (data.canonicalName !== undefined) {
    updateData.canonicalName = data.canonicalName;
    updateData.slug = generateSlug(data.canonicalName);
  }
  if (data.aliases !== undefined) updateData.aliases = JSON.stringify(data.aliases);
  if (data.shortBio !== undefined) updateData.shortBio = data.shortBio;
  if (data.background !== undefined) updateData.background = data.background;
  if (data.careerHistory !== undefined) updateData.careerHistory = data.careerHistory;
  if (data.contributions !== undefined) updateData.contributions = data.contributions;
  if (data.philosophy !== undefined) updateData.philosophy = data.philosophy;
  if (data.currentlyDoing !== undefined) {
    updateData.currentlyDoing = data.currentlyDoing;
    updateData.currentlyDoingUpdatedAt = data.currentlyDoing ? new Date() : null;
  }
  if (data.fullBio !== undefined) updateData.fullBio = data.fullBio;
  if (data.primaryOrg !== undefined) updateData.primaryOrg = data.primaryOrg;
  if (data.previousOrgs !== undefined) updateData.previousOrgs = JSON.stringify(data.previousOrgs);
  if (data.notableFor !== undefined) updateData.notableFor = data.notableFor;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.focusAreas !== undefined) updateData.focusAreas = JSON.stringify(data.focusAreas);
  if (data.currentOrgId !== undefined) updateData.currentOrgId = data.currentOrgId;
  if (data.currentRole !== undefined) updateData.currentRole = data.currentRole;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.wikipediaUrl !== undefined) updateData.wikipediaUrl = data.wikipediaUrl;
  if (data.linkedInUrl !== undefined) updateData.linkedInUrl = data.linkedInUrl;
  if (data.twitterHandle !== undefined) updateData.twitterHandle = data.twitterHandle;
  if (data.personalWebsite !== undefined) updateData.personalWebsite = data.personalWebsite;
  if (data.googleScholarUrl !== undefined) updateData.googleScholarUrl = data.googleScholarUrl;
  if (data.status !== undefined) updateData.status = data.status;

  try {
    return await prisma.person.update({
      where: { id },
      data: updateData,
      include: {
        currentOrg: true,
      },
    });
  } catch {
    return null;
  }
}

/**
 * Delete a person by ID
 */
export async function remove(id: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  try {
    await prisma.person.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Search persons by query string
 */
export async function search(query: string, limit = 20): Promise<Person[]> {
  if (!prisma) throw new Error('Database not available');

  return prisma.person.findMany({
    where: {
      status: 'published',
      OR: [
        { canonicalName: { contains: query, mode: 'insensitive' } },
        { aliases: { contains: query } },
        { shortBio: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { canonicalName: 'asc' },
    include: {
      currentOrg: true,
    },
  });
}

/**
 * Check if a person slug already exists
 */
export async function slugExists(slug: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  const existing = await prisma.person.findUnique({
    where: { slug },
    select: { id: true },
  });

  return existing !== null;
}

/**
 * Get count of persons
 */
export async function getCount(status?: string): Promise<number> {
  if (!prisma) throw new Error('Database not available');

  const where = status ? { status } : { status: 'published' };
  return prisma.person.count({ where });
}

/**
 * Get count by role
 */
export async function getCountByRole(): Promise<Record<string, number>> {
  if (!prisma) throw new Error('Database not available');

  const roles: PersonRole[] = ['researcher', 'executive', 'founder', 'policy_maker', 'engineer', 'other'];
  const counts: Record<string, number> = {};

  for (const role of roles) {
    counts[role] = await prisma.person.count({
      where: { role, status: 'published' },
    });
  }

  return counts;
}

/**
 * Get all unique focus areas across persons
 */
export async function getAllFocusAreas(): Promise<string[]> {
  if (!prisma) throw new Error('Database not available');

  const persons = await prisma.person.findMany({
    where: { status: 'published' },
    select: { focusAreas: true },
  });

  const focusAreasSet = new Set<string>();
  for (const person of persons) {
    try {
      const areas = JSON.parse(person.focusAreas) as string[];
      for (const area of areas) {
        focusAreasSet.add(area);
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return Array.from(focusAreasSet).sort();
}

/**
 * Update the "currently doing" field for a person
 */
export async function updateCurrentlyDoing(
  personId: string,
  currentlyDoing: string
): Promise<Person | null> {
  if (!prisma) throw new Error('Database not available');

  try {
    return await prisma.person.update({
      where: { id: personId },
      data: {
        currentlyDoing,
        currentlyDoingUpdatedAt: new Date(),
      },
    });
  } catch {
    return null;
  }
}

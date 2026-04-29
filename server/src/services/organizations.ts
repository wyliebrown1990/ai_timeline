import { prisma } from '../db';
import type { Organization, OrgType } from '@prisma/client';

/**
 * Organization service
 * Sprint KPC-1 - Key People & Companies
 */

/**
 * Pagination options for list queries
 */
interface PaginationOptions {
  skip?: number;
  limit?: number;
}

/**
 * Create organization DTO
 */
export interface CreateOrganizationDto {
  name: string;
  type: OrgType;
  shortDescription: string;
  mission?: string;
  history?: string;
  currentFocus?: string;
  focusAreas?: string[];
  products?: string[];
  logoUrl?: string;
  websiteUrl?: string;
  wikipediaUrl?: string;
  linkedInUrl?: string;
  foundedYear?: number;
  headquarters?: string;
  status?: string;
}

/**
 * Update organization DTO
 */
export interface UpdateOrganizationDto {
  name?: string;
  type?: OrgType;
  shortDescription?: string;
  mission?: string | null;
  history?: string | null;
  currentFocus?: string | null;
  focusAreas?: string[];
  products?: string[];
  logoUrl?: string | null;
  websiteUrl?: string | null;
  wikipediaUrl?: string | null;
  linkedInUrl?: string | null;
  foundedYear?: number | null;
  headquarters?: string | null;
  status?: string;
}

/**
 * Generate slug from organization name
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
 * Generate unique ID for organization
 */
function generateId(name: string): string {
  const slug = generateSlug(name);
  return `org-${slug}`;
}

/**
 * Get all organizations with optional filtering and pagination
 */
export async function getAll(options?: PaginationOptions & {
  type?: OrgType;
  focusArea?: string;
  search?: string;
  status?: string;
  sort?: 'name' | 'foundedYear' | 'personCount' | 'milestoneCount';
}): Promise<{ organizations: Organization[]; total: number }> {
  if (!prisma) throw new Error('Database not available');

  const where: Record<string, unknown> = {};

  if (options?.type) {
    where.type = options.type;
  }

  if (options?.status) {
    where.status = options.status;
  } else {
    // Default to published only
    where.status = 'published';
  }

  if (options?.focusArea) {
    // focusAreas is stored as JSON string array
    where.focusAreas = { contains: options.focusArea };
  }

  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { shortDescription: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const orderBy: Record<string, string> = {};
  switch (options?.sort) {
    case 'foundedYear':
      orderBy.foundedYear = 'desc';
      break;
    case 'name':
    default:
      orderBy.name = 'asc';
  }

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip: options?.skip ?? 0,
      take: options?.limit ?? 50,
      orderBy,
    }),
    prisma.organization.count({ where }),
  ]);

  return { organizations, total };
}

/**
 * Get a single organization by ID
 */
export async function getById(id: string): Promise<Organization | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.organization.findUnique({
    where: { id },
  });
}

/**
 * Get a single organization by slug
 */
export async function getBySlug(slug: string): Promise<Organization | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.organization.findUnique({
    where: { slug },
  });
}

/**
 * Get organization with related data (people, milestones, news events)
 */
export async function getBySlugWithRelations(slug: string): Promise<{
  organization: Organization;
  people: Array<{
    id: string;
    canonicalName: string;
    slug: string;
    role: string;
    currentRole: string | null;
    imageUrl: string | null;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    date: Date;
    category: string;
  }>;
  newsEvents: Array<{
    id: string;
    title: string;
    date: Date;
    mentionType: string;
    isPaywalled: boolean;
    paywallReason: string | null;
  }>;
} | null> {
  if (!prisma) throw new Error('Database not available');

  const organization = await prisma.organization.findUnique({
    where: { slug },
  });

  if (!organization) return null;

  // Get people currently at this org
  const people = await prisma.person.findMany({
    where: { currentOrgId: organization.id, status: 'published' },
    select: {
      id: true,
      canonicalName: true,
      slug: true,
      role: true,
      currentRole: true,
      imageUrl: true,
    },
    orderBy: { canonicalName: 'asc' },
  });

  // Get milestones linked to this org
  const milestones = await prisma.milestone.findMany({
    where: { organizationId: organization.id },
    select: {
      id: true,
      title: true,
      date: true,
      category: true,
    },
    orderBy: { date: 'desc' },
    take: 20,
  });

  // Get news events mentioning this org (Sprint PD-1 — mirrors persons.ts)
  const newsEventMentions = await prisma.newsEventOrgMention.findMany({
    where: { organizationId: organization.id },
    include: {
      event: {
        select: {
          id: true,
          headline: true,
          publishedDate: true,
          isPaywalled: true,
          paywallReason: true,
        },
      },
    },
    orderBy: { event: { publishedDate: 'desc' } },
    take: 20,
  });

  const newsEvents = newsEventMentions.map((nem) => ({
    id: nem.event.id,
    title: nem.event.headline,
    date: nem.event.publishedDate,
    mentionType: nem.mentionType,
    isPaywalled: nem.event.isPaywalled,
    paywallReason: nem.event.paywallReason,
  }));

  return { organization, people, milestones, newsEvents };
}

/**
 * Create a new organization
 */
export async function create(data: CreateOrganizationDto): Promise<Organization> {
  if (!prisma) throw new Error('Database not available');

  const id = generateId(data.name);
  const slug = generateSlug(data.name);

  return prisma.organization.create({
    data: {
      id,
      name: data.name,
      slug,
      type: data.type,
      shortDescription: data.shortDescription,
      mission: data.mission ?? null,
      history: data.history ?? null,
      currentFocus: data.currentFocus ?? null,
      focusAreas: JSON.stringify(data.focusAreas ?? []),
      products: JSON.stringify(data.products ?? []),
      logoUrl: data.logoUrl ?? null,
      websiteUrl: data.websiteUrl ?? null,
      wikipediaUrl: data.wikipediaUrl ?? null,
      linkedInUrl: data.linkedInUrl ?? null,
      foundedYear: data.foundedYear ?? null,
      headquarters: data.headquarters ?? null,
      status: data.status ?? 'published',
    },
  });
}

/**
 * Update an existing organization
 */
export async function update(id: string, data: UpdateOrganizationDto): Promise<Organization | null> {
  if (!prisma) throw new Error('Database not available');

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = generateSlug(data.name);
  }
  if (data.type !== undefined) updateData.type = data.type;
  if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
  if (data.mission !== undefined) updateData.mission = data.mission;
  if (data.history !== undefined) updateData.history = data.history;
  if (data.currentFocus !== undefined) {
    updateData.currentFocus = data.currentFocus;
    updateData.currentFocusUpdatedAt = new Date();
  }
  if (data.focusAreas !== undefined) updateData.focusAreas = JSON.stringify(data.focusAreas);
  if (data.products !== undefined) updateData.products = JSON.stringify(data.products);
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
  if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
  if (data.wikipediaUrl !== undefined) updateData.wikipediaUrl = data.wikipediaUrl;
  if (data.linkedInUrl !== undefined) updateData.linkedInUrl = data.linkedInUrl;
  if (data.foundedYear !== undefined) updateData.foundedYear = data.foundedYear;
  if (data.headquarters !== undefined) updateData.headquarters = data.headquarters;
  if (data.status !== undefined) updateData.status = data.status;

  try {
    return await prisma.organization.update({
      where: { id },
      data: updateData,
    });
  } catch {
    return null;
  }
}

/**
 * Delete an organization by ID
 */
export async function remove(id: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  try {
    await prisma.organization.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an organization name already exists
 */
export async function nameExists(name: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  const existing = await prisma.organization.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });

  return existing !== null;
}

/**
 * Get organizations by type
 */
export async function getByType(type: OrgType): Promise<Organization[]> {
  if (!prisma) throw new Error('Database not available');

  return prisma.organization.findMany({
    where: { type, status: 'published' },
    orderBy: { name: 'asc' },
  });
}

/**
 * Search organizations by query string
 */
export async function search(query: string, limit = 20): Promise<Organization[]> {
  if (!prisma) throw new Error('Database not available');

  return prisma.organization.findMany({
    where: {
      status: 'published',
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { shortDescription: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { name: 'asc' },
  });
}

/**
 * Get count of organizations
 */
export async function getCount(status?: string): Promise<number> {
  if (!prisma) throw new Error('Database not available');

  const where = status ? { status } : { status: 'published' };
  return prisma.organization.count({ where });
}

/**
 * Get count by type
 */
export async function getCountByType(): Promise<Record<string, number>> {
  if (!prisma) throw new Error('Database not available');

  const types: OrgType[] = ['company', 'research_lab', 'university', 'nonprofit', 'government'];
  const counts: Record<string, number> = {};

  for (const type of types) {
    counts[type] = await prisma.organization.count({
      where: { type, status: 'published' },
    });
  }

  return counts;
}

/**
 * Get all unique focus areas across organizations
 */
export async function getAllFocusAreas(): Promise<string[]> {
  if (!prisma) throw new Error('Database not available');

  const organizations = await prisma.organization.findMany({
    where: { status: 'published' },
    select: { focusAreas: true },
  });

  const focusAreasSet = new Set<string>();
  for (const org of organizations) {
    try {
      const areas = JSON.parse(org.focusAreas) as string[];
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
 * Organization key concept linked via GlossaryTermOrganization (Sprint SEO-3)
 */
export interface OrganizationKeyConcept {
  id: string;
  glossaryTermId: string;
  contributionNote: string | null;
  glossaryTerm: {
    id: string;
    term: string;
    slug: string | null;
    shortDefinition: string;
    category: string;
  };
}

/**
 * Get glossary terms linked to an organization via GlossaryTermOrganization (Sprint SEO-3)
 */
export async function getKeyConcepts(organizationId: string): Promise<OrganizationKeyConcept[]> {
  if (!prisma) throw new Error('Database not available');

  const links = await prisma.glossaryTermOrganization.findMany({
    where: { organizationId },
    include: {
      glossaryTerm: {
        select: {
          id: true,
          term: true,
          slug: true,
          shortDefinition: true,
          category: true,
        },
      },
    },
  });

  return links.map((link) => ({
    id: link.id,
    glossaryTermId: link.glossaryTermId,
    contributionNote: link.contributionNote,
    glossaryTerm: link.glossaryTerm,
  }));
}

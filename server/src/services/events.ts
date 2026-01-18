/**
 * Events Service
 * Sprint SEO-4 Task 4 - Milestone Event Pages
 *
 * Provides enriched milestone data for event pages.
 */

import { prisma } from '../db';

/**
 * Person contributor for event page
 */
export interface EventContributor {
  id: string;
  canonicalName: string;
  slug: string;
  shortBio: string;
  role: string;
  imageUrl: string | null;
  contributionType: string | null;
}

/**
 * Related milestone for event page
 */
export interface RelatedMilestone {
  id: string;
  title: string;
  date: Date;
  category: string;
  significance: number;
  tldr: string | null;
  relation: 'before' | 'after' | 'related';
}

/**
 * Linked glossary term for event page
 */
export interface EventGlossaryTerm {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  relevanceNote: string | null;
}

/**
 * Organization for event page
 */
export interface EventOrganization {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  logoUrl: string | null;
}

/**
 * Full event page data
 */
export interface EventPageData {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: string;
  significance: number;
  era: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  tags: string[];

  // Layered content
  tldr: string | null;
  simpleExplanation: string | null;
  businessImpact: string | null;
  technicalDepth: string | null;
  historicalContext: string | null;
  whyItMattersToday: string | null;
  commonMisconceptions: string | null;

  // Enriched relations
  organization: EventOrganization | null;
  contributors: EventContributor[];
  linkedTerms: EventGlossaryTerm[];
  relatedMilestones: RelatedMilestone[];

  // Stats for display
  stats: {
    contributorCount: number;
    linkedTermCount: number;
    relatedMilestoneCount: number;
  };

  // SEO
  canonicalUrl?: string;
}

/**
 * Event list item for hub page
 */
export interface EventListItem {
  id: string;
  title: string;
  date: Date;
  category: string;
  significance: number;
  tldr: string | null;
  organization: string | null;
}

/**
 * Get enriched event page data for a milestone
 */
export async function getEventPageData(id: string): Promise<EventPageData | null> {
  // Get milestone with all relations
  const milestone = await prisma.milestone.findUnique({
    where: { id },
    include: {
      organizationRef: true,
      keyFigures: {
        include: {
          person: {
            select: {
              id: true,
              canonicalName: true,
              slug: true,
              shortBio: true,
              role: true,
              imageUrl: true,
            },
          },
        },
      },
      glossaryTermLinks: {
        include: {
          glossaryTerm: {
            select: {
              id: true,
              term: true,
              slug: true,
              shortDefinition: true,
            },
          },
        },
      },
    },
  });

  if (!milestone) {
    return null;
  }

  // Parse tags JSON
  let tags: string[] = [];
  try {
    tags = JSON.parse(milestone.tags || '[]');
  } catch {
    tags = [];
  }

  // Get related milestones (same category or similar significance, before and after)
  const [beforeMilestones, afterMilestones, relatedByCategory] = await Promise.all([
    // Milestones before this one
    prisma.milestone.findMany({
      where: {
        date: { lt: milestone.date },
        id: { not: milestone.id },
      },
      orderBy: { date: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        date: true,
        category: true,
        significance: true,
        tldr: true,
      },
    }),
    // Milestones after this one
    prisma.milestone.findMany({
      where: {
        date: { gt: milestone.date },
        id: { not: milestone.id },
      },
      orderBy: { date: 'asc' },
      take: 3,
      select: {
        id: true,
        title: true,
        date: true,
        category: true,
        significance: true,
        tldr: true,
      },
    }),
    // Related by category (excluding already fetched)
    prisma.milestone.findMany({
      where: {
        category: milestone.category,
        id: { not: milestone.id },
      },
      orderBy: { significance: 'desc' },
      take: 4,
      select: {
        id: true,
        title: true,
        date: true,
        category: true,
        significance: true,
        tldr: true,
      },
    }),
  ]);

  // Build related milestones list
  const seenIds = new Set<string>();
  const relatedMilestones: RelatedMilestone[] = [];

  // Add before milestones
  for (const m of beforeMilestones) {
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id);
      relatedMilestones.push({ ...m, relation: 'before' });
    }
  }

  // Add after milestones
  for (const m of afterMilestones) {
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id);
      relatedMilestones.push({ ...m, relation: 'after' });
    }
  }

  // Add related by category (up to total of 8)
  for (const m of relatedByCategory) {
    if (!seenIds.has(m.id) && relatedMilestones.length < 8) {
      seenIds.add(m.id);
      relatedMilestones.push({ ...m, relation: 'related' });
    }
  }

  // Build contributors list from persons
  const contributors: EventContributor[] = milestone.keyFigures
    .filter((kf) => kf.person)
    .map((kf) => ({
      id: kf.person!.id,
      canonicalName: kf.person!.canonicalName,
      slug: kf.person!.slug,
      shortBio: kf.person!.shortBio,
      role: kf.person!.role,
      imageUrl: kf.person!.imageUrl,
      contributionType: kf.contributionType,
    }));

  // Build linked terms list
  const linkedTerms: EventGlossaryTerm[] = milestone.glossaryTermLinks.map((link) => ({
    id: link.glossaryTerm.id,
    term: link.glossaryTerm.term,
    slug: link.glossaryTerm.slug,
    shortDefinition: link.glossaryTerm.shortDefinition,
    relevanceNote: link.relevanceNote,
  }));

  // Build organization
  const organization: EventOrganization | null = milestone.organizationRef
    ? {
        id: milestone.organizationRef.id,
        name: milestone.organizationRef.name,
        slug: milestone.organizationRef.slug,
        shortDescription: milestone.organizationRef.shortDescription,
        logoUrl: milestone.organizationRef.logoUrl,
      }
    : null;

  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    date: milestone.date,
    category: milestone.category,
    significance: milestone.significance,
    era: milestone.era,
    sourceUrl: milestone.sourceUrl,
    imageUrl: milestone.imageUrl,
    tags,
    tldr: milestone.tldr,
    simpleExplanation: milestone.simpleExplanation,
    businessImpact: milestone.businessImpact,
    technicalDepth: milestone.technicalDepth,
    historicalContext: milestone.historicalContext,
    whyItMattersToday: milestone.whyItMattersToday,
    commonMisconceptions: milestone.commonMisconceptions,
    organization,
    contributors,
    linkedTerms,
    relatedMilestones,
    stats: {
      contributorCount: contributors.length,
      linkedTermCount: linkedTerms.length,
      relatedMilestoneCount: relatedMilestones.length,
    },
  };
}

/**
 * Get list of all events for hub page and sitemap
 */
export async function getEventList(limit: number = 100): Promise<EventListItem[]> {
  const milestones = await prisma.milestone.findMany({
    orderBy: { date: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      date: true,
      category: true,
      significance: true,
      tldr: true,
      organization: true,
    },
  });

  return milestones.map((m) => ({
    id: m.id,
    title: m.title,
    date: m.date,
    category: m.category,
    significance: m.significance,
    tldr: m.tldr,
    organization: m.organization,
  }));
}

/**
 * Get count of all events
 */
export async function getEventCount(): Promise<number> {
  return prisma.milestone.count();
}

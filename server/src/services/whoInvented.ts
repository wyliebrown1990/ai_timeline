/**
 * Who Invented Service
 * Sprint SEO-4 Task 5 - "Who Invented X?" Pages
 *
 * Provides data about the inventors/creators of AI concepts.
 */

import { prisma } from '../db';

/**
 * Person who contributed to a concept
 */
export interface WhoInventedPerson {
  id: string;
  canonicalName: string;
  slug: string;
  shortBio: string;
  role: string;
  imageUrl: string | null;
  contributionNote: string | null;
  currentOrg: string | null;
  currentRole: string | null;
}

/**
 * Related milestone for the concept
 */
export interface WhoInventedMilestone {
  id: string;
  title: string;
  date: Date;
  category: string;
  significance: number;
  tldr: string | null;
  organization: string | null;
}

/**
 * Related organization
 */
export interface WhoInventedOrganization {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  logoUrl: string | null;
  contributionNote: string | null;
}

/**
 * Full who-invented page data
 */
export interface WhoInventedPageData {
  // Concept info
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  fullDefinition: string;
  category: string;
  difficulty: number;

  // Invention story
  quickAnswer: string | null; // Brief answer for featured snippet

  // Key people (inventors, pioneers, contributors)
  inventors: WhoInventedPerson[]; // Those with "Invented" or "Created" contribution
  pioneers: WhoInventedPerson[]; // Those with "Pioneered" contribution
  contributors: WhoInventedPerson[]; // Other contributors

  // Organizations involved
  organizations: WhoInventedOrganization[];

  // Timeline of development
  milestones: WhoInventedMilestone[];

  // Related terms
  relatedTerms: Array<{
    id: string;
    term: string;
    slug: string | null;
    shortDefinition: string;
  }>;

  // Stats
  stats: {
    inventorCount: number;
    pioneerCount: number;
    contributorCount: number;
    organizationCount: number;
    milestoneCount: number;
  };

  // SEO
  canonicalUrl?: string;

  // Timestamps (Sprint SEO-5: E-E-A-T freshness signals)
  createdAt: string;
  updatedAt: string;
}

/**
 * Who-invented list item for hub page
 */
export interface WhoInventedListItem {
  slug: string;
  term: string;
  shortDefinition: string;
  inventorCount: number;
  hasInventors: boolean;
}

/**
 * Get who-invented page data for a glossary term
 */
export async function getWhoInventedPageData(slug: string): Promise<WhoInventedPageData | null> {
  // Get glossary term with all relations
  const term = await prisma.glossaryTerm.findFirst({
    where: { slug },
    include: {
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
              currentRole: true,
              currentOrgId: true,
            },
          },
        },
      },
      organizationLinks: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              shortDescription: true,
              logoUrl: true,
            },
          },
        },
      },
      milestoneLinks: {
        include: {
          milestone: {
            select: {
              id: true,
              title: true,
              date: true,
              category: true,
              significance: true,
              tldr: true,
              organization: true,
            },
          },
        },
        orderBy: {
          milestone: {
            date: 'asc',
          },
        },
      },
    },
  });

  if (!term) {
    return null;
  }

  // Parse related term IDs
  let relatedTermIds: string[] = [];
  try {
    relatedTermIds = JSON.parse(term.relatedTermIds || '[]');
  } catch {
    relatedTermIds = [];
  }

  // Fetch related terms
  const relatedTerms = relatedTermIds.length > 0
    ? await prisma.glossaryTerm.findMany({
        where: { id: { in: relatedTermIds } },
        select: {
          id: true,
          term: true,
          slug: true,
          shortDefinition: true,
        },
        take: 10,
      })
    : [];

  // Categorize people by contribution type
  const inventors: WhoInventedPerson[] = [];
  const pioneers: WhoInventedPerson[] = [];
  const contributors: WhoInventedPerson[] = [];

  for (const kf of term.keyFigures) {
    if (!kf.person) continue;

    const person: WhoInventedPerson = {
      id: kf.person.id,
      canonicalName: kf.person.canonicalName,
      slug: kf.person.slug,
      shortBio: kf.person.shortBio,
      role: kf.person.role,
      imageUrl: kf.person.imageUrl,
      contributionNote: kf.contributionNote,
      currentOrg: kf.person.currentOrgId,
      currentRole: kf.person.currentRole,
    };

    const note = (kf.contributionNote || '').toLowerCase();
    if (note.includes('invent') || note.includes('creat') || note.includes('develop')) {
      inventors.push(person);
    } else if (note.includes('pioneer') || note.includes('introduc') || note.includes('propos')) {
      pioneers.push(person);
    } else {
      contributors.push(person);
    }
  }

  // Build organizations list
  const organizations: WhoInventedOrganization[] = term.organizationLinks.map((link) => ({
    id: link.organization.id,
    name: link.organization.name,
    slug: link.organization.slug,
    shortDescription: link.organization.shortDescription,
    logoUrl: link.organization.logoUrl,
    contributionNote: link.contributionNote,
  }));

  // Build milestones list
  const milestones: WhoInventedMilestone[] = term.milestoneLinks.map((link) => ({
    id: link.milestone.id,
    title: link.milestone.title,
    date: link.milestone.date,
    category: link.milestone.category,
    significance: link.milestone.significance,
    tldr: link.milestone.tldr,
    organization: link.milestone.organization,
  }));

  // Use AI-generated who-invented quick answer if available, then fall back to general quickAnswer, then generate
  const termWithSeoContent = term as typeof term & { whoInventedQuickAnswer?: string | null };
  const quickAnswer = termWithSeoContent.whoInventedQuickAnswer ||
    term.quickAnswer ||
    generateQuickAnswer(term.term, inventors, pioneers, milestones);

  return {
    id: term.id,
    term: term.term,
    slug: term.slug,
    shortDefinition: term.shortDefinition,
    fullDefinition: term.fullDefinition,
    category: term.category,
    difficulty: term.difficulty,
    quickAnswer,
    inventors,
    pioneers,
    contributors,
    organizations,
    milestones,
    relatedTerms,
    stats: {
      inventorCount: inventors.length,
      pioneerCount: pioneers.length,
      contributorCount: contributors.length,
      organizationCount: organizations.length,
      milestoneCount: milestones.length,
    },
    // Sprint SEO-5: E-E-A-T freshness signals
    createdAt: term.createdAt.toISOString(),
    updatedAt: term.updatedAt.toISOString(),
  };
}

/**
 * Generate a quick answer for the who-invented question
 */
function generateQuickAnswer(
  term: string,
  inventors: WhoInventedPerson[],
  pioneers: WhoInventedPerson[],
  milestones: WhoInventedMilestone[]
): string {
  const people = [...inventors, ...pioneers];

  if (people.length === 0) {
    return `The origins of ${term} involve contributions from multiple researchers and organizations in the AI field.`;
  }

  const names = people.slice(0, 3).map((p) => p.canonicalName);
  const nameStr = names.length === 1
    ? names[0]
    : names.length === 2
    ? `${names[0]} and ${names[1]}`
    : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;

  const year = milestones.length > 0
    ? new Date(milestones[0].date).getFullYear()
    : null;

  const yearStr = year ? ` in ${year}` : '';

  if (inventors.length > 0) {
    return `${term} was invented by ${nameStr}${yearStr}. ${inventors[0].contributionNote || ''}`.trim();
  }

  return `${term} was pioneered by ${nameStr}${yearStr}. Their work laid the foundation for this important AI concept.`;
}

/**
 * Get list of all who-invented pages for hub page and sitemap
 */
export async function getWhoInventedList(): Promise<WhoInventedListItem[]> {
  // Get all glossary terms that have slugs and linked persons
  const terms = await prisma.glossaryTerm.findMany({
    where: {
      slug: { not: null },
    },
    select: {
      slug: true,
      term: true,
      shortDefinition: true,
      keyFigures: {
        select: {
          contributionNote: true,
        },
      },
    },
    orderBy: { term: 'asc' },
  });

  return terms
    .filter((t) => t.slug) // Ensure slug exists
    .map((t) => {
      const inventorCount = t.keyFigures.filter((kf) => {
        const note = (kf.contributionNote || '').toLowerCase();
        return note.includes('invent') || note.includes('creat') || note.includes('pioneer');
      }).length;

      return {
        slug: t.slug!,
        term: t.term,
        shortDefinition: t.shortDefinition,
        inventorCount,
        hasInventors: inventorCount > 0 || t.keyFigures.length > 0,
      };
    });
}

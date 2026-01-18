/**
 * Comparison Service
 * Sprint SEO-4 Task 1 - Comparison Pages Infrastructure
 *
 * Provides comparison data for programmatic SEO pages comparing
 * organizations, persons, or glossary terms.
 */

import { prisma } from '../db';

/**
 * Entity types that can be compared
 */
export type ComparisonEntityType = 'organization' | 'person' | 'term';

/**
 * Organization comparison data
 */
export interface OrganizationComparisonData {
  id: string;
  name: string;
  slug: string;
  type: string;
  shortDescription: string;
  mission: string | null;
  foundedYear: number | null;
  headquarters: string | null;
  focusAreas: string[];
  products: string[];
  logoUrl: string | null;
  websiteUrl: string | null;
  wikipediaUrl: string | null;
  linkedInUrl: string | null;
  employeeCount: number;
  milestoneCount: number;
  notablePeople: {
    id: string;
    name: string;
    slug: string;
    role: string | null;
    imageUrl: string | null;
  }[];
}

/**
 * Person comparison data
 */
export interface PersonComparisonData {
  id: string;
  canonicalName: string;
  slug: string;
  shortBio: string;
  role: string;
  currentRole: string | null;
  currentOrg: {
    id: string;
    name: string;
    slug: string;
  } | null;
  focusAreas: string[];
  imageUrl: string | null;
  wikipediaUrl: string | null;
  linkedInUrl: string | null;
  twitterHandle: string | null;
  contributions: string | null;
  milestoneCount: number;
  affiliationCount: number;
}

/**
 * Glossary term comparison data
 */
export interface TermComparisonData {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  fullDefinition: string;
  category: string;
  difficulty: number;
  conceptType: string;
  example: string | null;
  businessContext: string | null;
  relatedTermCount: number;
  keyFigureCount: number;
  milestoneCount: number;
}

/**
 * Comparison response with both entities
 */
export interface ComparisonResponse<T> {
  type: ComparisonEntityType;
  entityA: T;
  entityB: T;
  comparisonFields: string[];
}

/**
 * Get organization data for comparison
 */
async function getOrganizationForComparison(slug: string): Promise<OrganizationComparisonData | null> {
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      currentEmployees: {
        select: {
          id: true,
          canonicalName: true,
          slug: true,
          currentRole: true,
          imageUrl: true,
        },
        take: 5,
        orderBy: { canonicalName: 'asc' },
      },
      _count: {
        select: {
          milestones: true,
          currentEmployees: true,
        },
      },
    },
  });

  if (!org) return null;

  const focusAreas = JSON.parse(org.focusAreas) as string[];
  const products = JSON.parse(org.products) as string[];

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    type: org.type,
    shortDescription: org.shortDescription,
    mission: org.mission,
    foundedYear: org.foundedYear,
    headquarters: org.headquarters,
    focusAreas,
    products,
    logoUrl: org.logoUrl,
    websiteUrl: org.websiteUrl,
    wikipediaUrl: org.wikipediaUrl,
    linkedInUrl: org.linkedInUrl,
    employeeCount: org._count.currentEmployees,
    milestoneCount: org._count.milestones,
    notablePeople: org.currentEmployees.map((p) => ({
      id: p.id,
      name: p.canonicalName,
      slug: p.slug,
      role: p.currentRole,
      imageUrl: p.imageUrl,
    })),
  };
}

/**
 * Get person data for comparison
 */
async function getPersonForComparison(slug: string): Promise<PersonComparisonData | null> {
  const person = await prisma.person.findUnique({
    where: { slug },
    include: {
      currentOrg: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          milestoneLinks: true,
          affiliations: true,
        },
      },
    },
  });

  if (!person) return null;

  const focusAreas = JSON.parse(person.focusAreas) as string[];

  return {
    id: person.id,
    canonicalName: person.canonicalName,
    slug: person.slug,
    shortBio: person.shortBio,
    role: person.role,
    currentRole: person.currentRole,
    currentOrg: person.currentOrg,
    focusAreas,
    imageUrl: person.imageUrl,
    wikipediaUrl: person.wikipediaUrl,
    linkedInUrl: person.linkedInUrl,
    twitterHandle: person.twitterHandle,
    contributions: person.contributions,
    milestoneCount: person._count.milestoneLinks,
    affiliationCount: person._count.affiliations,
  };
}

/**
 * Get glossary term data for comparison
 */
async function getTermForComparison(slug: string): Promise<TermComparisonData | null> {
  const term = await prisma.glossaryTerm.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    include: {
      _count: {
        select: {
          keyFigures: true,
          milestoneLinks: true,
        },
      },
    },
  });

  if (!term) return null;

  const relatedTermIds = JSON.parse(term.relatedTermIds) as string[];

  return {
    id: term.id,
    term: term.term,
    slug: term.slug,
    shortDefinition: term.shortDefinition,
    fullDefinition: term.fullDefinition,
    category: term.category,
    difficulty: term.difficulty,
    conceptType: term.conceptType,
    example: term.example,
    businessContext: term.businessContext,
    relatedTermCount: relatedTermIds.length,
    keyFigureCount: term._count.keyFigures,
    milestoneCount: term._count.milestoneLinks,
  };
}

/**
 * Compare two organizations
 */
export async function compareOrganizations(
  slugA: string,
  slugB: string
): Promise<ComparisonResponse<OrganizationComparisonData> | null> {
  const [entityA, entityB] = await Promise.all([
    getOrganizationForComparison(slugA),
    getOrganizationForComparison(slugB),
  ]);

  if (!entityA || !entityB) return null;

  return {
    type: 'organization',
    entityA,
    entityB,
    comparisonFields: [
      'type',
      'foundedYear',
      'headquarters',
      'focusAreas',
      'products',
      'milestoneCount',
      'employeeCount',
    ],
  };
}

/**
 * Compare two persons
 */
export async function comparePersons(
  slugA: string,
  slugB: string
): Promise<ComparisonResponse<PersonComparisonData> | null> {
  const [entityA, entityB] = await Promise.all([
    getPersonForComparison(slugA),
    getPersonForComparison(slugB),
  ]);

  if (!entityA || !entityB) return null;

  return {
    type: 'person',
    entityA,
    entityB,
    comparisonFields: [
      'role',
      'currentOrg',
      'focusAreas',
      'milestoneCount',
      'affiliationCount',
    ],
  };
}

/**
 * Compare two glossary terms
 */
export async function compareTerms(
  slugA: string,
  slugB: string
): Promise<ComparisonResponse<TermComparisonData> | null> {
  const [entityA, entityB] = await Promise.all([
    getTermForComparison(slugA),
    getTermForComparison(slugB),
  ]);

  if (!entityA || !entityB) return null;

  return {
    type: 'term',
    entityA,
    entityB,
    comparisonFields: [
      'category',
      'difficulty',
      'conceptType',
      'relatedTermCount',
      'keyFigureCount',
      'milestoneCount',
    ],
  };
}

/**
 * Get comparison data for any two entities of the same type
 */
export async function getComparison(
  type: ComparisonEntityType,
  slugA: string,
  slugB: string
): Promise<ComparisonResponse<unknown> | null> {
  switch (type) {
    case 'organization':
      return compareOrganizations(slugA, slugB);
    case 'person':
      return comparePersons(slugA, slugB);
    case 'term':
      return compareTerms(slugA, slugB);
    default:
      return null;
  }
}

/**
 * Get all valid comparison pairs for a given type
 * Used for sitemap generation and hub pages
 */
export async function getComparisonPairs(
  type: ComparisonEntityType,
  limit: number = 100
): Promise<{ slugA: string; slugB: string; nameA: string; nameB: string }[]> {
  const pairs: { slugA: string; slugB: string; nameA: string; nameB: string }[] = [];

  switch (type) {
    case 'organization': {
      const orgs = await prisma.organization.findMany({
        select: { slug: true, name: true },
        orderBy: { name: 'asc' },
        take: 20, // Top 20 orgs for comparisons
      });

      // Generate all pairs
      for (let i = 0; i < orgs.length; i++) {
        for (let j = i + 1; j < orgs.length; j++) {
          pairs.push({
            slugA: orgs[i].slug,
            slugB: orgs[j].slug,
            nameA: orgs[i].name,
            nameB: orgs[j].name,
          });
          if (pairs.length >= limit) break;
        }
        if (pairs.length >= limit) break;
      }
      break;
    }
    case 'person': {
      const persons = await prisma.person.findMany({
        select: { slug: true, canonicalName: true },
        orderBy: { canonicalName: 'asc' },
        take: 20,
      });

      for (let i = 0; i < persons.length; i++) {
        for (let j = i + 1; j < persons.length; j++) {
          pairs.push({
            slugA: persons[i].slug,
            slugB: persons[j].slug,
            nameA: persons[i].canonicalName,
            nameB: persons[j].canonicalName,
          });
          if (pairs.length >= limit) break;
        }
        if (pairs.length >= limit) break;
      }
      break;
    }
    case 'term': {
      // Get terms and group by category for more meaningful comparisons
      const terms = await prisma.glossaryTerm.findMany({
        where: { slug: { not: null } },
        select: { slug: true, term: true, category: true },
        orderBy: { term: 'asc' },
      });

      // Group by category
      const byCategory = new Map<string, typeof terms>();
      for (const term of terms) {
        const existing = byCategory.get(term.category) || [];
        existing.push(term);
        byCategory.set(term.category, existing);
      }

      // Generate pairs within same category (more relevant comparisons)
      for (const categoryTerms of byCategory.values()) {
        for (let i = 0; i < categoryTerms.length && pairs.length < limit; i++) {
          for (let j = i + 1; j < categoryTerms.length && pairs.length < limit; j++) {
            if (categoryTerms[i].slug && categoryTerms[j].slug) {
              pairs.push({
                slugA: categoryTerms[i].slug!,
                slugB: categoryTerms[j].slug!,
                nameA: categoryTerms[i].term,
                nameB: categoryTerms[j].term,
              });
            }
          }
        }
      }
      break;
    }
  }

  return pairs;
}

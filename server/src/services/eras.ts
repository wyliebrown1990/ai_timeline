/**
 * Era Service
 * Sprint SEO-3 Task 7 - Era/Decade Landing Pages
 *
 * Provides aggregated data for era landing pages including
 * milestones, key figures, and key terms for a given time period.
 */

import { prisma } from '../db';

/**
 * Era configuration (matches frontend config)
 */
export interface EraConfig {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  startDate: string;
  endDate: string;
  themes: string[];
  metaDescription: string;
  path: string;
}

/**
 * Era milestone summary
 */
export interface EraMilestone {
  id: string;
  title: string;
  date: string;
  category: string;
  significance: number;
  organization: string | null;
  description: string;
}

/**
 * Era key figure summary
 */
export interface EraKeyFigure {
  id: string;
  canonicalName: string;
  slug: string;
  shortBio: string;
  currentRole: string | null;
  imageUrl: string | null;
  contributionCount: number;
}

/**
 * Era key term summary
 */
export interface EraKeyTerm {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  category: string;
}

/**
 * Full era page data response
 */
export interface EraPageData {
  milestones: EraMilestone[];
  keyFigures: EraKeyFigure[];
  keyTerms: EraKeyTerm[];
  stats: {
    totalMilestones: number;
    totalContributors: number;
    totalTerms: number;
    topCategories: { category: string; count: number }[];
  };
}

/**
 * Get era page data for a date range
 */
export async function getEraPageData(
  startDate: Date,
  endDate: Date,
  options?: {
    milestoneLimit?: number;
    figureLimit?: number;
    termLimit?: number;
  }
): Promise<EraPageData> {
  const milestoneLimit = options?.milestoneLimit ?? 20;
  const figureLimit = options?.figureLimit ?? 12;
  const termLimit = options?.termLimit ?? 15;

  // Get milestones in date range, ordered by significance then date
  const milestones = await prisma.milestone.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      title: true,
      date: true,
      category: true,
      significance: true,
      organization: true,
      description: true,
    },
    orderBy: [{ significance: 'desc' }, { date: 'desc' }],
    take: milestoneLimit,
  });

  // Get total milestone count for stats
  const totalMilestones = await prisma.milestone.count({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Get category breakdown
  const categoryGroups = await prisma.milestone.groupBy({
    by: ['category'],
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      category: true,
    },
    orderBy: {
      _count: {
        category: 'desc',
      },
    },
    take: 5,
  });

  const topCategories = categoryGroups.map((g) => ({
    category: g.category,
    count: g._count.category,
  }));

  // Get milestone IDs for this era
  const eraMilestoneIds = await prisma.milestone.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: { id: true },
  });
  const milestoneIds = eraMilestoneIds.map((m) => m.id);

  // Get key figures who contributed to milestones in this era
  // Using MilestoneContributor join table (only where personId is not null)
  let keyFigures: EraKeyFigure[] = [];
  let personIds: string[] = [];

  if (milestoneIds.length > 0) {
    const contributorCounts = await prisma.milestoneContributor.groupBy({
      by: ['personId'],
      where: {
        milestoneId: { in: milestoneIds },
        personId: { not: null },
      },
      _count: {
        personId: true,
      },
      orderBy: {
        _count: {
          personId: 'desc',
        },
      },
      take: figureLimit,
    });

    personIds = contributorCounts
      .map((c) => c.personId)
      .filter((id): id is string => id !== null);
    const contributorCountMap = new Map(
      contributorCounts.map((c) => [c.personId, c._count.personId])
    );

    if (personIds.length > 0) {
      const persons = await prisma.person.findMany({
        where: {
          id: { in: personIds },
        },
        select: {
          id: true,
          canonicalName: true,
          slug: true,
          shortBio: true,
          currentRole: true,
          imageUrl: true,
        },
      });

      // Sort persons by contribution count
      keyFigures = persons
        .map((p) => ({
          ...p,
          contributionCount: contributorCountMap.get(p.id) || 0,
        }))
        .sort((a, b) => b.contributionCount - a.contributionCount);
    }
  }

  // Get key terms linked to milestones in this era
  let keyTerms: EraKeyTerm[] = [];
  let termIds: string[] = [];

  if (milestoneIds.length > 0) {
    try {
      const termLinks = await prisma.milestoneGlossaryTerm.findMany({
        where: {
          milestoneId: { in: milestoneIds },
        },
        select: {
          glossaryTermId: true,
        },
        distinct: ['glossaryTermId'],
      });

      termIds = termLinks.map((t) => t.glossaryTermId);

      if (termIds.length > 0) {
        const terms = await prisma.glossaryTerm.findMany({
          where: {
            id: { in: termIds },
          },
          select: {
            id: true,
            term: true,
            slug: true,
            shortDefinition: true,
            category: true,
          },
          take: termLimit,
        });

        keyTerms = terms;
      }
    } catch (err) {
      // MilestoneGlossaryTerm table might not exist yet
      console.log('[EraService] MilestoneGlossaryTerm query failed, returning empty terms');
    }
  }

  return {
    milestones: milestones.map((m) => ({
      id: m.id,
      title: m.title,
      date: m.date.toISOString(),
      category: m.category,
      significance: m.significance,
      organization: m.organization,
      description: m.description,
    })),
    keyFigures,
    keyTerms,
    stats: {
      totalMilestones,
      totalContributors: personIds.length,
      totalTerms: termIds.length,
      topCategories,
    },
  };
}

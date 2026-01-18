/**
 * Explained Page Service
 * Sprint SEO-4 Task 3 - "X Explained" Deep-Dive Pages
 *
 * Provides enriched glossary term data for deep-dive explanation pages.
 */

import { prisma } from '../db';

/**
 * Key figure linked to a term
 */
export interface ExplainedKeyFigure {
  id: string;
  canonicalName: string;
  slug: string;
  shortBio: string;
  imageUrl: string | null;
  currentRole: string | null;
  contributionNote: string | null;
}

/**
 * Related term
 */
export interface ExplainedRelatedTerm {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  category: string;
}

/**
 * Related milestone
 */
export interface ExplainedMilestone {
  id: string;
  title: string;
  date: string;
  category: string;
  significance: number;
  relevanceNote: string | null;
}

/**
 * FAQ item for schema.org
 */
export interface ExplainedFAQ {
  question: string;
  answer: string;
}

/**
 * Full explained page data
 */
export interface ExplainedPageData {
  // Core term data
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  fullDefinition: string;
  quickAnswer: string | null;
  example: string | null;
  businessContext: string | null;
  inMeetingExample: string | null;
  category: string;
  difficulty: number;
  conceptType: string;

  // AI-generated content (Sprint SEO-4 Task 8)
  historySection: string | null;
  howItWorksSection: string | null;

  // Enriched data
  keyFigures: ExplainedKeyFigure[];
  relatedTerms: ExplainedRelatedTerm[];
  relatedMilestones: ExplainedMilestone[];

  // Generated FAQs
  faqs: ExplainedFAQ[];

  // Stats
  stats: {
    keyFigureCount: number;
    relatedTermCount: number;
    milestoneCount: number;
  };
}

/**
 * Generate FAQs from term data
 */
function generateFAQs(term: {
  term: string;
  shortDefinition: string;
  fullDefinition: string;
  example: string | null;
  businessContext: string | null;
  category: string;
}): ExplainedFAQ[] {
  const faqs: ExplainedFAQ[] = [];

  // What is X?
  faqs.push({
    question: `What is ${term.term}?`,
    answer: term.fullDefinition || term.shortDefinition,
  });

  // Why is X important?
  if (term.businessContext) {
    faqs.push({
      question: `Why is ${term.term} important?`,
      answer: term.businessContext,
    });
  }

  // How is X used in practice?
  if (term.example) {
    faqs.push({
      question: `How is ${term.term} used in practice?`,
      answer: term.example,
    });
  }

  // Category-specific questions
  if (term.category === 'model_architecture') {
    faqs.push({
      question: `How does ${term.term} work?`,
      answer: `${term.term} is a type of AI model architecture. ${term.shortDefinition}`,
    });
  } else if (term.category === 'technical_term') {
    faqs.push({
      question: `What does ${term.term} mean in AI?`,
      answer: term.shortDefinition,
    });
  } else if (term.category === 'core_concept') {
    faqs.push({
      question: `What is the concept of ${term.term} in artificial intelligence?`,
      answer: term.fullDefinition || term.shortDefinition,
    });
  }

  return faqs;
}

/**
 * Get explained page data for a glossary term
 */
export async function getExplainedPageData(
  slug: string
): Promise<ExplainedPageData | null> {
  // Get term with all relations
  const term = await prisma.glossaryTerm.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    include: {
      keyFigures: {
        include: {
          person: {
            select: {
              id: true,
              canonicalName: true,
              slug: true,
              shortBio: true,
              imageUrl: true,
              currentRole: true,
            },
          },
        },
        take: 10,
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
            },
          },
        },
        take: 10,
        orderBy: {
          milestone: {
            significance: 'desc',
          },
        },
      },
    },
  });

  if (!term) return null;

  // Get related terms
  const relatedTermIds = JSON.parse(term.relatedTermIds) as string[];
  let relatedTerms: ExplainedRelatedTerm[] = [];

  if (relatedTermIds.length > 0) {
    const related = await prisma.glossaryTerm.findMany({
      where: {
        id: { in: relatedTermIds },
      },
      select: {
        id: true,
        term: true,
        slug: true,
        shortDefinition: true,
        category: true,
      },
      take: 8,
    });
    relatedTerms = related;
  } else {
    // If no manual relations, get terms from same category
    const sameCategory = await prisma.glossaryTerm.findMany({
      where: {
        category: term.category,
        id: { not: term.id },
      },
      select: {
        id: true,
        term: true,
        slug: true,
        shortDefinition: true,
        category: true,
      },
      take: 8,
    });
    relatedTerms = sameCategory;
  }

  // Map key figures
  const keyFigures: ExplainedKeyFigure[] = term.keyFigures.map((kf) => ({
    id: kf.person.id,
    canonicalName: kf.person.canonicalName,
    slug: kf.person.slug,
    shortBio: kf.person.shortBio,
    imageUrl: kf.person.imageUrl,
    currentRole: kf.person.currentRole,
    contributionNote: kf.contributionNote,
  }));

  // Map milestones
  const relatedMilestones: ExplainedMilestone[] = term.milestoneLinks.map(
    (ml) => ({
      id: ml.milestone.id,
      title: ml.milestone.title,
      date: ml.milestone.date.toISOString(),
      category: ml.milestone.category,
      significance: ml.milestone.significance,
      relevanceNote: ml.relevanceNote,
    })
  );

  // Use AI-generated FAQs if available, otherwise generate from term data
  let faqs: ExplainedFAQ[] = [];
  const termWithFaqs = term as typeof term & { faqItems?: string };

  if (termWithFaqs.faqItems && termWithFaqs.faqItems !== '[]') {
    try {
      const parsedFaqs = JSON.parse(termWithFaqs.faqItems);
      if (Array.isArray(parsedFaqs) && parsedFaqs.length > 0) {
        faqs = parsedFaqs;
      }
    } catch {
      // Fall back to generated FAQs
    }
  }

  // If no AI-generated FAQs, generate from term data
  if (faqs.length === 0) {
    faqs = generateFAQs({
      term: term.term,
      shortDefinition: term.shortDefinition,
      fullDefinition: term.fullDefinition,
      example: term.example,
      businessContext: term.businessContext,
      category: term.category,
    });
  }

  // Cast to include new fields
  const termWithSeoContent = term as typeof term & {
    historySection?: string | null;
    howItWorksSection?: string | null;
  };

  return {
    id: term.id,
    term: term.term,
    slug: term.slug,
    shortDefinition: term.shortDefinition,
    fullDefinition: term.fullDefinition,
    quickAnswer: term.quickAnswer,
    example: term.example,
    businessContext: term.businessContext,
    inMeetingExample: term.inMeetingExample,
    category: term.category,
    difficulty: term.difficulty,
    conceptType: term.conceptType,
    historySection: termWithSeoContent.historySection || null,
    howItWorksSection: termWithSeoContent.howItWorksSection || null,
    keyFigures,
    relatedTerms,
    relatedMilestones,
    faqs,
    stats: {
      keyFigureCount: keyFigures.length,
      relatedTermCount: relatedTerms.length,
      milestoneCount: relatedMilestones.length,
    },
  };
}

/**
 * Get list of all terms with slugs for sitemap
 */
export async function getExplainedPageList(): Promise<
  { slug: string; term: string; updatedAt: Date }[]
> {
  const terms = await prisma.glossaryTerm.findMany({
    where: {
      slug: { not: null },
    },
    select: {
      slug: true,
      term: true,
      updatedAt: true,
    },
    orderBy: { term: 'asc' },
  });

  return terms.map((t) => ({
    slug: t.slug!,
    term: t.term,
    updatedAt: t.updatedAt,
  }));
}

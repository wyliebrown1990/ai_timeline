import { prisma } from '../db';
import type { GlossaryTerm } from '@prisma/client';

/**
 * Glossary term category enum (matches frontend types)
 */
export type GlossaryCategory =
  | 'core_concept'
  | 'technical_term'
  | 'business_term'
  | 'model_architecture'
  | 'company_product';

/**
 * Pagination options for list queries
 */
interface PaginationOptions {
  skip?: number;
  limit?: number;
}

/**
 * Create glossary term DTO
 */
export interface CreateGlossaryTermDto {
  term: string;
  slug?: string; // optional override; auto-generated from term if not provided
  shortDefinition: string;
  fullDefinition: string;
  businessContext?: string;
  example?: string;
  inMeetingExample?: string;
  category: GlossaryCategory;
  relatedTermIds?: string[];
  relatedMilestoneIds?: string[];
  sourceArticleId?: string;
  quickAnswer?: string; // SEO: 50-70 word direct answer for featured snippets
}

/**
 * Derive a kebab-case slug from a term name. Strips possessives, collapses
 * punctuation to spaces, then kebab-cases. Mirrors blog slugify rules.
 */
function slugifyTerm(raw: string): string {
  return (
    raw
      .toLowerCase()
      .trim()
      .replace(/[‘’']s\b/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100) || 'term'
  );
}

/**
 * Ensure a glossary slug is unique, appending -2, -3, … as needed.
 */
async function ensureGlossarySlugAvailable(slug: string): Promise<string> {
  if (!prisma) throw new Error('Database not available');
  let candidate = slug;
  let suffix = 2;
  for (let i = 0; i < 100; i++) {
    const existing = await prisma.glossaryTerm.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }
  throw new Error(`Could not find a unique glossary slug after 100 attempts for "${slug}"`);
}

/**
 * Update glossary term DTO
 */
export interface UpdateGlossaryTermDto {
  term?: string;
  slug?: string; // SEO-friendly URL slug
  shortDefinition?: string;
  fullDefinition?: string;
  businessContext?: string | null;
  example?: string | null;
  inMeetingExample?: string | null;
  category?: GlossaryCategory;
  relatedTermIds?: string[];
  relatedMilestoneIds?: string[];
  quickAnswer?: string | null; // SEO: 50-70 word direct answer for featured snippets
}

/**
 * Get all glossary terms with optional filtering and pagination
 */
export async function getAll(options?: PaginationOptions & {
  category?: GlossaryCategory;
  search?: string;
  subjectSlug?: string;
  includeSubjectChildren?: boolean;
}): Promise<{ terms: GlossaryTerm[]; total: number }> {
  if (!prisma) throw new Error('Database not available');

  const where: Record<string, unknown> = {};

  // Subject filter - get term IDs that match the subject
  if (options?.subjectSlug) {
    const subject = await prisma.subject.findUnique({
      where: { slug: options.subjectSlug },
    });

    if (subject) {
      // Get subject IDs to query (including children if requested)
      let subjectIds = [subject.id];

      if (options.includeSubjectChildren) {
        // Get all descendant subjects
        const queue = [subject.id];
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          const children = await prisma.subject.findMany({
            where: { parentId: currentId },
            select: { id: true },
          });
          subjectIds = [...subjectIds, ...children.map(c => c.id)];
          queue.push(...children.map(c => c.id));
        }
      }

      // Get term IDs that have these subjects
      const termLinks = await prisma.contentSubject.findMany({
        where: {
          subjectId: { in: subjectIds },
          contentType: 'glossary_term',
        },
        select: { contentId: true },
        distinct: ['contentId'],
      });

      const termIds = termLinks.map((l) => l.contentId);

      if (termIds.length === 0) {
        // No terms match this subject
        return { terms: [], total: 0 };
      }

      where.id = { in: termIds };
    } else {
      // Subject not found, return empty
      return { terms: [], total: 0 };
    }
  }

  if (options?.category) {
    where.category = options.category;
  }

  if (options?.search) {
    // Search in term, shortDefinition, and fullDefinition
    where.OR = [
      { term: { contains: options.search } },
      { shortDefinition: { contains: options.search } },
      { fullDefinition: { contains: options.search } },
    ];
  }

  const [terms, total] = await Promise.all([
    prisma.glossaryTerm.findMany({
      where,
      skip: options?.skip ?? 0,
      take: options?.limit ?? 100,
      orderBy: { term: 'asc' },
    }),
    prisma.glossaryTerm.count({ where }),
  ]);

  return { terms, total };
}

/**
 * Get a single glossary term by ID
 */
export async function getById(id: string): Promise<GlossaryTerm | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.glossaryTerm.findUnique({
    where: { id },
  });
}

/**
 * Get a glossary term by term name (case-insensitive search)
 */
export async function getByTerm(term: string): Promise<GlossaryTerm | null> {
  if (!prisma) throw new Error('Database not available');

  // SQLite doesn't have case-insensitive search by default,
  // so we use LOWER() via raw query or just do exact match
  return prisma.glossaryTerm.findFirst({
    where: {
      term: {
        equals: term,
        mode: 'insensitive',
      },
    },
  });
}

/**
 * Get a glossary term by slug (Sprint SEO-3)
 */
export async function getBySlug(slug: string): Promise<GlossaryTerm | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.glossaryTerm.findFirst({
    where: { slug },
  });
}

/**
 * Key figure linked to a glossary term (Sprint SEO-3)
 */
export interface GlossaryKeyFigure {
  id: string;
  personId: string;
  contributionNote: string | null;
  person: {
    id: string;
    canonicalName: string;
    slug: string;
    imageUrl: string | null;
    shortBio: string;
    currentRole: string | null;
  };
}

/**
 * Get key figures linked to a glossary term (Sprint SEO-3)
 */
export async function getKeyFigures(termId: string): Promise<GlossaryKeyFigure[]> {
  if (!prisma) throw new Error('Database not available');

  const links = await prisma.glossaryTermPerson.findMany({
    where: { glossaryTermId: termId },
    include: {
      person: {
        select: {
          id: true,
          canonicalName: true,
          slug: true,
          imageUrl: true,
          shortBio: true,
          currentRole: true,
        },
      },
    },
  });

  return links.map(link => ({
    id: link.id,
    personId: link.personId,
    contributionNote: link.contributionNote,
    person: link.person,
  }));
}

/**
 * Milestone linked to a glossary term (Sprint SEO-3)
 */
export interface GlossaryLinkedMilestone {
  id: string;
  milestoneId: string;
  relevanceNote: string | null;
  milestone: {
    id: string;
    title: string;
    date: Date;
    category: string;
    significance: number;
  };
}

/**
 * Get milestones linked to a glossary term (Sprint SEO-3)
 */
export async function getLinkedMilestones(termId: string): Promise<GlossaryLinkedMilestone[]> {
  if (!prisma) throw new Error('Database not available');

  const links = await prisma.milestoneGlossaryTerm.findMany({
    where: { glossaryTermId: termId },
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
    orderBy: {
      milestone: {
        date: 'desc',
      },
    },
  });

  return links.map(link => ({
    id: link.id,
    milestoneId: link.milestoneId,
    relevanceNote: link.relevanceNote,
    milestone: link.milestone,
  }));
}

/**
 * Create a new glossary term
 */
export async function create(data: CreateGlossaryTermDto): Promise<GlossaryTerm> {
  if (!prisma) throw new Error('Database not available');

  const slugBase = data.slug ?? slugifyTerm(data.term);
  const slug = await ensureGlossarySlugAvailable(slugBase);

  return prisma.glossaryTerm.create({
    data: {
      term: data.term,
      slug,
      shortDefinition: data.shortDefinition,
      fullDefinition: data.fullDefinition,
      businessContext: data.businessContext ?? null,
      example: data.example ?? null,
      inMeetingExample: data.inMeetingExample ?? null,
      category: data.category,
      relatedTermIds: JSON.stringify(data.relatedTermIds ?? []),
      relatedMilestoneIds: JSON.stringify(data.relatedMilestoneIds ?? []),
      sourceArticleId: data.sourceArticleId ?? null,
      quickAnswer: data.quickAnswer ?? null,
    },
  });
}

/**
 * Update an existing glossary term
 */
export async function update(id: string, data: UpdateGlossaryTermDto): Promise<GlossaryTerm | null> {
  if (!prisma) throw new Error('Database not available');

  // Build update data, only including fields that are provided
  const updateData: Record<string, unknown> = {};

  if (data.term !== undefined) updateData.term = data.term;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.shortDefinition !== undefined) updateData.shortDefinition = data.shortDefinition;
  if (data.fullDefinition !== undefined) updateData.fullDefinition = data.fullDefinition;
  if (data.businessContext !== undefined) updateData.businessContext = data.businessContext;
  if (data.example !== undefined) updateData.example = data.example;
  if (data.inMeetingExample !== undefined) updateData.inMeetingExample = data.inMeetingExample;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.relatedTermIds !== undefined) updateData.relatedTermIds = JSON.stringify(data.relatedTermIds);
  if (data.relatedMilestoneIds !== undefined) updateData.relatedMilestoneIds = JSON.stringify(data.relatedMilestoneIds);
  if (data.quickAnswer !== undefined) updateData.quickAnswer = data.quickAnswer;

  try {
    return await prisma.glossaryTerm.update({
      where: { id },
      data: updateData,
    });
  } catch {
    return null;
  }
}

/**
 * Delete a glossary term by ID
 */
export async function remove(id: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  try {
    await prisma.glossaryTerm.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a term already exists
 */
export async function termExists(term: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  const existing = await prisma.glossaryTerm.findFirst({
    where: { term },
    select: { id: true },
  });

  return existing !== null;
}

/**
 * Get terms by category
 */
export async function getByCategory(category: GlossaryCategory): Promise<GlossaryTerm[]> {
  if (!prisma) throw new Error('Database not available');

  return prisma.glossaryTerm.findMany({
    where: { category },
    orderBy: { term: 'asc' },
  });
}

/**
 * Search glossary terms by query string
 */
export async function search(query: string, limit = 20): Promise<GlossaryTerm[]> {
  if (!prisma) throw new Error('Database not available');

  return prisma.glossaryTerm.findMany({
    where: {
      OR: [
        { term: { contains: query } },
        { shortDefinition: { contains: query } },
        { fullDefinition: { contains: query } },
      ],
    },
    take: limit,
    orderBy: { term: 'asc' },
  });
}

/**
 * Bulk create glossary terms (for migration)
 */
export async function createBulk(
  terms: CreateGlossaryTermDto[]
): Promise<{ created: number; skipped: number; errors: string[] }> {
  if (!prisma) throw new Error('Database not available');

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const termData of terms) {
    const exists = await termExists(termData.term);
    if (exists) {
      skipped++;
      continue;
    }

    try {
      await create(termData);
      created++;
    } catch (error) {
      errors.push(`Failed to create term "${termData.term}": ${error}`);
      skipped++;
    }
  }

  return { created, skipped, errors };
}

/**
 * Get total count of glossary terms
 */
export async function getCount(): Promise<number> {
  if (!prisma) throw new Error('Database not available');

  return prisma.glossaryTerm.count();
}

/**
 * Get count by category
 */
export async function getCountByCategory(): Promise<Record<string, number>> {
  if (!prisma) throw new Error('Database not available');

  const categories = ['core_concept', 'technical_term', 'business_term', 'model_architecture', 'company_product'];
  const counts: Record<string, number> = {};

  for (const category of categories) {
    counts[category] = await prisma.glossaryTerm.count({
      where: { category },
    });
  }

  return counts;
}

/**
 * Generate a quick answer for a glossary term using Claude API
 * Quick answers are 50-70 word direct responses optimized for search engine featured snippets
 */
export async function generateQuickAnswer(termId: string): Promise<string | null> {
  if (!prisma) throw new Error('Database not available');

  const term = await prisma.glossaryTerm.findUnique({
    where: { id: termId },
  });

  if (!term) {
    return null;
  }

  const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const prompt = `You are an SEO expert writing quick answers for search engine featured snippets.

Generate a direct, informative answer to the question "What is ${term.term}?"

Requirements:
- Answer in 50-70 words (this is critical for featured snippets)
- Start with a direct definition, not "X is..."
- Include why it matters or its significance
- Use simple language accessible to general audiences
- Be factual and authoritative
- Don't use marketing language or hype

Context about the term:
- Short definition: ${term.shortDefinition}
- Full definition: ${term.fullDefinition}
${term.businessContext ? `- Business context: ${term.businessContext}` : ''}

Return ONLY the quick answer text, no quotes, no explanation, no "Here is..." prefix.`;

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const quickAnswer = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    // Save the quick answer
    await prisma.glossaryTerm.update({
      where: { id: termId },
      data: { quickAnswer },
    });

    return quickAnswer;
  } catch (error) {
    console.error('Failed to generate quick answer:', error);
    throw error;
  }
}

/**
 * Bulk generate quick answers for terms that don't have them
 */
export async function generateQuickAnswersBulk(limit = 10): Promise<{
  generated: number;
  failed: number;
  errors: string[];
}> {
  if (!prisma) throw new Error('Database not available');

  // Get terms without quick answers
  const terms = await prisma.glossaryTerm.findMany({
    where: { quickAnswer: null },
    take: limit,
    select: { id: true, term: true },
  });

  let generated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const term of terms) {
    try {
      await generateQuickAnswer(term.id);
      generated++;
      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      failed++;
      errors.push(`${term.term}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { generated, failed, errors };
}

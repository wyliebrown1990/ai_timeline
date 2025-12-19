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
  shortDefinition: string;
  fullDefinition: string;
  businessContext?: string;
  example?: string;
  inMeetingExample?: string;
  category: GlossaryCategory;
  relatedTermIds?: string[];
  relatedMilestoneIds?: string[];
  sourceArticleId?: string;
}

/**
 * Update glossary term DTO
 */
export interface UpdateGlossaryTermDto {
  term?: string;
  shortDefinition?: string;
  fullDefinition?: string;
  businessContext?: string | null;
  example?: string | null;
  inMeetingExample?: string | null;
  category?: GlossaryCategory;
  relatedTermIds?: string[];
  relatedMilestoneIds?: string[];
}

/**
 * Get all glossary terms with optional filtering and pagination
 */
export async function getAll(options?: PaginationOptions & {
  category?: GlossaryCategory;
  search?: string;
}): Promise<{ terms: GlossaryTerm[]; total: number }> {
  if (!prisma) throw new Error('Database not available');

  const where: Record<string, unknown> = {};

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
 * Create a new glossary term
 */
export async function create(data: CreateGlossaryTermDto): Promise<GlossaryTerm> {
  if (!prisma) throw new Error('Database not available');

  return prisma.glossaryTerm.create({
    data: {
      term: data.term,
      shortDefinition: data.shortDefinition,
      fullDefinition: data.fullDefinition,
      businessContext: data.businessContext ?? null,
      example: data.example ?? null,
      inMeetingExample: data.inMeetingExample ?? null,
      category: data.category,
      relatedTermIds: JSON.stringify(data.relatedTermIds ?? []),
      relatedMilestoneIds: JSON.stringify(data.relatedMilestoneIds ?? []),
      sourceArticleId: data.sourceArticleId ?? null,
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
  if (data.shortDefinition !== undefined) updateData.shortDefinition = data.shortDefinition;
  if (data.fullDefinition !== undefined) updateData.fullDefinition = data.fullDefinition;
  if (data.businessContext !== undefined) updateData.businessContext = data.businessContext;
  if (data.example !== undefined) updateData.example = data.example;
  if (data.inMeetingExample !== undefined) updateData.inMeetingExample = data.inMeetingExample;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.relatedTermIds !== undefined) updateData.relatedTermIds = JSON.stringify(data.relatedTermIds);
  if (data.relatedMilestoneIds !== undefined) updateData.relatedMilestoneIds = JSON.stringify(data.relatedMilestoneIds);

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

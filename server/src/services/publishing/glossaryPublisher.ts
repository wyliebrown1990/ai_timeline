/**
 * Glossary Publisher Service
 *
 * Publishes approved glossary term drafts to the database.
 * Sprint 32 - Glossary API
 */

import { prisma } from '../../db';
import type { GlossaryTermDraft } from '../ingestion/glossaryExtractor';

/**
 * Valid glossary categories
 */
const VALID_CATEGORIES = [
  'core_concept',
  'technical_term',
  'business_term',
  'model_architecture',
  'company_product',
] as const;

type GlossaryCategory = typeof VALID_CATEGORIES[number];

/**
 * Validate glossary term draft data
 * Throws error if validation fails
 */
export function validateGlossaryTermDraft(draftData: GlossaryTermDraft): void {
  // Required fields
  if (!draftData.term || typeof draftData.term !== 'string') {
    throw new Error('Term is required and must be a string');
  }

  if (!draftData.shortDefinition || typeof draftData.shortDefinition !== 'string') {
    throw new Error('Short definition is required');
  }

  if (!draftData.fullDefinition || typeof draftData.fullDefinition !== 'string') {
    throw new Error('Full definition is required');
  }

  if (!draftData.category || !VALID_CATEGORIES.includes(draftData.category as GlossaryCategory)) {
    throw new Error(
      `Invalid category: ${draftData.category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`
    );
  }

  // Length validations
  if (draftData.term.length > 100) {
    throw new Error(`Term must be max 100 characters (currently ${draftData.term.length})`);
  }

  if (draftData.shortDefinition.length > 200) {
    throw new Error(
      `Short definition must be max 200 characters (currently ${draftData.shortDefinition.length})`
    );
  }

  if (draftData.fullDefinition.length > 2000) {
    throw new Error(
      `Full definition must be max 2000 characters (currently ${draftData.fullDefinition.length})`
    );
  }

  if (draftData.businessContext && draftData.businessContext.length > 1000) {
    throw new Error(
      `Business context must be max 1000 characters (currently ${draftData.businessContext.length})`
    );
  }
}

/**
 * Check if a term already exists in the database
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
 * Publish a glossary term draft to the database
 * Returns the created term ID
 *
 * @param draftData - The glossary term draft data
 * @param sourceArticleId - Optional ID of the source article (for AI-generated terms)
 */
export async function publishGlossaryTerm(
  draftData: GlossaryTermDraft,
  sourceArticleId?: string
): Promise<string> {
  if (!prisma) throw new Error('Database not available');

  // Validate the draft data
  validateGlossaryTermDraft(draftData);

  // Check for duplicate terms
  const exists = await termExists(draftData.term);
  if (exists) {
    throw new Error(`Glossary term "${draftData.term}" already exists`);
  }

  // Create the term in the database
  const term = await prisma.glossaryTerm.create({
    data: {
      term: draftData.term,
      shortDefinition: draftData.shortDefinition,
      fullDefinition: draftData.fullDefinition,
      businessContext: draftData.businessContext || null,
      example: null, // Not in draft schema
      inMeetingExample: null, // Not in draft schema
      category: draftData.category,
      relatedTermIds: JSON.stringify(draftData.relatedTermIds || []),
      relatedMilestoneIds: JSON.stringify([]), // Not in draft schema
      sourceArticleId: sourceArticleId || null,
    },
  });

  console.log(`Published glossary term: ${term.id} - ${draftData.term}`);

  return term.id;
}

/**
 * Get all glossary terms for validation/deduplication
 */
export async function getAllTermNames(): Promise<string[]> {
  if (!prisma) throw new Error('Database not available');

  const terms = await prisma.glossaryTerm.findMany({
    select: { term: true },
  });

  return terms.map((t) => t.term);
}

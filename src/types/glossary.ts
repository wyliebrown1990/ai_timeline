import { z } from 'zod';

/**
 * Glossary Entry Types
 *
 * Glossary entries provide definitions and business context for AI terms.
 * Each entry includes both short (tooltip) and full definitions, plus
 * practical context for non-technical professionals.
 */

/**
 * Categories for glossary terms to enable filtering and organization
 */
export const GlossaryCategorySchema = z.enum([
  'core_concept',      // Fundamental AI concepts (e.g., machine learning, neural network)
  'technical_term',    // Technical terminology (e.g., backpropagation, gradient descent)
  'business_term',     // Business-focused AI terms (e.g., AI governance, ROI metrics)
  'model_architecture', // Model types and architectures (e.g., transformer, GPT, diffusion)
  'company_product',   // Companies and products (e.g., OpenAI, Claude, ChatGPT)
]);

export type GlossaryCategory = z.infer<typeof GlossaryCategorySchema>;

/**
 * Concept types for prerequisite mapping (Sprint LEarn-1)
 */
export const ConceptTypeSchema = z.enum([
  'foundational',  // Basic concepts everyone should know first
  'intermediate',  // Building blocks that require some foundational knowledge
  'advanced',      // Complex concepts requiring multiple prerequisites
]);

export type ConceptType = z.infer<typeof ConceptTypeSchema>;

/**
 * Main GlossaryEntry schema
 * Defines a term with multiple explanation levels for different contexts
 */
export const GlossaryEntrySchema = z.object({
  // Unique identifier (e.g., "transformer", "neural-network")
  id: z.string().min(1),

  // The term being defined (e.g., "Transformer", "Neural Network")
  term: z.string().min(1).max(100),

  // Brief definition for tooltips (max 200 chars, no jargon)
  shortDefinition: z.string().max(200),

  // Full definition for the glossary page (2-3 sentences, accessible)
  fullDefinition: z.string().min(1),

  // Why this term matters in a business context (1-2 sentences)
  businessContext: z.string().min(1),

  // Example of how the term might be used in a meeting
  // Format: "We're evaluating [term] for..."
  inMeetingExample: z.string().optional(),

  // A real-world example connecting to familiar products/services
  example: z.string().optional(),

  // IDs of related glossary entries for cross-linking
  relatedTermIds: z.array(z.string()).default([]),

  // IDs of related milestones where this concept is discussed
  relatedMilestoneIds: z.array(z.string()).default([]),

  // Category for filtering and organization
  category: GlossaryCategorySchema,

  // Prerequisite system (Sprint LEarn-1)
  // IDs of terms that should be learned before this one
  prerequisiteIds: z.array(z.string()).default([]),

  // Difficulty level (1-5, where 1 is beginner, 5 is expert)
  difficulty: z.number().min(1).max(5).default(1),

  // Concept type for adaptive sequencing
  conceptType: ConceptTypeSchema.default('foundational'),
});

export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;

/**
 * Schema for an array of glossary entries (for bulk validation)
 */
export const GlossaryEntryArraySchema = z.array(GlossaryEntrySchema);

/**
 * Helper to validate a single glossary entry
 */
export function validateGlossaryEntry(data: unknown): GlossaryEntry {
  return GlossaryEntrySchema.parse(data);
}

/**
 * Helper to safely validate a glossary entry (returns result object)
 */
export function safeParseGlossaryEntry(data: unknown) {
  return GlossaryEntrySchema.safeParse(data);
}

/**
 * All valid glossary categories as a readonly array
 * Useful for UI dropdowns and filters
 */
export const GLOSSARY_CATEGORIES = [
  'core_concept',
  'technical_term',
  'business_term',
  'model_architecture',
  'company_product',
] as const;

/**
 * Human-readable labels for glossary categories
 */
export const GLOSSARY_CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  core_concept: 'Core Concept',
  technical_term: 'Technical Term',
  business_term: 'Business Term',
  model_architecture: 'Model Architecture',
  company_product: 'Company/Product',
};

/**
 * Human-readable labels for concept types (Sprint LEarn-1)
 */
export const CONCEPT_TYPE_LABELS: Record<ConceptType, string> = {
  foundational: 'Foundational',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/**
 * Human-readable labels for difficulty levels (Sprint LEarn-1)
 */
export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Easy',
  3: 'Moderate',
  4: 'Challenging',
  5: 'Expert',
};

/**
 * Colors for difficulty levels (for UI badges)
 */
export const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  2: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  4: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  5: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

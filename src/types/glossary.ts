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

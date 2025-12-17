import { z } from 'zod';

/**
 * Milestone categories representing different types of AI developments
 */
export enum MilestoneCategory {
  RESEARCH = 'research',
  MODEL_RELEASE = 'model_release',
  BREAKTHROUGH = 'breakthrough',
  PRODUCT = 'product',
  REGULATION = 'regulation',
  INDUSTRY = 'industry',
}

/**
 * Significance levels indicating the historical importance of a milestone
 * 1 = Minor, 4 = Groundbreaking
 */
export enum SignificanceLevel {
  MINOR = 1,
  MODERATE = 2,
  MAJOR = 3,
  GROUNDBREAKING = 4,
}

/**
 * Source types for milestone references
 */
export enum SourceKind {
  PAPER = 'paper',
  PRIMARY_DOC = 'primary_doc',
  BOOK = 'book',
  CODE_REPO = 'code_repo',
  MEDIA = 'media',
  ARTICLE = 'article',
}

/**
 * A source/reference for a milestone
 */
export interface Source {
  label: string;
  kind: SourceKind | string;
  url: string;
}

/**
 * Core milestone entity representing an AI development event
 */
export interface Milestone {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: MilestoneCategory;
  significance: SignificanceLevel;
  era?: string;
  organization?: string;
  contributors?: string[];
  sourceUrl?: string;
  imageUrl?: string;
  tags: string[];
  sources?: Source[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data transfer object for creating a new milestone
 */
export interface CreateMilestoneDto {
  title: string;
  description: string;
  date: string;
  category: MilestoneCategory;
  significance: SignificanceLevel;
  era?: string;
  organization?: string;
  contributors?: string[];
  sourceUrl?: string;
  imageUrl?: string;
  tags?: string[];
  sources?: Source[];
}

/**
 * Data transfer object for updating an existing milestone
 */
export type UpdateMilestoneDto = Partial<CreateMilestoneDto>;

/**
 * Milestone as returned from the API (dates as ISO strings)
 */
export interface MilestoneResponse {
  id: string;
  title: string;
  description: string;
  date: string;
  category: MilestoneCategory;
  significance: SignificanceLevel;
  era?: string | null;
  organization?: string | null;
  contributors: string[];
  sourceUrl?: string | null;
  imageUrl?: string | null;
  tags: string[];
  sources?: Source[];
  createdAt: string;
  updatedAt: string;
}

// Zod schemas for runtime validation

export const SourceKindSchema = z.nativeEnum(SourceKind).or(z.string());

export const SourceSchema = z.object({
  label: z.string().min(1, 'Source label is required'),
  kind: SourceKindSchema,
  url: z.string().url('Source URL must be valid'),
});

export const MilestoneCategorySchema = z.nativeEnum(MilestoneCategory);

export const SignificanceLevelSchema = z.nativeEnum(SignificanceLevel);

export const CreateMilestoneDtoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description is too long'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Date must be a valid date string',
  }),
  category: MilestoneCategorySchema,
  significance: SignificanceLevelSchema,
  era: z.string().optional(),
  organization: z.string().optional(),
  contributors: z.array(z.string()).optional(),
  sourceUrl: z.string().url('Source URL must be valid').optional().or(z.literal('')),
  imageUrl: z.string().url('Image URL must be valid').optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  sources: z.array(SourceSchema).optional(),
});

export const UpdateMilestoneDtoSchema = CreateMilestoneDtoSchema.partial();

export const MilestoneResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  date: z.string(),
  category: MilestoneCategorySchema,
  significance: SignificanceLevelSchema,
  era: z.string().nullable().optional(),
  organization: z.string().nullable().optional(),
  contributors: z.array(z.string()),
  sourceUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  tags: z.array(z.string()),
  sources: z.array(SourceSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const MilestoneListResponseSchema = z.array(MilestoneResponseSchema);

// =============================================================================
// Layered Content Schema (Sprint 8.5 Addition)
// =============================================================================

/**
 * Plain English content for the "AI for Everyday Life" learning path
 * Targets 65+ audience who wants to understand AI without jargon
 */
export const PlainEnglishContentSchema = z.object({
  // What happened - 2-3 sentences, no jargon, simple subject-verb-object
  whatHappened: z.string().min(1),

  // Think of it like - familiar analogy from everyday life
  thinkOfItLike: z.string().min(1),

  // How it affects you - bullet points on healthcare, shopping, family, daily life
  howItAffectsYou: z.string().min(1),

  // Try it yourself - safe, optional activity with specific steps (optional)
  tryItYourself: z.string().optional(),

  // Watch out for - scam awareness, misinformation, privacy concerns
  watchOutFor: z.string().min(1),
});

export type PlainEnglishContent = z.infer<typeof PlainEnglishContentSchema>;

/**
 * Layered explanation content for milestones
 *
 * Each milestone can have multiple explanation layers targeting different
 * audiences and depths. This enables personalized content based on user
 * preferences (simple, business, technical).
 */
export const MilestoneLayeredContentSchema = z.object({
  // TL;DR - max 15 words, plain English, single key insight
  tldr: z.string().max(100),

  // Simple explanation - 1-2 paragraphs with everyday analogies, no jargon
  simpleExplanation: z.string().min(1),

  // Business impact - bullet points showing use cases, who it affected, costs
  businessImpact: z.string().min(1),

  // Technical depth - 2-3 paragraphs with architecture details
  technicalDepth: z.string().min(1),

  // Historical context - 1-2 paragraphs on research lineage and predecessors
  historicalContext: z.string().min(1),

  // Why it matters today - 1-2 sentences connecting to current products
  whyItMattersToday: z.string().max(300),

  // Common misconceptions - bullet points with corrections
  commonMisconceptions: z.string().min(1),

  // Plain English content for everyday life audience (optional)
  plainEnglish: PlainEnglishContentSchema.optional(),
});

export type MilestoneLayeredContent = z.infer<typeof MilestoneLayeredContentSchema>;

/**
 * Extended milestone response including layered content
 */
export const MilestoneWithLayeredContentSchema = MilestoneResponseSchema.extend({
  layeredContent: MilestoneLayeredContentSchema.optional(),
});

export type MilestoneWithLayeredContent = z.infer<typeof MilestoneWithLayeredContentSchema>;

/**
 * Validate layered content
 */
export function validateLayeredContent(data: unknown): MilestoneLayeredContent {
  return MilestoneLayeredContentSchema.parse(data);
}

/**
 * Safely validate layered content
 */
export function safeParseLayeredContent(data: unknown) {
  return MilestoneLayeredContentSchema.safeParse(data);
}

/**
 * Map of milestone IDs to their layered content
 * Used for static JSON content storage
 */
export type LayeredContentMap = Record<string, MilestoneLayeredContent>;

/**
 * Schema for validating layered content map
 */
export const LayeredContentMapSchema = z.record(z.string(), MilestoneLayeredContentSchema);

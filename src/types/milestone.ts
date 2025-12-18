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
 * Executive Brief content for the "AI for Leaders" learning path
 * Targets executives and managers who need to make AI decisions
 */
export const ExecutiveBriefContentSchema = z.object({
  // Bottom line - 1-2 sentences: what leaders need to know
  bottomLine: z.string().min(1),

  // Business implications - how this affects strategy and competition
  businessImplications: z.string().min(1),

  // Questions to ask your team - diagnostic questions for leaders
  questionsToAsk: z.array(z.string()).min(1),

  // Competitor watch - what competitors might be doing
  competitorWatch: z.string().min(1),

  // Action items - concrete next steps
  actionItems: z.array(z.string()).min(1),

  // Further reading - HBR, McKinsey links (optional)
  furtherReading: z.array(z.string()).optional(),
});

export type ExecutiveBriefContent = z.infer<typeof ExecutiveBriefContentSchema>;

/**
 * Applied AI Brief content for the "Applied AI" learning path
 * Targets business professionals evaluating real-world AI adoption
 */
export const AppliedAIBriefContentSchema = z.object({
  // Real world wins - proven use cases with measurable outcomes
  realWorldWins: z.string().min(1),

  // Common failures - what goes wrong and why
  commonFailures: z.string().min(1),

  // Cost considerations - pricing models, TCO, hidden costs
  costConsiderations: z.string().min(1),

  // Implementation path - how companies typically adopt this
  implementationPath: z.string().min(1),

  // Vendor landscape - key players and positioning
  vendorLandscape: z.string().min(1),
});

export type AppliedAIBriefContent = z.infer<typeof AppliedAIBriefContentSchema>;

// =============================================================================
// Future Scenarios Schema (for special "Where We Go Next" milestone)
// =============================================================================

/**
 * A timeline event within a future scenario
 */
export const ScenarioTimelineEventSchema = z.object({
  year: z.string(),
  event: z.string(),
  description: z.string(),
});

export type ScenarioTimelineEvent = z.infer<typeof ScenarioTimelineEventSchema>;

/**
 * A key voice/quote within a scenario
 */
export const ScenarioVoiceSchema = z.object({
  name: z.string(),
  role: z.string(),
  quote: z.string(),
  source: z.string(),
  sourceUrl: z.string().url(),
  context: z.string(),
});

export type ScenarioVoice = z.infer<typeof ScenarioVoiceSchema>;

/**
 * A single future scenario (optimistic, neutral, or concerning)
 */
export const FutureScenarioSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  probability: z.string(),
  summary: z.string(),
  timeline: z.array(ScenarioTimelineEventSchema),
  keyVoices: z.array(ScenarioVoiceSchema),
  requirements: z.array(z.string()),
  mitigations: z.array(z.string()).optional(),
});

export type FutureScenario = z.infer<typeof FutureScenarioSchema>;

/**
 * Container for all three future scenarios
 */
export const FutureScenariosSchema = z.object({
  optimistic: FutureScenarioSchema,
  neutral: FutureScenarioSchema,
  concerning: FutureScenarioSchema,
});

export type FutureScenarios = z.infer<typeof FutureScenariosSchema>;

/**
 * A reference/source for the future scenarios milestone
 */
export const ScenarioReferenceSchema = z.object({
  title: z.string(),
  author: z.string(),
  date: z.string(),
  url: z.string().url(),
  description: z.string(),
});

export type ScenarioReference = z.infer<typeof ScenarioReferenceSchema>;

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

  // Why it matters today - 1-2 sentences connecting to current products (longer for special milestones)
  whyItMattersToday: z.string().min(1),

  // Common misconceptions - bullet points with corrections
  commonMisconceptions: z.string().min(1),

  // Plain English content for everyday life audience (optional)
  plainEnglish: PlainEnglishContentSchema.optional(),

  // Executive brief content for leaders audience (optional)
  executiveBrief: ExecutiveBriefContentSchema.optional(),

  // Applied AI brief content for practitioners evaluating real-world adoption (optional)
  appliedAIBrief: AppliedAIBriefContentSchema.optional(),

  // Future scenarios for special "Where We Go Next" milestone (optional)
  futureScenarios: FutureScenariosSchema.optional(),

  // References for future scenarios (optional)
  references: z.array(ScenarioReferenceSchema).optional(),
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

/**
 * Subject Types
 * Sprint Subj-1 - Subject Taxonomy System
 *
 * Zod schemas and TypeScript types for hierarchical subject taxonomy
 * Used for content classification, filtering, and learning path generation
 */

import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

export const SubjectLevelEnum = z.enum(['domain', 'category', 'subcategory']);
export type SubjectLevel = z.infer<typeof SubjectLevelEnum>;

export const SubjectDifficultyEnum = z.enum(['beginner', 'intermediate', 'advanced']);
export type SubjectDifficulty = z.infer<typeof SubjectDifficultyEnum>;

export const ContentSubjectSourceEnum = z.enum(['auto', 'manual', 'migration']);
export type ContentSubjectSource = z.infer<typeof ContentSubjectSourceEnum>;

export const ContentTypeEnum = z.enum([
  'milestone',
  'glossary_term',
  'current_event',
  'person',
  'organization',
]);
export type ContentType = z.infer<typeof ContentTypeEnum>;

// =============================================================================
// Core Schemas
// =============================================================================

/**
 * Base subject schema (without recursive children for API responses)
 */
export const SubjectBaseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  level: z.number().min(0).max(2), // 0=domain, 1=category, 2=subcategory
  parentId: z.string().nullable(),
  path: z.string(), // "Science > Computer Science > NLP"
  domainSlug: z.string(), // "science" for quick domain filtering
  defaultDifficulty: SubjectDifficultyEnum.nullable(),
  learningObjectives: z.array(z.string()),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export type SubjectBase = z.infer<typeof SubjectBaseSchema>;

/**
 * Subject with children (for tree views)
 */
export const SubjectSchema: z.ZodType<Subject> = SubjectBaseSchema.extend({
  children: z.lazy(() => z.array(SubjectSchema)).optional(),
  parent: z.lazy(() => SubjectSchema).optional().nullable(),
});

export interface Subject extends SubjectBase {
  children?: Subject[];
  parent?: Subject | null;
}

/**
 * Subject synonym (alternative term mapping)
 */
export const SubjectSynonymSchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  term: z.string(),
  subject: SubjectBaseSchema.optional(),
});

export type SubjectSynonym = z.infer<typeof SubjectSynonymSchema>;

/**
 * Content-Subject junction (polymorphic)
 */
export const ContentSubjectSchema = z.object({
  id: z.string(),
  contentType: ContentTypeEnum,
  contentId: z.string(),
  subjectId: z.string(),
  isPrimary: z.boolean(),
  confidence: z.number().min(0).max(1).nullable(),
  source: ContentSubjectSourceEnum,
  createdAt: z.string().or(z.date()),
  // Populated relation
  subject: SubjectBaseSchema.optional(),
});

export type ContentSubject = z.infer<typeof ContentSubjectSchema>;

/**
 * Subject classification result from AI
 */
export const SubjectClassificationSchema = z.object({
  subjectId: z.string(),
  subjectSlug: z.string(),
  confidence: z.number().min(0).max(1),
  isPrimary: z.boolean(),
});

export type SubjectClassification = z.infer<typeof SubjectClassificationSchema>;

// =============================================================================
// API Request/Response Schemas
// =============================================================================

export const CreateSubjectRequestSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(), // Auto-generated if not provided
  description: z.string().max(500).optional(),
  parentId: z.string().optional(), // Required for level 1-2
  defaultDifficulty: SubjectDifficultyEnum.optional(),
  learningObjectives: z.array(z.string()).optional().default([]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(10).optional(), // Emoji or icon name
});

export type CreateSubjectRequest = z.infer<typeof CreateSubjectRequestSchema>;

export const UpdateSubjectRequestSchema = CreateSubjectRequestSchema.partial();

export type UpdateSubjectRequest = z.infer<typeof UpdateSubjectRequestSchema>;

export const CreateSynonymRequestSchema = z.object({
  term: z.string().min(2).max(100),
  subjectId: z.string(),
});

export type CreateSynonymRequest = z.infer<typeof CreateSynonymRequestSchema>;

export const SubjectContentQuerySchema = z.object({
  contentTypes: z.array(ContentTypeEnum).optional(),
  includeChildren: z.coerce.boolean().optional().default(false),
  primaryOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().positive().max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  sortBy: z.enum(['date', 'significance', 'confidence']).optional().default('date'),
});

export type SubjectContentQuery = z.infer<typeof SubjectContentQuerySchema>;

export const SubjectStatsSchema = z.object({
  subjectSlug: z.string(),
  milestones: z.number(),
  glossaryTerms: z.number(),
  currentEvents: z.number(),
  persons: z.number(),
  organizations: z.number(),
  total: z.number(),
});

export type SubjectStats = z.infer<typeof SubjectStatsSchema>;

export const SubjectTreeResponseSchema = z.array(SubjectBaseSchema.extend({
  children: z.array(SubjectBaseSchema.extend({
    children: z.array(SubjectBaseSchema),
  })),
}));

export type SubjectTreeResponse = z.infer<typeof SubjectTreeResponseSchema>;

export const UpdateContentSubjectsRequestSchema = z.object({
  subjects: z.array(z.object({
    subjectId: z.string(),
    isPrimary: z.boolean().optional().default(false),
  })),
});

export type UpdateContentSubjectsRequest = z.infer<typeof UpdateContentSubjectsRequestSchema>;

// =============================================================================
// Helper Types
// =============================================================================

/**
 * Subject with content counts (for admin views)
 */
export interface SubjectWithCounts extends SubjectBase {
  contentCount: number;
  milestoneCount: number;
  children?: SubjectWithCounts[];
}

/**
 * Flattened subject for lists (includes path for context)
 */
export interface SubjectListItem {
  id: string;
  slug: string;
  name: string;
  path: string;
  level: number;
  color: string | null;
  icon: string | null;
}

/**
 * Subject search result
 */
export interface SubjectSearchResult {
  subject: SubjectBase;
  matchType: 'exact' | 'name' | 'synonym' | 'fuzzy';
  matchedTerm?: string;
}

// =============================================================================
// Display Helpers
// =============================================================================

/**
 * Level display labels
 */
export const SUBJECT_LEVEL_LABELS: Record<number, string> = {
  0: 'Domain',
  1: 'Category',
  2: 'Subcategory',
};

/**
 * Difficulty display labels
 */
export const SUBJECT_DIFFICULTY_LABELS: Record<SubjectDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/**
 * Difficulty badge colors
 */
export const SUBJECT_DIFFICULTY_COLORS: Record<SubjectDifficulty, string> = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

/**
 * Content type display labels
 */
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  milestone: 'Milestone',
  glossary_term: 'Glossary Term',
  current_event: 'News Event',
  person: 'Person',
  organization: 'Organization',
};

/**
 * Content type icons
 */
export const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  milestone: '📍',
  glossary_term: '📖',
  current_event: '📰',
  person: '👤',
  organization: '🏢',
};

/**
 * Default domain colors (if not set on subject)
 */
export const DEFAULT_DOMAIN_COLORS: Record<string, string> = {
  science: '#3B82F6',
  business: '#10B981',
  industry: '#F59E0B',
  policy: '#EF4444',
  research: '#8B5CF6',
};

/**
 * Get color for a subject (uses subject color or domain default)
 */
export function getSubjectColor(subject: SubjectBase): string {
  if (subject.color) return subject.color;
  return DEFAULT_DOMAIN_COLORS[subject.domainSlug] || '#6B7280';
}

/**
 * Get badge style for a subject
 */
export function getSubjectBadgeStyle(subject: SubjectBase): React.CSSProperties {
  const color = getSubjectColor(subject);
  return {
    backgroundColor: `${color}20`,
    color: color,
    borderColor: color,
  };
}

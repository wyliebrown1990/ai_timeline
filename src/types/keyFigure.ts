/**
 * Key Figure Types
 * Sprint 44 - Key Figures Data Foundation
 *
 * Zod schemas and TypeScript types for Key Figures system
 */

import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

export const KeyFigureRoleEnum = z.enum([
  'researcher',
  'executive',
  'founder',
  'policy_maker',
  'engineer',
  'other',
]);

export type KeyFigureRole = z.infer<typeof KeyFigureRoleEnum>;

export const KeyFigureStatusEnum = z.enum([
  'draft',
  'pending_review',
  'published',
]);

export type KeyFigureStatus = z.infer<typeof KeyFigureStatusEnum>;

export const ContributionTypeEnum = z.enum([
  'lead',
  'co_author',
  'advisor',
  'founder',
  'mentioned',
]);

export type ContributionType = z.infer<typeof ContributionTypeEnum>;

export const KeyFigureDraftStatusEnum = z.enum([
  'pending',
  'approved',
  'rejected',
  'merged',
]);

export type KeyFigureDraftStatus = z.infer<typeof KeyFigureDraftStatusEnum>;

// =============================================================================
// Core Schemas
// =============================================================================

export const KeyFigureSchema = z.object({
  id: z.string(), // kebab-case: "geoffrey-hinton"
  canonicalName: z.string().min(2).max(100),
  aliases: z.array(z.string()),
  shortBio: z.string().min(10).max(200),
  fullBio: z.string().optional(),
  primaryOrg: z.string().optional(),
  previousOrgs: z.array(z.string()),
  role: KeyFigureRoleEnum,
  notableFor: z.string().min(10).max(500),
  imageUrl: z.string().url().optional(),
  wikipediaUrl: z.string().url().optional(),
  linkedInUrl: z.string().url().optional(),
  twitterHandle: z.string().max(50).optional(),
  status: KeyFigureStatusEnum,
  sourceArticleId: z.string().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export type KeyFigure = z.infer<typeof KeyFigureSchema>;

export const MilestoneContributorSchema = z.object({
  id: z.string(),
  milestoneId: z.string(),
  keyFigureId: z.string(),
  contributionType: ContributionTypeEnum.optional(),
  keyFigure: KeyFigureSchema.optional(),
});

export type MilestoneContributor = z.infer<typeof MilestoneContributorSchema>;

export const KeyFigureDraftSchema = z.object({
  id: z.string(),
  articleId: z.string(),
  extractedName: z.string(),
  normalizedName: z.string(),
  context: z.string(),
  suggestedBio: z.string().optional(),
  suggestedOrg: z.string().optional(),
  suggestedRole: KeyFigureRoleEnum.optional(),
  matchedFigureId: z.string().optional(),
  matchConfidence: z.number().min(0).max(1).optional(),
  status: KeyFigureDraftStatusEnum,
  reviewNotes: z.string().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  // Populated relations
  matchedFigure: KeyFigureSchema.optional(),
});

export type KeyFigureDraft = z.infer<typeof KeyFigureDraftSchema>;

// =============================================================================
// API Request/Response Schemas
// =============================================================================

export const CreateKeyFigureRequestSchema = z.object({
  canonicalName: z.string().min(2).max(100),
  aliases: z.array(z.string()).optional().default([]),
  shortBio: z.string().min(10).max(200),
  fullBio: z.string().optional(),
  primaryOrg: z.string().optional(),
  previousOrgs: z.array(z.string()).optional().default([]),
  role: KeyFigureRoleEnum,
  notableFor: z.string().min(10).max(500),
  imageUrl: z.string().url().optional(),
  wikipediaUrl: z.string().url().optional(),
  linkedInUrl: z.string().url().optional(),
  twitterHandle: z.string().max(50).optional(),
  status: KeyFigureStatusEnum.optional().default('published'),
});

export type CreateKeyFigureRequest = z.infer<typeof CreateKeyFigureRequestSchema>;

export const UpdateKeyFigureRequestSchema = CreateKeyFigureRequestSchema.partial();

export type UpdateKeyFigureRequest = z.infer<typeof UpdateKeyFigureRequestSchema>;

export const KeyFigureListParamsSchema = z.object({
  status: KeyFigureStatusEnum.optional(),
  role: KeyFigureRoleEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().positive().optional().default(1),
  limit: z.coerce.number().positive().max(100).optional().default(20),
});

export type KeyFigureListParams = z.infer<typeof KeyFigureListParamsSchema>;

export const KeyFigureListResponseSchema = z.object({
  keyFigures: z.array(KeyFigureSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export type KeyFigureListResponse = z.infer<typeof KeyFigureListResponseSchema>;

export const AddContributorRequestSchema = z.object({
  keyFigureId: z.string(),
  contributionType: ContributionTypeEnum.optional(),
});

export type AddContributorRequest = z.infer<typeof AddContributorRequestSchema>;

export const MergeKeyFiguresRequestSchema = z.object({
  primaryId: z.string(),
  secondaryIds: z.array(z.string()).min(1),
});

export type MergeKeyFiguresRequest = z.infer<typeof MergeKeyFiguresRequestSchema>;

// =============================================================================
// Helper Types
// =============================================================================

export interface KeyFigureWithMilestones extends KeyFigure {
  milestoneCount: number;
}

export interface KeyFigureSearchResult {
  keyFigure: KeyFigure;
  matchType: 'exact' | 'alias' | 'fuzzy';
  confidence: number;
}

// Role display labels
export const ROLE_LABELS: Record<KeyFigureRole, string> = {
  researcher: 'Researcher',
  executive: 'Executive',
  founder: 'Founder',
  policy_maker: 'Policy Maker',
  engineer: 'Engineer',
  other: 'Other',
};

// Role badge colors (Tailwind classes) - includes dark mode variants
export const ROLE_COLORS: Record<KeyFigureRole, string> = {
  researcher: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  executive: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  founder: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  policy_maker: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  engineer: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

// Contribution type display labels
export const CONTRIBUTION_LABELS: Record<ContributionType, string> = {
  lead: 'Lead',
  co_author: 'Co-Author',
  advisor: 'Advisor',
  founder: 'Founder',
  mentioned: 'Mentioned',
};

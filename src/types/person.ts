/**
 * Person Types
 * Sprint KPC-1 - Key People & Companies
 *
 * Zod schemas and TypeScript types for Persons (evolved from KeyFigure)
 * Includes structured biography sections and affiliations
 */

import { z } from 'zod';
import { OrganizationSchema } from './organization';

// =============================================================================
// Enums
// =============================================================================

export const PersonRoleEnum = z.enum([
  'researcher',
  'executive',
  'founder',
  'policy_maker',
  'engineer',
  'other',
]);

export type PersonRole = z.infer<typeof PersonRoleEnum>;

export const PersonStatusEnum = z.enum([
  'draft',
  'pending_review',
  'published',
]);

export type PersonStatus = z.infer<typeof PersonStatusEnum>;

export const ContributionTypeEnum = z.enum([
  'lead',
  'co_author',
  'advisor',
  'founder',
  'mentioned',
]);

export type ContributionType = z.infer<typeof ContributionTypeEnum>;

export const PersonDraftStatusEnum = z.enum([
  'pending',
  'approved',
  'rejected',
  'merged',
]);

export type PersonDraftStatus = z.infer<typeof PersonDraftStatusEnum>;

export const CurrentlyDoingChangeTypeEnum = z.enum([
  'new_role',
  'new_project',
  'new_focus',
  'update',
]);

export type CurrentlyDoingChangeType = z.infer<typeof CurrentlyDoingChangeTypeEnum>;

// =============================================================================
// Core Schemas
// =============================================================================

export const AffiliationSchema = z.object({
  id: z.string(),
  personId: z.string(),
  orgId: z.string(),
  role: z.string(),
  startDate: z.string().or(z.date()).optional().nullable(),
  endDate: z.string().or(z.date()).optional().nullable(),
  isCurrent: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  // Populated relation
  organization: OrganizationSchema.optional(),
});

export type Affiliation = z.infer<typeof AffiliationSchema>;

export const PersonSchema = z.object({
  id: z.string(),
  canonicalName: z.string().min(2).max(100),
  slug: z.string(),
  aliases: z.array(z.string()),
  shortBio: z.string().min(10).max(300),
  // Structured biography sections
  background: z.string().optional().nullable(),
  careerHistory: z.string().optional().nullable(),
  contributions: z.string().optional().nullable(),
  philosophy: z.string().optional().nullable(),
  currentlyDoing: z.string().optional().nullable(),
  currentlyDoingUpdatedAt: z.string().or(z.date()).optional().nullable(),
  // Legacy fields (for backwards compatibility with KeyFigure)
  fullBio: z.string().optional().nullable(),
  primaryOrg: z.string().optional().nullable(),
  previousOrgs: z.array(z.string()),
  notableFor: z.string().optional().nullable(),
  // Core fields
  role: PersonRoleEnum,
  focusAreas: z.array(z.string()),
  currentOrgId: z.string().optional().nullable(),
  currentRole: z.string().optional().nullable(),
  // Links
  imageUrl: z.string().url().optional().nullable(),
  wikipediaUrl: z.string().url().optional().nullable(),
  linkedInUrl: z.string().url().optional().nullable(),
  twitterHandle: z.string().max(50).optional().nullable(),
  personalWebsite: z.string().url().optional().nullable(),
  googleScholarUrl: z.string().url().optional().nullable(),
  // Meta
  status: z.string().default('published'),
  sourceArticleId: z.string().optional().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  // Populated relations
  currentOrg: OrganizationSchema.optional().nullable(),
  affiliations: z.array(AffiliationSchema).optional(),
});

export type Person = z.infer<typeof PersonSchema>;

export const MilestoneContributorSchema = z.object({
  id: z.string(),
  milestoneId: z.string(),
  keyFigureId: z.string().optional().nullable(), // Legacy
  personId: z.string().optional().nullable(), // New
  contributionType: ContributionTypeEnum.optional(),
  // Populated relation
  person: PersonSchema.optional(),
});

export type MilestoneContributor = z.infer<typeof MilestoneContributorSchema>;

export const PersonDraftSchema = z.object({
  id: z.string(),
  articleId: z.string(),
  extractedName: z.string(),
  normalizedName: z.string(),
  context: z.string(),
  suggestedBio: z.string().optional().nullable(),
  suggestedOrg: z.string().optional().nullable(),
  suggestedRole: PersonRoleEnum.optional().nullable(),
  matchedPersonId: z.string().optional().nullable(),
  matchConfidence: z.number().min(0).max(1).optional().nullable(),
  status: PersonDraftStatusEnum,
  reviewNotes: z.string().optional().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  // Populated relation
  matchedPerson: PersonSchema.optional().nullable(),
});

export type PersonDraft = z.infer<typeof PersonDraftSchema>;

export const CurrentlyDoingDraftSchema = z.object({
  id: z.string(),
  personId: z.string(),
  proposedText: z.string(),
  sourceArticleId: z.string().optional().nullable(),
  sourceEventId: z.string().optional().nullable(),
  changeType: CurrentlyDoingChangeTypeEnum,
  confidence: z.number().min(0).max(1),
  status: PersonDraftStatusEnum,
  reviewNotes: z.string().optional().nullable(),
  createdAt: z.string().or(z.date()),
  reviewedAt: z.string().or(z.date()).optional().nullable(),
  // Populated relation
  person: PersonSchema.optional(),
});

export type CurrentlyDoingDraft = z.infer<typeof CurrentlyDoingDraftSchema>;

// =============================================================================
// News Event Mention Schemas
// =============================================================================

export const NewsEventPersonMentionSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  personId: z.string(),
  mentionType: z.string().default('mentioned'),
  context: z.string().optional().nullable(),
  createdAt: z.string().or(z.date()),
  // Populated relation
  person: PersonSchema.optional(),
});

export type NewsEventPersonMention = z.infer<typeof NewsEventPersonMentionSchema>;

export const NewsEventOrgMentionSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  orgId: z.string(),
  mentionType: z.string().default('mentioned'),
  context: z.string().optional().nullable(),
  createdAt: z.string().or(z.date()),
  // Populated relation
  organization: OrganizationSchema.optional(),
});

export type NewsEventOrgMention = z.infer<typeof NewsEventOrgMentionSchema>;

// =============================================================================
// API Request/Response Schemas
// =============================================================================

export const CreatePersonRequestSchema = z.object({
  canonicalName: z.string().min(2).max(100),
  aliases: z.array(z.string()).optional().default([]),
  shortBio: z.string().min(10).max(300),
  background: z.string().optional(),
  careerHistory: z.string().optional(),
  contributions: z.string().optional(),
  philosophy: z.string().optional(),
  currentlyDoing: z.string().optional(),
  role: PersonRoleEnum,
  focusAreas: z.array(z.string()).optional().default([]),
  currentOrgId: z.string().optional(),
  currentRole: z.string().optional(),
  imageUrl: z.string().url().optional(),
  wikipediaUrl: z.string().url().optional(),
  linkedInUrl: z.string().url().optional(),
  twitterHandle: z.string().max(50).optional(),
  personalWebsite: z.string().url().optional(),
  googleScholarUrl: z.string().url().optional(),
  status: PersonStatusEnum.optional().default('published'),
});

export type CreatePersonRequest = z.infer<typeof CreatePersonRequestSchema>;

export const UpdatePersonRequestSchema = CreatePersonRequestSchema.partial();

export type UpdatePersonRequest = z.infer<typeof UpdatePersonRequestSchema>;

export const PersonListParamsSchema = z.object({
  status: PersonStatusEnum.optional(),
  role: PersonRoleEnum.optional(),
  focusArea: z.string().optional(),
  orgId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().positive().optional().default(1),
  limit: z.coerce.number().positive().max(100).optional().default(20),
  sort: z.enum(['name', 'recentActivity', 'milestoneCount']).optional().default('name'),
});

export type PersonListParams = z.infer<typeof PersonListParamsSchema>;

export const PersonListResponseSchema = z.object({
  persons: z.array(PersonSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export type PersonListResponse = z.infer<typeof PersonListResponseSchema>;

export const AddAffiliationRequestSchema = z.object({
  orgId: z.string(),
  role: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

export type AddAffiliationRequest = z.infer<typeof AddAffiliationRequestSchema>;

// =============================================================================
// Helper Types
// =============================================================================

export interface PersonWithCounts extends Person {
  milestoneCount: number;
  newsEventCount: number;
}

export interface PersonSearchResult {
  person: Person;
  matchType: 'exact' | 'alias' | 'fuzzy';
  confidence: number;
}

// Role display labels
export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  researcher: 'Researcher',
  executive: 'Executive',
  founder: 'Founder',
  policy_maker: 'Policy Maker',
  engineer: 'Engineer',
  other: 'Other',
};

// Role badge colors (Tailwind classes) - includes dark mode variants
export const PERSON_ROLE_COLORS: Record<PersonRole, string> = {
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

// Change type display labels
export const CHANGE_TYPE_LABELS: Record<CurrentlyDoingChangeType, string> = {
  new_role: 'New Role',
  new_project: 'New Project',
  new_focus: 'New Focus',
  update: 'Update',
};

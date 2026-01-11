/**
 * Organization Types
 * Sprint KPC-1 - Key People & Companies
 *
 * Zod schemas and TypeScript types for Organizations (companies, universities, research labs)
 */

import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

export const OrgTypeEnum = z.enum([
  'company',
  'research_lab',
  'university',
  'nonprofit',
  'government',
]);

export type OrgType = z.infer<typeof OrgTypeEnum>;

export const OrgStatusEnum = z.enum([
  'draft',
  'pending_review',
  'published',
]);

export type OrgStatus = z.infer<typeof OrgStatusEnum>;

// =============================================================================
// Core Schemas
// =============================================================================

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  slug: z.string(),
  type: OrgTypeEnum,
  shortDescription: z.string().min(10).max(500),
  mission: z.string().optional().nullable(),
  history: z.string().optional().nullable(),
  currentFocus: z.string().optional().nullable(),
  currentFocusUpdatedAt: z.string().or(z.date()).optional().nullable(),
  focusAreas: z.array(z.string()),
  products: z.array(z.string()),
  logoUrl: z.string().url().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  wikipediaUrl: z.string().url().optional().nullable(),
  linkedInUrl: z.string().url().optional().nullable(),
  foundedYear: z.number().int().min(1800).max(2100).optional().nullable(),
  headquarters: z.string().optional().nullable(),
  status: z.string().default('published'),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// =============================================================================
// API Request/Response Schemas
// =============================================================================

export const CreateOrganizationRequestSchema = z.object({
  name: z.string().min(1).max(200),
  type: OrgTypeEnum,
  shortDescription: z.string().min(10).max(500),
  mission: z.string().optional(),
  history: z.string().optional(),
  currentFocus: z.string().optional(),
  focusAreas: z.array(z.string()).optional().default([]),
  products: z.array(z.string()).optional().default([]),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  wikipediaUrl: z.string().url().optional(),
  linkedInUrl: z.string().url().optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
  headquarters: z.string().optional(),
  status: OrgStatusEnum.optional().default('published'),
});

export type CreateOrganizationRequest = z.infer<typeof CreateOrganizationRequestSchema>;

export const UpdateOrganizationRequestSchema = CreateOrganizationRequestSchema.partial();

export type UpdateOrganizationRequest = z.infer<typeof UpdateOrganizationRequestSchema>;

export const OrganizationListParamsSchema = z.object({
  status: OrgStatusEnum.optional(),
  type: OrgTypeEnum.optional(),
  focusArea: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().positive().optional().default(1),
  limit: z.coerce.number().positive().max(100).optional().default(20),
  sort: z.enum(['name', 'foundedYear', 'personCount', 'milestoneCount']).optional().default('name'),
});

export type OrganizationListParams = z.infer<typeof OrganizationListParamsSchema>;

export const OrganizationListResponseSchema = z.object({
  organizations: z.array(OrganizationSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export type OrganizationListResponse = z.infer<typeof OrganizationListResponseSchema>;

// =============================================================================
// Helper Types
// =============================================================================

export interface OrganizationWithCounts extends Organization {
  personCount: number;
  milestoneCount: number;
}

// Org type display labels
export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  company: 'Company',
  research_lab: 'Research Lab',
  university: 'University',
  nonprofit: 'Nonprofit',
  government: 'Government',
};

// Org type badge colors (Tailwind classes) - includes dark mode variants
export const ORG_TYPE_COLORS: Record<OrgType, string> = {
  company: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  research_lab: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  university: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  nonprofit: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  government: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

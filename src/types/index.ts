/**
 * Central export point for all application types
 *
 * This file re-exports all type definitions for the AI Timeline application.
 * Import types from '@/types' or 'src/types' for consistent usage.
 */

// Core milestone types and schemas
export * from './milestone';

// Filter types for search and filtering
export * from './filters';

// Sprint 8.5: New content types for AI Fluency Platform

// Learning paths - curated sequences through AI history
export * from './learningPath';

// Glossary entries - term definitions with business context
export * from './glossary';

// Checkpoints - knowledge checks with multiple question types
export * from './checkpoint';

// Current events - news connected to timeline milestones
export * from './currentEvent';

// User profiles - preferences and learning context
export * from './userProfile';

// Flashcard system - user flashcards with spaced repetition
export * from './flashcard';

// Key figures (legacy) - will be deprecated in favor of Person
export * from './keyFigure';

// Sprint KPC-1: People & Companies
// Organizations - companies, universities, research labs
export * from './organization';

// Persons - AI leaders, researchers, executives (evolved from KeyFigure)
// Re-export selectively to avoid conflicts with keyFigure.ts legacy exports
export {
  PersonRoleEnum,
  type PersonRole,
  PersonStatusEnum,
  type PersonStatus,
  PersonDraftStatusEnum,
  type PersonDraftStatus,
  CurrentlyDoingChangeTypeEnum,
  type CurrentlyDoingChangeType,
  AffiliationSchema,
  type Affiliation,
  PersonSchema,
  type Person,
  PersonDraftSchema,
  type PersonDraft,
  CurrentlyDoingDraftSchema,
  type CurrentlyDoingDraft,
  NewsEventPersonMentionSchema,
  type NewsEventPersonMention,
  NewsEventOrgMentionSchema,
  type NewsEventOrgMention,
  CreatePersonRequestSchema,
  type CreatePersonRequest,
  UpdatePersonRequestSchema,
  type UpdatePersonRequest,
  PersonListParamsSchema,
  type PersonListParams,
  PersonListResponseSchema,
  type PersonListResponse,
  AddAffiliationRequestSchema,
  type AddAffiliationRequest,
  type PersonWithCounts,
  type PersonSearchResult,
  PERSON_ROLE_LABELS,
  PERSON_ROLE_COLORS,
  CHANGE_TYPE_LABELS,
} from './person';

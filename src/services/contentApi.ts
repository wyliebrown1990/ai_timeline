/**
 * Content API Service
 *
 * Provides a unified interface for fetching static content.
 * This service wraps the content loader utilities and can be extended
 * to support remote fetching in the future.
 *
 * Architecture Note:
 * Currently uses static JSON loaded at build time. The hook abstraction
 * makes it easy to migrate to server-side fetching when needed.
 */

import * as content from '../content';
import type {
  LearningPath,
  GlossaryEntry,
  Checkpoint,
  Flashcard,
  CurrentEvent,
  MilestoneLayeredContent,
} from '../types';

// =============================================================================
// Response Types
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ContentResponse<T> {
  data: T;
  isLoading: false;
  error: null;
}

/**
 * Loading state
 */
export interface LoadingResponse {
  data: null;
  isLoading: true;
  error: null;
}

/**
 * Error state
 */
export interface ErrorResponse {
  data: null;
  isLoading: false;
  error: Error;
}

export type ApiResponse<T> = ContentResponse<T> | LoadingResponse | ErrorResponse;

// =============================================================================
// Learning Paths API
// =============================================================================

/**
 * Fetch all learning paths
 */
export function fetchLearningPaths(): ContentResponse<LearningPath[]> {
  return {
    data: content.getLearningPaths(),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch a single learning path by ID
 */
export function fetchLearningPath(id: string): ContentResponse<LearningPath | undefined> {
  return {
    data: content.getLearningPath(id),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch learning paths by difficulty
 */
export function fetchLearningPathsByDifficulty(
  difficulty: LearningPath['difficulty']
): ContentResponse<LearningPath[]> {
  return {
    data: content.getLearningPathsByDifficulty(difficulty),
    isLoading: false,
    error: null,
  };
}

// =============================================================================
// Glossary API
// =============================================================================

/**
 * Fetch all glossary terms
 */
export function fetchGlossaryTerms(): ContentResponse<GlossaryEntry[]> {
  return {
    data: content.getGlossaryTerms(),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch a single glossary term by ID
 */
export function fetchGlossaryTerm(id: string): ContentResponse<GlossaryEntry | undefined> {
  return {
    data: content.getGlossaryTerm(id),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch glossary terms by category
 */
export function fetchGlossaryTermsByCategory(
  category: GlossaryEntry['category']
): ContentResponse<GlossaryEntry[]> {
  return {
    data: content.getGlossaryTermsByCategory(category),
    isLoading: false,
    error: null,
  };
}

/**
 * Search glossary terms
 */
export function searchGlossaryTerms(query: string): ContentResponse<GlossaryEntry[]> {
  return {
    data: content.searchGlossaryTerms(query),
    isLoading: false,
    error: null,
  };
}

// =============================================================================
// Checkpoints API
// =============================================================================

/**
 * Fetch all checkpoints
 */
export function fetchCheckpoints(): ContentResponse<Checkpoint[]> {
  return {
    data: content.getCheckpoints(),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch checkpoints for a learning path
 */
export function fetchCheckpointsForPath(pathId: string): ContentResponse<Checkpoint[]> {
  return {
    data: content.getCheckpointsForPath(pathId),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch a single checkpoint by ID
 */
export function fetchCheckpoint(id: string): ContentResponse<Checkpoint | undefined> {
  return {
    data: content.getCheckpoint(id),
    isLoading: false,
    error: null,
  };
}

// =============================================================================
// Flashcards API
// =============================================================================

/**
 * Fetch all flashcards
 */
export function fetchFlashcards(): ContentResponse<Flashcard[]> {
  return {
    data: content.getFlashcards(),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch flashcards by category
 */
export function fetchFlashcardsByCategory(category: string): ContentResponse<Flashcard[]> {
  return {
    data: content.getFlashcardsByCategory(category),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch flashcards related to a milestone
 */
export function fetchFlashcardsForMilestone(milestoneId: string): ContentResponse<Flashcard[]> {
  return {
    data: content.getFlashcardsForMilestone(milestoneId),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch all flashcard categories
 */
export function fetchFlashcardCategories(): ContentResponse<string[]> {
  return {
    data: content.getFlashcardCategories(),
    isLoading: false,
    error: null,
  };
}

// =============================================================================
// Current Events API
// =============================================================================

/**
 * Fetch active current events
 */
export function fetchCurrentEvents(): ContentResponse<CurrentEvent[]> {
  return {
    data: content.getCurrentEvents(),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch featured current events
 */
export function fetchFeaturedCurrentEvents(): ContentResponse<CurrentEvent[]> {
  return {
    data: content.getFeaturedCurrentEvents(),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch a single current event by ID
 */
export function fetchCurrentEvent(id: string): ContentResponse<CurrentEvent | undefined> {
  return {
    data: content.getCurrentEvent(id),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch current events related to a milestone
 */
export function fetchCurrentEventsForMilestone(
  milestoneId: string
): ContentResponse<CurrentEvent[]> {
  return {
    data: content.getCurrentEventsForMilestone(milestoneId),
    isLoading: false,
    error: null,
  };
}

// =============================================================================
// Layered Content API
// =============================================================================

/**
 * Fetch layered content for a milestone
 */
export function fetchLayeredContent(
  milestoneId: string
): ContentResponse<MilestoneLayeredContent | undefined> {
  return {
    data: content.getLayeredContent(milestoneId),
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch all milestone IDs that have layered content
 */
export function fetchMilestonesWithLayeredContent(): ContentResponse<string[]> {
  return {
    data: content.getMilestonesWithLayeredContent(),
    isLoading: false,
    error: null,
  };
}

/**
 * Check if a milestone has layered content
 */
export function checkHasLayeredContent(milestoneId: string): boolean {
  return content.hasLayeredContent(milestoneId);
}

// =============================================================================
// Validation API
// =============================================================================

/**
 * Validate all content
 * Returns validation results for CI/CD and debugging
 */
export function validateAllContent() {
  return content.validateAllContent();
}

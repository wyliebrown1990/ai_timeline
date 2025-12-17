/**
 * React Hooks for Content Access
 *
 * These hooks provide a React-friendly interface for accessing static content.
 * They follow the same patterns as React Query hooks to make future migration
 * to server-side data fetching seamless.
 *
 * Usage:
 *   const { data: paths, isLoading } = useLearningPaths();
 *   const { data: term } = useGlossaryTerm('transformer');
 */

import { useMemo } from 'react';
import * as contentApi from '../services/contentApi';
import type {
  LearningPath,
  GlossaryEntry,
  Checkpoint,
  Flashcard,
  CurrentEvent,
  MilestoneLayeredContent,
} from '../types';

// =============================================================================
// Response Type (matches React Query pattern)
// =============================================================================

interface UseContentResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

// =============================================================================
// Learning Path Hooks
// =============================================================================

/**
 * Get all learning paths
 */
export function useLearningPaths(): UseContentResult<LearningPath[]> {
  return useMemo(() => {
    const response = contentApi.fetchLearningPaths();
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, []);
}

/**
 * Get a single learning path by ID
 */
export function useLearningPath(id: string): UseContentResult<LearningPath | undefined> {
  return useMemo(() => {
    const response = contentApi.fetchLearningPath(id);
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, [id]);
}

/**
 * Get learning paths by difficulty level
 */
export function useLearningPathsByDifficulty(
  difficulty: LearningPath['difficulty']
): UseContentResult<LearningPath[]> {
  return useMemo(() => {
    const response = contentApi.fetchLearningPathsByDifficulty(difficulty);
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, [difficulty]);
}

// =============================================================================
// Glossary Hooks
// =============================================================================

/**
 * Get all glossary terms
 */
export function useGlossary(): UseContentResult<GlossaryEntry[]> {
  return useMemo(() => {
    const response = contentApi.fetchGlossaryTerms();
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, []);
}

/**
 * Get a single glossary term by ID
 */
export function useGlossaryTerm(id: string): UseContentResult<GlossaryEntry | undefined> {
  return useMemo(() => {
    const response = contentApi.fetchGlossaryTerm(id);
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, [id]);
}

/**
 * Get glossary terms by category
 */
export function useGlossaryByCategory(
  category: GlossaryEntry['category']
): UseContentResult<GlossaryEntry[]> {
  return useMemo(() => {
    const response = contentApi.fetchGlossaryTermsByCategory(category);
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, [category]);
}

/**
 * Search glossary terms
 */
export function useGlossarySearch(query: string): UseContentResult<GlossaryEntry[]> {
  return useMemo(() => {
    const response = contentApi.searchGlossaryTerms(query);
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, [query]);
}

// =============================================================================
// Checkpoint Hooks
// =============================================================================

/**
 * Get all checkpoints
 */
export function useCheckpoints(): UseContentResult<Checkpoint[]> {
  return useMemo(() => {
    const response = contentApi.fetchCheckpoints();
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, []);
}

/**
 * Get checkpoints for a specific learning path
 */
export function useCheckpointsForPath(pathId: string): UseContentResult<Checkpoint[]> {
  return useMemo(() => {
    const response = contentApi.fetchCheckpointsForPath(pathId);
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, [pathId]);
}

/**
 * Get a single checkpoint by ID
 */
export function useCheckpoint(id: string): UseContentResult<Checkpoint | undefined> {
  return useMemo(() => {
    const response = contentApi.fetchCheckpoint(id);
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, [id]);
}

// =============================================================================
// Flashcard Hooks
// =============================================================================

/**
 * Get all flashcards
 */
export function useFlashcards(): UseContentResult<Flashcard[]> {
  return useMemo(() => {
    const response = contentApi.fetchFlashcards();
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, []);
}

/**
 * Get flashcards by category
 */
export function useFlashcardsByCategory(category: string): UseContentResult<Flashcard[]> {
  return useMemo(() => {
    const response = contentApi.fetchFlashcardsByCategory(category);
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, [category]);
}

/**
 * Get flashcards related to a milestone
 */
export function useFlashcardsForMilestone(milestoneId: string): UseContentResult<Flashcard[]> {
  return useMemo(() => {
    const response = contentApi.fetchFlashcardsForMilestone(milestoneId);
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, [milestoneId]);
}

/**
 * Get all flashcard categories
 */
export function useFlashcardCategories(): UseContentResult<string[]> {
  return useMemo(() => {
    const response = contentApi.fetchFlashcardCategories();
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, []);
}

// =============================================================================
// Current Events Hooks
// =============================================================================

/**
 * Get active current events
 */
export function useCurrentEvents(): UseContentResult<CurrentEvent[]> {
  return useMemo(() => {
    const response = contentApi.fetchCurrentEvents();
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, []);
}

/**
 * Get featured current events
 */
export function useFeaturedCurrentEvents(): UseContentResult<CurrentEvent[]> {
  return useMemo(() => {
    const response = contentApi.fetchFeaturedCurrentEvents();
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, []);
}

/**
 * Get a single current event by ID
 */
export function useCurrentEvent(id: string): UseContentResult<CurrentEvent | undefined> {
  return useMemo(() => {
    const response = contentApi.fetchCurrentEvent(id);
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, [id]);
}

/**
 * Get current events related to a milestone
 */
export function useCurrentEventsForMilestone(
  milestoneId: string
): UseContentResult<CurrentEvent[]> {
  return useMemo(() => {
    const response = contentApi.fetchCurrentEventsForMilestone(milestoneId);
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, [milestoneId]);
}

// =============================================================================
// Layered Content Hooks
// =============================================================================

/**
 * Get layered content for a milestone
 */
export function useLayeredContent(
  milestoneId: string
): UseContentResult<MilestoneLayeredContent | undefined> {
  return useMemo(() => {
    const response = contentApi.fetchLayeredContent(milestoneId);
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, [milestoneId]);
}

/**
 * Get milestone IDs that have layered content
 */
export function useMilestonesWithLayeredContent(): UseContentResult<string[]> {
  return useMemo(() => {
    const response = contentApi.fetchMilestonesWithLayeredContent();
    return {
      data: response.data,
      isLoading: false,
      error: null,
    };
  }, []);
}

/**
 * Check if a milestone has layered content
 */
export function useHasLayeredContent(milestoneId: string): boolean {
  return useMemo(() => {
    return contentApi.checkHasLayeredContent(milestoneId);
  }, [milestoneId]);
}

/**
 * Async Content Hooks
 *
 * These hooks lazy-load content on demand using dynamic imports.
 * Content is cached after first load for subsequent renders.
 *
 * Usage:
 *   const { data: paths, isLoading } = useAsyncLearningPaths();
 */

import { useState, useEffect, useMemo } from 'react';
import {
  loadLearningPaths,
  loadGlossaryTerms,
  loadCheckpoints,
  loadFlashcards,
  loadCurrentEvents,
  loadLayeredContent,
  isContentCached,
} from '../content/asyncLoaders';
import type {
  LearningPath,
  GlossaryEntry,
  Checkpoint,
  Flashcard,
  CurrentEvent,
  MilestoneLayeredContent,
} from '../types';

// =============================================================================
// Response Type
// =============================================================================

interface AsyncContentResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

// =============================================================================
// Generic Async Loader Hook
// =============================================================================

function useAsyncLoader<T>(
  cacheKey: string,
  loader: () => Promise<T>
): AsyncContentResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(!isContentCached(cacheKey));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    loader()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, loader]);

  return { data, isLoading, error };
}

// =============================================================================
// Learning Path Hooks
// =============================================================================

export function useAsyncLearningPaths(): AsyncContentResult<LearningPath[]> {
  return useAsyncLoader('learningPaths', loadLearningPaths);
}

export function useAsyncLearningPath(
  id: string
): AsyncContentResult<LearningPath | undefined> {
  const { data: paths, isLoading, error } = useAsyncLearningPaths();

  const path = useMemo(() => {
    return paths?.find((p) => p.id === id);
  }, [paths, id]);

  return { data: path ?? null, isLoading, error };
}

// =============================================================================
// Glossary Hooks
// =============================================================================

export function useAsyncGlossary(): AsyncContentResult<GlossaryEntry[]> {
  return useAsyncLoader('glossaryTerms', loadGlossaryTerms);
}

export function useAsyncGlossaryTerm(
  id: string
): AsyncContentResult<GlossaryEntry | undefined> {
  const { data: terms, isLoading, error } = useAsyncGlossary();

  const term = useMemo(() => {
    return terms?.find((t) => t.id === id);
  }, [terms, id]);

  return { data: term ?? null, isLoading, error };
}

// =============================================================================
// Checkpoint Hooks
// =============================================================================

export function useAsyncCheckpoints(): AsyncContentResult<Checkpoint[]> {
  return useAsyncLoader('checkpoints', loadCheckpoints);
}

export function useAsyncCheckpointsForPath(
  pathId: string
): AsyncContentResult<Checkpoint[]> {
  const { data: checkpoints, isLoading, error } = useAsyncCheckpoints();

  const filtered = useMemo(() => {
    return checkpoints?.filter((cp) => cp.pathId === pathId) ?? null;
  }, [checkpoints, pathId]);

  return { data: filtered, isLoading, error };
}

// =============================================================================
// Flashcard Hooks
// =============================================================================

export function useAsyncFlashcards(): AsyncContentResult<Flashcard[]> {
  return useAsyncLoader('flashcards', loadFlashcards);
}

export function useAsyncFlashcardCategories(): AsyncContentResult<string[]> {
  const { data: flashcards, isLoading, error } = useAsyncFlashcards();

  const categories = useMemo(() => {
    if (!flashcards) return null;
    const cats = new Set(flashcards.map((card) => card.category));
    return Array.from(cats).sort();
  }, [flashcards]);

  return { data: categories, isLoading, error };
}

// =============================================================================
// Current Events Hooks
// =============================================================================

export function useAsyncCurrentEvents(): AsyncContentResult<CurrentEvent[]> {
  return useAsyncLoader('currentEvents', loadCurrentEvents);
}

export function useAsyncActiveCurrentEvents(): AsyncContentResult<CurrentEvent[]> {
  const { data: events, isLoading, error } = useAsyncCurrentEvents();

  const activeEvents = useMemo(() => {
    if (!events) return null;
    const now = new Date();
    return events.filter((event) => {
      if (!event.expiresAt) return true;
      return new Date(event.expiresAt) > now;
    });
  }, [events]);

  return { data: activeEvents, isLoading, error };
}

// =============================================================================
// Layered Content Hooks
// =============================================================================

export function useAsyncLayeredContentMap(): AsyncContentResult<
  Record<string, MilestoneLayeredContent>
> {
  return useAsyncLoader('layeredContent', loadLayeredContent);
}

export function useAsyncLayeredContent(
  milestoneId: string
): AsyncContentResult<MilestoneLayeredContent | undefined> {
  const { data: contentMap, isLoading, error } = useAsyncLayeredContentMap();

  const content = useMemo(() => {
    return contentMap?.[milestoneId];
  }, [contentMap, milestoneId]);

  return { data: content ?? null, isLoading, error };
}

export function useAsyncMilestonesWithLayeredContent(): AsyncContentResult<string[]> {
  const { data: contentMap, isLoading, error } = useAsyncLayeredContentMap();

  const milestoneIds = useMemo(() => {
    return contentMap ? Object.keys(contentMap) : null;
  }, [contentMap]);

  return { data: milestoneIds, isLoading, error };
}

/**
 * React hooks for Learning Paths, Checkpoints & Current Events APIs
 *
 * Sprint 37 - Database-backed learning content
 * Pattern: React hooks with caching (not React Query)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  learningPathsApi,
  checkpointsApi,
  currentEventsApi,
} from '../services/api';
import type {
  LearningPath,
  LearningPathWithCheckpoints,
  LearningPathDifficulty,
  Checkpoint,
  CurrentEvent,
} from '../services/api';

// Re-export types for convenience
export type {
  LearningPath,
  LearningPathWithCheckpoints,
  LearningPathDifficulty,
  Checkpoint,
  CurrentEvent,
};

interface ApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Cache storage
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const learningPathsCache = new Map<string, CacheEntry<LearningPath[]>>();
const learningPathCache = new Map<string, CacheEntry<LearningPathWithCheckpoints>>();
const checkpointsCache = new Map<string, CacheEntry<Checkpoint[]>>();
const currentEventsCache = new Map<string, CacheEntry<CurrentEvent[]>>();
const featuredEventsCache = { entry: null as CacheEntry<CurrentEvent[]> | null };

function isCacheValid<T>(entry: CacheEntry<T> | null | undefined): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}

// =============================================================================
// Learning Paths Hooks
// =============================================================================

/**
 * Fetch all learning paths with optional difficulty filter
 */
export function useLearningPaths(difficulty?: LearningPathDifficulty): ApiResult<LearningPath[]> {
  const [data, setData] = useState<LearningPath[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheKey = difficulty || 'all';
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    const cached = learningPathsCache.get(cacheKey);
    if (isCacheValid(cached)) {
      setData(cached!.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await learningPathsApi.getAll(difficulty);
      if (isMounted.current) {
        learningPathsCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
        });
        setData(response.data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch learning paths'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [cacheKey, difficulty]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Fetch a single learning path by slug with checkpoints
 */
export function useLearningPath(slug: string | null): ApiResult<LearningPathWithCheckpoints> {
  const [data, setData] = useState<LearningPathWithCheckpoints | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!slug) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const cached = learningPathCache.get(slug);
    if (isCacheValid(cached)) {
      setData(cached!.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await learningPathsApi.getBySlug(slug);
      if (isMounted.current) {
        learningPathCache.set(slug, {
          data: response,
          timestamp: Date.now(),
        });
        setData(response);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch learning path'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [slug]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Fetch learning paths by difficulty
 */
export function useLearningPathsByDifficulty(
  difficulty: LearningPathDifficulty
): ApiResult<LearningPath[]> {
  return useLearningPaths(difficulty);
}

// =============================================================================
// Checkpoints Hooks
// =============================================================================

/**
 * Fetch checkpoints for a learning path
 */
export function useCheckpointsForPath(pathSlug: string | null): ApiResult<Checkpoint[]> {
  const [data, setData] = useState<Checkpoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!pathSlug) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const cached = checkpointsCache.get(pathSlug);
    if (isCacheValid(cached)) {
      setData(cached!.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await checkpointsApi.getForPath(pathSlug);
      if (isMounted.current) {
        checkpointsCache.set(pathSlug, {
          data: response.data,
          timestamp: Date.now(),
        });
        setData(response.data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch checkpoints'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [pathSlug]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// =============================================================================
// Current Events Hooks
// =============================================================================

/**
 * Fetch all current events
 */
export function useCurrentEvents(includeExpired?: boolean): ApiResult<CurrentEvent[]> {
  const [data, setData] = useState<CurrentEvent[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheKey = includeExpired ? 'all' : 'active';
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    const cached = currentEventsCache.get(cacheKey);
    if (isCacheValid(cached)) {
      setData(cached!.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await currentEventsApi.getAll(includeExpired);
      if (isMounted.current) {
        currentEventsCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
        });
        setData(response.data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch current events'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [cacheKey, includeExpired]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Fetch featured current events
 */
export function useFeaturedEvents(limit?: number): ApiResult<CurrentEvent[]> {
  const [data, setData] = useState<CurrentEvent[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (isCacheValid(featuredEventsCache.entry)) {
      setData(featuredEventsCache.entry!.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await currentEventsApi.getFeatured(limit);
      if (isMounted.current) {
        featuredEventsCache.entry = {
          data: response.data,
          timestamp: Date.now(),
        };
        setData(response.data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch featured events'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [limit]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Fetch events related to a specific milestone
 */
export function useEventsForMilestone(milestoneId: string | null): ApiResult<CurrentEvent[]> {
  const [data, setData] = useState<CurrentEvent[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!milestoneId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await currentEventsApi.getForMilestone(milestoneId);
      if (isMounted.current) {
        setData(response.data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch events for milestone'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [milestoneId]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Glossary API Hooks
 *
 * React hooks for fetching glossary data from the database API.
 * These hooks replace the static content hooks for the glossary feature.
 *
 * Sprint 36 - Glossary Frontend Migration
 *
 * Usage:
 *   const { data: terms, isLoading } = useGlossaryTerms();
 *   const { data: term } = useGlossaryTerm(termId);
 */

import { useState, useEffect, useCallback } from 'react';
import { glossaryApi, type GlossaryTerm, type GlossaryCategory } from '../services/api';
import type { GlossaryEntry } from '../types/glossary';

// =============================================================================
// Types
// =============================================================================

interface GlossaryApiResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// =============================================================================
// Transform API response to match existing GlossaryEntry type
// =============================================================================

/**
 * Transform API GlossaryTerm to frontend GlossaryEntry format
 * Ensures compatibility with existing components
 */
function transformToGlossaryEntry(term: GlossaryTerm): GlossaryEntry {
  return {
    id: term.id,
    term: term.term,
    shortDefinition: term.shortDefinition,
    fullDefinition: term.fullDefinition,
    businessContext: term.businessContext || '',
    example: term.example || undefined,
    inMeetingExample: term.inMeetingExample || undefined,
    relatedTermIds: term.relatedTermIds || [],
    relatedMilestoneIds: term.relatedMilestoneIds || [],
    category: term.category as GlossaryEntry['category'],
  };
}

// =============================================================================
// Cache for glossary data to reduce API calls
// =============================================================================

const glossaryCache: {
  terms: GlossaryEntry[] | null;
  timestamp: number | null;
  byId: Map<string, GlossaryEntry>;
} = {
  terms: null,
  timestamp: null,
  byId: new Map(),
};

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

function isCacheValid(): boolean {
  return (
    glossaryCache.terms !== null &&
    glossaryCache.timestamp !== null &&
    Date.now() - glossaryCache.timestamp < CACHE_TTL
  );
}

function clearCache(): void {
  glossaryCache.terms = null;
  glossaryCache.timestamp = null;
  glossaryCache.byId.clear();
}

// =============================================================================
// Main Glossary Hooks
// =============================================================================

/**
 * Fetch all glossary terms from the database API
 * Replaces useGlossary() from useContent.ts
 */
export function useGlossaryTerms(params?: {
  category?: GlossaryCategory;
  search?: string;
}): GlossaryApiResult<GlossaryEntry[]> {
  const [data, setData] = useState<GlossaryEntry[]>(
    isCacheValid() && !params?.category && !params?.search ? glossaryCache.terms! : []
  );
  const [isLoading, setIsLoading] = useState(!isCacheValid() || !!params?.category || !!params?.search);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Stable dependency for params
  const cacheKey = `${params?.category || ''}-${params?.search || ''}`;

  const refetch = useCallback(() => {
    clearCache();
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Use cache if available and no filters applied
    if (isCacheValid() && !params?.category && !params?.search) {
      setData(glossaryCache.terms!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    glossaryApi
      .getAll({
        category: params?.category,
        search: params?.search,
        limit: 500, // Get all terms in one request
      })
      .then((response) => {
        if (cancelled) return;

        const terms = response.data.map(transformToGlossaryEntry);
        setData(terms);
        setIsLoading(false);

        // Update cache only for unfiltered requests
        if (!params?.category && !params?.search) {
          glossaryCache.terms = terms;
          glossaryCache.timestamp = Date.now();
          glossaryCache.byId.clear();
          terms.forEach((term) => glossaryCache.byId.set(term.id, term));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, refetchTrigger]);

  return { data, isLoading, error, refetch };
}

/**
 * Fetch a single glossary term by ID
 * Replaces useGlossaryTerm() from useContent.ts
 */
export function useGlossaryTerm(
  id: string
): GlossaryApiResult<GlossaryEntry | undefined> {
  // First, check cache
  const cachedTerm = glossaryCache.byId.get(id);

  const [data, setData] = useState<GlossaryEntry | undefined>(cachedTerm);
  const [isLoading, setIsLoading] = useState(!cachedTerm && !!id);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(() => {
    glossaryCache.byId.delete(id);
    setData(undefined);
    setIsLoading(true);
  }, [id]);

  useEffect(() => {
    if (!id) {
      setData(undefined);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = glossaryCache.byId.get(id);
    if (cached) {
      setData(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    glossaryApi
      .getById(id)
      .then((term) => {
        if (cancelled) return;
        const entry = transformToGlossaryEntry(term);
        setData(entry);
        setIsLoading(false);
        glossaryCache.byId.set(id, entry);
      })
      .catch((err) => {
        if (cancelled) return;
        // If 404, set data as undefined without error
        if (err?.statusCode === 404) {
          setData(undefined);
          setIsLoading(false);
        } else {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, isLoading, error, refetch };
}

/**
 * Search glossary terms
 * Replaces useGlossarySearch() from useContent.ts
 */
export function useGlossarySearch(
  query: string,
  limit?: number
): GlossaryApiResult<GlossaryEntry[]> {
  const [data, setData] = useState<GlossaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(() => {
    setData([]);
  }, []);

  useEffect(() => {
    // Don't search for short queries
    if (query.length < 2) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    glossaryApi
      .search(query, limit)
      .then((response) => {
        if (cancelled) return;
        const terms = response.data.map(transformToGlossaryEntry);
        setData(terms);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, limit]);

  return { data, isLoading, error, refetch };
}

/**
 * Get glossary terms filtered by category
 * Convenience wrapper around useGlossaryTerms
 */
export function useGlossaryByCategory(
  category: GlossaryCategory
): GlossaryApiResult<GlossaryEntry[]> {
  return useGlossaryTerms({ category });
}

// =============================================================================
// Alias for backward compatibility
// =============================================================================

/**
 * Alias for useGlossaryTerms - matches the naming from useContent.ts
 * Use this as a drop-in replacement for the old useGlossary hook
 */
export function useGlossary(): GlossaryApiResult<GlossaryEntry[]> {
  return useGlossaryTerms();
}

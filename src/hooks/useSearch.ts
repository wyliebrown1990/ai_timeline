/**
 * Search hook with debounced API calls
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { milestonesApi, ApiError } from '../services/api';
import type { SearchResult } from '../types/filters';

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_DELAY = 300;

/**
 * Minimum query length to trigger search
 */
const MIN_QUERY_LENGTH = 2;

/**
 * Hook return type
 */
interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  total: number;
  clearSearch: () => void;
}

/**
 * Custom hook for searching milestones with debounce
 */
export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce the query
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      const trimmedQuery = debouncedQuery.trim();

      if (trimmedQuery.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setTotal(0);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await milestonesApi.search(trimmedQuery);
        setResults(response.data);
        setTotal(response.pagination.total);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Search failed';
        setError(message);
        setResults([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  // Track if currently waiting for debounce
  const isSearching = query !== debouncedQuery;

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setTotal(0);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isSearching,
    error,
    total,
    clearSearch,
  };
}

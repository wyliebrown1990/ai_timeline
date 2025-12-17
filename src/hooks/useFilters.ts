/**
 * Filter hook with URL synchronization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { milestonesApi, ApiError } from '../services/api';
import type { MilestoneCategory, SignificanceLevel, MilestoneResponse } from '../types/milestone';
import type { TimelineFilters, FilterQueryParams, DatePreset } from '../types/filters';
import { DEFAULT_FILTERS, DATE_PRESETS } from '../types/filters';

/**
 * Hook return type
 */
interface UseFiltersReturn {
  filters: TimelineFilters;
  setFilters: (filters: TimelineFilters) => void;
  setCategories: (categories: MilestoneCategory[]) => void;
  setSignificanceLevels: (levels: SignificanceLevel[]) => void;
  setDateRange: (start: Date | null, end: Date | null) => void;
  setDatePreset: (preset: DatePreset) => void;
  setTags: (tags: string[]) => void;
  toggleCategory: (category: MilestoneCategory) => void;
  toggleSignificance: (level: SignificanceLevel) => void;
  toggleTag: (tag: string) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  hasActiveFilters: boolean;
  milestones: MilestoneResponse[];
  isLoading: boolean;
  error: Error | null;
  total: number;
}

/**
 * Safely format date to YYYY-MM-DD string
 */
function formatDateString(date: Date): string {
  const isoString = date.toISOString().split('T')[0];
  return isoString ?? '';
}

/**
 * Parse filters from URL search params
 */
function parseFiltersFromUrl(searchParams: URLSearchParams): TimelineFilters {
  const filters: TimelineFilters = {
    categories: [],
    significanceLevels: [],
    dateRange: { start: null, end: null },
    tags: [],
  };

  // Parse categories
  const categoriesParam = searchParams.get('categories');
  if (categoriesParam) {
    filters.categories = categoriesParam.split(',') as MilestoneCategory[];
  }

  // Parse significance levels
  const significanceParam = searchParams.get('significance');
  if (significanceParam) {
    filters.significanceLevels = significanceParam
      .split(',')
      .map(Number)
      .filter((n) => n >= 1 && n <= 4) as SignificanceLevel[];
  }

  // Parse date range
  const dateStartParam = searchParams.get('dateStart');
  const dateEndParam = searchParams.get('dateEnd');
  if (dateStartParam) {
    const date = new Date(dateStartParam);
    if (!isNaN(date.getTime())) {
      filters.dateRange.start = date;
    }
  }
  if (dateEndParam) {
    const date = new Date(dateEndParam);
    if (!isNaN(date.getTime())) {
      filters.dateRange.end = date;
    }
  }

  // Parse tags
  const tagsParam = searchParams.get('tags');
  if (tagsParam) {
    filters.tags = tagsParam.split(',');
  }

  return filters;
}

/**
 * Convert filters to URL search params
 */
function filtersToSearchParams(filters: TimelineFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.categories.length > 0) {
    params.set('categories', filters.categories.join(','));
  }

  if (filters.significanceLevels.length > 0) {
    params.set('significance', filters.significanceLevels.join(','));
  }

  if (filters.dateRange.start) {
    params.set('dateStart', formatDateString(filters.dateRange.start));
  }

  if (filters.dateRange.end) {
    params.set('dateEnd', formatDateString(filters.dateRange.end));
  }

  if (filters.tags.length > 0) {
    params.set('tags', filters.tags.join(','));
  }

  return params;
}

/**
 * Convert filters to API query params
 */
function filtersToQueryParams(filters: TimelineFilters): FilterQueryParams {
  const params: FilterQueryParams = {};

  if (filters.categories.length > 0) {
    params.categories = filters.categories.join(',');
  }

  if (filters.significanceLevels.length > 0) {
    params.significance = filters.significanceLevels.join(',');
  }

  if (filters.dateRange.start) {
    params.dateStart = formatDateString(filters.dateRange.start);
  }

  if (filters.dateRange.end) {
    params.dateEnd = formatDateString(filters.dateRange.end);
  }

  if (filters.tags.length > 0) {
    params.tags = filters.tags.join(',');
  }

  params.limit = 100; // Get more results when filtering

  return params;
}

/**
 * Custom hook for managing timeline filters with URL synchronization
 */
export function useFilters(): UseFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFiltersState] = useState<TimelineFilters>(() =>
    parseFiltersFromUrl(searchParams)
  );
  const [milestones, setMilestones] = useState<MilestoneResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  // Sync URL params to state on URL change
  useEffect(() => {
    const newFilters = parseFiltersFromUrl(searchParams);
    setFiltersState(newFilters);
  }, [searchParams]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.categories.length > 0 ||
      filters.significanceLevels.length > 0 ||
      filters.dateRange.start !== null ||
      filters.dateRange.end !== null ||
      filters.tags.length > 0
    );
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += filters.categories.length;
    count += filters.significanceLevels.length;
    if (filters.dateRange.start || filters.dateRange.end) count += 1;
    count += filters.tags.length;
    return count;
  }, [filters]);

  // Fetch milestones when filters change
  useEffect(() => {
    const fetchMilestones = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const queryParams = filtersToQueryParams(filters);
        const response = hasActiveFilters
          ? await milestonesApi.getFiltered(queryParams)
          : await milestonesApi.getAll({ limit: 100 });

        setMilestones(response.data);
        setTotal(response.pagination.total);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to fetch milestones';
        setError(new Error(message));
        setMilestones([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMilestones();
  }, [filters, hasActiveFilters]);

  // Update filters and sync to URL
  const setFilters = useCallback(
    (newFilters: TimelineFilters) => {
      setFiltersState(newFilters);
      const params = filtersToSearchParams(newFilters);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  const setCategories = useCallback(
    (categories: MilestoneCategory[]) => {
      setFilters({ ...filters, categories });
    },
    [filters, setFilters]
  );

  const setSignificanceLevels = useCallback(
    (significanceLevels: SignificanceLevel[]) => {
      setFilters({ ...filters, significanceLevels });
    },
    [filters, setFilters]
  );

  const setDateRange = useCallback(
    (start: Date | null, end: Date | null) => {
      setFilters({ ...filters, dateRange: { start, end } });
    },
    [filters, setFilters]
  );

  const setDatePreset = useCallback(
    (preset: DatePreset) => {
      if (preset === 'custom') {
        return;
      }
      const presetConfig = DATE_PRESETS.find((p) => p.key === preset);
      if (presetConfig) {
        const { start, end } = presetConfig.getRange();
        setDateRange(start, end);
      }
    },
    [setDateRange]
  );

  const setTags = useCallback(
    (tags: string[]) => {
      setFilters({ ...filters, tags });
    },
    [filters, setFilters]
  );

  const toggleCategory = useCallback(
    (category: MilestoneCategory) => {
      const newCategories = filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category];
      setCategories(newCategories);
    },
    [filters.categories, setCategories]
  );

  const toggleSignificance = useCallback(
    (level: SignificanceLevel) => {
      const newLevels = filters.significanceLevels.includes(level)
        ? filters.significanceLevels.filter((l) => l !== level)
        : [...filters.significanceLevels, level];
      setSignificanceLevels(newLevels);
    },
    [filters.significanceLevels, setSignificanceLevels]
  );

  const toggleTag = useCallback(
    (tag: string) => {
      const newTags = filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag];
      setTags(newTags);
    },
    [filters.tags, setTags]
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, [setFilters]);

  return {
    filters,
    setFilters,
    setCategories,
    setSignificanceLevels,
    setDateRange,
    setDatePreset,
    setTags,
    toggleCategory,
    toggleSignificance,
    toggleTag,
    resetFilters,
    activeFilterCount,
    hasActiveFilters,
    milestones,
    isLoading,
    error,
    total,
  };
}

/**
 * Hook return type for tags
 */
interface UseTagsReturn {
  data: { data: { tag: string; count: number }[] } | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch all available tags
 */
export function useTags(): UseTagsReturn {
  const [data, setData] = useState<UseTagsReturn['data']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await milestonesApi.getTags();
        setData(response);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to fetch tags';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, []);

  return { data, isLoading, error };
}

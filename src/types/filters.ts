/**
 * Filter types for the AI Timeline search and filtering system
 */

import type { MilestoneCategory, SignificanceLevel } from './milestone';

/**
 * Timeline filter state structure
 */
export interface TimelineFilters {
  categories: MilestoneCategory[];
  significanceLevels: SignificanceLevel[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  tags: string[];
}

/**
 * Search result with highlighting metadata
 */
export interface SearchResult {
  id: string;
  title: string;
  description: string;
  date: string;
  category: MilestoneCategory;
  significance: SignificanceLevel;
  organization: string | null;
  matchedFields: string[];
  snippet?: string;
}

/**
 * Search API response structure
 */
export interface SearchResponse {
  data: SearchResult[];
  query: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Filter API query parameters
 */
export interface FilterQueryParams {
  categories?: string;
  significance?: string;
  dateStart?: string;
  dateEnd?: string;
  tags?: string;
  page?: number;
  limit?: number;
}

/**
 * Default empty filter state
 */
export const DEFAULT_FILTERS: TimelineFilters = {
  categories: [],
  significanceLevels: [],
  dateRange: {
    start: null,
    end: null,
  },
  tags: [],
};

/**
 * Date range presets for quick filtering
 */
export type DatePreset = 'last5years' | 'last10years' | '2020s' | '2010s' | 'before2010' | 'custom';

/**
 * Date preset configuration
 */
export interface DatePresetConfig {
  key: DatePreset;
  label: string;
  getRange: () => { start: Date; end: Date };
}

/**
 * Available date presets
 */
export const DATE_PRESETS: DatePresetConfig[] = [
  {
    key: 'last5years',
    label: 'Last 5 Years',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 5);
      return { start, end };
    },
  },
  {
    key: 'last10years',
    label: 'Last 10 Years',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 10);
      return { start, end };
    },
  },
  {
    key: '2020s',
    label: '2020s',
    getRange: () => ({
      start: new Date('2020-01-01'),
      end: new Date('2029-12-31'),
    }),
  },
  {
    key: '2010s',
    label: '2010s',
    getRange: () => ({
      start: new Date('2010-01-01'),
      end: new Date('2019-12-31'),
    }),
  },
  {
    key: 'before2010',
    label: 'Before 2010',
    getRange: () => ({
      start: new Date('1900-01-01'),
      end: new Date('2009-12-31'),
    }),
  },
];

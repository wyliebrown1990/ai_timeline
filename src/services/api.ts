import type {
  MilestoneResponse,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  MilestoneCategory,
} from '../types/milestone';
import type { SearchResponse, FilterQueryParams } from '../types/filters';

/**
 * API base URL - uses relative URL to work with Vite proxy in development
 * or VITE_API_URL in production
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Check if we're running with static API (production build)
 * In development, Vite proxy handles /api requests to the backend
 * In production, we need .json extension for static files
 */
const IS_STATIC_API = import.meta.env.PROD;

/**
 * Paginated response structure from API
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API error class for consistent error handling
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  console.log('[API] Fetching:', url, '| Static mode:', IS_STATIC_API);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    console.log('[API] Response status:', response.status, 'for', url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error response:', errorText);
      let error = {};
      try {
        error = JSON.parse(errorText);
      } catch {
        // Not JSON
      }
      throw new ApiError(
        response.status,
        (error as { error?: { message?: string } }).error?.message || `HTTP error ${response.status}`,
        (error as { error?: { details?: unknown } }).error?.details
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } catch (err) {
    console.error('[API] Fetch error for', url, ':', err);
    throw err;
  }
}

/**
 * Query parameters for listing milestones
 */
export interface MilestoneQueryParams {
  page?: number;
  limit?: number;
}

/**
 * Milestone API client
 * Provides methods for all CRUD operations on milestones
 */
export const milestonesApi = {
  /**
   * Get all milestones with pagination
   * In production, fetches from static /api/milestones/index.json
   */
  async getAll(params?: MilestoneQueryParams): Promise<PaginatedResponse<MilestoneResponse>> {
    // In production, ignore pagination params - static file has all data
    if (IS_STATIC_API) {
      return fetchJson<PaginatedResponse<MilestoneResponse>>(`${API_BASE}/milestones/index.json`);
    }

    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${API_BASE}/milestones${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<MilestoneResponse>>(url);
  },

  /**
   * Get a single milestone by ID
   */
  async getById(id: string): Promise<MilestoneResponse> {
    return fetchJson<MilestoneResponse>(`${API_BASE}/milestones/${id}`);
  },

  /**
   * Create a new milestone
   */
  async create(data: CreateMilestoneDto): Promise<MilestoneResponse> {
    return fetchJson<MilestoneResponse>(`${API_BASE}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing milestone
   */
  async update(id: string, data: UpdateMilestoneDto): Promise<MilestoneResponse> {
    return fetchJson<MilestoneResponse>(`${API_BASE}/milestones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a milestone
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/milestones/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get milestones by category
   */
  async getByCategory(
    category: MilestoneCategory,
    params?: MilestoneQueryParams
  ): Promise<PaginatedResponse<MilestoneResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${API_BASE}/milestones/category/${category}${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<MilestoneResponse>>(url);
  },

  /**
   * Get milestones by year
   */
  async getByYear(
    year: number,
    params?: MilestoneQueryParams
  ): Promise<PaginatedResponse<MilestoneResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${API_BASE}/milestones/year/${year}${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<MilestoneResponse>>(url);
  },

  /**
   * Search milestones by query string
   */
  async search(
    query: string,
    params?: MilestoneQueryParams
  ): Promise<SearchResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    return fetchJson<SearchResponse>(`${API_BASE}/milestones/search?${searchParams.toString()}`);
  },

  /**
   * Get filtered milestones with advanced options
   * In production, returns all milestones (filtering done client-side)
   */
  async getFiltered(
    filters: FilterQueryParams
  ): Promise<PaginatedResponse<MilestoneResponse>> {
    // In production, fetch all milestones and filter client-side
    if (IS_STATIC_API) {
      const response = await fetchJson<PaginatedResponse<MilestoneResponse>>(
        `${API_BASE}/milestones/filter.json`
      );

      // Apply client-side filtering
      let filtered = response.data;

      if (filters.categories) {
        const cats = filters.categories.split(',');
        filtered = filtered.filter(m => cats.includes(m.category));
      }
      if (filters.significance) {
        const sigs = filters.significance.split(',').map(Number);
        filtered = filtered.filter(m => sigs.includes(m.significance));
      }
      if (filters.dateStart) {
        filtered = filtered.filter(m => m.date >= filters.dateStart!);
      }
      if (filters.dateEnd) {
        filtered = filtered.filter(m => m.date <= filters.dateEnd!);
      }
      if (filters.tags) {
        const tags = filters.tags.split(',');
        filtered = filtered.filter(m =>
          m.tags.some(t => tags.includes(t))
        );
      }

      return {
        data: filtered,
        pagination: {
          page: 1,
          limit: filtered.length,
          total: filtered.length,
          totalPages: 1,
        },
      };
    }

    const searchParams = new URLSearchParams();
    if (filters.categories) searchParams.set('categories', filters.categories);
    if (filters.significance) searchParams.set('significance', filters.significance);
    if (filters.dateStart) searchParams.set('dateStart', filters.dateStart);
    if (filters.dateEnd) searchParams.set('dateEnd', filters.dateEnd);
    if (filters.tags) searchParams.set('tags', filters.tags);
    if (filters.page) searchParams.set('page', String(filters.page));
    if (filters.limit) searchParams.set('limit', String(filters.limit));

    return fetchJson<PaginatedResponse<MilestoneResponse>>(
      `${API_BASE}/milestones/filter?${searchParams.toString()}`
    );
  },

  /**
   * Get all unique tags with counts
   */
  async getTags(): Promise<{ data: { tag: string; count: number }[] }> {
    const ext = IS_STATIC_API ? '.json' : '';
    return fetchJson<{ data: { tag: string; count: number }[] }>(`${API_BASE}/milestones/tags${ext}`);
  },
};

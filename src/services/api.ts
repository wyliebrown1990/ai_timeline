import type {
  MilestoneResponse,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  MilestoneCategory,
} from '../types/milestone';
import type { SearchResponse, FilterQueryParams } from '../types/filters';

/**
 * API base URL for static data (served from S3/CloudFront)
 * Using /data to avoid conflict with /api/* CloudFront route to API Gateway
 */
const STATIC_API_BASE = '/data';

/**
 * API base URL for dynamic endpoints (auth, CRUD operations)
 * In production, uses the API Gateway URL; in development, uses relative URL with Vite proxy
 */
const DYNAMIC_API_BASE = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

/**
 * Check if we're running with static API (production build or forced via env)
 * In development with VITE_USE_STATIC_API=true, uses static JSON files
 * In production, always uses static files from CloudFront
 */
const IS_STATIC_API = import.meta.env.PROD || import.meta.env.VITE_USE_STATIC_API === 'true';

/**
 * Auth token storage key
 */
const AUTH_TOKEN_KEY = 'ai-timeline-admin-token';

/**
 * Get authorization headers from stored token
 */
function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

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
      return fetchJson<PaginatedResponse<MilestoneResponse>>(`${STATIC_API_BASE}/milestones/index.json`);
    }

    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${DYNAMIC_API_BASE}/milestones${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<MilestoneResponse>>(url);
  },

  /**
   * Get a single milestone by ID
   */
  async getById(id: string): Promise<MilestoneResponse> {
    return fetchJson<MilestoneResponse>(`${DYNAMIC_API_BASE}/milestones/${id}`);
  },

  /**
   * Create a new milestone (requires authentication)
   */
  async create(data: CreateMilestoneDto): Promise<MilestoneResponse> {
    return fetchJson<MilestoneResponse>(`${DYNAMIC_API_BASE}/milestones`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing milestone (requires authentication)
   */
  async update(id: string, data: UpdateMilestoneDto): Promise<MilestoneResponse> {
    return fetchJson<MilestoneResponse>(`${DYNAMIC_API_BASE}/milestones/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a milestone (requires authentication)
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${DYNAMIC_API_BASE}/milestones/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
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
    const url = `${DYNAMIC_API_BASE}/milestones/category/${category}${queryString ? `?${queryString}` : ''}`;

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
    const url = `${DYNAMIC_API_BASE}/milestones/year/${year}${queryString ? `?${queryString}` : ''}`;

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

    return fetchJson<SearchResponse>(`${DYNAMIC_API_BASE}/milestones/search?${searchParams.toString()}`);
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
        `${STATIC_API_BASE}/milestones/filter.json`
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
      `${DYNAMIC_API_BASE}/milestones/filter?${searchParams.toString()}`
    );
  },

  /**
   * Get all unique tags with counts
   */
  async getTags(): Promise<{ data: { tag: string; count: number }[] }> {
    const ext = IS_STATIC_API ? '.json' : '';
    return fetchJson<{ data: { tag: string; count: number }[] }>(`${STATIC_API_BASE}/milestones/tags${ext}`);
  },
};

/**
 * News source types
 */
export interface NewsSource {
  id: string;
  name: string;
  url: string;
  feedUrl: string;
  isActive: boolean;
  checkFrequency: number;
  lastCheckedAt: string | null;
  createdAt: string;
  articleCount?: number;
}

export interface CreateSourceDto {
  name: string;
  url: string;
  feedUrl: string;
  isActive?: boolean;
  checkFrequency?: number;
}

export interface UpdateSourceDto {
  name?: string;
  url?: string;
  feedUrl?: string;
  isActive?: boolean;
  checkFrequency?: number;
}

export interface IngestedArticle {
  id: string;
  sourceId: string;
  externalUrl: string;
  title: string;
  content: string;
  publishedAt: string;
  ingestedAt: string;
  analysisStatus: string;
  analyzedAt?: string;
  relevanceScore?: number;
  isMilestoneWorthy: boolean;
  milestoneRationale?: string;
  analysisError?: string;
  reviewStatus: string;
  source: NewsSource;
  drafts?: ContentDraft[];
}

export interface ContentDraft {
  id: string;
  articleId: string;
  contentType: 'milestone' | 'news_event' | 'glossary_term';
  draftData: Record<string, unknown>;
  isValid: boolean;
  validationErrors?: unknown[];
  status: 'pending' | 'approved' | 'rejected' | 'published';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  publishedId?: string;
}

export interface AnalysisStats {
  articles: {
    pending: number;
    analyzing: number;
    complete: number;
    error: number;
    milestoneWorthy: number;
  };
  drafts: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

export interface AnalyzeResult {
  message: string;
  articleId: string;
  screening: {
    relevanceScore: number;
    isMilestoneWorthy: boolean;
    suggestedCategory: string | null;
  };
  draftsCreated: number;
}

export interface AnalyzePendingResult {
  message: string;
  analyzed: number;
  errors: number;
  results: Array<{ articleId: string; success: boolean; error?: string }>;
}

export interface FetchResult {
  message: string;
  created: number;
  skipped: number;
  total: number;
}

/**
 * News Sources API client
 */
export const sourcesApi = {
  /**
   * Get all sources with article counts
   */
  async getAll(): Promise<{ data: NewsSource[] }> {
    return fetchJson<{ data: NewsSource[] }>(`${DYNAMIC_API_BASE}/admin/sources`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get a single source by ID
   */
  async getById(id: string): Promise<NewsSource> {
    return fetchJson<NewsSource>(`${DYNAMIC_API_BASE}/admin/sources/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Create a new source
   */
  async create(data: CreateSourceDto): Promise<NewsSource> {
    return fetchJson<NewsSource>(`${DYNAMIC_API_BASE}/admin/sources`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a source
   */
  async update(id: string, data: UpdateSourceDto): Promise<NewsSource> {
    return fetchJson<NewsSource>(`${DYNAMIC_API_BASE}/admin/sources/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a source
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${DYNAMIC_API_BASE}/admin/sources/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch articles from a specific source
   */
  async fetchArticles(id: string): Promise<FetchResult> {
    return fetchJson<FetchResult>(`${DYNAMIC_API_BASE}/admin/sources/${id}/fetch`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch articles from all active sources
   */
  async fetchAllArticles(): Promise<FetchResult & { results: unknown[] }> {
    return fetchJson<FetchResult & { results: unknown[] }>(`${DYNAMIC_API_BASE}/admin/ingestion/fetch-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },
};

/**
 * Ingested Articles API client
 */
export const articlesApi = {
  /**
   * Get all articles with pagination
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    sourceId?: string;
    analysisStatus?: string;
    reviewStatus?: string;
  }): Promise<PaginatedResponse<IngestedArticle>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.sourceId) searchParams.set('sourceId', params.sourceId);
    if (params?.analysisStatus) searchParams.set('analysisStatus', params.analysisStatus);
    if (params?.reviewStatus) searchParams.set('reviewStatus', params.reviewStatus);

    const queryString = searchParams.toString();
    const url = `${DYNAMIC_API_BASE}/admin/articles${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<IngestedArticle>>(url, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get a single article by ID with drafts
   */
  async getById(id: string): Promise<IngestedArticle> {
    return fetchJson<IngestedArticle>(`${DYNAMIC_API_BASE}/admin/articles/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get analysis statistics
   */
  async getStats(): Promise<AnalysisStats> {
    return fetchJson<AnalysisStats>(`${DYNAMIC_API_BASE}/admin/articles/stats`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Analyze a single article
   */
  async analyze(id: string): Promise<AnalyzeResult> {
    return fetchJson<AnalyzeResult>(`${DYNAMIC_API_BASE}/admin/articles/${id}/analyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Re-analyze an article (delete drafts and redo)
   */
  async reanalyze(id: string): Promise<AnalyzeResult> {
    return fetchJson<AnalyzeResult>(`${DYNAMIC_API_BASE}/admin/articles/${id}/reanalyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Analyze all pending articles
   */
  async analyzePending(limit?: number): Promise<AnalyzePendingResult> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<AnalyzePendingResult>(`${DYNAMIC_API_BASE}/admin/articles/analyze-pending${params}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get drafts for an article
   */
  async getDrafts(id: string): Promise<ContentDraft[]> {
    return fetchJson<ContentDraft[]>(`${DYNAMIC_API_BASE}/admin/articles/${id}/drafts`, {
      headers: getAuthHeaders(),
    });
  },
};

import type {
  MilestoneResponse,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  MilestoneCategory,
} from '../types/milestone';
import type { SearchResponse, FilterQueryParams } from '../types/filters';

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
 * Always uses dynamic API to ensure newly approved milestones appear immediately
 */
export const milestonesApi = {
  /**
   * Get all milestones with pagination
   * Always fetches from database API for real-time data
   */
  async getAll(params?: MilestoneQueryParams): Promise<PaginatedResponse<MilestoneResponse>> {
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
   * Uses database API for server-side filtering with real-time data
   */
  async getFiltered(
    filters: FilterQueryParams
  ): Promise<PaginatedResponse<MilestoneResponse>> {
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
   * Uses database API for real-time tag data
   */
  async getTags(): Promise<{ data: { tag: string; count: number }[] }> {
    return fetchJson<{ data: { tag: string; count: number }[] }>(`${DYNAMIC_API_BASE}/milestones/tags`);
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

/**
 * Duplicate detection reason types
 */
export type DuplicateReason = 'title_match' | 'content_match' | 'url_match';

/**
 * Minimal article info for duplicate reference
 * Avoids circular reference in full IngestedArticle
 */
export interface DuplicateArticleRef {
  id: string;
  title: string;
  source: NewsSource;
  publishedAt: string;
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
  // Duplicate detection fields (Sprint 32)
  isDuplicate: boolean;
  duplicateOfId?: string;
  duplicateOf?: DuplicateArticleRef;
  duplicateScore?: number;
  duplicateReason?: DuplicateReason;
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
   * Get all articles with pagination and filters
   * @param params.isDuplicate - Filter by duplicate status: 'true', 'false', or undefined for all
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    sourceId?: string;
    analysisStatus?: string;
    reviewStatus?: string;
    isDuplicate?: string;
  }): Promise<PaginatedResponse<IngestedArticle>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.sourceId) searchParams.set('sourceId', params.sourceId);
    if (params?.analysisStatus) searchParams.set('analysisStatus', params.analysisStatus);
    if (params?.reviewStatus) searchParams.set('reviewStatus', params.reviewStatus);
    if (params?.isDuplicate) searchParams.set('isDuplicate', params.isDuplicate);

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

  /**
   * Delete a single article
   * If deleting a primary article with duplicates, promotes oldest duplicate
   */
  async delete(id: string): Promise<{ message: string; promotedId?: string }> {
    return fetchJson<{ message: string; promotedId?: string }>(
      `${DYNAMIC_API_BASE}/admin/articles/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
  },

  /**
   * Delete all duplicate articles (keeps primary articles)
   * Returns count of deleted articles
   */
  async deleteAllDuplicates(): Promise<{ message: string; deleted: number }> {
    return fetchJson<{ message: string; deleted: number }>(
      `${DYNAMIC_API_BASE}/admin/articles/delete-duplicates`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
  },
};

/**
 * Review queue types
 */
export interface QueueCounts {
  news_event: number;
  milestone: number;
  glossary_term: number;
  total: number;
  publishedThisWeek: number;
}

export interface DraftWithArticle extends ContentDraft {
  article: IngestedArticle;
}

export interface QueueResponse {
  drafts: DraftWithArticle[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApproveResult {
  message: string;
  draft: ContentDraft;
  publishedId: string;
}

export interface RejectResult {
  message: string;
  draft: ContentDraft;
}

/**
 * Review Queue API client
 */
export const reviewApi = {
  /**
   * Get review queue with filters
   */
  async getQueue(params?: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<QueueResponse> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const queryString = searchParams.toString();
    const url = `${DYNAMIC_API_BASE}/admin/review/queue${queryString ? `?${queryString}` : ''}`;

    return fetchJson<QueueResponse>(url, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get queue counts by type
   */
  async getCounts(): Promise<QueueCounts> {
    return fetchJson<QueueCounts>(`${DYNAMIC_API_BASE}/admin/review/counts`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get a single draft with article context
   */
  async getDraft(id: string): Promise<DraftWithArticle> {
    return fetchJson<DraftWithArticle>(`${DYNAMIC_API_BASE}/admin/review/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Update draft content
   */
  async updateDraft(id: string, draftData: Record<string, unknown>): Promise<DraftWithArticle> {
    return fetchJson<DraftWithArticle>(`${DYNAMIC_API_BASE}/admin/review/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ draftData }),
    });
  },

  /**
   * Approve and publish a draft
   */
  async approve(id: string): Promise<ApproveResult> {
    return fetchJson<ApproveResult>(`${DYNAMIC_API_BASE}/admin/review/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Reject a draft
   */
  async reject(id: string, reason?: string): Promise<RejectResult> {
    return fetchJson<RejectResult>(`${DYNAMIC_API_BASE}/admin/review/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Get recently published items
   */
  async getPublished(params?: {
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<QueueResponse> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const queryString = searchParams.toString();
    const url = `${DYNAMIC_API_BASE}/admin/review/published${queryString ? `?${queryString}` : ''}`;

    return fetchJson<QueueResponse>(url, {
      headers: getAuthHeaders(),
    });
  },
};

/**
 * Glossary term types (Sprint 32)
 */
export type GlossaryCategory =
  | 'core_concept'
  | 'technical_term'
  | 'business_term'
  | 'model_architecture'
  | 'company_product';

export interface GlossaryTerm {
  id: string;
  term: string;
  shortDefinition: string;
  fullDefinition: string;
  businessContext: string | null;
  example: string | null;
  inMeetingExample: string | null;
  category: GlossaryCategory;
  relatedTermIds: string[];
  relatedMilestoneIds: string[];
  createdAt: string;
  updatedAt: string;
  sourceArticleId: string | null;
}

export interface CreateGlossaryTermDto {
  term: string;
  shortDefinition: string;
  fullDefinition: string;
  businessContext?: string;
  example?: string;
  inMeetingExample?: string;
  category: GlossaryCategory;
  relatedTermIds?: string[];
  relatedMilestoneIds?: string[];
  sourceArticleId?: string;
}

export interface UpdateGlossaryTermDto {
  term?: string;
  shortDefinition?: string;
  fullDefinition?: string;
  businessContext?: string | null;
  example?: string | null;
  inMeetingExample?: string | null;
  category?: GlossaryCategory;
  relatedTermIds?: string[];
  relatedMilestoneIds?: string[];
}

export interface GlossaryStats {
  total: number;
  byCategory: Record<string, number>;
}

/**
 * Glossary API client (Sprint 32)
 * Public endpoints for reading, admin endpoints for CRUD
 */
export const glossaryApi = {
  /**
   * Get all glossary terms with optional filtering
   */
  async getAll(params?: {
    category?: GlossaryCategory;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<GlossaryTerm>> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${DYNAMIC_API_BASE}/glossary${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<GlossaryTerm>>(url);
  },

  /**
   * Get a single glossary term by ID
   */
  async getById(id: string): Promise<GlossaryTerm> {
    return fetchJson<GlossaryTerm>(`${DYNAMIC_API_BASE}/glossary/${id}`);
  },

  /**
   * Get a glossary term by name
   */
  async getByName(termName: string): Promise<GlossaryTerm> {
    return fetchJson<GlossaryTerm>(
      `${DYNAMIC_API_BASE}/glossary/term/${encodeURIComponent(termName)}`
    );
  },

  /**
   * Search glossary terms
   */
  async search(query: string, limit?: number): Promise<{ data: GlossaryTerm[]; total: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    if (limit) searchParams.set('limit', String(limit));

    return fetchJson<{ data: GlossaryTerm[]; total: number }>(
      `${DYNAMIC_API_BASE}/glossary/search?${searchParams.toString()}`
    );
  },

  /**
   * Get glossary statistics (admin)
   */
  async getStats(): Promise<GlossaryStats> {
    return fetchJson<GlossaryStats>(`${DYNAMIC_API_BASE}/admin/glossary/stats`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Create a new glossary term (admin)
   */
  async create(data: CreateGlossaryTermDto): Promise<GlossaryTerm> {
    return fetchJson<GlossaryTerm>(`${DYNAMIC_API_BASE}/admin/glossary`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing glossary term (admin)
   */
  async update(id: string, data: UpdateGlossaryTermDto): Promise<GlossaryTerm> {
    return fetchJson<GlossaryTerm>(`${DYNAMIC_API_BASE}/admin/glossary/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a glossary term (admin)
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${DYNAMIC_API_BASE}/admin/glossary/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Bulk create glossary terms (admin, for migration)
   */
  async bulkCreate(
    terms: CreateGlossaryTermDto[]
  ): Promise<{ message: string; created: number; skipped: number; errors: string[] }> {
    return fetchJson<{ message: string; created: number; skipped: number; errors: string[] }>(
      `${DYNAMIC_API_BASE}/admin/glossary/bulk`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ terms }),
      }
    );
  },
};

/**
 * Pipeline monitoring types (Sprint 32.10)
 */
export interface SourceHealth {
  id: string;
  name: string;
  lastCheckedAt: string | null;
  articlesToday: number;
  articlesTotal: number;
  isActive: boolean;
  status: 'ok' | 'warning' | 'error';
}

export interface PipelineSettings {
  ingestionPaused: boolean;
  analysisPaused: boolean;
  lastIngestionRun: string | null;
  lastAnalysisRun: string | null;
}

export interface PipelineStats {
  settings: PipelineSettings;
  ingestion: {
    lastRunAt: string | null;
    nextScheduledAt: string;
    fetchedToday: number;
    fetchedYesterday: number;
    totalArticles: number;
  };
  duplicates: {
    foundToday: number;
    total: number;
    byReason: Record<string, number>;
  };
  analysis: {
    pending: number;
    analyzing: number;
    analyzedToday: number;
    totalAnalyzed: number;
    errors: number;
    errorRate: number;
  };
  sources: SourceHealth[];
}

export interface DuplicateDetectionResult {
  message: string;
  duplicatesFound: number;
  matches: Array<{
    articleId: string;
    duplicateOfId: string;
    score: number;
    reason: string;
  }>;
}

export interface PipelineError {
  id: string;
  errorType: string;
  message: string;
  retryCount: number;
  createdAt: string;
}

export interface ErrorStats {
  total: number;
  unresolved: number;
  byType: Record<string, number>;
  recentErrors: PipelineError[];
}

/**
 * Pipeline Monitoring API client (Sprint 32.10)
 */
export const pipelineApi = {
  /**
   * Get comprehensive pipeline monitoring stats
   */
  async getStats(): Promise<PipelineStats> {
    return fetchJson<PipelineStats>(`${DYNAMIC_API_BASE}/admin/pipeline/stats`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Trigger manual ingestion run
   */
  async triggerIngestion(): Promise<{ message: string; note?: string }> {
    return fetchJson<{ message: string; note?: string }>(
      `${DYNAMIC_API_BASE}/admin/pipeline/ingest`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
  },

  /**
   * Trigger manual duplicate detection
   */
  async triggerDuplicateDetection(): Promise<DuplicateDetectionResult> {
    return fetchJson<DuplicateDetectionResult>(
      `${DYNAMIC_API_BASE}/admin/pipeline/detect-duplicates`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
  },

  /**
   * Get pipeline error statistics
   */
  async getErrors(): Promise<ErrorStats> {
    return fetchJson<ErrorStats>(`${DYNAMIC_API_BASE}/admin/pipeline/errors`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Clear all unresolved pipeline errors
   */
  async clearErrors(): Promise<{ message: string; cleared: number }> {
    return fetchJson<{ message: string; cleared: number }>(
      `${DYNAMIC_API_BASE}/admin/pipeline/errors/clear`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
  },

  /**
   * Toggle ingestion pause state
   */
  async setIngestionPaused(
    paused: boolean
  ): Promise<{ message: string; settings: { ingestionPaused: boolean; analysisPaused: boolean } }> {
    return fetchJson<{
      message: string;
      settings: { ingestionPaused: boolean; analysisPaused: boolean };
    }>(`${DYNAMIC_API_BASE}/admin/pipeline/ingestion/pause`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ paused }),
    });
  },

  /**
   * Toggle analysis pause state
   */
  async setAnalysisPaused(
    paused: boolean
  ): Promise<{ message: string; settings: { ingestionPaused: boolean; analysisPaused: boolean } }> {
    return fetchJson<{
      message: string;
      settings: { ingestionPaused: boolean; analysisPaused: boolean };
    }>(`${DYNAMIC_API_BASE}/admin/pipeline/analysis/pause`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ paused }),
    });
  },

  /**
   * Trigger manual analysis run
   */
  async triggerAnalysis(
    limit?: number
  ): Promise<{
    message: string;
    analyzed: number;
    errors: number;
    results: Array<{ articleId: string; success: boolean; error?: string }>;
  }> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<{
      message: string;
      analyzed: number;
      errors: number;
      results: Array<{ articleId: string; success: boolean; error?: string }>;
    }>(`${DYNAMIC_API_BASE}/admin/pipeline/analyze${params}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },
};

// =============================================================================
// Flashcard API (Sprint 36)
// =============================================================================

/**
 * Flashcard category types
 */
export type FlashcardCategory =
  | 'core_concept'
  | 'technical_term'
  | 'business_term'
  | 'model_architecture'
  | 'company_product';

/**
 * Flashcard from database
 */
export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  category: FlashcardCategory;
  relatedMilestoneIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Prebuilt deck difficulty levels
 */
export type DeckDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Card source types in a deck
 */
export type CardSourceType = 'milestone' | 'concept' | 'custom' | 'flashcard';

/**
 * A card within a prebuilt deck
 */
export interface PrebuiltDeckCard {
  id: string;
  deckId: string;
  cardId: string;
  sourceType: CardSourceType;
  sourceId: string;
  customTerm: string | null;
  customDefinition: string | null;
  sortOrder: number;
  // Resolved content (when fetched with deck)
  term?: string;
  definition?: string;
}

/**
 * Prebuilt flashcard deck
 */
export interface PrebuiltDeck {
  id: string;
  name: string;
  description: string;
  difficulty: DeckDifficulty;
  cardCount: number;
  estimatedMinutes: number;
  previewCardIds: string[];
  createdAt: string;
  updatedAt: string;
  cards?: PrebuiltDeckCard[];
}

/**
 * Flashcard statistics
 */
export interface FlashcardStats {
  totalCards: number;
  byCategory: Record<string, number>;
  totalDecks: number;
  byDifficulty: Record<string, number>;
}

/**
 * DTO for creating a flashcard
 */
export interface CreateFlashcardDto {
  term: string;
  definition: string;
  category: FlashcardCategory;
  relatedMilestoneIds?: string[];
}

/**
 * DTO for updating a flashcard
 */
export interface UpdateFlashcardDto {
  term?: string;
  definition?: string;
  category?: FlashcardCategory;
  relatedMilestoneIds?: string[];
}

/**
 * Flashcard API client (Sprint 36)
 * Public endpoints for reading, admin endpoints for CRUD
 */
export const flashcardsApi = {
  /**
   * Get all flashcards with optional filtering
   */
  async getAll(params?: {
    category?: FlashcardCategory;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Flashcard>> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${DYNAMIC_API_BASE}/flashcards${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<Flashcard>>(url);
  },

  /**
   * Get a single flashcard by ID
   */
  async getById(id: string): Promise<Flashcard> {
    return fetchJson<Flashcard>(`${DYNAMIC_API_BASE}/flashcards/${id}`);
  },

  /**
   * Get flashcards by category
   */
  async getByCategory(category: FlashcardCategory): Promise<{ data: Flashcard[] }> {
    return fetchJson<{ data: Flashcard[] }>(
      `${DYNAMIC_API_BASE}/flashcards?category=${category}&limit=200`
    );
  },

  /**
   * Get flashcard statistics (admin)
   */
  async getStats(): Promise<FlashcardStats> {
    return fetchJson<FlashcardStats>(`${DYNAMIC_API_BASE}/admin/flashcards/stats`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Create a new flashcard (admin)
   */
  async create(data: CreateFlashcardDto): Promise<Flashcard> {
    return fetchJson<Flashcard>(`${DYNAMIC_API_BASE}/admin/flashcards`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing flashcard (admin)
   */
  async update(id: string, data: UpdateFlashcardDto): Promise<Flashcard> {
    return fetchJson<Flashcard>(`${DYNAMIC_API_BASE}/admin/flashcards/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a flashcard (admin)
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${DYNAMIC_API_BASE}/admin/flashcards/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Bulk create flashcards (admin, for migration)
   */
  async bulkCreate(
    cards: CreateFlashcardDto[]
  ): Promise<{ message: string; created: number; skipped: number; errors: string[] }> {
    return fetchJson<{ message: string; created: number; skipped: number; errors: string[] }>(
      `${DYNAMIC_API_BASE}/admin/flashcards/bulk`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ cards }),
      }
    );
  },
};

/**
 * DTO for creating a prebuilt deck
 */
export interface CreateDeckDto {
  name: string;
  description: string;
  difficulty: DeckDifficulty;
  cardCount: number;
  estimatedMinutes: number;
  previewCardIds?: string[];
}

/**
 * DTO for updating a prebuilt deck
 */
export interface UpdateDeckDto {
  name?: string;
  description?: string;
  difficulty?: DeckDifficulty;
  cardCount?: number;
  estimatedMinutes?: number;
  previewCardIds?: string[];
}

/**
 * DTO for adding a card to a deck
 */
export interface AddCardToDeckDto {
  cardId: string;
  sourceType: CardSourceType;
  sourceId: string;
  customTerm?: string;
  customDefinition?: string;
  sortOrder?: number;
}

/**
 * Prebuilt Decks API client (Sprint 36)
 * Public endpoints for reading, admin endpoints for CRUD
 */
export const decksApi = {
  /**
   * Get all prebuilt decks
   */
  async getAll(difficulty?: DeckDifficulty): Promise<{ data: PrebuiltDeck[] }> {
    const params = difficulty ? `?difficulty=${difficulty}` : '';
    return fetchJson<{ data: PrebuiltDeck[] }>(`${DYNAMIC_API_BASE}/decks${params}`);
  },

  /**
   * Get a single deck by ID (includes cards)
   */
  async getById(id: string): Promise<PrebuiltDeck> {
    return fetchJson<PrebuiltDeck>(`${DYNAMIC_API_BASE}/decks/${id}`);
  },

  /**
   * Get cards for a deck
   */
  async getCards(deckId: string): Promise<PrebuiltDeckCard[]> {
    return fetchJson<PrebuiltDeckCard[]>(`${DYNAMIC_API_BASE}/decks/${deckId}/cards`);
  },

  /**
   * Create a new deck (admin)
   */
  async create(data: CreateDeckDto): Promise<PrebuiltDeck> {
    return fetchJson<PrebuiltDeck>(`${DYNAMIC_API_BASE}/admin/decks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing deck (admin)
   */
  async update(id: string, data: UpdateDeckDto): Promise<PrebuiltDeck> {
    return fetchJson<PrebuiltDeck>(`${DYNAMIC_API_BASE}/admin/decks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a deck (admin)
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${DYNAMIC_API_BASE}/admin/decks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Add a card to a deck (admin)
   */
  async addCard(deckId: string, data: AddCardToDeckDto): Promise<PrebuiltDeckCard> {
    return fetchJson<PrebuiltDeckCard>(`${DYNAMIC_API_BASE}/admin/decks/${deckId}/cards`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove a card from a deck (admin)
   */
  async removeCard(deckId: string, cardId: string): Promise<void> {
    return fetchJson<void>(`${DYNAMIC_API_BASE}/admin/decks/${deckId}/cards/${cardId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },
};

import type {
  MilestoneResponse,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  MilestoneCategory,
} from '../types/milestone';
import type { SearchResponse, FilterQueryParams } from '../types/filters';

/**
 * API base URL for all endpoints
 * In production, uses the API Gateway URL; in development, uses relative URL with Vite proxy
 *
 * Sprint 39: Removed static JSON fallback - all content now served from database API
 */
const API_BASE = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

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
  console.log('[API] Fetching:', url);

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
      let errorData: Record<string, unknown> = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Not JSON
      }
      // Extract message from either nested or flat error structure
      const message =
        (errorData.error as { message?: string })?.message ||
        (typeof errorData.error === 'string' ? errorData.error : null) ||
        `HTTP error ${response.status}`;
      // Store full error data in details for access to fields like existingId
      throw new ApiError(response.status, message, errorData);
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
   * Create a new milestone (requires authentication)
   */
  async create(data: CreateMilestoneDto): Promise<MilestoneResponse> {
    return fetchJson<MilestoneResponse>(`${API_BASE}/milestones`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing milestone (requires authentication)
   */
  async update(id: string, data: UpdateMilestoneDto): Promise<MilestoneResponse> {
    return fetchJson<MilestoneResponse>(`${API_BASE}/milestones/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a milestone (requires authentication)
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/milestones/${id}`, {
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
      `${API_BASE}/milestones/filter?${searchParams.toString()}`
    );
  },

  /**
   * Get all unique tags with counts
   * Uses database API for real-time tag data
   */
  async getTags(): Promise<{ data: { tag: string; count: number }[] }> {
    return fetchJson<{ data: { tag: string; count: number }[] }>(`${API_BASE}/milestones/tags`);
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
  externalUrl: string;
  source: NewsSource | null;
  publishedAt: string;
}

export interface IngestedArticle {
  id: string;
  sourceId: string | null;
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
  source: NewsSource | null;
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
    return fetchJson<{ data: NewsSource[] }>(`${API_BASE}/admin/sources`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get a single source by ID
   */
  async getById(id: string): Promise<NewsSource> {
    return fetchJson<NewsSource>(`${API_BASE}/admin/sources/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Create a new source
   */
  async create(data: CreateSourceDto): Promise<NewsSource> {
    return fetchJson<NewsSource>(`${API_BASE}/admin/sources`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a source
   */
  async update(id: string, data: UpdateSourceDto): Promise<NewsSource> {
    return fetchJson<NewsSource>(`${API_BASE}/admin/sources/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a source
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/admin/sources/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch articles from a specific source
   */
  async fetchArticles(id: string): Promise<FetchResult> {
    return fetchJson<FetchResult>(`${API_BASE}/admin/sources/${id}/fetch`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch articles from all active sources
   */
  async fetchAllArticles(): Promise<FetchResult & { results: unknown[] }> {
    return fetchJson<FetchResult & { results: unknown[] }>(`${API_BASE}/admin/ingestion/fetch-all`, {
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
    const url = `${API_BASE}/admin/articles${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<IngestedArticle>>(url, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get a single article by ID with drafts
   */
  async getById(id: string): Promise<IngestedArticle> {
    return fetchJson<IngestedArticle>(`${API_BASE}/admin/articles/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get analysis statistics
   */
  async getStats(): Promise<AnalysisStats> {
    return fetchJson<AnalysisStats>(`${API_BASE}/admin/articles/stats`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Analyze a single article
   */
  async analyze(id: string): Promise<AnalyzeResult> {
    return fetchJson<AnalyzeResult>(`${API_BASE}/admin/articles/${id}/analyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Re-analyze an article (delete drafts and redo)
   */
  async reanalyze(id: string): Promise<AnalyzeResult> {
    return fetchJson<AnalyzeResult>(`${API_BASE}/admin/articles/${id}/reanalyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Analyze all pending articles
   */
  async analyzePending(limit?: number): Promise<AnalyzePendingResult> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<AnalyzePendingResult>(`${API_BASE}/admin/articles/analyze-pending${params}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get drafts for an article
   */
  async getDrafts(id: string): Promise<ContentDraft[]> {
    return fetchJson<ContentDraft[]>(`${API_BASE}/admin/articles/${id}/drafts`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Delete a single article
   * If deleting a primary article with duplicates, promotes oldest duplicate
   */
  async delete(id: string): Promise<{ message: string; promotedId?: string }> {
    return fetchJson<{ message: string; promotedId?: string }>(
      `${API_BASE}/admin/articles/${id}`,
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
      `${API_BASE}/admin/articles/delete-duplicates`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
  },

  /**
   * Submit an article manually (paste content + source URL)
   * Creates an IngestedArticle without a NewsSource and optionally triggers analysis
   */
  async submit(data: {
    sourceUrl: string;
    title?: string;
    content: string;
    analyzeImmediately?: boolean;
  }): Promise<{
    success: boolean;
    articleId: string;
    analysisStatus: 'pending' | 'complete' | 'error';
    screening?: {
      relevanceScore: number;
      isMilestoneWorthy: boolean;
      suggestedCategory: string | null;
    };
    drafts: Array<{ id: string; contentType: string }>;
    message?: string;
    error?: string;
  }> {
    return fetchJson<{
      success: boolean;
      articleId: string;
      analysisStatus: 'pending' | 'complete' | 'error';
      screening?: {
        relevanceScore: number;
        isMilestoneWorthy: boolean;
        suggestedCategory: string | null;
      };
      drafts: Array<{ id: string; contentType: string }>;
      message?: string;
      error?: string;
    }>(`${API_BASE}/admin/articles/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Scrape article content from a URL using Jina Reader API
   * Sprint 41: URL Scraper Integration
   */
  async scrape(data: {
    url: string;
    submitForAnalysis?: boolean;
  }): Promise<{
    success: boolean;
    title?: string;
    content?: string;
    wordCount?: number;
    error?: string;
    articleId?: string;
    analysisStatus?: 'complete' | 'error';
    screening?: {
      relevanceScore: number;
      isMilestoneWorthy: boolean;
      suggestedCategory: string | null;
    };
    drafts?: Array<{ id: string; contentType: string }>;
  }> {
    return fetchJson<{
      success: boolean;
      title?: string;
      content?: string;
      wordCount?: number;
      error?: string;
      articleId?: string;
      analysisStatus?: 'complete' | 'error';
      screening?: {
        relevanceScore: number;
        isMilestoneWorthy: boolean;
        suggestedCategory: string | null;
      };
      drafts?: Array<{ id: string; contentType: string }>;
    }>(`${API_BASE}/admin/articles/scrape`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
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
    const url = `${API_BASE}/admin/review/queue${queryString ? `?${queryString}` : ''}`;

    return fetchJson<QueueResponse>(url, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get queue counts by type
   */
  async getCounts(): Promise<QueueCounts> {
    return fetchJson<QueueCounts>(`${API_BASE}/admin/review/counts`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get a single draft with article context
   */
  async getDraft(id: string): Promise<DraftWithArticle> {
    return fetchJson<DraftWithArticle>(`${API_BASE}/admin/review/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Update draft content
   */
  async updateDraft(id: string, draftData: Record<string, unknown>): Promise<DraftWithArticle> {
    return fetchJson<DraftWithArticle>(`${API_BASE}/admin/review/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ draftData }),
    });
  },

  /**
   * Approve and publish a draft
   */
  async approve(id: string): Promise<ApproveResult> {
    return fetchJson<ApproveResult>(`${API_BASE}/admin/review/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Reject a draft
   */
  async reject(id: string, reason?: string): Promise<RejectResult> {
    return fetchJson<RejectResult>(`${API_BASE}/admin/review/${id}/reject`, {
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
    const url = `${API_BASE}/admin/review/published${queryString ? `?${queryString}` : ''}`;

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
    const url = `${API_BASE}/glossary${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<GlossaryTerm>>(url);
  },

  /**
   * Get a single glossary term by ID
   */
  async getById(id: string): Promise<GlossaryTerm> {
    return fetchJson<GlossaryTerm>(`${API_BASE}/glossary/${id}`);
  },

  /**
   * Get a glossary term by name
   */
  async getByName(termName: string): Promise<GlossaryTerm> {
    return fetchJson<GlossaryTerm>(
      `${API_BASE}/glossary/term/${encodeURIComponent(termName)}`
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
      `${API_BASE}/glossary/search?${searchParams.toString()}`
    );
  },

  /**
   * Get glossary statistics (admin)
   */
  async getStats(): Promise<GlossaryStats> {
    return fetchJson<GlossaryStats>(`${API_BASE}/admin/glossary/stats`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Create a new glossary term (admin)
   */
  async create(data: CreateGlossaryTermDto): Promise<GlossaryTerm> {
    return fetchJson<GlossaryTerm>(`${API_BASE}/admin/glossary`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing glossary term (admin)
   */
  async update(id: string, data: UpdateGlossaryTermDto): Promise<GlossaryTerm> {
    return fetchJson<GlossaryTerm>(`${API_BASE}/admin/glossary/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a glossary term (admin)
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/admin/glossary/${id}`, {
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
      `${API_BASE}/admin/glossary/bulk`,
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
    return fetchJson<PipelineStats>(`${API_BASE}/admin/pipeline/stats`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Trigger manual ingestion run
   */
  async triggerIngestion(): Promise<{ message: string; note?: string }> {
    return fetchJson<{ message: string; note?: string }>(
      `${API_BASE}/admin/pipeline/ingest`,
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
      `${API_BASE}/admin/pipeline/detect-duplicates`,
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
    return fetchJson<ErrorStats>(`${API_BASE}/admin/pipeline/errors`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Clear all unresolved pipeline errors
   */
  async clearErrors(): Promise<{ message: string; cleared: number }> {
    return fetchJson<{ message: string; cleared: number }>(
      `${API_BASE}/admin/pipeline/errors/clear`,
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
    }>(`${API_BASE}/admin/pipeline/ingestion/pause`, {
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
    }>(`${API_BASE}/admin/pipeline/analysis/pause`, {
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
    }>(`${API_BASE}/admin/pipeline/analyze${params}`, {
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
    const url = `${API_BASE}/flashcards${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<Flashcard>>(url);
  },

  /**
   * Get a single flashcard by ID
   */
  async getById(id: string): Promise<Flashcard> {
    return fetchJson<Flashcard>(`${API_BASE}/flashcards/${id}`);
  },

  /**
   * Get flashcards by category
   */
  async getByCategory(category: FlashcardCategory): Promise<{ data: Flashcard[] }> {
    return fetchJson<{ data: Flashcard[] }>(
      `${API_BASE}/flashcards?category=${category}&limit=200`
    );
  },

  /**
   * Get flashcard statistics (admin)
   */
  async getStats(): Promise<FlashcardStats> {
    return fetchJson<FlashcardStats>(`${API_BASE}/admin/flashcards/stats`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Create a new flashcard (admin)
   */
  async create(data: CreateFlashcardDto): Promise<Flashcard> {
    return fetchJson<Flashcard>(`${API_BASE}/admin/flashcards`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing flashcard (admin)
   */
  async update(id: string, data: UpdateFlashcardDto): Promise<Flashcard> {
    return fetchJson<Flashcard>(`${API_BASE}/admin/flashcards/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a flashcard (admin)
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/admin/flashcards/${id}`, {
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
      `${API_BASE}/admin/flashcards/bulk`,
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
    return fetchJson<{ data: PrebuiltDeck[] }>(`${API_BASE}/decks${params}`);
  },

  /**
   * Get a single deck by ID (includes cards)
   */
  async getById(id: string): Promise<PrebuiltDeck> {
    return fetchJson<PrebuiltDeck>(`${API_BASE}/decks/${id}`);
  },

  /**
   * Get cards for a deck
   */
  async getCards(deckId: string): Promise<PrebuiltDeckCard[]> {
    return fetchJson<PrebuiltDeckCard[]>(`${API_BASE}/decks/${deckId}/cards`);
  },

  /**
   * Create a new deck (admin)
   */
  async create(data: CreateDeckDto): Promise<PrebuiltDeck> {
    return fetchJson<PrebuiltDeck>(`${API_BASE}/admin/decks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing deck (admin)
   */
  async update(id: string, data: UpdateDeckDto): Promise<PrebuiltDeck> {
    return fetchJson<PrebuiltDeck>(`${API_BASE}/admin/decks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a deck (admin)
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/admin/decks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Add a card to a deck (admin)
   */
  async addCard(deckId: string, data: AddCardToDeckDto): Promise<PrebuiltDeckCard> {
    return fetchJson<PrebuiltDeckCard>(`${API_BASE}/admin/decks/${deckId}/cards`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove a card from a deck (admin)
   */
  async removeCard(deckId: string, cardId: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/admin/decks/${deckId}/cards/${cardId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },
};

// =============================================================================
// Learning Paths, Checkpoints & Current Events API (Sprint 37)
// =============================================================================

export type LearningPathDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface LearningPath {
  id: string;
  slug: string;
  title: string;
  description: string;
  targetAudience: string;
  milestoneIds: string[];
  estimatedMinutes: number;
  difficulty: LearningPathDifficulty;
  suggestedNextPathIds: string[];
  keyTakeaways: string[];
  conceptsCovered: string[];
  icon?: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckpointQuestion {
  type: 'multiple_choice' | 'ordering' | 'matching' | 'explain_back';
  id: string;
  question?: string;
  prompt?: string;
  options?: string[];
  correctIndex?: number;
  items?: Array<{ id: string; label: string; date?: string }>;
  correctOrder?: string[];
  pairs?: Array<{ id: string; left: string; right: string }>;
  explanation?: string;
  rubric?: string;
  concept?: string;
}

export interface Checkpoint {
  id: string;
  title: string;
  pathId: string;
  afterMilestoneId: string;
  questions: CheckpointQuestion[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPathWithCheckpoints extends LearningPath {
  checkpoints: Checkpoint[];
}

export interface CurrentEvent {
  id: string;
  headline: string;
  summary: string;
  sourceUrl?: string;
  sourcePublisher?: string;
  publishedDate: string;
  prerequisiteMilestoneIds: string[];
  connectionExplanation: string;
  featured: boolean;
  expiresAt?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Learning Paths API client
 */
export const learningPathsApi = {
  /**
   * Get all learning paths
   */
  async getAll(difficulty?: LearningPathDifficulty): Promise<{ data: LearningPath[] }> {
    const params = difficulty ? `?difficulty=${difficulty}` : '';
    return fetchJson<{ data: LearningPath[] }>(`${API_BASE}/learning-paths${params}`);
  },

  /**
   * Get a single learning path by slug with checkpoints
   */
  async getBySlug(slug: string): Promise<LearningPathWithCheckpoints> {
    return fetchJson<LearningPathWithCheckpoints>(`${API_BASE}/learning-paths/${slug}`);
  },

  /**
   * Get paths by difficulty
   */
  async getByDifficulty(difficulty: LearningPathDifficulty): Promise<{ data: LearningPath[] }> {
    return fetchJson<{ data: LearningPath[] }>(`${API_BASE}/learning-paths/difficulty/${difficulty}`);
  },
};

/**
 * Checkpoints API client
 */
export const checkpointsApi = {
  /**
   * Get checkpoints for a learning path
   */
  async getForPath(pathSlug: string): Promise<{ data: Checkpoint[] }> {
    return fetchJson<{ data: Checkpoint[] }>(`${API_BASE}/checkpoints/path/${pathSlug}`);
  },

  /**
   * Get a single checkpoint by ID
   */
  async getById(id: string): Promise<Checkpoint> {
    return fetchJson<Checkpoint>(`${API_BASE}/checkpoints/${id}`);
  },
};

/**
 * Current Events API client
 */
export const currentEventsApi = {
  /**
   * Get all current events (excluding expired by default)
   */
  async getAll(includeExpired?: boolean): Promise<{ data: CurrentEvent[] }> {
    const params = includeExpired ? '?includeExpired=true' : '';
    return fetchJson<{ data: CurrentEvent[] }>(`${API_BASE}/current-events${params}`);
  },

  /**
   * Get featured current events
   */
  async getFeatured(limit?: number): Promise<{ data: CurrentEvent[] }> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<{ data: CurrentEvent[] }>(`${API_BASE}/current-events/featured${params}`);
  },

  /**
   * Get events related to a milestone
   */
  async getForMilestone(milestoneId: string): Promise<{ data: CurrentEvent[] }> {
    return fetchJson<{ data: CurrentEvent[] }>(`${API_BASE}/current-events/milestone/${milestoneId}`);
  },

  /**
   * Get a single event by ID
   */
  async getById(id: string): Promise<CurrentEvent> {
    return fetchJson<CurrentEvent>(`${API_BASE}/current-events/${id}`);
  },

  // Admin methods (Sprint 42)

  /**
   * Create a new current event (admin)
   */
  async create(data: {
    headline: string;
    summary: string;
    sourceUrl?: string;
    sourcePublisher?: string;
    publishedDate: string;
    prerequisiteMilestoneIds?: string[];
    connectionExplanation: string;
    featured?: boolean;
  }): Promise<CurrentEvent> {
    return fetchJson<CurrentEvent>(`${API_BASE}/admin/current-events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing current event (admin)
   */
  async update(id: string, data: Partial<{
    headline: string;
    summary: string;
    sourceUrl: string;
    sourcePublisher: string;
    publishedDate: string;
    prerequisiteMilestoneIds: string[];
    connectionExplanation: string;
    featured: boolean;
  }>): Promise<CurrentEvent> {
    return fetchJson<CurrentEvent>(`${API_BASE}/admin/current-events/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a current event (admin)
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/admin/current-events/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },
};

// =============================================================================
// User Session & Flashcards API (Sprint 38)
// =============================================================================

/**
 * User session response
 */
export interface UserSessionResponse {
  sessionId: string;
  deviceId: string;
  createdAt: string;
  lastActiveAt: string;
  stats: {
    totalCards: number;
    cardsDueToday: number;
    cardsReviewedToday: number;
    currentStreak: number;
    longestStreak: number;
    masteredCards: number;
    lastStudyDate: string | null;
  } | null;
  profile: {
    audienceType: string | null;
    expertiseLevel: string | null;
    interests: string[];
    completedOnboarding: boolean;
  } | null;
  streakHistory: {
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: string | null;
    achievements: string[];
  } | null;
}

/**
 * User flashcard response
 */
export interface UserFlashcardResponse {
  id: string;
  sourceType: string;
  sourceId: string;
  packIds: string[];
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
}

/**
 * User pack response
 */
export interface UserPackResponse {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isDefault: boolean;
  cardCount: number;
  createdAt: string;
}

/**
 * SM-2 review result
 */
export interface ReviewResult {
  id: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  isMastered: boolean;
}

/**
 * Migration data structure
 */
export interface LocalStorageMigrationData {
  flashcards?: Array<{
    sourceType: string;
    sourceId: string;
    packIds?: string[];
    easeFactor?: number;
    interval?: number;
    repetitions?: number;
    nextReviewDate?: string | null;
    lastReviewedAt?: string | null;
  }>;
  packs?: Array<{
    id?: string;
    name: string;
    description?: string;
    color?: string;
    isDefault?: boolean;
  }>;
  stats?: {
    totalCards?: number;
    cardsDueToday?: number;
    cardsReviewedToday?: number;
    currentStreak?: number;
    longestStreak?: number;
    masteredCards?: number;
    lastStudyDate?: string | null;
  };
  streakHistory?: {
    currentStreak?: number;
    longestStreak?: number;
    lastStudyDate?: string | null;
    achievements?: string[];
  };
  profile?: {
    audienceType?: string;
    expertiseLevel?: string;
    interests?: string[];
    completedOnboarding?: boolean;
  };
}

/**
 * User Session API client (Sprint 38)
 */
export const userSessionApi = {
  /**
   * Get or create a user session by device ID
   */
  async getOrCreateSession(deviceId: string): Promise<UserSessionResponse> {
    return fetchJson<UserSessionResponse>(`${API_BASE}/user/session`, {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    });
  },

  /**
   * Migrate localStorage data to database
   */
  async migrateLocalStorageData(
    deviceId: string,
    data: LocalStorageMigrationData
  ): Promise<{ message: string; sessionId: string; results: { flashcards: number; packs: number } }> {
    return fetchJson<{ message: string; sessionId: string; results: { flashcards: number; packs: number } }>(
      `${API_BASE}/user/migrate`,
      {
        method: 'POST',
        body: JSON.stringify({ deviceId, data }),
      }
    );
  },

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<UserSessionResponse> {
    return fetchJson<UserSessionResponse>(`${API_BASE}/user/${sessionId}`);
  },

  /**
   * Get user profile
   */
  async getProfile(sessionId: string): Promise<{
    audienceType: string | null;
    expertiseLevel: string | null;
    interests: string[];
    completedOnboarding: boolean;
  }> {
    return fetchJson<{
      audienceType: string | null;
      expertiseLevel: string | null;
      interests: string[];
      completedOnboarding: boolean;
    }>(`${API_BASE}/user/${sessionId}/profile`);
  },

  /**
   * Update user profile
   */
  async updateProfile(
    sessionId: string,
    data: {
      audienceType?: string;
      expertiseLevel?: string;
      interests?: string[];
      completedOnboarding?: boolean;
    }
  ): Promise<{
    audienceType: string | null;
    expertiseLevel: string | null;
    interests: string[];
    completedOnboarding: boolean;
  }> {
    return fetchJson<{
      audienceType: string | null;
      expertiseLevel: string | null;
      interests: string[];
      completedOnboarding: boolean;
    }>(`${API_BASE}/user/${sessionId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

/**
 * User Flashcards API client (Sprint 38)
 */
export const userFlashcardsApi = {
  /**
   * Get all user flashcards
   */
  async getFlashcards(
    sessionId: string,
    packId?: string
  ): Promise<{ data: UserFlashcardResponse[] }> {
    const params = packId ? `?packId=${packId}` : '';
    return fetchJson<{ data: UserFlashcardResponse[] }>(
      `${API_BASE}/user/${sessionId}/flashcards${params}`
    );
  },

  /**
   * Get flashcards due for review
   */
  async getDueCards(
    sessionId: string,
    packId?: string
  ): Promise<{ data: UserFlashcardResponse[]; count: number }> {
    const params = packId ? `?packId=${packId}` : '';
    return fetchJson<{ data: UserFlashcardResponse[]; count: number }>(
      `${API_BASE}/user/${sessionId}/flashcards/due${params}`
    );
  },

  /**
   * Get a single flashcard
   */
  async getFlashcard(sessionId: string, cardId: string): Promise<UserFlashcardResponse> {
    return fetchJson<UserFlashcardResponse>(
      `${API_BASE}/user/${sessionId}/flashcards/${cardId}`
    );
  },

  /**
   * Add a flashcard to collection
   */
  async addFlashcard(
    sessionId: string,
    sourceType: string,
    sourceId: string,
    packIds?: string[]
  ): Promise<UserFlashcardResponse> {
    return fetchJson<UserFlashcardResponse>(
      `${API_BASE}/user/${sessionId}/flashcards`,
      {
        method: 'POST',
        body: JSON.stringify({ sourceType, sourceId, packIds }),
      }
    );
  },

  /**
   * Review a flashcard with SM-2 algorithm
   */
  async reviewFlashcard(
    sessionId: string,
    cardId: string,
    quality: number
  ): Promise<ReviewResult> {
    return fetchJson<ReviewResult>(
      `${API_BASE}/user/${sessionId}/flashcards/${cardId}/review`,
      {
        method: 'POST',
        body: JSON.stringify({ quality }),
      }
    );
  },

  /**
   * Update flashcard pack assignments
   */
  async updateFlashcardPacks(
    sessionId: string,
    cardId: string,
    packIds: string[]
  ): Promise<UserFlashcardResponse> {
    return fetchJson<UserFlashcardResponse>(
      `${API_BASE}/user/${sessionId}/flashcards/${cardId}/packs`,
      {
        method: 'PUT',
        body: JSON.stringify({ packIds }),
      }
    );
  },

  /**
   * Remove a flashcard from collection
   */
  async removeFlashcard(sessionId: string, cardId: string): Promise<void> {
    return fetchJson<void>(
      `${API_BASE}/user/${sessionId}/flashcards/${cardId}`,
      { method: 'DELETE' }
    );
  },

  /**
   * Get all user packs
   */
  async getPacks(sessionId: string): Promise<{ data: UserPackResponse[] }> {
    return fetchJson<{ data: UserPackResponse[] }>(
      `${API_BASE}/user/${sessionId}/packs`
    );
  },

  /**
   * Create a new pack
   */
  async createPack(
    sessionId: string,
    name: string,
    description?: string,
    color?: string
  ): Promise<UserPackResponse> {
    return fetchJson<UserPackResponse>(
      `${API_BASE}/user/${sessionId}/packs`,
      {
        method: 'POST',
        body: JSON.stringify({ name, description, color }),
      }
    );
  },

  /**
   * Update a pack
   */
  async updatePack(
    sessionId: string,
    packId: string,
    data: { name?: string; description?: string; color?: string }
  ): Promise<UserPackResponse> {
    return fetchJson<UserPackResponse>(
      `${API_BASE}/user/${sessionId}/packs/${packId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Delete a pack
   */
  async deletePack(sessionId: string, packId: string): Promise<void> {
    return fetchJson<void>(
      `${API_BASE}/user/${sessionId}/packs/${packId}`,
      { method: 'DELETE' }
    );
  },
};

// =============================================================================
// User Progress API Types (Sprint 38)
// =============================================================================

/**
 * Path progress response
 */
export interface PathProgressResponse {
  id?: string;
  pathSlug: string;
  completedMilestoneIds: string[];
  currentMilestoneId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  percentComplete: number;
}

/**
 * Checkpoint progress response
 */
export interface CheckpointProgressResponse {
  id?: string;
  checkpointId: string;
  completed: boolean;
  score: number | null;
  attempts: number;
  lastAttemptAt: string | null;
  answers: Array<{
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
  }>;
}

/**
 * Answer record for checkpoint submission
 */
export interface AnswerRecord {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

/**
 * Checkpoint submit result
 */
export interface CheckpointSubmitResult extends CheckpointProgressResponse {
  passed: boolean;
  message: string;
}

/**
 * User Progress API client (Sprint 38)
 */
export const userProgressApi = {
  // =========================================================================
  // Path Progress
  // =========================================================================

  /**
   * Get all path progress for a session
   */
  async getAllPathProgress(sessionId: string): Promise<{ data: PathProgressResponse[] }> {
    return fetchJson<{ data: PathProgressResponse[] }>(
      `${API_BASE}/user/${sessionId}/paths`
    );
  },

  /**
   * Get progress for a specific learning path
   */
  async getPathProgress(sessionId: string, pathSlug: string): Promise<PathProgressResponse> {
    return fetchJson<PathProgressResponse>(
      `${API_BASE}/user/${sessionId}/paths/${pathSlug}`
    );
  },

  /**
   * Update progress for a learning path
   */
  async updatePathProgress(
    sessionId: string,
    pathSlug: string,
    data: {
      completedMilestoneIds?: string[];
      currentMilestoneId?: string | null;
      completed?: boolean;
    }
  ): Promise<PathProgressResponse> {
    return fetchJson<PathProgressResponse>(
      `${API_BASE}/user/${sessionId}/paths/${pathSlug}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Mark a milestone as completed in a path
   */
  async completeMilestone(
    sessionId: string,
    pathSlug: string,
    milestoneId: string
  ): Promise<PathProgressResponse> {
    return fetchJson<PathProgressResponse>(
      `${API_BASE}/user/${sessionId}/paths/${pathSlug}/milestones`,
      {
        method: 'POST',
        body: JSON.stringify({ milestoneId }),
      }
    );
  },

  /**
   * Reset progress for a learning path
   */
  async resetPathProgress(sessionId: string, pathSlug: string): Promise<void> {
    return fetchJson<void>(
      `${API_BASE}/user/${sessionId}/paths/${pathSlug}`,
      { method: 'DELETE' }
    );
  },

  // =========================================================================
  // Checkpoint Progress
  // =========================================================================

  /**
   * Get all checkpoint progress for a session
   */
  async getAllCheckpointProgress(
    sessionId: string
  ): Promise<{ data: CheckpointProgressResponse[] }> {
    return fetchJson<{ data: CheckpointProgressResponse[] }>(
      `${API_BASE}/user/${sessionId}/checkpoints`
    );
  },

  /**
   * Get progress for a specific checkpoint
   */
  async getCheckpointProgress(
    sessionId: string,
    checkpointId: string
  ): Promise<CheckpointProgressResponse> {
    return fetchJson<CheckpointProgressResponse>(
      `${API_BASE}/user/${sessionId}/checkpoints/${checkpointId}`
    );
  },

  /**
   * Submit answers for a checkpoint quiz
   */
  async submitCheckpoint(
    sessionId: string,
    checkpointId: string,
    answers: AnswerRecord[]
  ): Promise<CheckpointSubmitResult> {
    return fetchJson<CheckpointSubmitResult>(
      `${API_BASE}/user/${sessionId}/checkpoints/${checkpointId}/submit`,
      {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }
    );
  },

  /**
   * Reset progress for a checkpoint
   */
  async resetCheckpointProgress(sessionId: string, checkpointId: string): Promise<void> {
    return fetchJson<void>(
      `${API_BASE}/user/${sessionId}/checkpoints/${checkpointId}`,
      { method: 'DELETE' }
    );
  },
};

// =============================================================================
// Key Figures API (Sprint 45)
// =============================================================================

/**
 * Key figure role types
 */
export type KeyFigureRole =
  | 'researcher'
  | 'executive'
  | 'founder'
  | 'policy_maker'
  | 'engineer'
  | 'other';

/**
 * Key figure status types
 */
export type KeyFigureStatus = 'draft' | 'pending_review' | 'published';

/**
 * Contribution type for milestone contributors
 */
export type ContributionType = 'lead' | 'co_author' | 'advisor' | 'founder' | 'mentioned';

/**
 * Key figure from database
 */
export interface KeyFigure {
  id: string;
  canonicalName: string;
  aliases: string[];
  shortBio: string;
  fullBio: string | null;
  primaryOrg: string | null;
  previousOrgs: string[];
  role: KeyFigureRole;
  notableFor: string;
  imageUrl: string | null;
  wikipediaUrl: string | null;
  linkedInUrl: string | null;
  twitterHandle: string | null;
  status: KeyFigureStatus;
  sourceArticleId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating a key figure
 */
export interface CreateKeyFigureDto {
  canonicalName: string;
  aliases?: string[];
  shortBio: string;
  fullBio?: string;
  primaryOrg?: string;
  previousOrgs?: string[];
  role: KeyFigureRole;
  notableFor: string;
  imageUrl?: string;
  wikipediaUrl?: string;
  linkedInUrl?: string;
  twitterHandle?: string;
  status?: KeyFigureStatus;
}

/**
 * DTO for updating a key figure
 */
export interface UpdateKeyFigureDto {
  canonicalName?: string;
  aliases?: string[];
  shortBio?: string;
  fullBio?: string | null;
  primaryOrg?: string | null;
  previousOrgs?: string[];
  role?: KeyFigureRole;
  notableFor?: string;
  imageUrl?: string | null;
  wikipediaUrl?: string | null;
  linkedInUrl?: string | null;
  twitterHandle?: string | null;
  status?: KeyFigureStatus;
}

/**
 * Key figure statistics
 */
export interface KeyFigureStats {
  total: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
}

/**
 * Milestone with contribution info
 */
export interface MilestoneWithContribution {
  milestone: {
    id: string;
    title: string;
    description: string;
    date: string;
    category: string;
    significance: number;
    organization: string | null;
  };
  contributionType: ContributionType | null;
}

/**
 * Key figure with contribution type (for milestone display)
 */
export interface KeyFigureWithContribution {
  keyFigure: KeyFigure;
  contributionType: ContributionType | null;
}

/**
 * Key Figures API client (Sprint 45)
 * Public endpoints for reading, admin endpoints for CRUD
 */
export const keyFiguresApi = {
  /**
   * Get all key figures with optional filtering
   */
  async getAll(params?: {
    status?: KeyFigureStatus;
    role?: KeyFigureRole;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<KeyFigure>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.role) searchParams.set('role', params.role);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${API_BASE}/key-figures${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<KeyFigure>>(url);
  },

  /**
   * Get a single key figure by ID
   */
  async getById(id: string): Promise<KeyFigure> {
    return fetchJson<KeyFigure>(`${API_BASE}/key-figures/${id}`);
  },

  /**
   * Search key figures (for autocomplete)
   */
  async search(query: string, limit?: number): Promise<{ data: KeyFigure[]; total: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    if (limit) searchParams.set('limit', String(limit));

    return fetchJson<{ data: KeyFigure[]; total: number }>(
      `${API_BASE}/key-figures/search?${searchParams.toString()}`
    );
  },

  /**
   * Get milestones associated with a key figure
   */
  async getMilestones(id: string): Promise<{ data: MilestoneWithContribution[]; total: number }> {
    return fetchJson<{ data: MilestoneWithContribution[]; total: number }>(
      `${API_BASE}/key-figures/${id}/milestones`
    );
  },

  /**
   * Get key figure statistics (admin)
   */
  async getStats(): Promise<KeyFigureStats> {
    return fetchJson<KeyFigureStats>(`${API_BASE}/admin/key-figures/stats`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Generate name variants (admin utility)
   */
  async generateVariants(name: string): Promise<{ id: string; variants: string[] }> {
    return fetchJson<{ id: string; variants: string[] }>(
      `${API_BASE}/admin/key-figures/generate-variants`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      }
    );
  },

  /**
   * Create a new key figure (admin)
   */
  async create(data: CreateKeyFigureDto): Promise<KeyFigure> {
    return fetchJson<KeyFigure>(`${API_BASE}/admin/key-figures`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing key figure (admin)
   */
  async update(id: string, data: UpdateKeyFigureDto): Promise<KeyFigure> {
    return fetchJson<KeyFigure>(`${API_BASE}/admin/key-figures/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a key figure (admin)
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/admin/key-figures/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get contributors for a milestone
   */
  async getMilestoneContributors(
    milestoneId: string
  ): Promise<{ data: KeyFigureWithContribution[]; total: number }> {
    return fetchJson<{ data: KeyFigureWithContribution[]; total: number }>(
      `${API_BASE}/milestones/${milestoneId}/contributors`
    );
  },

  /**
   * Add a contributor to a milestone (admin)
   */
  async addMilestoneContributor(
    milestoneId: string,
    keyFigureId: string,
    contributionType?: ContributionType
  ): Promise<{ id: string; milestoneId: string; keyFigureId: string; contributionType: string | null }> {
    return fetchJson<{ id: string; milestoneId: string; keyFigureId: string; contributionType: string | null }>(
      `${API_BASE}/admin/milestones/${milestoneId}/contributors`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ keyFigureId, contributionType }),
      }
    );
  },

  /**
   * Remove a contributor from a milestone (admin)
   */
  async removeMilestoneContributor(milestoneId: string, keyFigureId: string): Promise<void> {
    return fetchJson<void>(
      `${API_BASE}/admin/milestones/${milestoneId}/contributors/${keyFigureId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
  },

  /**
   * Merge multiple key figures into a primary record (admin)
   * Combines aliases, reassigns milestone links, deletes secondary figures
   */
  async merge(
    primaryId: string,
    secondaryIds: string[]
  ): Promise<{
    success: boolean;
    mergedFigure: KeyFigure;
    stats: {
      aliasesAdded: string[];
      contributorsReassigned: number;
      figuresDeleted: number;
    };
  }> {
    return fetchJson<{
      success: boolean;
      mergedFigure: KeyFigure;
      stats: {
        aliasesAdded: string[];
        contributorsReassigned: number;
        figuresDeleted: number;
      };
    }>(`${API_BASE}/admin/key-figures/merge`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ primaryId, secondaryIds }),
    });
  },
};

// =============================================================================
// Key Figure Drafts API (Sprint 46)
// =============================================================================

/**
 * Key figure draft status
 */
export type KeyFigureDraftStatus = 'pending' | 'approved' | 'rejected' | 'merged';

/**
 * Key figure draft from extraction pipeline
 */
export interface KeyFigureDraft {
  id: string;
  articleId: string;
  article: {
    id: string;
    title: string;
    externalUrl: string;
  } | null;
  extractedName: string;
  normalizedName: string;
  context: string;
  suggestedBio: string | null;
  suggestedOrg: string | null;
  suggestedRole: string;
  matchedFigureId: string | null;
  matchedFigure: {
    id: string;
    canonicalName: string;
    shortBio: string;
    primaryOrg: string | null;
    role: string;
  } | null;
  matchConfidence: number | null;
  status: KeyFigureDraftStatus;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Key figure draft statistics
 */
export interface KeyFigureDraftStats {
  total: number;
  byStatus: Record<KeyFigureDraftStatus, number>;
}

/**
 * Approve draft request with optional overrides
 */
export interface ApproveDraftRequest {
  canonicalName?: string;
  shortBio?: string;
  primaryOrg?: string;
  role?: KeyFigureRole;
  notableFor?: string;
}

/**
 * Key Figure Drafts API
 * Sprint 46 - Key Figures Pipeline Integration
 */
export const keyFigureDraftsApi = {
  /**
   * Get all key figure drafts with optional filtering
   */
  async getAll(params?: {
    status?: KeyFigureDraftStatus;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<KeyFigureDraft>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${API_BASE}/admin/key-figure-drafts${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<KeyFigureDraft>>(url, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get a single draft by ID
   */
  async getById(id: string): Promise<KeyFigureDraft> {
    return fetchJson<KeyFigureDraft>(`${API_BASE}/admin/key-figure-drafts/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get draft statistics
   */
  async getStats(): Promise<KeyFigureDraftStats> {
    return fetchJson<KeyFigureDraftStats>(`${API_BASE}/admin/key-figure-drafts/stats`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Approve a draft and create a new KeyFigure
   */
  async approve(
    id: string,
    data?: ApproveDraftRequest
  ): Promise<{ message: string; keyFigure: { id: string; canonicalName: string; role: string; shortBio: string } }> {
    return fetchJson<{ message: string; keyFigure: { id: string; canonicalName: string; role: string; shortBio: string } }>(
      `${API_BASE}/admin/key-figure-drafts/${id}/approve`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data || {}),
      }
    );
  },

  /**
   * Reject a draft
   */
  async reject(id: string, reason?: string): Promise<{ message: string; draftId: string }> {
    return fetchJson<{ message: string; draftId: string }>(
      `${API_BASE}/admin/key-figure-drafts/${id}/reject`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      }
    );
  },

  /**
   * Merge a draft with an existing KeyFigure
   */
  async merge(
    id: string,
    keyFigureId: string
  ): Promise<{ message: string; keyFigure: { id: string; canonicalName: string }; aliasAdded: boolean; contributorLinksCreated: number }> {
    return fetchJson<{ message: string; keyFigure: { id: string; canonicalName: string }; aliasAdded: boolean; contributorLinksCreated: number }>(
      `${API_BASE}/admin/key-figure-drafts/${id}/merge`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ keyFigureId }),
      }
    );
  },

  /**
   * Batch reject multiple drafts
   */
  async batchReject(draftIds: string[], reason?: string): Promise<{ message: string; count: number }> {
    return fetchJson<{ message: string; count: number }>(
      `${API_BASE}/admin/key-figure-drafts/batch-reject`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ draftIds, reason }),
      }
    );
  },
};

// =============================================================================
// Global Search API (Sprint 47)
// =============================================================================

/**
 * Search result item types
 */
export interface MilestoneSearchResult {
  type: 'milestone';
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  organization?: string | null;
}

export interface GlossarySearchResult {
  type: 'glossary';
  id: string;
  term: string;
  shortDefinition: string;
  category: string;
}

export interface KeyFigureSearchResult {
  type: 'keyFigure';
  id: string;
  canonicalName: string;
  shortBio: string;
  role: string;
  primaryOrg?: string | null;
  imageUrl?: string | null;
}

export type GlobalSearchResult = MilestoneSearchResult | GlossarySearchResult | KeyFigureSearchResult;

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchResult[];
  counts: {
    milestones: number;
    glossary: number;
    keyFigures: number;
    total: number;
  };
}

/**
 * Global Search API client (Sprint 47)
 * Unified search across milestones, glossary terms, and key figures
 */
export const globalSearchApi = {
  /**
   * Search across all content types
   */
  async search(
    query: string,
    options?: {
      limit?: number;
      types?: ('milestone' | 'glossary' | 'keyFigure')[];
    }
  ): Promise<GlobalSearchResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    if (options?.limit) searchParams.set('limit', String(options.limit));
    if (options?.types) searchParams.set('types', options.types.join(','));

    return fetchJson<GlobalSearchResponse>(`${API_BASE}/search?${searchParams.toString()}`);
  },
};

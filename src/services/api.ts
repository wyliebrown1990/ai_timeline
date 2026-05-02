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
export const API_BASE = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

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
 * Generic fetch wrapper with error handling and 503 retry logic
 */
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[API] Retry ${attempt}/${MAX_RETRIES} for ${url} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    console.warn('[API] Fetching:', url);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      console.warn('[API] Response status:', response.status, 'for', url);

      // Retry on 503 Service Unavailable (DB overload)
      if (response.status === 503 && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          const retryMs = parseInt(retryAfter, 10) * 1000;
          if (!isNaN(retryMs) && retryMs > 0) {
            console.warn(`[API] Server requested Retry-After: ${retryAfter}s`);
            await new Promise((resolve) => setTimeout(resolve, retryMs));
          }
        }
        lastError = new ApiError(503, 'Service temporarily unavailable');
        continue;
      }

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
      lastError = err;
      // Only retry on network errors (not ApiErrors other than 503)
      if (err instanceof ApiError) {
        throw err;
      }
      // Network failure — retry if attempts remain
      if (attempt < MAX_RETRIES) {
        console.warn(`[API] Network error for ${url}, will retry:`, err);
        continue;
      }
      console.error('[API] Fetch error for', url, ':', err);
      throw err;
    }
  }

  // All retries exhausted (only reachable for 503s)
  throw lastError;
}

/**
 * Query parameters for listing milestones
 */
export interface MilestoneQueryParams {
  page?: number;
  limit?: number;
}

/**
 * Milestone contributor (linked person) - Sprint KPC-3
 */
export interface MilestoneContributor {
  id: string;
  canonicalName: string;
  slug: string;
  imageUrl: string | null;
  role: string;
  currentRole: string | null;
  contributionType: string | null;
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

  // Sprint KPC-3: Contributor management

  /**
   * Get linked person contributors for a milestone
   */
  async getContributors(milestoneId: string): Promise<{ data: MilestoneContributor[] }> {
    return fetchJson<{ data: MilestoneContributor[] }>(
      `${API_BASE}/milestones/${milestoneId}/linked-persons`
    );
  },

  /**
   * Add a person contributor to a milestone (admin)
   */
  async addContributor(
    milestoneId: string,
    personId: string,
    contributionType?: string
  ): Promise<{ data: MilestoneContributor[] }> {
    return fetchJson<{ data: MilestoneContributor[] }>(
      `${API_BASE}/milestones/${milestoneId}/linked-persons`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ personId, contributionType }),
      }
    );
  },

  /**
   * Remove a person contributor from a milestone (admin)
   */
  async removeContributor(milestoneId: string, personId: string): Promise<void> {
    return fetchJson<void>(
      `${API_BASE}/milestones/${milestoneId}/linked-persons/${personId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
  },

  /**
   * Get milestone with linked contributors (admin)
   */
  async getWithContributors(
    milestoneId: string
  ): Promise<MilestoneResponse & { linkedContributors: MilestoneContributor[] }> {
    return fetchJson<MilestoneResponse & { linkedContributors: MilestoneContributor[] }>(
      `${API_BASE}/milestones/${milestoneId}/with-contributors`,
      { headers: getAuthHeaders() }
    );
  },

  /**
   * Get linked glossary terms for a milestone (Sprint SEO-3)
   */
  async getLinkedTerms(milestoneId: string): Promise<{ data: MilestoneLinkedTerm[] }> {
    return fetchJson<{ data: MilestoneLinkedTerm[] }>(
      `${API_BASE}/milestones/${milestoneId}/linked-terms`
    );
  },

  /**
   * Add a glossary term link to a milestone (admin)
   */
  async addLinkedTerm(
    milestoneId: string,
    glossaryTermId: string,
    relevanceNote?: string
  ): Promise<{ data: MilestoneLinkedTerm[] }> {
    return fetchJson<{ data: MilestoneLinkedTerm[] }>(
      `${API_BASE}/milestones/${milestoneId}/linked-terms`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ glossaryTermId, relevanceNote }),
      }
    );
  },

  /**
   * Remove a glossary term link from a milestone (admin)
   */
  async removeLinkedTerm(milestoneId: string, termId: string): Promise<void> {
    return fetchJson<void>(
      `${API_BASE}/milestones/${milestoneId}/linked-terms/${termId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
  },
};

/**
 * Glossary term linked to a milestone (Sprint SEO-3)
 */
export interface MilestoneLinkedTerm {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  category: string;
  relevanceNote: string | null;
}

/**
 * Milestone linked to a glossary term (Sprint SEO-3)
 */
export interface GlossaryLinkedMilestone {
  id: string;
  milestoneId: string;
  relevanceNote: string | null;
  milestone: {
    id: string;
    title: string;
    date: string;
    category: string;
    significance: number;
  };
}

/**
 * Source types for multi-source ingestion (Sprint 48)
 */
export type SourceType = 'rss' | 'youtube_channel' | 'youtube_playlist' | 'web_scraper' | 'single_url' | 'youtube_video';

/**
 * Health status for sources
 */
export type SourceHealthStatus = 'healthy' | 'warning' | 'error' | 'disabled';

/**
 * RSS source configuration
 */
export interface RssConfig {
  feedUrl: string;
  checkFrequency?: number;
}

/**
 * YouTube channel source configuration
 */
export interface YouTubeChannelConfig {
  channelId: string;
  transcriptLanguage?: string;
  includeShorts?: boolean;
  /** Maximum videos to fetch per sync (default: 20, max: 100) */
  maxVideos?: number;
  /** Only fetch videos published within this many days (leave empty for all) */
  historyDays?: number;
}

/**
 * YouTube playlist source configuration
 */
export interface YouTubePlaylistConfig {
  playlistId: string;
  transcriptLanguage?: string;
}

/**
 * Web scraper source configuration
 */
export interface WebScraperConfig {
  targetUrl: string;
  articleLinkSelector?: string;
  articleLinkPattern?: string;
  contentSelector?: string;
  waitForSelector?: string;
  maxArticlesPerFetch?: number;
}

/**
 * Union type for source configs
 */
export type SourceConfig = RssConfig | YouTubeChannelConfig | YouTubePlaylistConfig | WebScraperConfig;

/**
 * News source types
 */
export interface NewsSource {
  id: string;
  name: string;
  url: string;
  feedUrl?: string | null; // Deprecated: use config.feedUrl for RSS
  sourceType: SourceType;
  config: SourceConfig;
  isActive: boolean;
  checkFrequency: number;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
  healthStatus?: SourceHealthStatus;
  createdAt: string;
  articleCount?: number;
}

export interface CreateSourceDto {
  name: string;
  url: string;
  sourceType?: SourceType;
  config?: SourceConfig;
  feedUrl?: string; // Deprecated: for backwards compatibility
  isActive?: boolean;
  checkFrequency?: number;
}

export interface UpdateSourceDto {
  name?: string;
  url?: string;
  sourceType?: SourceType;
  config?: SourceConfig;
  feedUrl?: string;
  isActive?: boolean;
  checkFrequency?: number;
}

/**
 * Test connection result
 */
export interface TestConnectionResult {
  success: boolean;
  message: string;
  sampleArticles?: Array<{
    externalUrl: string;
    title: string;
    content: string;
    publishedAt: string;
  }>;
  sourceInfo?: {
    name?: string;
    description?: string;
    itemCount?: number;
  };
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
  // Subject classification fields (Sprint Subj-2)
  classifiedSubjects?: SubjectClassificationResult[];
  subjectClassifiedAt?: string;
  // Paywall detection (Sprint PD-1)
  isPaywalled?: boolean;
  paywallReason?: string | null;
  paywallDetectedAt?: string | null;
}

export interface SubjectClassificationResult {
  subjectId: string;
  subjectSlug: string;
  confidence: number;
  isPrimary: boolean;
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
  screening?: {
    relevanceScore: number;
    isMilestoneWorthy: boolean;
    suggestedCategory: string | null;
    rationale?: string;
  };
  status?: string; // 'screened', 'complete', 'pending', etc.
  note?: string;
  draftsCreated?: number; // Only present for full analysis
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

  /**
   * Test connection to a source before saving
   */
  async testConnection(data: CreateSourceDto): Promise<TestConnectionResult> {
    return fetchJson<TestConnectionResult>(`${API_BASE}/admin/sources/test`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
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
   * Analyze a single article (screening only - fast)
   */
  async analyze(id: string): Promise<AnalyzeResult> {
    return fetchJson<AnalyzeResult>(`${API_BASE}/admin/articles/${id}/analyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Generate content for a screened article (creates drafts - slower)
   * WARNING: May timeout via API Gateway (30s limit). Use for individual articles.
   */
  async generateContent(id: string): Promise<AnalyzeResult> {
    return fetchJson<AnalyzeResult>(`${API_BASE}/admin/articles/${id}/generate`, {
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
   * Creates an IngestedArticle without a NewsSource as 'pending'
   * User should then trigger analysis from the Ingested Articles page
   */
  async submit(data: {
    sourceUrl: string;
    title?: string;
    content: string;
  }): Promise<{
    success: boolean;
    articleId: string;
    analysisStatus: 'pending';
    message?: string;
    error?: string;
  }> {
    return fetchJson<{
      success: boolean;
      articleId: string;
      analysisStatus: 'pending';
      message?: string;
      error?: string;
    }>(`${API_BASE}/admin/articles/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Submit a YouTube video for analysis
   * Creates a NewsSource (one-time) + IngestedArticle with transcript
   */
  async submitYouTube(data: {
    videoUrl: string;
    transcriptLanguage?: string;
  }): Promise<{
    success: boolean;
    articleId: string;
    sourceId: string;
    videoId: string;
    title: string;
    hasTranscript: boolean;
    wordCount: number;
    analysisStatus: 'pending';
    message?: string;
    error?: string;
  }> {
    return fetchJson<{
      success: boolean;
      articleId: string;
      sourceId: string;
      videoId: string;
      title: string;
      hasTranscript: boolean;
      wordCount: number;
      analysisStatus: 'pending';
      message?: string;
      error?: string;
    }>(`${API_BASE}/admin/articles/submit-youtube`, {
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

  /**
   * Bulk delete multiple articles
   */
  async bulkDelete(ids: string[]): Promise<{ message: string; deleted: number }> {
    return fetchJson<{ message: string; deleted: number }>(
      `${API_BASE}/admin/articles/bulk-delete`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids }),
      }
    );
  },

  /**
   * Bulk analyze multiple articles (screening)
   */
  async bulkAnalyze(ids: string[]): Promise<{
    message: string;
    analyzing: number;
    skipped: number;
  }> {
    return fetchJson<{ message: string; analyzing: number; skipped: number }>(
      `${API_BASE}/admin/articles/bulk-analyze`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids }),
      }
    );
  },

  /**
   * Get all blocked domains (domains where scraping fails)
   */
  async getBlockedDomains(): Promise<{
    count: number;
    domains: Array<{
      id: string;
      domain: string;
      failureType: string;
      failureUrl: string;
      createdAt: string;
      updatedAt: string;
    }>;
  }> {
    return fetchJson(`${API_BASE}/admin/articles/blocked-domains`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Delete a blocked domain (allow retrying scrapes from that domain)
   */
  async deleteBlockedDomain(id: string): Promise<{ success: boolean; message: string }> {
    return fetchJson(`${API_BASE}/admin/articles/blocked-domains/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
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
   *
   * For news_event drafts, optionally promote to milestone by passing options:
   * - promoteToMilestone: boolean
   * - milestoneOverrides: { category?, significance?, tags?, title?, description? }
   */
  async approve(
    id: string,
    options?: {
      promoteToMilestone?: boolean;
      milestoneOverrides?: {
        category?: 'research' | 'model_release' | 'breakthrough' | 'product' | 'regulation' | 'industry';
        significance?: 1 | 2 | 3 | 4;
        tags?: string[];
        title?: string;
        description?: string;
      };
    }
  ): Promise<ApproveResult & { promotedMilestoneId?: string }> {
    return fetchJson<ApproveResult & { promotedMilestoneId?: string }>(
      `${API_BASE}/admin/review/${id}/approve`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(options || {}),
      }
    );
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

  /**
   * Bulk approve multiple drafts
   */
  async bulkApprove(ids: string[]): Promise<{
    message: string;
    approved: number;
    failed: number;
    results: Array<{ id: string; success: boolean; publishedId?: string; error?: string }>;
  }> {
    return fetchJson<{
      message: string;
      approved: number;
      failed: number;
      results: Array<{ id: string; success: boolean; publishedId?: string; error?: string }>;
    }>(`${API_BASE}/admin/review/bulk-approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
  },

  /**
   * Bulk reject multiple drafts
   */
  async bulkReject(ids: string[], reason?: string): Promise<{
    message: string;
    rejected: number;
  }> {
    return fetchJson<{ message: string; rejected: number }>(
      `${API_BASE}/admin/review/bulk-reject`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids, reason }),
      }
    );
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
  slug: string | null; // Sprint SEO-3
  shortDefinition: string;
  fullDefinition: string;
  businessContext: string | null;
  example: string | null;
  inMeetingExample: string | null;
  category: GlossaryCategory;
  relatedTermIds: string[];
  relatedMilestoneIds: string[];
  // Prerequisite system (Sprint LEarn-1)
  prerequisiteIds: string[];
  difficulty: number;
  conceptType: string;
  quickAnswer: string | null; // Sprint SEO-2
  createdAt: string;
  updatedAt: string;
  sourceArticleId: string | null;
}

/**
 * Key figure linked to a glossary term (Sprint SEO-3)
 */
export interface GlossaryKeyFigure {
  id: string;
  personId: string;
  contributionNote: string | null;
  person: {
    id: string;
    canonicalName: string;
    slug: string;
    imageUrl: string | null;
    shortBio: string;
    currentRole: string | null;
  };
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
 * AI-powered prerequisite suggestion types (Sprint LEarn-1, Section 8)
 */
export interface PrerequisiteSuggestion {
  termId: string;
  termName: string;
  confidence: number;
  reason: string;
  matchType: 'exact' | 'fuzzy' | 'semantic';
}

export interface PrerequisiteSuggestionResult {
  success: boolean;
  data: {
    termId: string;
    termName: string;
    currentPrerequisites: string[];
    suggestions: PrerequisiteSuggestion[];
    suggestedDifficulty: number;
    reasoning: string;
  };
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
   * Get a glossary term by slug (Sprint SEO-3)
   */
  async getBySlug(slug: string): Promise<GlossaryTerm> {
    return fetchJson<GlossaryTerm>(`${API_BASE}/glossary/slug/${slug}`);
  },

  /**
   * Get key figures linked to a glossary term (Sprint SEO-3)
   */
  async getKeyFigures(termId: string): Promise<GlossaryKeyFigure[]> {
    return fetchJson<GlossaryKeyFigure[]>(`${API_BASE}/glossary/${termId}/key-figures`);
  },

  /**
   * Get milestones linked to a glossary term (Sprint SEO-3)
   */
  async getLinkedMilestones(termId: string): Promise<GlossaryLinkedMilestone[]> {
    return fetchJson<GlossaryLinkedMilestone[]>(`${API_BASE}/glossary/${termId}/linked-milestones`);
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

  /**
   * Get AI-powered prerequisite suggestions for a term (admin)
   * Sprint LEarn-1, Section 8
   */
  async suggestPrerequisites(id: string): Promise<PrerequisiteSuggestionResult> {
    return fetchJson<PrerequisiteSuggestionResult>(
      `${API_BASE}/admin/glossary/${id}/suggest-prerequisites`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
  },

  /**
   * Apply AI suggestions to a term (admin)
   */
  async applySuggestions(
    id: string,
    data: { prerequisiteIds: string[]; difficulty?: number }
  ): Promise<{ success: boolean; message: string; term: GlossaryTerm }> {
    return fetchJson<{ success: boolean; message: string; term: GlossaryTerm }>(
      `${API_BASE}/admin/glossary/${id}/apply-suggestions`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
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

  // ==========================================================================
  // News Learning methods (Sprint LEarn-2)
  // ==========================================================================

  /**
   * Get linked concepts for a news event
   */
  async getEventConcepts(eventId: string): Promise<NewsEventConceptsResponse> {
    return fetchJson<NewsEventConceptsResponse>(`${API_BASE}/current-events/${eventId}/concepts`);
  },

  /**
   * Get historical context for a news event
   */
  async getEventContext(eventId: string): Promise<NewsEventContextResponse> {
    return fetchJson<NewsEventContextResponse>(`${API_BASE}/current-events/${eventId}/context`);
  },

  /**
   * Get all news mentioning a concept
   */
  async getNewsByConceptId(conceptId: string, limit?: number): Promise<NewsForConceptResponse> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<NewsForConceptResponse>(`${API_BASE}/current-events/concepts/${conceptId}${params}`);
  },

  /**
   * Link concepts to a news event (admin)
   */
  async linkConcepts(eventId: string): Promise<LinkConceptsResponse> {
    return fetchJson<LinkConceptsResponse>(`${API_BASE}/admin/current-events/${eventId}/link-concepts`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Generate context for a news event (admin)
   */
  async generateContext(eventId: string): Promise<GenerateContextResponse> {
    return fetchJson<GenerateContextResponse>(`${API_BASE}/admin/current-events/${eventId}/generate-context`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Add concept link manually (admin)
   */
  async addConceptLink(
    eventId: string,
    conceptId: string,
    options?: { isKeyTopic?: boolean; mentionContext?: string }
  ): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`${API_BASE}/admin/current-events/${eventId}/add-concept`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ conceptId, ...options }),
    });
  },

  /**
   * Remove concept link (admin)
   */
  async removeConceptLink(eventId: string, conceptId: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`${API_BASE}/admin/current-events/${eventId}/concepts/${conceptId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Batch process events for learning (admin)
   */
  async batchProcess(
    eventIds: string[],
    options?: { includeConcepts?: boolean; includeContext?: boolean }
  ): Promise<BatchProcessResponse> {
    return fetchJson<BatchProcessResponse>(`${API_BASE}/admin/current-events/batch-process`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ eventIds, ...options }),
    });
  },
};

// =============================================================================
// News Learning Types (Sprint LEarn-2)
// =============================================================================

/**
 * Concept linked to a news event
 */
export interface LinkedConcept {
  id: string;
  term: string;
  shortDefinition: string;
  category: string;
  difficulty: number;
  mentionContext: string | null;
  isKeyTopic: boolean;
  slug?: string; // Sprint SEO-7: for slug-based URLs
}

/**
 * Response for getting event concepts
 */
export interface NewsEventConceptsResponse {
  data: LinkedConcept[];
  total: number;
  keyTopics: number;
}

/**
 * Related milestone in context
 */
export interface RelatedMilestone {
  id: string;
  title: string;
  date: string;
  category: string;
}

/**
 * Response for getting event context
 */
export interface NewsEventContextResponse {
  data: {
    whyItMatters: string | null;
    relatedMilestones: RelatedMilestone[];
  };
}

/**
 * News event mentioning a concept
 */
export interface NewsForConcept {
  id: string;
  headline: string;
  publishedDate: string;
  isKeyTopic: boolean;
  mentionContext: string | null;
}

/**
 * Response for getting news by concept
 */
export interface NewsForConceptResponse {
  data: NewsForConcept[];
  total: number;
  concept: string;
}

/**
 * Response for linking concepts
 */
export interface LinkConceptsResponse {
  success: boolean;
  message: string;
  data: {
    matches: Array<{
      termId: string;
      term: string;
      context: string;
      confidence: number;
      isKeyTopic: boolean;
    }>;
    keyTopics: string[];
    reasoning: string;
    linkedCount: number;
  };
}

/**
 * Response for generating context
 */
export interface GenerateContextResponse {
  success: boolean;
  message: string;
  data: {
    whyItMatters: string;
    relatedMilestones: Array<{
      id: string;
      title: string;
      date: string;
      category: string;
      relevanceScore: number;
      relevanceReason: string;
    }>;
  };
}

/**
 * Response for batch processing
 */
export interface BatchProcessResponse {
  success: boolean;
  message: string;
  data: Array<{
    eventId: string;
    conceptsLinked?: number;
    contextGenerated?: boolean;
    error?: string;
  }>;
}

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
 * Generated profile from AI
 */
export interface GeneratedKeyFigureProfile {
  entityType: 'person' | 'organization';
  role: KeyFigureRole;
  shortBio: string;
  fullBio: string;
  notableFor: string;
  primaryOrg: string | null;
  previousOrgs: string[];
  wikipediaUrl: string | null;
  twitterHandle: string | null;
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
   * Generate profile with AI (admin utility)
   */
  async generateProfile(name: string): Promise<GeneratedKeyFigureProfile> {
    return fetchJson<GeneratedKeyFigureProfile>(
      `${API_BASE}/admin/key-figures/generate-profile`,
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
  slug?: string; // Sprint SEO-7: for slug-based URLs
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

// =============================================================================
// Contact API
// =============================================================================

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Contact form API client
 */
export const contactApi = {
  /**
   * Submit contact form
   */
  async submit(data: ContactFormData): Promise<ContactResponse> {
    return fetchJson<ContactResponse>(`${API_BASE}/contact`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// =============================================================================
// Organizations API (Sprint KPC-1)
// =============================================================================

import type {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrgType,
} from '../types/organization';

/**
 * Organization with counts for list display
 */
export interface OrganizationWithCounts extends Organization {
  personCount?: number;
  milestoneCount?: number;
}

/**
 * Organization with related data for profile page
 */
export interface OrganizationWithRelations extends Organization {
  people: Array<{
    id: string;
    canonicalName: string;
    slug: string;
    role: string;
    currentRole: string | null;
    imageUrl: string | null;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    date: string;
    category: string;
  }>;
  newsEvents?: Array<{
    id: string;
    title: string;
    date: string;
    mentionType: string;
    isPaywalled?: boolean;
    paywallReason?: string | null;
  }>;
}

/**
 * Organizations API client
 */
export const organizationsApi = {
  /**
   * Get all organizations with optional filtering
   */
  async getAll(params?: {
    type?: OrgType;
    focusArea?: string;
    search?: string;
    status?: string;
    sort?: 'name' | 'foundedYear' | 'personCount' | 'milestoneCount';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Organization>> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.focusArea) searchParams.set('focusArea', params.focusArea);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${API_BASE}/organizations${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<Organization>>(url);
  },

  /**
   * Get a single organization by slug with related data
   */
  async getBySlug(slug: string): Promise<OrganizationWithRelations> {
    return fetchJson<OrganizationWithRelations>(`${API_BASE}/organizations/${slug}`);
  },

  /**
   * Search organizations (for autocomplete)
   */
  async search(query: string, limit?: number): Promise<{ data: Organization[]; total: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    if (limit) searchParams.set('limit', String(limit));

    return fetchJson<{ data: Organization[]; total: number }>(
      `${API_BASE}/organizations/search?${searchParams.toString()}`
    );
  },

  /**
   * Get all unique focus areas
   */
  async getFocusAreas(): Promise<{ data: string[] }> {
    return fetchJson<{ data: string[] }>(`${API_BASE}/organizations/focus-areas`);
  },

  /**
   * Get organization statistics (admin)
   */
  async getStats(): Promise<{ total: number; byType: Record<string, number> }> {
    return fetchJson<{ total: number; byType: Record<string, number> }>(
      `${API_BASE}/admin/organizations/stats`,
      {
        headers: getAuthHeaders(),
      }
    );
  },

  /**
   * Create a new organization (admin)
   */
  async create(data: CreateOrganizationRequest): Promise<Organization> {
    return fetchJson<Organization>(`${API_BASE}/admin/organizations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing organization (admin)
   */
  async update(id: string, data: UpdateOrganizationRequest): Promise<Organization> {
    return fetchJson<Organization>(`${API_BASE}/admin/organizations/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete an organization (admin)
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/admin/organizations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get glossary terms (key concepts) linked to an organization (Sprint SEO-3)
   */
  async getKeyConcepts(slug: string): Promise<{ data: OrganizationKeyConcept[] }> {
    return fetchJson<{ data: OrganizationKeyConcept[] }>(`${API_BASE}/organizations/${slug}/key-concepts`);
  },
};

/**
 * Glossary term linked to an organization (Sprint SEO-3)
 */
export interface OrganizationKeyConcept {
  id: string;
  glossaryTermId: string;
  contributionNote: string | null;
  glossaryTerm: {
    id: string;
    term: string;
    slug: string | null;
    shortDefinition: string;
    category: string;
  };
}

// =============================================================================
// Persons API (Sprint KPC-1)
// =============================================================================

import type {
  Person,
  Affiliation,
  CreatePersonRequest,
  UpdatePersonRequest,
  PersonRole,
  AddAffiliationRequest,
} from '../types/person';

// Re-export Person types for consumers
export type { Person, Affiliation, PersonRole };

/**
 * Person with counts for list display
 */
export interface PersonWithCounts extends Person {
  milestoneCount?: number;
  newsEventCount?: number;
}

/**
 * Person with all related data for profile page
 */
export interface PersonWithRelations extends Person {
  affiliations: Array<Affiliation & { organization: Organization }>;
  milestones: Array<{
    id: string;
    title: string;
    date: string;
    category: string;
    contributionType: string | null;
  }>;
  newsEvents: Array<{
    id: string;
    title: string;
    date: string;
    mentionType: string;
    isPaywalled?: boolean;
    paywallReason?: string | null;
  }>;
}

/**
 * Glossary term linked to a person (Sprint SEO-3)
 */
export interface PersonKeyConcept {
  id: string;
  glossaryTermId: string;
  contributionNote: string | null;
  glossaryTerm: {
    id: string;
    term: string;
    slug: string | null;
    shortDefinition: string;
    category: string;
  };
}

/**
 * Persons API client
 */
export const personsApi = {
  /**
   * Get all persons with optional filtering
   */
  async getAll(params?: {
    role?: PersonRole;
    focusArea?: string;
    orgId?: string;
    search?: string;
    status?: string;
    sort?: 'name' | 'recentActivity' | 'milestoneCount';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Person>> {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.set('role', params.role);
    if (params?.focusArea) searchParams.set('focusArea', params.focusArea);
    if (params?.orgId) searchParams.set('orgId', params.orgId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${API_BASE}/persons${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<Person>>(url);
  },

  /**
   * Get a single person by slug with all related data
   */
  async getBySlug(slug: string): Promise<PersonWithRelations> {
    return fetchJson<PersonWithRelations>(`${API_BASE}/persons/${slug}`);
  },

  /**
   * Search persons (for autocomplete)
   */
  async search(query: string, limit?: number): Promise<{ data: Person[]; total: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    if (limit) searchParams.set('limit', String(limit));

    return fetchJson<{ data: Person[]; total: number }>(
      `${API_BASE}/persons/search?${searchParams.toString()}`
    );
  },

  /**
   * Get all unique focus areas
   */
  async getFocusAreas(): Promise<{ data: string[] }> {
    return fetchJson<{ data: string[] }>(`${API_BASE}/persons/focus-areas`);
  },

  /**
   * Get glossary terms (key concepts) linked to a person (Sprint SEO-3)
   */
  async getKeyConcepts(slug: string): Promise<{ data: PersonKeyConcept[] }> {
    return fetchJson<{ data: PersonKeyConcept[] }>(`${API_BASE}/persons/${slug}/key-concepts`);
  },

  /**
   * Get person statistics (admin)
   */
  async getStats(): Promise<{ total: number; byRole: Record<string, number> }> {
    return fetchJson<{ total: number; byRole: Record<string, number> }>(
      `${API_BASE}/admin/persons/stats`,
      {
        headers: getAuthHeaders(),
      }
    );
  },

  /**
   * Create a new person (admin)
   */
  async create(data: CreatePersonRequest): Promise<Person> {
    return fetchJson<Person>(`${API_BASE}/admin/persons`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing person (admin)
   */
  async update(id: string, data: UpdatePersonRequest): Promise<Person> {
    return fetchJson<Person>(`${API_BASE}/admin/persons/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a person (admin)
   */
  async delete(id: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/admin/persons/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get affiliations for a person
   */
  async getAffiliations(personId: string): Promise<{ data: Array<Affiliation & { organization: Organization }> }> {
    return fetchJson<{ data: Array<Affiliation & { organization: Organization }> }>(
      `${API_BASE}/persons/${personId}/affiliations`
    );
  },

  /**
   * Add an affiliation to a person (admin)
   */
  async addAffiliation(personId: string, data: AddAffiliationRequest): Promise<Affiliation> {
    return fetchJson<Affiliation>(
      `${API_BASE}/admin/persons/${personId}/affiliations`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Remove an affiliation (admin)
   */
  async removeAffiliation(affiliationId: string): Promise<void> {
    return fetchJson<void>(
      `${API_BASE}/admin/affiliations/${affiliationId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
  },

};

// =============================================================================
// Person Drafts API (Sprint KPC-4 - Entity Detection)
// =============================================================================

/**
 * Person draft status
 */
export type PersonDraftStatus = 'pending' | 'approved' | 'rejected' | 'merged';

/**
 * Person draft from entity extraction
 */
export interface PersonDraft {
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
  suggestedRole: string | null;
  matchedPersonId: string | null;
  matchedPerson: {
    id: string;
    canonicalName: string;
    shortBio: string;
    currentOrg: string | null;
    role: string;
  } | null;
  matchConfidence: number | null;
  status: PersonDraftStatus;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Person draft statistics
 */
export interface PersonDraftStats {
  total: number;
  byStatus: Record<PersonDraftStatus, number>;
}

/**
 * Approve person draft request with optional overrides
 */
export interface ApprovePersonDraftRequest {
  canonicalName?: string;
  shortBio?: string;
  currentOrg?: string;
  role?: 'researcher' | 'executive' | 'founder' | 'policy_maker' | 'engineer' | 'other';
}

/**
 * Person Drafts API
 * Sprint KPC-4 - AI Entity Detection & Auto-Linking
 */
export const personDraftsApi = {
  /**
   * Get all person drafts with optional filtering
   */
  async getAll(params?: {
    status?: PersonDraftStatus;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<PersonDraft>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${API_BASE}/admin/person-drafts${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<PersonDraft>>(url, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get a single draft by ID
   */
  async getById(id: string): Promise<PersonDraft> {
    return fetchJson<PersonDraft>(`${API_BASE}/admin/person-drafts/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get draft statistics
   */
  async getStats(): Promise<PersonDraftStats> {
    return fetchJson<PersonDraftStats>(`${API_BASE}/admin/person-drafts/stats`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Approve a draft and create a new Person
   */
  async approve(
    id: string,
    data?: ApprovePersonDraftRequest
  ): Promise<{ message: string; person: { id: string; canonicalName: string; role: string; shortBio: string } }> {
    return fetchJson<{ message: string; person: { id: string; canonicalName: string; role: string; shortBio: string } }>(
      `${API_BASE}/admin/person-drafts/${id}/approve`,
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
      `${API_BASE}/admin/person-drafts/${id}/reject`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      }
    );
  },

  /**
   * Merge a draft with an existing Person
   */
  async merge(
    id: string,
    personId: string
  ): Promise<{ message: string; person: { id: string; canonicalName: string }; aliasAdded: boolean }> {
    return fetchJson<{ message: string; person: { id: string; canonicalName: string }; aliasAdded: boolean }>(
      `${API_BASE}/admin/person-drafts/${id}/merge`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ personId }),
      }
    );
  },

  /**
   * Batch reject multiple drafts
   */
  async batchReject(draftIds: string[], reason?: string): Promise<{ message: string; count: number }> {
    return fetchJson<{ message: string; count: number }>(
      `${API_BASE}/admin/person-drafts/batch-reject`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ draftIds, reason }),
      }
    );
  },
};

// =============================================================================
// News Quiz API (Sprint LEarn-2)
// =============================================================================

/**
 * Quiz question type
 */
export type QuizQuestionType = 'fact_recall' | 'concept_application' | 'timeline' | 'impact';

/**
 * Quiz question from the API
 */
export interface NewsQuizQuestion {
  index: number;
  newsEventId: string;
  newsHeadline: string;
  questionType: QuizQuestionType;
  question: string;
  options: string[];
  relatedConceptId?: string;
  relatedConceptName?: string;
}

/**
 * Quiz data from the API
 */
export interface NewsQuiz {
  id: string;
  weekOf: string;
  questionCount: number;
  questions: NewsQuizQuestion[];
  createdAt?: string;
}

/**
 * Quiz submission answer
 */
export interface QuizAnswer {
  questionIndex: number;
  selectedAnswer: number;
}

/**
 * Quiz submission result
 */
export interface QuizResult {
  questionIndex: number;
  correct: boolean;
  correctAnswer: number;
  explanation: string;
}

/**
 * Quiz submission response
 */
export interface QuizSubmitResponse {
  success: boolean;
  data: {
    score: number;
    totalQuestions: number;
    percentage: number;
    results: QuizResult[];
  };
}

/**
 * User quiz history item
 */
export interface UserQuizHistoryItem {
  quizId: string;
  weekOf: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
}

/**
 * News Quiz API
 */
export const newsQuizApi = {
  /**
   * Get the current week's quiz
   */
  async getCurrent(): Promise<{
    data: NewsQuiz | null;
    message?: string;
    weekStart: string;
    weekEnd: string;
  }> {
    return fetchJson<{
      data: NewsQuiz | null;
      message?: string;
      weekStart: string;
      weekEnd: string;
    }>(`${API_BASE}/news-quiz/current`);
  },

  /**
   * Get quiz history
   */
  async getHistory(limit?: number): Promise<{
    data: Array<{ id: string; weekOf: string; questionCount: number; createdAt: string }>;
    total: number;
  }> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<{
      data: Array<{ id: string; weekOf: string; questionCount: number; createdAt: string }>;
      total: number;
    }>(`${API_BASE}/news-quiz/history${params}`);
  },

  /**
   * Get a specific quiz by ID
   */
  async getById(id: string): Promise<{ data: NewsQuiz }> {
    return fetchJson<{ data: NewsQuiz }>(`${API_BASE}/news-quiz/${id}`);
  },

  /**
   * Submit quiz answers
   */
  async submit(
    quizId: string,
    sessionId: string,
    answers: QuizAnswer[]
  ): Promise<QuizSubmitResponse> {
    return fetchJson<QuizSubmitResponse>(`${API_BASE}/news-quiz/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, answers }),
    });
  },

  /**
   * Get user's quiz history
   */
  async getUserHistory(sessionId: string, limit?: number): Promise<{
    data: UserQuizHistoryItem[];
    total: number;
  }> {
    const params = new URLSearchParams({ sessionId });
    if (limit) params.set('limit', String(limit));
    return fetchJson<{
      data: UserQuizHistoryItem[];
      total: number;
    }>(`${API_BASE}/news-quiz/user-history?${params.toString()}`);
  },

  /**
   * Generate a new quiz (admin only)
   */
  async generate(options?: {
    questionCount?: number;
    daysBack?: number;
    forceRegenerate?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      weekOf: string;
      questionCount: number;
      questions: unknown[];
    };
  }> {
    return fetchJson<{
      success: boolean;
      message: string;
      data: {
        weekOf: string;
        questionCount: number;
        questions: unknown[];
      };
    }>(`${API_BASE}/admin/news-quiz/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(options || {}),
    });
  },
};

// =============================================================================
// Subject Taxonomy API (Sprint Subj-1)
// =============================================================================

/**
 * Subject type for API responses
 */
export interface Subject {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  level: number;
  parentId: string | null;
  path: string;
  domainSlug: string;
  defaultDifficulty: string | null;
  learningObjectives: string[];
  color: string | null;
  icon: string | null;
  children?: Subject[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Subject synonym for API responses
 */
export interface SubjectSynonym {
  id: string;
  subjectId: string;
  term: string;
  subject?: Subject;
}

/**
 * Content-subject assignment for API responses
 */
export interface ContentSubjectAssignment {
  id: string;
  contentType: string;
  contentId: string;
  subjectId: string;
  isPrimary: boolean;
  confidence: number | null;
  source: string;
  createdAt: string;
  subject?: Subject;
}

/**
 * Subject statistics
 */
export interface SubjectStats {
  subjectSlug: string;
  milestones: number;
  glossaryTerms: number;
  currentEvents: number;
  persons: number;
  organizations: number;
  total: number;
}

/**
 * Subject content result (Sprint Subj-4)
 */
export interface SubjectContent {
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
    category: string;
    significance: number;
    organizationId: string | null;
    sourceUrl: string | null;
    tags: string;
    tldr: string | null;
  }>;
  glossaryTerms: Array<{
    id: string;
    term: string;
    shortDefinition: string;
    fullDefinition: string;
    category: string | null;
  }>;
  currentEvents: Array<{
    id: string;
    headline: string;
    summary: string;
    publishedAt: string;
    sourceUrl: string | null;
  }>;
  persons: Array<{
    id: string;
    canonicalName: string;
    slug: string;
    shortBio: string;
    role: string | null;
    focusAreas: string;
    imageUrl: string | null;
  }>;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    shortDescription: string;
    type: string;
    focusAreas: string;
    logoUrl: string | null;
  }>;
  total: number;
}

/**
 * Generated learning path (Sprint Subj-4)
 */
export interface GeneratedLearningPath {
  title: string;
  slug: string;
  description: string;
  targetAudience: string;
  difficulty: string;
  estimatedMinutes: number;
  milestoneIds: string[];
  conceptsCovered: string[];
  keyTakeaways: string[];
  isAutoGenerated: boolean;
  subjectSlug?: string;
  crossSubjectSlugs?: string[];
}

/**
 * Related content item (Sprint Subj-4)
 */
export interface RelatedContentItem {
  contentType: string;
  contentId: string;
  title: string;
  overlapScore: number;
}

/**
 * Subject API client
 */
export const subjectsApi = {
  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Get full subject taxonomy tree
   */
  async getTree(): Promise<Subject[]> {
    return fetchJson<Subject[]>(`${API_BASE}/subjects/tree`);
  },

  /**
   * Get subject by slug
   */
  async getBySlug(slug: string): Promise<Subject> {
    return fetchJson<Subject>(`${API_BASE}/subjects/${slug}`);
  },

  /**
   * Get ancestors (parent chain) for a subject
   */
  async getAncestors(slug: string): Promise<Subject[]> {
    return fetchJson<Subject[]>(`${API_BASE}/subjects/${slug}/ancestors`);
  },

  /**
   * Get content statistics for a subject
   */
  async getStats(slug: string, params?: { includeChildren?: boolean }): Promise<SubjectStats> {
    const searchParams = new URLSearchParams();
    if (params?.includeChildren) searchParams.set('includeChildren', 'true');
    const query = searchParams.toString();
    return fetchJson<SubjectStats>(`${API_BASE}/subjects/${slug}/stats${query ? `?${query}` : ''}`);
  },

  /**
   * Get content for a subject (hydrated or IDs only)
   */
  async getContent(slug: string, params?: {
    hydrated?: boolean;
    types?: string[];
    includeChildren?: boolean;
    primaryOnly?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'date' | 'significance' | 'confidence';
  }): Promise<SubjectContent> {
    const searchParams = new URLSearchParams();
    if (params?.hydrated) searchParams.set('hydrated', 'true');
    if (params?.types?.length) searchParams.set('types', params.types.join(','));
    if (params?.includeChildren) searchParams.set('includeChildren', 'true');
    if (params?.primaryOnly) searchParams.set('primaryOnly', 'true');
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);

    const queryString = searchParams.toString();
    return fetchJson<SubjectContent>(
      `${API_BASE}/subjects/${slug}/content${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get auto-generated learning path for a subject
   */
  async getLearningPath(slug: string): Promise<GeneratedLearningPath> {
    return fetchJson<GeneratedLearningPath>(`${API_BASE}/subjects/${slug}/learning-path`);
  },

  /**
   * Generate cross-subject learning path
   */
  async getCrossPath(subjects: string[], options?: {
    title?: string;
    maxMilestones?: number;
  }): Promise<GeneratedLearningPath> {
    return fetchJson<GeneratedLearningPath>(`${API_BASE}/subjects/cross-path`, {
      method: 'POST',
      body: JSON.stringify({ subjects, ...options }),
    });
  },

  /**
   * Get related content (shares subjects with given content)
   */
  async getRelatedContent(contentType: string, contentId: string, limit?: number): Promise<RelatedContentItem[]> {
    const params = new URLSearchParams({
      contentType,
      contentId,
    });
    if (limit) params.set('limit', String(limit));
    return fetchJson<RelatedContentItem[]>(`${API_BASE}/subjects/related?${params.toString()}`);
  },

  /**
   * Search subjects by term
   */
  async search(query: string): Promise<Subject[]> {
    const params = new URLSearchParams({ q: query });
    return fetchJson<Subject[]>(`${API_BASE}/subjects/search?${params.toString()}`);
  },

  /**
   * Get subjects assigned to a specific piece of content (public)
   * Sprint Subj-5: For displaying subject badges on content cards
   */
  async getSubjectsForContent(contentType: string, contentId: string): Promise<ContentSubjectAssignment[]> {
    const params = new URLSearchParams({ contentType, contentId });
    return fetchJson<ContentSubjectAssignment[]>(`${API_BASE}/subjects/for-content?${params.toString()}`);
  },

  // ==========================================================================
  // Admin Methods
  // ==========================================================================

  /**
   * Get all subjects (admin, with pagination)
   */
  async getAll(params?: {
    level?: number;
    domainSlug?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ subjects: Subject[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.level !== undefined) searchParams.set('level', String(params.level));
    if (params?.domainSlug) searchParams.set('domainSlug', params.domainSlug);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const queryString = searchParams.toString();
    return fetchJson<{ subjects: Subject[]; total: number }>(
      `${API_BASE}/admin/subjects${queryString ? `?${queryString}` : ''}`,
      { headers: getAuthHeaders() }
    );
  },

  /**
   * Create a new subject (admin)
   */
  async create(data: {
    name: string;
    slug?: string;
    description?: string;
    parentId?: string;
    defaultDifficulty?: string;
    learningObjectives?: string[];
    color?: string;
    icon?: string;
  }): Promise<Subject> {
    return fetchJson<Subject>(`${API_BASE}/admin/subjects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a subject (admin)
   */
  async update(id: string, data: {
    name?: string;
    description?: string;
    defaultDifficulty?: string;
    learningObjectives?: string[];
    color?: string;
    icon?: string;
  }): Promise<Subject> {
    return fetchJson<Subject>(`${API_BASE}/admin/subjects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a subject (admin)
   */
  async delete(id: string, reassignTo?: string): Promise<void> {
    const params = reassignTo ? `?reassignTo=${reassignTo}` : '';
    return fetchJson<void>(`${API_BASE}/admin/subjects/${id}${params}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  // ==========================================================================
  // Synonym Methods (Admin)
  // ==========================================================================

  /**
   * Get all synonyms
   */
  async getSynonyms(params?: {
    subjectId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ synonyms: SubjectSynonym[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.subjectId) searchParams.set('subjectId', params.subjectId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const queryString = searchParams.toString();
    return fetchJson<{ synonyms: SubjectSynonym[]; total: number }>(
      `${API_BASE}/admin/subjects/synonyms${queryString ? `?${queryString}` : ''}`,
      { headers: getAuthHeaders() }
    );
  },

  /**
   * Create a synonym
   */
  async createSynonym(data: { term: string; subjectId: string }): Promise<SubjectSynonym> {
    return fetchJson<SubjectSynonym>(`${API_BASE}/admin/subjects/synonyms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a synonym
   */
  async deleteSynonym(id: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/admin/subjects/synonyms/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  // ==========================================================================
  // Content Subject Methods (Admin)
  // ==========================================================================

  /**
   * Get subjects for a content item
   */
  async getContentSubjects(
    contentType: string,
    contentId: string
  ): Promise<ContentSubjectAssignment[]> {
    return fetchJson<ContentSubjectAssignment[]>(
      `${API_BASE}/admin/content/${contentType}/${contentId}/subjects`,
      { headers: getAuthHeaders() }
    );
  },

  /**
   * Set subjects for a content item
   */
  async setContentSubjects(
    contentType: string,
    contentId: string,
    subjects: Array<{ subjectId: string; isPrimary?: boolean }>
  ): Promise<ContentSubjectAssignment[]> {
    return fetchJson<ContentSubjectAssignment[]>(
      `${API_BASE}/admin/content/${contentType}/${contentId}/subjects`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ subjects }),
      }
    );
  },

  /**
   * Add a subject to content
   */
  async addContentSubject(
    contentType: string,
    contentId: string,
    subjectId: string,
    options?: { isPrimary?: boolean; confidence?: number; source?: string }
  ): Promise<ContentSubjectAssignment> {
    return fetchJson<ContentSubjectAssignment>(
      `${API_BASE}/admin/content/${contentType}/${contentId}/subjects`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ subjectId, ...options }),
      }
    );
  },

  /**
   * Remove a subject from content
   */
  async removeContentSubject(
    contentType: string,
    contentId: string,
    subjectId: string
  ): Promise<void> {
    return fetchJson<void>(
      `${API_BASE}/admin/content/${contentType}/${contentId}/subjects/${subjectId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
  },
};

// =============================================================================
// Sprint SEO-3: Era Landing Pages API
// =============================================================================

/**
 * Era milestone summary
 */
export interface EraMilestone {
  id: string;
  title: string;
  date: string;
  category: string;
  significance: number;
  organization: string | null;
  description: string;
}

/**
 * Era key figure summary
 */
export interface EraKeyFigure {
  id: string;
  canonicalName: string;
  slug: string;
  shortBio: string;
  currentRole: string | null;
  imageUrl: string | null;
  contributionCount: number;
}

/**
 * Era key term summary
 */
export interface EraKeyTerm {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  category: string;
}

/**
 * Era page data response from API
 */
export interface EraPageResponse {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  milestones: EraMilestone[];
  keyFigures: EraKeyFigure[];
  keyTerms: EraKeyTerm[];
  stats: {
    totalMilestones: number;
    totalContributors: number;
    totalTerms: number;
    topCategories: { category: string; count: number }[];
  };
}

/**
 * Era list item
 */
export interface EraListItem {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
}

/**
 * Era API client
 */
export const erasApi = {
  /**
   * Get all available eras
   */
  async getAll(): Promise<{ data: EraListItem[] }> {
    return fetchJson<{ data: EraListItem[] }>(`${API_BASE}/eras`);
  },

  /**
   * Get era page data by slug
   */
  async getBySlug(
    slug: string,
    options?: {
      milestoneLimit?: number;
      figureLimit?: number;
      termLimit?: number;
    }
  ): Promise<EraPageResponse> {
    const params = new URLSearchParams();
    if (options?.milestoneLimit) {
      params.set('milestoneLimit', options.milestoneLimit.toString());
    }
    if (options?.figureLimit) {
      params.set('figureLimit', options.figureLimit.toString());
    }
    if (options?.termLimit) {
      params.set('termLimit', options.termLimit.toString());
    }
    const queryString = params.toString();
    const url = queryString
      ? `${API_BASE}/eras/${slug}?${queryString}`
      : `${API_BASE}/eras/${slug}`;
    return fetchJson<EraPageResponse>(url);
  },
};

// =============================================================================
// Comparison API (Sprint SEO-4)
// =============================================================================

/**
 * Comparison entity types
 */
export type ComparisonEntityType = 'organization' | 'person' | 'term';

/**
 * Organization comparison data
 */
export interface OrganizationComparisonData {
  id: string;
  name: string;
  slug: string;
  type: string;
  shortDescription: string;
  mission: string | null;
  foundedYear: number | null;
  headquarters: string | null;
  focusAreas: string[];
  products: string[];
  logoUrl: string | null;
  websiteUrl: string | null;
  wikipediaUrl: string | null;
  linkedInUrl: string | null;
  employeeCount: number;
  milestoneCount: number;
  notablePeople: {
    id: string;
    name: string;
    slug: string;
    role: string | null;
    imageUrl: string | null;
  }[];
}

/**
 * Person comparison data
 */
export interface PersonComparisonData {
  id: string;
  canonicalName: string;
  slug: string;
  shortBio: string;
  role: string;
  currentRole: string | null;
  currentOrg: {
    id: string;
    name: string;
    slug: string;
  } | null;
  focusAreas: string[];
  imageUrl: string | null;
  wikipediaUrl: string | null;
  linkedInUrl: string | null;
  twitterHandle: string | null;
  contributions: string | null;
  milestoneCount: number;
  affiliationCount: number;
}

/**
 * Glossary term comparison data
 */
export interface TermComparisonData {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  fullDefinition: string;
  category: string;
  difficulty: number;
  conceptType: string;
  example: string | null;
  businessContext: string | null;
  relatedTermCount: number;
  keyFigureCount: number;
  milestoneCount: number;
}

/**
 * Comparison response structure
 */
export interface ComparisonResponse<T = unknown> {
  type: ComparisonEntityType;
  entityA: T;
  entityB: T;
  comparisonFields: string[];
  comparisonSlug: string;
  canonicalUrl: string;
}

/**
 * Comparison list item
 */
export interface ComparisonListItem {
  slugA: string;
  slugB: string;
  nameA: string;
  nameB: string;
  comparisonSlug: string;
  url: string;
}

/**
 * Comparison type overview
 */
export interface ComparisonTypeOverview {
  type: ComparisonEntityType;
  label: string;
  description: string;
  sampleComparisons: {
    nameA: string;
    nameB: string;
    url: string;
  }[];
}

/**
 * Comparison API client
 */
export const comparisonApi = {
  /**
   * Get overview of all comparison types (for hub page)
   */
  async getOverview(): Promise<{ types: ComparisonTypeOverview[] }> {
    return fetchJson<{ types: ComparisonTypeOverview[] }>(`${API_BASE}/compare`);
  },

  /**
   * Get list of comparisons for a specific type
   */
  async getList(
    type: ComparisonEntityType,
    limit?: number
  ): Promise<{ type: string; count: number; comparisons: ComparisonListItem[] }> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<{ type: string; count: number; comparisons: ComparisonListItem[] }>(
      `${API_BASE}/compare/${type}${params}`
    );
  },

  /**
   * Get comparison data for two entities
   */
  async getComparison<T = unknown>(
    type: ComparisonEntityType,
    slugA: string,
    slugB: string
  ): Promise<ComparisonResponse<T>> {
    return fetchJson<ComparisonResponse<T>>(
      `${API_BASE}/compare/${type}/${slugA}/${slugB}`
    );
  },

  /**
   * Get organization comparison
   */
  async compareOrganizations(
    slugA: string,
    slugB: string
  ): Promise<ComparisonResponse<OrganizationComparisonData>> {
    return this.getComparison<OrganizationComparisonData>('organization', slugA, slugB);
  },

  /**
   * Get person comparison
   */
  async comparePersons(
    slugA: string,
    slugB: string
  ): Promise<ComparisonResponse<PersonComparisonData>> {
    return this.getComparison<PersonComparisonData>('person', slugA, slugB);
  },

  /**
   * Get term comparison
   */
  async compareTerms(
    slugA: string,
    slugB: string
  ): Promise<ComparisonResponse<TermComparisonData>> {
    return this.getComparison<TermComparisonData>('term', slugA, slugB);
  },
};

// =============================================================================
// Explained Pages API (Sprint SEO-4)
// =============================================================================

/**
 * Key figure linked to a term
 */
export interface ExplainedKeyFigure {
  id: string;
  canonicalName: string;
  slug: string;
  shortBio: string;
  imageUrl: string | null;
  currentRole: string | null;
  contributionNote: string | null;
}

/**
 * Related term
 */
export interface ExplainedRelatedTerm {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  category: string;
}

/**
 * Related milestone
 */
export interface ExplainedMilestone {
  id: string;
  title: string;
  date: string;
  category: string;
  significance: number;
  relevanceNote: string | null;
}

/**
 * FAQ item
 */
export interface ExplainedFAQ {
  question: string;
  answer: string;
}

/**
 * Full explained page data
 */
export interface ExplainedPageData {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  fullDefinition: string;
  quickAnswer: string | null;
  example: string | null;
  businessContext: string | null;
  inMeetingExample: string | null;
  category: string;
  difficulty: number;
  conceptType: string;
  // AI-generated content (Sprint SEO-4 Task 8)
  historySection: string | null;
  howItWorksSection: string | null;
  keyFigures: ExplainedKeyFigure[];
  relatedTerms: ExplainedRelatedTerm[];
  relatedMilestones: ExplainedMilestone[];
  faqs: ExplainedFAQ[];
  stats: {
    keyFigureCount: number;
    relatedTermCount: number;
    milestoneCount: number;
  };
  canonicalUrl: string;
  // Sprint SEO-5: E-E-A-T freshness signals
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Explained page list item
 */
export interface ExplainedListItem {
  slug: string;
  term: string;
  url: string;
  lastmod: string;
}

/**
 * Explained pages API client
 */
export const explainedApi = {
  /**
   * Get list of all explained pages
   */
  async getList(limit?: number): Promise<{ count: number; pages: ExplainedListItem[] }> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<{ count: number; pages: ExplainedListItem[] }>(
      `${API_BASE}/explained${params}`
    );
  },

  /**
   * Get explained page data for a term
   */
  async getBySlug(slug: string): Promise<ExplainedPageData> {
    return fetchJson<ExplainedPageData>(`${API_BASE}/explained/${slug}`);
  },
};

// ============================================================================
// Events API (Sprint SEO-4 - Milestone Event Pages)
// ============================================================================

/**
 * Event page contributor
 */
export interface EventContributor {
  id: string;
  canonicalName: string;
  slug: string;
  shortBio: string;
  role: string;
  imageUrl: string | null;
  contributionType: string | null;
}

/**
 * Related milestone for event page
 */
export interface EventRelatedMilestone {
  id: string;
  title: string;
  date: string;
  category: string;
  significance: number;
  tldr: string | null;
  relation: 'before' | 'after' | 'related';
}

/**
 * Linked glossary term for event page
 */
export interface EventGlossaryTerm {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  relevanceNote: string | null;
}

/**
 * Organization for event page
 */
export interface EventOrganization {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  logoUrl: string | null;
}

/**
 * Full event page data
 */
export interface EventPageData {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  significance: number;
  era: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  tags: string[];

  // Layered content
  tldr: string | null;
  simpleExplanation: string | null;
  businessImpact: string | null;
  technicalDepth: string | null;
  historicalContext: string | null;
  whyItMattersToday: string | null;
  commonMisconceptions: string | null;

  // Enriched relations
  organization: EventOrganization | null;
  contributors: EventContributor[];
  linkedTerms: EventGlossaryTerm[];
  relatedMilestones: EventRelatedMilestone[];

  // Stats for display
  stats: {
    contributorCount: number;
    linkedTermCount: number;
    relatedMilestoneCount: number;
  };

  // SEO
  canonicalUrl: string;
  // Sprint SEO-5: E-E-A-T freshness signals
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Event list item for hub page
 */
export interface EventListItem {
  id: string;
  title: string;
  date: string;
  category: string;
  significance: number;
  url: string;
  tldr: string | null;
  organization: string | null;
}

/**
 * Events API client
 */
export const eventsApi = {
  /**
   * Get list of all events
   */
  async getList(limit?: number): Promise<{ count: number; total: number; events: EventListItem[] }> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<{ count: number; total: number; events: EventListItem[] }>(
      `${API_BASE}/events${params}`
    );
  },

  /**
   * Get event page data for a milestone
   */
  async getById(id: string): Promise<EventPageData> {
    return fetchJson<EventPageData>(`${API_BASE}/events/${id}`);
  },
};

// ============================================================================
// Who Invented API (Sprint SEO-4 - Who Invented X? Pages)
// ============================================================================

/**
 * Person who contributed to a concept
 */
export interface WhoInventedPerson {
  id: string;
  canonicalName: string;
  slug: string;
  shortBio: string;
  role: string;
  imageUrl: string | null;
  contributionNote: string | null;
  currentOrg: string | null;
  currentRole: string | null;
}

/**
 * Milestone for who-invented page
 */
export interface WhoInventedMilestone {
  id: string;
  title: string;
  date: string;
  category: string;
  significance: number;
  tldr: string | null;
  organization: string | null;
}

/**
 * Organization for who-invented page
 */
export interface WhoInventedOrganization {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  logoUrl: string | null;
  contributionNote: string | null;
}

/**
 * Related term for who-invented page
 */
export interface WhoInventedRelatedTerm {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
}

/**
 * Full who-invented page data
 */
export interface WhoInventedPageData {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  fullDefinition: string;
  category: string;
  difficulty: number;
  quickAnswer: string | null;
  inventors: WhoInventedPerson[];
  pioneers: WhoInventedPerson[];
  contributors: WhoInventedPerson[];
  organizations: WhoInventedOrganization[];
  milestones: WhoInventedMilestone[];
  relatedTerms: WhoInventedRelatedTerm[];
  stats: {
    inventorCount: number;
    pioneerCount: number;
    contributorCount: number;
    organizationCount: number;
    milestoneCount: number;
  };
  canonicalUrl: string;
  // Sprint SEO-5: E-E-A-T freshness signals
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Who-invented list item for hub page
 */
export interface WhoInventedListItem {
  slug: string;
  term: string;
  shortDefinition: string;
  url: string;
  inventorCount: number;
  hasInventors: boolean;
}

/**
 * Who Invented API client
 */
export const whoInventedApi = {
  /**
   * Get list of all who-invented pages
   */
  async getList(limit?: number): Promise<{ count: number; pages: WhoInventedListItem[] }> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<{ count: number; pages: WhoInventedListItem[] }>(
      `${API_BASE}/who-invented${params}`
    );
  },

  /**
   * Get who-invented page data for a term
   */
  async getBySlug(slug: string): Promise<WhoInventedPageData> {
    return fetchJson<WhoInventedPageData>(`${API_BASE}/who-invented/${slug}`);
  },
};

// =============================================================================
// SEO Content Generation API (Sprint SEO-4 Task 8)
// =============================================================================

/**
 * SEO content generation stats
 */
export interface SeoContentStats {
  total: number;
  pending: number;
  generating: number;
  complete: number;
  error: number;
}

/**
 * Term needing SEO content generation
 */
export interface SeoContentTerm {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
  fullDefinition: string;
  category: string;
  seoContentStatus: string;
  hasKeyFigures: boolean;
}

/**
 * Term content for preview/editing
 */
export interface SeoTermContent {
  id: string;
  term: string;
  slug: string | null;
  historySection: string | null;
  howItWorksSection: string | null;
  faqItems: Array<{ question: string; answer: string }>;
  whoInventedQuickAnswer: string | null;
  seoContentStatus: string;
  seoContentGeneratedAt: string | null;
}

/**
 * Generation result
 */
export interface SeoGenerationResult {
  success: boolean;
  termId: string;
  term: string;
  error?: string;
}

/**
 * Bulk generation result
 */
export interface SeoBulkGenerationResult {
  total: number;
  success: number;
  failed: number;
  skipped?: number;
  results: SeoGenerationResult[];
}

export const seoContentApi = {
  /**
   * Get generation statistics
   */
  async getStats(): Promise<SeoContentStats> {
    return fetchJson<SeoContentStats>(`${API_BASE}/admin/seo-content/stats`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Get terms needing generation
   */
  async getTermsNeedingGeneration(limit?: number): Promise<{ terms: SeoContentTerm[]; total: number }> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<{ terms: SeoContentTerm[]; total: number }>(
      `${API_BASE}/admin/seo-content/terms${params}`,
      { headers: getAuthHeaders() }
    );
  },

  /**
   * Get a term's generated content
   */
  async getTermContent(termId: string): Promise<SeoTermContent> {
    return fetchJson<SeoTermContent>(`${API_BASE}/admin/seo-content/terms/${termId}`, {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Update a term's generated content
   */
  async updateTermContent(
    termId: string,
    data: {
      historySection?: string;
      howItWorksSection?: string;
      faqItems?: Array<{ question: string; answer: string }>;
      whoInventedQuickAnswer?: string;
    }
  ): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`${API_BASE}/admin/seo-content/terms/${termId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Reset a term's status to pending
   */
  async resetTermStatus(termId: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`${API_BASE}/admin/seo-content/terms/${termId}/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Generate Explained content for a single term
   */
  async generateExplained(termId: string): Promise<SeoGenerationResult> {
    return fetchJson<SeoGenerationResult>(`${API_BASE}/admin/seo-content/generate/explained/${termId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Generate Who Invented content for a single term
   */
  async generateWhoInvented(termId: string): Promise<SeoGenerationResult> {
    return fetchJson<SeoGenerationResult>(`${API_BASE}/admin/seo-content/generate/who-invented/${termId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Bulk generate Explained content
   */
  async bulkGenerateExplained(termIds: string[]): Promise<SeoBulkGenerationResult> {
    return fetchJson<SeoBulkGenerationResult>(`${API_BASE}/admin/seo-content/generate/explained/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ termIds }),
    });
  },

  /**
   * Bulk generate Who Invented content
   */
  async bulkGenerateWhoInvented(termIds: string[]): Promise<SeoBulkGenerationResult> {
    return fetchJson<SeoBulkGenerationResult>(`${API_BASE}/admin/seo-content/generate/who-invented/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ termIds }),
    });
  },
};

// =============================================================================
// Blog API (Sprint Blog-2)
// =============================================================================

import type {
  BlogPost as BlogPostType,
  BlogPostListItem,
  Author as AuthorType,
  BlogListResponse,
} from '../types/blog';

export interface BlogListOptions {
  page?: number;
  pageSize?: number;
  tag?: string;
  subjectSlug?: string;
  authorSlug?: string;
}

export const blogApi = {
  async list(options: BlogListOptions = {}): Promise<BlogListResponse> {
    const qs = new URLSearchParams();
    if (options.page) qs.set('page', String(options.page));
    if (options.pageSize) qs.set('pageSize', String(options.pageSize));
    if (options.tag) qs.set('tag', options.tag);
    if (options.subjectSlug) qs.set('subjectSlug', options.subjectSlug);
    if (options.authorSlug) qs.set('authorSlug', options.authorSlug);
    const url = `${API_BASE}/blog${qs.toString() ? `?${qs.toString()}` : ''}`;
    return fetchJson<BlogListResponse>(url);
  },

  async getBySlug(slug: string): Promise<{ post: BlogPostType }> {
    return fetchJson<{ post: BlogPostType }>(`${API_BASE}/blog/${slug}`);
  },

  async related(slug: string): Promise<{ posts: BlogPostListItem[] }> {
    return fetchJson<{ posts: BlogPostListItem[] }>(
      `${API_BASE}/blog/related?slug=${encodeURIComponent(slug)}`
    );
  },

  async forEntity(
    type: 'milestone' | 'person' | 'organization' | 'glossary_term' | 'subject',
    id: string,
    limit = 3
  ): Promise<{ posts: BlogPostListItem[] }> {
    return fetchJson<{ posts: BlogPostListItem[] }>(
      `${API_BASE}/blog/for-entity?type=${type}&id=${encodeURIComponent(id)}&limit=${limit}`
    );
  },
};

export const authorsApi = {
  async getBySlug(
    slug: string
  ): Promise<{ author: AuthorType; posts: BlogPostListItem[] }> {
    return fetchJson<{ author: AuthorType; posts: BlogPostListItem[] }>(
      `${API_BASE}/authors/${slug}`
    );
  },
};

// =============================================================================
// Admin Blog API (Sprint Blog-3)
// =============================================================================

import type {
  CreateBlogPostRequest,
  UpdateBlogPostRequest,
  BlogPostStatus,
} from '../types/blog';

export interface AdminBlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl: string | null;
  authorId: string;
  status: BlogPostStatus;
  publishedAt: string | null;
  scheduledFor: string | null;
  readingMinutes: number;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  tags: string; // JSON string — client parses
  featured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  author: AuthorType;
  subjects: Array<{
    postId: string;
    subjectId: string;
    isPrimary: boolean;
    subject: { id: string; slug: string; name: string };
  }>;
  relations: Array<{
    id: string;
    postId: string;
    entityType: string;
    entityId: string;
    relationLabel: string | null;
    createdAt: string;
  }>;
}

export interface AdminBlogListResult {
  posts: AdminBlogPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UploadUrlResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export interface PreviewTokenResult {
  token: string;
  previewUrl: string;
  expiresInSeconds: number;
}

export const blogAdminApi = {
  async list(params?: {
    status?: string;
    authorId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminBlogListResult> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.authorId) qs.set('authorId', params.authorId);
    if (params?.q) qs.set('q', params.q);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const url = `${API_BASE}/admin/blog${qs.toString() ? `?${qs.toString()}` : ''}`;
    return fetchJson<AdminBlogListResult>(url, { headers: getAuthHeaders() });
  },

  async get(id: string): Promise<{ post: AdminBlogPost }> {
    return fetchJson<{ post: AdminBlogPost }>(`${API_BASE}/admin/blog/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  async create(input: CreateBlogPostRequest): Promise<{ post: AdminBlogPost }> {
    return fetchJson<{ post: AdminBlogPost }>(`${API_BASE}/admin/blog`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  async update(id: string, patch: UpdateBlogPostRequest): Promise<{ post: AdminBlogPost }> {
    return fetchJson<{ post: AdminBlogPost }>(`${API_BASE}/admin/blog/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  },

  async publish(id: string): Promise<{ post: AdminBlogPost }> {
    return fetchJson<{ post: AdminBlogPost }>(`${API_BASE}/admin/blog/${id}/publish`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async schedule(id: string, scheduledFor: Date): Promise<{ post: AdminBlogPost }> {
    return fetchJson<{ post: AdminBlogPost }>(`${API_BASE}/admin/blog/${id}/schedule`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledFor: scheduledFor.toISOString() }),
    });
  },

  async archive(id: string): Promise<{ post: AdminBlogPost }> {
    return fetchJson<{ post: AdminBlogPost }>(`${API_BASE}/admin/blog/${id}/archive`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async remove(id: string): Promise<void> {
    await fetchJson<unknown>(`${API_BASE}/admin/blog/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  async getUploadUrl(input: { filename: string; contentType: string }): Promise<UploadUrlResult> {
    return fetchJson<UploadUrlResult>(`${API_BASE}/admin/blog/upload-url`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  async getPreviewToken(id: string): Promise<PreviewTokenResult> {
    return fetchJson<PreviewTokenResult>(`${API_BASE}/admin/blog/${id}/preview-token`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },
};

export const authorsAdminApi = {
  async list(): Promise<{ authors: AuthorType[] }> {
    return fetchJson<{ authors: AuthorType[] }>(`${API_BASE}/admin/authors`, {
      headers: getAuthHeaders(),
    });
  },

  async create(input: {
    name: string;
    slug?: string;
    role?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<{ author: AuthorType }> {
    return fetchJson<{ author: AuthorType }>(`${API_BASE}/admin/authors`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  async update(
    id: string,
    patch: { name?: string; role?: string; bio?: string; avatarUrl?: string }
  ): Promise<{ author: AuthorType }> {
    return fetchJson<{ author: AuthorType }>(`${API_BASE}/admin/authors/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  },
};

export type SeoInsightBucket = 'winnable_loss' | 'content_gap' | 'trend_signal' | 'decay';
export type SeoInsightStatus = 'open' | 'actioned' | 'dismissed' | 'shipped';

export interface SeoInsightMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SeoInsight {
  id: string;
  weekStart: string;
  bucket: SeoInsightBucket;
  status: SeoInsightStatus;
  query: string | null;
  page: string;
  currentMetrics: SeoInsightMetrics;
  baselineMetrics: SeoInsightMetrics | null;
  score: number;
  evidence: string;
  suggestedAction: string;
  canonicalPath?: string | null;
}

export interface SeoInsightDetail extends SeoInsight {
  trend: Array<SeoInsightMetrics & { weekStart: string }>;
}

export interface SeoInsightListResult extends PaginatedResponse<SeoInsight> {
  meta: {
    weekStart: string | null;
    availableWeeks: string[];
    counts: Record<SeoInsightBucket, number>;
  };
}

export type SeoClusterBucket = 'cluster_content_gap' | 'cluster_near_win' | 'cluster_topic_theme';
export type SeoClusterHorizon = '28d' | '90d';
export type SeoClusterStatus = SeoInsightStatus;

export interface SeoClusterWindowSummary {
  horizon: SeoClusterHorizon;
  windowStart: string;
  windowEnd: string;
  clusterCount: number;
}

export interface SeoClusterMemberQuery {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface SeoClusterMemberPage {
  page: string;
  path: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface SeoClusterOpportunity {
  id: string;
  horizon: SeoClusterHorizon;
  windowStart: string;
  windowEnd: string;
  bucket: SeoClusterBucket;
  status: SeoClusterStatus;
  clusterKey: string;
  representativeQuery: string;
  primaryPage: string;
  currentMetrics: SeoInsightMetrics;
  memberQueryCount: number;
  memberPageCount: number;
  score: number;
  evidence: string;
  suggestedAction: string;
}

export interface SeoClusterOpportunityDetail extends SeoClusterOpportunity {
  memberQueries: SeoClusterMemberQuery[];
  memberPages: SeoClusterMemberPage[];
}

export interface SeoClusterListResult extends PaginatedResponse<SeoClusterOpportunity> {
  meta: {
    horizon: SeoClusterHorizon;
    windowStart: string | null;
    windowEnd: string | null;
    counts: Record<SeoClusterBucket, number>;
  };
}

export interface SeoRewriteProposal {
  snapshotId: string;
  targetType: 'blog_post';
  targetId: string;
  targetSlug: string;
  targetTitle: string;
  pageUrl: string;
  query: string;
  impressions: number;
  currentTitle: string;
  currentDescription: string;
  proposedTitle: string;
  proposedDescription: string;
  rationale: string;
  confidence: number;
}

export type SeoActionStatusFilter = 'all' | 'shipped' | 'rolled_back' | 'measured';
export type SeoAgentActionStatus = 'shipped' | 'rolled_back' | 'measured';

export interface SeoAgentActionMetadata {
  slug: string;
  pageUrl: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

export type SeoAgentRunStatus = 'success' | 'failed';
export type SeoAgentRunSerperRemainingCreditsSource = 'unavailable' | 'policy_derived' | 'vendor_observed_adjusted';
export type SeoAgentRunSerperWarningLevel = 'ok' | 'watch' | 'warning' | 'critical';

export interface SeoAgentRunSerperSnapshot {
  capturedAt: string;
  configured: boolean;
  enabled: boolean;
  autoTopupEnabled: boolean;
  creditsUsedWeek: number;
  creditsUsedMonth: number;
  effectiveSpendWeekUsd: number;
  effectiveSpendMonthUsd: number;
  remainingCredits: number | null;
  remainingCreditsSource: SeoAgentRunSerperRemainingCreditsSource;
  remainingCreditsObservedAt: string | null;
  projectedDepletionDate: string | null;
  lastSampledAt: string | null;
  warningLevel: SeoAgentRunSerperWarningLevel;
}

export interface SeoAgentRunRecord {
  status: SeoAgentRunStatus;
  startedAt: string;
  completedAt: string;
  weekStart: string | null;
  shippedCount: number;
  proposalCount: number;
  humanOnlyCount: number;
  measuredCount: number;
  digestUrl: string | null;
  errorMessage: string | null;
  serperSnapshot: SeoAgentRunSerperSnapshot | null;
}

export interface SeoAgentActionRecord {
  id: string;
  snapshotId: string | null;
  actionType: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  targetPath: string;
  query: string | null;
  status: SeoAgentActionStatus;
  confidence: number;
  rationale: string;
  shippedAt: string;
  rolledBackAt: string | null;
  measuredAt: string | null;
  before: SeoAgentActionMetadata;
  after: SeoAgentActionMetadata;
}

export type SeoActionListResult = PaginatedResponse<SeoAgentActionRecord>;
export type SeoProposalStatus = 'pending' | 'drafting' | 'approved' | 'rejected' | 'shipped';
export type SeoProposalStatusFilter = 'all' | SeoProposalStatus;
export type SeoProposalType = 'blog_post' | 'evergreen_routing' | 'packaging_fix';
export type SeoProposalHandoffMode = 'blog_draft' | 'manual_routing_review' | 'manual_packaging_fix';

export interface SeoProposalLinkInventoryItem {
  entityType: 'person' | 'organization' | 'glossary_term' | 'milestone';
  id: string;
  label: string;
  path: string;
  reason: string;
}

export interface SeoProposalNewsHook {
  articleId: string;
  title: string;
  externalUrl: string;
  sourceName: string | null;
  publishedAt: string;
}

export interface SeoProposalHandoff {
  mode: SeoProposalHandoffMode;
  label: string;
  topic: string | null;
  keyword: string;
  newsUrl: string | null;
  command: string | null;
  proposalPath: string;
  guidance: string;
}

export interface SeoProposalRoutingPlan {
  currentPath: string;
  representativeQuery: string | null;
  targetPath: string;
  targetLabel: string;
  moveType: 'optimize_current' | 'create_new' | 'expand_existing' | 'internal_link_only';
  rationale: string;
}

export interface SeoProposalPackagingFixPlan {
  pagePath: string;
  pageType: SeoPackagingPageType;
  title: string | null;
  h1: string | null;
  description: string | null;
  canonicalPath: string | null;
  structuredDataTypes: string[];
  issueTypes: SeoPackagingIssueType[];
  issues: SeoPackagingIssueRecord[];
}

export interface SeoProposalRecord {
  id: string;
  sourceType: string;
  sourceId: string;
  proposalType: SeoProposalType;
  targetKeyword: string;
  suggestedAngle: string;
  rationale: string;
  hypothesis: string | null;
  confidence: number;
  status: SeoProposalStatus;
  rejectedReason: string | null;
  createdAt: string;
  actedAt: string | null;
  sourceWindowStart: string;
  sourceWindowEnd: string | null;
  sourceBucket: string | null;
  sourcePage: string;
  sourceQuery: string | null;
  linkInventory: SeoProposalLinkInventoryItem[];
  newsHooks: SeoProposalNewsHook[];
  topicPod: SeoTopicPodPlan | null;
  routingPlan: SeoProposalRoutingPlan | null;
  packagingFixPlan: SeoProposalPackagingFixPlan | null;
  handoff: SeoProposalHandoff;
  draftPost: {
    id: string;
    slug: string;
    title: string;
    status: string;
    publishedAt: string | null;
  } | null;
}

export interface SeoProposalListResult extends PaginatedResponse<SeoProposalRecord> {
  meta: {
    counts: Record<'all' | 'pending' | 'drafting' | 'approved' | 'rejected' | 'shipped', number>;
  };
}

export interface SeoTopicPodPlan {
  keyword: string;
  sourceType: 'cluster_snapshot';
  sourceId: string;
  sourceLabel: string;
  primaryPage: string;
  moveType: 'optimize_current' | 'create_new' | 'expand_existing' | 'internal_link_only';
  hypothesis: string;
  canonicalDestination: {
    type: string;
    label: string;
    path: string;
    exists: boolean;
    reason: string;
  };
  companionAssets: Array<{
    type: string;
    label: string;
    path: string | null;
    status: string;
    reason: string;
  }>;
  internalLinkOpportunities: Array<{
    entityType: string;
    label: string;
    path: string;
    reason: string;
  }>;
}

export type SeoExperimentStatus = 'planned' | 'running' | 'won' | 'flat' | 'lost' | 'archived';
export type SeoExperimentStatusFilter = 'all' | SeoExperimentStatus;
export type SeoExperimentCheckpointState = 'scheduled' | 'due' | 'reviewed' | 'missed';

export interface SeoExperimentMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  windowStart: string;
  windowEnd: string;
}

export interface SeoExperimentCheckpoint {
  label: string;
  reviewWindowDays: number;
  scheduledReviewAt: string;
  state: SeoExperimentCheckpointState;
  reviewedAt: string | null;
  outcome: 'won' | 'flat' | 'lost' | null;
  metricsAfter: SeoExperimentMetrics | null;
  notes: string | null;
}

export interface SeoExperimentRecord {
  id: string;
  sourceType: string;
  sourceId: string;
  proposalId: string | null;
  actionId: string | null;
  targetKeyword: string;
  targetUrl: string;
  hypothesis: string;
  variantType: string;
  status: SeoExperimentStatus;
  scheduledReviewAt: string;
  reviewWindowDays: number;
  notes: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metricsBefore: SeoExperimentMetrics | null;
  metricsAfter: SeoExperimentMetrics | null;
  checkpoints: SeoExperimentCheckpoint[];
  topicPod: SeoTopicPodPlan | null;
}

export interface SeoExperimentListResult extends PaginatedResponse<SeoExperimentRecord> {
  meta: {
    dueCount: number;
    counts: Record<SeoExperimentStatus | 'all', number>;
  };
}

export type SeoPackagingSeverity = 'critical' | 'warning' | 'info';
export type SeoPackagingIssueType =
  | 'evergreen_routing'
  | 'title_link_risk'
  | 'metadata_thin'
  | 'breadcrumb_missing'
  | 'schema_gap';
export type SeoPackagingPageType =
  | 'home'
  | 'timeline'
  | 'news_index'
  | 'news_detail'
  | 'blog_post'
  | 'unknown';

export interface SeoPackagingIssueRecord {
  id: string;
  type: SeoPackagingIssueType;
  severity: SeoPackagingSeverity;
  label: string;
  details: string;
  recommendedFix: string;
}

export interface SeoPackagingEvergreenRecommendation {
  clusterId: string;
  representativeQuery: string;
  targetPath: string;
  targetLabel: string;
  moveType: 'optimize_current' | 'create_new' | 'expand_existing' | 'internal_link_only';
  rationale: string;
}

export interface SeoPackagingAuditRecord {
  id: string;
  windowStart: string;
  windowEnd: string;
  pageUrl: string;
  pagePath: string;
  pageType: SeoPackagingPageType;
  title: string | null;
  h1: string | null;
  description: string | null;
  canonicalPath: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  issueCount: number;
  criticalCount: number;
  experimentActive: boolean;
  issueTypes: SeoPackagingIssueType[];
  issues: SeoPackagingIssueRecord[];
  structuredDataTypes: string[];
  evergreenRecommendation: SeoPackagingEvergreenRecommendation | null;
}

export interface SeoPackagingAuditListResult extends PaginatedResponse<SeoPackagingAuditRecord> {
  meta: {
    windowStart: string;
    windowEnd: string;
    counts: Record<'all' | 'critical' | 'warning' | 'info', number>;
  };
}

export type SeoKeywordOpportunitySourceType = 'gsc_cluster' | 'google_trends' | 'serp_sample' | 'editorial_seed';
export type SeoKeywordOpportunityStatus = 'discovered' | 'scored' | 'promoted' | 'archived';
export type SeoKeywordOpportunityStatusFilter = 'all' | SeoKeywordOpportunityStatus;
export type SeoKeywordOpportunitySourceFilter = 'all' | SeoKeywordOpportunitySourceType;

export type SeoSerperUsageWarningLevel = 'ok' | 'watch' | 'warning' | 'critical';

export interface SeoSerperUsagePolicy {
  endpoint: 'search';
  usdPerThousandQueries: number;
  maxQueriesPerRun: number;
  maxQueriesPerDay: number;
  maxQueriesPerWeek: number;
  cacheTtlDays: number;
  country: string;
  language: string;
  dateRange: string;
  page: number;
}

export interface SeoSerperUsageSummary {
  configured: boolean;
  enabled: boolean;
  pricingEnabled: boolean;
  pausedBySeoAgent: boolean;
  autoTopupEnabled: boolean;
  tierLabel: string | null;
  purchasedCredits: number | null;
  monthlyCreditBudget: number | null;
  creditsUsedToday: number;
  creditsUsedWeek: number;
  creditsUsedMonth: number;
  creditsUsedTotal: number;
  effectiveSpendTodayUsd: number;
  effectiveSpendWeekUsd: number;
  effectiveSpendMonthUsd: number;
  effectiveSpendTotalUsd: number;
  remainingCredits: number | null;
  remainingCreditsSource?: 'unavailable' | 'policy_derived' | 'vendor_observed_adjusted';
  remainingCreditsObservedAt?: string | null;
  projectedDepletionDate: string | null;
  lastSampledAt: string | null;
  warningLevel: SeoSerperUsageWarningLevel;
  policy: SeoSerperUsagePolicy | null;
}

export interface SeoKeywordOpportunityClusterSourceRef {
  clusterId: string;
  bucket: SeoClusterBucket;
  horizon: SeoClusterHorizon;
  windowStart: string;
  windowEnd: string;
  representativeQuery: string;
  primaryPage: string;
  canonicalPath: string;
  moveType: SeoTopicPodPlan['moveType'];
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  memberQueryCount: number;
  memberPageCount: number;
  internalLinkCount: number;
  internalLinkOpportunities?: Array<{
    entityType: string;
    label: string;
    path: string;
    reason: string;
  }>;
}

export interface SeoKeywordOpportunitySerperSourceRef {
  vendor: 'serper';
  requestKey: string;
  originSourceType: SeoKeywordOpportunitySourceType | string;
  originOpportunityId: string;
  originDedupeKey: string;
  query: string;
  country: string;
  language: string;
  dateRange: string;
  page: number;
  sampledAt: string;
  expiresAt: string;
  organicCount: number;
  peopleAlsoAskCount: number;
  relatedSearchCount: number;
  topDomains: string[];
  strongDomainCount: number;
  forumDomainCount: number;
  videoDomainCount: number;
  competitionProxy: number;
  competitionReason: string;
  effectiveCostUsd: number;
}

export type SeoKeywordOpportunitySourceRef =
  | SeoKeywordOpportunityClusterSourceRef
  | SeoKeywordOpportunitySerperSourceRef;

export interface SeoKeywordOpportunityRecord {
  id: string;
  sourceType: SeoKeywordOpportunitySourceType;
  dedupeKey: string;
  seedQuery: string;
  clusterKey: string | null;
  clusterSnapshotId: string | null;
  targetIntent: string;
  demandProxy: number;
  competitionProxy: number;
  laeaFitScore: number;
  overallScore: number;
  pageTypeRecommendation: string;
  targetUrl: string | null;
  rationale: string;
  status: SeoKeywordOpportunityStatus;
  linkedExperimentId: string | null;
  sourceRef: SeoKeywordOpportunitySourceRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeoKeywordOpportunityListResult extends PaginatedResponse<SeoKeywordOpportunityRecord> {
  meta: {
    counts: Record<'all' | SeoKeywordOpportunityStatus, number>;
    sourceCounts: Record<'all' | SeoKeywordOpportunitySourceType, number>;
    serper: SeoSerperUsageSummary;
  };
}

export interface SeoKeywordOpportunityPromotionResult {
  opportunity: SeoKeywordOpportunityRecord;
  proposal: SeoProposalRecord;
}

export interface SeoKeywordOpportunityRefreshResult {
  opportunity: SeoKeywordOpportunityRecord;
}

export interface SeoKeywordOpportunityArchiveResult {
  opportunity: SeoKeywordOpportunityRecord;
}

export interface SeoKeywordPortfolioRebuildResult {
  created: number;
  updated: number;
  archived: number;
  totalActive: number;
  candidateCount: number;
  sourcesUsed: SeoKeywordOpportunitySourceType[];
  serperSampling: {
    shortlistCount: number;
    cacheHits: number;
    freshSamples: number;
    skippedSamples: number;
  };
}

export interface CreateSeoEditorialSeedInput {
  seedQuery: string;
  pageTypeRecommendation: string;
  targetUrl?: string | null;
  demandProxy: number;
  competitionProxy: number;
  laeaFitScore: number;
  rationale: string;
}

export interface SeoInsightsHealth {
  lastRunAt: string | null;
  finalizedThroughDate: string | null;
  lastRowCount: number;
  lastWeekCovered: string | null;
  totalRowsLast30d: number;
  clusterWindows?: Partial<Record<SeoClusterHorizon, SeoClusterWindowSummary>>;
  paused: boolean;
  agentRun: SeoAgentRunRecord | null;
  serper: SeoSerperUsageSummary;
}

export const seoInsightsApi = {
  async list(params: {
    bucket: SeoInsightBucket;
    weekStart?: string;
    limit?: number;
    page?: number;
  }): Promise<SeoInsightListResult> {
    const searchParams = new URLSearchParams();
    searchParams.set('bucket', params.bucket);
    if (params.weekStart) searchParams.set('weekStart', params.weekStart);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.page) searchParams.set('page', String(params.page));

    return fetchJson<SeoInsightListResult>(`${API_BASE}/admin/seo/insights?${searchParams.toString()}`, {
      headers: getAuthHeaders(),
    });
  },

  async get(id: string): Promise<SeoInsightDetail> {
    return fetchJson<SeoInsightDetail>(`${API_BASE}/admin/seo/insights/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  async dismiss(id: string): Promise<{ id: string; status: SeoInsightStatus }> {
    return fetchJson<{ id: string; status: SeoInsightStatus }>(`${API_BASE}/admin/seo/insights/${id}/dismiss`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async markActioned(id: string): Promise<{ id: string; status: SeoInsightStatus }> {
    return fetchJson<{ id: string; status: SeoInsightStatus }>(`${API_BASE}/admin/seo/insights/${id}/action`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async proposeRewrite(id: string): Promise<SeoRewriteProposal> {
    return fetchJson<SeoRewriteProposal>(`${API_BASE}/admin/seo/insights/${id}/propose-rewrite`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async shipRewrite(id: string): Promise<SeoAgentActionRecord> {
    return fetchJson<SeoAgentActionRecord>(`${API_BASE}/admin/seo/insights/${id}/ship-rewrite`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async generateProposal(id: string): Promise<SeoProposalRecord> {
    return fetchJson<SeoProposalRecord>(`${API_BASE}/admin/seo/insights/${id}/generate-proposal`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async listClusters(params?: {
    horizon?: SeoClusterHorizon;
    bucket?: SeoClusterBucket;
    page?: number;
    limit?: number;
  }): Promise<SeoClusterListResult> {
    const searchParams = new URLSearchParams();
    if (params?.horizon) searchParams.set('horizon', params.horizon);
    if (params?.bucket) searchParams.set('bucket', params.bucket);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return fetchJson<SeoClusterListResult>(`${API_BASE}/admin/seo/clusters${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
  },

  async getCluster(id: string): Promise<SeoClusterOpportunityDetail> {
    return fetchJson<SeoClusterOpportunityDetail>(`${API_BASE}/admin/seo/clusters/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  async dismissCluster(id: string): Promise<{ id: string; status: SeoClusterStatus }> {
    return fetchJson<{ id: string; status: SeoClusterStatus }>(`${API_BASE}/admin/seo/clusters/${id}/dismiss`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async markClusterActioned(id: string): Promise<{ id: string; status: SeoClusterStatus }> {
    return fetchJson<{ id: string; status: SeoClusterStatus }>(`${API_BASE}/admin/seo/clusters/${id}/action`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async generateClusterProposal(id: string): Promise<SeoProposalRecord> {
    return fetchJson<SeoProposalRecord>(`${API_BASE}/admin/seo/clusters/${id}/generate-proposal`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async listActions(params?: {
    page?: number;
    limit?: number;
    targetType?: string;
    status?: SeoActionStatusFilter;
  }): Promise<SeoActionListResult> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.targetType) searchParams.set('targetType', params.targetType);
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return fetchJson<SeoActionListResult>(`${API_BASE}/admin/seo/actions${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
  },

  async rollbackAction(id: string): Promise<SeoAgentActionRecord> {
    return fetchJson<SeoAgentActionRecord>(`${API_BASE}/admin/seo/actions/${id}/rollback`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async listProposals(params?: {
    page?: number;
    limit?: number;
    status?: SeoProposalStatusFilter;
  }): Promise<SeoProposalListResult> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return fetchJson<SeoProposalListResult>(`${API_BASE}/admin/seo/proposals${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
  },

  async approveProposal(id: string): Promise<{
    proposal: SeoProposalRecord;
    handoff: SeoProposalHandoff;
  }> {
    return fetchJson<{
      proposal: SeoProposalRecord;
      handoff: SeoProposalHandoff;
    }>(`${API_BASE}/admin/seo/proposals/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async rejectProposal(id: string, reason: string): Promise<SeoProposalRecord> {
    return fetchJson<SeoProposalRecord>(`${API_BASE}/admin/seo/proposals/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
  },

  async linkProposalDraft(id: string, draftPostId: string): Promise<SeoProposalRecord> {
    return fetchJson<SeoProposalRecord>(`${API_BASE}/admin/seo/proposals/${id}/link-draft`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ draftPostId }),
    });
  },

  async listExperiments(params?: {
    page?: number;
    limit?: number;
    status?: SeoExperimentStatusFilter;
  }): Promise<SeoExperimentListResult> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return fetchJson<SeoExperimentListResult>(`${API_BASE}/admin/seo/experiments${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
  },

  async getExperiment(id: string): Promise<SeoExperimentRecord> {
    return fetchJson<SeoExperimentRecord>(`${API_BASE}/admin/seo/experiments/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  async reviewExperiment(id: string): Promise<SeoExperimentRecord> {
    return fetchJson<SeoExperimentRecord>(`${API_BASE}/admin/seo/experiments/${id}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async listPackagingAudits(params?: {
    page?: number;
    limit?: number;
  }): Promise<SeoPackagingAuditListResult> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return fetchJson<SeoPackagingAuditListResult>(`${API_BASE}/admin/seo/packaging${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
  },

  async getPackagingAudit(id: string): Promise<SeoPackagingAuditRecord> {
    return fetchJson<SeoPackagingAuditRecord>(`${API_BASE}/admin/seo/packaging/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  async proposePackagingEvergreen(id: string): Promise<SeoProposalRecord> {
    return fetchJson<SeoProposalRecord>(`${API_BASE}/admin/seo/packaging/${id}/propose-evergreen`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async proposePackagingFix(id: string): Promise<SeoProposalRecord> {
    return fetchJson<SeoProposalRecord>(`${API_BASE}/admin/seo/packaging/${id}/propose-fix`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async listKeywordPortfolio(params?: {
    page?: number;
    limit?: number;
    status?: SeoKeywordOpportunityStatusFilter;
    sourceType?: SeoKeywordOpportunitySourceFilter;
  }): Promise<SeoKeywordOpportunityListResult> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.sourceType) searchParams.set('sourceType', params.sourceType);

    const query = searchParams.toString();
    return fetchJson<SeoKeywordOpportunityListResult>(`${API_BASE}/admin/seo/portfolio${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
  },

  async getKeywordOpportunity(id: string): Promise<SeoKeywordOpportunityRecord> {
    return fetchJson<SeoKeywordOpportunityRecord>(`${API_BASE}/admin/seo/portfolio/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  async createEditorialSeed(input: CreateSeoEditorialSeedInput): Promise<SeoKeywordOpportunityRecord> {
    return fetchJson<SeoKeywordOpportunityRecord>(`${API_BASE}/admin/seo/portfolio/editorial-seeds`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });
  },

  async promoteKeywordOpportunity(id: string): Promise<SeoKeywordOpportunityPromotionResult> {
    return fetchJson<SeoKeywordOpportunityPromotionResult>(`${API_BASE}/admin/seo/portfolio/${id}/promote`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async archiveKeywordOpportunity(id: string): Promise<SeoKeywordOpportunityArchiveResult> {
    return fetchJson<SeoKeywordOpportunityArchiveResult>(`${API_BASE}/admin/seo/portfolio/${id}/archive`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async refreshKeywordOpportunitySerp(id: string): Promise<SeoKeywordOpportunityRefreshResult> {
    return fetchJson<SeoKeywordOpportunityRefreshResult>(`${API_BASE}/admin/seo/portfolio/${id}/refresh-serp`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async rebuildKeywordPortfolio(): Promise<SeoKeywordPortfolioRebuildResult> {
    return fetchJson<SeoKeywordPortfolioRebuildResult>(`${API_BASE}/admin/seo/portfolio/rebuild`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async getHealth(): Promise<SeoInsightsHealth> {
    return fetchJson<SeoInsightsHealth>(`${API_BASE}/admin/seo/health`, {
      headers: getAuthHeaders(),
    });
  },

  async setPaused(paused: boolean): Promise<{ paused: boolean }> {
    return fetchJson<{ paused: boolean }>(`${API_BASE}/admin/seo/pause`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ paused }),
    });
  },
};

import { getJwt, clearJwt } from './storage';

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod';

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    public failureType?: string,
  ) {
    super(`API ${status}`);
    this.name = 'ApiError';
  }
}

export interface RequestOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean; // default true for everything except /api/auth/login
  signal?: AbortSignal;
}

export async function apiRequest<T = unknown>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = opts;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const jwt = await getJwt();
    if (!jwt) throw new UnauthorizedError();
    headers['Authorization'] = `Bearer ${jwt.token}`;
  }

  const resp = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // 401 anywhere clears the stored JWT so the popup falls back to login
  if (resp.status === 401) {
    await clearJwt();
    throw new UnauthorizedError();
  }

  let parsed: unknown;
  const text = await resp.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!resp.ok) {
    const ft = (parsed as { failureType?: string } | null)?.failureType;
    throw new ApiError(resp.status, parsed, ft);
  }

  return parsed as T;
}

export interface LoginResponse {
  token: string;
  user?: unknown;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });
}

export interface ScrapeResponse {
  success: boolean;
  title?: string;
  content?: string;
  wordCount?: number;
  articleId?: string;
  sourceId?: string;
  analysisStatus?: string;
  message?: string;
  // 409 case
  error?: string;
  existingId?: string;
}

export async function scrape(url: string): Promise<ScrapeResponse> {
  return apiRequest<ScrapeResponse>('/api/admin/articles/scrape', {
    method: 'POST',
    body: { url, submitForAnalysis: true },
  });
}

export interface SubmitResponse {
  success: boolean;
  articleId?: string;
  sourceId?: string;
  analysisStatus?: string;
  message?: string;
  // 409 case
  error?: string;
  existingId?: string;
}

export async function submitArticle(payload: {
  sourceUrl: string;
  title: string;
  content: string;
}): Promise<SubmitResponse> {
  return apiRequest<SubmitResponse>('/api/admin/articles/submit', {
    method: 'POST',
    body: payload,
  });
}

export interface IngestedArticleListItem {
  id: string;
  title?: string | null;
  externalUrl: string;
  analysisStatus: string;
  createdAt: string;
  source?: { sourceType?: string } | null;
}

export interface RecentArticlesResponse {
  articles: IngestedArticleListItem[];
}

export async function fetchRecentArticles(limit = 10): Promise<IngestedArticleListItem[]> {
  const resp = await apiRequest<RecentArticlesResponse | IngestedArticleListItem[]>(
    `/api/admin/articles?limit=${limit}`,
  );
  if (Array.isArray(resp)) return resp;
  return resp.articles ?? [];
}

import { GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const EDITORIAL_LAST_RUN_PARAM =
  process.env.SEO_EDITORIAL_LAST_RUN_PARAM ?? '/ai-timeline/prod/seo-editorial-last-run';
const EDITORIAL_PAUSED_PARAM =
  process.env.SEO_EDITORIAL_PAUSED_PARAM ?? '/ai-timeline/prod/seo-editorial-paused';
const CACHE_TTL_MS = 60_000;

export type SeoEditorialRunStatusValue =
  | 'success'
  | 'failed'
  | 'warning'
  | 'failed_email_only'
  | 'paused';

export interface SeoEditorialRunStatusRecord {
  status: SeoEditorialRunStatusValue;
  startedAt: string;
  completedAt: string;
  weekStart: string | null;
  publishedCount: number;
  draftCount: number;
  skippedCount: number;
  emailStatus: 'not_attempted' | 'sent' | 'failed';
  digestUrl: string | null;
  errorMessage: string | null;
  items: Array<{
    id: string;
    sourceType: 'proposal' | 'keyword' | 'article';
    action: 'auto_published' | 'draft_for_review' | 'skipped_by_gate';
    title: string;
    publicUrl: string | null;
    adminUrl: string | null;
    reason: string;
  }>;
}

interface CacheEntry {
  expiresAt: number;
  value: SeoEditorialRunStatusRecord | null;
}

let ssmClient: SSMClient | null = null;
let runStatusCache: CacheEntry | null = null;
let pausedCache: { expiresAt: number; value: boolean } | null = null;

function getSsmClient(): SSMClient {
  if (!ssmClient) {
    ssmClient = new SSMClient({ region: AWS_REGION });
  }
  return ssmClient;
}

function isParameterNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { name?: string; Code?: string };
  return maybeError.name === 'ParameterNotFound' || maybeError.Code === 'ParameterNotFound';
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isStatus(value: unknown): value is SeoEditorialRunStatusValue {
  return (
    value === 'success' ||
    value === 'failed' ||
    value === 'warning' ||
    value === 'failed_email_only' ||
    value === 'paused'
  );
}

function parseRunStatus(rawValue: string | undefined): SeoEditorialRunStatusRecord | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<SeoEditorialRunStatusRecord>;
    if (
      !isStatus(parsed.status) ||
      typeof parsed.startedAt !== 'string' ||
      typeof parsed.completedAt !== 'string' ||
      (parsed.weekStart !== null && typeof parsed.weekStart !== 'string') ||
      !isNonNegativeInteger(parsed.publishedCount) ||
      !isNonNegativeInteger(parsed.draftCount) ||
      !isNonNegativeInteger(parsed.skippedCount) ||
      (parsed.emailStatus !== 'not_attempted' && parsed.emailStatus !== 'sent' && parsed.emailStatus !== 'failed') ||
      (parsed.digestUrl !== null && typeof parsed.digestUrl !== 'string') ||
      (parsed.errorMessage !== null && typeof parsed.errorMessage !== 'string') ||
      !Array.isArray(parsed.items)
    ) {
      return null;
    }

    return {
      status: parsed.status,
      startedAt: parsed.startedAt,
      completedAt: parsed.completedAt,
      weekStart: parsed.weekStart,
      publishedCount: parsed.publishedCount,
      draftCount: parsed.draftCount,
      skippedCount: parsed.skippedCount,
      emailStatus: parsed.emailStatus,
      digestUrl: parsed.digestUrl,
      errorMessage: parsed.errorMessage,
      items: parsed.items.filter((item) => (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        (item.sourceType === 'proposal' || item.sourceType === 'keyword' || item.sourceType === 'article') &&
        (item.action === 'auto_published' || item.action === 'draft_for_review' || item.action === 'skipped_by_gate') &&
        typeof item.title === 'string' &&
        (item.publicUrl === null || typeof item.publicUrl === 'string') &&
        (item.adminUrl === null || typeof item.adminUrl === 'string') &&
        typeof item.reason === 'string'
      )),
    };
  } catch {
    return null;
  }
}

export async function isEditorialPaused(now: number = Date.now()): Promise<boolean> {
  if (pausedCache && pausedCache.expiresAt > now) {
    return pausedCache.value;
  }

  try {
    const response = await getSsmClient().send(new GetParameterCommand({
      Name: EDITORIAL_PAUSED_PARAM,
    }));
    const value = response.Parameter?.Value?.trim().toLowerCase() === 'true';
    pausedCache = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } catch (error) {
    if (!isParameterNotFound(error)) {
      throw error;
    }
    pausedCache = { value: false, expiresAt: now + CACHE_TTL_MS };
    return false;
  }
}

export async function getLatestEditorialRunStatus(
  now: number = Date.now(),
): Promise<SeoEditorialRunStatusRecord | null> {
  if (runStatusCache && runStatusCache.expiresAt > now) {
    return runStatusCache.value;
  }

  try {
    const response = await getSsmClient().send(new GetParameterCommand({
      Name: EDITORIAL_LAST_RUN_PARAM,
    }));
    const value = parseRunStatus(response.Parameter?.Value);
    runStatusCache = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } catch (error) {
    if (!isParameterNotFound(error)) {
      throw error;
    }
    runStatusCache = { value: null, expiresAt: now + CACHE_TTL_MS };
    return null;
  }
}

export async function setLatestEditorialRunStatus(
  nextStatus: SeoEditorialRunStatusRecord,
  now: number = Date.now(),
): Promise<SeoEditorialRunStatusRecord> {
  await getSsmClient().send(new PutParameterCommand({
    Name: EDITORIAL_LAST_RUN_PARAM,
    Type: 'String',
    Overwrite: true,
    Value: JSON.stringify(nextStatus),
  }));

  runStatusCache = {
    value: nextStatus,
    expiresAt: now + CACHE_TTL_MS,
  };

  return nextStatus;
}

export function resetEditorialRunStatusCacheForTests() {
  ssmClient = null;
  runStatusCache = null;
  pausedCache = null;
}

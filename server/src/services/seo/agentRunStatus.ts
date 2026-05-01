import { GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const SEO_AGENT_LAST_RUN_PARAM =
  process.env.SEO_AGENT_LAST_RUN_PARAM ?? '/ai-timeline/prod/seo-agent-last-run';
const CACHE_TTL_MS = 60_000;

export type SeoAgentRunStatusValue = 'success' | 'failed';

export interface SeoAgentRunStatusRecord {
  status: SeoAgentRunStatusValue;
  startedAt: string;
  completedAt: string;
  weekStart: string | null;
  shippedCount: number;
  proposalCount: number;
  humanOnlyCount: number;
  measuredCount: number;
  digestUrl: string | null;
  errorMessage: string | null;
}

interface RunStatusCacheEntry {
  expiresAt: number;
  value: SeoAgentRunStatusRecord | null;
}

let ssmClient: SSMClient | null = null;
let runStatusCache: RunStatusCacheEntry | null = null;

function getSsmClient(): SSMClient {
  if (!ssmClient) {
    ssmClient = new SSMClient({ region: AWS_REGION });
  }

  return ssmClient;
}

function isParameterNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { name?: string; Code?: string };
  return maybeError.name === 'ParameterNotFound' || maybeError.Code === 'ParameterNotFound';
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseRunStatus(rawValue: string | undefined): SeoAgentRunStatusRecord | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SeoAgentRunStatusRecord>;
    if (
      (parsed.status !== 'success' && parsed.status !== 'failed') ||
      typeof parsed.startedAt !== 'string' ||
      typeof parsed.completedAt !== 'string' ||
      (parsed.weekStart !== null && typeof parsed.weekStart !== 'string') ||
      !isNonNegativeInteger(parsed.shippedCount) ||
      !isNonNegativeInteger(parsed.proposalCount) ||
      !isNonNegativeInteger(parsed.humanOnlyCount) ||
      !isNonNegativeInteger(parsed.measuredCount) ||
      (parsed.digestUrl !== null && typeof parsed.digestUrl !== 'string') ||
      (parsed.errorMessage !== null && typeof parsed.errorMessage !== 'string')
    ) {
      return null;
    }

    return {
      status: parsed.status,
      startedAt: parsed.startedAt,
      completedAt: parsed.completedAt,
      weekStart: parsed.weekStart,
      shippedCount: parsed.shippedCount,
      proposalCount: parsed.proposalCount,
      humanOnlyCount: parsed.humanOnlyCount,
      measuredCount: parsed.measuredCount,
      digestUrl: parsed.digestUrl,
      errorMessage: parsed.errorMessage,
    };
  } catch {
    return null;
  }
}

export async function getLatestAgentRunStatus(now: number = Date.now()): Promise<SeoAgentRunStatusRecord | null> {
  if (runStatusCache && runStatusCache.expiresAt > now) {
    return runStatusCache.value;
  }

  try {
    const response = await getSsmClient().send(new GetParameterCommand({
      Name: SEO_AGENT_LAST_RUN_PARAM,
    }));
    const value = parseRunStatus(response.Parameter?.Value);
    runStatusCache = {
      value,
      expiresAt: now + CACHE_TTL_MS,
    };
    return value;
  } catch (error) {
    if (!isParameterNotFound(error)) {
      throw error;
    }

    runStatusCache = {
      value: null,
      expiresAt: now + CACHE_TTL_MS,
    };
    return null;
  }
}

export async function setLatestAgentRunStatus(
  nextStatus: SeoAgentRunStatusRecord,
  now: number = Date.now()
): Promise<SeoAgentRunStatusRecord> {
  await getSsmClient().send(new PutParameterCommand({
    Name: SEO_AGENT_LAST_RUN_PARAM,
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

export function resetAgentRunStatusCacheForTests() {
  ssmClient = null;
  runStatusCache = null;
}

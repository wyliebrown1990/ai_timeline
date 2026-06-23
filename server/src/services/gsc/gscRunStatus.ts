import { GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const GSC_LAST_RUN_PARAM =
  process.env.GSC_LAST_RUN_PARAM ?? '/ai-timeline/prod/gsc-last-run';
const CACHE_TTL_MS = 60_000;

export const GSC_OAUTH_ROTATE_COMMAND =
  'npm run gsc:oauth-rotate -- --client-secret "$HOME/Downloads/client_secret_<actual-id>.json"';
export const GSC_RUNBOOK_PATH = '.claude/schedules/seo-weekly.md';

export type GscRunStatusValue = 'success' | 'failed';
export type GscRunErrorCategory =
  | 'auth'
  | 'permission'
  | 'config'
  | 'quota'
  | 'network'
  | 'unknown';

export interface GscRunRemediation {
  summary: string;
  command: string | null;
  docsPath: string | null;
}

export interface GscRunStatusRecord {
  status: GscRunStatusValue;
  startedAt: string;
  completedAt: string;
  startDate: string | null;
  endDate: string | null;
  finalizedThroughDate: string | null;
  dailyRowsInserted: number;
  dailyRowsAttempted: number;
  snapshotsCreated: number;
  durationMs: number;
  errorMessage: string | null;
  errorCategory: GscRunErrorCategory | null;
  requiresOperatorAction: boolean;
  remediation: GscRunRemediation | null;
}

interface CacheEntry {
  expiresAt: number;
  value: GscRunStatusRecord | null;
}

let ssmClient: SSMClient | null = null;
let runStatusCache: CacheEntry | null = null;

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

function isErrorCategory(value: unknown): value is GscRunErrorCategory {
  return (
    value === 'auth'
    || value === 'permission'
    || value === 'config'
    || value === 'quota'
    || value === 'network'
    || value === 'unknown'
  );
}

function parseRemediation(value: unknown): GscRunRemediation | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const parsed = value as Partial<GscRunRemediation>;
  if (
    typeof parsed.summary !== 'string'
    || (parsed.command !== null && parsed.command !== undefined && typeof parsed.command !== 'string')
    || (parsed.docsPath !== null && parsed.docsPath !== undefined && typeof parsed.docsPath !== 'string')
  ) {
    return null;
  }

  return {
    summary: parsed.summary,
    command: parsed.command ?? null,
    docsPath: parsed.docsPath ?? null,
  };
}

function parseRunStatus(rawValue: string | undefined): GscRunStatusRecord | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<GscRunStatusRecord>;
    const remediation = parseRemediation(parsed.remediation);
    const rawErrorCategory = parsed.errorCategory ?? null;

    if (
      (parsed.status !== 'success' && parsed.status !== 'failed')
      || typeof parsed.startedAt !== 'string'
      || typeof parsed.completedAt !== 'string'
      || (parsed.startDate !== null && parsed.startDate !== undefined && typeof parsed.startDate !== 'string')
      || (parsed.endDate !== null && parsed.endDate !== undefined && typeof parsed.endDate !== 'string')
      || (parsed.finalizedThroughDate !== null && parsed.finalizedThroughDate !== undefined && typeof parsed.finalizedThroughDate !== 'string')
      || !isNonNegativeInteger(parsed.dailyRowsInserted)
      || !isNonNegativeInteger(parsed.dailyRowsAttempted)
      || !isNonNegativeInteger(parsed.snapshotsCreated)
      || !isNonNegativeInteger(parsed.durationMs)
      || (parsed.errorMessage !== null && parsed.errorMessage !== undefined && typeof parsed.errorMessage !== 'string')
      || (rawErrorCategory !== null && !isErrorCategory(rawErrorCategory))
      || typeof parsed.requiresOperatorAction !== 'boolean'
      || (parsed.remediation !== undefined && parsed.remediation !== null && remediation === null)
    ) {
      return null;
    }

    return {
      status: parsed.status,
      startedAt: parsed.startedAt,
      completedAt: parsed.completedAt,
      startDate: parsed.startDate ?? null,
      endDate: parsed.endDate ?? null,
      finalizedThroughDate: parsed.finalizedThroughDate ?? null,
      dailyRowsInserted: parsed.dailyRowsInserted,
      dailyRowsAttempted: parsed.dailyRowsAttempted,
      snapshotsCreated: parsed.snapshotsCreated,
      durationMs: parsed.durationMs,
      errorMessage: parsed.errorMessage ?? null,
      errorCategory: rawErrorCategory,
      requiresOperatorAction: parsed.requiresOperatorAction,
      remediation,
    };
  } catch {
    return null;
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: unknown;
      code?: unknown;
      response?: {
        data?: {
          error?: unknown;
          error_description?: unknown;
        };
      };
    };

    const responseError = maybeError.response?.data?.error;
    const responseDescription = maybeError.response?.data?.error_description;
    if (typeof responseError === 'string' && typeof responseDescription === 'string') {
      return `${responseError}: ${responseDescription}`;
    }

    if (typeof responseError === 'string') {
      return responseError;
    }

    if (typeof responseDescription === 'string') {
      return responseDescription;
    }

    if (typeof maybeError.message === 'string') {
      return maybeError.message;
    }

    if (typeof maybeError.code === 'string') {
      return maybeError.code;
    }
  }

  return safeJson(error);
}

function getErrorMatchText(error: unknown): string {
  if (error instanceof Error) {
    const extra = error.cause ? ` ${safeJson(error.cause)}` : '';
    return `${error.name} ${error.message}${extra}`.toLowerCase();
  }

  if (typeof error === 'string') {
    return error.toLowerCase();
  }

  return safeJson(error).toLowerCase();
}

export function classifyGscRunFailure(error: unknown): Pick<
  GscRunStatusRecord,
  'errorMessage' | 'errorCategory' | 'requiresOperatorAction' | 'remediation'
> {
  const errorMessage = getErrorMessage(error);
  const matchText = `${errorMessage} ${getErrorMatchText(error)}`;

  if (
    matchText.includes('invalid_grant')
    || matchText.includes('invalid_client')
    || matchText.includes('unauthorized_client')
    || matchText.includes('refresh token')
    || matchText.includes('oauth')
  ) {
    return {
      errorMessage,
      errorCategory: 'auth',
      requiresOperatorAction: true,
      remediation: {
        summary:
          'Google rejected the stored Search Console refresh token. Re-run the OAuth rotation helper from the repo root, complete browser consent, then let the helper verify both gscWeeklyIngest and a forced seoWeeklyDigest.',
        command: GSC_OAUTH_ROTATE_COMMAND,
        docsPath: GSC_RUNBOOK_PATH,
      },
    };
  }

  if (
    matchText.includes('insufficientpermissions')
    || matchText.includes('insufficient permission')
    || matchText.includes('permission denied')
    || matchText.includes('not a verified owner')
    || matchText.includes('not an owner')
    || matchText.includes('403')
  ) {
    return {
      errorMessage,
      errorCategory: 'permission',
      requiresOperatorAction: true,
      remediation: {
        summary:
          'Google accepted the credentials but denied access to the configured Search Console property. Re-run the OAuth helper with a verified owner account, then confirm the property URL in SSM still matches the intended site.',
        command: GSC_OAUTH_ROTATE_COMMAND,
        docsPath: GSC_RUNBOOK_PATH,
      },
    };
  }

  if (
    matchText.includes('missing required ssm parameter')
    || matchText.includes('does not contain valid gsc oauth credentials')
    || matchText.includes('gsc-site-url')
  ) {
    return {
      errorMessage,
      errorCategory: 'config',
      requiresOperatorAction: true,
      remediation: {
        summary:
          'The Search Console SSM configuration is missing or malformed. Restore the credential and site parameters, then rerun the OAuth helper or the weekly ingest.',
        command: GSC_OAUTH_ROTATE_COMMAND,
        docsPath: GSC_RUNBOOK_PATH,
      },
    };
  }

  if (
    matchText.includes('quota')
    || matchText.includes('rate limit')
    || matchText.includes('too many requests')
    || matchText.includes('429')
  ) {
    return {
      errorMessage,
      errorCategory: 'quota',
      requiresOperatorAction: false,
      remediation: {
        summary:
          'Google Search Console rate-limited the ingest. Retry the job after the cooldown window and inspect API usage if this repeats.',
        command: null,
        docsPath: GSC_RUNBOOK_PATH,
      },
    };
  }

  if (
    matchText.includes('timed out')
    || matchText.includes('timeout')
    || matchText.includes('socket hang up')
    || matchText.includes('econnreset')
    || matchText.includes('enotfound')
    || matchText.includes('network')
  ) {
    return {
      errorMessage,
      errorCategory: 'network',
      requiresOperatorAction: false,
      remediation: {
        summary:
          'The weekly ingest hit a transient network failure. Retry the job and inspect Google or AWS connectivity if the failure persists.',
        command: null,
        docsPath: GSC_RUNBOOK_PATH,
      },
    };
  }

  return {
    errorMessage,
    errorCategory: 'unknown',
    requiresOperatorAction: true,
    remediation: {
      summary:
        'The weekly ingest failed for an uncategorized reason. Inspect the ingestion Lambda logs and, if auth looks suspicious, rerun the OAuth helper before retrying the digest.',
      command: GSC_OAUTH_ROTATE_COMMAND,
      docsPath: GSC_RUNBOOK_PATH,
    },
  };
}

export async function getLatestGscRunStatus(now: number = Date.now()): Promise<GscRunStatusRecord | null> {
  if (runStatusCache && runStatusCache.expiresAt > now) {
    return runStatusCache.value;
  }

  try {
    const response = await getSsmClient().send(new GetParameterCommand({
      Name: GSC_LAST_RUN_PARAM,
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

export async function setLatestGscRunStatus(
  nextStatus: GscRunStatusRecord,
  now: number = Date.now(),
): Promise<GscRunStatusRecord> {
  await getSsmClient().send(new PutParameterCommand({
    Name: GSC_LAST_RUN_PARAM,
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

export function resetGscRunStatusCacheForTests() {
  ssmClient = null;
  runStatusCache = null;
}

import { GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const SEO_AGENT_PAUSED_PARAM =
  process.env.SEO_AGENT_PAUSED_PARAM ?? '/ai-timeline/prod/seo-agent-paused';
const CACHE_TTL_MS = 60_000;

interface PauseCacheEntry {
  expiresAt: number;
  value: boolean;
}

let ssmClient: SSMClient | null = null;
let pauseCache: PauseCacheEntry | null = null;

function getSsmClient(): SSMClient {
  if (!ssmClient) {
    ssmClient = new SSMClient({ region: AWS_REGION });
  }

  return ssmClient;
}

function parsePausedValue(rawValue: string | undefined): boolean {
  return rawValue?.trim().toLowerCase() === 'true';
}

export async function isPaused(now: number = Date.now()): Promise<boolean> {
  if (pauseCache && pauseCache.expiresAt > now) {
    return pauseCache.value;
  }

  const response = await getSsmClient().send(new GetParameterCommand({
    Name: SEO_AGENT_PAUSED_PARAM,
  }));

  const value = parsePausedValue(response.Parameter?.Value);
  pauseCache = {
    value,
    expiresAt: now + CACHE_TTL_MS,
  };

  return value;
}

export async function setPaused(paused: boolean, now: number = Date.now()): Promise<boolean> {
  await getSsmClient().send(new PutParameterCommand({
    Name: SEO_AGENT_PAUSED_PARAM,
    Type: 'String',
    Overwrite: true,
    Value: paused ? 'true' : 'false',
  }));

  pauseCache = {
    value: paused,
    expiresAt: now + CACHE_TTL_MS,
  };

  return paused;
}

export function resetAgentControlCacheForTests() {
  ssmClient = null;
  pauseCache = null;
}

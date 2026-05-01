import type { Prisma } from '@prisma/client';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { prisma } from '../../db';

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const SERPER_API_KEY_PARAM =
  process.env.SERPER_API_KEY_PARAM ?? '/ai-timeline/prod/serper-api-key';
const SERPER_PRICING_PARAM =
  process.env.SERPER_PRICING_PARAM ?? '/ai-timeline/prod/serper-pricing-json';
const SERPER_SEARCH_URL = 'https://google.serper.dev/search';
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const STRONG_DOMAIN_PATTERNS = [
  'wikipedia.org',
  'openai.com',
  'anthropic.com',
  'google.com',
  'deepmind.google',
  'microsoft.com',
  'aws.amazon.com',
  'nvidia.com',
  'huggingface.co',
  'stanford.edu',
  'mit.edu',
  'arxiv.org',
  'ibm.com',
  'cloud.google.com',
  'developers.google.com',
];
const FORUM_DOMAIN_PATTERNS = [
  'reddit.com',
  'quora.com',
  'stackexchange.com',
  'stackoverflow.com',
  'news.ycombinator.com',
];
const VIDEO_DOMAIN_PATTERNS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
];

export interface SerperPricingConfig {
  enabled: boolean;
  tierLabel: string;
  usdPerThousandQueries: number;
  purchasedCredits: number | null;
  monthlyCreditBudget: number | null;
  maxQueriesPerRun: number;
  maxQueriesPerDay: number;
  maxQueriesPerWeek: number;
  cacheTtlDays: number;
  country: string;
  language: string;
  dateRange: string;
  page: number;
  autoTopupEnabled: boolean;
}

interface SerperRuntimeConfig {
  apiKey: string | null;
  pricing: SerperPricingConfig;
  configured: boolean;
}

export type SerperUsageWarningLevel = 'ok' | 'watch' | 'warning' | 'critical';

export interface SerperUsageSummary {
  configured: boolean;
  enabled: boolean;
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
  projectedDepletionDate: string | null;
  lastSampledAt: string | null;
  warningLevel: SerperUsageWarningLevel;
}

export interface SerperKeywordOpportunityInput {
  id: string;
  sourceType: string;
  dedupeKey: string;
  seedQuery: string;
  clusterKey: string | null;
  clusterSnapshotId: string | null;
  targetIntent: string;
  demandProxy: number;
  competitionProxy: number;
  laeaFitScore: number;
  pageTypeRecommendation: string;
  targetUrl: string | null;
  rationale: string;
  status: string;
}

export interface SerperKeywordSourceRef {
  vendor: 'serper';
  requestKey: string;
  originSourceType: string;
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

export interface SerperKeywordOpportunityCandidate {
  sourceOpportunityId: string;
  sourceOpportunitySourceType: string;
  dedupeKey: string;
  seedQuery: string;
  clusterKey: string | null;
  clusterSnapshotId: string | null;
  targetIntent: string;
  demandProxy: number;
  competitionProxy: number;
  laeaFitScore: number;
  pageTypeRecommendation: string;
  targetUrl: string | null;
  rationale: string;
  sourceRef: SerperKeywordSourceRef;
}

interface SerperSearchOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
}

interface SerperSearchResponse {
  organic?: SerperSearchOrganicResult[];
  peopleAlsoAsk?: Array<unknown>;
  relatedSearches?: Array<unknown>;
  knowledgeGraph?: unknown;
}

interface SerperStoredSummary {
  requestKey: string;
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

interface AggregateUsageRow {
  _sum: {
    creditsUsed: number | null;
    effectiveCostUsd: number | null;
  };
}

interface ConfigCacheEntry {
  expiresAt: number;
  value: SerperRuntimeConfig;
}

let ssmClient: SSMClient | null = null;
let runtimeConfigCache: ConfigCacheEntry | null = null;

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

async function getOptionalParameterValue(name: string): Promise<string | null> {
  try {
    const response = await getSsmClient().send(new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    }));
    return response.Parameter?.Value?.trim() || null;
  } catch (error) {
    if (isParameterNotFound(error)) {
      return null;
    }

    throw error;
  }
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullablePositiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

function buildDefaultPricingConfig(): SerperPricingConfig {
  return {
    enabled: false,
    tierLabel: 'starter',
    usdPerThousandQueries: 1,
    purchasedCredits: 50_000,
    monthlyCreditBudget: 2_500,
    maxQueriesPerRun: 3,
    maxQueriesPerDay: 10,
    maxQueriesPerWeek: 25,
    cacheTtlDays: 28,
    country: 'us',
    language: 'en',
    dateRange: 'qdr:m',
    page: 1,
    autoTopupEnabled: false,
  };
}

function parsePricingConfig(rawValue: string | null): SerperPricingConfig {
  const defaults = buildDefaultPricingConfig();
  if (!rawValue) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SerperPricingConfig>;
    return {
      enabled: Boolean(parsed.enabled),
      tierLabel: typeof parsed.tierLabel === 'string' && parsed.tierLabel.trim().length > 0
        ? parsed.tierLabel.trim()
        : defaults.tierLabel,
      usdPerThousandQueries: Math.max(0, toFiniteNumber(parsed.usdPerThousandQueries, defaults.usdPerThousandQueries)),
      purchasedCredits: toNullablePositiveInteger(parsed.purchasedCredits) ?? defaults.purchasedCredits,
      monthlyCreditBudget: toNullablePositiveInteger(parsed.monthlyCreditBudget) ?? defaults.monthlyCreditBudget,
      maxQueriesPerRun: Math.max(1, Math.round(toFiniteNumber(parsed.maxQueriesPerRun, defaults.maxQueriesPerRun))),
      maxQueriesPerDay: Math.max(1, Math.round(toFiniteNumber(parsed.maxQueriesPerDay, defaults.maxQueriesPerDay))),
      maxQueriesPerWeek: Math.max(1, Math.round(toFiniteNumber(parsed.maxQueriesPerWeek, defaults.maxQueriesPerWeek))),
      cacheTtlDays: Math.max(1, Math.round(toFiniteNumber(parsed.cacheTtlDays, defaults.cacheTtlDays))),
      country: typeof parsed.country === 'string' && parsed.country.trim().length > 0
        ? parsed.country.trim().toLowerCase()
        : defaults.country,
      language: typeof parsed.language === 'string' && parsed.language.trim().length > 0
        ? parsed.language.trim().toLowerCase()
        : defaults.language,
      dateRange: typeof parsed.dateRange === 'string'
        ? parsed.dateRange.trim()
        : defaults.dateRange,
      page: Math.max(1, Math.round(toFiniteNumber(parsed.page, defaults.page))),
      autoTopupEnabled: Boolean(parsed.autoTopupEnabled),
    };
  } catch {
    return defaults;
  }
}

async function getRuntimeConfig(now: number = Date.now()): Promise<SerperRuntimeConfig> {
  if (runtimeConfigCache && runtimeConfigCache.expiresAt > now) {
    return runtimeConfigCache.value;
  }

  const [apiKey, pricingJson] = await Promise.all([
    getOptionalParameterValue(SERPER_API_KEY_PARAM),
    getOptionalParameterValue(SERPER_PRICING_PARAM),
  ]);
  const pricing = parsePricingConfig(pricingJson);
  const configured = Boolean(apiKey && pricingJson);
  const value = {
    apiKey,
    pricing: {
      ...pricing,
      enabled: configured ? pricing.enabled : false,
    },
    configured,
  };

  runtimeConfigCache = {
    value,
    expiresAt: now + CONFIG_CACHE_TTL_MS,
  };

  return value;
}

function normalizeQuery(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function buildKeySegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'na';
}

function buildRequestKey(query: string, country: string, language: string, dateRange: string, page: number): string {
  return [country, language, dateRange || 'any', page, normalizeQuery(query)].join(':');
}

function buildSerperOpportunityDedupeKey(input: SerperKeywordOpportunityInput): string {
  return [
    'serp_sample',
    buildKeySegment(input.seedQuery),
    buildKeySegment(input.pageTypeRecommendation),
    buildKeySegment(input.targetUrl ?? input.seedQuery),
  ].join(':');
}

function toHostname(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function matchesPattern(hostname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => hostname === pattern || hostname.endsWith(`.${pattern}`));
}

function buildCompetitionSummary(
  response: SerperSearchResponse,
  effectiveCostUsd: number,
  sampledAt: Date,
  expiresAt: Date,
  requestKey: string,
  query: string,
  country: string,
  language: string,
  dateRange: string,
  page: number,
): SerperStoredSummary {
  const organic = Array.isArray(response.organic) ? response.organic.slice(0, 10) : [];
  const peopleAlsoAskCount = Array.isArray(response.peopleAlsoAsk) ? response.peopleAlsoAsk.length : 0;
  const relatedSearchCount = Array.isArray(response.relatedSearches) ? response.relatedSearches.length : 0;
  const topDomains = organic
    .map((result) => toHostname(result.link))
    .filter((value): value is string => Boolean(value))
    .slice(0, 5);
  const strongDomainCount = topDomains.filter((hostname) => matchesPattern(hostname, STRONG_DOMAIN_PATTERNS)).length;
  const forumDomainCount = topDomains.filter((hostname) => matchesPattern(hostname, FORUM_DOMAIN_PATTERNS)).length;
  const videoDomainCount = topDomains.filter((hostname) => matchesPattern(hostname, VIDEO_DOMAIN_PATTERNS)).length;
  const knowledgeGraphPenalty = response.knowledgeGraph ? 6 : 0;
  const peopleAlsoAskPenalty = Math.min(8, peopleAlsoAskCount);
  const baseCompetition = 42
    + (strongDomainCount * 11)
    + knowledgeGraphPenalty
    + peopleAlsoAskPenalty
    - (forumDomainCount * 5)
    - (videoDomainCount * 4);
  const competitionProxy = clampScore(baseCompetition);

  const reasons: string[] = [];
  if (topDomains.length > 0) {
    reasons.push(`Top results include ${topDomains.join(', ')}`);
  }
  if (strongDomainCount > 0) {
    reasons.push(`${strongDomainCount} authoritative domains appear in the top results`);
  }
  if (forumDomainCount > 0 || videoDomainCount > 0) {
    reasons.push(`the SERP is mixed with ${forumDomainCount} forum result(s) and ${videoDomainCount} video result(s)`);
  }
  if (peopleAlsoAskCount > 0) {
    reasons.push(`People Also Ask is present with ${peopleAlsoAskCount} prompts`);
  }

  return {
    requestKey,
    query,
    country,
    language,
    dateRange,
    page,
    sampledAt: sampledAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    organicCount: organic.length,
    peopleAlsoAskCount,
    relatedSearchCount,
    topDomains,
    strongDomainCount,
    forumDomainCount,
    videoDomainCount,
    competitionProxy,
    competitionReason: reasons.join('; ') || 'Live first-page SERP sample collected from Serper.',
    effectiveCostUsd: Number(effectiveCostUsd.toFixed(4)),
  };
}

function parseStoredSummary(value: unknown): SerperStoredSummary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const summary = value as Partial<SerperStoredSummary>;
  if (
    typeof summary.requestKey !== 'string'
    || typeof summary.query !== 'string'
    || typeof summary.country !== 'string'
    || typeof summary.language !== 'string'
    || typeof summary.dateRange !== 'string'
    || typeof summary.page !== 'number'
    || typeof summary.sampledAt !== 'string'
    || typeof summary.expiresAt !== 'string'
    || typeof summary.organicCount !== 'number'
    || typeof summary.peopleAlsoAskCount !== 'number'
    || typeof summary.relatedSearchCount !== 'number'
    || !Array.isArray(summary.topDomains)
    || typeof summary.strongDomainCount !== 'number'
    || typeof summary.forumDomainCount !== 'number'
    || typeof summary.videoDomainCount !== 'number'
    || typeof summary.competitionProxy !== 'number'
    || typeof summary.competitionReason !== 'string'
    || typeof summary.effectiveCostUsd !== 'number'
  ) {
    return null;
  }

  return {
    requestKey: summary.requestKey,
    query: summary.query,
    country: summary.country,
    language: summary.language,
    dateRange: summary.dateRange,
    page: summary.page,
    sampledAt: summary.sampledAt,
    expiresAt: summary.expiresAt,
    organicCount: summary.organicCount,
    peopleAlsoAskCount: summary.peopleAlsoAskCount,
    relatedSearchCount: summary.relatedSearchCount,
    topDomains: summary.topDomains.filter((value): value is string => typeof value === 'string'),
    strongDomainCount: summary.strongDomainCount,
    forumDomainCount: summary.forumDomainCount,
    videoDomainCount: summary.videoDomainCount,
    competitionProxy: summary.competitionProxy,
    competitionReason: summary.competitionReason,
    effectiveCostUsd: summary.effectiveCostUsd,
  };
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfRollingWindow(date: Date, days: number): Date {
  return new Date(date.getTime() - (days * DAY_MS));
}

async function loadAggregateUsage(where: { sampledAt?: { gte: Date } }): Promise<AggregateUsageRow> {
  return prisma.serpSample.aggregate({
    where,
    _sum: {
      creditsUsed: true,
      effectiveCostUsd: true,
    },
  });
}

function deriveProjectedDepletionDate(remainingCredits: number | null, creditsUsedWeek: number, now: Date): string | null {
  if (remainingCredits === null || remainingCredits <= 0 || creditsUsedWeek <= 0) {
    return null;
  }

  const dailyBurn = creditsUsedWeek / 7;
  if (dailyBurn <= 0) {
    return null;
  }

  const daysRemaining = Math.floor(remainingCredits / dailyBurn);
  if (daysRemaining <= 0) {
    return now.toISOString();
  }

  return new Date(now.getTime() + (daysRemaining * DAY_MS)).toISOString();
}

function getDaysUntilDate(isoValue: string | null, now: Date): number | null {
  if (!isoValue) {
    return null;
  }

  const depletionAt = new Date(isoValue);
  if (Number.isNaN(depletionAt.getTime())) {
    return null;
  }

  return (depletionAt.getTime() - now.getTime()) / DAY_MS;
}

function deriveWarningLevel(
  purchasedCredits: number | null,
  remainingCredits: number | null,
  projectedDepletionDate: string | null,
  now: Date
): SerperUsageWarningLevel {
  const daysUntilDepletion = getDaysUntilDate(projectedDepletionDate, now);
  if (!purchasedCredits || remainingCredits === null) {
    if (daysUntilDepletion !== null && daysUntilDepletion <= 14) {
      return 'critical';
    }

    if (daysUntilDepletion !== null && daysUntilDepletion <= 30) {
      return 'warning';
    }

    return 'ok';
  }

  const burnedRatio = (purchasedCredits - remainingCredits) / purchasedCredits;
  if (daysUntilDepletion !== null && daysUntilDepletion <= 14) return 'critical';
  if (burnedRatio >= 0.9) return 'critical';
  if (daysUntilDepletion !== null && daysUntilDepletion <= 30) return 'warning';
  if (burnedRatio >= 0.75) return 'warning';
  if (burnedRatio >= 0.5) return 'watch';
  return 'ok';
}

export async function getSerperUsageSummary(now: Date = new Date()): Promise<SerperUsageSummary> {
  const runtimeConfig = await getRuntimeConfig(now.getTime());
  const startToday = startOfUtcDay(now);
  const startWeek = startOfRollingWindow(now, 7);
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [today, week, month, total, latest] = await Promise.all([
    loadAggregateUsage({ sampledAt: { gte: startToday } }),
    loadAggregateUsage({ sampledAt: { gte: startWeek } }),
    loadAggregateUsage({ sampledAt: { gte: startMonth } }),
    loadAggregateUsage({}),
    prisma.serpSample.findFirst({
      orderBy: {
        sampledAt: 'desc',
      },
      select: {
        sampledAt: true,
      },
    }),
  ]);

  const creditsUsedTotal = total._sum.creditsUsed ?? 0;
  const remainingCredits = !runtimeConfig.configured
    ? null
    : runtimeConfig.pricing.purchasedCredits === null
    ? null
    : Math.max(0, runtimeConfig.pricing.purchasedCredits - creditsUsedTotal);
  const projectedDepletionDate = deriveProjectedDepletionDate(remainingCredits, week._sum.creditsUsed ?? 0, now);

  return {
    configured: runtimeConfig.configured,
    enabled: runtimeConfig.pricing.enabled,
    autoTopupEnabled: runtimeConfig.pricing.autoTopupEnabled,
    tierLabel: runtimeConfig.configured ? runtimeConfig.pricing.tierLabel : null,
    purchasedCredits: runtimeConfig.configured ? runtimeConfig.pricing.purchasedCredits : null,
    monthlyCreditBudget: runtimeConfig.configured ? runtimeConfig.pricing.monthlyCreditBudget : null,
    creditsUsedToday: today._sum.creditsUsed ?? 0,
    creditsUsedWeek: week._sum.creditsUsed ?? 0,
    creditsUsedMonth: month._sum.creditsUsed ?? 0,
    creditsUsedTotal,
    effectiveSpendTodayUsd: Number((today._sum.effectiveCostUsd ?? 0).toFixed(4)),
    effectiveSpendWeekUsd: Number((week._sum.effectiveCostUsd ?? 0).toFixed(4)),
    effectiveSpendMonthUsd: Number((month._sum.effectiveCostUsd ?? 0).toFixed(4)),
    effectiveSpendTotalUsd: Number((total._sum.effectiveCostUsd ?? 0).toFixed(4)),
    remainingCredits,
    projectedDepletionDate,
    lastSampledAt: latest?.sampledAt?.toISOString() ?? null,
    warningLevel: deriveWarningLevel(
      runtimeConfig.pricing.purchasedCredits,
      remainingCredits,
      projectedDepletionDate,
      now
    ),
  };
}

function canSpendOneCredit(usage: SerperUsageSummary, pricing: SerperPricingConfig): boolean {
  if (!pricing.enabled) {
    return false;
  }

  if (pricing.purchasedCredits !== null && usage.remainingCredits !== null && usage.remainingCredits <= 0) {
    return false;
  }

  if (usage.creditsUsedToday >= pricing.maxQueriesPerDay) {
    return false;
  }

  if (usage.creditsUsedWeek >= pricing.maxQueriesPerWeek) {
    return false;
  }

  if (pricing.monthlyCreditBudget !== null && usage.creditsUsedMonth >= pricing.monthlyCreditBudget) {
    return false;
  }

  return true;
}

function buildSerperSourceRef(
  input: SerperKeywordOpportunityInput,
  summary: SerperStoredSummary,
): SerperKeywordSourceRef {
  return {
    vendor: 'serper',
    requestKey: summary.requestKey,
    originSourceType: input.sourceType,
    originOpportunityId: input.id,
    originDedupeKey: input.dedupeKey,
    query: summary.query,
    country: summary.country,
    language: summary.language,
    dateRange: summary.dateRange,
    page: summary.page,
    sampledAt: summary.sampledAt,
    expiresAt: summary.expiresAt,
    organicCount: summary.organicCount,
    peopleAlsoAskCount: summary.peopleAlsoAskCount,
    relatedSearchCount: summary.relatedSearchCount,
    topDomains: summary.topDomains,
    strongDomainCount: summary.strongDomainCount,
    forumDomainCount: summary.forumDomainCount,
    videoDomainCount: summary.videoDomainCount,
    competitionProxy: summary.competitionProxy,
    competitionReason: summary.competitionReason,
    effectiveCostUsd: summary.effectiveCostUsd,
  };
}

function buildSerperRationale(
  input: SerperKeywordOpportunityInput,
  summary: SerperStoredSummary,
): string {
  const targetLabel = input.targetUrl ? input.targetUrl.replace('https://letaiexplainai.com', '') : input.pageTypeRecommendation.replace(/_/g, ' ');
  return `${input.seedQuery} was validated against a live Serper first-page search. ${summary.competitionReason}. LAEA's current target remains ${targetLabel}, and the refreshed competition score is ${summary.competitionProxy}/100.`;
}

async function loadCachedSample(
  requestKey: string,
  now: Date,
): Promise<SerperStoredSummary | null> {
  const cached = await prisma.serpSample.findFirst({
    where: {
      requestKey,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      sampledAt: 'desc',
    },
    select: {
      summaryJson: true,
    },
  });

  return parseStoredSummary(cached?.summaryJson ?? null);
}

async function fetchFreshSample(
  input: SerperKeywordOpportunityInput,
  apiKey: string,
  pricing: SerperPricingConfig,
  requestKey: string,
  now: Date,
): Promise<SerperStoredSummary> {
  const payload = {
    q: input.seedQuery,
    gl: pricing.country,
    hl: pricing.language,
    tbs: pricing.dateRange,
    page: pricing.page,
  };

  const response = await fetch(SERPER_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Serper search failed with status ${response.status}`);
  }

  const responseJson = await response.json() as SerperSearchResponse;
  const effectiveCostUsd = pricing.usdPerThousandQueries / 1000;
  const expiresAt = new Date(now.getTime() + (pricing.cacheTtlDays * DAY_MS));
  const summary = buildCompetitionSummary(
    responseJson,
    effectiveCostUsd,
    now,
    expiresAt,
    requestKey,
    input.seedQuery,
    pricing.country,
    pricing.language,
    pricing.dateRange,
    pricing.page,
  );

  await prisma.serpSample.create({
    data: {
      vendor: 'serper',
      sourceOpportunityId: input.id,
      requestKey,
      normalizedQueryKey: normalizeQuery(input.seedQuery),
      query: input.seedQuery,
      country: pricing.country,
      language: pricing.language,
      dateRange: pricing.dateRange,
      page: pricing.page,
      creditsUsed: 1,
      effectiveCostUsd,
      competitionProxy: summary.competitionProxy,
      responseJson: responseJson as unknown as Prisma.InputJsonValue,
      summaryJson: summary as unknown as Prisma.InputJsonValue,
      sampledAt: now,
      expiresAt,
    },
  });

  return summary;
}

export async function buildSerperKeywordOpportunityCandidates(
  rows: SerperKeywordOpportunityInput[],
  now: Date = new Date(),
): Promise<{
  candidates: SerperKeywordOpportunityCandidate[];
  supersededOpportunityIds: string[];
  usage: SerperUsageSummary;
}> {
  const runtimeConfig = await getRuntimeConfig(now.getTime());
  let usage = await getSerperUsageSummary(now);

  if (!runtimeConfig.configured || !runtimeConfig.pricing.enabled || !runtimeConfig.apiKey) {
    return {
      candidates: [],
      supersededOpportunityIds: [],
      usage,
    };
  }

  const eligibleRows = rows
    .filter((row) => row.status === 'discovered' || row.status === 'scored')
    .sort((left, right) => right.overallScore - left.overallScore);

  const candidates: SerperKeywordOpportunityCandidate[] = [];
  const supersededOpportunityIds = new Set<string>();
  let liveQueriesUsed = 0;

  for (const row of eligibleRows) {
    if (liveQueriesUsed >= runtimeConfig.pricing.maxQueriesPerRun) {
      break;
    }

    const requestKey = buildRequestKey(
      row.seedQuery,
      runtimeConfig.pricing.country,
      runtimeConfig.pricing.language,
      runtimeConfig.pricing.dateRange,
      runtimeConfig.pricing.page,
    );

    let summary = await loadCachedSample(requestKey, now);
    if (!summary) {
      if (!canSpendOneCredit(usage, runtimeConfig.pricing)) {
        break;
      }

      summary = await fetchFreshSample(row, runtimeConfig.apiKey, runtimeConfig.pricing, requestKey, now);
      liveQueriesUsed += 1;
      usage = await getSerperUsageSummary(now);
    }

    candidates.push({
      sourceOpportunityId: row.id,
      sourceOpportunitySourceType: row.sourceType,
      dedupeKey: buildSerperOpportunityDedupeKey(row),
      seedQuery: row.seedQuery,
      clusterKey: row.clusterKey,
      clusterSnapshotId: row.clusterSnapshotId,
      targetIntent: row.targetIntent,
      demandProxy: row.demandProxy,
      competitionProxy: summary.competitionProxy,
      laeaFitScore: row.laeaFitScore,
      pageTypeRecommendation: row.pageTypeRecommendation,
      targetUrl: row.targetUrl,
      rationale: buildSerperRationale(row, summary),
      sourceRef: buildSerperSourceRef(row, summary),
    });

    if (row.sourceType !== 'serp_sample') {
      supersededOpportunityIds.add(row.id);
    }
  }

  return {
    candidates,
    supersededOpportunityIds: Array.from(supersededOpportunityIds),
    usage,
  };
}

export function resetSerperClientCacheForTests() {
  ssmClient = null;
  runtimeConfigCache = null;
}

import type { Prisma } from '@prisma/client';
import Parser from 'rss-parser';
import { prisma } from '../../db';
import {
  getClusterDetail,
  listClusters,
  type ClusterBucket,
  type ClusterHorizon,
  type ClusterOpportunityDetail,
} from '../gsc/queryClusterer';
import { buildTopicPodFromCluster, type SeoTopicPodPlan } from './topicPodPlanner';

const _PORTFOLIO_SOURCE_TYPES = ['gsc_cluster', 'google_trends', 'serp_sample', 'editorial_seed'] as const;
const _PORTFOLIO_STATUS_VALUES = ['discovered', 'scored', 'promoted', 'archived'] as const;
const PORTFOLIO_BUCKET_PRIORITY: Array<{ horizon: ClusterHorizon; bucket: ClusterBucket; limit: number }> = [
  { horizon: '90d', bucket: 'cluster_topic_theme', limit: 12 },
  { horizon: '28d', bucket: 'cluster_content_gap', limit: 8 },
  { horizon: '90d', bucket: 'cluster_content_gap', limit: 8 },
  { horizon: '28d', bucket: 'cluster_topic_theme', limit: 8 },
  { horizon: '90d', bucket: 'cluster_near_win', limit: 6 },
  { horizon: '28d', bucket: 'cluster_near_win', limit: 6 },
];
const SITE_ORIGIN = 'https://letaiexplainai.com';
const GOOGLE_TRENDS_FEED_URL = 'https://trends.google.com/trending/rss?geo=US';
const GOOGLE_TRENDS_PRIMARY_PAGE = `${SITE_ORIGIN}/news`;
const GOOGLE_TRENDS_AI_KEYWORDS = [
  'ai',
  'artificial intelligence',
  'openai',
  'anthropic',
  'chatgpt',
  'gpt',
  'claude',
  'gemini',
  'copilot',
  'mcp',
  'model context protocol',
  'llm',
  'large language model',
  'agent',
  'agents',
  'transformer',
  'rlhf',
  'alignment',
  'deep learning',
  'machine learning',
  'neural',
  'sora',
  'midjourney',
  'stable diffusion',
  'perplexity',
  'grok',
  'mixture of experts',
  'moe',
] as const;

const googleTrendsParser = new Parser({
  customFields: {
    item: ['ht:approx_traffic'],
  },
  timeout: 30000,
});

export type KeywordOpportunitySourceType = typeof _PORTFOLIO_SOURCE_TYPES[number];
export type KeywordOpportunityStatus = typeof _PORTFOLIO_STATUS_VALUES[number];
export type KeywordOpportunityStatusFilter = 'all' | KeywordOpportunityStatus;
export type KeywordOpportunitySourceFilter = 'all' | KeywordOpportunitySourceType;

export interface KeywordOpportunitySourceRef {
  clusterId: string;
  bucket: ClusterBucket;
  horizon: ClusterHorizon;
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
}

export interface KeywordOpportunityRecord {
  id: string;
  sourceType: KeywordOpportunitySourceType;
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
  status: KeywordOpportunityStatus;
  linkedExperimentId: string | null;
  sourceRef: KeywordOpportunitySourceRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordOpportunityListResult {
  data: KeywordOpportunityRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    counts: Record<'all' | KeywordOpportunityStatus, number>;
    sourceCounts: Record<'all' | KeywordOpportunitySourceType, number>;
  };
}

export interface KeywordPortfolioRebuildResult {
  created: number;
  updated: number;
  archived: number;
  totalActive: number;
  candidateCount: number;
  sourcesUsed: KeywordOpportunitySourceType[];
}

export interface CreateEditorialKeywordOpportunityInput {
  seedQuery: string;
  pageTypeRecommendation: string;
  targetUrl?: string | null;
  demandProxy: number;
  competitionProxy: number;
  laeaFitScore: number;
  rationale: string;
}

interface KeywordOpportunityCandidate {
  sourceType: KeywordOpportunitySourceType;
  dedupeKey: string;
  seedQuery: string;
  clusterKey: string | null;
  clusterSnapshotId: string | null;
  targetIntent: string;
  rawDemand: number;
  competitionProxy: number;
  laeaFitScore: number;
  pageTypeRecommendation: string;
  targetUrl: string | null;
  rationale: string;
  sourceRef: KeywordOpportunitySourceRef | null;
}

interface StoredKeywordOpportunityRow {
  id: string;
  sourceType: string;
  dedupeKey: string;
  seedQuery: string;
  clusterKey: string | null;
  clusterSnapshotId: string | null;
  sourceRefJson: Prisma.JsonValue | null;
  targetIntent: string;
  demandProxy: number;
  competitionProxy: number;
  laeaFitScore: number;
  overallScore: number;
  pageTypeRecommendation: string;
  targetUrl: string | null;
  rationale: string;
  status: string;
  linkedExperimentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type DiscoveryCapacityBand = 100 | 75 | 55 | 40;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function trimToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSeedQuery(value: string): string {
  return value
    .replace(/["“”]/g, ' ')
    .replace(/\b(quiz|quizzes|trivia|test|tests|question|questions)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAbsoluteUrl(path: string | null): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildKeySegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'na';
}

function normalizeTrendQuery(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeTargetUrlInput(value: string | null | undefined): string | null {
  const trimmed = trimToNull(value);
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return getAbsoluteUrl(trimmed);
  }

  return getAbsoluteUrl(`/${trimmed}`);
}

function deriveTargetIntent(query: string, targetPath: string | null): string {
  const normalized = query.toLowerCase();

  if (normalized.includes('timeline') || targetPath === '/timeline') {
    return 'timeline';
  }

  if (normalized.startsWith('who ') || normalized.includes('who invented') || targetPath?.startsWith('/who-invented/')) {
    return 'origin';
  }

  if (normalized.includes('history') || normalized.includes('milestone')) {
    return 'history';
  }

  if (normalized.includes(' vs ') || normalized.includes('versus') || normalized.includes('compare')) {
    return 'comparison';
  }

  if (
    normalized.startsWith('what is ')
    || normalized.startsWith('what are ')
    || normalized.includes(' definition')
    || targetPath?.startsWith('/glossary/')
    || targetPath?.startsWith('/explained/')
  ) {
    return 'definition';
  }

  if (targetPath?.startsWith('/people/')) {
    return 'biography';
  }

  return 'topic_theme';
}

function isAiTrendQuery(query: string): boolean {
  const normalized = query.toLowerCase();
  return GOOGLE_TRENDS_AI_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function derivePageTypeRecommendation(plan: SeoTopicPodPlan): string {
  const path = plan.canonicalDestination.path;

  if (path.startsWith('/glossary/')) return 'glossary_term';
  if (path.startsWith('/explained/')) return 'explainer_page';
  if (path.startsWith('/who-invented/')) return 'who_invented_page';
  if (path.startsWith('/people/')) return 'person_page';
  if (path.startsWith('/organizations/')) return 'organization_page';
  if (path.startsWith('/events/')) return 'event_page';
  if (path === '/timeline') return 'timeline_page';
  if (path.startsWith('/blog/')) return 'blog_post';
  return 'existing_page_optimize';
}

function scoreCompetition(position: number, memberQueryCount: number): number {
  const normalizedPosition = clampScore((position / 40) * 100);
  const longTailBonus = Math.min(12, Math.max(0, memberQueryCount - 1) * 2);
  return clampScore(normalizedPosition - longTailBonus);
}

function scoreLaeaFit(plan: SeoTopicPodPlan): number {
  const moveTypeBase: Record<SeoTopicPodPlan['moveType'], number> = {
    internal_link_only: 94,
    expand_existing: 90,
    optimize_current: 84,
    create_new: 70,
  };

  return clampScore(
    moveTypeBase[plan.moveType]
      + Math.min(6, plan.internalLinkOpportunities.length * 2)
      + Math.min(4, plan.companionAssets.length)
  );
}

async function loadDiscoveryCapacityScore(): Promise<DiscoveryCapacityBand> {
  const [openBlogProposalCount, activeExperimentCount] = await Promise.all([
    prisma.seoProposal.count({
      where: {
        proposalType: 'blog_post',
        status: {
          in: ['pending', 'drafting', 'approved'],
        },
      },
    }),
    prisma.seoExperiment.count({
      where: {
        status: {
          in: ['planned', 'running'],
        },
      },
    }),
  ]);

  const openWorkload = openBlogProposalCount + activeExperimentCount;

  if (openWorkload >= 10) {
    return 40;
  }

  if (openWorkload >= 7) {
    return 55;
  }

  if (openWorkload >= 4) {
    return 75;
  }

  return 100;
}

function buildRationale(cluster: ClusterOpportunityDetail, plan: SeoTopicPodPlan): string {
  const canonicalLabel = plan.canonicalDestination.path === plan.primaryPage
    ? 'the current page'
    : plan.canonicalDestination.path;

  return [
    `${normalizeSeedQuery(cluster.representativeQuery) || cluster.representativeQuery} surfaced as a ${cluster.horizon} ${cluster.bucket.replace('cluster_', '').replace(/_/g, ' ')} opportunity with ${cluster.currentMetrics.impressions} impressions across ${cluster.memberQueryCount} visible query variants.`,
    `LAEA's best next move is ${plan.moveType.replace(/_/g, ' ')} toward ${canonicalLabel}.`,
    `This opportunity fits the graph because ${plan.canonicalDestination.reason.toLowerCase()}`,
  ].join(' ');
}

function isDiscoveryGapPlan(plan: SeoTopicPodPlan): boolean {
  return plan.moveType === 'create_new';
}

function buildSourceRef(cluster: ClusterOpportunityDetail, plan: SeoTopicPodPlan): KeywordOpportunitySourceRef {
  return {
    clusterId: cluster.id,
    bucket: cluster.bucket,
    horizon: cluster.horizon,
    windowStart: cluster.windowStart,
    windowEnd: cluster.windowEnd,
    representativeQuery: cluster.representativeQuery,
    primaryPage: cluster.primaryPage,
    canonicalPath: plan.canonicalDestination.path,
    moveType: plan.moveType,
    impressions: cluster.currentMetrics.impressions,
    clicks: cluster.currentMetrics.clicks,
    ctr: cluster.currentMetrics.ctr,
    position: cluster.currentMetrics.position,
    memberQueryCount: cluster.memberQueryCount,
    memberPageCount: cluster.memberPageCount,
    internalLinkCount: plan.internalLinkOpportunities.length,
  };
}

function parseSourceRef(value: Prisma.JsonValue | null): KeywordOpportunitySourceRef | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as unknown as KeywordOpportunitySourceRef;
}

function serializeRow(row: StoredKeywordOpportunityRow): KeywordOpportunityRecord {
  return {
    id: row.id,
    sourceType: row.sourceType as KeywordOpportunitySourceType,
    dedupeKey: row.dedupeKey,
    seedQuery: row.seedQuery,
    clusterKey: row.clusterKey,
    clusterSnapshotId: row.clusterSnapshotId,
    targetIntent: row.targetIntent,
    demandProxy: row.demandProxy,
    competitionProxy: row.competitionProxy,
    laeaFitScore: row.laeaFitScore,
    overallScore: row.overallScore,
    pageTypeRecommendation: row.pageTypeRecommendation,
    targetUrl: row.targetUrl,
    rationale: row.rationale,
    status: row.status as KeywordOpportunityStatus,
    linkedExperimentId: row.linkedExperimentId,
    sourceRef: parseSourceRef(row.sourceRefJson),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadClusterDetails(): Promise<ClusterOpportunityDetail[]> {
  const ids = new Set<string>();

  for (const request of PORTFOLIO_BUCKET_PRIORITY) {
    const result = await listClusters({
      horizon: request.horizon,
      bucket: request.bucket,
      limit: request.limit,
      page: 1,
    });

    for (const row of result.data) {
      ids.add(row.id);
    }
  }

  const details = await Promise.all(
    Array.from(ids).map(async (id) => getClusterDetail(id))
  );

  return details.filter((detail): detail is ClusterOpportunityDetail => detail !== null);
}

interface GoogleTrendsFeedItem extends Parser.Item {
  'ht:approx_traffic'?: string;
}

function parseApproxTraffic(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const numeric = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildGoogleTrendSyntheticCluster(query: string, approxTraffic: number, publishedAt: string): ClusterOpportunityDetail {
  const publishedDate = new Date(publishedAt || Date.now());
  const isoDate = Number.isNaN(publishedDate.getTime())
    ? new Date().toISOString().slice(0, 10)
    : publishedDate.toISOString().slice(0, 10);

  return {
    id: `google_trends:${buildKeySegment(query)}:${isoDate}`,
    horizon: '28d',
    windowStart: isoDate,
    windowEnd: isoDate,
    bucket: 'cluster_topic_theme',
    status: 'open',
    clusterKey: buildKeySegment(query),
    representativeQuery: query,
    primaryPage: GOOGLE_TRENDS_PRIMARY_PAGE,
    currentMetrics: {
      clicks: 0,
      impressions: Math.max(approxTraffic, 1),
      ctr: 0,
      position: 30,
    },
    memberQueryCount: 1,
    memberPageCount: 1,
    score: approxTraffic,
    evidence: 'Google Trends daily feed',
    suggestedAction: 'Validate as a discovery candidate',
    memberQueries: [],
    memberPages: [],
  };
}

async function loadGoogleTrendItems(): Promise<GoogleTrendsFeedItem[]> {
  try {
    const feed = await googleTrendsParser.parseURL(GOOGLE_TRENDS_FEED_URL);
    return (feed.items as GoogleTrendsFeedItem[])
      .filter((item) => normalizeTrendQuery(item.title ?? '').length > 0)
      .slice(0, 25);
  } catch (error) {
    console.warn('[keywordDiscovery] Failed to load Google Trends feed', error);
    return [];
  }
}

async function buildCandidate(cluster: ClusterOpportunityDetail): Promise<KeywordOpportunityCandidate | null> {
  const plan = await buildTopicPodFromCluster(cluster);
  if (!isDiscoveryGapPlan(plan)) {
    return null;
  }

  const seedQuery = normalizeSeedQuery(plan.keyword || cluster.representativeQuery) || cluster.representativeQuery;
  const targetUrl = getAbsoluteUrl(plan.canonicalDestination.path);
  const pageTypeRecommendation = derivePageTypeRecommendation(plan);
  const targetIntent = deriveTargetIntent(seedQuery, plan.canonicalDestination.path);
  const sourceRef = buildSourceRef(cluster, plan);

  return {
    sourceType: 'gsc_cluster',
    dedupeKey: `gsc_cluster:${cluster.clusterKey}:${pageTypeRecommendation}:${plan.canonicalDestination.path}`,
    seedQuery,
    clusterKey: cluster.clusterKey,
    clusterSnapshotId: cluster.id,
    targetIntent,
    rawDemand: cluster.currentMetrics.impressions,
    competitionProxy: scoreCompetition(cluster.currentMetrics.position, cluster.memberQueryCount),
    laeaFitScore: scoreLaeaFit(plan),
    pageTypeRecommendation,
    targetUrl,
    rationale: buildRationale(cluster, plan),
    sourceRef,
  };
}

async function buildGoogleTrendCandidate(item: GoogleTrendsFeedItem): Promise<KeywordOpportunityCandidate | null> {
  const seedQuery = normalizeTrendQuery(item.title ?? '');
  if (!seedQuery || !isAiTrendQuery(seedQuery)) {
    return null;
  }

  const approxTraffic = parseApproxTraffic(item['ht:approx_traffic']);
  const syntheticCluster = buildGoogleTrendSyntheticCluster(seedQuery, approxTraffic, item.pubDate ?? item.isoDate ?? '');
  const plan = await buildTopicPodFromCluster(syntheticCluster);
  if (!isDiscoveryGapPlan(plan)) {
    return null;
  }

  const pageTypeRecommendation = derivePageTypeRecommendation(plan);
  const targetUrl = getAbsoluteUrl(plan.canonicalDestination.path);
  const trafficLabel = item['ht:approx_traffic']?.trim() || 'recent';

  return {
    sourceType: 'google_trends',
    dedupeKey: `google_trends:${buildKeySegment(seedQuery)}:${pageTypeRecommendation}:${plan.canonicalDestination.path}`,
    seedQuery,
    clusterKey: null,
    clusterSnapshotId: null,
    targetIntent: deriveTargetIntent(seedQuery, plan.canonicalDestination.path),
    rawDemand: Math.max(approxTraffic, 1),
    competitionProxy: 58,
    laeaFitScore: scoreLaeaFit(plan),
    pageTypeRecommendation,
    targetUrl,
    rationale: `${seedQuery} is currently trending in Google Trends US at approximately ${trafficLabel} searches. LAEA's best next move is ${plan.moveType.replace(/_/g, ' ')} toward ${plan.canonicalDestination.path}.`,
    sourceRef: null,
  };
}

function buildOverallScore(
  demandProxy: number,
  laeaFitScore: number,
  competitionProxy: number,
  capacityScore: DiscoveryCapacityBand = 100,
): number {
  const baseline = 0.45 * demandProxy + 0.35 * laeaFitScore + 0.20 * (100 - competitionProxy);
  const capacityPenalty = ((100 - capacityScore) / 100) * 15;
  return Number(Math.max(0, baseline - capacityPenalty).toFixed(1));
}

export async function rebuildKeywordPortfolio(): Promise<KeywordPortfolioRebuildResult> {
  const [details, googleTrendItems] = await Promise.all([
    loadClusterDetails(),
    loadGoogleTrendItems(),
  ]);
  const [clusterCandidateResults, googleTrendCandidateResults] = await Promise.all([
    Promise.all(details.map((detail) => buildCandidate(detail))),
    Promise.all(googleTrendItems.map((item) => buildGoogleTrendCandidate(item))),
  ]);
  const candidates = [...clusterCandidateResults, ...googleTrendCandidateResults]
    .filter((candidate): candidate is KeywordOpportunityCandidate => candidate !== null);
  const capacityScore = await loadDiscoveryCapacityScore();
  const deduped = new Map<string, KeywordOpportunityCandidate>();

  for (const candidate of candidates) {
    const existing = deduped.get(candidate.dedupeKey);
    if (!existing || candidate.rawDemand > existing.rawDemand) {
      deduped.set(candidate.dedupeKey, candidate);
    }
  }

  const uniqueCandidates = Array.from(deduped.values());
  const maxDemand = Math.max(...uniqueCandidates.map((candidate) => candidate.rawDemand), 1);
  const existingRows = await prisma.keywordOpportunity.findMany({
    where: {
      dedupeKey: {
        in: uniqueCandidates.map((candidate) => candidate.dedupeKey),
      },
    },
    select: {
      dedupeKey: true,
    },
  });
  const existingKeys = new Set(existingRows.map((row) => row.dedupeKey));

  for (const candidate of uniqueCandidates) {
    const demandProxy = clampScore((candidate.rawDemand / maxDemand) * 100);
    const overallScore = buildOverallScore(
      demandProxy,
      candidate.laeaFitScore,
      candidate.competitionProxy,
      capacityScore,
    );

    await prisma.keywordOpportunity.upsert({
      where: {
        dedupeKey: candidate.dedupeKey,
      },
      create: {
        sourceType: candidate.sourceType,
        dedupeKey: candidate.dedupeKey,
        seedQuery: candidate.seedQuery,
        clusterKey: candidate.clusterKey,
        clusterSnapshotId: candidate.clusterSnapshotId,
        sourceRefJson: candidate.sourceRef as unknown as Prisma.InputJsonValue,
        targetIntent: candidate.targetIntent,
        demandProxy,
        competitionProxy: candidate.competitionProxy,
        laeaFitScore: candidate.laeaFitScore,
        overallScore,
        pageTypeRecommendation: candidate.pageTypeRecommendation,
        targetUrl: candidate.targetUrl,
        rationale: candidate.rationale,
        status: 'scored',
      },
      update: {
        sourceType: candidate.sourceType,
        seedQuery: candidate.seedQuery,
        clusterKey: candidate.clusterKey,
        clusterSnapshotId: candidate.clusterSnapshotId,
        sourceRefJson: candidate.sourceRef as unknown as Prisma.InputJsonValue,
        targetIntent: candidate.targetIntent,
        demandProxy,
        competitionProxy: candidate.competitionProxy,
        laeaFitScore: candidate.laeaFitScore,
        overallScore,
        pageTypeRecommendation: candidate.pageTypeRecommendation,
        targetUrl: candidate.targetUrl,
        rationale: candidate.rationale,
      },
    });
  }

  const archiveResult = await prisma.keywordOpportunity.updateMany({
    where: {
      sourceType: 'gsc_cluster',
      status: {
        in: ['discovered', 'scored'],
      },
      dedupeKey: {
        notIn: uniqueCandidates.map((candidate) => candidate.dedupeKey),
      },
    },
    data: {
      status: 'archived',
    },
  });

  const totalActive = await prisma.keywordOpportunity.count({
    where: {
      status: {
        in: ['discovered', 'scored', 'promoted'],
      },
    },
  });

  return {
    created: uniqueCandidates.filter((candidate) => !existingKeys.has(candidate.dedupeKey)).length,
    updated: uniqueCandidates.filter((candidate) => existingKeys.has(candidate.dedupeKey)).length,
    archived: archiveResult.count,
    totalActive,
    candidateCount: uniqueCandidates.length,
    sourcesUsed: Array.from(new Set(uniqueCandidates.map((candidate) => candidate.sourceType))),
  };
}

function buildStatusWhere(status: KeywordOpportunityStatusFilter): Prisma.KeywordOpportunityWhereInput {
  if (status === 'all') {
    return {};
  }

  return { status };
}

function buildSourceWhere(sourceType: KeywordOpportunitySourceFilter): Prisma.KeywordOpportunityWhereInput {
  if (sourceType === 'all') {
    return {};
  }

  return { sourceType };
}

function buildPortfolioWhere(
  status: KeywordOpportunityStatusFilter,
  sourceType: KeywordOpportunitySourceFilter,
): Prisma.KeywordOpportunityWhereInput {
  const clauses = [buildStatusWhere(status), buildSourceWhere(sourceType)]
    .filter((clause) => Object.keys(clause).length > 0);

  if (clauses.length === 0) {
    return {};
  }

  if (clauses.length === 1) {
    return clauses[0] as Prisma.KeywordOpportunityWhereInput;
  }

  return {
    AND: clauses,
  };
}

export async function listKeywordOpportunities(options: {
  status?: KeywordOpportunityStatusFilter;
  sourceType?: KeywordOpportunitySourceFilter;
  page?: number;
  limit?: number;
}): Promise<KeywordOpportunityListResult> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.max(1, Math.min(options.limit ?? 25, 100));
  const status = options.status ?? 'all';
  const sourceType = options.sourceType ?? 'all';
  const where = buildPortfolioWhere(status, sourceType);

  const statusCountWhere = buildSourceWhere(sourceType);
  const sourceCountWhere = buildStatusWhere(status);

  const [rows, total, allCounts, sourceCounts] = await Promise.all([
    prisma.keywordOpportunity.findMany({
      where,
      orderBy: [
        { overallScore: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.keywordOpportunity.count({ where }),
    prisma.keywordOpportunity.groupBy({
      where: statusCountWhere,
      by: ['status'],
      _count: {
        _all: true,
      },
    }),
    prisma.keywordOpportunity.groupBy({
      where: sourceCountWhere,
      by: ['sourceType'],
      _count: {
        _all: true,
      },
    }),
  ]);

  const counts: Record<'all' | KeywordOpportunityStatus, number> = {
    all: total,
    discovered: 0,
    scored: 0,
    promoted: 0,
    archived: 0,
  };

  for (const row of allCounts) {
    counts[row.status as KeywordOpportunityStatus] = row._count._all;
  }

  const sourceTotals: Record<'all' | KeywordOpportunitySourceType, number> = {
    all: sourceCounts.reduce((sum, row) => sum + row._count._all, 0),
    gsc_cluster: 0,
    google_trends: 0,
    serp_sample: 0,
    editorial_seed: 0,
  };

  for (const row of sourceCounts) {
    sourceTotals[row.sourceType as KeywordOpportunitySourceType] = row._count._all;
  }

  return {
    data: rows.map((row) => serializeRow(row as StoredKeywordOpportunityRow)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    meta: {
      counts,
      sourceCounts: sourceTotals,
    },
  };
}

export async function getKeywordOpportunity(opportunityId: string): Promise<KeywordOpportunityRecord | null> {
  const row = await prisma.keywordOpportunity.findUnique({
    where: {
      id: opportunityId,
    },
  });

  return row ? serializeRow(row as StoredKeywordOpportunityRow) : null;
}

export async function markKeywordOpportunityPromoted(opportunityId: string): Promise<KeywordOpportunityRecord> {
  const row = await prisma.keywordOpportunity.update({
    where: {
      id: opportunityId,
    },
    data: {
      status: 'promoted',
    },
  });

  return serializeRow(row as StoredKeywordOpportunityRow);
}

export async function createEditorialKeywordOpportunity(
  input: CreateEditorialKeywordOpportunityInput,
): Promise<KeywordOpportunityRecord> {
  const seedQuery = normalizeSeedQuery(input.seedQuery);
  const rationale = trimToNull(input.rationale);

  if (!seedQuery || !rationale) {
    throw new Error('seedQuery and rationale are required');
  }

  const targetUrl = normalizeTargetUrlInput(input.targetUrl);
  const demandProxy = clampScore(input.demandProxy);
  const competitionProxy = clampScore(input.competitionProxy);
  const laeaFitScore = clampScore(input.laeaFitScore);
  const overallScore = buildOverallScore(demandProxy, laeaFitScore, competitionProxy);
  const dedupeKey = [
    'editorial_seed',
    buildKeySegment(seedQuery),
    buildKeySegment(input.pageTypeRecommendation),
    buildKeySegment(targetUrl ?? 'no-target'),
  ].join(':');

  const row = await prisma.keywordOpportunity.upsert({
    where: {
      dedupeKey,
    },
    create: {
      sourceType: 'editorial_seed',
      dedupeKey,
      seedQuery,
      clusterKey: null,
      clusterSnapshotId: null,
      sourceRefJson: null,
      targetIntent: deriveTargetIntent(seedQuery, targetUrl ? new URL(targetUrl).pathname : null),
      demandProxy,
      competitionProxy,
      laeaFitScore,
      overallScore,
      pageTypeRecommendation: input.pageTypeRecommendation,
      targetUrl,
      rationale,
      status: 'scored',
    },
    update: {
      seedQuery,
      targetIntent: deriveTargetIntent(seedQuery, targetUrl ? new URL(targetUrl).pathname : null),
      demandProxy,
      competitionProxy,
      laeaFitScore,
      overallScore,
      pageTypeRecommendation: input.pageTypeRecommendation,
      targetUrl,
      rationale,
      status: 'scored',
    },
  });

  return serializeRow(row as StoredKeywordOpportunityRow);
}

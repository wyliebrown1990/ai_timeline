import type { Prisma } from '@prisma/client';
import { prisma } from '../../db';
import { getLatestFinalizedPtDate, isoDateStringToUtcDate, shiftIsoDate } from './gscClient';

const QUERY_DETAIL_SOURCE = 'query_detail';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const GENERIC_CONTENT_PATHS = new Set([
  '/',
  '/blog',
  '/compare',
  '/events',
  '/explained',
  '/glossary',
  '/news',
  '/people',
  '/subjects',
  '/timeline',
  '/who-invented',
]);
const STOP_TOKENS = new Set([
  'a',
  'an',
  'and',
  'are',
  'be',
  'best',
  'can',
  'could',
  'define',
  'definition',
  'did',
  'do',
  'does',
  'explain',
  'for',
  'from',
  'how',
  'in',
  'is',
  'it',
  'meaning',
  'mean',
  'of',
  'on',
  'or',
  'tell',
  'the',
  'to',
  'was',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'with',
]);
const MIN_MEMBER_OVERLAP = 2;
const MIN_CONTENT_GAP_IMPRESSIONS: Record<ClusterHorizon, number> = {
  '28d': 16,
  '90d': 24,
};
const MIN_NEAR_WIN_IMPRESSIONS: Record<ClusterHorizon, number> = {
  '28d': 18,
  '90d': 28,
};
const MIN_TOPIC_THEME_IMPRESSIONS: Record<ClusterHorizon, number> = {
  '28d': 15,
  '90d': 22,
};
const MIN_EXPECTED_EXTRA_CLICKS = 1.5;
const EXPECTED_CTR_BY_POSITION: Record<number, number> = {
  1: 0.28,
  2: 0.16,
  3: 0.11,
  4: 0.085,
  5: 0.067,
  6: 0.053,
  7: 0.044,
  8: 0.037,
  9: 0.031,
  10: 0.026,
};

export const CLUSTER_HORIZONS = ['28d', '90d'] as const;
export const CLUSTER_BUCKETS = [
  'cluster_content_gap',
  'cluster_near_win',
  'cluster_topic_theme',
] as const;

export type ClusterHorizon = typeof CLUSTER_HORIZONS[number];
export type ClusterBucket = typeof CLUSTER_BUCKETS[number];
export type ClusterStatus = 'open' | 'actioned' | 'dismissed' | 'shipped';

interface RawDailyQueryRow {
  query: string | null;
  page: string;
  clicks: number;
  impressions: number;
  position: number;
}

interface ClusterMemberQuery {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

interface ClusterMemberPage {
  page: string;
  path: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

interface StoredEvidence {
  explanation: string;
  genericShare: number;
  primaryPageShare: number;
  memberQueryCount: number;
  memberPageCount: number;
  expectedCtr: number | null;
  expectedExtraClicks: number | null;
}

interface QueryAggregate {
  rawQuery: string;
  tokens: string[];
  normalizedKey: string;
  impressions: number;
  clicks: number;
  weightedPositionSum: number;
  weightSum: number;
  pageMetrics: Map<string, PageAccumulator>;
}

interface PageAccumulator {
  page: string;
  path: string;
  impressions: number;
  clicks: number;
  weightedPositionSum: number;
  weightSum: number;
}

interface ClusterAccumulator {
  anchorTokens: string[];
  members: QueryAggregate[];
}

interface BuiltCluster {
  clusterKey: string;
  representativeQuery: string;
  memberQueries: ClusterMemberQuery[];
  memberPages: ClusterMemberPage[];
  primaryPage: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  bucket: ClusterBucket;
  bucketScore: number;
  evidence: StoredEvidence;
}

interface ClusterSnapshotRow {
  id: string;
  windowStart: Date;
  windowEnd: Date;
  horizon: string;
  clusterKey: string;
  representativeQuery: string;
  memberQueriesJson: Prisma.JsonValue;
  memberPagesJson: Prisma.JsonValue;
  primaryPage: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  bucket: string | null;
  bucketScore: number | null;
  status: string;
  evidenceJson: Prisma.JsonValue | null;
  createdAt: Date;
}

export interface ClusterMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface ClusterOpportunity {
  id: string;
  horizon: ClusterHorizon;
  windowStart: string;
  windowEnd: string;
  bucket: ClusterBucket;
  status: ClusterStatus;
  clusterKey: string;
  representativeQuery: string;
  primaryPage: string;
  currentMetrics: ClusterMetrics;
  memberQueryCount: number;
  memberPageCount: number;
  score: number;
  evidence: string;
  suggestedAction: string;
}

export interface ClusterOpportunityDetail extends ClusterOpportunity {
  memberQueries: ClusterMemberQuery[];
  memberPages: ClusterMemberPage[];
}

export interface ClusterListResult {
  data: ClusterOpportunity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    horizon: ClusterHorizon;
    windowStart: string | null;
    windowEnd: string | null;
    counts: Record<ClusterBucket, number>;
  };
}

export interface ClusterWindowSummary {
  horizon: ClusterHorizon;
  windowStart: string;
  windowEnd: string;
  clusterCount: number;
}

function clampLimit(limit: number): number {
  return Math.max(1, Math.min(MAX_LIMIT, limit));
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function roundScore(value: number): number {
  return Number(value.toFixed(3));
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getRoundedPosition(position: number): number {
  return Math.max(1, Math.min(10, Math.round(position)));
}

function getExpectedCtr(position: number): number {
  const rounded = getRoundedPosition(position);
  return EXPECTED_CTR_BY_POSITION[rounded] ?? EXPECTED_CTR_BY_POSITION[10];
}

function normalizePathname(pageUrl: string): string {
  try {
    const { pathname } = new URL(pageUrl);
    if (!pathname || pathname === '/') {
      return '/';
    }

    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  } catch {
    if (pageUrl === '/') {
      return '/';
    }

    return pageUrl.endsWith('/') ? pageUrl.slice(0, -1) : pageUrl;
  }
}

function isGenericContentPath(pathname: string): boolean {
  return GENERIC_CONTENT_PATHS.has(pathname);
}

function singularizeToken(token: string): string {
  if (token.endsWith('ies') && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (
    (token.endsWith('sses') || token.endsWith('xes') || token.endsWith('ches') || token.endsWith('shes'))
    && token.length > 5
  ) {
    return token.slice(0, -2);
  }

  if (token.endsWith('s') && token.length > 3 && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }

  return token;
}

function dedupeTokens(tokens: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const token of tokens) {
    if (!seen.has(token)) {
      seen.add(token);
      unique.push(token);
    }
  }

  return unique;
}

export function normalizeClusterTokens(query: string): string[] {
  const cleaned = query
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  if (!cleaned) {
    return [];
  }

  const rawTokens = cleaned.split(/\s+/);
  const normalized = rawTokens
    .map((token) => {
      if (STOP_TOKENS.has(token)) {
        return '';
      }

      if (token === 'artificial') {
        return '';
      }

      if (token === 'intelligence') {
        return 'ai';
      }

      return singularizeToken(token);
    })
    .filter((token) => {
      if (!token) {
        return false;
      }

      if (STOP_TOKENS.has(token)) {
        return false;
      }

      if (token.length === 1) {
        return false;
      }

      return true;
    });

  return dedupeTokens(normalized);
}

function joinTokenKey(tokens: string[]): string {
  return tokens.join(' ');
}

function getOverlapScore(leftTokens: string[], rightTokens: string[]): number {
  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  let overlap = 0;

  for (const token of leftSet) {
    if (rightSet.has(token)) {
      overlap += 1;
    }
  }

  if (overlap < Math.min(MIN_MEMBER_OVERLAP, Math.min(leftSet.size, rightSet.size))) {
    return 0;
  }

  const smaller = Math.min(leftSet.size, rightSet.size);
  const unionSize = new Set([...leftSet, ...rightSet]).size;
  const containment = overlap / smaller;
  const jaccard = overlap / unionSize;

  if (containment === 1) {
    return 1 + jaccard;
  }

  if (containment >= 0.67 && (overlap >= 3 || smaller <= 3)) {
    return containment + jaccard;
  }

  return 0;
}

function getBestRepresentative(members: QueryAggregate[]): QueryAggregate {
  return [...members].sort((left, right) => {
    if (right.impressions !== left.impressions) {
      return right.impressions - left.impressions;
    }

    if (left.tokens.length !== right.tokens.length) {
      return left.tokens.length - right.tokens.length;
    }

    return left.rawQuery.localeCompare(right.rawQuery);
  })[0];
}

function getCoreClusterTokens(members: QueryAggregate[], representative: QueryAggregate): string[] {
  const tokenFrequency = new Map<string, number>();
  for (const member of members) {
    for (const token of new Set(member.tokens)) {
      tokenFrequency.set(token, (tokenFrequency.get(token) ?? 0) + 1);
    }
  }

  const minimumFrequency = Math.max(2, Math.ceil(members.length * 0.75));
  const representativeOrder = new Map(representative.tokens.map((token, index) => [token, index]));
  const frequentTokens = Array.from(tokenFrequency.entries())
    .filter(([, count]) => count >= minimumFrequency)
    .map(([token]) => token)
    .sort((left, right) => {
      const leftOrder = representativeOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = representativeOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.localeCompare(right);
    });

  if (frequentTokens.length >= MIN_MEMBER_OVERLAP) {
    return frequentTokens;
  }

  return representative.tokens;
}

function buildQueryAggregates(rows: RawDailyQueryRow[]): QueryAggregate[] {
  const queries = new Map<string, QueryAggregate>();

  for (const row of rows) {
    if (!row.query) {
      continue;
    }

    const query = row.query.trim();
    if (!query) {
      continue;
    }

    const tokens = normalizeClusterTokens(query);
    if (tokens.length === 0) {
      continue;
    }

    const weight = row.impressions > 0 ? row.impressions : 1;
    const existing = queries.get(query) ?? {
      rawQuery: query,
      tokens,
      normalizedKey: joinTokenKey(tokens),
      impressions: 0,
      clicks: 0,
      weightedPositionSum: 0,
      weightSum: 0,
      pageMetrics: new Map<string, PageAccumulator>(),
    };

    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    existing.weightedPositionSum += row.position * weight;
    existing.weightSum += weight;

    const path = normalizePathname(row.page);
    const pageMetric = existing.pageMetrics.get(row.page) ?? {
      page: row.page,
      path,
      impressions: 0,
      clicks: 0,
      weightedPositionSum: 0,
      weightSum: 0,
    };
    pageMetric.impressions += row.impressions;
    pageMetric.clicks += row.clicks;
    pageMetric.weightedPositionSum += row.position * weight;
    pageMetric.weightSum += weight;
    existing.pageMetrics.set(row.page, pageMetric);

    queries.set(query, existing);
  }

  return Array.from(queries.values()).sort((left, right) => {
    if (right.impressions !== left.impressions) {
      return right.impressions - left.impressions;
    }

    return left.rawQuery.localeCompare(right.rawQuery);
  });
}

export function buildDeterministicClusters(queries: QueryAggregate[]): ClusterAccumulator[] {
  const clusters: ClusterAccumulator[] = [];

  for (const query of queries) {
    let bestCluster: ClusterAccumulator | null = null;
    let bestScore = 0;

    for (const cluster of clusters) {
      const score = getOverlapScore(query.tokens, cluster.anchorTokens);
      if (score > bestScore) {
        bestScore = score;
        bestCluster = cluster;
      }
    }

    if (!bestCluster) {
      clusters.push({
        anchorTokens: [...query.tokens],
        members: [query],
      });
      continue;
    }

    bestCluster.members.push(query);
  }

  return clusters;
}

function getSuggestedAction(bucket: ClusterBucket): string {
  switch (bucket) {
    case 'cluster_content_gap':
      return 'Create or reroute to a stronger canonical destination for this topic family.';
    case 'cluster_near_win':
      return 'Tighten the destination page title, intro, and snippet packaging for this topic family.';
    case 'cluster_topic_theme':
      return 'Create a broader topic pod or hub that covers the recurring variants together.';
    default:
      return 'Review this cluster manually.';
  }
}

function getEvidenceSummary(bucket: ClusterBucket, evidence: StoredEvidence, primaryPage: string): string {
  switch (bucket) {
    case 'cluster_content_gap':
      return `${evidence.memberQueryCount} close variants produced ${formatPercent(evidence.genericShare)} generic-page share, mostly landing on ${normalizePathname(primaryPage)}.`;
    case 'cluster_near_win':
      return `${evidence.memberQueryCount} close variants already land on ${normalizePathname(primaryPage)}, but CTR trails the ranking-band expectation for that page.`;
    case 'cluster_topic_theme':
      return `${evidence.memberQueryCount} close variants spread across ${evidence.memberPageCount} pages without one clearly owning the topic.`;
    default:
      return evidence.explanation;
  }
}

function parseMemberQueries(value: Prisma.JsonValue): ClusterMemberQuery[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Record<string, unknown>;
    if (typeof candidate.query !== 'string') {
      return [];
    }

    return [{
      query: candidate.query,
      impressions: Number(candidate.impressions ?? 0),
      clicks: Number(candidate.clicks ?? 0),
      ctr: Number(candidate.ctr ?? 0),
      position: Number(candidate.position ?? 0),
    }];
  });
}

function parseMemberPages(value: Prisma.JsonValue): ClusterMemberPage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Record<string, unknown>;
    if (typeof candidate.page !== 'string' || typeof candidate.path !== 'string') {
      return [];
    }

    return [{
      page: candidate.page,
      path: candidate.path,
      impressions: Number(candidate.impressions ?? 0),
      clicks: Number(candidate.clicks ?? 0),
      ctr: Number(candidate.ctr ?? 0),
      position: Number(candidate.position ?? 0),
    }];
  });
}

function parseEvidence(value: Prisma.JsonValue | null): StoredEvidence {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      explanation: 'Cluster evidence unavailable.',
      genericShare: 0,
      primaryPageShare: 0,
      memberQueryCount: 0,
      memberPageCount: 0,
      expectedCtr: null,
      expectedExtraClicks: null,
    };
  }

  const candidate = value as Record<string, unknown>;
  return {
    explanation: typeof candidate.explanation === 'string' ? candidate.explanation : 'Cluster evidence unavailable.',
    genericShare: Number(candidate.genericShare ?? 0),
    primaryPageShare: Number(candidate.primaryPageShare ?? 0),
    memberQueryCount: Number(candidate.memberQueryCount ?? 0),
    memberPageCount: Number(candidate.memberPageCount ?? 0),
    expectedCtr: candidate.expectedCtr == null ? null : Number(candidate.expectedCtr),
    expectedExtraClicks: candidate.expectedExtraClicks == null ? null : Number(candidate.expectedExtraClicks),
  };
}

function toOpportunity(row: ClusterSnapshotRow): ClusterOpportunity {
  const memberQueries = parseMemberQueries(row.memberQueriesJson);
  const memberPages = parseMemberPages(row.memberPagesJson);
  const evidence = parseEvidence(row.evidenceJson);
  const bucket = row.bucket as ClusterBucket;

  return {
    id: row.id,
    horizon: row.horizon as ClusterHorizon,
    windowStart: formatIsoDate(row.windowStart),
    windowEnd: formatIsoDate(row.windowEnd),
    bucket,
    status: row.status as ClusterStatus,
    clusterKey: row.clusterKey,
    representativeQuery: row.representativeQuery,
    primaryPage: row.primaryPage,
    currentMetrics: {
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    },
    memberQueryCount: evidence.memberQueryCount || memberQueries.length,
    memberPageCount: evidence.memberPageCount || memberPages.length,
    score: row.bucketScore ?? 0,
    evidence: evidence.explanation || getEvidenceSummary(bucket, evidence, row.primaryPage),
    suggestedAction: getSuggestedAction(bucket),
  };
}

function getCounts(
  clusters: Array<Pick<ClusterSnapshotRow, 'bucket' | 'status'>>
): Record<ClusterBucket, number> {
  const counts: Record<ClusterBucket, number> = {
    cluster_content_gap: 0,
    cluster_near_win: 0,
    cluster_topic_theme: 0,
  };

  for (const cluster of clusters) {
    if (
      cluster.status === 'open'
      && cluster.bucket
      && CLUSTER_BUCKETS.includes(cluster.bucket as ClusterBucket)
    ) {
      counts[cluster.bucket as ClusterBucket] += 1;
    }
  }

  return counts;
}

function buildClusterOpportunity(
  cluster: ClusterAccumulator,
  horizon: ClusterHorizon
): BuiltCluster | null {
  const representative = getBestRepresentative(cluster.members);
  const clusterTokens = getCoreClusterTokens(cluster.members, representative);
  const clusterKey = joinTokenKey(clusterTokens);
  const pageTotals = new Map<string, PageAccumulator>();

  let totalImpressions = 0;
  let totalClicks = 0;
  let weightedPositionSum = 0;
  let weightSum = 0;

  const memberQueries: ClusterMemberQuery[] = cluster.members
    .map((member) => {
      totalImpressions += member.impressions;
      totalClicks += member.clicks;
      weightedPositionSum += member.weightedPositionSum;
      weightSum += member.weightSum;

      for (const pageMetric of member.pageMetrics.values()) {
        const existingPage = pageTotals.get(pageMetric.page) ?? {
          page: pageMetric.page,
          path: pageMetric.path,
          impressions: 0,
          clicks: 0,
          weightedPositionSum: 0,
          weightSum: 0,
        };
        existingPage.impressions += pageMetric.impressions;
        existingPage.clicks += pageMetric.clicks;
        existingPage.weightedPositionSum += pageMetric.weightedPositionSum;
        existingPage.weightSum += pageMetric.weightSum;
        pageTotals.set(pageMetric.page, existingPage);
      }

      return {
        query: member.rawQuery,
        impressions: member.impressions,
        clicks: member.clicks,
        ctr: member.impressions > 0 ? member.clicks / member.impressions : 0,
        position: member.weightSum > 0 ? member.weightedPositionSum / member.weightSum : 0,
      };
    })
    .sort((left, right) => right.impressions - left.impressions)
    .slice(0, 10);

  const memberPages: ClusterMemberPage[] = Array.from(pageTotals.values())
    .map((page) => ({
      page: page.page,
      path: page.path,
      impressions: page.impressions,
      clicks: page.clicks,
      ctr: page.impressions > 0 ? page.clicks / page.impressions : 0,
      position: page.weightSum > 0 ? page.weightedPositionSum / page.weightSum : 0,
    }))
    .sort((left, right) => right.impressions - left.impressions)
    .slice(0, 10);

  if (memberPages.length === 0 || totalImpressions <= 0) {
    return null;
  }

  const primaryPage = memberPages[0];
  const primaryPageShare = primaryPage.impressions / totalImpressions;
  const memberQueryCount = cluster.members.length;
  const memberPageCount = pageTotals.size;
  const genericShare = memberPages
    .filter((page) => isGenericContentPath(page.path))
    .reduce((sum, page) => sum + page.impressions, 0) / totalImpressions;
  const ctr = totalClicks / totalImpressions;
  const position = weightSum > 0 ? weightedPositionSum / weightSum : 0;
  const expectedCtr = getExpectedCtr(position);
  const expectedExtraClicks = Math.max(0, (expectedCtr - ctr) * totalImpressions);

  let bucket: ClusterBucket | null = null;
  let score = 0;
  let explanation = '';

  if (
    totalImpressions >= MIN_CONTENT_GAP_IMPRESSIONS[horizon]
    && (
      isGenericContentPath(primaryPage.path)
      || genericShare >= 0.55
    )
  ) {
    bucket = 'cluster_content_gap';
    score = totalImpressions + (genericShare * 30) + (memberQueryCount * 4) + (memberPageCount * 3);
    explanation = `${memberQueryCount} close query variants generated ${totalImpressions} impressions across the last ${horizon}, and ${formatPercent(genericShare)} of that demand lands on generic destinations like ${primaryPage.path}.`;
  } else if (
    totalImpressions >= MIN_NEAR_WIN_IMPRESSIONS[horizon]
    && !isGenericContentPath(primaryPage.path)
    && position >= 4
    && position <= 15
    && expectedExtraClicks >= MIN_EXPECTED_EXTRA_CLICKS
  ) {
    bucket = 'cluster_near_win';
    score = (expectedExtraClicks * 10) + totalImpressions + Math.max(0, 12 - position);
    explanation = `${memberQueryCount} close variants already land on ${primaryPage.path}, but the cluster CTR of ${formatPercent(ctr)} trails the ${formatPercent(expectedCtr)} expectation for position ${position.toFixed(1)}.`;
  } else if (
    totalImpressions >= MIN_TOPIC_THEME_IMPRESSIONS[horizon]
    && memberQueryCount >= 2
    && (memberQueryCount >= 3 || memberPageCount >= 2 || primaryPageShare < 0.7)
  ) {
    bucket = 'cluster_topic_theme';
    score = totalImpressions + (memberQueryCount * 5) + ((1 - primaryPageShare) * 20);
    explanation = `${memberQueryCount} close variants generated ${totalImpressions} impressions over the last ${horizon}, but the demand is fragmented across ${memberPageCount} pages with no single page owning the topic.`;
  }

  if (!bucket || !clusterKey) {
    return null;
  }

  return {
    clusterKey,
    representativeQuery: representative.rawQuery,
    memberQueries,
    memberPages,
    primaryPage: primaryPage.page,
    clicks: totalClicks,
    impressions: totalImpressions,
    ctr,
    position,
    bucket,
    bucketScore: roundScore(score),
    evidence: {
      explanation,
      genericShare,
      primaryPageShare,
      memberQueryCount,
      memberPageCount,
      expectedCtr: bucket === 'cluster_near_win' ? expectedCtr : null,
      expectedExtraClicks: bucket === 'cluster_near_win' ? roundScore(expectedExtraClicks) : null,
    },
  };
}

function buildSnapshotInput(
  cluster: BuiltCluster,
  windowStart: string,
  windowEnd: string,
  horizon: ClusterHorizon
): Prisma.GscClusterSnapshotCreateInput {
  return {
    windowStart: isoDateStringToUtcDate(windowStart),
    windowEnd: isoDateStringToUtcDate(windowEnd),
    horizon,
    clusterKey: cluster.clusterKey,
    representativeQuery: cluster.representativeQuery,
    memberQueriesJson: cluster.memberQueries as Prisma.InputJsonValue,
    memberPagesJson: cluster.memberPages as Prisma.InputJsonValue,
    primaryPage: cluster.primaryPage,
    clicks: cluster.clicks,
    impressions: cluster.impressions,
    ctr: cluster.ctr,
    position: cluster.position,
    bucket: cluster.bucket,
    bucketScore: cluster.bucketScore,
    evidenceJson: cluster.evidence as Prisma.InputJsonValue,
  };
}

async function rebuildHorizon(horizon: ClusterHorizon, now: Date): Promise<ClusterWindowSummary> {
  const windowEnd = getLatestFinalizedPtDate(now);
  const windowStart = shiftIsoDate(windowEnd, -(Number.parseInt(horizon, 10) - 1));
  const rows = await prisma.gscDailyMetric.findMany({
    where: {
      dataSource: QUERY_DETAIL_SOURCE,
      date: {
        gte: isoDateStringToUtcDate(windowStart),
        lte: isoDateStringToUtcDate(windowEnd),
      },
    },
    select: {
      query: true,
      page: true,
      clicks: true,
      impressions: true,
      position: true,
    },
  });

  const queryAggregates = buildQueryAggregates(rows);
  const clusters = buildDeterministicClusters(queryAggregates)
    .map((cluster) => buildClusterOpportunity(cluster, horizon))
    .filter((cluster): cluster is BuiltCluster => Boolean(cluster))
    .sort((left, right) => right.bucketScore - left.bucketScore);

  const snapshotRows = clusters.map((cluster) => buildSnapshotInput(cluster, windowStart, windowEnd, horizon));
  const clusterKeys = snapshotRows.map((row) => row.clusterKey);
  const windowEndDate = isoDateStringToUtcDate(windowEnd);

  const operations: Array<Promise<unknown>> = [
    prisma.gscClusterSnapshot.deleteMany({
      where: {
        horizon,
        windowEnd: windowEndDate,
        ...(clusterKeys.length > 0 ? { clusterKey: { notIn: clusterKeys } } : {}),
      },
    }),
  ];

  for (const snapshotRow of snapshotRows) {
    operations.push(prisma.gscClusterSnapshot.upsert({
      where: {
        windowEnd_horizon_clusterKey: {
          windowEnd: snapshotRow.windowEnd,
          horizon,
          clusterKey: snapshotRow.clusterKey,
        },
      },
      update: {
        representativeQuery: snapshotRow.representativeQuery,
        memberQueriesJson: snapshotRow.memberQueriesJson,
        memberPagesJson: snapshotRow.memberPagesJson,
        primaryPage: snapshotRow.primaryPage,
        clicks: snapshotRow.clicks,
        impressions: snapshotRow.impressions,
        ctr: snapshotRow.ctr,
        position: snapshotRow.position,
        bucket: snapshotRow.bucket,
        bucketScore: snapshotRow.bucketScore,
        evidenceJson: snapshotRow.evidenceJson,
        windowStart: snapshotRow.windowStart,
      },
      create: snapshotRow,
    }));
  }

  await prisma.$transaction(operations);

  return {
    horizon,
    windowStart,
    windowEnd,
    clusterCount: snapshotRows.length,
  };
}

export async function rebuildClusterSnapshots(
  options: {
    horizons?: ClusterHorizon[];
    now?: Date;
  } = {}
): Promise<ClusterWindowSummary[]> {
  const now = options.now ?? new Date();
  const horizons = options.horizons ?? [...CLUSTER_HORIZONS];

  const results: ClusterWindowSummary[] = [];
  for (const horizon of horizons) {
    results.push(await rebuildHorizon(horizon, now));
  }

  return results;
}

async function resolveWindowForHorizon(horizon: ClusterHorizon): Promise<{
  windowStart: string;
  windowEnd: string;
} | null> {
  const latest = await prisma.gscClusterSnapshot.findFirst({
    where: {
      horizon,
    },
    orderBy: [
      { windowEnd: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      windowStart: true,
      windowEnd: true,
    },
  });

  if (!latest) {
    return null;
  }

  return {
    windowStart: formatIsoDate(latest.windowStart),
    windowEnd: formatIsoDate(latest.windowEnd),
  };
}

export async function listClusters(options: {
  horizon?: ClusterHorizon;
  bucket?: ClusterBucket;
  page?: number;
  limit?: number;
}): Promise<ClusterListResult> {
  const horizon = options.horizon ?? '90d';
  const bucket = options.bucket ?? 'cluster_content_gap';
  const page = Math.max(1, options.page ?? 1);
  const limit = clampLimit(options.limit ?? DEFAULT_LIMIT);
  const window = await resolveWindowForHorizon(horizon);

  if (!window) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
      meta: {
        horizon,
        windowStart: null,
        windowEnd: null,
        counts: {
          cluster_content_gap: 0,
          cluster_near_win: 0,
          cluster_topic_theme: 0,
        },
      },
    };
  }

  const rows = await prisma.gscClusterSnapshot.findMany({
    where: {
      horizon,
      windowEnd: isoDateStringToUtcDate(window.windowEnd),
    },
    orderBy: [
      { bucketScore: 'desc' },
      { impressions: 'desc' },
    ],
  });

  const counts = getCounts(rows);
  const visible = rows
    .filter((row) => row.bucket === bucket && row.status === 'open')
    .map((row) => toOpportunity(row as ClusterSnapshotRow));
  const total = visible.length;
  const startIndex = (page - 1) * limit;
  const paged = visible.slice(startIndex, startIndex + limit);

  return {
    data: paged,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    meta: {
      horizon,
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      counts,
    },
  };
}

export async function getClusterDetail(id: string): Promise<ClusterOpportunityDetail | null> {
  const row = await prisma.gscClusterSnapshot.findUnique({
    where: {
      id,
    },
  });

  if (!row?.bucket || !CLUSTER_BUCKETS.includes(row.bucket as ClusterBucket)) {
    return null;
  }

  const memberQueries = parseMemberQueries(row.memberQueriesJson);
  const memberPages = parseMemberPages(row.memberPagesJson);
  const base = toOpportunity(row as ClusterSnapshotRow);

  return {
    ...base,
    memberQueries,
    memberPages,
  };
}

export async function dismissCluster(id: string): Promise<void> {
  await prisma.gscClusterSnapshot.update({
    where: {
      id,
    },
    data: {
      status: 'dismissed',
    },
  });
}

export async function markClusterActioned(id: string): Promise<void> {
  await prisma.gscClusterSnapshot.update({
    where: {
      id,
    },
    data: {
      status: 'actioned',
    },
  });
}

export async function getClusterWindowHealth(): Promise<
  Partial<Record<ClusterHorizon, ClusterWindowSummary>>
> {
  const windows = await Promise.all(CLUSTER_HORIZONS.map(async (horizon) => {
    const window = await resolveWindowForHorizon(horizon);
    if (!window) {
      return null;
    }

    const clusterCount = await prisma.gscClusterSnapshot.count({
      where: {
        horizon,
        windowEnd: isoDateStringToUtcDate(window.windowEnd),
      },
    });

    return {
      horizon,
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      clusterCount,
    } satisfies ClusterWindowSummary;
  }));

  return windows.reduce<Partial<Record<ClusterHorizon, ClusterWindowSummary>>>((accumulator, window) => {
    if (window) {
      accumulator[window.horizon] = window;
    }

    return accumulator;
  }, {});
}

import { prisma } from '../../db';
import { matchOrganization, matchPerson } from '../entityMatcher';
import { isoDateStringToUtcDate, shiftIsoDate } from './gscClient';

const QUERY_DETAIL_SOURCE = 'query_detail';
const HISTORY_WEEKS = 4;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MIN_COHORT_IMPRESSIONS = 20;
const MIN_EXACT_POSITION_COHORT = 4;
const MIN_ADJACENT_POSITION_COHORT = 8;
const MIN_EXPECTED_EXTRA_CLICKS = 3;
const CTR_GAP_RATIO_THRESHOLD = 0.8;
const SITE_BASELINE_CAP_MULTIPLIER = 1.75;
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

export const INSIGHT_BUCKETS = [
  'winnable_loss',
  'content_gap',
  'trend_signal',
  'decay',
] as const;

export type InsightBucket = typeof INSIGHT_BUCKETS[number];
export type InsightStatus = 'open' | 'actioned' | 'dismissed' | 'shipped';

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

interface SnapshotRow {
  id: string;
  weekStart: Date;
  dataSource: string;
  query: string | null;
  queryKey: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  status: string;
  bucket: string | null;
  bucketScore: number | null;
}

interface ClassifierContext {
  weekStart: string;
  allRows: SnapshotRow[];
  currentWeekRows: SnapshotRow[];
  historyByKey: Map<string, SnapshotRow[]>;
}

interface CanonicalTarget {
  canonicalPath: string;
  label: string;
  type: 'glossary' | 'milestone' | 'organization' | 'person';
}

interface WinnableLossBaseline {
  ctr: number;
  evidenceLabel: string;
  position: number;
}

export interface InsightMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface BucketInsight {
  id: string;
  weekStart: string;
  bucket: InsightBucket;
  status: InsightStatus;
  query: string | null;
  page: string;
  currentMetrics: InsightMetrics;
  baselineMetrics: InsightMetrics | null;
  score: number;
  evidence: string;
  suggestedAction: string;
  canonicalPath?: string | null;
}

export interface BucketListResult {
  data: BucketInsight[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    weekStart: string | null;
    availableWeeks: string[];
    counts: Record<InsightBucket, number>;
  };
}

export interface InsightDetail extends BucketInsight {
  trend: Array<InsightMetrics & { weekStart: string }>;
}

const BUCKET_PRIORITY: Record<InsightBucket, number> = {
  content_gap: 4,
  decay: 3,
  trend_signal: 2,
  winnable_loss: 1,
};

function clampLimit(limit: number): number {
  return Math.max(1, Math.min(MAX_LIMIT, limit));
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toInsightMetrics(row: Pick<SnapshotRow, 'clicks' | 'impressions' | 'ctr' | 'position'>): InsightMetrics {
  return {
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  };
}

function getSnapshotKey(row: Pick<SnapshotRow, 'queryKey' | 'page'>): string {
  return `${row.queryKey}::${row.page}`;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function averageMetrics(rows: SnapshotRow[]): InsightMetrics | null {
  if (rows.length === 0) {
    return null;
  }

  const totals = rows.reduce(
    (accumulator, row) => {
      accumulator.clicks += row.clicks;
      accumulator.impressions += row.impressions;
      accumulator.ctr += row.ctr;
      accumulator.position += row.position;
      return accumulator;
    },
    { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  );

  return {
    clicks: Math.round(totals.clicks / rows.length),
    impressions: Math.round(totals.impressions / rows.length),
    ctr: totals.ctr / rows.length,
    position: totals.position / rows.length,
  };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function roundScore(value: number): number {
  return Number(value.toFixed(3));
}

function getRoundedPosition(position: number): number {
  return Math.max(1, Math.min(10, Math.round(position)));
}

function getSuggestedAction(bucket: InsightBucket): string {
  switch (bucket) {
    case 'winnable_loss':
      return 'Rewrite the page title and meta description.';
    case 'content_gap':
      return 'Create or route users to a canonical entity page.';
    case 'trend_signal':
      return 'Draft a timely content angle for the rising query.';
    case 'decay':
      return 'Refresh the page and investigate the ranking drop.';
    default:
      return 'Review this finding manually.';
  }
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

function isBlogPostPath(pathname: string): boolean {
  return /^\/blog\/[^/]+$/.test(pathname);
}

async function getAvailableWeeks(): Promise<string[]> {
  const rows = await prisma.gscWeeklySnapshot.findMany({
    where: {
      dataSource: QUERY_DETAIL_SOURCE,
    },
    distinct: ['weekStart'],
    select: {
      weekStart: true,
    },
    orderBy: {
      weekStart: 'desc',
    },
  });

  return rows.map((row) => formatIsoDate(row.weekStart));
}

async function resolveWeekStart(requestedWeekStart?: string): Promise<string | null> {
  if (requestedWeekStart) {
    return requestedWeekStart;
  }

  const latest = await prisma.gscWeeklySnapshot.findFirst({
    where: {
      dataSource: QUERY_DETAIL_SOURCE,
    },
    select: {
      weekStart: true,
    },
    orderBy: {
      weekStart: 'desc',
    },
  });

  return latest ? formatIsoDate(latest.weekStart) : null;
}

async function getBucketCounts(weekStart: string): Promise<Record<InsightBucket, number>> {
  const grouped = await prisma.gscWeeklySnapshot.groupBy({
    by: ['bucket'],
    where: {
      weekStart: isoDateStringToUtcDate(weekStart),
      dataSource: QUERY_DETAIL_SOURCE,
      bucket: {
        in: [...INSIGHT_BUCKETS],
      },
      status: {
        not: 'dismissed',
      },
    },
    _count: {
      _all: true,
    },
  });

  const counts: Record<InsightBucket, number> = {
    winnable_loss: 0,
    content_gap: 0,
    trend_signal: 0,
    decay: 0,
  };

  for (const row of grouped) {
    if (row.bucket && row.bucket in counts) {
      counts[row.bucket as InsightBucket] = row._count._all;
    }
  }

  return counts;
}

async function loadClassifierContext(weekStart: string): Promise<ClassifierContext> {
  const earliestWeekStart = shiftIsoDate(weekStart, -(HISTORY_WEEKS * 7));
  const rows = await prisma.gscWeeklySnapshot.findMany({
    where: {
      dataSource: QUERY_DETAIL_SOURCE,
      query: {
        not: null,
      },
      weekStart: {
        gte: isoDateStringToUtcDate(earliestWeekStart),
        lte: isoDateStringToUtcDate(weekStart),
      },
    },
    select: {
      id: true,
      weekStart: true,
      dataSource: true,
      query: true,
      queryKey: true,
      page: true,
      clicks: true,
      impressions: true,
      ctr: true,
      position: true,
      status: true,
      bucket: true,
      bucketScore: true,
    },
    orderBy: [
      { weekStart: 'asc' },
      { impressions: 'desc' },
    ],
  });

  const currentWeekRows = rows.filter((row) => formatIsoDate(row.weekStart) === weekStart);
  const historyByKey = new Map<string, SnapshotRow[]>();

  for (const row of rows) {
    const key = getSnapshotKey(row);
    const existing = historyByKey.get(key) ?? [];
    existing.push(row);
    historyByKey.set(key, existing);
  }

  return {
    weekStart,
    allRows: rows,
    currentWeekRows,
    historyByKey,
  };
}

function buildWinnableLossBaseline(
  allRows: SnapshotRow[],
  row: SnapshotRow
): WinnableLossBaseline {
  const roundedPosition = getRoundedPosition(row.position);
  const benchmarkCtr = EXPECTED_CTR_BY_POSITION[roundedPosition] ?? EXPECTED_CTR_BY_POSITION[10];
  const eligibleRows = allRows.filter(
    (candidate) => candidate.id !== row.id && candidate.impressions >= MIN_COHORT_IMPRESSIONS
  );

  const exactPositionRows = eligibleRows.filter(
    (candidate) => getRoundedPosition(candidate.position) === roundedPosition
  );

  if (exactPositionRows.length >= MIN_EXACT_POSITION_COHORT) {
    const siteMedianCtr = median(exactPositionRows.map((candidate) => candidate.ctr));
    const cappedSiteMedian = Math.max(
      benchmarkCtr,
      Math.min(siteMedianCtr, benchmarkCtr * SITE_BASELINE_CAP_MULTIPLIER)
    );

    return {
      ctr: cappedSiteMedian,
      evidenceLabel: `site median CTR across ${exactPositionRows.length} rows at position ${roundedPosition}`,
      position: roundedPosition,
    };
  }

  const adjacentFloor = Math.max(1, roundedPosition - 1);
  const adjacentCeiling = Math.min(10, roundedPosition + 1);
  const adjacentPositionRows = eligibleRows.filter((candidate) => {
    const candidatePosition = getRoundedPosition(candidate.position);
    return candidatePosition >= adjacentFloor && candidatePosition <= adjacentCeiling;
  });

  if (adjacentPositionRows.length >= MIN_ADJACENT_POSITION_COHORT) {
    const siteMedianCtr = median(adjacentPositionRows.map((candidate) => candidate.ctr));
    const cappedSiteMedian = Math.max(
      benchmarkCtr,
      Math.min(siteMedianCtr, benchmarkCtr * SITE_BASELINE_CAP_MULTIPLIER)
    );

    return {
      ctr: cappedSiteMedian,
      evidenceLabel: `site median CTR across ${adjacentPositionRows.length} rows at positions ${adjacentFloor}-${adjacentCeiling}`,
      position: roundedPosition,
    };
  }

  return {
    ctr: benchmarkCtr,
    evidenceLabel: `expected CTR benchmark at position ${roundedPosition}`,
    position: roundedPosition,
  };
}

async function findCanonicalTarget(
  query: string,
  cache: Map<string, CanonicalTarget | null>
): Promise<CanonicalTarget | null> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return null;
  }

  if (cache.has(normalizedQuery)) {
    return cache.get(normalizedQuery) ?? null;
  }

  const glossaryMatch = await prisma.glossaryTerm.findFirst({
    where: {
      slug: {
        not: null,
      },
      term: {
        equals: query.trim(),
        mode: 'insensitive',
      },
    },
    select: {
      slug: true,
      term: true,
    },
  });

  if (glossaryMatch?.slug) {
    const target = {
      canonicalPath: `/glossary/${glossaryMatch.slug}`,
      label: glossaryMatch.term,
      type: 'glossary' as const,
    };
    cache.set(normalizedQuery, target);
    return target;
  }

  const milestoneMatch = await prisma.milestone.findFirst({
    where: {
      title: {
        equals: query.trim(),
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (milestoneMatch) {
    const target = {
      canonicalPath: `/events/${milestoneMatch.id}`,
      label: milestoneMatch.title,
      type: 'milestone' as const,
    };
    cache.set(normalizedQuery, target);
    return target;
  }

  const personMatch = await matchPerson(query.trim());
  if (personMatch.matched && personMatch.person) {
    const target = {
      canonicalPath: `/people/${personMatch.person.slug}`,
      label: personMatch.person.canonicalName,
      type: 'person' as const,
    };
    cache.set(normalizedQuery, target);
    return target;
  }

  const organizationMatch = await matchOrganization(query.trim());
  if (organizationMatch.matched && organizationMatch.organization) {
    const target = {
      canonicalPath: `/organizations/${organizationMatch.organization.slug}`,
      label: organizationMatch.organization.name,
      type: 'organization' as const,
    };
    cache.set(normalizedQuery, target);
    return target;
  }

  cache.set(normalizedQuery, null);
  return null;
}

function sortInsights(insights: BucketInsight[]): BucketInsight[] {
  return insights.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return right.currentMetrics.impressions - left.currentMetrics.impressions;
  });
}

export async function classifyWinnableLosses(
  options: { weekStart: string }
): Promise<BucketInsight[]> {
  const context = await loadClassifierContext(options.weekStart);
  const candidateRows = context.currentWeekRows.filter(
    (row) => row.impressions >= 50
      && row.position <= 10
      && isBlogPostPath(normalizePathname(row.page))
  );

  const insights: BucketInsight[] = [];
  for (const row of candidateRows) {
    const baseline = buildWinnableLossBaseline(context.allRows, row);
    const expectedExtraClicks = (baseline.ctr - row.ctr) * row.impressions;

    if (
      baseline.ctr <= 0 ||
      row.ctr >= baseline.ctr * CTR_GAP_RATIO_THRESHOLD ||
      expectedExtraClicks < MIN_EXPECTED_EXTRA_CLICKS
    ) {
      continue;
    }

    const score = roundScore(expectedExtraClicks);
    insights.push({
      id: row.id,
      weekStart: options.weekStart,
      bucket: 'winnable_loss',
      status: row.status as InsightStatus,
      query: row.query,
      page: row.page,
      currentMetrics: toInsightMetrics(row),
      baselineMetrics: {
        clicks: Math.round(baseline.ctr * row.impressions),
        impressions: row.impressions,
        ctr: baseline.ctr,
        position: baseline.position,
      },
      score,
      evidence: `CTR is ${formatPercent(row.ctr)} at position ${row.position.toFixed(1)}; ${baseline.evidenceLabel} is ${formatPercent(baseline.ctr)}.`,
      suggestedAction: getSuggestedAction('winnable_loss'),
    });
  }

  return sortInsights(insights);
}

export async function classifyContentGaps(
  options: { weekStart: string }
): Promise<BucketInsight[]> {
  const context = await loadClassifierContext(options.weekStart);
  const candidateRows = context.currentWeekRows.filter((row) => row.impressions >= 20);
  const targetCache = new Map<string, CanonicalTarget | null>();
  const insights: BucketInsight[] = [];

  for (const row of candidateRows) {
    if (!row.query) {
      continue;
    }

    const currentPath = normalizePathname(row.page);
    const genericPage = isGenericContentPath(currentPath);
    const canonicalTarget = await findCanonicalTarget(row.query, targetCache);
    const canonicalPath = canonicalTarget?.canonicalPath ?? null;

    if (!genericPage && (!canonicalPath || canonicalPath === currentPath)) {
      continue;
    }

    const score = roundScore(row.impressions + (genericPage ? 25 : 0) + (canonicalPath ? 15 : 0));
    let evidence = `Query lands on ${currentPath}, which is a generic path with ${row.impressions} impressions this week.`;
    if (canonicalTarget) {
      evidence = `Query maps to ${canonicalTarget.type} "${canonicalTarget.label}", but lands on ${currentPath} instead of ${canonicalTarget.canonicalPath}.`;
    }

    insights.push({
      id: row.id,
      weekStart: options.weekStart,
      bucket: 'content_gap',
      status: row.status as InsightStatus,
      query: row.query,
      page: row.page,
      currentMetrics: toInsightMetrics(row),
      baselineMetrics: null,
      score,
      evidence,
      suggestedAction: getSuggestedAction('content_gap'),
      canonicalPath,
    });
  }

  return sortInsights(insights);
}

export async function classifyTrendSignals(
  options: { weekStart: string }
): Promise<BucketInsight[]> {
  const context = await loadClassifierContext(options.weekStart);
  const insights: BucketInsight[] = [];

  for (const row of context.currentWeekRows) {
    if (row.impressions < 30) {
      continue;
    }

    const history = (context.historyByKey.get(getSnapshotKey(row)) ?? []).filter(
      (candidate) => formatIsoDate(candidate.weekStart) < options.weekStart
    );
    const baselineMetrics = averageMetrics(history);
    if (!baselineMetrics || baselineMetrics.impressions <= 0) {
      continue;
    }

    if (row.impressions < baselineMetrics.impressions * 2) {
      continue;
    }

    const score = roundScore((row.impressions / baselineMetrics.impressions) * row.impressions);
    insights.push({
      id: row.id,
      weekStart: options.weekStart,
      bucket: 'trend_signal',
      status: row.status as InsightStatus,
      query: row.query,
      page: row.page,
      currentMetrics: toInsightMetrics(row),
      baselineMetrics,
      score,
      evidence: `Impressions jumped to ${row.impressions} this week from a trailing ${HISTORY_WEEKS}-week average of ${baselineMetrics.impressions}.`,
      suggestedAction: getSuggestedAction('trend_signal'),
    });
  }

  return sortInsights(insights);
}

export async function classifyDecay(
  options: { weekStart: string }
): Promise<BucketInsight[]> {
  const context = await loadClassifierContext(options.weekStart);
  const insights: BucketInsight[] = [];

  for (const row of context.currentWeekRows) {
    if (row.position <= 6) {
      continue;
    }

    const history = (context.historyByKey.get(getSnapshotKey(row)) ?? []).filter(
      (candidate) => formatIsoDate(candidate.weekStart) < options.weekStart
    );
    if (history.length === 0 || !history.some((candidate) => candidate.position <= 3)) {
      continue;
    }

    const baselineMetrics = averageMetrics(history);
    if (!baselineMetrics || baselineMetrics.impressions <= 0) {
      continue;
    }

    if (row.impressions > baselineMetrics.impressions * 0.7) {
      continue;
    }

    const bestHistoricalPosition = Math.min(...history.map((candidate) => candidate.position));
    const impressionDropRatio = 1 - (row.impressions / baselineMetrics.impressions);
    const score = roundScore((row.position - bestHistoricalPosition) * impressionDropRatio * baselineMetrics.impressions);

    insights.push({
      id: row.id,
      weekStart: options.weekStart,
      bucket: 'decay',
      status: row.status as InsightStatus,
      query: row.query,
      page: row.page,
      currentMetrics: toInsightMetrics(row),
      baselineMetrics,
      score,
      evidence: `Position slipped from a best of ${bestHistoricalPosition.toFixed(1)} to ${row.position.toFixed(1)} and impressions are down ${formatPercent(impressionDropRatio)} versus the trailing average.`,
      suggestedAction: getSuggestedAction('decay'),
    });
  }

  return sortInsights(insights);
}

async function runBucketClassifier(
  bucket: InsightBucket,
  weekStart: string
): Promise<BucketInsight[]> {
  switch (bucket) {
    case 'winnable_loss':
      return classifyWinnableLosses({ weekStart });
    case 'content_gap':
      return classifyContentGaps({ weekStart });
    case 'trend_signal':
      return classifyTrendSignals({ weekStart });
    case 'decay':
      return classifyDecay({ weekStart });
    default:
      return [];
  }
}

export async function classifyAllBuckets(
  options: { weekStart: string }
): Promise<Record<InsightBucket, number>> {
  const [winnableLosses, contentGaps, trendSignals, decaySignals] = await Promise.all([
    classifyWinnableLosses(options),
    classifyContentGaps(options),
    classifyTrendSignals(options),
    classifyDecay(options),
  ]);

  const assignments = new Map<string, { bucket: InsightBucket; score: number }>();
  for (const insight of [...winnableLosses, ...contentGaps, ...trendSignals, ...decaySignals]) {
    const existing = assignments.get(insight.id);
    if (
      !existing
      || BUCKET_PRIORITY[insight.bucket] > BUCKET_PRIORITY[existing.bucket]
      || (
        BUCKET_PRIORITY[insight.bucket] === BUCKET_PRIORITY[existing.bucket]
        && insight.score > existing.score
      )
    ) {
      assignments.set(insight.id, {
        bucket: insight.bucket,
        score: insight.score,
      });
    }
  }

  const weekStartDate = isoDateStringToUtcDate(options.weekStart);
  await prisma.gscWeeklySnapshot.updateMany({
    where: {
      weekStart: weekStartDate,
      dataSource: QUERY_DETAIL_SOURCE,
    },
    data: {
      bucket: null,
      bucketScore: null,
    },
  });

  if (assignments.size > 0) {
    await prisma.$transaction(
      Array.from(assignments.entries()).map(([id, assignment]) => prisma.gscWeeklySnapshot.update({
        where: {
          id,
        },
        data: {
          bucket: assignment.bucket,
          bucketScore: assignment.score,
        },
      }))
    );
  }

  return {
    winnable_loss: winnableLosses.length,
    content_gap: contentGaps.length,
    trend_signal: trendSignals.length,
    decay: decaySignals.length,
  };
}

export async function listInsights(options: {
  bucket: InsightBucket;
  weekStart?: string;
  page?: number;
  limit?: number;
}): Promise<BucketListResult> {
  const weekStart = await resolveWeekStart(options.weekStart);
  const page = Math.max(1, options.page ?? 1);
  const limit = clampLimit(options.limit ?? DEFAULT_LIMIT);
  const availableWeeks = await getAvailableWeeks();

  if (!weekStart) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
      meta: {
        weekStart: null,
        availableWeeks,
        counts: {
          winnable_loss: 0,
          content_gap: 0,
          trend_signal: 0,
          decay: 0,
        },
      },
    };
  }

  const [insights, counts] = await Promise.all([
    runBucketClassifier(options.bucket, weekStart),
    getBucketCounts(weekStart),
  ]);
  const visibleInsights = insights.filter((insight) => insight.status !== 'dismissed');
  const total = visibleInsights.length;
  const startIndex = (page - 1) * limit;
  const pagedInsights = visibleInsights.slice(startIndex, startIndex + limit);

  return {
    data: pagedInsights,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    meta: {
      weekStart,
      availableWeeks,
      counts,
    },
  };
}

export async function getInsightDetail(id: string): Promise<InsightDetail | null> {
  const snapshot = await prisma.gscWeeklySnapshot.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      bucket: true,
      weekStart: true,
      queryKey: true,
      page: true,
    },
  });

  if (!snapshot?.bucket || !INSIGHT_BUCKETS.includes(snapshot.bucket as InsightBucket)) {
    return null;
  }

  const weekStart = formatIsoDate(snapshot.weekStart);
  const insights = await runBucketClassifier(snapshot.bucket as InsightBucket, weekStart);
  const current = insights.find((insight) => insight.id === id);
  if (!current) {
    return null;
  }

  const history = await prisma.gscWeeklySnapshot.findMany({
    where: {
      dataSource: QUERY_DETAIL_SOURCE,
      queryKey: snapshot.queryKey,
      page: snapshot.page,
      weekStart: {
        gte: isoDateStringToUtcDate(shiftIsoDate(weekStart, -(HISTORY_WEEKS * 7))),
        lte: snapshot.weekStart,
      },
    },
    select: {
      weekStart: true,
      clicks: true,
      impressions: true,
      ctr: true,
      position: true,
    },
    orderBy: {
      weekStart: 'asc',
    },
  });

  return {
    ...current,
    trend: history.map((row) => ({
      weekStart: formatIsoDate(row.weekStart),
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })),
  };
}

export async function dismissInsight(id: string): Promise<void> {
  await prisma.gscWeeklySnapshot.update({
    where: {
      id,
    },
    data: {
      status: 'dismissed',
    },
  });
}

export async function markInsightActioned(id: string): Promise<void> {
  await prisma.gscWeeklySnapshot.update({
    where: {
      id,
    },
    data: {
      status: 'actioned',
    },
  });
}

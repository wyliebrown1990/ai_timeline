import type { Prisma } from '@prisma/client';
import { prisma } from '../../db';
import {
  diffIsoDatesInDays,
  getLatestFinalizedPtDate,
  getMostRecentFinalizedWindow,
  isoDateStringToUtcDate,
  queryAllRows,
  shiftIsoDate,
} from './gscClient';
import type { GscRow } from './gscClient';
import { classifyAllBuckets } from './bucketClassifier';
import { getClusterWindowHealth, rebuildClusterSnapshots, type ClusterWindowSummary } from './queryClusterer';

const QUERY_DETAIL_DIMENSIONS = ['date', 'query', 'page', 'device', 'country'] as const;
const PAGE_AGGREGATE_DIMENSIONS = ['date', 'page', 'device', 'country'] as const;
const QUERY_DETAIL_SOURCE = 'query_detail';
const PAGE_AGGREGATE_SOURCE = 'page_aggregate';
const PAGE_AGGREGATE_QUERY_KEY = '__PAGE_AGGREGATE__';

type DailyMetricSource = typeof QUERY_DETAIL_SOURCE | typeof PAGE_AGGREGATE_SOURCE;

export interface GscIngestSummary {
  mode: 'weekly' | 'backfill';
  startDate: string;
  endDate: string;
  finalizedThroughDate: string;
  dailyRowsInserted: number;
  dailyRowsAttempted: number;
  snapshotsCreated: number;
  weekStartsRebuilt: string[];
  clusterWindowsRebuilt: ClusterWindowSummary[];
  durationMs: number;
}

interface SnapshotAccumulator {
  dataSource: DailyMetricSource;
  query: string | null;
  queryKey: string;
  page: string;
  clicks: number;
  impressions: number;
  weightedPositionSum: number;
  weightSum: number;
}

function isMissingClusterTableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('GscClusterSnapshot') && error.message.includes('does not exist');
}

async function rebuildClusterSnapshotsSafely(now: Date): Promise<ClusterWindowSummary[]> {
  try {
    return await rebuildClusterSnapshots({ now });
  } catch (error) {
    if (isMissingClusterTableError(error)) {
      console.warn('[GSC_CLUSTER] Cluster table missing during ingest; skipping clustered rebuild until migration lands');
      return [];
    }

    throw error;
  }
}

function getRequiredKey(keys: string[], index: number, label: string): string {
  const value = keys[index];
  if (!value) {
    throw new Error(`Missing required ${label} dimension at index ${index}`);
  }

  return value;
}

function getNormalizedQueryKey(dataSource: DailyMetricSource, query: string | null): string {
  if (dataSource === PAGE_AGGREGATE_SOURCE) {
    return PAGE_AGGREGATE_QUERY_KEY;
  }

  if (!query) {
    throw new Error(`Missing query for data source ${dataSource}`);
  }

  return query;
}

export function getAlignedWeekStartIso(targetDate: string, anchorEndDate: string): string {
  const dayDiff = diffIsoDatesInDays(anchorEndDate, targetDate);
  const bucketOffset = Math.floor(dayDiff / 7);

  return shiftIsoDate(anchorEndDate, -((bucketOffset * 7) + 6));
}

export function collectAlignedWeekStarts(
  startDate: string,
  endDate: string,
  anchorEndDate: string
): string[] {
  const totalDays = diffIsoDatesInDays(endDate, startDate);
  const weekStarts = new Set<string>();

  for (let offset = 0; offset <= totalDays; offset += 1) {
    const day = shiftIsoDate(startDate, offset);
    weekStarts.add(getAlignedWeekStartIso(day, anchorEndDate));
  }

  return Array.from(weekStarts).sort();
}

export function mapQueryDetailRows(rows: GscRow[]): Prisma.GscDailyMetricCreateManyInput[] {
  return rows.map((row) => {
    const date = getRequiredKey(row.keys, 0, 'date');
    const query = getRequiredKey(row.keys, 1, 'query');
    const page = getRequiredKey(row.keys, 2, 'page');
    const device = getRequiredKey(row.keys, 3, 'device');
    const country = getRequiredKey(row.keys, 4, 'country');

    return {
      date: isoDateStringToUtcDate(date),
      dataSource: QUERY_DETAIL_SOURCE,
      query,
      queryKey: getNormalizedQueryKey(QUERY_DETAIL_SOURCE, query),
      page,
      device,
      country,
      clicks: Math.round(row.clicks),
      impressions: Math.round(row.impressions),
      ctr: row.ctr,
      position: row.position,
    };
  });
}

export function mapPageAggregateRows(rows: GscRow[]): Prisma.GscDailyMetricCreateManyInput[] {
  return rows.map((row) => {
    const date = getRequiredKey(row.keys, 0, 'date');
    const page = getRequiredKey(row.keys, 1, 'page');
    const device = getRequiredKey(row.keys, 2, 'device');
    const country = getRequiredKey(row.keys, 3, 'country');

    return {
      date: isoDateStringToUtcDate(date),
      dataSource: PAGE_AGGREGATE_SOURCE,
      query: null,
      queryKey: getNormalizedQueryKey(PAGE_AGGREGATE_SOURCE, null),
      page,
      device,
      country,
      clicks: Math.round(row.clicks),
      impressions: Math.round(row.impressions),
      ctr: row.ctr,
      position: row.position,
    };
  });
}

export function buildWeeklySnapshotRows(
  metrics: Array<{
    dataSource: string;
    query: string | null;
    queryKey: string;
    page: string;
    clicks: number;
    impressions: number;
    position: number;
  }>,
  weekStart: string
): Prisma.GscWeeklySnapshotCreateManyInput[] {
  const grouped = new Map<string, SnapshotAccumulator>();

  for (const metric of metrics) {
    const key = `${metric.dataSource}::${metric.queryKey}::${metric.page}`;
    const existing = grouped.get(key) ?? {
      dataSource: metric.dataSource as DailyMetricSource,
      query: metric.query,
      queryKey: metric.queryKey,
      page: metric.page,
      clicks: 0,
      impressions: 0,
      weightedPositionSum: 0,
      weightSum: 0,
    };

    const weight = metric.impressions > 0 ? metric.impressions : 1;
    existing.clicks += metric.clicks;
    existing.impressions += metric.impressions;
    existing.weightedPositionSum += metric.position * weight;
    existing.weightSum += weight;

    grouped.set(key, existing);
  }

  return Array.from(grouped.values()).map((entry) => ({
    weekStart: isoDateStringToUtcDate(weekStart),
    dataSource: entry.dataSource,
    query: entry.query,
    queryKey: entry.queryKey,
    page: entry.page,
    clicks: entry.clicks,
    impressions: entry.impressions,
    ctr: entry.impressions > 0 ? entry.clicks / entry.impressions : 0,
    position: entry.weightSum > 0 ? entry.weightedPositionSum / entry.weightSum : 0,
    status: 'open',
  }));
}

async function insertDailyMetrics(rows: Prisma.GscDailyMetricCreateManyInput[]): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const result = await prisma.gscDailyMetric.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return result.count;
}

async function ingestDateRange(startDate: string, endDate: string): Promise<{
  inserted: number;
  attempted: number;
}> {
  const [queryDetailRows, pageAggregateRows] = await Promise.all([
    queryAllRows({
      startDate,
      endDate,
      dimensions: [...QUERY_DETAIL_DIMENSIONS],
    }),
    queryAllRows({
      startDate,
      endDate,
      dimensions: [...PAGE_AGGREGATE_DIMENSIONS],
    }),
  ]);

  const mappedRows = [
    ...mapQueryDetailRows(queryDetailRows),
    ...mapPageAggregateRows(pageAggregateRows),
  ];
  const inserted = await insertDailyMetrics(mappedRows);

  return {
    inserted,
    attempted: mappedRows.length,
  };
}

async function rebuildWeeklySnapshots(weekStart: string): Promise<number> {
  const weekStartDate = isoDateStringToUtcDate(weekStart);
  const weekEndExclusive = isoDateStringToUtcDate(shiftIsoDate(weekStart, 7));
  const metrics = await prisma.gscDailyMetric.findMany({
    where: {
      date: {
        gte: weekStartDate,
        lt: weekEndExclusive,
      },
    },
    select: {
      dataSource: true,
      query: true,
      queryKey: true,
      page: true,
      clicks: true,
      impressions: true,
      position: true,
    },
  });

  await prisma.gscWeeklySnapshot.deleteMany({
    where: {
      weekStart: weekStartDate,
    },
  });

  const snapshotRows = buildWeeklySnapshotRows(metrics, weekStart);
  if (snapshotRows.length === 0) {
    return 0;
  }

  const result = await prisma.gscWeeklySnapshot.createMany({
    data: snapshotRows,
  });

  return result.count;
}

export async function runWeeklyIngest(now: Date = new Date()): Promise<GscIngestSummary> {
  const startedAt = Date.now();
  const { startDate, endDate } = getMostRecentFinalizedWindow(now, 7);
  const { inserted, attempted } = await ingestDateRange(startDate, endDate);
  const snapshotsCreated = await rebuildWeeklySnapshots(startDate);
  await classifyAllBuckets({ weekStart: startDate });
  const clusterWindowsRebuilt = await rebuildClusterSnapshotsSafely(now);
  const durationMs = Date.now() - startedAt;

  console.log(
    `[GSC_INGEST] mode=weekly start=${startDate} end=${endDate} attempted=${attempted} inserted=${inserted} snapshots=${snapshotsCreated} clusters=${clusterWindowsRebuilt.map((window) => `${window.horizon}:${window.clusterCount}`).join(',')} durationMs=${durationMs}`
  );

  return {
    mode: 'weekly',
    startDate,
    endDate,
    finalizedThroughDate: endDate,
    dailyRowsInserted: inserted,
    dailyRowsAttempted: attempted,
    snapshotsCreated,
    weekStartsRebuilt: [startDate],
    clusterWindowsRebuilt,
    durationMs,
  };
}

export async function runBackfill(daysBack: number, now: Date = new Date()): Promise<GscIngestSummary> {
  if (!Number.isInteger(daysBack) || daysBack < 1) {
    throw new Error(`daysBack must be a positive integer; received ${daysBack}`);
  }

  const startedAt = Date.now();
  const finalizedThroughDate = getLatestFinalizedPtDate(now);
  const startDate = shiftIsoDate(finalizedThroughDate, -(daysBack - 1));
  let dailyRowsInserted = 0;
  let dailyRowsAttempted = 0;

  for (let offset = 0; offset < daysBack; offset += 1) {
    const date = shiftIsoDate(startDate, offset);
    const { inserted, attempted } = await ingestDateRange(date, date);
    dailyRowsInserted += inserted;
    dailyRowsAttempted += attempted;
  }

  const weekStartsRebuilt = collectAlignedWeekStarts(startDate, finalizedThroughDate, finalizedThroughDate);
  let snapshotsCreated = 0;
  for (const weekStart of weekStartsRebuilt) {
    snapshotsCreated += await rebuildWeeklySnapshots(weekStart);
    await classifyAllBuckets({ weekStart });
  }
  const clusterWindowsRebuilt = await rebuildClusterSnapshotsSafely(now);

  const durationMs = Date.now() - startedAt;
  console.log(
    `[GSC_INGEST] mode=backfill start=${startDate} end=${finalizedThroughDate} attempted=${dailyRowsAttempted} inserted=${dailyRowsInserted} snapshots=${snapshotsCreated} clusters=${clusterWindowsRebuilt.map((window) => `${window.horizon}:${window.clusterCount}`).join(',')} durationMs=${durationMs}`
  );

  return {
    mode: 'backfill',
    startDate,
    endDate: finalizedThroughDate,
    finalizedThroughDate,
    dailyRowsInserted,
    dailyRowsAttempted,
    snapshotsCreated,
    weekStartsRebuilt,
    clusterWindowsRebuilt,
    durationMs,
  };
}

export async function getGscHealth(now: Date = new Date()): Promise<{
  lastRunAt: Date | null;
  finalizedThroughDate: string;
  lastRowCount: number;
  lastWeekCovered: string | null;
  totalRowsLast30d: number;
  clusterWindows: Partial<Record<'28d' | '90d', ClusterWindowSummary>>;
}> {
  const finalizedThroughDate = getLatestFinalizedPtDate(now);
  const [latestMetric, latestSnapshot, latestWeekSnapshot, clusterWindowsResult] = await Promise.allSettled([
    prisma.gscDailyMetric.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.gscWeeklySnapshot.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.gscWeeklySnapshot.findFirst({
      orderBy: { weekStart: 'desc' },
      select: { weekStart: true },
    }),
    getClusterWindowHealth(),
  ]);

  if (latestMetric.status === 'rejected') {
    throw latestMetric.reason;
  }

  if (latestSnapshot.status === 'rejected') {
    throw latestSnapshot.reason;
  }

  if (latestWeekSnapshot.status === 'rejected') {
    throw latestWeekSnapshot.reason;
  }

  let clusterWindows: Partial<Record<'28d' | '90d', ClusterWindowSummary>> = {};
  if (clusterWindowsResult.status === 'fulfilled') {
    clusterWindows = clusterWindowsResult.value;
  } else if (!isMissingClusterTableError(clusterWindowsResult.reason)) {
    throw clusterWindowsResult.reason;
  }

  const lastWeekCovered = latestWeekSnapshot.value?.weekStart.toISOString().slice(0, 10) ?? null;
  const totalRowsLast30d = await prisma.gscDailyMetric.count({
    where: {
      date: {
        gte: isoDateStringToUtcDate(shiftIsoDate(finalizedThroughDate, -29)),
      },
    },
  });

  const lastRowCount = lastWeekCovered
    ? await prisma.gscDailyMetric.count({
      where: {
        date: {
          gte: isoDateStringToUtcDate(lastWeekCovered),
          lt: isoDateStringToUtcDate(shiftIsoDate(lastWeekCovered, 7)),
        },
      },
    })
    : 0;

  const latestTimestamps = [latestMetric.value?.createdAt, latestSnapshot.value?.createdAt]
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime());

  return {
    lastRunAt: latestTimestamps[0] ?? null,
    finalizedThroughDate,
    lastRowCount,
    lastWeekCovered,
    totalRowsLast30d,
    clusterWindows,
  };
}

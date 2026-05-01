import { prisma } from '../../db';
import { ApiError } from '../../middleware/error';
import {
  getLatestFinalizedPtDate,
  isoDateStringToUtcDate,
  shiftIsoDate,
} from '../gsc/gscClient';

const PT_TIMEZONE = 'America/Los_Angeles';
const PAGE_AGGREGATE_SOURCE = 'page_aggregate';
const MEASURABLE_ACTION_TYPE = 'metadata_rewrite';
const MEASURABLE_TARGET_TYPE = 'blog_post';

interface StoredActionRow {
  id: string;
  snapshotId: string | null;
  actionType: string;
  targetType: string;
  targetId: string;
  shippedAt: Date;
  rolledBackAt: Date | null;
  measuredAt: Date | null;
  measuredDelta: unknown;
  beforeJson: unknown;
  snapshot: {
    id: string;
    page: string;
    query: string | null;
    weekStart: Date;
  } | null;
}

interface AggregatedPageMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
}

export interface SeoMeasurementWindow {
  shippedPtDate: string;
  beforeStart: string;
  beforeEnd: string;
  afterStart: string;
  afterEnd: string;
}

export interface SeoFeedbackMeasurement {
  actionId: string;
  snapshotId: string | null;
  pageUrl: string;
  shippedAt: string;
  shippedPtDate: string;
  beforeStart: string;
  beforeEnd: string;
  afterStart: string;
  afterEnd: string;
  clicksBefore: number;
  clicksAfter: number;
  impressionsBefore: number;
  impressionsAfter: number;
  ctrBefore: number;
  ctrAfter: number;
  avgPositionBefore: number;
  avgPositionAfter: number;
}

export interface PendingSeoFeedbackAction {
  id: string;
  snapshotId: string | null;
  targetId: string;
  targetType: string;
  pageUrl: string;
  query: string | null;
  shippedAt: string;
  shippedPtDate: string;
  beforeStart: string;
  beforeEnd: string;
  afterStart: string;
  afterEnd: string;
}

function getDatePartsInTimeZone(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  if (!year || !month || !day) {
    throw ApiError.internal(`Unable to compute PT date parts for ${date.toISOString()}`);
  }

  return { year, month, day };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function getPtDateString(date: Date): string {
  const parts = getDatePartsInTimeZone(date, PT_TIMEZONE);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}

function parsePageUrl(beforeJson: unknown): string {
  if (!beforeJson || typeof beforeJson !== 'object') {
    throw ApiError.internal('SEO action audit payload is invalid');
  }

  const pageUrl = (beforeJson as { pageUrl?: unknown }).pageUrl;
  if (typeof pageUrl !== 'string' || pageUrl.trim().length === 0) {
    throw ApiError.internal('SEO action audit payload is missing pageUrl');
  }

  return pageUrl.trim();
}

function buildMeasurementWindow(shippedAt: Date): SeoMeasurementWindow {
  const shippedPtDate = getPtDateString(shippedAt);

  return {
    shippedPtDate,
    beforeStart: shiftIsoDate(shippedPtDate, -7),
    beforeEnd: shiftIsoDate(shippedPtDate, -1),
    afterStart: shiftIsoDate(shippedPtDate, 1),
    afterEnd: shiftIsoDate(shippedPtDate, 7),
  };
}

function isWindowFinalized(window: SeoMeasurementWindow, now: Date): boolean {
  return getLatestFinalizedPtDate(now) >= window.afterEnd;
}

function resolvePageUrl(action: StoredActionRow): string {
  return action.snapshot?.page ?? parsePageUrl(action.beforeJson);
}

function serializeMeasurement(
  action: StoredActionRow,
  pageUrl: string,
  window: SeoMeasurementWindow,
  beforeMetrics: AggregatedPageMetrics,
  afterMetrics: AggregatedPageMetrics
): SeoFeedbackMeasurement {
  return {
    actionId: action.id,
    snapshotId: action.snapshotId,
    pageUrl,
    shippedAt: action.shippedAt.toISOString(),
    shippedPtDate: window.shippedPtDate,
    beforeStart: window.beforeStart,
    beforeEnd: window.beforeEnd,
    afterStart: window.afterStart,
    afterEnd: window.afterEnd,
    clicksBefore: beforeMetrics.clicks,
    clicksAfter: afterMetrics.clicks,
    impressionsBefore: beforeMetrics.impressions,
    impressionsAfter: afterMetrics.impressions,
    ctrBefore: beforeMetrics.ctr,
    ctrAfter: afterMetrics.ctr,
    avgPositionBefore: beforeMetrics.avgPosition,
    avgPositionAfter: afterMetrics.avgPosition,
  };
}

async function aggregatePageMetrics(
  pageUrl: string,
  startDate: string,
  endDate: string
): Promise<AggregatedPageMetrics> {
  const rows = await prisma.gscDailyMetric.findMany({
    where: {
      dataSource: PAGE_AGGREGATE_SOURCE,
      page: pageUrl,
      date: {
        gte: isoDateStringToUtcDate(startDate),
        lte: isoDateStringToUtcDate(endDate),
      },
    },
    select: {
      clicks: true,
      impressions: true,
      position: true,
    },
  });

  if (rows.length === 0) {
    return {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      avgPosition: 0,
    };
  }

  let clicks = 0;
  let impressions = 0;
  let weightedPosition = 0;
  let weightSum = 0;

  for (const row of rows) {
    clicks += row.clicks;
    impressions += row.impressions;
    const weight = row.impressions > 0 ? row.impressions : 1;
    weightedPosition += row.position * weight;
    weightSum += weight;
  }

  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? roundMetric(clicks / impressions) : 0,
    avgPosition: weightSum > 0 ? roundMetric(weightedPosition / weightSum) : 0,
  };
}

function getStoredMeasurement(action: StoredActionRow): SeoFeedbackMeasurement | null {
  if (!action.measuredDelta || typeof action.measuredDelta !== 'object') {
    return null;
  }

  return action.measuredDelta as SeoFeedbackMeasurement;
}

async function loadMeasurableAction(actionId: string): Promise<StoredActionRow> {
  const action = await prisma.seoAgentAction.findUnique({
    where: {
      id: actionId,
    },
    include: {
      snapshot: {
        select: {
          id: true,
          page: true,
          query: true,
          weekStart: true,
        },
      },
    },
  });

  if (!action) {
    throw ApiError.notFound('SEO action not found');
  }

  if (action.actionType !== MEASURABLE_ACTION_TYPE || action.targetType !== MEASURABLE_TARGET_TYPE) {
    throw ApiError.badRequest('Only blog metadata rewrites support feedback measurement');
  }

  return action as StoredActionRow;
}

export async function listPendingFeedbackActions(
  now: Date = new Date()
): Promise<PendingSeoFeedbackAction[]> {
  const actions = await prisma.seoAgentAction.findMany({
    where: {
      actionType: MEASURABLE_ACTION_TYPE,
      targetType: MEASURABLE_TARGET_TYPE,
      measuredAt: null,
      rolledBackAt: null,
    },
    orderBy: {
      shippedAt: 'asc',
    },
    include: {
      snapshot: {
        select: {
          id: true,
          page: true,
          query: true,
          weekStart: true,
        },
      },
    },
  });

  return (actions as StoredActionRow[])
    .flatMap((action) => {
      const window = buildMeasurementWindow(action.shippedAt);
      if (!isWindowFinalized(window, now)) {
        return [];
      }

      return [{
        id: action.id,
        snapshotId: action.snapshotId,
        targetId: action.targetId,
        targetType: action.targetType,
        pageUrl: resolvePageUrl(action),
        query: action.snapshot?.query ?? null,
        shippedAt: action.shippedAt.toISOString(),
        shippedPtDate: window.shippedPtDate,
        beforeStart: window.beforeStart,
        beforeEnd: window.beforeEnd,
        afterStart: window.afterStart,
        afterEnd: window.afterEnd,
      }];
    });
}

export async function measureSeoAction(
  actionId: string,
  now: Date = new Date()
): Promise<SeoFeedbackMeasurement> {
  const action = await loadMeasurableAction(actionId);
  const existingMeasurement = getStoredMeasurement(action);
  if (action.measuredAt && existingMeasurement) {
    return existingMeasurement;
  }

  if (action.rolledBackAt) {
    throw new ApiError(409, 'Rolled-back SEO actions are not eligible for new measurements');
  }

  const window = buildMeasurementWindow(action.shippedAt);
  if (!isWindowFinalized(window, now)) {
    throw new ApiError(409, `This action cannot be measured until PT data is finalized through ${window.afterEnd}`);
  }

  const pageUrl = resolvePageUrl(action);
  const [beforeMetrics, afterMetrics] = await Promise.all([
    aggregatePageMetrics(pageUrl, window.beforeStart, window.beforeEnd),
    aggregatePageMetrics(pageUrl, window.afterStart, window.afterEnd),
  ]);

  const measurement = serializeMeasurement(action, pageUrl, window, beforeMetrics, afterMetrics);

  await prisma.seoAgentAction.update({
    where: {
      id: actionId,
    },
    data: {
      measuredAt: now,
      measuredDelta: measurement,
    },
  });

  return measurement;
}

export function getMeasurementWindowForTests(shippedAt: Date): SeoMeasurementWindow {
  return buildMeasurementWindow(shippedAt);
}

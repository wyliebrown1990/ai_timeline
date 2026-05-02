import type { Prisma } from '@prisma/client';
import { prisma } from '../../db';
import { ApiError } from '../../middleware/error';
import { isoDateStringToUtcDate, shiftIsoDate, getLatestFinalizedPtDate } from '../gsc/gscClient';

const PROJECT_HOST = 'https://letaiexplainai.com';
const PAGE_AGGREGATE_SOURCE = 'page_aggregate';
const PT_TIMEZONE = 'America/Los_Angeles';
const CHECKPOINT_DAYS = [14, 28, 56] as const;
const MISSED_CHECKPOINT_AFTER_DAYS = 7;

export type SeoExperimentStatus = 'planned' | 'running' | 'won' | 'flat' | 'lost' | 'archived';
export type SeoExperimentStatusFilter = SeoExperimentStatus | 'all';
export type SeoExperimentCheckpointState = 'scheduled' | 'due' | 'reviewed' | 'missed';

export interface SeoExperimentMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  windowStart: string;
  windowEnd: string;
}

export interface SeoExperimentCheckpoint {
  label: string;
  reviewWindowDays: number;
  scheduledReviewAt: string;
  state: SeoExperimentCheckpointState;
  reviewedAt: string | null;
  outcome: Exclude<SeoExperimentStatus, 'planned' | 'running' | 'archived'> | null;
  metricsAfter: SeoExperimentMetrics | null;
  notes: string | null;
}

export interface SeoExperimentTopicPod {
  keyword: string;
  sourceType: 'cluster_snapshot';
  sourceId: string;
  sourceLabel: string;
  primaryPage: string;
  moveType: string;
  hypothesis: string;
  canonicalDestination: {
    type: string;
    label: string;
    path: string;
    exists: boolean;
    reason: string;
  };
  companionAssets: Array<{
    type: string;
    label: string;
    path: string | null;
    status: string;
    reason: string;
  }>;
  internalLinkOpportunities: Array<{
    entityType: string;
    label: string;
    path: string;
    reason: string;
  }>;
}

export interface SeoExperimentRecord {
  id: string;
  sourceType: string;
  sourceId: string;
  proposalId: string | null;
  actionId: string | null;
  targetKeyword: string;
  targetUrl: string;
  hypothesis: string;
  variantType: string;
  status: SeoExperimentStatus;
  scheduledReviewAt: string;
  reviewWindowDays: number;
  notes: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metricsBefore: SeoExperimentMetrics | null;
  metricsAfter: SeoExperimentMetrics | null;
  checkpoints: SeoExperimentCheckpoint[];
  topicPod: SeoExperimentTopicPod | null;
}

export interface SeoExperimentListResult {
  data: SeoExperimentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    dueCount: number;
    counts: Record<SeoExperimentStatus | 'all', number>;
  };
}

interface StoredExperimentRow {
  id: string;
  sourceType: string;
  sourceId: string;
  proposalId: string | null;
  actionId: string | null;
  targetKeyword: string;
  targetUrl: string;
  hypothesis: string;
  variantType: string;
  topicPodJson: Prisma.JsonValue | null;
  checkpointsJson: Prisma.JsonValue;
  scheduledReviewAt: Date;
  reviewWindowDays: number;
  status: string;
  metricsBeforeJson: Prisma.JsonValue | null;
  metricsAfterJson: Prisma.JsonValue | null;
  notes: string | null;
  lastReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProposalExperimentInput {
  proposalId: string;
  sourceType: string;
  sourceId: string;
  targetKeyword: string;
  hypothesis: string;
  variantType: string;
  topicPodJson: Prisma.JsonValue | null;
  targetUrl: string;
  anchorDate: Date;
}

interface ActionExperimentInput {
  actionId: string;
  sourceType: string;
  sourceId: string;
  targetKeyword: string;
  hypothesis: string;
  variantType: string;
  targetUrl: string;
  anchorDate: Date;
}

function readJsonStringField(
  value: Prisma.JsonValue | null | undefined,
  field: string
): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = (value as Record<string, unknown>)[field];
  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate.trim()
    : null;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function trimToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = normalizeWhitespace(value);
  return trimmed.length > 0 ? trimmed : null;
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

function clampLimit(limit: number | undefined, fallback: number): number {
  if (!Number.isFinite(limit) || !limit || limit < 1) {
    return fallback;
  }

  return Math.max(1, Math.min(100, Math.trunc(limit)));
}

function getBlogUrl(slug: string): string {
  return `${PROJECT_HOST}/blog/${slug}`;
}

function deriveActionKeyword(action: {
  snapshot?: { query: string | null; page: string } | null;
  beforeJson: unknown;
}): string {
  const query = trimToNull(action.snapshot?.query);
  if (query) {
    return query;
  }

  if (!action.beforeJson || typeof action.beforeJson !== 'object') {
    return 'SEO experiment';
  }

  const pageUrl = trimToNull((action.beforeJson as { pageUrl?: string }).pageUrl);
  if (!pageUrl) {
    return 'SEO experiment';
  }

  try {
    const pathname = new URL(pageUrl).pathname;
    const slug = pathname.split('/').filter(Boolean).pop();
    return slug ? slug.replace(/-/g, ' ') : 'SEO experiment';
  } catch {
    return pageUrl;
  }
}

function parseMetrics(value: Prisma.JsonValue | null): SeoExperimentMetrics | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.windowStart !== 'string'
    || typeof candidate.windowEnd !== 'string'
  ) {
    return null;
  }

  return {
    clicks: Number(candidate.clicks ?? 0),
    impressions: Number(candidate.impressions ?? 0),
    ctr: Number(candidate.ctr ?? 0),
    avgPosition: Number(candidate.avgPosition ?? 0),
    windowStart: candidate.windowStart,
    windowEnd: candidate.windowEnd,
  };
}

function parseTopicPod(value: Prisma.JsonValue | null): SeoExperimentTopicPod | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as unknown as SeoExperimentTopicPod;
}

function parseCheckpointArray(value: Prisma.JsonValue): SeoExperimentCheckpoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => ({
      label: typeof entry.label === 'string' ? entry.label : 'D+14',
      reviewWindowDays: Number(entry.reviewWindowDays ?? 7),
      scheduledReviewAt: typeof entry.scheduledReviewAt === 'string' ? entry.scheduledReviewAt : new Date(0).toISOString(),
      state: entry.state === 'reviewed' || entry.state === 'due' || entry.state === 'missed' ? entry.state : 'scheduled',
      reviewedAt: typeof entry.reviewedAt === 'string' ? entry.reviewedAt : null,
      outcome: entry.outcome === 'won' || entry.outcome === 'flat' || entry.outcome === 'lost' ? entry.outcome : null,
      metricsAfter: parseMetrics((entry.metricsAfter ?? null) as Prisma.JsonValue | null),
      notes: typeof entry.notes === 'string' ? entry.notes : null,
    }));
}

function computeCheckpointState(checkpoint: SeoExperimentCheckpoint, now: Date): SeoExperimentCheckpointState {
  if (checkpoint.reviewedAt) {
    return 'reviewed';
  }

  const dueAt = new Date(checkpoint.scheduledReviewAt);
  if (now.getTime() >= dueAt.getTime() + (MISSED_CHECKPOINT_AFTER_DAYS * 24 * 60 * 60 * 1000)) {
    return 'missed';
  }

  return now >= dueAt ? 'due' : 'scheduled';
}

function serializeExperiment(row: StoredExperimentRow, now: Date = new Date()): SeoExperimentRecord {
  const checkpoints = parseCheckpointArray(row.checkpointsJson).map((checkpoint) => ({
    ...checkpoint,
    state: computeCheckpointState(checkpoint, now),
  }));

  return {
    id: row.id,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    proposalId: row.proposalId,
    actionId: row.actionId,
    targetKeyword: row.targetKeyword,
    targetUrl: row.targetUrl,
    hypothesis: row.hypothesis,
    variantType: row.variantType,
    status: row.status as SeoExperimentStatus,
    scheduledReviewAt: row.scheduledReviewAt.toISOString(),
    reviewWindowDays: row.reviewWindowDays,
    notes: row.notes,
    lastReviewedAt: row.lastReviewedAt ? row.lastReviewedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    metricsBefore: parseMetrics(row.metricsBeforeJson),
    metricsAfter: parseMetrics(row.metricsAfterJson),
    checkpoints,
    topicPod: parseTopicPod(row.topicPodJson),
  };
}

function buildCheckpointJson(anchorDate: Date): {
  checkpoints: SeoExperimentCheckpoint[];
  scheduledReviewAt: Date;
} {
  const anchorPtDate = getPtDateString(anchorDate);
  const checkpoints = CHECKPOINT_DAYS.map((days) => {
    const dueDate = shiftIsoDate(anchorPtDate, days);
    return {
      label: `D+${days}`,
      reviewWindowDays: 7,
      scheduledReviewAt: isoDateStringToUtcDate(dueDate).toISOString(),
      state: 'scheduled' as const,
      reviewedAt: null,
      outcome: null,
      metricsAfter: null,
      notes: null,
    };
  });

  return {
    checkpoints,
    scheduledReviewAt: new Date(checkpoints[0].scheduledReviewAt),
  };
}

async function aggregatePageMetrics(
  pageUrl: string,
  startDate: string,
  endDate: string
): Promise<SeoExperimentMetrics> {
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
      windowStart: startDate,
      windowEnd: endDate,
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
    windowStart: startDate,
    windowEnd: endDate,
  };
}

async function buildBaselineMetrics(targetUrl: string, anchorDate: Date): Promise<SeoExperimentMetrics> {
  const anchorPtDate = getPtDateString(anchorDate);
  return aggregatePageMetrics(
    targetUrl,
    shiftIsoDate(anchorPtDate, -7),
    shiftIsoDate(anchorPtDate, -1)
  );
}

function computeOutcome(before: SeoExperimentMetrics | null, after: SeoExperimentMetrics): 'won' | 'flat' | 'lost' {
  const beforeImpressions = before?.impressions ?? 0;
  const beforeCtr = before?.ctr ?? 0;
  const beforePosition = before?.avgPosition ?? 0;

  const impressionDelta = beforeImpressions === 0
    ? (after.impressions > 0 ? 1 : 0)
    : (after.impressions - beforeImpressions) / beforeImpressions;
  const ctrDelta = after.ctr - beforeCtr;
  const positionDelta = beforePosition > 0 && after.avgPosition > 0
    ? beforePosition - after.avgPosition
    : 0;

  if (
    after.impressions >= Math.max(12, beforeImpressions)
    && (impressionDelta >= 0.2 || ctrDelta >= 0.015 || positionDelta >= 1)
  ) {
    return 'won';
  }

  if (
    beforeImpressions > 0
    && impressionDelta <= -0.2
    && ctrDelta <= -0.01
  ) {
    return 'lost';
  }

  return 'flat';
}

function getNextPendingCheckpoint(checkpoints: SeoExperimentCheckpoint[]): SeoExperimentCheckpoint | null {
  return checkpoints.find((checkpoint) => checkpoint.reviewedAt === null) ?? null;
}

function deriveStatusFromCheckpoints(checkpoints: SeoExperimentCheckpoint[]): SeoExperimentStatus {
  const reviewed = checkpoints.filter((checkpoint) => checkpoint.reviewedAt !== null);
  const nextPending = getNextPendingCheckpoint(checkpoints);

  if (reviewed.length === 0) {
    return 'planned';
  }

  if (nextPending) {
    return 'running';
  }

  return reviewed[reviewed.length - 1]?.outcome ?? 'flat';
}

async function upsertProposalExperiment(input: ProposalExperimentInput): Promise<SeoExperimentRecord> {
  const baselineMetrics = await buildBaselineMetrics(input.targetUrl, input.anchorDate);
  const { checkpoints, scheduledReviewAt } = buildCheckpointJson(input.anchorDate);

  const row = await prisma.seoExperiment.upsert({
    where: {
      proposalId: input.proposalId,
    },
    update: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetKeyword: input.targetKeyword,
      targetUrl: input.targetUrl,
      hypothesis: input.hypothesis,
      variantType: input.variantType,
      topicPodJson: input.topicPodJson,
      checkpointsJson: checkpoints as Prisma.InputJsonValue,
      scheduledReviewAt,
      reviewWindowDays: 7,
      metricsBeforeJson: baselineMetrics as Prisma.InputJsonValue,
      status: 'planned',
    },
    create: {
      proposalId: input.proposalId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetKeyword: input.targetKeyword,
      targetUrl: input.targetUrl,
      hypothesis: input.hypothesis,
      variantType: input.variantType,
      topicPodJson: input.topicPodJson,
      checkpointsJson: checkpoints as Prisma.InputJsonValue,
      scheduledReviewAt,
      reviewWindowDays: 7,
      metricsBeforeJson: baselineMetrics as Prisma.InputJsonValue,
      status: 'planned',
    },
  });

  return serializeExperiment(row as StoredExperimentRow);
}

async function upsertActionExperiment(input: ActionExperimentInput): Promise<SeoExperimentRecord> {
  const baselineMetrics = await buildBaselineMetrics(input.targetUrl, input.anchorDate);
  const { checkpoints, scheduledReviewAt } = buildCheckpointJson(input.anchorDate);

  const row = await prisma.seoExperiment.upsert({
    where: {
      actionId: input.actionId,
    },
    update: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetKeyword: input.targetKeyword,
      targetUrl: input.targetUrl,
      hypothesis: input.hypothesis,
      variantType: input.variantType,
      checkpointsJson: checkpoints as Prisma.InputJsonValue,
      scheduledReviewAt,
      reviewWindowDays: 7,
      metricsBeforeJson: baselineMetrics as Prisma.InputJsonValue,
      status: 'planned',
    },
    create: {
      actionId: input.actionId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetKeyword: input.targetKeyword,
      targetUrl: input.targetUrl,
      hypothesis: input.hypothesis,
      variantType: input.variantType,
      checkpointsJson: checkpoints as Prisma.InputJsonValue,
      scheduledReviewAt,
      reviewWindowDays: 7,
      metricsBeforeJson: baselineMetrics as Prisma.InputJsonValue,
      status: 'planned',
    },
  });

  return serializeExperiment(row as StoredExperimentRow);
}

function getStatusWhere(status: SeoExperimentStatusFilter) {
  if (status === 'all') {
    return {};
  }

  return {
    status,
  };
}

export async function listSeoExperiments(options: {
  status?: SeoExperimentStatusFilter;
  page?: number;
  limit?: number;
  now?: Date;
}): Promise<SeoExperimentListResult> {
  const status = options.status ?? 'all';
  const page = Math.max(1, options.page ?? 1);
  const limit = clampLimit(options.limit, 25);
  const skip = (page - 1) * limit;
  const now = options.now ?? new Date();
  const where = getStatusWhere(status);

  const [rows, total, plannedCount, runningCount, wonCount, flatCount, lostCount, archivedCount, allRows] = await Promise.all([
    prisma.seoExperiment.findMany({
      where,
      orderBy: [
        { scheduledReviewAt: 'asc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    }),
    prisma.seoExperiment.count({ where }),
    prisma.seoExperiment.count({ where: { status: 'planned' } }),
    prisma.seoExperiment.count({ where: { status: 'running' } }),
    prisma.seoExperiment.count({ where: { status: 'won' } }),
    prisma.seoExperiment.count({ where: { status: 'flat' } }),
    prisma.seoExperiment.count({ where: { status: 'lost' } }),
    prisma.seoExperiment.count({ where: { status: 'archived' } }),
    prisma.seoExperiment.findMany({
      select: {
        id: true,
        checkpointsJson: true,
      },
    }),
  ]);

  const dueCount = allRows.reduce((count, row) => {
    const hasDueCheckpoint = parseCheckpointArray(row.checkpointsJson)
      .some((checkpoint) => computeCheckpointState(checkpoint, now) === 'due');
    return count + (hasDueCheckpoint ? 1 : 0);
  }, 0);

  return {
    data: rows.map((row) => serializeExperiment(row as StoredExperimentRow, now)),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    meta: {
      dueCount,
      counts: {
        all: plannedCount + runningCount + wonCount + flatCount + lostCount + archivedCount,
        planned: plannedCount,
        running: runningCount,
        won: wonCount,
        flat: flatCount,
        lost: lostCount,
        archived: archivedCount,
      },
    },
  };
}

export async function getSeoExperiment(experimentId: string, now: Date = new Date()): Promise<SeoExperimentRecord> {
  const row = await prisma.seoExperiment.findUnique({
    where: {
      id: experimentId,
    },
  });

  if (!row) {
    throw ApiError.notFound('SEO experiment not found');
  }

  return serializeExperiment(row as StoredExperimentRow, now);
}

export async function reviewSeoExperiment(experimentId: string, now: Date = new Date()): Promise<SeoExperimentRecord> {
  const row = await prisma.seoExperiment.findUnique({
    where: {
      id: experimentId,
    },
  });

  if (!row) {
    throw ApiError.notFound('SEO experiment not found');
  }

  const checkpoints = parseCheckpointArray(row.checkpointsJson);
  const nextCheckpoint = getNextPendingCheckpoint(checkpoints);
  if (!nextCheckpoint) {
    throw new ApiError(409, 'All checkpoints for this experiment have already been reviewed');
  }

  const duePtDate = getPtDateString(new Date(nextCheckpoint.scheduledReviewAt));
  const latestFinalizedPtDate = getLatestFinalizedPtDate(now);
  if (latestFinalizedPtDate < duePtDate) {
    throw new ApiError(409, `This experiment cannot be reviewed until PT data is finalized through ${duePtDate}`);
  }

  const afterMetrics = await aggregatePageMetrics(
    row.targetUrl,
    shiftIsoDate(duePtDate, -(nextCheckpoint.reviewWindowDays - 1)),
    duePtDate
  );
  const beforeMetrics = parseMetrics(row.metricsBeforeJson);
  const outcome = computeOutcome(beforeMetrics, afterMetrics);

  const updatedCheckpoints = checkpoints.map((checkpoint) => {
    if (checkpoint.label !== nextCheckpoint.label) {
      return checkpoint;
    }

    return {
      ...checkpoint,
      state: 'reviewed' as const,
      reviewedAt: now.toISOString(),
      outcome,
      metricsAfter: afterMetrics,
      notes: checkpoint.notes ?? null,
    };
  });

  const nextPending = getNextPendingCheckpoint(updatedCheckpoints);
  const nextStatus = deriveStatusFromCheckpoints(updatedCheckpoints);
  const updated = await prisma.seoExperiment.update({
    where: {
      id: experimentId,
    },
    data: {
      checkpointsJson: updatedCheckpoints as Prisma.InputJsonValue,
      scheduledReviewAt: nextPending ? new Date(nextPending.scheduledReviewAt) : row.scheduledReviewAt,
      reviewWindowDays: nextPending?.reviewWindowDays ?? row.reviewWindowDays,
      status: nextStatus,
      metricsAfterJson: afterMetrics as Prisma.InputJsonValue,
      lastReviewedAt: now,
    },
  });

  return serializeExperiment(updated as StoredExperimentRow, now);
}

export async function ensureExperimentForProposalLink(proposalId: string): Promise<SeoExperimentRecord> {
  const proposal = await prisma.seoProposal.findUnique({
    where: {
      id: proposalId,
    },
    include: {
      draftPost: {
        select: {
          slug: true,
          status: true,
          publishedAt: true,
          scheduledFor: true,
        },
      },
    },
  });

  if (!proposal) {
    throw ApiError.notFound('SEO proposal not found');
  }

  if (!proposal.draftPost) {
    throw new ApiError(409, 'A linked draft post is required before an experiment can be created');
  }

  const sourceId = (
    proposal.clusterSnapshotId
    ?? proposal.snapshotId
    ?? readJsonStringField(proposal.sourceRefJson as Prisma.JsonValue | null, 'opportunityId')
    ?? readJsonStringField(proposal.sourceRefJson as Prisma.JsonValue | null, 'auditId')
    ?? readJsonStringField(proposal.sourceRefJson as Prisma.JsonValue | null, 'sourceId')
  );
  if (!sourceId) {
    throw ApiError.internal('Proposal source is missing');
  }

  return upsertProposalExperiment({
    proposalId: proposal.id,
    sourceType: proposal.sourceType,
    sourceId,
    targetKeyword: proposal.targetKeyword,
    hypothesis: proposal.hypothesis ?? proposal.rationale,
    variantType: proposal.proposalType,
    topicPodJson: proposal.topicPodJson as Prisma.JsonValue | null,
    targetUrl: getBlogUrl(proposal.draftPost.slug),
    anchorDate: proposal.draftPost.publishedAt ?? proposal.draftPost.scheduledFor ?? proposal.actedAt ?? new Date(),
  });
}

export async function ensureExperimentForAction(actionId: string): Promise<SeoExperimentRecord> {
  const action = await prisma.seoAgentAction.findUnique({
    where: {
      id: actionId,
    },
    include: {
      snapshot: {
        select: {
          id: true,
          query: true,
          page: true,
        },
      },
    },
  });

  if (!action) {
    throw ApiError.notFound('SEO action not found');
  }

  if (!action.beforeJson || typeof action.beforeJson !== 'object') {
    throw ApiError.internal('SEO action audit payload is invalid');
  }

  const targetUrl = trimToNull((action.beforeJson as { pageUrl?: string }).pageUrl);
  if (!targetUrl) {
    throw ApiError.internal('SEO action audit payload is missing pageUrl');
  }

  return upsertActionExperiment({
    actionId: action.id,
    sourceType: action.snapshotId ? 'weekly_snapshot' : 'seo_action',
    sourceId: action.snapshotId ?? action.id,
    targetKeyword: deriveActionKeyword(action),
    hypothesis: action.rationale,
    variantType: action.actionType,
    targetUrl,
    anchorDate: action.shippedAt,
  });
}

export async function listDueExperiments(now: Date = new Date()): Promise<SeoExperimentRecord[]> {
  const rows = await prisma.seoExperiment.findMany({
    where: {
      status: {
        in: ['planned', 'running'],
      },
      scheduledReviewAt: {
        lte: now,
      },
    },
    orderBy: {
      scheduledReviewAt: 'asc',
    },
  });

  return rows
    .map((row) => serializeExperiment(row as StoredExperimentRow, now))
    .filter((row) => row.checkpoints.some((checkpoint) => checkpoint.state === 'due'));
}

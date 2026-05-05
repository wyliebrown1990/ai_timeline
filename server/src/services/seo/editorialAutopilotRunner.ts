import { getGscHealth } from '../gsc/gscIngest';
import { getSerperUsageSummary, type SerperUsageSummary } from './serperClient';
import {
  isEditorialPaused,
  getLatestEditorialRunStatus,
  setLatestEditorialRunStatus,
  type SeoEditorialRunStatusRecord,
} from './editorialRunStatus';
import {
  loadEditorialOpportunityBacklog,
  selectEditorialOpportunities,
  type DeferredEditorialOpportunity,
  type EditorialOpportunity,
} from './editorialOpportunitySelector';

const DIGEST_URL = 'https://letaiexplainai.com/admin/seo-insights';
const DEFAULT_MAX_POSTS = 3;
const DEFAULT_MAX_AUTO_PUBLISH = 2;

export interface SeoEditorialTuesdayRunOptions {
  dryRun?: boolean;
  force?: boolean;
  maxPosts?: number;
  maxAutoPublish?: number;
  sendTestEmail?: boolean;
  now?: Date;
}

export interface SeoEditorialTuesdayDecision {
  id: string;
  sourceType: 'proposal' | 'keyword';
  action: 'auto_publish' | 'draft_only' | 'skipped';
  status: 'planned' | 'skipped' | 'failed';
  title: string;
  reason: string;
}

export interface SeoEditorialTuesdayRunSummary {
  status: 'success' | 'failed' | 'skipped';
  startedAt: string;
  completedAt: string;
  weekStart: string | null;
  dryRun: boolean;
  paused: boolean;
  alreadyCompleted: boolean;
  selectedCount: number;
  publishedCount: number;
  draftCount: number;
  skippedCount: number;
  emailedCount: number;
  failedCount: number;
  digestUrl: string;
  errorMessage: string | null;
  serper: SerperUsageSummary | null;
  decisions: SeoEditorialTuesdayDecision[];
}

function toIso(value: Date): string {
  return value.toISOString();
}

function normalizeWeekStart(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function clampCap(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(max, Math.floor(value)));
}

function selectedDecision(opportunity: EditorialOpportunity): SeoEditorialTuesdayDecision {
  return {
    id: opportunity.id,
    sourceType: opportunity.sourceType,
    action: opportunity.action,
    status: 'planned',
    title: opportunity.title,
    reason: 'Selected for Tuesday editorial automation; drafting/publishing remains gated by the next implementation slice.',
  };
}

function deferredDecision(row: DeferredEditorialOpportunity): SeoEditorialTuesdayDecision {
  return {
    id: row.id,
    sourceType: row.sourceType,
    action: 'skipped',
    status: 'skipped',
    title: row.title,
    reason: row.reason,
  };
}

async function persistRunStatus(summary: SeoEditorialTuesdayRunSummary): Promise<void> {
  if (summary.dryRun || summary.status === 'skipped') {
    return;
  }

  const record: SeoEditorialRunStatusRecord = {
    status: summary.paused ? 'paused' : summary.status === 'failed' ? 'failed' : 'success',
    startedAt: summary.startedAt,
    completedAt: summary.completedAt,
    weekStart: summary.weekStart ? `${summary.weekStart}T00:00:00.000Z` : null,
    publishedCount: summary.publishedCount,
    draftCount: summary.draftCount,
    skippedCount: summary.skippedCount,
    emailStatus: 'not_attempted',
    digestUrl: summary.digestUrl,
    errorMessage: summary.errorMessage,
    items: summary.decisions.map((decision) => ({
      id: decision.id,
      sourceType: decision.sourceType,
      action: decision.action === 'draft_only'
        ? 'draft_for_review'
        : decision.action === 'auto_publish'
          ? 'auto_published'
          : 'skipped_by_gate',
      title: decision.title,
      publicUrl: null,
      adminUrl: null,
      reason: decision.reason,
    })),
  };

  await setLatestEditorialRunStatus(record);
}

export async function runSeoEditorialTuesday(
  options: SeoEditorialTuesdayRunOptions = {},
): Promise<SeoEditorialTuesdayRunSummary> {
  const now = options.now ?? new Date();
  const startedAt = toIso(now);
  const dryRun = options.dryRun ?? false;
  let weekStart: string | null = null;
  let paused = false;
  let serper: SerperUsageSummary | null = null;

  try {
    const [health, pausedState, latestRun, serperSummary] = await Promise.all([
      getGscHealth(now),
      isEditorialPaused(),
      getLatestEditorialRunStatus(),
      getSerperUsageSummary(now),
    ]);
    weekStart = normalizeWeekStart(health.lastWeekCovered);
    paused = pausedState;
    serper = serperSummary;

    if (!weekStart) {
      throw new Error('Missing finalized GSC week; Tuesday editorial run cannot select opportunities.');
    }

    if (
      !dryRun &&
      !options.force &&
      latestRun?.status === 'success' &&
      normalizeWeekStart(latestRun.weekStart) === weekStart
    ) {
      return {
        status: 'skipped',
        startedAt,
        completedAt: toIso(options.now ?? new Date()),
        weekStart,
        dryRun,
        paused,
        alreadyCompleted: true,
        selectedCount: 0,
        publishedCount: 0,
        draftCount: 0,
        skippedCount: 0,
        emailedCount: 0,
        failedCount: 0,
        digestUrl: DIGEST_URL,
        errorMessage: null,
        serper,
        decisions: [],
      };
    }

    const maxPosts = clampCap(options.maxPosts, DEFAULT_MAX_POSTS, DEFAULT_MAX_POSTS);
    const maxAutoPublish = clampCap(options.maxAutoPublish, DEFAULT_MAX_AUTO_PUBLISH, DEFAULT_MAX_AUTO_PUBLISH);
    const backlog = await loadEditorialOpportunityBacklog();
    const selection = selectEditorialOpportunities({
      ...backlog,
      maxPosts: paused ? 0 : maxPosts,
      maxAutoPublish,
    });
    const selected = selection.selected.map(selectedDecision);
    const deferred = selection.deferred.map(deferredDecision);
    const pausedDecision: SeoEditorialTuesdayDecision[] = paused
      ? [{
          id: 'seo-editorial-paused',
          sourceType: 'proposal',
          action: 'skipped',
          status: 'skipped',
          title: 'Tuesday editorial autopilot paused',
          reason: 'Pause switch is enabled; no drafts, posts, proposal mutations, or emails were created.',
        }]
      : [];

    const summary: SeoEditorialTuesdayRunSummary = {
      status: 'success',
      startedAt,
      completedAt: toIso(options.now ?? new Date()),
      weekStart,
      dryRun,
      paused,
      alreadyCompleted: false,
      selectedCount: selection.selected.length,
      publishedCount: 0,
      draftCount: 0,
      skippedCount: deferred.length + pausedDecision.length,
      emailedCount: 0,
      failedCount: 0,
      digestUrl: DIGEST_URL,
      errorMessage: null,
      serper,
      decisions: [
        ...selected,
        ...deferred,
        ...pausedDecision,
      ],
    };

    await persistRunStatus(summary);
    return summary;
  } catch (error) {
    const summary: SeoEditorialTuesdayRunSummary = {
      status: 'failed',
      startedAt,
      completedAt: toIso(options.now ?? new Date()),
      weekStart,
      dryRun,
      paused,
      alreadyCompleted: false,
      selectedCount: 0,
      publishedCount: 0,
      draftCount: 0,
      skippedCount: 0,
      emailedCount: 0,
      failedCount: 1,
      digestUrl: DIGEST_URL,
      errorMessage: getErrorMessage(error),
      serper,
      decisions: [],
    };
    await persistRunStatus(summary);
    throw error;
  }
}

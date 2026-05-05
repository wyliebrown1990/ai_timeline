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
import { sendEditorialRecapEmail } from './editorialEmail';
import {
  processEditorialOpportunity,
  type ProcessEditorialOpportunityResult,
} from './editorialBlogDraft';

const DIGEST_URL = 'https://letaiexplainai.com/admin/seo-insights';
const DEFAULT_MAX_POSTS = 3;
const DEFAULT_MAX_AUTO_PUBLISH = 2;
const MAX_PERSISTED_SKIPPED_ITEMS = 5;
const MAX_PERSISTED_TITLE_LENGTH = 140;
const MAX_PERSISTED_REASON_LENGTH = 220;

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
  status: 'planned' | 'draft_created' | 'auto_published' | 'skipped' | 'failed';
  title: string;
  reason: string;
  postId?: string | null;
  publicUrl?: string | null;
  adminUrl?: string | null;
}

export interface SeoEditorialTuesdayRunSummary {
  status: 'success' | 'warning' | 'failed' | 'skipped';
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

function processedDecision(result: ProcessEditorialOpportunityResult): SeoEditorialTuesdayDecision {
  return {
    id: result.id,
    sourceType: result.sourceType,
    action: result.status === 'skipped_by_gate' ? 'skipped' : result.action,
    status: result.status === 'skipped_by_gate' ? 'skipped' : result.status,
    title: result.title,
    reason: result.reason,
    postId: result.postId,
    publicUrl: result.publicUrl,
    adminUrl: result.adminUrl,
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

function truncateForStatus(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function toPersistedItem(decision: SeoEditorialTuesdayDecision): SeoEditorialRunStatusRecord['items'][number] {
  return {
    id: decision.id,
    sourceType: decision.sourceType,
    action: decision.action === 'draft_only'
      ? 'draft_for_review'
      : decision.action === 'auto_publish'
        ? 'auto_published'
        : 'skipped_by_gate',
    title: truncateForStatus(decision.title, MAX_PERSISTED_TITLE_LENGTH),
    publicUrl: decision.publicUrl ?? null,
    adminUrl: decision.adminUrl ?? null,
    reason: truncateForStatus(decision.reason, MAX_PERSISTED_REASON_LENGTH),
  };
}

function buildPersistedItems(
  decisions: SeoEditorialTuesdayDecision[],
): SeoEditorialRunStatusRecord['items'] {
  const actioned = decisions
    .filter((decision) => decision.status !== 'skipped')
    .map(toPersistedItem);
  const skipped = decisions
    .filter((decision) => decision.status === 'skipped')
    .slice(0, MAX_PERSISTED_SKIPPED_ITEMS)
    .map(toPersistedItem);

  return [...actioned, ...skipped];
}

async function processSelectedSequentially(input: {
  opportunities: EditorialOpportunity[];
  weekStart: string;
  force: boolean;
}): Promise<SeoEditorialTuesdayDecision[]> {
  const decisions: SeoEditorialTuesdayDecision[] = [];

  for (const opportunity of input.opportunities) {
    const result = await processEditorialOpportunity(opportunity, {
      weekStart: input.weekStart,
      force: input.force,
    });
    decisions.push(processedDecision(result));
  }

  return decisions;
}

async function persistRunStatus(summary: SeoEditorialTuesdayRunSummary): Promise<void> {
  if (summary.dryRun || summary.status === 'skipped') {
    return;
  }

  const record: SeoEditorialRunStatusRecord = {
    status: summary.paused ? 'paused' : summary.status === 'failed' ? 'failed' : summary.status === 'warning' ? 'warning' : 'success',
    startedAt: summary.startedAt,
    completedAt: summary.completedAt,
    weekStart: summary.weekStart ? `${summary.weekStart}T00:00:00.000Z` : null,
    publishedCount: summary.publishedCount,
    draftCount: summary.draftCount,
    skippedCount: summary.skippedCount,
    emailStatus: summary.emailedCount > 0 ? 'sent' : summary.errorMessage ? 'failed' : 'not_attempted',
    digestUrl: summary.digestUrl,
    errorMessage: summary.errorMessage,
    items: buildPersistedItems(summary.decisions),
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
    const processed = dryRun || paused
      ? selection.selected.map(selectedDecision)
      : await processSelectedSequentially({
          opportunities: selection.selected,
          weekStart,
          force: options.force ?? false,
        });
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
      publishedCount: processed.filter((decision) => decision.status === 'auto_published').length,
      draftCount: processed.filter((decision) => decision.status === 'draft_created').length,
      skippedCount: deferred.length + pausedDecision.length + processed.filter((decision) => decision.status === 'skipped').length,
      emailedCount: 0,
      failedCount: processed.filter((decision) => decision.status === 'failed').length,
      digestUrl: DIGEST_URL,
      errorMessage: processed.some((decision) => decision.status === 'failed')
        ? 'One or more Tuesday editorial opportunities failed.'
        : null,
      serper,
      decisions: [
        ...processed,
        ...deferred,
        ...pausedDecision,
      ],
    };

    if (summary.failedCount > 0) {
      summary.status = summary.publishedCount > 0 || summary.draftCount > 0 ? 'warning' : 'failed';
    }

    if (!dryRun || options.sendTestEmail) {
      const emailResult = await sendEditorialRecapEmail(summary);
      summary.emailedCount = emailResult.sent ? 1 : 0;
      if (!emailResult.sent) {
        summary.errorMessage = emailResult.errorMessage;
        if (!dryRun) {
          summary.status = 'warning';
        }
      }
    }

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

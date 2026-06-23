import {
  getLatestFinalizedPtDate,
  getMostRecentFinalizedWindow,
} from './gscClient';
import type { GscIngestSummary } from './gscIngest';
import { runWeeklyIngest } from './gscIngest';
import {
  classifyGscRunFailure,
  setLatestGscRunStatus,
  type GscRunStatusRecord,
} from './gscRunStatus';

function toIso(value: Date): string {
  return value.toISOString();
}

async function persistRunStatusSafely(status: GscRunStatusRecord): Promise<void> {
  try {
    await setLatestGscRunStatus(status);
  } catch (error) {
    console.error('[GSC_MONITOR] Failed to persist GSC run status:', error);
  }
}

function buildSuccessStatus(summary: GscIngestSummary, startedAt: string, completedAt: string): GscRunStatusRecord {
  return {
    status: 'success',
    startedAt,
    completedAt,
    startDate: summary.startDate,
    endDate: summary.endDate,
    finalizedThroughDate: summary.finalizedThroughDate,
    dailyRowsInserted: summary.dailyRowsInserted,
    dailyRowsAttempted: summary.dailyRowsAttempted,
    snapshotsCreated: summary.snapshotsCreated,
    durationMs: summary.durationMs,
    errorMessage: null,
    errorCategory: null,
    requiresOperatorAction: false,
    remediation: null,
  };
}

function buildFailureStatus(error: unknown, now: Date, startedAt: string, completedAt: string): GscRunStatusRecord {
  const { startDate, endDate } = getMostRecentFinalizedWindow(now, 7);
  const failure = classifyGscRunFailure(error);

  return {
    status: 'failed',
    startedAt,
    completedAt,
    startDate,
    endDate,
    finalizedThroughDate: getLatestFinalizedPtDate(now),
    dailyRowsInserted: 0,
    dailyRowsAttempted: 0,
    snapshotsCreated: 0,
    durationMs: Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime()),
    errorMessage: failure.errorMessage,
    errorCategory: failure.errorCategory,
    requiresOperatorAction: failure.requiresOperatorAction,
    remediation: failure.remediation,
  };
}

export async function runTrackedWeeklyIngest(now: Date = new Date()): Promise<GscIngestSummary> {
  const startedAt = toIso(now);

  try {
    const summary = await runWeeklyIngest(now);
    const completedAt = toIso(new Date());
    await persistRunStatusSafely(buildSuccessStatus(summary, startedAt, completedAt));
    return summary;
  } catch (error) {
    const completedAt = toIso(new Date());
    const failureStatus = buildFailureStatus(error, now, startedAt, completedAt);
    await persistRunStatusSafely(failureStatus);

    console.error(
      `[GSC_MONITOR] Weekly ingest failure category=${failureStatus.errorCategory ?? 'unknown'} requiresAction=${failureStatus.requiresOperatorAction} message=${failureStatus.errorMessage ?? 'Unknown error'}`,
    );
    if (failureStatus.requiresOperatorAction) {
      console.error(
        `[GSC_MONITOR] Weekly ingest requires operator action category=${failureStatus.errorCategory ?? 'unknown'}`,
      );
    }

    throw error;
  }
}

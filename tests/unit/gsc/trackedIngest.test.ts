import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRunWeeklyIngest = jest.fn();
const mockGetMostRecentFinalizedWindow = jest.fn();
const mockGetLatestFinalizedPtDate = jest.fn();
const mockSetLatestGscRunStatus = jest.fn();

jest.mock('../../../server/src/services/gsc/gscIngest', () => ({
  runWeeklyIngest: mockRunWeeklyIngest,
}));

jest.mock('../../../server/src/services/gsc/gscClient', () => ({
  getMostRecentFinalizedWindow: mockGetMostRecentFinalizedWindow,
  getLatestFinalizedPtDate: mockGetLatestFinalizedPtDate,
}));

jest.mock('../../../server/src/services/gsc/gscRunStatus', () => {
  const actual = jest.requireActual('../../../server/src/services/gsc/gscRunStatus');
  return {
    ...actual,
    setLatestGscRunStatus: mockSetLatestGscRunStatus,
  };
});

import { runTrackedWeeklyIngest } from '../../../server/src/services/gsc/trackedIngest';

describe('trackedIngest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetLatestGscRunStatus.mockResolvedValue({});
    mockGetMostRecentFinalizedWindow.mockReturnValue({
      startDate: '2026-05-30',
      endDate: '2026-06-05',
    });
    mockGetLatestFinalizedPtDate.mockReturnValue('2026-06-05');
  });

  it('persists a success status after a healthy weekly ingest', async () => {
    mockRunWeeklyIngest.mockResolvedValue({
      mode: 'weekly',
      startDate: '2026-05-30',
      endDate: '2026-06-05',
      finalizedThroughDate: '2026-06-05',
      dailyRowsInserted: 22,
      dailyRowsAttempted: 25,
      snapshotsCreated: 8,
      weekStartsRebuilt: ['2026-05-30'],
      clusterWindowsRebuilt: [],
      durationMs: 1234,
    });

    await runTrackedWeeklyIngest(new Date('2026-06-08T06:00:00.000Z'));

    expect(mockSetLatestGscRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      startDate: '2026-05-30',
      dailyRowsInserted: 22,
      errorMessage: null,
    }));
  });

  it('persists a failed auth status before rethrowing the ingest error', async () => {
    mockRunWeeklyIngest.mockRejectedValue(new Error('invalid_grant'));

    await expect(runTrackedWeeklyIngest(new Date('2026-06-08T06:00:00.000Z'))).rejects.toThrow('invalid_grant');

    expect(mockSetLatestGscRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      startDate: '2026-05-30',
      finalizedThroughDate: '2026-06-05',
      errorCategory: 'auth',
      requiresOperatorAction: true,
      errorMessage: 'invalid_grant',
    }));
  });
});

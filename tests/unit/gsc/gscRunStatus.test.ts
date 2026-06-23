import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  GetParameterCommand: jest.fn().mockImplementation((input: unknown) => input),
  PutParameterCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

import {
  classifyGscRunFailure,
  getLatestGscRunStatus,
  resetGscRunStatusCacheForTests,
  setLatestGscRunStatus,
} from '../../../server/src/services/gsc/gscRunStatus';

describe('gscRunStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGscRunStatusCacheForTests();
  });

  it('returns null when the status parameter has not been created yet', async () => {
    mockSend.mockRejectedValue({
      name: 'ParameterNotFound',
    });

    await expect(getLatestGscRunStatus()).resolves.toBeNull();
  });

  it('writes and caches a parsed GSC run status', async () => {
    mockSend.mockResolvedValue({});

    const payload = {
      status: 'failed' as const,
      startedAt: '2026-06-08T06:00:00.000Z',
      completedAt: '2026-06-08T06:00:44.289Z',
      startDate: '2026-05-30',
      endDate: '2026-06-05',
      finalizedThroughDate: '2026-06-05',
      dailyRowsInserted: 0,
      dailyRowsAttempted: 0,
      snapshotsCreated: 0,
      durationMs: 44289,
      errorMessage: 'invalid_grant',
      errorCategory: 'auth' as const,
      requiresOperatorAction: true,
      remediation: {
        summary: 'Re-run OAuth.',
        command: 'npm run gsc:oauth-rotate',
        docsPath: '.claude/schedules/seo-weekly.md',
      },
    };

    await expect(setLatestGscRunStatus(payload, 1_000)).resolves.toEqual(payload);
    await expect(getLatestGscRunStatus(20_000)).resolves.toEqual(payload);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({
      Name: '/ai-timeline/prod/gsc-last-run',
      Type: 'String',
      Overwrite: true,
      Value: JSON.stringify(payload),
    });
  });

  it('classifies invalid_grant failures as auth issues with a rotation command', () => {
    const result = classifyGscRunFailure(new Error('invalid_grant'));

    expect(result).toEqual(expect.objectContaining({
      errorCategory: 'auth',
      requiresOperatorAction: true,
      remediation: expect.objectContaining({
        command: expect.stringContaining('gsc:oauth-rotate'),
      }),
    }));
  });
});

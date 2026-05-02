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
  getLatestAgentRunStatus,
  resetAgentRunStatusCacheForTests,
  setLatestAgentRunStatus,
} from '../../../server/src/services/seo/agentRunStatus';

describe('agentRunStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAgentRunStatusCacheForTests();
  });

  it('returns null when the status parameter has not been created yet', async () => {
    mockSend.mockRejectedValue({
      name: 'ParameterNotFound',
    });

    await expect(getLatestAgentRunStatus()).resolves.toBeNull();
  });

  it('caches the parsed run status for sixty seconds', async () => {
    mockSend.mockResolvedValue({
      Parameter: {
        Value: JSON.stringify({
          status: 'success',
          startedAt: '2026-05-05T13:00:00.000Z',
          completedAt: '2026-05-05T13:03:00.000Z',
          weekStart: '2026-04-28T00:00:00.000Z',
          shippedCount: 2,
          proposalCount: 1,
          humanOnlyCount: 0,
          measuredCount: 1,
          digestUrl: null,
          errorMessage: null,
          serperSnapshot: {
            capturedAt: '2026-05-05T13:03:00.000Z',
            configured: true,
            enabled: true,
            autoTopupEnabled: false,
            creditsUsedWeek: 4,
            creditsUsedMonth: 4,
            effectiveSpendWeekUsd: 0.004,
            effectiveSpendMonthUsd: 0.004,
            remainingCredits: 2_496,
            remainingCreditsSource: 'vendor_observed_adjusted',
            remainingCreditsObservedAt: '2026-05-05T12:50:00.000Z',
            projectedDepletionDate: '2038-04-16T03:55:00.000Z',
            lastSampledAt: '2026-05-05T12:59:00.000Z',
            warningLevel: 'ok',
          },
        }),
      },
    });

    await expect(getLatestAgentRunStatus(1_000)).resolves.toEqual(expect.objectContaining({
      status: 'success',
      shippedCount: 2,
    }));
    await expect(getLatestAgentRunStatus(30_000)).resolves.toEqual(expect.objectContaining({
      proposalCount: 1,
    }));

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('treats pre-snapshot run records as valid and fills serperSnapshot with null', async () => {
    mockSend.mockResolvedValue({
      Parameter: {
        Value: JSON.stringify({
          status: 'success',
          startedAt: '2026-05-05T13:00:00.000Z',
          completedAt: '2026-05-05T13:03:00.000Z',
          weekStart: '2026-04-28T00:00:00.000Z',
          shippedCount: 2,
          proposalCount: 1,
          humanOnlyCount: 0,
          measuredCount: 1,
          digestUrl: null,
          errorMessage: null,
        }),
      },
    });

    await expect(getLatestAgentRunStatus()).resolves.toEqual(expect.objectContaining({
      status: 'success',
      serperSnapshot: null,
    }));
  });

  it('writes run status JSON back to SSM and refreshes the cache', async () => {
    mockSend.mockResolvedValue({});

    const payload = {
      status: 'failed' as const,
      startedAt: '2026-05-05T13:00:00.000Z',
      completedAt: '2026-05-05T13:04:00.000Z',
      weekStart: null,
      shippedCount: 0,
      proposalCount: 0,
      humanOnlyCount: 0,
      measuredCount: 0,
      digestUrl: null,
      errorMessage: 'Digest persistence failed',
      serperSnapshot: null,
    };

    await expect(setLatestAgentRunStatus(payload, 1_000)).resolves.toEqual(payload);
    await expect(getLatestAgentRunStatus(20_000)).resolves.toEqual(payload);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({
      Name: '/ai-timeline/prod/seo-agent-last-run',
      Type: 'String',
      Overwrite: true,
      Value: JSON.stringify(payload),
    });
  });
});

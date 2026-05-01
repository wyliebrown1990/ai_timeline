import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSend = jest.fn();
const mockSerpSampleAggregate = jest.fn();
const mockSerpSampleFindFirst = jest.fn();

jest.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  GetParameterCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

jest.mock('../../../server/src/db', () => ({
  prisma: {
    serpSample: {
      aggregate: mockSerpSampleAggregate,
      findFirst: mockSerpSampleFindFirst,
    },
  },
}));

import {
  getSerperUsageSummary,
  resetSerperClientCacheForTests,
} from '../../../server/src/services/seo/serperClient';

describe('serperClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSerperClientCacheForTests();

    mockSerpSampleAggregate.mockResolvedValue({
      _sum: {
        creditsUsed: 0,
        effectiveCostUsd: 0,
      },
    });
    mockSerpSampleFindFirst.mockResolvedValue(null);
  });

  it('reports unconfigured state without inventing remaining credits', async () => {
    mockSend.mockImplementation(async (command: { Name: string }) => {
      if (command.Name?.includes('serper-api-key')) {
        throw { name: 'ParameterNotFound' };
      }

      return {
        Parameter: {
          Value: JSON.stringify({
            enabled: true,
            tierLabel: 'starter',
            purchasedCredits: 50_000,
            monthlyCreditBudget: 2_500,
            usdPerThousandQueries: 1,
            maxQueriesPerRun: 3,
            maxQueriesPerDay: 10,
            maxQueriesPerWeek: 25,
            cacheTtlDays: 28,
            country: 'us',
            language: 'en',
            dateRange: 'qdr:m',
            page: 1,
            autoTopupEnabled: false,
          }),
        },
      };
    });

    const summary = await getSerperUsageSummary(new Date('2026-05-01T12:00:00.000Z'));

    expect(summary).toEqual(expect.objectContaining({
      configured: false,
      enabled: false,
      tierLabel: null,
      purchasedCredits: null,
      monthlyCreditBudget: null,
      remainingCredits: null,
      warningLevel: 'ok',
    }));
  });

  it('elevates Serper warning level when projected depletion is under thirty days', async () => {
    mockSend.mockImplementation(async (command: { Name: string }) => {
      if (command.Name?.includes('serper-api-key')) {
        return {
          Parameter: {
            Value: 'test-serper-key',
          },
        };
      }

      return {
        Parameter: {
          Value: JSON.stringify({
            enabled: true,
            tierLabel: 'starter',
            purchasedCredits: 50_000,
            monthlyCreditBudget: 2_500,
            usdPerThousandQueries: 1,
            maxQueriesPerRun: 3,
            maxQueriesPerDay: 10,
            maxQueriesPerWeek: 25,
            cacheTtlDays: 28,
            country: 'us',
            language: 'en',
            dateRange: 'qdr:m',
            page: 1,
            autoTopupEnabled: false,
          }),
        },
      };
    });

    mockSerpSampleAggregate
      .mockResolvedValueOnce({
        _sum: {
          creditsUsed: 1,
          effectiveCostUsd: 0.001,
        },
      })
      .mockResolvedValueOnce({
        _sum: {
          creditsUsed: 7_000,
          effectiveCostUsd: 7,
        },
      })
      .mockResolvedValueOnce({
        _sum: {
          creditsUsed: 28_000,
          effectiveCostUsd: 28,
        },
      })
      .mockResolvedValueOnce({
        _sum: {
          creditsUsed: 28_000,
          effectiveCostUsd: 28,
        },
      });
    mockSerpSampleFindFirst.mockResolvedValue({
      sampledAt: new Date('2026-05-01T20:53:00.000Z'),
    });

    const summary = await getSerperUsageSummary(new Date('2026-05-01T21:00:00.000Z'));

    expect(summary.remainingCredits).toBe(22_000);
    expect(summary.projectedDepletionDate).not.toBeNull();
    expect(summary.warningLevel).toBe('warning');
  });
});

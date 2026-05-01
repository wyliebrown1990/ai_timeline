import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSend = jest.fn();
const mockQuery = jest.fn();
const mockSetCredentials = jest.fn();
const mockOAuth2 = jest.fn().mockImplementation(() => ({
  setCredentials: mockSetCredentials,
}));

jest.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  GetParameterCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: mockOAuth2,
    },
    searchconsole: jest.fn().mockImplementation(() => ({
      searchanalytics: {
        query: mockQuery,
      },
    })),
  },
  searchconsole_v1: {},
}));

import {
  getCurrentPtDateString,
  getLatestFinalizedPtDate,
  getMostRecentFinalizedWindow,
  queryAllRows,
  resetGscClientCacheForTests,
} from '../../server/src/services/gsc/gscClient';

describe('gscClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGscClientCacheForTests();

    mockSend.mockImplementation(async (command: { Name: string }) => {
      if (command.Name?.includes('oauth-credentials')) {
        return {
          Parameter: {
            Value: JSON.stringify({
              clientId: 'client-id',
              clientSecret: 'client-secret',
              refreshToken: 'refresh-token',
            }),
          },
        };
      }

      return {
        Parameter: {
          Value: 'sc-domain:letaiexplainai.com',
        },
      };
    });
  });

  it('computes the PT reporting day from a UTC timestamp', () => {
    expect(getCurrentPtDateString(new Date('2026-05-04T06:00:00.000Z'))).toBe('2026-05-03');
  });

  it('applies a three-day lag to the latest finalized PT date', () => {
    expect(getLatestFinalizedPtDate(new Date('2026-05-04T06:00:00.000Z'))).toBe('2026-04-30');
  });

  it('builds the most recent seven-day finalized window', () => {
    expect(getMostRecentFinalizedWindow(new Date('2026-05-04T06:00:00.000Z'))).toEqual({
      startDate: '2026-04-24',
      endDate: '2026-04-30',
    });
  });

  it('paginates through all GSC rows in 25k chunks', async () => {
    const firstPage = Array.from({ length: 25_000 }, (_, index) => ({
      keys: [`query-${index}`],
      clicks: 1,
      impressions: 10,
      ctr: 0.1,
      position: 3,
    }));
    const secondPage = [
      {
        keys: ['query-last'],
        clicks: 2,
        impressions: 20,
        ctr: 0.1,
        position: 4,
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ data: { rows: firstPage } })
      .mockResolvedValueOnce({ data: { rows: secondPage } });

    const rows = await queryAllRows({
      startDate: '2026-04-24',
      endDate: '2026-04-30',
      dimensions: ['query'],
    });

    expect(rows).toHaveLength(25_001);
    expect(mockOAuth2).toHaveBeenCalledWith('client-id', 'client-secret');
    expect(mockSetCredentials).toHaveBeenCalledWith({ refresh_token: 'refresh-token' });
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[0][0].requestBody.rowLimit).toBe(25_000);
    expect(mockQuery.mock.calls[0][0].requestBody.startRow).toBe(0);
    expect(mockQuery.mock.calls[1][0].requestBody.startRow).toBe(25_000);
  });
});

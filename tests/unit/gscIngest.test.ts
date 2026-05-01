import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockQueryAllRows = jest.fn();
const mockGetMostRecentFinalizedWindow = jest.fn();
const mockGetLatestFinalizedPtDate = jest.fn();
const mockClassifyAllBuckets = jest.fn();
const mockCreateManyDaily = jest.fn();
const mockFindManyDaily = jest.fn();
const mockFindFirstDaily = jest.fn();
const mockCountDaily = jest.fn();
const mockDeleteManyWeekly = jest.fn();
const mockCreateManyWeekly = jest.fn();
const mockFindFirstWeekly = jest.fn();

function isoDateStringToUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function shiftIsoDate(isoDate: string, offsetDays: number): string {
  const shifted = isoDateStringToUtcDate(isoDate);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return shifted.toISOString().slice(0, 10);
}

function diffIsoDatesInDays(laterIsoDate: string, earlierIsoDate: string): number {
  const diffMs = isoDateStringToUtcDate(laterIsoDate).getTime() - isoDateStringToUtcDate(earlierIsoDate).getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

jest.mock('../../server/src/services/gsc/gscClient', () => ({
  queryAllRows: mockQueryAllRows,
  getMostRecentFinalizedWindow: mockGetMostRecentFinalizedWindow,
  getLatestFinalizedPtDate: mockGetLatestFinalizedPtDate,
  isoDateStringToUtcDate,
  shiftIsoDate,
  diffIsoDatesInDays,
}));

jest.mock('../../server/src/services/gsc/bucketClassifier', () => ({
  classifyAllBuckets: mockClassifyAllBuckets,
}));

jest.mock('../../server/src/db', () => ({
  prisma: {
    gscDailyMetric: {
      createMany: mockCreateManyDaily,
      findMany: mockFindManyDaily,
      findFirst: mockFindFirstDaily,
      count: mockCountDaily,
    },
    gscWeeklySnapshot: {
      deleteMany: mockDeleteManyWeekly,
      createMany: mockCreateManyWeekly,
      findFirst: mockFindFirstWeekly,
    },
  },
}));

import {
  buildWeeklySnapshotRows,
  collectAlignedWeekStarts,
  getAlignedWeekStartIso,
  mapPageAggregateRows,
  mapQueryDetailRows,
  runWeeklyIngest,
} from '../../server/src/services/gsc/gscIngest';

describe('gscIngest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMostRecentFinalizedWindow.mockReturnValue({
      startDate: '2026-04-24',
      endDate: '2026-04-30',
    });
    mockGetLatestFinalizedPtDate.mockReturnValue('2026-04-30');
    mockClassifyAllBuckets.mockResolvedValue({
      winnable_loss: 1,
      content_gap: 0,
      trend_signal: 0,
      decay: 0,
    });
    mockCreateManyDaily.mockResolvedValue({ count: 2 });
    mockFindManyDaily.mockResolvedValue([
      {
        dataSource: 'query_detail',
        query: 'turing award multiple winners quiz',
        queryKey: 'turing award multiple winners quiz',
        page: 'https://letaiexplainai.com/blog/turing-award-quiz',
        clicks: 7,
        impressions: 70,
        position: 3,
      },
      {
        dataSource: 'page_aggregate',
        query: null,
        queryKey: '__PAGE_AGGREGATE__',
        page: 'https://letaiexplainai.com/blog/turing-award-quiz',
        clicks: 10,
        impressions: 100,
        position: 4,
      },
    ]);
    mockDeleteManyWeekly.mockResolvedValue({ count: 1 });
    mockCreateManyWeekly.mockResolvedValue({ count: 2 });
    mockFindFirstDaily.mockResolvedValue(null);
    mockFindFirstWeekly.mockResolvedValue(null);
    mockCountDaily.mockResolvedValue(0);
  });

  it('aligns dates into seven-day finalized windows anchored to the latest finalized date', () => {
    expect(getAlignedWeekStartIso('2026-04-30', '2026-04-30')).toBe('2026-04-24');
    expect(getAlignedWeekStartIso('2026-04-23', '2026-04-30')).toBe('2026-04-17');
    expect(collectAlignedWeekStarts('2026-04-17', '2026-04-30', '2026-04-30')).toEqual([
      '2026-04-17',
      '2026-04-24',
    ]);
  });

  it('maps query-detail rows into daily metric records', () => {
    const rows = mapQueryDetailRows([
      {
        keys: ['2026-04-30', 'turing award multiple winners quiz', 'https://letaiexplainai.com/blog/turing-award-quiz', 'DESKTOP', 'USA'],
        clicks: 4,
        impressions: 40,
        ctr: 0.1,
        position: 2.5,
      },
    ]);

    expect(rows[0]).toMatchObject({
      dataSource: 'query_detail',
      query: 'turing award multiple winners quiz',
      queryKey: 'turing award multiple winners quiz',
      page: 'https://letaiexplainai.com/blog/turing-award-quiz',
      device: 'DESKTOP',
      country: 'USA',
      clicks: 4,
      impressions: 40,
      ctr: 0.1,
      position: 2.5,
    });
  });

  it('maps page-aggregate rows without inventing query-null detail rows', () => {
    const rows = mapPageAggregateRows([
      {
        keys: ['2026-04-30', 'https://letaiexplainai.com/blog/turing-award-quiz', 'MOBILE', 'USA'],
        clicks: 6,
        impressions: 60,
        ctr: 0.1,
        position: 4.5,
      },
    ]);

    expect(rows[0]).toMatchObject({
      dataSource: 'page_aggregate',
      query: null,
      queryKey: '__PAGE_AGGREGATE__',
      page: 'https://letaiexplainai.com/blog/turing-award-quiz',
      device: 'MOBILE',
      country: 'USA',
    });
  });

  it('aggregates daily metrics into weighted weekly snapshots', () => {
    const snapshots = buildWeeklySnapshotRows([
      {
        dataSource: 'query_detail',
        query: 'turing award multiple winners quiz',
        queryKey: 'turing award multiple winners quiz',
        page: 'https://letaiexplainai.com/blog/turing-award-quiz',
        clicks: 3,
        impressions: 30,
        position: 2,
      },
      {
        dataSource: 'query_detail',
        query: 'turing award multiple winners quiz',
        queryKey: 'turing award multiple winners quiz',
        page: 'https://letaiexplainai.com/blog/turing-award-quiz',
        clicks: 7,
        impressions: 70,
        position: 4,
      },
    ], '2026-04-24');

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      weekStart: isoDateStringToUtcDate('2026-04-24'),
      dataSource: 'query_detail',
      query: 'turing award multiple winners quiz',
      queryKey: 'turing award multiple winners quiz',
      clicks: 10,
      impressions: 100,
      ctr: 0.1,
      position: 3.4,
    });
  });

  it('runs the weekly ingest, inserts both row shapes, and rebuilds the snapshot window', async () => {
    mockQueryAllRows
      .mockResolvedValueOnce([
        {
          keys: ['2026-04-30', 'turing award multiple winners quiz', 'https://letaiexplainai.com/blog/turing-award-quiz', 'DESKTOP', 'USA'],
          clicks: 7,
          impressions: 70,
          ctr: 0.1,
          position: 3,
        },
      ])
      .mockResolvedValueOnce([
        {
          keys: ['2026-04-30', 'https://letaiexplainai.com/blog/turing-award-quiz', 'DESKTOP', 'USA'],
          clicks: 10,
          impressions: 100,
          ctr: 0.1,
          position: 4,
        },
      ]);

    const result = await runWeeklyIngest(new Date('2026-05-04T06:00:00.000Z'));

    expect(mockQueryAllRows).toHaveBeenCalledTimes(2);
    expect(mockCreateManyDaily).toHaveBeenCalledWith(expect.objectContaining({
      skipDuplicates: true,
    }));
    expect(mockDeleteManyWeekly).toHaveBeenCalledWith({
      where: {
        weekStart: isoDateStringToUtcDate('2026-04-24'),
      },
    });
    expect(mockCreateManyWeekly).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({
          weekStart: isoDateStringToUtcDate('2026-04-24'),
        }),
      ]),
    }));
    expect(mockClassifyAllBuckets).toHaveBeenCalledWith({
      weekStart: '2026-04-24',
    });
    expect(result).toMatchObject({
      mode: 'weekly',
      startDate: '2026-04-24',
      endDate: '2026-04-30',
      finalizedThroughDate: '2026-04-30',
      dailyRowsInserted: 2,
      dailyRowsAttempted: 2,
      snapshotsCreated: 2,
      weekStartsRebuilt: ['2026-04-24'],
    });
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockFindManyDaily = jest.fn();
const mockDeleteManyCluster = jest.fn();
const mockUpsertCluster = jest.fn();
const mockFindFirstCluster = jest.fn();
const mockFindManyCluster = jest.fn();
const mockFindUniqueCluster = jest.fn();
const mockUpdateCluster = jest.fn();
const mockCountCluster = jest.fn();
const mockTransaction = jest.fn();
const mockGetLatestFinalizedPtDate = jest.fn();

function isoDateStringToUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function shiftIsoDate(isoDate: string, offsetDays: number): string {
  const shifted = isoDateStringToUtcDate(isoDate);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return shifted.toISOString().slice(0, 10);
}

jest.mock('../../../server/src/db', () => ({
  prisma: {
    gscDailyMetric: {
      findMany: mockFindManyDaily,
    },
    gscClusterSnapshot: {
      deleteMany: mockDeleteManyCluster,
      upsert: mockUpsertCluster,
      findFirst: mockFindFirstCluster,
      findMany: mockFindManyCluster,
      findUnique: mockFindUniqueCluster,
      update: mockUpdateCluster,
      count: mockCountCluster,
    },
    $transaction: mockTransaction,
  },
}));

jest.mock('../../../server/src/services/gsc/gscClient', () => ({
  getLatestFinalizedPtDate: mockGetLatestFinalizedPtDate,
  isoDateStringToUtcDate,
  shiftIsoDate,
}));

import {
  getClusterDetail,
  listClusters,
  normalizeClusterTokens,
  rebuildClusterSnapshots,
} from '../../../server/src/services/gsc/queryClusterer';

describe('queryClusterer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLatestFinalizedPtDate.mockReturnValue('2026-04-28');
    mockDeleteManyCluster.mockReturnValue(Promise.resolve({ count: 0 }));
    mockUpsertCluster.mockImplementation((args: unknown) => Promise.resolve(args));
    mockTransaction.mockImplementation(async (operations: Array<Promise<unknown>>) => Promise.all(operations));
    mockFindFirstCluster.mockResolvedValue(null);
    mockFindManyCluster.mockResolvedValue([]);
    mockFindUniqueCluster.mockResolvedValue(null);
    mockUpdateCluster.mockResolvedValue({});
    mockCountCluster.mockResolvedValue(0);
  });

  it('normalizes long-tail question phrasing into deterministic cluster tokens', () => {
    expect(normalizeClusterTokens('What is the AI timeline?')).toEqual(['ai', 'timeline']);
    expect(normalizeClusterTokens('How does the mixture of experts algorithms work?')).toEqual([
      'mixture',
      'expert',
      'algorithm',
      'work',
    ]);
  });

  it('rebuilds 90d cluster snapshots from grouped long-tail demand', async () => {
    mockFindManyDaily.mockResolvedValue([
      {
        query: 'ai timeline',
        page: 'https://letaiexplainai.com/timeline',
        clicks: 0,
        impressions: 18,
        position: 11,
      },
      {
        query: 'ai history timeline key milestones',
        page: 'https://letaiexplainai.com/timeline',
        clicks: 1,
        impressions: 22,
        position: 9,
      },
      {
        query: 'history of ai timeline milestones',
        page: 'https://letaiexplainai.com/timeline',
        clicks: 1,
        impressions: 10,
        position: 8,
      },
      {
        query: 'mixture of experts',
        page: 'https://letaiexplainai.com/explained/mixture-of-experts',
        clicks: 0,
        impressions: 20,
        position: 6,
      },
      {
        query: 'how does mixture of experts work',
        page: 'https://letaiexplainai.com/explained/mixture-of-experts',
        clicks: 0,
        impressions: 16,
        position: 6,
      },
    ]);

    const summary = await rebuildClusterSnapshots({
      horizons: ['90d'],
      now: new Date('2026-05-01T12:00:00.000Z'),
    });

    expect(summary).toEqual([
      {
        horizon: '90d',
        windowStart: '2026-01-29',
        windowEnd: '2026-04-28',
        clusterCount: 2,
      },
    ]);
    expect(mockDeleteManyCluster).toHaveBeenCalledWith({
      where: {
        horizon: '90d',
        windowEnd: isoDateStringToUtcDate('2026-04-28'),
        clusterKey: {
          notIn: ['ai timeline', 'mixture expert'],
        },
      },
    });
    expect(mockUpsertCluster).toHaveBeenCalledTimes(2);

    const contentGapCall = mockUpsertCluster.mock.calls.find(
      ([call]) => call.create.bucket === 'cluster_content_gap'
    )?.[0];
    expect(contentGapCall?.create).toMatchObject({
      horizon: '90d',
      clusterKey: 'ai timeline',
      bucket: 'cluster_content_gap',
      primaryPage: 'https://letaiexplainai.com/timeline',
      impressions: 50,
    });

    const nearWinCall = mockUpsertCluster.mock.calls.find(
      ([call]) => call.create.bucket === 'cluster_near_win'
    )?.[0];
    expect(nearWinCall?.create).toMatchObject({
      horizon: '90d',
      clusterKey: 'mixture expert',
      bucket: 'cluster_near_win',
      primaryPage: 'https://letaiexplainai.com/explained/mixture-of-experts',
      impressions: 36,
    });
  });

  it('lists the latest horizon window and hides dismissed clusters', async () => {
    mockFindFirstCluster.mockResolvedValue({
      windowStart: isoDateStringToUtcDate('2026-01-29'),
      windowEnd: isoDateStringToUtcDate('2026-04-28'),
    });
    mockFindManyCluster.mockResolvedValue([
      {
        id: 'cluster_open',
        windowStart: isoDateStringToUtcDate('2026-01-29'),
        windowEnd: isoDateStringToUtcDate('2026-04-28'),
        horizon: '90d',
        clusterKey: 'ai timeline',
        representativeQuery: 'ai history timeline key milestones',
        memberQueriesJson: [
          { query: 'ai history timeline key milestones', impressions: 22, clicks: 1, ctr: 0.045, position: 9 },
          { query: 'ai timeline', impressions: 18, clicks: 0, ctr: 0, position: 11 },
        ],
        memberPagesJson: [
          {
            page: 'https://letaiexplainai.com/timeline',
            path: '/timeline',
            impressions: 50,
            clicks: 2,
            ctr: 0.04,
            position: 9.3,
          },
        ],
        primaryPage: 'https://letaiexplainai.com/timeline',
        clicks: 2,
        impressions: 50,
        ctr: 0.04,
        position: 9.3,
        bucket: 'cluster_content_gap',
        bucketScore: 96,
        status: 'open',
        evidenceJson: {
          explanation: '3 close query variants generated 50 impressions across the last 90d.',
          genericShare: 1,
          primaryPageShare: 1,
          memberQueryCount: 3,
          memberPageCount: 1,
          expectedCtr: null,
          expectedExtraClicks: null,
        },
        createdAt: new Date('2026-05-01T12:00:00.000Z'),
      },
      {
        id: 'cluster_dismissed',
        windowStart: isoDateStringToUtcDate('2026-01-29'),
        windowEnd: isoDateStringToUtcDate('2026-04-28'),
        horizon: '90d',
        clusterKey: 'model collapse',
        representativeQuery: 'model collapse',
        memberQueriesJson: [],
        memberPagesJson: [],
        primaryPage: 'https://letaiexplainai.com/explained/model-collapse',
        clicks: 1,
        impressions: 20,
        ctr: 0.05,
        position: 7,
        bucket: 'cluster_content_gap',
        bucketScore: 30,
        status: 'dismissed',
        evidenceJson: null,
        createdAt: new Date('2026-05-01T12:00:00.000Z'),
      },
      {
        id: 'cluster_actioned',
        windowStart: isoDateStringToUtcDate('2026-01-29'),
        windowEnd: isoDateStringToUtcDate('2026-04-28'),
        horizon: '90d',
        clusterKey: 'ai timeline',
        representativeQuery: 'ai timeline',
        memberQueriesJson: [],
        memberPagesJson: [],
        primaryPage: 'https://letaiexplainai.com/timeline',
        clicks: 0,
        impressions: 95,
        ctr: 0,
        position: 9,
        bucket: 'cluster_content_gap',
        bucketScore: 90,
        status: 'actioned',
        evidenceJson: null,
        createdAt: new Date('2026-05-01T12:30:00.000Z'),
      },
    ]);

    const result = await listClusters({
      horizon: '90d',
      bucket: 'cluster_content_gap',
      limit: 10,
      page: 1,
    });

    expect(result.meta).toEqual({
      horizon: '90d',
      windowStart: '2026-01-29',
      windowEnd: '2026-04-28',
      counts: {
        cluster_content_gap: 1,
        cluster_near_win: 0,
        cluster_topic_theme: 0,
      },
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 'cluster_open',
      bucket: 'cluster_content_gap',
      memberQueryCount: 3,
      evidence: '3 close query variants generated 50 impressions across the last 90d.',
    });
  });

  it('returns cluster detail with member query and page evidence', async () => {
    mockFindUniqueCluster.mockResolvedValue({
      id: 'cluster_open',
      windowStart: isoDateStringToUtcDate('2026-01-29'),
      windowEnd: isoDateStringToUtcDate('2026-04-28'),
      horizon: '90d',
      clusterKey: 'mixture expert',
      representativeQuery: 'mixture of experts',
      memberQueriesJson: [
        { query: 'mixture of experts', impressions: 20, clicks: 0, ctr: 0, position: 6 },
        { query: 'how does mixture of experts work', impressions: 16, clicks: 0, ctr: 0, position: 6 },
      ],
      memberPagesJson: [
        {
          page: 'https://letaiexplainai.com/explained/mixture-of-experts',
          path: '/explained/mixture-of-experts',
          impressions: 36,
          clicks: 0,
          ctr: 0,
          position: 6,
        },
      ],
      primaryPage: 'https://letaiexplainai.com/explained/mixture-of-experts',
      clicks: 0,
      impressions: 36,
      ctr: 0,
      position: 6,
      bucket: 'cluster_near_win',
      bucketScore: 55,
      status: 'open',
      evidenceJson: {
        explanation: '2 close variants already land on /explained/mixture-of-experts, but the cluster CTR trails expectation.',
        genericShare: 0,
        primaryPageShare: 1,
        memberQueryCount: 2,
        memberPageCount: 1,
        expectedCtr: 0.053,
        expectedExtraClicks: 1.908,
      },
      createdAt: new Date('2026-05-01T12:00:00.000Z'),
    });

    const detail = await getClusterDetail('cluster_open');

    expect(detail).toMatchObject({
      id: 'cluster_open',
      bucket: 'cluster_near_win',
      memberQueryCount: 2,
      memberPageCount: 1,
      memberQueries: [
        expect.objectContaining({ query: 'mixture of experts', impressions: 20 }),
        expect.objectContaining({ query: 'how does mixture of experts work', impressions: 16 }),
      ],
      memberPages: [
        expect.objectContaining({ path: '/explained/mixture-of-experts', impressions: 36 }),
      ],
    });
  });
});

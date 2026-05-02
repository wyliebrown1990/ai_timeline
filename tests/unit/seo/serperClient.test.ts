import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSend = jest.fn();
const mockSerpSampleAggregate = jest.fn();
const mockSerpSampleFindFirst = jest.fn();
const mockSerpSampleCreate = jest.fn();

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
      create: mockSerpSampleCreate,
    },
  },
}));

import {
  buildSerperKeywordOpportunityCandidates,
  getSerperUsageSummary,
  refreshSerperKeywordOpportunitySample,
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
    mockSerpSampleCreate.mockResolvedValue({});
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
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
      pricingEnabled: false,
      pausedBySeoAgent: false,
      tierLabel: null,
      purchasedCredits: null,
      monthlyCreditBudget: null,
      remainingCredits: null,
      warningLevel: 'ok',
      policy: null,
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
    expect(summary.policy).toEqual({
      endpoint: 'search',
      usdPerThousandQueries: 1,
      maxQueriesPerRun: 3,
      maxQueriesPerDay: 10,
      maxQueriesPerWeek: 25,
      cacheTtlDays: 28,
      country: 'us',
      language: 'en',
      dateRange: 'qdr:m',
      page: 1,
    });
    expect(summary.pricingEnabled).toBe(true);
    expect(summary.pausedBySeoAgent).toBe(false);
  });

  it('pins automatic sampling to page one and persists the full request tuple key', async () => {
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
            page: 2,
            autoTopupEnabled: false,
          }),
        },
      };
    });

    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        organic: [
          { link: 'https://en.wikipedia.org/wiki/AI_timeline' },
        ],
        peopleAlsoAsk: [],
        relatedSearches: [],
      }),
    } as Response);

    const result = await buildSerperKeywordOpportunityCandidates([
      {
        id: 'kw_gap_1',
        sourceType: 'gsc_cluster',
        dedupeKey: 'gsc_cluster:ai timeline:blog_post:/blog/ai-timeline',
        seedQuery: 'ai timeline',
        clusterKey: 'ai timeline',
        clusterSnapshotId: 'cluster_gap_1',
        targetIntent: 'timeline',
        demandProxy: 80,
        competitionProxy: 31,
        laeaFitScore: 84,
        pageTypeRecommendation: 'blog_post',
        targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
        rationale: 'Prior SERP rationale',
        status: 'scored',
      },
    ], new Date('2026-05-01T12:00:00.000Z'));

    expect(result.usage.policy).toEqual(expect.objectContaining({
      page: 1,
    }));
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.sourceRef.requestKey).toBe('us:en:qdr:m:1:ai timeline');
    expect(result.candidates[0]?.sourceRef.page).toBe(1);
    expect(mockSerpSampleCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        requestKey: 'us:en:qdr:m:1:ai timeline',
        normalizedQueryKey: 'us:en:qdr:m:1:ai timeline',
        page: 1,
      }),
    }));

    const fetchInput = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0]?.[1];
    expect(fetchInput).toBeDefined();
    expect(JSON.parse(String(fetchInput?.body))).toEqual({
      q: 'ai timeline',
      gl: 'us',
      hl: 'en',
      tbs: 'qdr:m',
      page: 1,
    });
  });

  it('keeps using cached samples after the fresh-query cap is reached', async () => {
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
            maxQueriesPerRun: 1,
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

    const cachedSummary = {
      requestKey: 'us:en:qdr:m:1:cached query',
      query: 'cached query',
      country: 'us',
      language: 'en',
      dateRange: 'qdr:m',
      page: 1,
      sampledAt: '2026-05-01T12:00:00.000Z',
      expiresAt: '2026-05-29T12:00:00.000Z',
      organicCount: 10,
      peopleAlsoAskCount: 2,
      relatedSearchCount: 3,
      topDomains: ['reddit.com'],
      strongDomainCount: 0,
      forumDomainCount: 1,
      videoDomainCount: 0,
      competitionProxy: 27,
      competitionReason: 'Cached sample.',
      effectiveCostUsd: 0.001,
    };

    mockSerpSampleFindFirst.mockImplementation(async (args: {
      select?: { sampledAt?: boolean; summaryJson?: boolean };
      where?: { requestKey?: string };
    }) => {
      if (args.select?.summaryJson && args.where?.requestKey === 'us:en:qdr:m:1:fresh query') {
        return null;
      }

      if (args.select?.summaryJson && args.where?.requestKey === 'us:en:qdr:m:1:cached query') {
        return {
          summaryJson: cachedSummary,
        };
      }

      return null;
    });

    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        organic: [
          { link: 'https://wikipedia.org/wiki/Fresh_query' },
        ],
        peopleAlsoAsk: [],
        relatedSearches: [],
      }),
    } as Response);

    const result = await buildSerperKeywordOpportunityCandidates([
      {
        id: 'kw_fresh',
        sourceType: 'gsc_cluster',
        dedupeKey: 'gsc_cluster:fresh query:blog_post:/blog/fresh-query',
        seedQuery: 'fresh query',
        clusterKey: 'fresh query',
        clusterSnapshotId: 'cluster_fresh',
        targetIntent: 'topic_theme',
        demandProxy: 82,
        competitionProxy: 40,
        laeaFitScore: 88,
        pageTypeRecommendation: 'blog_post',
        targetUrl: 'https://letaiexplainai.com/blog/fresh-query',
        rationale: 'Fresh row',
        status: 'scored',
      },
      {
        id: 'kw_cached',
        sourceType: 'gsc_cluster',
        dedupeKey: 'gsc_cluster:cached query:blog_post:/blog/cached-query',
        seedQuery: 'cached query',
        clusterKey: 'cached query',
        clusterSnapshotId: 'cluster_cached',
        targetIntent: 'topic_theme',
        demandProxy: 76,
        competitionProxy: 35,
        laeaFitScore: 86,
        pageTypeRecommendation: 'blog_post',
        targetUrl: 'https://letaiexplainai.com/blog/cached-query',
        rationale: 'Cached row',
        status: 'scored',
      },
    ], new Date('2026-05-01T12:00:00.000Z'));

    expect(result.candidates).toHaveLength(2);
    expect(result.cacheHits).toBe(1);
    expect(result.freshSamples).toBe(1);
    expect(result.skippedSamples).toBe(0);
    expect(mockSerpSampleCreate).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('blocks manual refresh until the 7-day Serper cooldown expires', async () => {
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

    await expect(refreshSerperKeywordOpportunitySample({
      id: 'kw_gap_1',
      sourceType: 'gsc_cluster',
      dedupeKey: 'gsc_cluster:ai timeline:blog_post:/blog/ai-timeline',
      seedQuery: 'ai timeline',
      clusterKey: 'ai timeline',
      clusterSnapshotId: 'cluster_gap_1',
      targetIntent: 'timeline',
      demandProxy: 80,
      competitionProxy: 31,
      laeaFitScore: 84,
      pageTypeRecommendation: 'blog_post',
      targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
      rationale: 'Prior SERP rationale',
      status: 'scored',
    }, {
      now: new Date('2026-05-01T12:00:00.000Z'),
      lastSampledAt: '2026-04-28T12:00:00.000Z',
    })).rejects.toThrow('Manual SERP refresh is locked until 2026-05-05');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockSerpSampleCreate).not.toHaveBeenCalled();
  });

  it('treats Serper as read-only while the global SEO pause switch is on', async () => {
    mockSend.mockImplementation(async (command: { Name: string }) => {
      if (command.Name?.includes('serper-api-key')) {
        return {
          Parameter: {
            Value: 'test-serper-key',
          },
        };
      }

      if (command.Name?.includes('seo-agent-paused')) {
        return {
          Parameter: {
            Value: 'true',
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

    const summary = await getSerperUsageSummary(new Date('2026-05-01T12:00:00.000Z'));
    expect(summary.enabled).toBe(false);
    expect(summary.pricingEnabled).toBe(true);
    expect(summary.pausedBySeoAgent).toBe(true);

    await expect(refreshSerperKeywordOpportunitySample({
      id: 'kw_gap_1',
      sourceType: 'gsc_cluster',
      dedupeKey: 'gsc_cluster:ai timeline:blog_post:/blog/ai-timeline',
      seedQuery: 'ai timeline',
      clusterKey: 'ai timeline',
      clusterSnapshotId: 'cluster_gap_1',
      targetIntent: 'timeline',
      demandProxy: 80,
      competitionProxy: 31,
      laeaFitScore: 84,
      pageTypeRecommendation: 'blog_post',
      targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
      rationale: 'Prior SERP rationale',
      status: 'scored',
    }, {
      now: new Date('2026-05-01T12:00:00.000Z'),
      lastSampledAt: '2026-04-01T12:00:00.000Z',
    })).rejects.toThrow('global SEO pause switch is on');

    const candidateResult = await buildSerperKeywordOpportunityCandidates([
      {
        id: 'kw_gap_1',
        sourceType: 'gsc_cluster',
        dedupeKey: 'gsc_cluster:ai timeline:blog_post:/blog/ai-timeline',
        seedQuery: 'ai timeline',
        clusterKey: 'ai timeline',
        clusterSnapshotId: 'cluster_gap_1',
        targetIntent: 'timeline',
        demandProxy: 80,
        competitionProxy: 31,
        laeaFitScore: 84,
        pageTypeRecommendation: 'blog_post',
        targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
        rationale: 'Prior SERP rationale',
        status: 'scored',
      },
    ], new Date('2026-05-01T12:00:00.000Z'));

    expect(candidateResult.candidates).toHaveLength(0);
    expect(candidateResult.usage.pausedBySeoAgent).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockSerpSampleCreate).not.toHaveBeenCalled();
  });
});

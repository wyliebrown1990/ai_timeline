import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockKeywordFindMany = jest.fn();
const mockKeywordCount = jest.fn();
const mockKeywordGroupBy = jest.fn();
const mockKeywordFindUnique = jest.fn();
const mockKeywordUpsert = jest.fn();
const mockKeywordUpdate = jest.fn();
const mockKeywordUpdateMany = jest.fn();
const mockSeoProposalCount = jest.fn();
const mockSeoExperimentCount = jest.fn();
const mockListClusters = jest.fn();
const mockGetClusterDetail = jest.fn();
const mockBuildTopicPodFromCluster = jest.fn();
const mockGoogleTrendsParseURL = jest.fn();
const mockBuildSerperKeywordOpportunityCandidates = jest.fn();
const mockGetSerperUsageSummary = jest.fn();

jest.mock('../../../server/src/db', () => ({
  prisma: {
    keywordOpportunity: {
      findMany: mockKeywordFindMany,
      count: mockKeywordCount,
      groupBy: mockKeywordGroupBy,
      findUnique: mockKeywordFindUnique,
      upsert: mockKeywordUpsert,
      update: mockKeywordUpdate,
      updateMany: mockKeywordUpdateMany,
    },
    seoProposal: {
      count: mockSeoProposalCount,
    },
    seoExperiment: {
      count: mockSeoExperimentCount,
    },
  },
}));

jest.mock('../../../server/src/services/gsc/queryClusterer', () => ({
  listClusters: mockListClusters,
  getClusterDetail: mockGetClusterDetail,
}));

jest.mock('../../../server/src/services/seo/topicPodPlanner', () => ({
  buildTopicPodFromCluster: mockBuildTopicPodFromCluster,
}));

jest.mock('../../../server/src/services/seo/serperClient', () => ({
  buildSerperKeywordOpportunityCandidates: mockBuildSerperKeywordOpportunityCandidates,
  getSerperUsageSummary: mockGetSerperUsageSummary,
}));

jest.mock('rss-parser', () => {
  return jest.fn().mockImplementation(() => ({
    parseURL: mockGoogleTrendsParseURL,
  }));
});

import {
  createEditorialKeywordOpportunity,
  getKeywordOpportunity,
  listKeywordOpportunities,
  markKeywordOpportunityPromoted,
  rebuildKeywordPortfolio,
} from '../../../server/src/services/seo/keywordDiscovery';

function buildClusterDetail(overrides: Partial<{
  id: string;
  clusterKey: string;
  representativeQuery: string;
  primaryPage: string;
  bucket: 'cluster_content_gap' | 'cluster_topic_theme';
  horizon: '28d' | '90d';
  impressions: number;
  position: number;
}> = {}) {
  return {
    id: overrides.id ?? 'cluster_1',
    horizon: overrides.horizon ?? '90d',
    windowStart: '2026-01-29',
    windowEnd: '2026-04-28',
    bucket: overrides.bucket ?? 'cluster_topic_theme',
    status: 'open',
    clusterKey: overrides.clusterKey ?? 'mixture expert',
    representativeQuery: overrides.representativeQuery ?? 'mixture of experts',
    primaryPage: overrides.primaryPage ?? 'https://letaiexplainai.com/explained/mixture-of-experts-moe',
    currentMetrics: {
      clicks: 2,
      impressions: overrides.impressions ?? 48,
      ctr: 0.04,
      position: overrides.position ?? 8.2,
    },
    memberQueryCount: 4,
    memberPageCount: 1,
    score: 192,
    evidence: 'Cluster evidence',
    suggestedAction: 'Expand existing page',
    memberQueries: [],
    memberPages: [],
  };
}

describe('keywordDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKeywordFindMany.mockResolvedValue([]);
    mockKeywordCount.mockResolvedValue(0);
    mockKeywordGroupBy.mockResolvedValue([]);
    mockKeywordFindUnique.mockResolvedValue(null);
    mockKeywordUpsert.mockResolvedValue({});
    mockKeywordUpdate.mockResolvedValue({});
    mockKeywordUpdateMany.mockResolvedValue({ count: 0 });
    mockSeoProposalCount.mockResolvedValue(0);
    mockSeoExperimentCount.mockResolvedValue(0);
    mockGoogleTrendsParseURL.mockResolvedValue({ items: [] });
    mockBuildSerperKeywordOpportunityCandidates.mockResolvedValue({
      candidates: [],
      supersededOpportunityIds: [],
      cacheHits: 0,
      freshSamples: 0,
      skippedSamples: 0,
      usage: {
        configured: false,
        enabled: false,
        autoTopupEnabled: false,
        tierLabel: null,
        purchasedCredits: null,
        monthlyCreditBudget: null,
        creditsUsedToday: 0,
        creditsUsedWeek: 0,
        creditsUsedMonth: 0,
        creditsUsedTotal: 0,
        effectiveSpendTodayUsd: 0,
        effectiveSpendWeekUsd: 0,
        effectiveSpendMonthUsd: 0,
        effectiveSpendTotalUsd: 0,
        remainingCredits: null,
        projectedDepletionDate: null,
        lastSampledAt: null,
        warningLevel: 'ok',
      },
    });
    mockGetSerperUsageSummary.mockResolvedValue({
      configured: false,
      enabled: false,
      autoTopupEnabled: false,
      tierLabel: null,
      purchasedCredits: null,
      monthlyCreditBudget: null,
      creditsUsedToday: 0,
      creditsUsedWeek: 0,
      creditsUsedMonth: 0,
      creditsUsedTotal: 0,
      effectiveSpendTodayUsd: 0,
      effectiveSpendWeekUsd: 0,
      effectiveSpendMonthUsd: 0,
      effectiveSpendTotalUsd: 0,
      remainingCredits: null,
      projectedDepletionDate: null,
      lastSampledAt: null,
      warningLevel: 'ok',
    });

    mockListClusters.mockImplementation(async ({ horizon, bucket }: { horizon: string; bucket: string }) => {
      if (horizon === '90d' && bucket === 'cluster_topic_theme') {
        return {
          data: [{ id: 'cluster_topic_1' }],
          pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
          meta: { horizon: '90d', windowStart: '2026-01-29', windowEnd: '2026-04-28', counts: {} },
        };
      }

      if (horizon === '28d' && bucket === 'cluster_content_gap') {
        return {
          data: [{ id: 'cluster_gap_1' }],
          pagination: { page: 1, limit: 8, total: 1, totalPages: 1 },
          meta: { horizon: '28d', windowStart: '2026-04-01', windowEnd: '2026-04-28', counts: {} },
        };
      }

      return {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        meta: { horizon, windowStart: null, windowEnd: null, counts: {} },
      };
    });

    mockGetClusterDetail.mockImplementation(async (id: string) => {
      if (id === 'cluster_gap_1') {
        return buildClusterDetail({
          id,
          horizon: '28d',
          bucket: 'cluster_content_gap',
          representativeQuery: 'ai timeline',
          clusterKey: 'ai timeline',
          primaryPage: 'https://letaiexplainai.com/timeline',
          impressions: 24,
          position: 18,
        });
      }

      return buildClusterDetail({ id });
    });

    mockBuildTopicPodFromCluster.mockImplementation(async (cluster: { representativeQuery: string; primaryPage: string }) => {
      if (cluster.representativeQuery === 'ai timeline') {
        return {
          keyword: cluster.representativeQuery,
          sourceType: 'cluster_snapshot',
          sourceId: 'cluster_plan',
          sourceLabel: '28d content gap',
          primaryPage: cluster.primaryPage,
          moveType: 'create_new',
          hypothesis: 'Create a focused page',
          canonicalDestination: {
            type: 'new_blog_post',
            label: 'AI Timeline',
            path: '/blog/ai-timeline',
            exists: false,
            reason: 'LAEA does not have a dedicated canonical page for this clustered theme yet.',
          },
          companionAssets: [],
          internalLinkOpportunities: [
            {
              entityType: 'glossary_term',
              label: 'Transformer',
              path: '/glossary/transformer',
              reason: 'Support link',
            },
          ],
        };
      }

      return {
        keyword: cluster.representativeQuery,
        sourceType: 'cluster_snapshot',
        sourceId: 'cluster_plan',
        sourceLabel: '90d topic theme',
        primaryPage: cluster.primaryPage,
        moveType: 'expand_existing',
        hypothesis: 'Test hypothesis',
        canonicalDestination: {
          type: 'existing_page',
          label: 'Existing page',
          path: new URL(cluster.primaryPage).pathname,
          exists: true,
          reason: 'LAEA already has a strong destination.',
        },
        companionAssets: [],
        internalLinkOpportunities: [
          {
            entityType: 'glossary_term',
            label: 'Transformer',
            path: '/glossary/transformer',
            reason: 'Support link',
          },
        ],
      };
    });
  });

  it('rebuilds only true gap opportunities from live cluster windows and archives stale rows', async () => {
    mockKeywordFindMany.mockResolvedValueOnce([]);
    mockKeywordCount.mockResolvedValueOnce(1);

    const result = await rebuildKeywordPortfolio();

    expect(mockKeywordUpsert).toHaveBeenCalledTimes(1);
    expect(mockKeywordUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        dedupeKey: 'gsc_cluster:ai timeline:blog_post:/blog/ai-timeline',
      },
      create: expect.objectContaining({
        sourceType: 'gsc_cluster',
        status: 'scored',
      }),
    }));
    expect(mockSeoProposalCount).toHaveBeenCalledWith({
      where: {
        proposalType: 'blog_post',
        status: {
          in: ['pending', 'drafting', 'approved'],
        },
      },
    });
    expect(mockSeoExperimentCount).toHaveBeenCalledWith({
      where: {
        status: {
          in: ['planned', 'running'],
        },
      },
    });
    expect(mockKeywordUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        sourceType: 'gsc_cluster',
      }),
      data: { status: 'archived' },
    }));
    expect(result).toEqual({
      created: 1,
      updated: 0,
      archived: 0,
      totalActive: 1,
      candidateCount: 1,
      sourcesUsed: ['gsc_cluster'],
      serperSampling: {
        shortlistCount: 0,
        cacheHits: 0,
        freshSamples: 0,
        skippedSamples: 0,
      },
    });
    expect(mockBuildSerperKeywordOpportunityCandidates).toHaveBeenCalledWith([]);
  });

  it('penalizes discovery scores when proposal and experiment capacity is already busy', async () => {
    mockKeywordFindMany.mockResolvedValueOnce([]);
    mockKeywordCount.mockResolvedValueOnce(1);
    mockSeoProposalCount.mockResolvedValueOnce(5);
    mockSeoExperimentCount.mockResolvedValueOnce(3);

    await rebuildKeywordPortfolio();

    expect(mockKeywordUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        overallScore: 75.7,
      }),
      update: expect.objectContaining({
        overallScore: 75.7,
      }),
    }));
  });

  it('adds AI-relevant Google Trends rows to the portfolio without paid providers', async () => {
    mockListClusters.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      meta: { horizon: '28d', windowStart: null, windowEnd: null, counts: {} },
    });
    mockGoogleTrendsParseURL.mockResolvedValueOnce({
      items: [
        {
          title: 'Claude AI coding',
          pubDate: 'Fri, 1 May 2026 11:20:00 -0700',
          'ht:approx_traffic': '5000+',
        },
        {
          title: 'zverev',
          pubDate: 'Fri, 1 May 2026 11:20:00 -0700',
          'ht:approx_traffic': '2000+',
        },
      ],
    });
    mockKeywordFindMany.mockResolvedValueOnce([]);
    mockKeywordCount.mockResolvedValueOnce(1);
    mockBuildTopicPodFromCluster.mockResolvedValueOnce({
      keyword: 'Claude AI coding',
      sourceType: 'cluster_snapshot',
      sourceId: 'trend_plan',
      sourceLabel: 'Google Trends',
      primaryPage: 'https://letaiexplainai.com/news',
      moveType: 'create_new',
      hypothesis: 'Create a focused page',
      canonicalDestination: {
        type: 'new_blog_post',
        label: 'Claude AI Coding',
        path: '/blog/claude-ai-coding',
        exists: false,
        reason: 'LAEA does not have a dedicated canonical page for this trend yet.',
      },
      companionAssets: [],
      internalLinkOpportunities: [],
    });

    const result = await rebuildKeywordPortfolio();

    expect(mockGoogleTrendsParseURL).toHaveBeenCalledWith('https://trends.google.com/trending/rss?geo=US');
    expect(mockKeywordUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        sourceType: 'google_trends',
        seedQuery: 'Claude AI coding',
        targetUrl: 'https://letaiexplainai.com/blog/claude-ai-coding',
      }),
    }));
    expect(result).toEqual({
      created: 1,
      updated: 0,
      archived: 0,
      totalActive: 1,
      candidateCount: 1,
      sourcesUsed: ['google_trends'],
      serperSampling: {
        shortlistCount: 0,
        cacheHits: 0,
        freshSamples: 0,
        skippedSamples: 0,
      },
    });
  });

  it('lists and loads stored keyword opportunities', async () => {
    const storedRow = {
      id: 'kw_1',
      sourceType: 'gsc_cluster',
      dedupeKey: 'gsc_cluster:mixture expert:explainer_page:/explained/mixture-of-experts-moe',
      seedQuery: 'mixture of experts',
      clusterKey: 'mixture expert',
      clusterSnapshotId: 'cluster_topic_1',
      sourceRefJson: {
        clusterId: 'cluster_topic_1',
        bucket: 'cluster_topic_theme',
        horizon: '90d',
        windowStart: '2026-01-29',
        windowEnd: '2026-04-28',
        representativeQuery: 'mixture of experts',
        primaryPage: 'https://letaiexplainai.com/explained/mixture-of-experts-moe',
        canonicalPath: '/explained/mixture-of-experts-moe',
        moveType: 'expand_existing',
        impressions: 48,
        clicks: 2,
        ctr: 0.04,
        position: 8.2,
        memberQueryCount: 4,
        memberPageCount: 1,
        internalLinkCount: 1,
      },
      targetIntent: 'definition',
      demandProxy: 100,
      competitionProxy: 13,
      laeaFitScore: 96,
      overallScore: 79.1,
      pageTypeRecommendation: 'explainer_page',
      targetUrl: 'https://letaiexplainai.com/explained/mixture-of-experts-moe',
      rationale: 'Rationale',
      status: 'scored',
      linkedExperimentId: null,
      createdAt: new Date('2026-05-01T12:00:00.000Z'),
      updatedAt: new Date('2026-05-01T12:15:00.000Z'),
    };

    mockKeywordFindMany.mockResolvedValueOnce([storedRow]);
    mockKeywordCount.mockResolvedValueOnce(1);
    mockKeywordGroupBy.mockResolvedValueOnce([
      { status: 'scored', _count: { _all: 1 } },
    ]);
    mockKeywordGroupBy.mockResolvedValueOnce([
      { sourceType: 'gsc_cluster', _count: { _all: 1 } },
    ]);
    mockKeywordFindUnique.mockResolvedValueOnce(storedRow);

    const listResult = await listKeywordOpportunities({
      status: 'scored',
      sourceType: 'gsc_cluster',
      page: 1,
      limit: 10,
    });
    const detailResult = await getKeywordOpportunity('kw_1');

    expect(listResult.pagination.total).toBe(1);
    expect(listResult.data[0]).toEqual(expect.objectContaining({
      id: 'kw_1',
      sourceType: 'gsc_cluster',
      pageTypeRecommendation: 'explainer_page',
    }));
    expect(detailResult).toEqual(expect.objectContaining({
      id: 'kw_1',
      seedQuery: 'mixture of experts',
      sourceRef: expect.objectContaining({
        bucket: 'cluster_topic_theme',
      }),
    }));
    expect(mockKeywordFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          { status: 'scored' },
          { sourceType: 'gsc_cluster' },
        ],
      },
    }));
    expect(mockKeywordGroupBy).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: {
        sourceType: 'gsc_cluster',
      },
    }));
    expect(mockKeywordGroupBy).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: {
        status: 'scored',
      },
    }));
    expect(listResult.meta.serper).toEqual(expect.objectContaining({
      configured: false,
      warningLevel: 'ok',
    }));
  });

  it('creates sampled SERP opportunities and archives the superseded source rows', async () => {
    mockKeywordFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'kw_gap_1',
          sourceType: 'gsc_cluster',
          dedupeKey: 'gsc_cluster:ai timeline:blog_post:/blog/ai-timeline',
          seedQuery: 'ai timeline',
          clusterKey: 'ai timeline',
          clusterSnapshotId: 'cluster_gap_1',
          targetIntent: 'timeline',
          demandProxy: 100,
          competitionProxy: 45,
          laeaFitScore: 72,
          pageTypeRecommendation: 'blog_post',
          targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
          rationale: 'Gap source row',
          status: 'scored',
          overallScore: 80.5,
        },
      ])
      .mockResolvedValueOnce([]);
    mockKeywordCount.mockResolvedValueOnce(1);
    mockKeywordUpdateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    mockBuildSerperKeywordOpportunityCandidates.mockResolvedValueOnce({
      candidates: [
        {
          sourceOpportunityId: 'kw_gap_1',
          sourceOpportunitySourceType: 'gsc_cluster',
          dedupeKey: 'serp_sample:ai-timeline:blog-post:https-letaiexplainai-com-blog-ai-timeline',
          seedQuery: 'ai timeline',
          clusterKey: 'ai timeline',
          clusterSnapshotId: 'cluster_gap_1',
          targetIntent: 'timeline',
          demandProxy: 100,
          competitionProxy: 31,
          laeaFitScore: 72,
          pageTypeRecommendation: 'blog_post',
          targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
          rationale: 'SERP sampled row',
          sourceRef: {
            vendor: 'serper',
            requestKey: 'us:en:qdr:m:1:ai timeline',
            originSourceType: 'gsc_cluster',
            originOpportunityId: 'kw_gap_1',
            originDedupeKey: 'gsc_cluster:ai timeline:blog_post:/blog/ai-timeline',
            query: 'ai timeline',
            country: 'us',
            language: 'en',
            dateRange: 'qdr:m',
            page: 1,
            sampledAt: '2026-05-01T12:00:00.000Z',
            expiresAt: '2026-05-29T12:00:00.000Z',
            organicCount: 10,
            peopleAlsoAskCount: 3,
            relatedSearchCount: 8,
            topDomains: ['wikipedia.org'],
            strongDomainCount: 1,
            forumDomainCount: 0,
            videoDomainCount: 0,
            competitionProxy: 31,
            competitionReason: 'Top results include wikipedia.org',
            effectiveCostUsd: 0.001,
          },
        },
      ],
      supersededOpportunityIds: ['kw_gap_1'],
      cacheHits: 0,
      freshSamples: 1,
      skippedSamples: 0,
      usage: {
        configured: true,
        enabled: true,
        autoTopupEnabled: false,
        tierLabel: 'starter',
        purchasedCredits: 50_000,
        monthlyCreditBudget: 2_500,
        creditsUsedToday: 1,
        creditsUsedWeek: 1,
        creditsUsedMonth: 1,
        creditsUsedTotal: 1,
        effectiveSpendTodayUsd: 0.001,
        effectiveSpendWeekUsd: 0.001,
        effectiveSpendMonthUsd: 0.001,
        effectiveSpendTotalUsd: 0.001,
        remainingCredits: 49_999,
        projectedDepletionDate: null,
        lastSampledAt: '2026-05-01T12:00:00.000Z',
        warningLevel: 'ok',
      },
    });

    const result = await rebuildKeywordPortfolio();

    expect(mockKeywordUpsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      create: expect.objectContaining({
        sourceType: 'serp_sample',
        status: 'scored',
        competitionProxy: 31,
      }),
      update: expect.objectContaining({
        sourceType: 'serp_sample',
        competitionProxy: 31,
      }),
    }));
    expect(mockKeywordUpdateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({
        id: {
          in: ['kw_gap_1'],
        },
      }),
      data: {
        status: 'archived',
      },
    }));
    expect(result).toEqual({
      created: 2,
      updated: 0,
      archived: 1,
      totalActive: 1,
      candidateCount: 2,
      sourcesUsed: ['gsc_cluster', 'serp_sample'],
      serperSampling: {
        shortlistCount: 1,
        cacheHits: 0,
        freshSamples: 1,
        skippedSamples: 0,
      },
    });
  });

  it('uses an empty where-clause when listing all sources and statuses', async () => {
    mockKeywordFindMany.mockResolvedValueOnce([]);
    mockKeywordCount.mockResolvedValueOnce(0);
    mockKeywordGroupBy.mockResolvedValueOnce([]);
    mockKeywordGroupBy.mockResolvedValueOnce([]);

    await listKeywordOpportunities({
      status: 'all',
      sourceType: 'all',
      page: 1,
      limit: 10,
    });

    expect(mockKeywordFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {},
    }));
  });

  it('marks a keyword opportunity as promoted', async () => {
    mockKeywordUpdate.mockResolvedValueOnce({
      id: 'kw_1',
      sourceType: 'gsc_cluster',
      dedupeKey: 'gsc_cluster:ai timeline:blog_post:/blog/ai-timeline',
      seedQuery: 'ai timeline',
      clusterKey: 'ai timeline',
      clusterSnapshotId: 'cluster_gap_1',
      sourceRefJson: null,
      targetIntent: 'timeline',
      demandProxy: 24,
      competitionProxy: 18,
      laeaFitScore: 72,
      overallScore: 54.6,
      pageTypeRecommendation: 'blog_post',
      targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
      rationale: 'Rationale',
      status: 'promoted',
      linkedExperimentId: null,
      createdAt: new Date('2026-05-01T12:00:00.000Z'),
      updatedAt: new Date('2026-05-01T12:15:00.000Z'),
    });

    const result = await markKeywordOpportunityPromoted('kw_1');

    expect(mockKeywordUpdate).toHaveBeenCalledWith({
      where: { id: 'kw_1' },
      data: { status: 'promoted' },
    });
    expect(result).toEqual(expect.objectContaining({
      id: 'kw_1',
      status: 'promoted',
    }));
  });

  it('creates a scored editorial seed opportunity', async () => {
    mockKeywordUpsert.mockResolvedValueOnce({
      id: 'kw_seed_1',
      sourceType: 'editorial_seed',
      dedupeKey: 'editorial_seed:ai-agent-memory:blog-post:https-letaiexplainai-com-blog-ai-agent-memory',
      seedQuery: 'ai agent memory',
      clusterKey: null,
      clusterSnapshotId: null,
      sourceRefJson: null,
      targetIntent: 'topic_theme',
      demandProxy: 64,
      competitionProxy: 38,
      laeaFitScore: 82,
      overallScore: 67.7,
      pageTypeRecommendation: 'blog_post',
      targetUrl: 'https://letaiexplainai.com/blog/ai-agent-memory',
      rationale: 'Manual seed from strategy review.',
      status: 'scored',
      linkedExperimentId: null,
      createdAt: new Date('2026-05-01T12:00:00.000Z'),
      updatedAt: new Date('2026-05-01T12:15:00.000Z'),
    });

    const result = await createEditorialKeywordOpportunity({
      seedQuery: 'ai agent memory',
      pageTypeRecommendation: 'blog_post',
      targetUrl: '/blog/ai-agent-memory',
      demandProxy: 64,
      competitionProxy: 38,
      laeaFitScore: 82,
      rationale: 'Manual seed from strategy review.',
    });

    expect(mockKeywordUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        sourceType: 'editorial_seed',
        status: 'scored',
        targetUrl: 'https://letaiexplainai.com/blog/ai-agent-memory',
      }),
    }));
    expect(result).toEqual(expect.objectContaining({
      id: 'kw_seed_1',
      sourceType: 'editorial_seed',
      seedQuery: 'ai agent memory',
    }));
  });
});

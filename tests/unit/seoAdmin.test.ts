import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';

const mockRunWeeklyIngest = jest.fn();
const mockGetGscHealth = jest.fn();
const mockListInsights = jest.fn();
const mockGetInsightDetail = jest.fn();
const mockDismissInsight = jest.fn();
const mockMarkInsightActioned = jest.fn();
const mockListClusters = jest.fn();
const mockGetClusterDetail = jest.fn();
const mockDismissCluster = jest.fn();
const mockMarkClusterActioned = jest.fn();
const mockProposeRewrite = jest.fn();
const mockShipRewrite = jest.fn();
const mockListSeoActions = jest.fn();
const mockRollbackSeoAction = jest.fn();
const mockListPendingFeedbackActions = jest.fn();
const mockMeasureSeoAction = jest.fn();
const mockIsPaused = jest.fn();
const mockSetPaused = jest.fn();
const mockGetLatestAgentRunStatus = jest.fn();
const mockSetLatestAgentRunStatus = jest.fn();
const mockListSeoProposals = jest.fn();
const mockGenerateProposal = jest.fn();
const mockGenerateProposalFromCluster = jest.fn();
const mockGenerateProposalFromKeywordOpportunity = jest.fn();
const mockGenerateEvergreenRoutingProposal = jest.fn();
const mockGeneratePackagingFixProposal = jest.fn();
const mockApproveSeoProposal = jest.fn();
const mockRejectSeoProposal = jest.fn();
const mockLinkProposalDraft = jest.fn();
const mockListSeoExperiments = jest.fn();
const mockGetSeoExperiment = jest.fn();
const mockReviewSeoExperiment = jest.fn();
const mockListSeoPackagingAudits = jest.fn();
const mockGetSeoPackagingAudit = jest.fn();
const mockListKeywordOpportunities = jest.fn();
const mockCreateEditorialKeywordOpportunity = jest.fn();
const mockGetKeywordOpportunity = jest.fn();
const mockArchiveKeywordOpportunity = jest.fn();
const mockMarkKeywordOpportunityPromoted = jest.fn();
const mockRefreshKeywordOpportunitySerp = jest.fn();
const mockRebuildKeywordPortfolio = jest.fn();
const mockGetSerperUsageSummary = jest.fn();

jest.mock('../../server/src/services/gsc/gscIngest', () => ({
  runWeeklyIngest: mockRunWeeklyIngest,
  getGscHealth: mockGetGscHealth,
}));

jest.mock('../../server/src/services/gsc/bucketClassifier', () => ({
  INSIGHT_BUCKETS: ['winnable_loss', 'content_gap', 'trend_signal', 'decay'],
  listInsights: mockListInsights,
  getInsightDetail: mockGetInsightDetail,
  dismissInsight: mockDismissInsight,
  markInsightActioned: mockMarkInsightActioned,
}));

jest.mock('../../server/src/services/gsc/queryClusterer', () => ({
  CLUSTER_BUCKETS: ['cluster_content_gap', 'cluster_near_win', 'cluster_topic_theme'],
  CLUSTER_HORIZONS: ['28d', '90d'],
  listClusters: mockListClusters,
  getClusterDetail: mockGetClusterDetail,
  dismissCluster: mockDismissCluster,
  markClusterActioned: mockMarkClusterActioned,
}));

jest.mock('../../server/src/services/seo/metadataRewriter', () => ({
  proposeRewrite: mockProposeRewrite,
  shipRewrite: mockShipRewrite,
  listSeoActions: mockListSeoActions,
  rollbackSeoAction: mockRollbackSeoAction,
}));

jest.mock('../../server/src/services/seo/feedbackMeasurement', () => ({
  listPendingFeedbackActions: mockListPendingFeedbackActions,
  measureSeoAction: mockMeasureSeoAction,
}));

jest.mock('../../server/src/services/seo/agentControl', () => ({
  isPaused: mockIsPaused,
  setPaused: mockSetPaused,
}));

jest.mock('../../server/src/services/seo/briefGenerator', () => ({
  listSeoProposals: mockListSeoProposals,
  generateProposal: mockGenerateProposal,
  generateProposalFromCluster: mockGenerateProposalFromCluster,
  generateProposalFromKeywordOpportunity: mockGenerateProposalFromKeywordOpportunity,
  generateEvergreenRoutingProposal: mockGenerateEvergreenRoutingProposal,
  generatePackagingFixProposal: mockGeneratePackagingFixProposal,
  approveSeoProposal: mockApproveSeoProposal,
  rejectSeoProposal: mockRejectSeoProposal,
  linkProposalDraft: mockLinkProposalDraft,
}));

jest.mock('../../server/src/services/seo/experimentLedger', () => ({
  listSeoExperiments: mockListSeoExperiments,
  getSeoExperiment: mockGetSeoExperiment,
  reviewSeoExperiment: mockReviewSeoExperiment,
}));

jest.mock('../../server/src/services/seo/serpPackagingAudit', () => ({
  listSeoPackagingAudits: mockListSeoPackagingAudits,
  getSeoPackagingAudit: mockGetSeoPackagingAudit,
}));

jest.mock('../../server/src/services/seo/keywordDiscovery', () => ({
  listKeywordOpportunities: mockListKeywordOpportunities,
  createEditorialKeywordOpportunity: mockCreateEditorialKeywordOpportunity,
  getKeywordOpportunity: mockGetKeywordOpportunity,
  archiveKeywordOpportunity: mockArchiveKeywordOpportunity,
  markKeywordOpportunityPromoted: mockMarkKeywordOpportunityPromoted,
  refreshKeywordOpportunitySerp: mockRefreshKeywordOpportunitySerp,
  rebuildKeywordPortfolio: mockRebuildKeywordPortfolio,
}));

jest.mock('../../server/src/services/seo/serperClient', () => ({
  getSerperUsageSummary: mockGetSerperUsageSummary,
}));

jest.mock('../../server/src/services/seo/agentRunStatus', () => ({
  getLatestAgentRunStatus: mockGetLatestAgentRunStatus,
  setLatestAgentRunStatus: mockSetLatestAgentRunStatus,
}));

import {
  action,
  actionClusterOpportunity,
  actions,
  clusterDetail,
  createPortfolioEditorialSeed,
  detail,
  dismiss,
  dismissClusterOpportunity,
  experiments,
  experimentDetail,
  packaging,
  packagingDetail,
  portfolio,
  portfolioDetail,
  proposePackagingEvergreen,
  proposePackagingFix,
  generateProposalFromClusterOpportunity,
  listClusterOpportunities,
  health,
  ingest,
  linkProposal,
  list,
  measureAction,
  pause,
  pendingFeedback,
  promotePortfolioOpportunity,
  refreshPortfolioOpportunitySerp,
  rebuildPortfolio,
  proposals,
  proposeInsightRewrite,
  approveProposal,
  archivePortfolioOpportunity,
  generateProposalFromInsight,
  rejectProposal,
  reviewExperiment,
  rollback,
  shipInsightRewrite,
  updateRunStatus,
} from '../../server/src/controllers/seoAdmin';

function createResponse(): Response {
  const response = {
    json: jest.fn(),
    status: jest.fn(),
  } as unknown as Response;

  (response.status as unknown as jest.Mock).mockReturnValue(response);
  return response;
}

function createRequest(overrides: Partial<Request> = {}): Request {
  return {
    query: {},
    params: {},
    ...overrides,
  } as unknown as Request;
}

describe('seoAdmin controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPaused.mockResolvedValue(false);
    mockGetLatestAgentRunStatus.mockResolvedValue(null);
    mockGetSerperUsageSummary.mockResolvedValue({
      configured: false,
      enabled: false,
      pricingEnabled: false,
      pausedBySeoAgent: false,
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
  });

  it('returns the ingest summary for manual admin runs', async () => {
    mockRunWeeklyIngest.mockResolvedValue({
      mode: 'weekly',
      startDate: '2026-04-24',
      endDate: '2026-04-30',
      finalizedThroughDate: '2026-04-30',
      dailyRowsInserted: 20,
      dailyRowsAttempted: 24,
      snapshotsCreated: 8,
      weekStartsRebuilt: ['2026-04-24'],
      durationMs: 250,
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await ingest({} as Request, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'weekly',
      dailyRowsInserted: 20,
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('lists SEO insights with pagination and bucket filters', async () => {
    mockListInsights.mockResolvedValue({
      data: [
        {
          id: 'snapshot_1',
          bucket: 'winnable_loss',
        },
      ],
      pagination: { page: 2, limit: 10, total: 1, totalPages: 1 },
      meta: {
        weekStart: '2026-04-24',
        availableWeeks: ['2026-04-24'],
        counts: {
          winnable_loss: 1,
          content_gap: 0,
          trend_signal: 0,
          decay: 0,
        },
      },
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await list(createRequest({
      query: {
        bucket: 'winnable_loss',
        page: '2',
        limit: '10',
        weekStart: '2026-04-24',
      },
    }), res, next);

    expect(mockListInsights).toHaveBeenCalledWith({
      bucket: 'winnable_loss',
      limit: 10,
      page: 2,
      weekStart: '2026-04-24',
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ id: 'snapshot_1' }),
      ]),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns SEO insight detail when the finding exists', async () => {
    mockGetInsightDetail.mockResolvedValue({
      id: 'snapshot_1',
      bucket: 'trend_signal',
      trend: [{ weekStart: '2026-04-24', impressions: 80, clicks: 8, ctr: 0.1, position: 3 }],
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await detail(createRequest({ params: { id: 'snapshot_1' } }), res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'snapshot_1',
      bucket: 'trend_signal',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 for missing SEO insight detail', async () => {
    mockGetInsightDetail.mockResolvedValue(null);

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await detail(createRequest({ params: { id: 'missing' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'SEO insight not found' });
  });

  it('dismisses a finding', async () => {
    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await dismiss(createRequest({ params: { id: 'snapshot_2' } }), res, next);

    expect(mockDismissInsight).toHaveBeenCalledWith('snapshot_2');
    expect(res.json).toHaveBeenCalledWith({ id: 'snapshot_2', status: 'dismissed' });
    expect(next).not.toHaveBeenCalled();
  });

  it('marks a finding as actioned', async () => {
    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await action(createRequest({ params: { id: 'snapshot_3' } }), res, next);

    expect(mockMarkInsightActioned).toHaveBeenCalledWith('snapshot_3');
    expect(res.json).toHaveBeenCalledWith({ id: 'snapshot_3', status: 'actioned' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns health in API-friendly JSON shape', async () => {
    mockGetGscHealth.mockResolvedValue({
      lastRunAt: new Date('2026-05-01T12:00:00.000Z'),
      finalizedThroughDate: '2026-04-30',
      lastRowCount: 120,
      lastWeekCovered: '2026-04-24',
      totalRowsLast30d: 840,
      clusterWindows: {
        '90d': {
          horizon: '90d',
          windowStart: '2026-01-29',
          windowEnd: '2026-04-28',
          clusterCount: 5,
        },
      },
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await health({} as Request, res, next);

    expect(res.json).toHaveBeenCalledWith({
      lastRunAt: '2026-05-01T12:00:00.000Z',
      finalizedThroughDate: '2026-04-30',
      lastRowCount: 120,
      lastWeekCovered: '2026-04-24',
      totalRowsLast30d: 840,
      clusterWindows: {
        '90d': {
          horizon: '90d',
          windowStart: '2026-01-29',
          windowEnd: '2026-04-28',
          clusterCount: 5,
        },
      },
      paused: false,
      agentRun: null,
      serper: {
        configured: false,
        enabled: false,
        pricingEnabled: false,
        pausedBySeoAgent: false,
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
    expect(next).not.toHaveBeenCalled();
  });

  it('lists clustered SEO opportunities with horizon and bucket filters', async () => {
    mockListClusters.mockResolvedValue({
      data: [
        {
          id: 'cluster_1',
          bucket: 'cluster_content_gap',
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      meta: {
        horizon: '90d',
        windowStart: '2026-01-29',
        windowEnd: '2026-04-28',
        counts: {
          cluster_content_gap: 1,
          cluster_near_win: 0,
          cluster_topic_theme: 0,
        },
      },
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await listClusterOpportunities(createRequest({
      query: {
        horizon: '90d',
        bucket: 'cluster_content_gap',
        page: '1',
        limit: '10',
      },
    }), res, next);

    expect(mockListClusters).toHaveBeenCalledWith({
      horizon: '90d',
      bucket: 'cluster_content_gap',
      limit: 10,
      page: 1,
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ id: 'cluster_1' }),
      ]),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns cluster detail and 404s when missing', async () => {
    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    mockGetClusterDetail.mockResolvedValueOnce({
      id: 'cluster_1',
      bucket: 'cluster_near_win',
    });

    await clusterDetail(createRequest({ params: { id: 'cluster_1' } }), res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'cluster_1',
      bucket: 'cluster_near_win',
    }));

    const missingRes = createResponse();
    mockGetClusterDetail.mockResolvedValueOnce(null);
    await clusterDetail(createRequest({ params: { id: 'missing' } }), missingRes, next);

    expect(missingRes.status).toHaveBeenCalledWith(404);
    expect(missingRes.json).toHaveBeenCalledWith({ error: 'SEO cluster not found' });
  });

  it('dismisses and action-marks clustered opportunities', async () => {
    const next = jest.fn() as unknown as NextFunction;
    const dismissRes = createResponse();
    await dismissClusterOpportunity(createRequest({ params: { id: 'cluster_2' } }), dismissRes, next);
    expect(mockDismissCluster).toHaveBeenCalledWith('cluster_2');
    expect(dismissRes.json).toHaveBeenCalledWith({ id: 'cluster_2', status: 'dismissed' });

    const actionRes = createResponse();
    await actionClusterOpportunity(createRequest({ params: { id: 'cluster_3' } }), actionRes, next);
    expect(mockMarkClusterActioned).toHaveBeenCalledWith('cluster_3');
    expect(actionRes.json).toHaveBeenCalledWith({ id: 'cluster_3', status: 'actioned' });
  });

  it('returns a rewrite proposal for a winnable-loss finding', async () => {
    mockProposeRewrite.mockResolvedValue({
      snapshotId: 'snapshot_1',
      proposedTitle: 'Turing Award Quiz: Why Multiple Winners Matter',
      proposedDescription: 'Sharper metadata for the multiple-winners angle.',
      rationale: 'The query intent is clearer in the rewritten metadata.',
      confidence: 0.88,
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await proposeInsightRewrite(createRequest({ params: { id: 'snapshot_1' } }), res, next);

    expect(mockProposeRewrite).toHaveBeenCalledWith('snapshot_1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      snapshotId: 'snapshot_1',
      confidence: 0.88,
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('ships a rewrite and returns the audit-log row', async () => {
    mockShipRewrite.mockResolvedValue({
      id: 'action_1',
      status: 'shipped',
      targetId: 'post_1',
      confidence: 0.9,
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await shipInsightRewrite(createRequest({ params: { id: 'snapshot_1' } }), res, next);

    expect(mockShipRewrite).toHaveBeenCalledWith('snapshot_1', false);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'action_1',
      status: 'shipped',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('lists SEO agent actions with filters', async () => {
    mockListSeoActions.mockResolvedValue({
      data: [
        {
          id: 'action_1',
          status: 'shipped',
        },
      ],
      pagination: {
        page: 2,
        limit: 10,
        total: 11,
        totalPages: 2,
      },
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await actions(createRequest({
      query: {
        targetType: 'blog_post',
        page: '2',
        limit: '10',
        status: 'shipped',
      },
    }), res, next);

    expect(mockListSeoActions).toHaveBeenCalledWith({
      targetType: 'blog_post',
      page: 2,
      limit: 10,
      status: 'shipped',
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ id: 'action_1' }),
      ]),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('lists SEO proposals using the requested status filter', async () => {
    mockListSeoProposals.mockResolvedValue({
      data: [
        {
          id: 'proposal_1',
          status: 'pending',
        },
      ],
      pagination: {
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1,
      },
      meta: {
        counts: {
          all: 1,
          pending: 1,
          drafting: 0,
          approved: 0,
          rejected: 0,
          shipped: 0,
        },
      },
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await proposals(createRequest({
      query: {
        status: 'pending',
        page: '1',
        limit: '25',
      },
    }), res, next);

    expect(mockListSeoProposals).toHaveBeenCalledWith({
      status: 'pending',
      page: 1,
      limit: 25,
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ id: 'proposal_1' }),
      ]),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('generates a proposal from an eligible insight', async () => {
    mockGenerateProposal.mockResolvedValue({
      id: 'proposal_1',
      targetKeyword: 'AI agents in healthcare',
      status: 'pending',
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await generateProposalFromInsight(createRequest({ params: { id: 'snapshot_9' } }), res, next);

    expect(mockGenerateProposal).toHaveBeenCalledWith('snapshot_9');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'proposal_1',
      status: 'pending',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('generates a proposal from a cluster opportunity', async () => {
    mockGenerateProposalFromCluster.mockResolvedValue({
      id: 'proposal_cluster_1',
      sourceType: 'cluster_snapshot',
      status: 'pending',
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await generateProposalFromClusterOpportunity(createRequest({ params: { id: 'cluster_9' } }), res, next);

    expect(mockGenerateProposalFromCluster).toHaveBeenCalledWith('cluster_9');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'proposal_cluster_1',
      sourceType: 'cluster_snapshot',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('generates an evergreen routing proposal from a packaging audit', async () => {
    mockGetSeoPackagingAudit.mockResolvedValue({
      id: 'packaging_1',
      evergreenRecommendation: {
        clusterId: 'cluster_9',
      },
    });
    mockGenerateEvergreenRoutingProposal.mockResolvedValue({
      id: 'proposal_routing_1',
      proposalType: 'evergreen_routing',
      status: 'pending',
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await proposePackagingEvergreen(createRequest({ params: { id: 'packaging_1' } }), res, next);

    expect(mockGetSeoPackagingAudit).toHaveBeenCalledWith('packaging_1');
    expect(mockGenerateEvergreenRoutingProposal).toHaveBeenCalledWith('cluster_9');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'proposal_routing_1',
      proposalType: 'evergreen_routing',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('generates a packaging-fix proposal from a packaging audit', async () => {
    mockGetSeoPackagingAudit.mockResolvedValue({
      id: 'packaging_1',
      issues: [
        {
          type: 'title_link_risk',
        },
      ],
    });
    mockGeneratePackagingFixProposal.mockResolvedValue({
      id: 'proposal_fix_1',
      proposalType: 'packaging_fix',
      status: 'pending',
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await proposePackagingFix(createRequest({ params: { id: 'packaging_1' } }), res, next);

    expect(mockGetSeoPackagingAudit).toHaveBeenCalledWith('packaging_1');
    expect(mockGeneratePackagingFixProposal).toHaveBeenCalledWith('packaging_1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'proposal_fix_1',
      proposalType: 'packaging_fix',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('approves a proposal and returns the /AIBlogDraft handoff payload', async () => {
    mockApproveSeoProposal.mockResolvedValue({
      proposal: {
        id: 'proposal_1',
        status: 'drafting',
      },
      handoff: {
        command: '/AIBlogDraft topic: "Why AI agent pilots in healthcare keep hitting workflow bottlenecks"',
      },
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await approveProposal(createRequest({ params: { id: 'proposal_1' } }), res, next);

    expect(mockApproveSeoProposal).toHaveBeenCalledWith('proposal_1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      proposal: expect.objectContaining({ status: 'drafting' }),
      handoff: expect.objectContaining({ command: expect.stringContaining('/AIBlogDraft') }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a proposal when a reason is supplied', async () => {
    mockRejectSeoProposal.mockResolvedValue({
      id: 'proposal_1',
      status: 'rejected',
      rejectedReason: 'Too broad and too close to an existing glossary page.',
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await rejectProposal(createRequest({
      params: { id: 'proposal_1' },
      body: { reason: 'Too broad and too close to an existing glossary page.' },
    }), res, next);

    expect(mockRejectSeoProposal).toHaveBeenCalledWith(
      'proposal_1',
      'Too broad and too close to an existing glossary page.'
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'rejected',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when rejecting a proposal without a reason', async () => {
    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await rejectProposal(createRequest({
      params: { id: 'proposal_1' },
      body: { reason: '   ' },
    }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'reason is required' });
    expect(mockRejectSeoProposal).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('links a generated draft back to the proposal', async () => {
    mockLinkProposalDraft.mockResolvedValue({
      id: 'proposal_1',
      status: 'approved',
      draftPost: {
        id: 'post_1',
      },
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await linkProposal(createRequest({
      params: { id: 'proposal_1' },
      body: { draftPostId: 'post_1' },
    }), res, next);

    expect(mockLinkProposalDraft).toHaveBeenCalledWith('proposal_1', 'post_1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'approved',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when link-draft is missing a draftPostId', async () => {
    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await linkProposal(createRequest({
      params: { id: 'proposal_1' },
      body: {},
    }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'draftPostId is required' });
    expect(mockLinkProposalDraft).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('lists experiments with the requested status filter', async () => {
    mockListSeoExperiments.mockResolvedValue({
      data: [{ id: 'experiment_1', status: 'running' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      meta: {
        dueCount: 1,
        counts: {
          all: 1,
          planned: 0,
          running: 1,
          won: 0,
          flat: 0,
          lost: 0,
          archived: 0,
        },
      },
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await experiments(createRequest({
      query: {
        status: 'running',
        page: '1',
        limit: '10',
      },
    }), res, next);

    expect(mockListSeoExperiments).toHaveBeenCalledWith({
      status: 'running',
      page: 1,
      limit: 10,
    });
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns experiment detail and reviews a due checkpoint', async () => {
    mockGetSeoExperiment.mockResolvedValue({ id: 'experiment_1', status: 'planned' });
    mockReviewSeoExperiment.mockResolvedValue({ id: 'experiment_1', status: 'running' });

    const detailRes = createResponse();
    const reviewRes = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await experimentDetail(createRequest({ params: { id: 'experiment_1' } }), detailRes, next);
    await reviewExperiment(createRequest({ params: { id: 'experiment_1' } }), reviewRes, next);

    expect(mockGetSeoExperiment).toHaveBeenCalledWith('experiment_1');
    expect(detailRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'experiment_1' }));
    expect(mockReviewSeoExperiment).toHaveBeenCalledWith('experiment_1');
    expect(reviewRes.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'running' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('lists packaging audits and returns a packaging detail record', async () => {
    mockListSeoPackagingAudits.mockResolvedValue({
      data: [{ id: 'packaging_1', pagePath: '/news' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      meta: {
        windowStart: '2026-01-29',
        windowEnd: '2026-04-28',
        counts: {
          all: 1,
          critical: 1,
          warning: 0,
          info: 0,
        },
      },
    });
    mockGetSeoPackagingAudit.mockResolvedValue({ id: 'packaging_1', pagePath: '/news' });

    const listRes = createResponse();
    const detailRes = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await packaging(createRequest({
      query: {
        page: '1',
        limit: '10',
      },
    }), listRes, next);
    await packagingDetail(createRequest({ params: { id: 'packaging_1' } }), detailRes, next);

    expect(mockListSeoPackagingAudits).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
    expect(listRes.json).toHaveBeenCalled();
    expect(mockGetSeoPackagingAudit).toHaveBeenCalledWith('packaging_1');
    expect(detailRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'packaging_1' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('lists keyword opportunities, returns detail, and rebuilds the portfolio', async () => {
    mockListKeywordOpportunities.mockResolvedValue({
      data: [{ id: 'kw_1', seedQuery: 'mixture of experts' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      meta: {
        counts: {
          all: 1,
          discovered: 0,
          scored: 1,
          promoted: 0,
          archived: 0,
        },
        sourceCounts: {
          all: 1,
          gsc_cluster: 1,
          google_trends: 0,
          serp_sample: 0,
          editorial_seed: 0,
        },
      },
    });
    mockGetKeywordOpportunity.mockResolvedValue({
      id: 'kw_1',
      seedQuery: 'mixture of experts',
      status: 'scored',
    });
    mockRebuildKeywordPortfolio.mockResolvedValue({
      created: 10,
      updated: 0,
      archived: 0,
      totalActive: 10,
      candidateCount: 10,
      sourcesUsed: ['gsc_cluster'],
    });

    const listRes = createResponse();
    const detailRes = createResponse();
    const rebuildRes = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await portfolio(createRequest({
      query: {
        page: '1',
        limit: '10',
        status: 'scored',
        sourceType: 'gsc_cluster',
      },
    }), listRes, next);
    await portfolioDetail(createRequest({ params: { id: 'kw_1' } }), detailRes, next);
    await rebuildPortfolio(createRequest(), rebuildRes, next);

    expect(mockListKeywordOpportunities).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: 'scored',
      sourceType: 'gsc_cluster',
    });
    expect(listRes.json).toHaveBeenCalled();
    expect(mockGetKeywordOpportunity).toHaveBeenCalledWith('kw_1');
    expect(detailRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'kw_1' }));
    expect(rebuildRes.json).toHaveBeenCalledWith(expect.objectContaining({
      created: 10,
      totalActive: 10,
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('promotes an eligible keyword opportunity into the proposal lane', async () => {
    mockGetKeywordOpportunity.mockResolvedValue({
      id: 'kw_1',
      sourceType: 'gsc_cluster',
      seedQuery: 'ai timeline',
      status: 'scored',
      pageTypeRecommendation: 'blog_post',
      clusterSnapshotId: 'cluster_1',
    });
    mockGenerateProposalFromCluster.mockResolvedValue({
      id: 'proposal_1',
      targetKeyword: 'ai timeline',
      status: 'pending',
    });
    mockMarkKeywordOpportunityPromoted.mockResolvedValue({
      id: 'kw_1',
      seedQuery: 'ai timeline',
      status: 'promoted',
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await promotePortfolioOpportunity(createRequest({ params: { id: 'kw_1' } }), res, next);

    expect(mockGetKeywordOpportunity).toHaveBeenCalledWith('kw_1');
    expect(mockGenerateProposalFromCluster).toHaveBeenCalledWith('cluster_1');
    expect(mockMarkKeywordOpportunityPromoted).toHaveBeenCalledWith('kw_1');
    expect(res.json).toHaveBeenCalledWith({
      opportunity: expect.objectContaining({ id: 'kw_1', status: 'promoted' }),
      proposal: expect.objectContaining({ id: 'proposal_1', targetKeyword: 'ai timeline' }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('promotes an editorial-seed keyword opportunity into the proposal lane', async () => {
    mockGetKeywordOpportunity.mockResolvedValue({
      id: 'kw_seed_1',
      sourceType: 'editorial_seed',
      seedQuery: 'ai agent memory',
      status: 'scored',
      pageTypeRecommendation: 'blog_post',
      clusterSnapshotId: null,
      targetUrl: 'https://letaiexplainai.com/blog/ai-agent-memory',
    });
    mockGenerateProposalFromKeywordOpportunity.mockResolvedValue({
      id: 'proposal_seed_1',
      targetKeyword: 'ai agent memory',
      status: 'pending',
    });
    mockMarkKeywordOpportunityPromoted.mockResolvedValue({
      id: 'kw_seed_1',
      seedQuery: 'ai agent memory',
      status: 'promoted',
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await promotePortfolioOpportunity(createRequest({ params: { id: 'kw_seed_1' } }), res, next);

    expect(mockGetKeywordOpportunity).toHaveBeenCalledWith('kw_seed_1');
    expect(mockGenerateProposalFromKeywordOpportunity).toHaveBeenCalledWith('kw_seed_1');
    expect(mockMarkKeywordOpportunityPromoted).toHaveBeenCalledWith('kw_seed_1');
    expect(res.json).toHaveBeenCalledWith({
      opportunity: expect.objectContaining({ id: 'kw_seed_1', status: 'promoted' }),
      proposal: expect.objectContaining({ id: 'proposal_seed_1', targetKeyword: 'ai agent memory' }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('promotes a SERP-sampled keyword opportunity through the keyword-opportunity proposal lane', async () => {
    mockGetKeywordOpportunity.mockResolvedValue({
      id: 'kw_serp_1',
      sourceType: 'serp_sample',
      seedQuery: 'ai timeline',
      status: 'scored',
      pageTypeRecommendation: 'blog_post',
      clusterSnapshotId: 'cluster_1',
      targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
    });
    mockGenerateProposalFromKeywordOpportunity.mockResolvedValue({
      id: 'proposal_serp_1',
      targetKeyword: 'ai timeline',
      status: 'pending',
    });
    mockMarkKeywordOpportunityPromoted.mockResolvedValue({
      id: 'kw_serp_1',
      seedQuery: 'ai timeline',
      status: 'promoted',
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await promotePortfolioOpportunity(createRequest({ params: { id: 'kw_serp_1' } }), res, next);

    expect(mockGetKeywordOpportunity).toHaveBeenCalledWith('kw_serp_1');
    expect(mockGenerateProposalFromKeywordOpportunity).toHaveBeenCalledWith('kw_serp_1');
    expect(mockGenerateProposalFromCluster).not.toHaveBeenCalled();
    expect(mockMarkKeywordOpportunityPromoted).toHaveBeenCalledWith('kw_serp_1');
    expect(res.json).toHaveBeenCalledWith({
      opportunity: expect.objectContaining({ id: 'kw_serp_1', status: 'promoted' }),
      proposal: expect.objectContaining({ id: 'proposal_serp_1', targetKeyword: 'ai timeline' }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('refreshes a SERP-sampled keyword opportunity in place', async () => {
    mockRefreshKeywordOpportunitySerp.mockResolvedValue({
      id: 'kw_serp_1',
      sourceType: 'serp_sample',
      seedQuery: 'ai timeline',
      status: 'scored',
      competitionProxy: 28,
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await refreshPortfolioOpportunitySerp(createRequest({ params: { id: 'kw_serp_1' } }), res, next);

    expect(mockRefreshKeywordOpportunitySerp).toHaveBeenCalledWith('kw_serp_1');
    expect(res.json).toHaveBeenCalledWith({
      opportunity: expect.objectContaining({
        id: 'kw_serp_1',
        sourceType: 'serp_sample',
        competitionProxy: 28,
      }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('archives an active keyword opportunity', async () => {
    mockGetKeywordOpportunity.mockResolvedValue({
      id: 'kw_1',
      sourceType: 'gsc_cluster',
      seedQuery: 'mixture of experts',
      status: 'scored',
      pageTypeRecommendation: 'explainer_page',
      clusterSnapshotId: 'cluster_1',
      targetUrl: 'https://letaiexplainai.com/explained/mixture-of-experts-moe',
    });
    mockArchiveKeywordOpportunity.mockResolvedValue({
      id: 'kw_1',
      seedQuery: 'mixture of experts',
      status: 'archived',
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await archivePortfolioOpportunity(createRequest({ params: { id: 'kw_1' } }), res, next);

    expect(mockGetKeywordOpportunity).toHaveBeenCalledWith('kw_1');
    expect(mockArchiveKeywordOpportunity).toHaveBeenCalledWith('kw_1');
    expect(res.json).toHaveBeenCalledWith({
      opportunity: expect.objectContaining({ id: 'kw_1', status: 'archived' }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('creates an editorial seed keyword opportunity', async () => {
    mockCreateEditorialKeywordOpportunity.mockResolvedValue({
      id: 'kw_seed_1',
      seedQuery: 'ai agent memory',
      sourceType: 'editorial_seed',
      status: 'scored',
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await createPortfolioEditorialSeed(createRequest({
      body: {
        seedQuery: 'ai agent memory',
        pageTypeRecommendation: 'blog_post',
        targetUrl: '/blog/ai-agent-memory',
        demandProxy: 65,
        competitionProxy: 35,
        laeaFitScore: 80,
        rationale: 'Manual seed from strategy review.',
      },
    }), res, next);

    expect(mockCreateEditorialKeywordOpportunity).toHaveBeenCalledWith({
      seedQuery: 'ai agent memory',
      pageTypeRecommendation: 'blog_post',
      targetUrl: '/blog/ai-agent-memory',
      demandProxy: 65,
      competitionProxy: 35,
      laeaFitScore: 80,
      rationale: 'Manual seed from strategy review.',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'kw_seed_1',
      sourceType: 'editorial_seed',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('lists pending feedback actions that are ready to measure', async () => {
    mockListPendingFeedbackActions.mockResolvedValue([
      {
        id: 'action_1',
        pageUrl: 'https://letaiexplainai.com/blog/turing-award-quiz',
        shippedAt: '2026-04-01T15:00:00.000Z',
        afterEnd: '2026-04-08',
      },
    ]);

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await pendingFeedback({} as Request, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'action_1',
          afterEnd: '2026-04-08',
        }),
      ],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('measures a shipped rewrite action and returns the stored delta', async () => {
    mockMeasureSeoAction.mockResolvedValue({
      actionId: 'action_1',
      pageUrl: 'https://letaiexplainai.com/blog/turing-award-quiz',
      ctrBefore: 0.08,
      ctrAfter: 0.12,
      avgPositionBefore: 5.3,
      avgPositionAfter: 4.8,
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await measureAction(createRequest({ params: { id: 'action_1' } }), res, next);

    expect(mockMeasureSeoAction).toHaveBeenCalledWith('action_1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      actionId: 'action_1',
      ctrAfter: 0.12,
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('rolls back a shipped SEO action', async () => {
    mockRollbackSeoAction.mockResolvedValue({
      id: 'action_1',
      status: 'rolled_back',
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await rollback(createRequest({ params: { id: 'action_1' } }), res, next);

    expect(mockRollbackSeoAction).toHaveBeenCalledWith('action_1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'action_1',
      status: 'rolled_back',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('toggles the SEO pause switch when the request body is valid', async () => {
    mockSetPaused.mockResolvedValue(true);

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await pause(createRequest({ body: { paused: true } }), res, next);

    expect(mockSetPaused).toHaveBeenCalledWith(true);
    expect(res.json).toHaveBeenCalledWith({ paused: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects pause updates when paused is not a boolean', async () => {
    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await pause(createRequest({ body: { paused: 'yes' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'paused must be a boolean' });
    expect(mockSetPaused).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('stores the latest scheduled agent run summary', async () => {
    mockSetLatestAgentRunStatus.mockResolvedValue({
      status: 'success',
      startedAt: '2026-05-05T13:00:00.000Z',
      completedAt: '2026-05-05T13:03:00.000Z',
      weekStart: '2026-04-28T00:00:00.000Z',
      shippedCount: 2,
      proposalCount: 1,
      humanOnlyCount: 0,
      measuredCount: 1,
      digestUrl: 'https://discord.com/channels/1/2/3',
      errorMessage: null,
    });

    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await updateRunStatus(createRequest({
      body: {
        status: 'success',
        startedAt: '2026-05-05T13:00:00.000Z',
        completedAt: '2026-05-05T13:03:00.000Z',
        weekStart: '2026-04-28T00:00:00.000Z',
        shippedCount: 2,
        proposalCount: 1,
        measuredCount: 1,
        digestUrl: 'https://discord.com/channels/1/2/3',
      },
    }), res, next);

    expect(mockSetLatestAgentRunStatus).toHaveBeenCalledWith({
      status: 'success',
      startedAt: '2026-05-05T13:00:00.000Z',
      completedAt: '2026-05-05T13:03:00.000Z',
      weekStart: '2026-04-28T00:00:00.000Z',
      shippedCount: 2,
      proposalCount: 1,
      humanOnlyCount: 0,
      measuredCount: 1,
      digestUrl: 'https://discord.com/channels/1/2/3',
      errorMessage: null,
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      shippedCount: 2,
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid run-status payloads', async () => {
    const res = createResponse();
    const next = jest.fn() as unknown as NextFunction;

    await updateRunStatus(createRequest({
      body: {
        status: 'paused',
        startedAt: 'not-a-date',
        completedAt: '2026-05-05T13:03:00.000Z',
      },
    }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'status must be success or failed' });
    expect(mockSetLatestAgentRunStatus).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

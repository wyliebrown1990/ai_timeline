import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { BucketInsight, InsightBucket } from '../../../server/src/services/gsc/bucketClassifier';
import type { KeywordOpportunityRecord } from '../../../server/src/services/seo/keywordDiscovery';
import type { SeoPackagingAuditRecord } from '../../../server/src/services/seo/serpPackagingAudit';
import type { SerperUsageSummary } from '../../../server/src/services/seo/serperClient';

const mockGetGscHealth = jest.fn();
const mockGetLatestGscRunStatus = jest.fn();
const mockListInsights = jest.fn();
const mockIsPaused = jest.fn();
const mockGetLatestAgentRunStatus = jest.fn();
const mockSetLatestAgentRunStatus = jest.fn();
const mockGetSerperUsageSummary = jest.fn();
const mockListPendingFeedbackActions = jest.fn();
const mockMeasureSeoAction = jest.fn();
const mockShipRewrite = jest.fn();
const mockGenerateProposal = jest.fn();
const mockGenerateEvergreenRoutingProposal = jest.fn();
const mockGeneratePackagingFixProposal = jest.fn();
const mockGenerateProposalFromKeywordOpportunity = jest.fn();
const mockListSeoPackagingAudits = jest.fn();
const mockListKeywordOpportunities = jest.fn();
const mockMarkKeywordOpportunityPromoted = jest.fn();

jest.mock('../../../server/src/services/gsc/gscIngest', () => ({
  getGscHealth: mockGetGscHealth,
}));

jest.mock('../../../server/src/services/gsc/gscRunStatus', () => ({
  getLatestGscRunStatus: mockGetLatestGscRunStatus,
}));

jest.mock('../../../server/src/services/gsc/bucketClassifier', () => ({
  listInsights: mockListInsights,
}));

jest.mock('../../../server/src/services/seo/agentControl', () => ({
  isPaused: mockIsPaused,
}));

jest.mock('../../../server/src/services/seo/agentRunStatus', () => ({
  getLatestAgentRunStatus: mockGetLatestAgentRunStatus,
  setLatestAgentRunStatus: mockSetLatestAgentRunStatus,
}));

jest.mock('../../../server/src/services/seo/serperClient', () => ({
  getSerperUsageSummary: mockGetSerperUsageSummary,
}));

jest.mock('../../../server/src/services/seo/feedbackMeasurement', () => ({
  listPendingFeedbackActions: mockListPendingFeedbackActions,
  measureSeoAction: mockMeasureSeoAction,
}));

jest.mock('../../../server/src/services/seo/metadataRewriter', () => ({
  shipRewrite: mockShipRewrite,
}));

jest.mock('../../../server/src/services/seo/briefGenerator', () => ({
  generateProposal: mockGenerateProposal,
  generateEvergreenRoutingProposal: mockGenerateEvergreenRoutingProposal,
  generatePackagingFixProposal: mockGeneratePackagingFixProposal,
  generateProposalFromKeywordOpportunity: mockGenerateProposalFromKeywordOpportunity,
}));

jest.mock('../../../server/src/services/seo/serpPackagingAudit', () => ({
  listSeoPackagingAudits: mockListSeoPackagingAudits,
}));

jest.mock('../../../server/src/services/seo/keywordDiscovery', () => ({
  listKeywordOpportunities: mockListKeywordOpportunities,
  markKeywordOpportunityPromoted: mockMarkKeywordOpportunityPromoted,
}));

import { ApiError } from '../../../server/src/middleware/error';
import {
  runSeoWeeklyDigest,
  weeklyDigestRunnerTestInternals,
} from '../../../server/src/services/seo/weeklyDigestRunner';

let insightRowsByBucket: Partial<Record<InsightBucket, BucketInsight[]>>;

const SERPER_SUMMARY: SerperUsageSummary = {
  configured: true,
  enabled: true,
  pricingEnabled: true,
  pausedBySeoAgent: false,
  tierLabel: 'starter',
  purchasedCredits: 50_000,
  monthlyCreditBudget: 2_500,
  creditsUsedWeek: 4,
  creditsUsedMonth: 40,
  effectiveSpendWeekUsd: 0.004,
  effectiveSpendMonthUsd: 0.04,
  remainingCredits: 49_960,
  remainingCreditsSource: 'policy_derived',
  remainingCreditsObservedAt: '2026-05-05T12:00:00.000Z',
  projectedDepletionDate: null,
  lastSampledAt: '2026-05-05T12:00:00.000Z',
  autoTopupEnabled: false,
  warningLevel: 'ok',
  policy: {
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
  },
};

function bucketResult(bucket: InsightBucket): {
  data: BucketInsight[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  meta: { weekStart: string; availableWeeks: string[]; counts: Record<InsightBucket, number> };
} {
  const data = insightRowsByBucket[bucket] ?? [];
  return {
    data,
    pagination: {
      page: 1,
      limit: 50,
      total: data.length,
      totalPages: 1,
    },
    meta: {
      weekStart: '2026-04-24',
      availableWeeks: ['2026-04-24'],
      counts: {
        winnable_loss: 0,
        content_gap: 0,
        trend_signal: 0,
        decay: 0,
      },
    },
  };
}

function insight(overrides: Partial<BucketInsight>): BucketInsight {
  return {
    id: 'insight-1',
    weekStart: '2026-04-24',
    bucket: 'content_gap',
    status: 'open',
    query: 'ai timeline',
    page: 'https://letaiexplainai.com/blog/ai-timeline',
    currentMetrics: {
      clicks: 2,
      impressions: 120,
      ctr: 0.016,
      position: 8,
    },
    baselineMetrics: null,
    score: 60,
    evidence: 'Evidence',
    suggestedAction: 'Create a better canonical answer.',
    canonicalPath: null,
    ...overrides,
  };
}

function keyword(overrides: Partial<KeywordOpportunityRecord>): KeywordOpportunityRecord {
  return {
    id: 'keyword-1',
    sourceType: 'serp_sample',
    dedupeKey: 'keyword-1',
    seedQuery: 'ai agents explained',
    clusterKey: null,
    clusterSnapshotId: null,
    targetIntent: 'learn',
    demandProxy: 80,
    competitionProxy: 30,
    laeaFitScore: 80,
    overallScore: 70,
    pageTypeRecommendation: 'blog_post',
    targetUrl: null,
    rationale: 'Good demand and fit.',
    status: 'scored',
    linkedExperimentId: null,
    sourceRef: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function packaging(overrides: Partial<SeoPackagingAuditRecord>): SeoPackagingAuditRecord {
  return {
    id: 'packaging-1',
    windowStart: '2026-02-01',
    windowEnd: '2026-05-01',
    pageUrl: 'https://letaiexplainai.com/blog/ai-agents',
    pagePath: '/blog/ai-agents',
    pageType: 'blog_post',
    title: 'AI Agents',
    h1: 'AI Agents',
    description: 'Short',
    canonicalPath: '/blog/ai-agents',
    impressions: 150,
    clicks: 2,
    ctr: 0.013,
    position: 9,
    issueCount: 1,
    criticalCount: 0,
    experimentActive: false,
    issueTypes: ['metadata_thin'],
    issues: [{
      id: 'issue-1',
      type: 'metadata_thin',
      severity: 'warning',
      label: 'Metadata is thin',
      details: 'Description is thin.',
      recommendedFix: 'Rewrite metadata.',
    }],
    structuredDataTypes: [],
    evergreenRecommendation: null,
    existingPackagingFixProposal: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  insightRowsByBucket = {};

  mockGetGscHealth.mockResolvedValue({
    paused: false,
    lastWeekCovered: '2026-04-24',
    finalizedThroughDate: '2026-04-30',
    agentRun: null,
    serper: SERPER_SUMMARY,
  });
  mockGetLatestGscRunStatus.mockResolvedValue(null);
  mockIsPaused.mockResolvedValue(false);
  mockGetLatestAgentRunStatus.mockResolvedValue(null);
  mockSetLatestAgentRunStatus.mockResolvedValue({});
  mockGetSerperUsageSummary.mockResolvedValue(SERPER_SUMMARY);
  mockListPendingFeedbackActions.mockResolvedValue([]);
  mockMeasureSeoAction.mockResolvedValue({});
  mockShipRewrite.mockResolvedValue({});
  mockGenerateProposal.mockResolvedValue({});
  mockGenerateEvergreenRoutingProposal.mockResolvedValue({});
  mockGeneratePackagingFixProposal.mockResolvedValue({});
  mockGenerateProposalFromKeywordOpportunity.mockResolvedValue({ status: 'pending' });
  mockListSeoPackagingAudits.mockResolvedValue({
    data: [],
    pagination: { page: 1, limit: 100, total: 0, totalPages: 1 },
    meta: { windowStart: '2026-02-01', windowEnd: '2026-05-01', counts: { all: 0, critical: 0, warning: 0, info: 0 } },
  });
  mockListKeywordOpportunities.mockResolvedValue({
    data: [],
    pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
    meta: { counts: { all: 0, discovered: 0, scored: 0, promoted: 0, archived: 0 }, sourceCounts: { all: 0, gsc_cluster: 0, google_trends: 0, serp_sample: 0, editorial_seed: 0 }, serper: SERPER_SUMMARY },
  });
  mockListInsights.mockImplementation(async ({ bucket }: { bucket: InsightBucket }) => bucketResult(bucket));
});

describe('weeklyDigestRunner classification', () => {
  it('classifies content, packaging, and keyword candidates with weekly caps', () => {
    const insightCandidates = weeklyDigestRunnerTestInternals.collectInsightCandidates([
      insight({ id: 'low-content', bucket: 'content_gap', score: 59 }),
      insight({ id: 'trend-proposal', bucket: 'trend_signal', score: 60 }),
      insight({ id: 'win-auto', bucket: 'winnable_loss', score: 80, currentMetrics: { clicks: 0, impressions: 100, ctr: 0, position: 7 } }),
    ]);
    const keywordCandidates = weeklyDigestRunnerTestInternals.collectKeywordCandidates([
      keyword({ id: 'kw-1', seedQuery: 'one' }),
      keyword({ id: 'kw-2', seedQuery: 'two' }),
      keyword({ id: 'kw-3', seedQuery: 'three' }),
      keyword({ id: 'seed', sourceType: 'editorial_seed', overallScore: 99 }),
    ]);
    const packagingCandidates = weeklyDigestRunnerTestInternals.collectPackagingCandidates([
      packaging({ id: 'packaging-fix' }),
      packaging({
        id: 'packaging-evergreen',
        evergreenRecommendation: {
          clusterId: 'cluster-1',
          representativeQuery: 'ai terms',
          targetPath: '/glossary',
          targetLabel: 'Glossary',
          moveType: 'expand_existing',
          rationale: 'Route to glossary.',
        },
      }),
    ]);

    expect(insightCandidates.autoShip.map((row) => row.id)).toEqual(['win-auto']);
    expect(insightCandidates.proposals.map((row) => row.id)).toEqual(['trend-proposal']);
    expect(insightCandidates.humanOnly.map((row) => row.id)).toEqual(['low-content']);
    expect(keywordCandidates.proposals.map((row) => row.id)).toEqual(['kw-1', 'kw-2']);
    expect(keywordCandidates.humanOnly.map((row) => row.id)).toEqual(['kw-3', 'seed']);
    expect(packagingCandidates.proposals.map((row) => row.kind)).toEqual(['packaging_fix', 'packaging_evergreen']);
  });
});

describe('runSeoWeeklyDigest', () => {
  it('suppresses all mutations while paused but still persists a successful digest-only run', async () => {
    mockIsPaused.mockResolvedValue(true);
    insightRowsByBucket = {
      winnable_loss: [insight({ id: 'auto-1', bucket: 'winnable_loss', score: 85, currentMetrics: { clicks: 1, impressions: 200, ctr: 0.005, position: 7 } })],
      content_gap: [insight({ id: 'proposal-1', bucket: 'content_gap', score: 75 })],
    };
    mockListPendingFeedbackActions.mockResolvedValue([{
      id: 'measure-1',
      snapshotId: null,
      targetId: 'blog-1',
      targetType: 'blog_post',
      pageUrl: 'https://letaiexplainai.com/blog/test',
      query: null,
      shippedAt: '2026-04-01T00:00:00.000Z',
      shippedPtDate: '2026-04-01',
      beforeStart: '2026-03-25',
      beforeEnd: '2026-03-31',
      afterStart: '2026-04-02',
      afterEnd: '2026-04-08',
    }]);
    mockListSeoPackagingAudits.mockResolvedValue({
      data: [packaging({ id: 'packaging-1' })],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      meta: { windowStart: '2026-02-01', windowEnd: '2026-05-01', counts: { all: 1, critical: 0, warning: 1, info: 0 } },
    });
    mockListKeywordOpportunities.mockResolvedValue({
      data: [keyword({ id: 'keyword-1' })],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      meta: { counts: { all: 1, discovered: 0, scored: 1, promoted: 0, archived: 0 }, sourceCounts: { all: 1, gsc_cluster: 0, google_trends: 0, serp_sample: 1, editorial_seed: 0 }, serper: SERPER_SUMMARY },
    });

    const summary = await runSeoWeeklyDigest({ now: new Date('2026-05-05T13:15:00.000Z'), force: true });

    expect(summary.status).toBe('success');
    expect(summary.paused).toBe(true);
    expect(summary.shippedCount).toBe(0);
    expect(summary.proposalCount).toBe(0);
    expect(summary.measuredCount).toBe(0);
    expect(mockMeasureSeoAction).not.toHaveBeenCalled();
    expect(mockShipRewrite).not.toHaveBeenCalled();
    expect(mockGenerateProposal).not.toHaveBeenCalled();
    expect(mockGeneratePackagingFixProposal).not.toHaveBeenCalled();
    expect(mockGenerateProposalFromKeywordOpportunity).not.toHaveBeenCalled();
    expect(mockSetLatestAgentRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      weekStart: '2026-04-24T00:00:00.000Z',
      shippedCount: 0,
      proposalCount: 0,
      measuredCount: 0,
    }));
  });

  it('exits idempotently when the finalized week already succeeded', async () => {
    mockGetLatestAgentRunStatus.mockResolvedValue({
      status: 'success',
      weekStart: '2026-04-24T00:00:00.000Z',
    });

    const summary = await runSeoWeeklyDigest({ now: new Date('2026-05-05T13:15:00.000Z') });

    expect(summary.status).toBe('skipped');
    expect(summary.alreadyCompleted).toBe(true);
    expect(mockListPendingFeedbackActions).not.toHaveBeenCalled();
    expect(mockListInsights).not.toHaveBeenCalled();
    expect(mockSetLatestAgentRunStatus).not.toHaveBeenCalled();
  });

  it('fails loudly when the GSC ingest is stale for the current finalized window', async () => {
    mockGetGscHealth.mockResolvedValue({
      lastWeekCovered: '2026-04-24',
      finalizedThroughDate: '2026-05-08',
    });

    await expect(runSeoWeeklyDigest({
      now: new Date('2026-05-11T13:15:00.000Z'),
    })).rejects.toThrow('GSC data is stale');

    expect(mockListPendingFeedbackActions).not.toHaveBeenCalled();
    expect(mockListInsights).not.toHaveBeenCalled();
    expect(mockSetLatestAgentRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      weekStart: '2026-04-24T00:00:00.000Z',
      errorMessage: expect.stringContaining('GSC data is stale'),
    }));
  });

  it('includes the latest tracked GSC remediation when stale data was caused by auth failure', async () => {
    mockGetGscHealth.mockResolvedValue({
      lastWeekCovered: '2026-04-24',
      finalizedThroughDate: '2026-05-08',
    });
    mockGetLatestGscRunStatus.mockResolvedValue({
      status: 'failed',
      startedAt: '2026-05-11T06:00:00.000Z',
      completedAt: '2026-05-11T06:00:44.000Z',
      startDate: '2026-05-02',
      endDate: '2026-05-08',
      finalizedThroughDate: '2026-05-08',
      dailyRowsInserted: 0,
      dailyRowsAttempted: 0,
      snapshotsCreated: 0,
      durationMs: 44000,
      errorMessage: 'invalid_grant',
      errorCategory: 'auth',
      requiresOperatorAction: true,
      remediation: {
        summary: 'Re-run the OAuth rotation helper.',
        command: 'npm run gsc:oauth-rotate',
        docsPath: '.claude/schedules/seo-weekly.md',
      },
    });

    await expect(runSeoWeeklyDigest({
      now: new Date('2026-05-11T13:15:00.000Z'),
    })).rejects.toThrow('npm run gsc:oauth-rotate');
  });

  it('treats 409 proposal responses as already queued and keeps the run successful', async () => {
    insightRowsByBucket = {
      content_gap: [insight({ id: 'proposal-409', bucket: 'content_gap', score: 80 })],
    };
    mockGenerateProposal.mockRejectedValue(new ApiError(409, 'Proposal already queued'));

    const summary = await runSeoWeeklyDigest({ now: new Date('2026-05-05T13:15:00.000Z'), force: true });

    expect(summary.status).toBe('success');
    expect(summary.proposalCount).toBe(0);
    expect(summary.decisions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'proposal-409',
        status: 'already_queued',
      }),
    ]));
    expect(mockSetLatestAgentRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      proposalCount: 0,
    }));
  });

  it('persists a failed run status before rethrowing unexpected errors', async () => {
    insightRowsByBucket = {
      content_gap: [insight({ id: 'proposal-failure', bucket: 'content_gap', score: 80 })],
    };
    mockGenerateProposal.mockRejectedValue(new Error('Brief generator unavailable'));

    await expect(runSeoWeeklyDigest({
      now: new Date('2026-05-05T13:15:00.000Z'),
      force: true,
    })).rejects.toThrow('Brief generator unavailable');

    expect(mockSetLatestAgentRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      weekStart: '2026-04-24T00:00:00.000Z',
      errorMessage: 'Brief generator unavailable',
    }));
  });
});

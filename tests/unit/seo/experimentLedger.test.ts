import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSeoProposalFindUnique = jest.fn();
const mockSeoExperimentUpsert = jest.fn();
const mockSeoExperimentFindUnique = jest.fn();
const mockSeoExperimentFindMany = jest.fn();
const mockSeoExperimentCount = jest.fn();
const mockSeoExperimentUpdate = jest.fn();
const mockSeoAgentActionFindUnique = jest.fn();
const mockGscDailyMetricFindMany = jest.fn();

jest.mock('../../../server/src/db', () => ({
  prisma: {
    seoProposal: {
      findUnique: mockSeoProposalFindUnique,
    },
    seoExperiment: {
      upsert: mockSeoExperimentUpsert,
      findUnique: mockSeoExperimentFindUnique,
      findMany: mockSeoExperimentFindMany,
      count: mockSeoExperimentCount,
      update: mockSeoExperimentUpdate,
    },
    seoAgentAction: {
      findUnique: mockSeoAgentActionFindUnique,
    },
    gscDailyMetric: {
      findMany: mockGscDailyMetricFindMany,
    },
  },
}));

import {
  ensureExperimentForProposalLink,
  reviewSeoExperiment,
} from '../../../server/src/services/seo/experimentLedger';

function buildProposal() {
  return {
    id: 'proposal_1',
    sourceType: 'cluster_snapshot',
    snapshotId: null,
    clusterSnapshotId: 'cluster_1',
    targetKeyword: 'AI timeline',
    hypothesis: 'A dedicated AI timeline explainer should outperform the generic hub page.',
    rationale: 'Cluster rationale',
    proposalType: 'blog_post',
    topicPodJson: {
      keyword: 'AI timeline',
      canonicalDestination: {
        path: '/blog/ai-timeline',
      },
    },
    actedAt: new Date('2026-05-01T12:00:00.000Z'),
    draftPost: {
      slug: 'ai-timeline',
      status: 'published',
      publishedAt: new Date('2026-05-01T12:00:00.000Z'),
      scheduledFor: null,
    },
  };
}

function buildExperimentRow() {
  return {
    id: 'experiment_1',
    sourceType: 'cluster_snapshot',
    sourceId: 'cluster_1',
    proposalId: 'proposal_1',
    actionId: null,
    targetKeyword: 'AI timeline',
    targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
    hypothesis: 'A dedicated AI timeline explainer should outperform the generic hub page.',
    variantType: 'blog_post',
    topicPodJson: {
      keyword: 'AI timeline',
    },
    checkpointsJson: [
      {
        label: 'D+14',
        reviewWindowDays: 7,
        scheduledReviewAt: '2026-05-15T00:00:00.000Z',
        state: 'scheduled',
        reviewedAt: null,
        outcome: null,
        metricsAfter: null,
        notes: null,
      },
      {
        label: 'D+28',
        reviewWindowDays: 7,
        scheduledReviewAt: '2026-05-29T00:00:00.000Z',
        state: 'scheduled',
        reviewedAt: null,
        outcome: null,
        metricsAfter: null,
        notes: null,
      },
      {
        label: 'D+56',
        reviewWindowDays: 7,
        scheduledReviewAt: '2026-06-26T00:00:00.000Z',
        state: 'scheduled',
        reviewedAt: null,
        outcome: null,
        metricsAfter: null,
        notes: null,
      },
    ],
    scheduledReviewAt: new Date('2026-05-15T00:00:00.000Z'),
    reviewWindowDays: 7,
    status: 'planned',
    metricsBeforeJson: {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      avgPosition: 0,
      windowStart: '2026-04-24',
      windowEnd: '2026-04-30',
    },
    metricsAfterJson: null,
    notes: null,
    lastReviewedAt: null,
    createdAt: new Date('2026-05-01T12:00:00.000Z'),
    updatedAt: new Date('2026-05-01T12:00:00.000Z'),
  };
}

describe('experimentLedger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSeoProposalFindUnique.mockResolvedValue(buildProposal());
    mockGscDailyMetricFindMany.mockResolvedValue([]);
    mockSeoExperimentUpsert.mockResolvedValue(buildExperimentRow());
    mockSeoExperimentFindMany.mockResolvedValue([]);
    mockSeoExperimentCount.mockResolvedValue(0);
    mockSeoAgentActionFindUnique.mockResolvedValue(null);
    mockSeoExperimentFindUnique.mockResolvedValue(buildExperimentRow());
    mockSeoExperimentUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...buildExperimentRow(),
      ...data,
      scheduledReviewAt: data.scheduledReviewAt ?? buildExperimentRow().scheduledReviewAt,
      reviewWindowDays: data.reviewWindowDays ?? buildExperimentRow().reviewWindowDays,
      status: data.status ?? buildExperimentRow().status,
      checkpointsJson: data.checkpointsJson ?? buildExperimentRow().checkpointsJson,
      metricsAfterJson: data.metricsAfterJson ?? null,
      lastReviewedAt: data.lastReviewedAt ?? null,
    }));
  });

  it('creates a three-checkpoint experiment when a proposal is linked to a draft', async () => {
    const result = await ensureExperimentForProposalLink('proposal_1');

    expect(mockSeoExperimentUpsert).toHaveBeenCalled();
    expect(result.targetUrl).toBe('https://letaiexplainai.com/blog/ai-timeline');
    expect(result.checkpoints).toHaveLength(3);
    expect(result.checkpoints[0].label).toBe('D+14');
  });

  it('reviews the next due checkpoint and advances the experiment', async () => {
    mockSeoExperimentFindUnique.mockResolvedValue({
      ...buildExperimentRow(),
      checkpointsJson: [
        {
          label: 'D+14',
          reviewWindowDays: 7,
          scheduledReviewAt: '2026-05-15T00:00:00.000Z',
          state: 'scheduled',
          reviewedAt: null,
          outcome: null,
          metricsAfter: null,
          notes: null,
        },
        {
          label: 'D+28',
          reviewWindowDays: 7,
          scheduledReviewAt: '2026-05-29T00:00:00.000Z',
          state: 'scheduled',
          reviewedAt: null,
          outcome: null,
          metricsAfter: null,
          notes: null,
        },
      ],
    });
    mockGscDailyMetricFindMany.mockResolvedValue([
      { clicks: 4, impressions: 40, position: 12 },
      { clicks: 3, impressions: 35, position: 10 },
    ]);

    const result = await reviewSeoExperiment('experiment_1', new Date('2026-05-18T12:00:00.000Z'));

    expect(mockSeoExperimentUpdate).toHaveBeenCalled();
    expect(result.status).toBe('running');
    expect(result.checkpoints[0].state).toBe('reviewed');
    expect(result.checkpoints[0].metricsAfter?.impressions).toBe(75);
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSeoAgentActionFindMany = jest.fn();
const mockSeoAgentActionFindUnique = jest.fn();
const mockSeoAgentActionUpdate = jest.fn();
const mockGscDailyMetricFindMany = jest.fn();

jest.mock('../../../server/src/db', () => ({
  prisma: {
    seoAgentAction: {
      findMany: mockSeoAgentActionFindMany,
      findUnique: mockSeoAgentActionFindUnique,
      update: mockSeoAgentActionUpdate,
    },
    gscDailyMetric: {
      findMany: mockGscDailyMetricFindMany,
    },
  },
}));

import {
  listPendingFeedbackActions,
  measureSeoAction,
} from '../../../server/src/services/seo/feedbackMeasurement';

function buildAction(overrides: Partial<{
  id: string;
  snapshotId: string | null;
  actionType: string;
  targetType: string;
  targetId: string;
  shippedAt: Date;
  rolledBackAt: Date | null;
  measuredAt: Date | null;
  measuredDelta: unknown;
  beforeJson: unknown;
  snapshot: {
    id: string;
    page: string;
    query: string | null;
    weekStart: Date;
  } | null;
}> = {}) {
  return {
    id: overrides.id ?? 'action_1',
    snapshotId: overrides.snapshotId ?? 'snapshot_1',
    actionType: overrides.actionType ?? 'metadata_rewrite',
    targetType: overrides.targetType ?? 'blog_post',
    targetId: overrides.targetId ?? 'post_1',
    shippedAt: overrides.shippedAt ?? new Date('2026-04-01T18:00:00.000Z'),
    rolledBackAt: overrides.rolledBackAt ?? null,
    measuredAt: overrides.measuredAt ?? null,
    measuredDelta: overrides.measuredDelta ?? null,
    beforeJson: overrides.beforeJson ?? {
      slug: 'turing-award-quiz',
      pageUrl: 'https://letaiexplainai.com/blog/turing-award-quiz',
      seoTitle: 'Before title',
      seoDescription: 'Before description',
    },
    snapshot: overrides.snapshot ?? {
      id: 'snapshot_1',
      page: 'https://letaiexplainai.com/blog/turing-award-quiz',
      query: 'turing award multiple winners quiz',
      weekStart: new Date('2026-04-01T00:00:00.000Z'),
    },
  };
}

describe('feedbackMeasurement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only actions whose after-window is fully finalized', async () => {
    mockSeoAgentActionFindMany.mockResolvedValue([
      buildAction({
        id: 'eligible_action',
        shippedAt: new Date('2026-04-01T18:00:00.000Z'),
      }),
      buildAction({
        id: 'too_recent_action',
        shippedAt: new Date('2026-04-10T18:00:00.000Z'),
      }),
    ]);

    const result = await listPendingFeedbackActions(new Date('2026-04-15T19:00:00.000Z'));

    expect(mockSeoAgentActionFindMany).toHaveBeenCalledWith({
      where: {
        actionType: 'metadata_rewrite',
        targetType: 'blog_post',
        measuredAt: null,
        rolledBackAt: null,
      },
      orderBy: {
        shippedAt: 'asc',
      },
      include: {
        snapshot: {
          select: {
            id: true,
            page: true,
            query: true,
            weekStart: true,
          },
        },
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'eligible_action',
      shippedPtDate: '2026-04-01',
      beforeStart: '2026-03-25',
      beforeEnd: '2026-03-31',
      afterStart: '2026-04-02',
      afterEnd: '2026-04-08',
    });
  });

  it('computes and stores 7-day before/after page metrics', async () => {
    mockSeoAgentActionFindUnique.mockResolvedValue(buildAction());
    mockGscDailyMetricFindMany
      .mockResolvedValueOnce([
        { clicks: 10, impressions: 100, position: 5 },
        { clicks: 5, impressions: 50, position: 4 },
      ])
      .mockResolvedValueOnce([
        { clicks: 12, impressions: 90, position: 4 },
        { clicks: 10, impressions: 70, position: 3 },
      ]);
    mockSeoAgentActionUpdate.mockResolvedValue({});

    const result = await measureSeoAction('action_1', new Date('2026-04-15T19:00:00.000Z'));

    expect(mockGscDailyMetricFindMany).toHaveBeenNthCalledWith(1, {
      where: {
        dataSource: 'page_aggregate',
        page: 'https://letaiexplainai.com/blog/turing-award-quiz',
        date: {
          gte: new Date('2026-03-25T00:00:00.000Z'),
          lte: new Date('2026-03-31T00:00:00.000Z'),
        },
      },
      select: {
        clicks: true,
        impressions: true,
        position: true,
      },
    });
    expect(mockGscDailyMetricFindMany).toHaveBeenNthCalledWith(2, {
      where: {
        dataSource: 'page_aggregate',
        page: 'https://letaiexplainai.com/blog/turing-award-quiz',
        date: {
          gte: new Date('2026-04-02T00:00:00.000Z'),
          lte: new Date('2026-04-08T00:00:00.000Z'),
        },
      },
      select: {
        clicks: true,
        impressions: true,
        position: true,
      },
    });
    expect(result).toMatchObject({
      actionId: 'action_1',
      pageUrl: 'https://letaiexplainai.com/blog/turing-award-quiz',
      clicksBefore: 15,
      clicksAfter: 22,
      impressionsBefore: 150,
      impressionsAfter: 160,
      ctrBefore: 0.1,
      ctrAfter: 0.1375,
      avgPositionBefore: 4.6667,
      avgPositionAfter: 3.5625,
    });
    expect(mockSeoAgentActionUpdate).toHaveBeenCalledWith({
      where: {
        id: 'action_1',
      },
      data: {
        measuredAt: new Date('2026-04-15T19:00:00.000Z'),
        measuredDelta: expect.objectContaining({
          actionId: 'action_1',
          ctrAfter: 0.1375,
        }),
      },
    });
  });

  it('returns the stored measurement when an action was already measured', async () => {
    const storedMeasurement = {
      actionId: 'action_1',
      pageUrl: 'https://letaiexplainai.com/blog/turing-award-quiz',
      ctrBefore: 0.1,
      ctrAfter: 0.14,
    };
    mockSeoAgentActionFindUnique.mockResolvedValue(buildAction({
      measuredAt: new Date('2026-04-12T12:00:00.000Z'),
      measuredDelta: storedMeasurement,
    }));

    const result = await measureSeoAction('action_1');

    expect(result).toEqual(storedMeasurement);
    expect(mockGscDailyMetricFindMany).not.toHaveBeenCalled();
    expect(mockSeoAgentActionUpdate).not.toHaveBeenCalled();
  });
});

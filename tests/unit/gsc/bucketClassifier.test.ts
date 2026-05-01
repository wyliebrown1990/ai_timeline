import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockWeeklyFindMany = jest.fn();
const mockGroupBy = jest.fn();
const mockFindFirst = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdateMany = jest.fn();
const mockUpdate = jest.fn();
const mockTransaction = jest.fn();
const mockGlossaryTermFindFirst = jest.fn();
const mockMilestoneFindFirst = jest.fn();
const mockMatchPerson = jest.fn();
const mockMatchOrganization = jest.fn();

jest.mock('../../../server/src/db', () => ({
  prisma: {
    gscWeeklySnapshot: {
      findMany: mockWeeklyFindMany,
      groupBy: mockGroupBy,
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
      updateMany: mockUpdateMany,
      update: mockUpdate,
    },
    glossaryTerm: {
      findFirst: mockGlossaryTermFindFirst,
    },
    milestone: {
      findFirst: mockMilestoneFindFirst,
    },
    $transaction: mockTransaction,
  },
}));

jest.mock('../../../server/src/services/entityMatcher', () => ({
  matchPerson: mockMatchPerson,
  matchOrganization: mockMatchOrganization,
}));

import {
  classifyAllBuckets,
  classifyContentGaps,
  classifyDecay,
  classifyTrendSignals,
  classifyWinnableLosses,
} from '../../../server/src/services/gsc/bucketClassifier';

function snapshot(overrides: Partial<{
  id: string;
  weekStart: string;
  query: string | null;
  queryKey: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  status: string;
  bucket: string | null;
  bucketScore: number | null;
}> = {}) {
  const query = overrides.query === undefined ? 'turing award multiple winners quiz' : overrides.query;
  return {
    id: overrides.id ?? `snapshot_${Math.random().toString(36).slice(2, 8)}`,
    weekStart: new Date(`${overrides.weekStart ?? '2026-04-24'}T00:00:00.000Z`),
    dataSource: 'query_detail',
    query,
    queryKey: overrides.queryKey ?? (query ?? '__PAGE_AGGREGATE__'),
    page: overrides.page ?? 'https://letaiexplainai.com/blog/turing-award-quiz',
    clicks: overrides.clicks ?? 8,
    impressions: overrides.impressions ?? 80,
    ctr: overrides.ctr ?? 0.1,
    position: overrides.position ?? 3,
    status: overrides.status ?? 'open',
    bucket: overrides.bucket ?? null,
    bucketScore: overrides.bucketScore ?? null,
  };
}

describe('bucketClassifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGroupBy.mockResolvedValue([]);
    mockFindFirst.mockResolvedValue({ weekStart: new Date('2026-04-24T00:00:00.000Z') });
    mockFindUnique.mockResolvedValue(null);
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockUpdate.mockResolvedValue({});
    mockTransaction.mockImplementation(async (operations: Array<Promise<unknown>>) => Promise.all(operations));
    mockGlossaryTermFindFirst.mockResolvedValue(null);
    mockMilestoneFindFirst.mockResolvedValue(null);
    mockMatchPerson.mockResolvedValue({ matched: false });
    mockMatchOrganization.mockResolvedValue({ matched: false });
  });

  it('classifies winnable losses from trailing historical position cohorts', async () => {
    mockWeeklyFindMany.mockResolvedValue([
      snapshot({
        id: 'low_ctr',
        weekStart: '2026-04-24',
        impressions: 120,
        clicks: 6,
        ctr: 0.05,
        position: 3,
      }),
      snapshot({
        id: 'history_1',
        weekStart: '2026-04-17',
        query: 'alan turing timeline',
        queryKey: 'alan turing timeline',
        impressions: 110,
        clicks: 22,
        ctr: 0.2,
        position: 3,
        page: 'https://letaiexplainai.com/people/alan-turing',
      }),
      snapshot({
        id: 'history_2',
        weekStart: '2026-04-10',
        query: 'history of ai winters',
        queryKey: 'history of ai winters',
        impressions: 95,
        clicks: 15,
        ctr: 0.158,
        position: 3,
        page: 'https://letaiexplainai.com/blog/history-of-ai-winters',
      }),
      snapshot({
        id: 'history_3',
        weekStart: '2026-04-03',
        query: 'what is perceptron',
        queryKey: 'what is perceptron',
        impressions: 90,
        clicks: 14,
        ctr: 0.156,
        position: 3,
        page: 'https://letaiexplainai.com/glossary/perceptron',
      }),
      snapshot({
        id: 'history_4',
        weekStart: '2026-03-27',
        query: 'openai timeline',
        queryKey: 'openai timeline',
        impressions: 130,
        clicks: 21,
        ctr: 0.162,
        position: 3,
        page: 'https://letaiexplainai.com/organizations/openai',
      }),
    ]);

    const results = await classifyWinnableLosses({ weekStart: '2026-04-24' });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'low_ctr',
      bucket: 'winnable_loss',
      currentMetrics: expect.objectContaining({
        impressions: 120,
        ctr: 0.05,
      }),
    });
    expect(results[0].baselineMetrics?.ctr).toBeCloseTo(0.16, 2);
    expect(results[0].evidence).toContain('site median CTR');
  });

  it('falls back to a benchmark CTR when site history is too thin', async () => {
    mockWeeklyFindMany.mockResolvedValue([
      snapshot({
        id: 'benchmark_low_ctr',
        weekStart: '2026-04-24',
        impressions: 120,
        clicks: 6,
        ctr: 0.05,
        position: 3,
      }),
    ]);

    const results = await classifyWinnableLosses({ weekStart: '2026-04-24' });

    expect(results).toHaveLength(1);
    expect(results[0].baselineMetrics?.ctr).toBeCloseTo(0.11, 3);
    expect(results[0].evidence).toContain('benchmark');
  });

  it('does not classify non-blog pages as winnable losses', async () => {
    mockWeeklyFindMany.mockResolvedValue([
      snapshot({
        id: 'non_blog_candidate',
        weekStart: '2026-04-24',
        page: 'https://letaiexplainai.com/news',
        impressions: 120,
        clicks: 0,
        ctr: 0,
        position: 3,
      }),
      snapshot({
        id: 'history_1',
        weekStart: '2026-04-17',
        query: 'alan turing timeline',
        queryKey: 'alan turing timeline',
        impressions: 110,
        clicks: 22,
        ctr: 0.2,
        position: 3,
        page: 'https://letaiexplainai.com/blog/alan-turing-timeline',
      }),
      snapshot({
        id: 'history_2',
        weekStart: '2026-04-10',
        query: 'history of ai winters',
        queryKey: 'history of ai winters',
        impressions: 95,
        clicks: 15,
        ctr: 0.158,
        position: 3,
        page: 'https://letaiexplainai.com/blog/history-of-ai-winters',
      }),
      snapshot({
        id: 'history_3',
        weekStart: '2026-04-03',
        query: 'what is perceptron',
        queryKey: 'what is perceptron',
        impressions: 90,
        clicks: 14,
        ctr: 0.156,
        position: 3,
        page: 'https://letaiexplainai.com/blog/what-is-perceptron',
      }),
      snapshot({
        id: 'history_4',
        weekStart: '2026-03-27',
        query: 'openai timeline',
        queryKey: 'openai timeline',
        impressions: 130,
        clicks: 21,
        ctr: 0.162,
        position: 3,
        page: 'https://letaiexplainai.com/blog/openai-timeline',
      }),
    ]);

    const results = await classifyWinnableLosses({ weekStart: '2026-04-24' });

    expect(results).toHaveLength(0);
  });

  it('classifies content gaps when a query lands on a generic page instead of its canonical entity page', async () => {
    mockWeeklyFindMany.mockResolvedValue([
      snapshot({
        id: 'content_gap',
        query: 'Turing Award',
        queryKey: 'Turing Award',
        page: 'https://letaiexplainai.com/news',
        impressions: 45,
        clicks: 4,
        ctr: 0.089,
      }),
    ]);
    mockGlossaryTermFindFirst.mockResolvedValue({
      slug: 'turing-award',
      term: 'Turing Award',
    });

    const results = await classifyContentGaps({ weekStart: '2026-04-24' });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'content_gap',
      bucket: 'content_gap',
      canonicalPath: '/glossary/turing-award',
    });
    expect(results[0].evidence).toContain('/glossary/turing-award');
  });

  it('classifies trend signals against the trailing four-week baseline', async () => {
    mockWeeklyFindMany.mockResolvedValue([
      snapshot({
        id: 'trend_now',
        weekStart: '2026-04-24',
        impressions: 70,
        clicks: 7,
        ctr: 0.1,
        position: 4,
      }),
      snapshot({
        id: 'trend_prev_1',
        weekStart: '2026-04-17',
        impressions: 20,
        clicks: 2,
        ctr: 0.1,
        position: 4,
      }),
      snapshot({
        id: 'trend_prev_2',
        weekStart: '2026-04-10',
        impressions: 18,
        clicks: 2,
        ctr: 0.11,
        position: 5,
      }),
      snapshot({
        id: 'trend_prev_3',
        weekStart: '2026-04-03',
        impressions: 24,
        clicks: 2,
        ctr: 0.083,
        position: 4,
      }),
      snapshot({
        id: 'trend_prev_4',
        weekStart: '2026-03-27',
        impressions: 22,
        clicks: 2,
        ctr: 0.091,
        position: 5,
      }),
    ]);

    const results = await classifyTrendSignals({ weekStart: '2026-04-24' });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'trend_now',
      bucket: 'trend_signal',
    });
    expect(results[0].baselineMetrics?.impressions).toBeGreaterThan(0);
  });

  it('classifies decay when a previously top-ranked query loses position and impressions', async () => {
    mockWeeklyFindMany.mockResolvedValue([
      snapshot({
        id: 'decay_now',
        weekStart: '2026-04-24',
        impressions: 60,
        clicks: 4,
        ctr: 0.067,
        position: 7,
      }),
      snapshot({
        id: 'decay_prev_1',
        weekStart: '2026-04-17',
        impressions: 110,
        clicks: 18,
        ctr: 0.164,
        position: 2,
      }),
      snapshot({
        id: 'decay_prev_2',
        weekStart: '2026-04-10',
        impressions: 100,
        clicks: 16,
        ctr: 0.16,
        position: 3,
      }),
      snapshot({
        id: 'decay_prev_3',
        weekStart: '2026-04-03',
        impressions: 95,
        clicks: 15,
        ctr: 0.158,
        position: 2.5,
      }),
      snapshot({
        id: 'decay_prev_4',
        weekStart: '2026-03-27',
        impressions: 105,
        clicks: 18,
        ctr: 0.171,
        position: 2,
      }),
    ]);

    const results = await classifyDecay({ weekStart: '2026-04-24' });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'decay_now',
      bucket: 'decay',
    });
    expect(results[0].evidence).toContain('Position slipped');
  });

  it('assigns the highest-priority bucket when a row qualifies for multiple buckets', async () => {
    mockWeeklyFindMany.mockResolvedValue([
      snapshot({
        id: 'priority_row',
        query: 'Turing Award',
        queryKey: 'Turing Award',
        page: 'https://letaiexplainai.com/news',
        impressions: 120,
        clicks: 5,
        ctr: 0.042,
        position: 3,
      }),
      snapshot({
        id: 'peer_row',
        query: 'Alan Turing timeline',
        queryKey: 'Alan Turing timeline',
        page: 'https://letaiexplainai.com/people/alan-turing',
        impressions: 120,
        clicks: 26,
        ctr: 0.217,
        position: 3,
      }),
    ]);
    mockGlossaryTermFindFirst.mockImplementation(async ({ where }: { where: { term?: { equals?: string } } }) => {
      if (where.term?.equals === 'Turing Award') {
        return {
          slug: 'turing-award',
          term: 'Turing Award',
        };
      }
      return null;
    });

    await classifyAllBuckets({ weekStart: '2026-04-24' });

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        weekStart: new Date('2026-04-24T00:00:00.000Z'),
        dataSource: 'query_detail',
      },
      data: {
        bucket: null,
        bucketScore: null,
      },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: {
        id: 'priority_row',
      },
      data: expect.objectContaining({
        bucket: 'content_gap',
      }),
    });
  });
});

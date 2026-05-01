import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockFindManyDaily = jest.fn();
const mockFindManyClusters = jest.fn();
const mockFindManyExperiments = jest.fn();
const mockFindUniqueCurrentEvent = jest.fn();
const mockFindUniqueBlogPost = jest.fn();
const mockPlanTopicPodForCluster = jest.fn();
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
      findMany: mockFindManyClusters,
    },
    seoExperiment: {
      findMany: mockFindManyExperiments,
    },
    currentEvent: {
      findUnique: mockFindUniqueCurrentEvent,
    },
    blogPost: {
      findUnique: mockFindUniqueBlogPost,
    },
  },
}));

jest.mock('../../../server/src/services/gsc/gscClient', () => ({
  getLatestFinalizedPtDate: mockGetLatestFinalizedPtDate,
  isoDateStringToUtcDate,
  shiftIsoDate,
}));

jest.mock('../../../server/src/services/seo/topicPodPlanner', () => ({
  planTopicPodForCluster: mockPlanTopicPodForCluster,
}));

import {
  getSeoPackagingAudit,
  listSeoPackagingAudits,
} from '../../../server/src/services/seo/serpPackagingAudit';

describe('serpPackagingAudit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLatestFinalizedPtDate.mockReturnValue('2026-04-28');
    mockFindManyExperiments.mockResolvedValue([]);
    mockFindManyClusters.mockResolvedValue([]);
    mockFindUniqueCurrentEvent.mockResolvedValue(null);
    mockFindUniqueBlogPost.mockResolvedValue(null);
    mockPlanTopicPodForCluster.mockResolvedValue({
      keyword: 'turing award multiple winners',
      sourceType: 'cluster_snapshot',
      sourceId: 'cluster_news',
      sourceLabel: '90d content gap',
      primaryPage: 'https://letaiexplainai.com/news',
      moveType: 'create_new',
      hypothesis: 'A dedicated evergreen page should outperform the generic news destination.',
      canonicalDestination: {
        type: 'new_blog_post',
        label: 'New blog explainer: Turing Award Multiple Winners',
        path: '/blog/turing-award-multiple-winners',
        exists: false,
        reason: 'No stronger destination exists yet.',
      },
      companionAssets: [],
      internalLinkOpportunities: [],
    });
  });

  it('surfaces evergreen routing on /news and metadata issues on blog posts', async () => {
    mockFindManyDaily.mockResolvedValue([
      {
        page: 'https://letaiexplainai.com/news',
        clicks: 0,
        impressions: 46,
        position: 8.7,
      },
      {
        page: 'https://letaiexplainai.com/blog/ai-timeline',
        clicks: 2,
        impressions: 32,
        position: 15.2,
      },
    ]);
    mockFindManyClusters.mockResolvedValue([
      {
        id: 'cluster_news',
        primaryPage: 'https://letaiexplainai.com/news',
        representativeQuery: '"turing award" "multiple winners" quiz',
      },
    ]);
    mockFindUniqueBlogPost.mockResolvedValue({
      title: 'AI Timeline',
      excerpt: 'A history of AI.',
      seoTitle: null,
      seoDescription: null,
      canonicalUrl: null,
      status: 'published',
    });

    const result = await listSeoPackagingAudits({ page: 1, limit: 25 });

    expect(result.meta.counts.all).toBe(2);
    expect(result.data[0]).toMatchObject({
      pagePath: '/news',
      criticalCount: 1,
    });
    expect(result.data[0].issues.some((issue) => issue.type === 'evergreen_routing')).toBe(true);

    const blogAudit = result.data.find((audit) => audit.pagePath === '/blog/ai-timeline');
    expect(blogAudit).toBeTruthy();
    expect(blogAudit?.issues.some((issue) => issue.type === 'metadata_thin')).toBe(true);
    expect(blogAudit?.issues.some((issue) => issue.type === 'title_link_risk')).toBe(true);
  });

  it('returns an audit by encoded id', async () => {
    mockFindManyDaily.mockResolvedValue([
      {
        page: 'https://letaiexplainai.com/news',
        clicks: 0,
        impressions: 46,
        position: 8.7,
      },
    ]);
    mockFindManyClusters.mockResolvedValue([
      {
        id: 'cluster_news',
        primaryPage: 'https://letaiexplainai.com/news',
        representativeQuery: '"turing award" "multiple winners" quiz',
      },
    ]);

    const encoded = Buffer.from('https://letaiexplainai.com/news').toString('base64url');
    const audit = await getSeoPackagingAudit(encoded);

    expect(audit).toMatchObject({
      pagePath: '/news',
      issueCount: expect.any(Number),
    });
  });

  it('does not flag the timeline page just because the title expands the H1', async () => {
    mockFindManyDaily.mockResolvedValue([
      {
        page: 'https://letaiexplainai.com/timeline',
        clicks: 3,
        impressions: 117,
        position: 12.4,
      },
    ]);

    const result = await listSeoPackagingAudits({ page: 1, limit: 25 });

    expect(result.data).toHaveLength(0);
  });
});

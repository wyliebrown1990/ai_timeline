import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetClusterDetail = jest.fn();
const mockGlossaryTermFindFirst = jest.fn();
const mockMilestoneFindFirst = jest.fn();
const mockBlogPostFindFirst = jest.fn();
const mockBlogPostFindMany = jest.fn();
const mockSearchPersons = jest.fn();
const mockSearchOrganizations = jest.fn();
const mockSearchGlossaryTerms = jest.fn();
const mockSearchMilestones = jest.fn();
const mockMatchPerson = jest.fn();
const mockMatchOrganization = jest.fn();

jest.mock('../../../server/src/services/gsc/queryClusterer', () => ({
  getClusterDetail: mockGetClusterDetail,
}));

jest.mock('../../../server/src/db', () => ({
  prisma: {
    glossaryTerm: {
      findFirst: mockGlossaryTermFindFirst,
    },
    milestone: {
      findFirst: mockMilestoneFindFirst,
    },
    blogPost: {
      findFirst: mockBlogPostFindFirst,
      findMany: mockBlogPostFindMany,
    },
  },
}));

jest.mock('../../../server/src/services/persons', () => ({
  search: mockSearchPersons,
}));

jest.mock('../../../server/src/services/organizations', () => ({
  search: mockSearchOrganizations,
}));

jest.mock('../../../server/src/services/glossary', () => ({
  search: mockSearchGlossaryTerms,
}));

jest.mock('../../../server/src/services/milestones', () => ({
  search: mockSearchMilestones,
}));

jest.mock('../../../server/src/services/entityMatcher', () => ({
  matchPerson: mockMatchPerson,
  matchOrganization: mockMatchOrganization,
}));

import { planTopicPodForCluster } from '../../../server/src/services/seo/topicPodPlanner';

function buildCluster(overrides: Partial<{
  id: string;
  primaryPage: string;
  representativeQuery: string;
  bucket: 'cluster_content_gap' | 'cluster_topic_theme';
}> = {}) {
  return {
    id: overrides.id ?? 'cluster_1',
    horizon: '90d' as const,
    windowStart: '2026-04-01',
    windowEnd: '2026-04-28',
    bucket: overrides.bucket ?? 'cluster_content_gap',
    status: 'open' as const,
    clusterKey: 'ai timeline',
    representativeQuery: overrides.representativeQuery ?? 'ai timeline',
    primaryPage: overrides.primaryPage ?? 'https://letaiexplainai.com/timeline',
    currentMetrics: {
      clicks: 0,
      impressions: 95,
      ctr: 0,
      position: 79.3,
    },
    memberQueryCount: 10,
    memberPageCount: 1,
    score: 168,
    evidence: 'Cluster evidence',
    suggestedAction: 'Create a dedicated explainer',
    memberQueries: [],
    memberPages: [],
  };
}

describe('topicPodPlanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClusterDetail.mockResolvedValue(buildCluster());
    mockGlossaryTermFindFirst.mockResolvedValue(null);
    mockMilestoneFindFirst.mockResolvedValue(null);
    mockBlogPostFindFirst.mockResolvedValue(null);
    mockBlogPostFindMany.mockResolvedValue([]);
    mockSearchPersons.mockResolvedValue([]);
    mockSearchOrganizations.mockResolvedValue([]);
    mockSearchGlossaryTerms.mockResolvedValue([]);
    mockSearchMilestones.mockResolvedValue({ results: [], total: 0 });
    mockMatchPerson.mockResolvedValue({ matched: false });
    mockMatchOrganization.mockResolvedValue({ matched: false });
  });

  it('proposes a new canonical explainer when demand only lands on a generic destination', async () => {
    const plan = await planTopicPodForCluster('cluster_1');

    expect(plan.moveType).toBe('create_new');
    expect(plan.canonicalDestination.path).toBe('/blog/ai-timeline');
    expect(plan.companionAssets[0]?.label).toContain('ai timeline');
  });

  it('reuses an exact glossary page when the cluster already maps to an existing entity', async () => {
    mockGetClusterDetail.mockResolvedValue(buildCluster({
      representativeQuery: 'transformer',
      primaryPage: 'https://letaiexplainai.com/news',
    }));
    mockGlossaryTermFindFirst.mockResolvedValue({
      term: 'Transformer',
      slug: 'transformer',
    });

    const plan = await planTopicPodForCluster('cluster_1');

    expect(plan.moveType).toBe('expand_existing');
    expect(plan.canonicalDestination.path).toBe('/glossary/transformer');
    expect(plan.canonicalDestination.exists).toBe(true);
  });
});

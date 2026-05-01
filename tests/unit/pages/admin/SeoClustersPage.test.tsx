import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../../src/services/api', () => ({
  seoInsightsApi: {
    listClusters: jest.fn(),
    getCluster: jest.fn(),
    dismissCluster: jest.fn(),
    markClusterActioned: jest.fn(),
    generateClusterProposal: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { seoInsightsApi } from '../../../../src/services/api';
import SeoClustersPage from '../../../../src/pages/admin/SeoClustersPage';

const mockSeoInsightsApi = seoInsightsApi as jest.Mocked<typeof seoInsightsApi>;

function renderPage() {
  return render(
    <MemoryRouter>
      <SeoClustersPage />
    </MemoryRouter>
  );
}

function buildCluster(overrides: Partial<{
  id: string;
  bucket: 'cluster_content_gap' | 'cluster_near_win' | 'cluster_topic_theme';
  representativeQuery: string;
  primaryPage: string;
  status: 'open' | 'actioned' | 'dismissed' | 'shipped';
}> = {}) {
  return {
    id: overrides.id ?? 'cluster_1',
    horizon: '90d' as const,
    windowStart: '2026-01-29',
    windowEnd: '2026-04-28',
    bucket: overrides.bucket ?? 'cluster_content_gap',
    status: overrides.status ?? 'open',
    clusterKey: 'ai timeline',
    representativeQuery: overrides.representativeQuery ?? 'ai history timeline key milestones',
    primaryPage: overrides.primaryPage ?? 'https://letaiexplainai.com/timeline',
    currentMetrics: {
      impressions: 50,
      clicks: 2,
      ctr: 0.04,
      position: 9.3,
    },
    memberQueryCount: 3,
    memberPageCount: 1,
    score: 96.12,
    evidence: '3 close query variants generated 50 impressions across the last 90d.',
    suggestedAction: 'Create or reroute to a stronger canonical destination for this topic family.',
  };
}

function buildClusterListResult(overrides: Partial<Awaited<ReturnType<typeof seoInsightsApi.listClusters>>> = {}) {
  return {
    data: [buildCluster()],
    pagination: {
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
    },
    meta: {
      horizon: '90d' as const,
      windowStart: '2026-01-29',
      windowEnd: '2026-04-28',
      counts: {
        cluster_content_gap: 1,
        cluster_near_win: 0,
        cluster_topic_theme: 0,
      },
    },
    ...overrides,
  };
}

function buildClusterDetail() {
  return {
    ...buildCluster(),
    memberQueries: [
      {
        query: 'ai history timeline key milestones',
        impressions: 22,
        clicks: 1,
        ctr: 0.045,
        position: 9,
      },
      {
        query: 'ai timeline',
        impressions: 18,
        clicks: 0,
        ctr: 0,
        position: 11,
      },
    ],
    memberPages: [
      {
        page: 'https://letaiexplainai.com/timeline',
        path: '/timeline',
        impressions: 50,
        clicks: 2,
        ctr: 0.04,
        position: 9.3,
      },
    ],
  };
}

describe('SeoClustersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders clustered opportunities and switches horizon filters', async () => {
    mockSeoInsightsApi.listClusters
      .mockResolvedValueOnce(buildClusterListResult())
      .mockResolvedValueOnce(buildClusterListResult({
        meta: {
          horizon: '28d',
          windowStart: '2026-04-01',
          windowEnd: '2026-04-28',
          counts: {
            cluster_content_gap: 1,
            cluster_near_win: 0,
            cluster_topic_theme: 0,
          },
        },
      }));

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('ai history timeline key milestones')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /28 days/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.listClusters).toHaveBeenLastCalledWith({
        horizon: '28d',
        bucket: 'cluster_content_gap',
        page: 1,
        limit: 25,
      });
    });
  });

  it('opens the cluster drawer and renders member evidence', async () => {
    mockSeoInsightsApi.listClusters.mockResolvedValue(buildClusterListResult());
    mockSeoInsightsApi.getCluster.mockResolvedValue(buildClusterDetail());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('ai history timeline key milestones')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open detail/i }));

    expect(await screen.findByText(/member queries/i)).toBeInTheDocument();
    expect(screen.getAllByText('/timeline').length).toBeGreaterThan(0);
    expect(screen.getByText('ai timeline')).toBeInTheDocument();
  });

  it('dismisses a cluster and refreshes the list', async () => {
    mockSeoInsightsApi.listClusters
      .mockResolvedValueOnce(buildClusterListResult())
      .mockResolvedValueOnce(buildClusterListResult({
        data: [],
        pagination: {
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 0,
        },
        meta: {
          horizon: '90d',
          windowStart: '2026-01-29',
          windowEnd: '2026-04-28',
          counts: {
            cluster_content_gap: 0,
            cluster_near_win: 0,
            cluster_topic_theme: 0,
          },
        },
      }));
    mockSeoInsightsApi.dismissCluster.mockResolvedValue({
      id: 'cluster_1',
      status: 'dismissed',
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('ai history timeline key milestones')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.dismissCluster).toHaveBeenCalledWith('cluster_1');
    });
    expect(await screen.findByText('No clustered opportunities in this bucket')).toBeInTheDocument();
  });

  it('generates a proposal and removes the actioned cluster from the open backlog', async () => {
    mockSeoInsightsApi.listClusters
      .mockResolvedValueOnce(buildClusterListResult())
      .mockResolvedValueOnce(buildClusterListResult({
        data: [],
        pagination: {
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 0,
        },
        meta: {
          horizon: '90d',
          windowStart: '2026-01-29',
          windowEnd: '2026-04-28',
          counts: {
            cluster_content_gap: 0,
            cluster_near_win: 0,
            cluster_topic_theme: 0,
          },
        },
      }));
    mockSeoInsightsApi.generateClusterProposal.mockResolvedValue({
      id: 'proposal_1',
      sourceType: 'cluster_snapshot',
      sourceId: 'cluster_1',
      proposalType: 'blog_post',
      targetKeyword: 'ai timeline',
      suggestedAngle: 'Why the AI timeline is compressing faster than past platform shifts.',
      rationale: 'There is enough clustered demand to justify a dedicated editorial handoff.',
      hypothesis: 'A dedicated page should outperform the generic timeline destination.',
      confidence: 0.94,
      status: 'pending',
      rejectedReason: null,
      createdAt: '2026-05-01T15:07:46.244Z',
      actedAt: null,
      sourceWindowStart: '2026-01-29T00:00:00.000Z',
      sourceWindowEnd: '2026-04-28T00:00:00.000Z',
      sourceBucket: 'cluster_content_gap',
      sourcePage: 'https://letaiexplainai.com/timeline',
      sourceQuery: 'ai timeline',
      linkInventory: [],
      newsHooks: [],
      topicPod: null,
      routingPlan: null,
      packagingFixPlan: null,
      handoff: {
        mode: 'blog_draft',
        label: 'Send to /AIBlogDraft',
        topic: 'Why the AI timeline is compressing faster than past platform shifts.',
        keyword: 'ai timeline',
        newsUrl: null,
        command: '/AIBlogDraft topic: "Why the AI timeline is compressing faster than past platform shifts." keyword: "ai timeline"',
        proposalPath: 'https://letaiexplainai.com/admin/seo-insights/proposals',
        guidance: 'Approving this proposal keeps a human in the loop and prepares a structured /AIBlogDraft handoff.',
      },
      draftPost: null,
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('ai history timeline key milestones')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Generate proposal' }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.generateClusterProposal).toHaveBeenCalledWith('cluster_1');
    });
    expect(await screen.findByText('No clustered opportunities in this bucket')).toBeInTheDocument();
  });
});

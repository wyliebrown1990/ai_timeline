import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../../src/services/api', () => ({
  seoInsightsApi: {
    createEditorialSeed: jest.fn(),
    listKeywordPortfolio: jest.fn(),
    promoteKeywordOpportunity: jest.fn(),
    rebuildKeywordPortfolio: jest.fn(),
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
import SeoKeywordPortfolioPage from '../../../../src/pages/admin/SeoKeywordPortfolioPage';
import toast from 'react-hot-toast';

const mockSeoInsightsApi = seoInsightsApi as jest.Mocked<typeof seoInsightsApi>;
const mockToast = toast as jest.Mocked<typeof toast>;

function renderPage() {
  return render(
    <MemoryRouter>
      <SeoKeywordPortfolioPage />
    </MemoryRouter>
  );
}

function buildOpportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'kw_1',
    sourceType: 'gsc_cluster' as const,
    dedupeKey: 'gsc_cluster:mixture expert:explainer_page:/explained/mixture-of-experts-moe',
    seedQuery: 'mixture of experts',
    clusterKey: 'mixture expert',
    clusterSnapshotId: 'cluster_1',
    targetIntent: 'definition',
    demandProxy: 78,
    competitionProxy: 23,
    laeaFitScore: 94,
    overallScore: 84.2,
    pageTypeRecommendation: 'explainer_page',
    targetUrl: 'https://letaiexplainai.com/explained/mixture-of-experts-moe',
    rationale: 'This topic already clusters around a strong existing explainer.',
    status: 'scored' as const,
    linkedExperimentId: null,
    sourceRef: {
      clusterId: 'cluster_1',
      bucket: 'cluster_topic_theme' as const,
      horizon: '90d' as const,
      windowStart: '2026-01-29',
      windowEnd: '2026-04-28',
      representativeQuery: 'mixture of experts',
      primaryPage: 'https://letaiexplainai.com/explained/mixture-of-experts-moe',
      canonicalPath: '/explained/mixture-of-experts-moe',
      moveType: 'expand_existing' as const,
      impressions: 48,
      clicks: 2,
      ctr: 0.04,
      position: 8.2,
      memberQueryCount: 4,
      memberPageCount: 1,
      internalLinkCount: 1,
    },
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-01T12:15:00.000Z',
    ...overrides,
  };
}

function buildListResult() {
  return {
    data: [buildOpportunity()],
    pagination: {
      page: 1,
      limit: 100,
      total: 1,
      totalPages: 1,
    },
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
      serper: {
        configured: true,
        enabled: true,
        autoTopupEnabled: false,
        tierLabel: 'starter',
        purchasedCredits: 50000,
        monthlyCreditBudget: 2500,
        creditsUsedToday: 1,
        creditsUsedWeek: 3,
        creditsUsedMonth: 5,
        creditsUsedTotal: 5,
        effectiveSpendTodayUsd: 0.001,
        effectiveSpendWeekUsd: 0.003,
        effectiveSpendMonthUsd: 0.005,
        effectiveSpendTotalUsd: 0.005,
        remainingCredits: 49995,
        projectedDepletionDate: null,
        lastSampledAt: '2026-05-01T12:00:00.000Z',
        warningLevel: 'ok' as const,
      },
    },
  };
}

describe('SeoKeywordPortfolioPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the keyword portfolio and opens the detail drawer', async () => {
    mockSeoInsightsApi.listKeywordPortfolio.mockResolvedValue(buildListResult());

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(mockSeoInsightsApi.listKeywordPortfolio).toHaveBeenCalledWith({
        page: 1,
        limit: 100,
        status: 'all',
        sourceType: 'all',
      });
    });
    expect(await screen.findByText('mixture of experts', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('GSC cluster')).toBeInTheDocument();
    expect(screen.getByTestId('seo-serper-ops-card')).toHaveTextContent('Serper Spend Guardrail');
    expect(screen.getByTestId('seo-serper-ops-card')).toHaveTextContent('Auto top-up off');

    await user.click(screen.getByRole('button', { name: /view detail/i }));

    expect(await screen.findByText(/scored keyword opportunity/i)).toBeInTheDocument();
    expect(screen.getByText(/cluster topic theme/i)).toBeInTheDocument();
  });

  it('rebuilds the portfolio and refreshes the list', async () => {
    mockSeoInsightsApi.listKeywordPortfolio
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce(buildListResult());
    mockSeoInsightsApi.rebuildKeywordPortfolio.mockResolvedValue({
      created: 10,
      updated: 0,
      archived: 0,
      totalActive: 10,
      candidateCount: 10,
      sourcesUsed: ['gsc_cluster'],
      serperSampling: {
        shortlistCount: 3,
        cacheHits: 2,
        freshSamples: 1,
        skippedSamples: 0,
      },
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('mixture of experts')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /rebuild portfolio/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.rebuildKeywordPortfolio).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockSeoInsightsApi.listKeywordPortfolio).toHaveBeenCalledTimes(2);
    });
    expect(mockToast.success).toHaveBeenCalledWith(
      'Portfolio rebuilt: 10 candidates, 10 active opportunities · Serper: 2 cache hits, 1 fresh sample'
    );
  });

  it('shows the filtered empty state when a source has no opportunities', async () => {
    mockSeoInsightsApi.listKeywordPortfolio
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce({
        data: [],
        pagination: {
          page: 1,
          limit: 100,
          total: 0,
          totalPages: 0,
        },
        meta: {
          counts: {
            all: 0,
            discovered: 0,
            scored: 0,
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

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('mixture of experts', {}, { timeout: 5000 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /google trends/i }));

    expect(await screen.findByText(/no opportunities in this filter/i)).toBeInTheDocument();
  });

  it('queues a proposal for an eligible blog-post opportunity', async () => {
    const eligibleOpportunity = buildOpportunity({
      dedupeKey: 'gsc_cluster:ai timeline:blog_post:/blog/ai-timeline',
      seedQuery: 'ai timeline',
      pageTypeRecommendation: 'blog_post',
      targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
    });

    mockSeoInsightsApi.listKeywordPortfolio
      .mockResolvedValueOnce({
        ...buildListResult(),
        data: [eligibleOpportunity],
      })
      .mockResolvedValueOnce({
        ...buildListResult(),
        data: [
          {
            ...eligibleOpportunity,
            status: 'promoted',
          },
        ],
        meta: {
          counts: {
            all: 1,
            discovered: 0,
            scored: 0,
            promoted: 1,
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
    mockSeoInsightsApi.promoteKeywordOpportunity.mockResolvedValue({
      opportunity: {
        ...eligibleOpportunity,
        status: 'promoted',
      },
      proposal: {
        id: 'proposal_1',
        sourceType: 'cluster_snapshot',
        sourceId: 'cluster_1',
        proposalType: 'blog_post',
        sourceBucket: 'cluster_content_gap',
        sourcePage: 'https://letaiexplainai.com/timeline',
        sourceQuery: 'ai timeline',
        sourceWindowStart: '2026-04-01',
        sourceWindowEnd: '2026-04-28',
        targetKeyword: 'ai timeline',
        suggestedAngle: 'Build the canonical AI timeline explainer.',
        rationale: 'Topic demand is landing on timeline and needs a dedicated blog page.',
        linkInventory: [],
        newsHooks: [],
        confidence: 0.72,
        status: 'pending',
        draftPost: null,
        actedAt: null,
        rejectedReason: null,
        hypothesis: 'A canonical timeline post should absorb this recurring demand.',
        createdAt: '2026-05-01T12:00:00.000Z',
        topicPod: null,
        routingPlan: null,
        packagingFixPlan: null,
        handoff: {
          mode: 'blog_draft',
          command: '/AIBlogDraft topic: "Build the canonical AI timeline explainer."',
          label: 'Send to /AIBlogDraft',
          topic: 'Build the canonical AI timeline explainer.',
          keyword: 'ai timeline',
          newsUrl: null,
          proposalPath: 'https://letaiexplainai.com/admin/seo-insights/proposals',
          guidance: 'Approving this proposal keeps a human in the loop and prepares a structured /AIBlogDraft handoff.',
        },
      },
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('ai timeline')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /queue proposal/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.promoteKeywordOpportunity).toHaveBeenCalledWith('kw_1');
    });
    await waitFor(() => {
      expect(mockSeoInsightsApi.listKeywordPortfolio).toHaveBeenCalledTimes(2);
    });
  });

  it('queues a proposal for an editorial-seed blog-post opportunity with a target URL', async () => {
    const editorialOpportunity = buildOpportunity({
      id: 'kw_seed_1',
      sourceType: 'editorial_seed',
      dedupeKey: 'editorial_seed:ai-agent-memory:blog_post:https-letaiexplainai-com-blog-ai-agent-memory',
      seedQuery: 'ai agent memory',
      clusterKey: null,
      clusterSnapshotId: null,
      pageTypeRecommendation: 'blog_post',
      targetUrl: 'https://letaiexplainai.com/blog/ai-agent-memory',
      rationale: 'Manual seed from strategy review.',
      demandProxy: 64,
      competitionProxy: 38,
      laeaFitScore: 82,
      overallScore: 69.9,
      sourceRef: null,
    });

    mockSeoInsightsApi.listKeywordPortfolio
      .mockResolvedValueOnce({
        ...buildListResult(),
        data: [editorialOpportunity],
      })
      .mockResolvedValueOnce({
        ...buildListResult(),
        data: [
          {
            ...editorialOpportunity,
            status: 'promoted',
          },
        ],
        meta: {
          counts: {
            all: 1,
            discovered: 0,
            scored: 0,
            promoted: 1,
            archived: 0,
          },
          sourceCounts: {
            all: 1,
            gsc_cluster: 0,
            google_trends: 0,
            serp_sample: 0,
            editorial_seed: 1,
          },
        },
      });
    mockSeoInsightsApi.promoteKeywordOpportunity.mockResolvedValue({
      opportunity: {
        ...editorialOpportunity,
        status: 'promoted',
      },
      proposal: {
        id: 'proposal_seed_1',
        sourceType: 'keyword_opportunity',
        sourceId: 'kw_seed_1',
        proposalType: 'blog_post',
        sourceBucket: 'editorial_seed',
        sourcePage: 'https://letaiexplainai.com/blog/ai-agent-memory',
        sourceQuery: 'ai agent memory',
        sourceWindowStart: '2026-05-01',
        sourceWindowEnd: null,
        targetKeyword: 'ai agent memory',
        suggestedAngle: 'Why AI agent memory is becoming the real bottleneck for trustworthy agents.',
        rationale: 'Manual keyword seed with a clear LAEA fit and destination.',
        linkInventory: [],
        newsHooks: [],
        confidence: 0.79,
        status: 'pending',
        draftPost: null,
        actedAt: null,
        rejectedReason: null,
        hypothesis: 'Manual seed from strategy review.',
        createdAt: '2026-05-01T12:00:00.000Z',
        topicPod: null,
        routingPlan: null,
        packagingFixPlan: null,
        handoff: {
          mode: 'blog_draft',
          command: '/AIBlogDraft topic: "Why AI agent memory is becoming the real bottleneck for trustworthy agents."',
          label: 'Send to /AIBlogDraft',
          topic: 'Why AI agent memory is becoming the real bottleneck for trustworthy agents.',
          keyword: 'ai agent memory',
          newsUrl: null,
          proposalPath: 'https://letaiexplainai.com/admin/seo-insights/proposals',
          guidance: 'Approving this proposal keeps a human in the loop and prepares a structured /AIBlogDraft handoff.',
        },
      },
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('ai agent memory')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /queue proposal/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.promoteKeywordOpportunity).toHaveBeenCalledWith('kw_seed_1');
    });
    await waitFor(() => {
      expect(mockSeoInsightsApi.listKeywordPortfolio).toHaveBeenCalledTimes(2);
    });
  });

  it('adds an editorial seed and switches to the editorial filter', async () => {
    mockSeoInsightsApi.listKeywordPortfolio
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce({
        data: [
          buildOpportunity({
            id: 'kw_seed_1',
            sourceType: 'editorial_seed',
            dedupeKey: 'editorial_seed:ai-agent-memory:blog_post:no-target',
            seedQuery: 'ai agent memory',
            clusterKey: null,
            clusterSnapshotId: null,
            pageTypeRecommendation: 'blog_post',
            targetUrl: null,
            rationale: 'Manual seed from strategy review.',
            demandProxy: 64,
            competitionProxy: 38,
            laeaFitScore: 82,
            overallScore: 68.2,
            sourceRef: null,
          }),
        ],
        pagination: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1,
        },
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
            gsc_cluster: 0,
            google_trends: 0,
            serp_sample: 0,
            editorial_seed: 1,
          },
        },
      });
    mockSeoInsightsApi.createEditorialSeed.mockResolvedValue(
      buildOpportunity({
        id: 'kw_seed_1',
        sourceType: 'editorial_seed',
        dedupeKey: 'editorial_seed:ai-agent-memory:blog_post:no-target',
        seedQuery: 'ai agent memory',
        clusterKey: null,
        clusterSnapshotId: null,
        pageTypeRecommendation: 'blog_post',
        targetUrl: null,
        rationale: 'Manual seed from strategy review.',
        demandProxy: 64,
        competitionProxy: 38,
        laeaFitScore: 82,
        overallScore: 68.2,
        sourceRef: null,
      })
    );

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('mixture of experts')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add editorial seed/i }));
    await user.type(screen.getByLabelText(/keyword/i), 'ai agent memory');
    await user.type(screen.getByLabelText(/why this belongs in the backlog/i), 'Manual seed from strategy review.');
    await user.click(screen.getByRole('button', { name: /add seed/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.createEditorialSeed).toHaveBeenCalledWith(expect.objectContaining({
        seedQuery: 'ai agent memory',
        pageTypeRecommendation: 'blog_post',
      }));
    });
    await waitFor(() => {
      expect(mockSeoInsightsApi.listKeywordPortfolio).toHaveBeenLastCalledWith({
        page: 1,
        limit: 100,
        status: 'all',
        sourceType: 'editorial_seed',
      });
    });
  });
});

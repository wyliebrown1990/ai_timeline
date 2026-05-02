import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../../src/services/api', () => ({
  seoInsightsApi: {
    archiveKeywordOpportunity: jest.fn(),
    createEditorialSeed: jest.fn(),
    listKeywordPortfolio: jest.fn(),
    promoteKeywordOpportunity: jest.fn(),
    refreshKeywordOpportunitySerp: jest.fn(),
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
      internalLinkOpportunities: [
        {
          entityType: 'glossary_term',
          label: 'Transformer',
          path: '/glossary/transformer',
          reason: 'Support link',
        },
      ],
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
        pricingEnabled: true,
        pausedBySeoAgent: false,
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
        remainingCreditsSource: 'policy_derived' as const,
        remainingCreditsObservedAt: null,
        projectedDepletionDate: null,
        lastSampledAt: '2026-05-01T12:00:00.000Z',
        warningLevel: 'ok' as const,
        policy: {
          endpoint: 'search' as const,
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
      },
    },
  };
}

function buildEmptyListResult() {
  return {
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
        all: 0,
        gsc_cluster: 0,
        google_trends: 0,
        serp_sample: 0,
        editorial_seed: 0,
      },
      serper: buildListResult().meta.serper,
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
    expect(screen.getByTestId('seo-serper-ops-card')).toHaveTextContent('Google search · US/EN · qdr:m · page 1');
    expect(screen.getByTestId('seo-serper-ops-card')).toHaveTextContent('3/run · 10/day · 25/week');
    expect(screen.getByTestId('seo-serper-ops-card')).toHaveTextContent('$0.0030 modeled spend');
    expect(screen.getByTestId('seo-serper-ops-card')).toHaveTextContent('$0.0050');
    expect(screen.getByTestId('seo-serper-ops-card')).toHaveTextContent('Tracked Credits');
    expect(screen.getByTestId('seo-serper-ops-card')).toHaveTextContent('Policy baseline only');
    expect(screen.getByTestId('seo-serper-ops-card')).toHaveTextContent('$1.00 / 1k queries');
    expect(screen.getByTestId('seo-serper-burn-state')).toHaveTextContent('Under 25% used');
    expect(screen.getByTestId('seo-serper-burn-state')).toHaveTextContent('Healthy runway remains');
    const mixtureRow = screen.getByText('mixture of experts').closest('tr');
    expect(mixtureRow).not.toBeNull();
    expect(within(mixtureRow as HTMLTableRowElement).getByRole('group', { name: 'Demand: 78 of 100, high' })).toBeInTheDocument();
    expect(within(mixtureRow as HTMLTableRowElement).getByRole('group', { name: 'Competition: 23 of 100, low competition' })).toBeInTheDocument();
    expect(within(mixtureRow as HTMLTableRowElement).getByRole('group', { name: 'LAEA fit: 94 of 100, high' })).toBeInTheDocument();
    await user.hover(screen.getByTestId('seo-source-pill-kw_1'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('GSC cluster provenance');
    expect(screen.getByRole('tooltip')).toHaveTextContent('mixture of experts');
    expect(screen.getByRole('link', { name: /open clusters tab/i })).toHaveAttribute('href', '/admin/seo-insights/clusters');

    await user.click(screen.getByRole('button', { name: /view detail/i }));

    expect(await screen.findByText(/scored keyword opportunity/i)).toBeInTheDocument();
    expect(screen.getByText(/cluster topic theme/i)).toBeInTheDocument();
    expect(screen.getByText('Why these scores')).toBeInTheDocument();
    expect(screen.getByText(/search console clustering found 48 impressions across 4 visible query variants/i)).toBeInTheDocument();
    expect(screen.getByText("Linked entities from LAEA's graph")).toBeInTheDocument();
    expect(screen.getByText('Transformer')).toBeInTheDocument();
    expect(screen.getByText('/glossary/transformer')).toBeInTheDocument();
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
    expect(screen.getByText('Latest rebuild')).toBeInTheDocument();
    expect(screen.getByText('10 candidates · 10 active · 2 cache hits · 1 fresh sample')).toBeInTheDocument();
  });

  it('shows the global SEO pause state on the Serper ops card', async () => {
    mockSeoInsightsApi.listKeywordPortfolio.mockResolvedValue({
      ...buildListResult(),
      meta: {
        ...buildListResult().meta,
        serper: {
          ...buildListResult().meta.serper,
          enabled: false,
          pausedBySeoAgent: true,
        },
      },
    });

    renderPage();

    expect(await screen.findByText('mixture of experts')).toBeInTheDocument();
    expect(screen.getByTestId('seo-serper-ops-card')).toHaveTextContent('SEO paused');
    expect(screen.getByTestId('seo-serper-ops-card')).toHaveTextContent(
      'The global SEO pause switch is on, so paid discovery sampling is intentionally read-only until auto-ship resumes.',
    );
    expect(screen.getByTestId('seo-serper-burn-state')).toHaveTextContent('SEO paused');
  });

  it('shows an explicit burn-threshold warning when credit usage is high', async () => {
    mockSeoInsightsApi.listKeywordPortfolio.mockResolvedValue({
      ...buildListResult(),
      meta: {
        ...buildListResult().meta,
        serper: {
          ...buildListResult().meta.serper,
          purchasedCredits: 50000,
          remainingCredits: 9000,
          warningLevel: 'warning' as const,
        },
      },
    });

    renderPage();

    expect(await screen.findByText('mixture of experts')).toBeInTheDocument();
    expect(screen.getByTestId('seo-serper-burn-state')).toHaveTextContent('75%+ credits used');
    expect(screen.getByTestId('seo-serper-burn-state')).toHaveTextContent('Late-burn zone');
  });

  it('supports sortable column headers with aria-sort state', async () => {
    mockSeoInsightsApi.listKeywordPortfolio.mockResolvedValue({
      ...buildListResult(),
      data: [
        buildOpportunity({
          id: 'kw_low_comp',
          seedQuery: 'low competition topic',
          demandProxy: 62,
          competitionProxy: 12,
          laeaFitScore: 81,
          targetUrl: 'https://letaiexplainai.com/blog/low-competition-topic',
        }),
        buildOpportunity({
          id: 'kw_high_fit',
          seedQuery: 'high fit topic',
          demandProxy: 55,
          competitionProxy: 34,
          laeaFitScore: 95,
          targetUrl: 'https://letaiexplainai.com/blog/high-fit-topic',
        }),
        buildOpportunity({
          id: 'kw_high_demand',
          seedQuery: 'high demand topic',
          demandProxy: 91,
          competitionProxy: 46,
          laeaFitScore: 74,
          targetUrl: 'https://letaiexplainai.com/blog/high-demand-topic',
        }),
      ],
      pagination: {
        page: 1,
        limit: 100,
        total: 3,
        totalPages: 1,
      },
      meta: {
        ...buildListResult().meta,
        counts: {
          all: 3,
          discovered: 0,
          scored: 3,
          promoted: 0,
          archived: 0,
        },
      },
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('high fit topic')).toBeInTheDocument();

    const demandButton = screen.getByRole('button', { name: /demand/i });
    const competitionButton = screen.getByRole('button', { name: /competition/i });
    const laeaFitButton = screen.getByRole('button', { name: /laea fit/i });
    const table = screen.getByRole('table');

    expect(laeaFitButton).toHaveAttribute('aria-sort', 'descending');
    expect(demandButton).toHaveAttribute('aria-sort', 'none');
    expect(competitionButton).toHaveAttribute('aria-sort', 'none');

    const initialRows = within(table).getAllByRole('row').slice(1);
    expect(initialRows[0]).toHaveTextContent('high fit topic');

    await user.click(demandButton);

    expect(demandButton).toHaveAttribute('aria-sort', 'descending');
    expect(laeaFitButton).toHaveAttribute('aria-sort', 'none');

    const demandRows = within(table).getAllByRole('row').slice(1);
    expect(demandRows[0]).toHaveTextContent('high demand topic');

    await user.click(competitionButton);

    expect(competitionButton).toHaveAttribute('aria-sort', 'ascending');
    expect(demandButton).toHaveAttribute('aria-sort', 'none');

    const competitionRows = within(table).getAllByRole('row').slice(1);
    expect(competitionRows[0]).toHaveTextContent('low competition topic');
  });

  it('supports keyboard navigation on source filters', async () => {
    mockSeoInsightsApi.listKeywordPortfolio.mockResolvedValue(buildListResult());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('mixture of experts')).toBeInTheDocument();

    const allSourcesButton = screen.getByTestId('seo-source-filter-all');
    allSourcesButton.focus();
    expect(allSourcesButton).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByTestId('seo-source-filter-gsc_cluster')).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByTestId('seo-source-filter-google_trends')).toHaveFocus();

    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(mockSeoInsightsApi.listKeywordPortfolio).toHaveBeenLastCalledWith({
        page: 1,
        limit: 100,
        status: 'all',
        sourceType: 'google_trends',
      });
    });
  });

  it('shows the filtered empty state when a source has no opportunities', async () => {
    mockSeoInsightsApi.listKeywordPortfolio
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce({
        ...buildEmptyListResult(),
        meta: {
          ...buildEmptyListResult().meta,
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

    expect(await screen.findByText(/no google trends entries yet/i)).toBeInTheDocument();
    expect(screen.getByText(/has not produced any qualifying opportunities/i)).toBeInTheDocument();
  });

  it('hides stale archived rows from the default view but keeps them in the archived tab', async () => {
    const archivedOpportunity = buildOpportunity({
      id: 'kw_archived_1',
      seedQuery: 'retired keyword',
      status: 'archived',
      updatedAt: '2026-04-20T12:00:00.000Z',
    });

    mockSeoInsightsApi.listKeywordPortfolio
      .mockResolvedValueOnce({
        ...buildListResult(),
        data: [buildOpportunity(), archivedOpportunity],
        pagination: {
          page: 1,
          limit: 100,
          total: 2,
          totalPages: 1,
        },
        meta: {
          ...buildListResult().meta,
          counts: {
            all: 2,
            discovered: 0,
            scored: 1,
            promoted: 0,
            archived: 1,
          },
        },
      })
      .mockResolvedValueOnce({
        ...buildListResult(),
        data: [archivedOpportunity],
        meta: {
          ...buildListResult().meta,
          counts: {
            all: 2,
            discovered: 0,
            scored: 1,
            promoted: 0,
            archived: 1,
          },
        },
      });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('mixture of experts')).toBeInTheDocument();
    expect(screen.queryByText('retired keyword')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /archived/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.listKeywordPortfolio).toHaveBeenLastCalledWith({
        page: 1,
        limit: 100,
        status: 'archived',
        sourceType: 'all',
      });
    });
    expect(await screen.findByText('retired keyword')).toBeInTheDocument();
  });

  it('shows a first-run empty state with an editorial-seed CTA', async () => {
    mockSeoInsightsApi.listKeywordPortfolio.mockResolvedValue(buildEmptyListResult());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/first discovery run/i)).toBeInTheDocument();
    expect(screen.getByText(/Discovery runs weekly\. The next run is Monday 13:00 UTC\./i)).toBeInTheDocument();
    expect(screen.getByText(/No portfolio entries yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Discovery hasn't run yet/i)).toBeInTheDocument();

    const emptyState = screen.getByTestId('empty-state');
    await user.click(within(emptyState).getByRole('button', { name: /add editorial seed/i }));

    expect(await screen.findByText(/Manually score a keyword idea/i)).toBeInTheDocument();
  });

  it('surfaces degraded opportunities when source lineage is unavailable', async () => {
    mockSeoInsightsApi.listKeywordPortfolio.mockResolvedValue({
      ...buildListResult(),
      data: [
        buildOpportunity({
          id: 'kw_missing_source',
          seedQuery: 'missing cluster lineage',
          clusterSnapshotId: 'cluster_missing',
          sourceRef: null,
        }),
      ],
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('missing cluster lineage')).toBeInTheDocument();
    const degradedRow = screen.getByText('missing cluster lineage').closest('tr');
    expect(degradedRow).not.toBeNull();
    expect(within(degradedRow as HTMLTableRowElement).getByText(/source unavailable/i)).toBeInTheDocument();
    expect(within(degradedRow as HTMLTableRowElement).getByText('Scored')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view detail/i }));

    expect(await screen.findByText(/keep this row for operator context but treat its lineage as stale/i)).toBeInTheDocument();
    expect(screen.getByText(/cluster provenance is no longer attached/i)).toBeInTheDocument();
  });

  it('queues a proposal for an eligible blog-post opportunity', async () => {
    const eligibleOpportunity = buildOpportunity({
      dedupeKey: 'gsc_cluster:ai timeline:blog_post:/blog/ai-timeline',
      seedQuery: 'ai timeline',
      pageTypeRecommendation: 'blog_post',
      targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
    });

    let resolveRefresh: ((value: ReturnType<typeof buildListResult>) => void) | null = null;
    const refreshPromise = new Promise<ReturnType<typeof buildListResult>>((resolve) => {
      resolveRefresh = resolve;
    });

    mockSeoInsightsApi.listKeywordPortfolio
      .mockResolvedValueOnce({
        ...buildListResult(),
        data: [eligibleOpportunity],
      })
      .mockImplementationOnce(() => refreshPromise);
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
    const confirmDialog = await screen.findByTestId('confirm-dialog');
    expect(within(confirmDialog).getByText(/ai timeline/i)).toBeInTheDocument();
    expect(within(confirmDialog).getByText(/demand 78\/100, competition 23\/100, and LAEA fit 94\/100/i)).toBeInTheDocument();
    await user.click(within(confirmDialog).getByRole('button', { name: /^queue proposal$/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.promoteKeywordOpportunity).toHaveBeenCalledWith('kw_1');
    });
    const promotedRow = within(screen.getByRole('table')).getByText('ai timeline').closest('tr');
    expect(promotedRow).not.toBeNull();
    expect(within(promotedRow as HTMLTableRowElement).getAllByText('Promoted')).not.toHaveLength(0);

    resolveRefresh?.({
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
    await waitFor(() => {
      expect(mockSeoInsightsApi.listKeywordPortfolio).toHaveBeenCalledTimes(2);
    });
  });

  it('archives an active opportunity from the detail drawer', async () => {
    mockSeoInsightsApi.listKeywordPortfolio
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce({
        ...buildListResult(),
        data: [
          {
            ...buildOpportunity(),
            status: 'archived',
          },
        ],
        meta: {
          ...buildListResult().meta,
          counts: {
            all: 1,
            discovered: 0,
            scored: 0,
            promoted: 0,
            archived: 1,
          },
        },
      });
    mockSeoInsightsApi.archiveKeywordOpportunity.mockResolvedValue({
      opportunity: {
        ...buildOpportunity(),
        status: 'archived',
      },
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('mixture of experts')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /view detail/i }));
    expect(await screen.findByText(/scored keyword opportunity/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /archive opportunity/i }));

    const confirmDialog = await screen.findByTestId('confirm-dialog');
    expect(within(confirmDialog).getByText(/will move from the active discovery queue into archived status/i)).toBeInTheDocument();
    await user.click(within(confirmDialog).getByRole('button', { name: /^archive opportunity$/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.archiveKeywordOpportunity).toHaveBeenCalledWith('kw_1');
    });

    const archivedRow = within(screen.getByRole('table')).getByText('mixture of experts').closest('tr');
    expect(archivedRow).not.toBeNull();
    expect(within(archivedRow as HTMLTableRowElement).getAllByText('Archived')).not.toHaveLength(0);
    expect(mockToast.success).toHaveBeenCalledWith('Archived mixture of experts');

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
    const confirmDialog = await screen.findByTestId('confirm-dialog');
    expect(within(confirmDialog).getByText(/ai agent memory/i)).toBeInTheDocument();
    await user.click(within(confirmDialog).getByRole('button', { name: /^queue proposal$/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.promoteKeywordOpportunity).toHaveBeenCalledWith('kw_seed_1');
    });
    await waitFor(() => {
      expect(mockSeoInsightsApi.listKeywordPortfolio).toHaveBeenCalledTimes(2);
    });

    expect(mockToast.success).toHaveBeenCalled();
    const toastContent = mockToast.success.mock.calls.at(-1)?.[0];
    const toastRender = render(<>{toastContent as ReactNode}</>);
    expect(toastRender.getByRole('link', { name: /open proposals/i })).toHaveAttribute(
      'href',
      'https://letaiexplainai.com/admin/seo-insights/proposals',
    );
    toastRender.unmount();
  });

  it('refreshes an eligible SERP sample from the detail drawer', async () => {
    const serpOpportunity = buildOpportunity({
      id: 'kw_serp_1',
      sourceType: 'serp_sample',
      dedupeKey: 'serp_sample:ai-timeline:blog-post:https-letaiexplainai-com-blog-ai-timeline',
      seedQuery: 'ai timeline',
      clusterKey: 'ai timeline',
      clusterSnapshotId: 'cluster_gap_1',
      pageTypeRecommendation: 'blog_post',
      targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
      competitionProxy: 31,
      overallScore: 78.4,
      rationale: 'Prior SERP rationale.',
      sourceRef: {
        vendor: 'serper' as const,
        requestKey: 'us:en:qdr:m:1:ai timeline',
        originSourceType: 'gsc_cluster',
        originOpportunityId: 'kw_gap_1',
        originDedupeKey: 'gsc_cluster:ai timeline:blog_post:/blog/ai-timeline',
        query: 'ai timeline',
        country: 'us',
        language: 'en',
        dateRange: 'qdr:m',
        page: 1,
        sampledAt: '2026-04-20T12:00:00.000Z',
        expiresAt: '2026-05-18T12:00:00.000Z',
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
    });
    const refreshedOpportunity = {
      ...serpOpportunity,
      competitionProxy: 28,
      overallScore: 79.8,
      rationale: 'Updated SERP rationale.',
      sourceRef: {
        ...(serpOpportunity.sourceRef as NonNullable<typeof serpOpportunity.sourceRef>),
        sampledAt: '2026-05-01T12:00:00.000Z',
        expiresAt: '2026-05-29T12:00:00.000Z',
        peopleAlsoAskCount: 2,
        relatedSearchCount: 5,
        competitionProxy: 28,
      },
    };

    mockSeoInsightsApi.listKeywordPortfolio
      .mockResolvedValueOnce({
        ...buildListResult(),
        data: [serpOpportunity],
      })
      .mockResolvedValueOnce({
        ...buildListResult(),
        data: [refreshedOpportunity],
      });
    mockSeoInsightsApi.refreshKeywordOpportunitySerp.mockResolvedValue({
      opportunity: refreshedOpportunity,
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('ai timeline')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /view detail/i }));
    expect(await screen.findByText(/manual refresh is available/i)).toBeInTheDocument();
    expect(screen.getByTestId('seo-serper-paid-sample-card')).toHaveTextContent('Paid SERP sample');
    expect(screen.getByTestId('seo-serper-paid-sample-card')).toHaveTextContent('$0.001');
    expect(screen.getByTestId('seo-serper-paid-sample-card')).toHaveTextContent('stays cached until');
    await user.click(screen.getByRole('button', { name: /refresh serp sample/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.refreshKeywordOpportunitySerp).toHaveBeenCalledWith('kw_serp_1');
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

    expect(await screen.findByRole('button', { name: /add editorial seed/i })).toBeInTheDocument();
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

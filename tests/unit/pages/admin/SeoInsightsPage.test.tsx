import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../../src/services/api', () => ({
  seoInsightsApi: {
    list: jest.fn(),
    get: jest.fn(),
    dismiss: jest.fn(),
    markActioned: jest.fn(),
    proposeRewrite: jest.fn(),
    shipRewrite: jest.fn(),
    generateProposal: jest.fn(),
    listActions: jest.fn(),
    rollbackAction: jest.fn(),
    getHealth: jest.fn(),
    getEditorialStatus: jest.fn(),
    setPaused: jest.fn(),
    setEditorialPaused: jest.fn(),
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
import SeoInsightsPage from '../../../../src/pages/admin/SeoInsightsPage';

const mockSeoInsightsApi = seoInsightsApi as jest.Mocked<typeof seoInsightsApi>;

function renderPage() {
  return render(
    <MemoryRouter>
      <SeoInsightsPage />
    </MemoryRouter>
  );
}

function buildListResult(overrides: Partial<Awaited<ReturnType<typeof seoInsightsApi.list>>> = {}) {
  return {
    data: [
      {
        id: 'insight_1',
        weekStart: '2026-04-24',
        bucket: 'winnable_loss' as const,
        status: 'open' as const,
        query: 'turing award multiple winners quiz',
        page: 'https://letaiexplainai.com/blog/turing-award-quiz',
        currentMetrics: {
          impressions: 120,
          clicks: 6,
          ctr: 0.05,
          position: 3.2,
        },
        baselineMetrics: {
          impressions: 120,
          clicks: 16,
          ctr: 0.14,
          position: 3,
        },
        score: 10.8,
        evidence: 'CTR is lagging the position cohort median.',
        suggestedAction: 'Rewrite the page title and meta description.',
      },
    ],
    pagination: {
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    },
    meta: {
      weekStart: '2026-04-24',
      availableWeeks: ['2026-04-24', '2026-04-17'],
      counts: {
        winnable_loss: 1,
        content_gap: 0,
        trend_signal: 0,
        decay: 0,
      },
    },
    ...overrides,
  };
}

function buildHealthResult(overrides: Partial<Awaited<ReturnType<typeof seoInsightsApi.getHealth>>> = {}) {
  return {
    lastRunAt: '2026-04-30T22:09:30.487Z',
    finalizedThroughDate: '2026-04-27',
    lastRowCount: 71,
    lastWeekCovered: '2026-04-21',
    totalRowsLast30d: 354,
    paused: false,
    agentRun: null,
    serper: {
      configured: true,
      enabled: true,
      pricingEnabled: true,
      pausedBySeoAgent: false,
      autoTopupEnabled: false,
      tierLabel: 'starter',
      purchasedCredits: 50_000,
      monthlyCreditBudget: 2_500,
      creditsUsedToday: 1,
      creditsUsedWeek: 4,
      creditsUsedMonth: 4,
      creditsUsedTotal: 4,
      effectiveSpendTodayUsd: 0.001,
      effectiveSpendWeekUsd: 0.004,
      effectiveSpendMonthUsd: 0.004,
      effectiveSpendTotalUsd: 0.004,
      remainingCredits: 49_996,
      remainingCreditsSource: 'policy_derived' as const,
      remainingCreditsObservedAt: null,
      projectedDepletionDate: '2026-11-17T22:13:00.000Z',
      lastSampledAt: '2026-05-01T20:53:00.000Z',
      warningLevel: 'ok' as const,
    },
    ...overrides,
  };
}

function buildEditorialStatus(
  overrides: Partial<Awaited<ReturnType<typeof seoInsightsApi.getEditorialStatus>>> = {}
) {
  return {
    paused: false,
    run: null,
    ...overrides,
  };
}

function buildProposalRecord() {
  return {
    id: 'proposal_1',
    sourceType: 'weekly_snapshot',
    sourceId: 'insight_2',
    proposalType: 'blog_post',
    targetKeyword: 'Turing Award',
    suggestedAngle: 'Why the Turing Award still shapes how AI breakthroughs get interpreted',
    rationale: 'The query is landing on /news, so the better move is a durable editorial explainer with a real thesis.',
    hypothesis: 'The query is landing on /news, so the better move is a durable editorial explainer with a real thesis.',
    confidence: 0.82,
    status: 'pending' as const,
    rejectedReason: null,
    createdAt: '2026-04-30T12:00:00.000Z',
    actedAt: null,
    sourceWindowStart: '2026-04-24T00:00:00.000Z',
    sourceWindowEnd: null,
    sourceBucket: 'content_gap',
    sourcePage: 'https://letaiexplainai.com/news',
    sourceQuery: 'Turing Award',
    linkInventory: [
      {
        entityType: 'milestone' as const,
        id: 'milestone_1',
        label: 'Turing Award',
        path: '/milestones/turing-award',
        reason: 'Existing milestone page that can support internal linking.',
      },
    ],
    topicPod: null,
    routingPlan: null,
    newsHooks: [
      {
        articleId: 'article_1',
        title: 'Why the Turing Award still matters in the AI era',
        externalUrl: 'https://example.com/turing-award-ai-era',
        sourceName: 'Example Source',
        publishedAt: '2026-04-29T10:00:00.000Z',
      },
    ],
    handoff: {
      mode: 'blog_draft' as const,
      label: 'Send to /AIBlogDraft',
      topic: 'Why the Turing Award still shapes how AI breakthroughs get interpreted',
      keyword: 'Turing Award',
      newsUrl: 'https://example.com/turing-award-ai-era',
      command: '/AIBlogDraft topic: "Why the Turing Award still shapes how AI breakthroughs get interpreted" keyword: "Turing Award" news_url: "https://example.com/turing-award-ai-era"',
      proposalPath: 'https://letaiexplainai.com/admin/seo-insights/proposals',
      guidance: 'Approving this proposal keeps a human in the loop and prepares a structured /AIBlogDraft handoff.',
    },
    packagingFixPlan: null,
    draftPost: null,
  };
}

describe('SeoInsightsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSeoInsightsApi.getHealth.mockResolvedValue(buildHealthResult());
    mockSeoInsightsApi.getEditorialStatus.mockResolvedValue(buildEditorialStatus());
  });

  it('switches tabs and fetches the matching bucket', async () => {
    mockSeoInsightsApi.list
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce(buildListResult({
        data: [
          {
            id: 'insight_2',
            weekStart: '2026-04-24',
            bucket: 'content_gap',
            status: 'open',
            query: 'Turing Award',
            page: 'https://letaiexplainai.com/news',
            currentMetrics: {
              impressions: 44,
              clicks: 4,
              ctr: 0.091,
              position: 4.1,
            },
            baselineMetrics: null,
            score: 59,
            evidence: 'Query lands on /news instead of the canonical glossary page.',
            suggestedAction: 'Create or route users to a canonical entity page.',
            canonicalPath: '/glossary/turing-award',
          },
        ],
        meta: {
          weekStart: '2026-04-24',
          availableWeeks: ['2026-04-24'],
          counts: {
            winnable_loss: 1,
            content_gap: 1,
            trend_signal: 0,
            decay: 0,
          },
        },
      }));
    mockSeoInsightsApi.getHealth
      .mockResolvedValueOnce(buildHealthResult())
      .mockResolvedValueOnce(buildHealthResult());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('turing award multiple winners quiz')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /content gaps/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.list).toHaveBeenLastCalledWith({
        bucket: 'content_gap',
        weekStart: undefined,
        page: 1,
        limit: 50,
      });
    });
    expect(await screen.findByText('Turing Award')).toBeInTheDocument();
  });

  it('dismisses a finding and refreshes the list', async () => {
    mockSeoInsightsApi.list
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce(buildListResult({
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
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
      }));
    mockSeoInsightsApi.dismiss.mockResolvedValue({
      id: 'insight_1',
      status: 'dismissed',
    });
    mockSeoInsightsApi.getHealth
      .mockResolvedValueOnce(buildHealthResult())
      .mockResolvedValueOnce(buildHealthResult());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('turing award multiple winners quiz')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.dismiss).toHaveBeenCalledWith('insight_1');
    });
    expect(await screen.findByText('No findings in this bucket')).toBeInTheDocument();
    expect(screen.getByText(/auto-ship rewrites only apply to published blog posts/i)).toBeInTheDocument();
  });

  it('queues an editorial proposal from a content-gap detail drawer', async () => {
    const contentGapInsight = {
      id: 'insight_2',
      weekStart: '2026-04-24',
      bucket: 'content_gap' as const,
      status: 'open' as const,
      query: 'Turing Award',
      page: 'https://letaiexplainai.com/news',
      currentMetrics: {
        impressions: 44,
        clicks: 4,
        ctr: 0.091,
        position: 4.1,
      },
      baselineMetrics: null,
      score: 59,
      evidence: 'Query lands on /news instead of the canonical glossary page.',
      suggestedAction: 'Create or route users to a canonical entity page.',
      canonicalPath: '/glossary/turing-award',
    };

    mockSeoInsightsApi.list
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce(buildListResult({
        data: [contentGapInsight],
        meta: {
          weekStart: '2026-04-24',
          availableWeeks: ['2026-04-24'],
          counts: {
            winnable_loss: 1,
            content_gap: 1,
            trend_signal: 0,
            decay: 0,
          },
        },
      }))
      .mockResolvedValueOnce(buildListResult({
        data: [{ ...contentGapInsight, status: 'actioned' }],
        meta: {
          weekStart: '2026-04-24',
          availableWeeks: ['2026-04-24'],
          counts: {
            winnable_loss: 1,
            content_gap: 1,
            trend_signal: 0,
            decay: 0,
          },
        },
      }));
    mockSeoInsightsApi.get.mockResolvedValue({
      ...contentGapInsight,
      trend: [
        {
          weekStart: '2026-04-03',
          impressions: 25,
          clicks: 2,
          ctr: 0.08,
          position: 5.1,
        },
      ],
    });
    mockSeoInsightsApi.generateProposal.mockResolvedValue(buildProposalRecord());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('turing award multiple winners quiz')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /content gaps/i }));
    expect(await screen.findByText('Turing Award')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open detail/i }));

    expect(await screen.findByText(/editorial proposal lane/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /generate proposal/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.generateProposal).toHaveBeenCalledWith('insight_2');
    });

    expect(await screen.findByTestId('seo-content-proposal')).toBeInTheDocument();
    expect(screen.getByText(/why the turing award still shapes how ai breakthroughs get interpreted/i)).toBeInTheDocument();
  });

  it('renders the first-run automation banner from health state', async () => {
    mockSeoInsightsApi.list.mockResolvedValue(buildListResult());

    renderPage();

    expect(await screen.findByTestId('seo-ops-banner')).toBeInTheDocument();
    expect(await screen.findByText(/weekly digest is not live yet/i)).toBeInTheDocument();
    expect(screen.getByTestId('seo-serper-summary')).toHaveTextContent('Serper spend');
    expect(screen.getByTestId('seo-serper-summary')).toHaveTextContent('4 queries');
    expect(screen.getByTestId('seo-serper-summary')).toHaveTextContent('$0.0040');
    expect(screen.getByTestId('seo-serper-summary')).toHaveTextContent('Auto top-up off');
    expect(screen.getByRole('button', { name: /pause auto-ship/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders Tuesday editorial status with post review links', async () => {
    mockSeoInsightsApi.list.mockResolvedValue(buildListResult());
    mockSeoInsightsApi.getEditorialStatus.mockResolvedValue(buildEditorialStatus({
      run: {
        status: 'success',
        startedAt: '2026-05-05T15:00:00.000Z',
        completedAt: '2026-05-05T15:04:00.000Z',
        weekStart: '2026-04-24T00:00:00.000Z',
        publishedCount: 1,
        draftCount: 1,
        skippedCount: 2,
        emailStatus: 'sent',
        digestUrl: 'https://letaiexplainai.com/admin/seo-insights',
        errorMessage: null,
        items: [
          {
            id: 'proposal_1',
            sourceType: 'proposal',
            action: 'auto_published',
            title: 'AI timeline acceleration phases',
            publicUrl: 'https://letaiexplainai.com/blog/ai-timeline-acceleration',
            adminUrl: 'https://letaiexplainai.com/admin/blog/post_1/edit',
            sourceUrl: 'https://letaiexplainai.com/admin/seo-insights/proposals',
            reason: 'Passed the blog quality gate.',
          },
          {
            id: 'keyword_1',
            sourceType: 'keyword',
            action: 'draft_for_review',
            title: 'AI agent memory explained',
            publicUrl: null,
            adminUrl: 'https://letaiexplainai.com/admin/blog/post_2/edit',
            sourceUrl: 'https://letaiexplainai.com/admin/seo-insights/portfolio',
            reason: 'Created as draft because the source mix needs human review.',
          },
        ],
      },
    }));

    renderPage();

    expect(await screen.findByTestId('seo-editorial-status-panel')).toHaveTextContent('Tuesday editorial autopilot');
    expect(await screen.findByText(/last tuesday run: 1 published, 1 drafts/i)).toBeInTheDocument();
    expect(screen.getByText('Auto-published')).toBeInTheDocument();
    expect(screen.getByText('Draft for review')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open public post/i })).toHaveAttribute(
      'href',
      'https://letaiexplainai.com/blog/ai-timeline-acceleration'
    );
    expect(screen.getAllByRole('link', { name: /edit post/i })[0]).toHaveAttribute(
      'href',
      'https://letaiexplainai.com/admin/blog/post_1/edit'
    );
    expect(screen.getByRole('link', { name: /open source proposal/i })).toHaveAttribute(
      'href',
      'https://letaiexplainai.com/admin/seo-insights/proposals'
    );
    expect(screen.getByRole('link', { name: /open source keyword/i })).toHaveAttribute(
      'href',
      'https://letaiexplainai.com/admin/seo-insights/portfolio'
    );
  });

  it('pauses and resumes the Tuesday editorial autopilot separately', async () => {
    mockSeoInsightsApi.list
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce(buildListResult());
    mockSeoInsightsApi.getHealth
      .mockResolvedValueOnce(buildHealthResult())
      .mockResolvedValueOnce(buildHealthResult())
      .mockResolvedValueOnce(buildHealthResult());
    mockSeoInsightsApi.getEditorialStatus
      .mockResolvedValueOnce(buildEditorialStatus())
      .mockResolvedValueOnce(buildEditorialStatus({ paused: true }))
      .mockResolvedValueOnce(buildEditorialStatus({ paused: false }));
    mockSeoInsightsApi.setEditorialPaused
      .mockResolvedValueOnce({ paused: true })
      .mockResolvedValueOnce({ paused: false });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('turing award multiple winners quiz');

    await user.click(screen.getByRole('button', { name: /pause tuesday autopilot/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.setEditorialPaused).toHaveBeenCalledWith(true);
    });

    expect(await screen.findByRole('button', { name: /resume tuesday autopilot/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(screen.getByRole('button', { name: /resume tuesday autopilot/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => {
      expect(mockSeoInsightsApi.setEditorialPaused).toHaveBeenLastCalledWith(false);
    });
  });

  it('shows the persisted Serper snapshot from the last weekly digest run', async () => {
    mockSeoInsightsApi.list.mockResolvedValue(buildListResult());
    mockSeoInsightsApi.getHealth.mockResolvedValue(buildHealthResult({
      agentRun: {
        status: 'success',
        startedAt: '2026-05-05T13:00:00.000Z',
        completedAt: '2026-05-05T13:03:00.000Z',
        weekStart: '2026-04-28T00:00:00.000Z',
        shippedCount: 2,
        proposalCount: 1,
        humanOnlyCount: 0,
        measuredCount: 1,
        digestUrl: null,
        errorMessage: null,
        serperSnapshot: {
          capturedAt: '2026-05-05T13:03:00.000Z',
          configured: true,
          enabled: true,
          autoTopupEnabled: false,
          creditsUsedWeek: 4,
          creditsUsedMonth: 4,
          effectiveSpendWeekUsd: 0.004,
          effectiveSpendMonthUsd: 0.004,
          remainingCredits: 2_496,
          remainingCreditsSource: 'vendor_observed_adjusted' as const,
          remainingCreditsObservedAt: '2026-05-01T23:51:30.000Z',
          projectedDepletionDate: '2038-04-16T03:55:00.000Z',
          lastSampledAt: '2026-05-01T20:53:00.000Z',
          warningLevel: 'ok' as const,
        },
      },
    }));

    renderPage();

    expect(await screen.findByTestId('seo-digest-serper-snapshot')).toHaveTextContent(
      /serper snapshot for that digest: 4 queries that week/i
    );
    expect(screen.getByTestId('seo-digest-serper-snapshot')).toHaveTextContent('$0.0040 modeled month');
    expect(screen.getByTestId('seo-digest-serper-snapshot')).toHaveTextContent('tracked vendor balance 2,496');
  });

  it('opens an in-page digest summary when the persisted digest URL loops back to seo insights', async () => {
    mockSeoInsightsApi.list.mockResolvedValue(buildListResult());
    mockSeoInsightsApi.getHealth.mockResolvedValue(buildHealthResult({
      agentRun: {
        status: 'success',
        startedAt: '2026-05-05T13:00:00.000Z',
        completedAt: '2026-05-05T13:03:00.000Z',
        weekStart: '2026-04-28T00:00:00.000Z',
        shippedCount: 2,
        proposalCount: 1,
        humanOnlyCount: 3,
        measuredCount: 1,
        digestUrl: '/admin/seo-insights',
        errorMessage: null,
        serperSnapshot: {
          capturedAt: '2026-05-05T13:03:00.000Z',
          configured: true,
          enabled: true,
          autoTopupEnabled: false,
          creditsUsedWeek: 4,
          creditsUsedMonth: 4,
          effectiveSpendWeekUsd: 0.004,
          effectiveSpendMonthUsd: 0.004,
          remainingCredits: 2_496,
          remainingCreditsSource: 'vendor_observed_adjusted' as const,
          remainingCreditsObservedAt: '2026-05-01T23:51:30.000Z',
          projectedDepletionDate: '2038-04-16T03:55:00.000Z',
          lastSampledAt: '2026-05-01T20:53:00.000Z',
          warningLevel: 'ok' as const,
        },
      },
    }));

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('turing award multiple winners quiz');

    await user.click(screen.getByTestId('view-digest-summary'));

    expect(await screen.findByTestId('seo-digest-summary-drawer')).toBeInTheDocument();
    expect(screen.getByText(/last digest run completed/i)).toBeInTheDocument();
    expect(screen.getByText(/run totals/i)).toBeInTheDocument();
    expect(screen.getByText(/queued proposals/i)).toBeInTheDocument();
    expect(screen.getByText(/human-only findings/i)).toBeInTheDocument();
    expect(screen.getByText(/paid discovery snapshot/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /review proposals/i })[0]).toHaveAttribute(
      'href',
      '/admin/seo-insights/proposals'
    );
    expect(screen.queryByRole('link', { name: /open linked digest/i })).not.toBeInTheDocument();
  });

  it('elevates Serper warnings on the SEO ops banner when burn looks risky', async () => {
    mockSeoInsightsApi.list.mockResolvedValue(buildListResult());
    mockSeoInsightsApi.getHealth.mockResolvedValue(buildHealthResult({
      serper: {
        configured: true,
        enabled: true,
        pricingEnabled: true,
        pausedBySeoAgent: false,
        autoTopupEnabled: false,
        tierLabel: 'starter',
        purchasedCredits: 50_000,
        monthlyCreditBudget: 2_500,
        creditsUsedToday: 0,
        creditsUsedWeek: 28_000,
        creditsUsedMonth: 28_000,
        creditsUsedTotal: 28_000,
        effectiveSpendTodayUsd: 0,
        effectiveSpendWeekUsd: 28,
        effectiveSpendMonthUsd: 28,
        effectiveSpendTotalUsd: 28,
        remainingCredits: 22_000,
        remainingCreditsSource: 'policy_derived' as const,
        remainingCreditsObservedAt: null,
        projectedDepletionDate: '2026-05-06T20:53:00.000Z',
        lastSampledAt: '2026-05-01T20:53:00.000Z',
        warningLevel: 'warning',
      },
    }));

    renderPage();

    expect(await screen.findByTestId('seo-serper-summary')).toHaveTextContent('Warning');
    expect(screen.getByTestId('seo-serper-summary')).toHaveTextContent(/needs attention/i);
    expect(screen.getByTestId('seo-serper-summary')).toHaveTextContent(/Projected depletion/i);
  });

  it('pauses immediately and requires confirmation before resuming', async () => {
    mockSeoInsightsApi.list
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce(buildListResult());
    mockSeoInsightsApi.getHealth
      .mockResolvedValueOnce(buildHealthResult())
      .mockResolvedValueOnce(buildHealthResult({ paused: true }))
      .mockResolvedValueOnce(buildHealthResult({ paused: false }));
    mockSeoInsightsApi.setPaused
      .mockResolvedValueOnce({ paused: true })
      .mockResolvedValueOnce({ paused: false });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('turing award multiple winners quiz');

    await user.click(screen.getByRole('button', { name: /pause auto-ship/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.setPaused).toHaveBeenCalledWith(true);
    });

    expect(await screen.findByRole('button', { name: /resume auto-ship/i })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /resume auto-ship/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => {
      expect(mockSeoInsightsApi.setPaused).toHaveBeenLastCalledWith(false);
    });
  });
});

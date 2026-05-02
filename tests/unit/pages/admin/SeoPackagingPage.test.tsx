import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../../src/services/api', () => ({
  ApiError: class ApiError extends Error {
    statusCode: number;
    details?: unknown;

    constructor(statusCode: number, message: string, details?: unknown) {
      super(message);
      this.name = 'ApiError';
      this.statusCode = statusCode;
      this.details = details;
    }
  },
  seoInsightsApi: {
    listPackagingAudits: jest.fn(),
    proposePackagingEvergreen: jest.fn(),
    proposePackagingFix: jest.fn(),
  },
}));

import { seoInsightsApi } from '../../../../src/services/api';
import SeoPackagingPage from '../../../../src/pages/admin/SeoPackagingPage';

const mockSeoInsightsApi = seoInsightsApi as jest.Mocked<typeof seoInsightsApi>;

function renderPage() {
  return render(
    <MemoryRouter>
      <SeoPackagingPage />
    </MemoryRouter>
  );
}

function buildAudit() {
  return {
    id: 'packaging_1',
    windowStart: '2026-01-29',
    windowEnd: '2026-04-28',
    pageUrl: 'https://letaiexplainai.com/news',
    pagePath: '/news',
    pageType: 'news_index' as const,
    title: 'AI News - Latest Artificial Intelligence Headlines & Updates',
    h1: 'AI News Hub',
    description: 'Stay current with the latest AI news and developments.',
    canonicalPath: '/news',
    impressions: 46,
    clicks: 0,
    ctr: 0,
    position: 8.7,
    issueCount: 2,
    criticalCount: 1,
    experimentActive: false,
    issueTypes: ['evergreen_routing', 'title_link_risk'] as const,
    issues: [
      {
        id: 'evergreen_routing:primary',
        type: 'evergreen_routing' as const,
        severity: 'critical' as const,
        label: 'Repeated demand is leaking to a transient news destination',
        details: 'Demand is landing on /news.',
        recommendedFix: 'Route this to a stronger evergreen page.',
      },
      {
        id: 'title_link_risk:secondary',
        type: 'title_link_risk' as const,
        severity: 'info' as const,
        label: 'Archive page is attracting impressions without clicks',
        details: '46 impressions produced no clicks.',
        recommendedFix: 'Strengthen the destination.',
      },
    ],
    structuredDataTypes: [],
    existingPackagingFixProposal: null,
    evergreenRecommendation: {
      clusterId: 'cluster_1',
      representativeQuery: '"turing award" "multiple winners" quiz',
      targetPath: '/blog/turing-award-multiple-winners',
      targetLabel: 'New blog explainer: Turing Award Multiple Winners',
      moveType: 'create_new' as const,
      rationale: 'A dedicated page should outperform the generic news destination.',
    },
  };
}

function buildListResult() {
  return {
    data: [buildAudit()],
    pagination: {
      page: 1,
      limit: 100,
      total: 1,
      totalPages: 1,
    },
    meta: {
      windowStart: '2026-01-29',
      windowEnd: '2026-04-28',
      counts: {
        all: 1,
        critical: 1,
        warning: 0,
        info: 0,
      },
    },
  };
}

function buildExistingPackagingFixProposal(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'proposal_fix_1',
    status: 'pending',
    createdAt: '2026-05-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('SeoPackagingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the packaging backlog and opens the detail drawer', async () => {
    mockSeoInsightsApi.listPackagingAudits.mockResolvedValue(buildListResult());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('/news')).toBeInTheDocument();
    expect(screen.getByText(/repeated demand is leaking/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view detail/i }));

    expect(await screen.findByText(/read-only serp packaging audit/i)).toBeInTheDocument();
    expect(screen.getByText('/blog/turing-award-multiple-winners')).toBeInTheDocument();
  });

  it('queues an evergreen routing proposal from the packaging table', async () => {
    mockSeoInsightsApi.listPackagingAudits
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce({
        ...buildListResult(),
        data: [],
        pagination: {
          page: 1,
          limit: 100,
          total: 0,
          totalPages: 0,
        },
        meta: {
          ...buildListResult().meta,
          counts: {
            all: 0,
            critical: 0,
            warning: 0,
            info: 0,
          },
        },
      });
    mockSeoInsightsApi.proposePackagingEvergreen.mockResolvedValue({
      id: 'proposal_1',
      sourceType: 'cluster_snapshot',
      sourceId: 'cluster_1',
      proposalType: 'evergreen_routing',
      targetKeyword: 'turing award multiple winners',
      suggestedAngle: 'Create a canonical evergreen destination at /blog/turing-award-multiple-winners and route repeated demand toward it.',
      rationale: 'A dedicated evergreen page should outperform the generic news destination.',
      hypothesis: 'A dedicated evergreen page should outperform the generic news destination.',
      confidence: 0.84,
      status: 'pending',
      rejectedReason: null,
      createdAt: '2026-05-01T12:00:00.000Z',
      actedAt: null,
      sourceWindowStart: '2026-04-01T00:00:00.000Z',
      sourceWindowEnd: '2026-04-28T00:00:00.000Z',
      sourceBucket: 'cluster_content_gap',
      sourcePage: 'https://letaiexplainai.com/news',
      sourceQuery: '"turing award" "multiple winners" quiz',
      linkInventory: [],
      newsHooks: [],
      topicPod: null,
      routingPlan: {
        currentPath: '/news',
        representativeQuery: '"turing award" "multiple winners" quiz',
        targetPath: '/blog/turing-award-multiple-winners',
        targetLabel: 'New blog explainer: Turing Award Multiple Winners',
        moveType: 'create_new',
        rationale: 'A dedicated evergreen page should outperform the generic news destination.',
      },
      packagingFixPlan: null,
      handoff: {
        mode: 'blog_draft',
        label: 'Draft canonical destination',
        topic: 'Create a canonical evergreen destination at /blog/turing-award-multiple-winners and route repeated demand toward it.',
        keyword: 'turing award multiple winners',
        newsUrl: null,
        command: '/AIBlogDraft topic: "Create a canonical evergreen destination at /blog/turing-award-multiple-winners and route repeated demand toward it." keyword: "turing award multiple winners"',
        proposalPath: 'https://letaiexplainai.com/admin/seo-insights/proposals',
        guidance: 'This routing plan needs a stronger evergreen destination first. Draft the recommended destination, then route recurring demand toward it.',
      },
      draftPost: null,
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('/news')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /queue routing proposal/i }));

    expect(mockSeoInsightsApi.proposePackagingEvergreen).toHaveBeenCalledWith('packaging_1');
  });

  it('queues a manual packaging-fix proposal from the packaging table', async () => {
    mockSeoInsightsApi.listPackagingAudits.mockResolvedValue(buildListResult());
    mockSeoInsightsApi.proposePackagingFix.mockResolvedValue({
      id: 'proposal_fix_1',
      sourceType: 'packaging_audit',
      sourceId: 'packaging_1',
      proposalType: 'packaging_fix',
      targetKeyword: '/news',
      suggestedAngle: 'Tighten the title signal on /news so the page presents a clearer answer in search.',
      rationale: '/news already has impressions but is still showing a packaging gap.',
      hypothesis: 'If /news gets clearer title packaging, click-through should improve on the existing impression base.',
      confidence: 0.76,
      status: 'pending',
      rejectedReason: null,
      createdAt: '2026-05-01T12:00:00.000Z',
      actedAt: null,
      sourceWindowStart: '2026-01-29',
      sourceWindowEnd: '2026-04-28',
      sourceBucket: 'serp_packaging',
      sourcePage: 'https://letaiexplainai.com/news',
      sourceQuery: null,
      linkInventory: [],
      newsHooks: [],
      topicPod: null,
      routingPlan: null,
      packagingFixPlan: {
        pagePath: '/news',
        pageType: 'news_index',
        title: 'AI News - Latest Artificial Intelligence Headlines & Updates',
        h1: 'AI News Hub',
        description: 'Stay current with the latest AI news and developments.',
        canonicalPath: '/news',
        structuredDataTypes: [],
        issueTypes: ['title_link_risk'],
        issues: [
          {
            id: 'title_link_risk:secondary',
            type: 'title_link_risk',
            severity: 'info',
            label: 'Archive page is attracting impressions without clicks',
            details: '46 impressions produced no clicks.',
            recommendedFix: 'Strengthen the destination.',
          },
        ],
      },
      handoff: {
        mode: 'manual_packaging_fix',
        label: 'Review packaging plan',
        topic: null,
        keyword: '/news',
        newsUrl: null,
        command: null,
        proposalPath: 'https://letaiexplainai.com/admin/seo-insights/proposals',
        guidance: 'Review the recommended title, metadata, breadcrumb, and structured-data changes manually before shipping. Packaging fixes stay human-approved.',
      },
      draftPost: null,
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('/news')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /queue packaging fix/i }));

    expect(mockSeoInsightsApi.proposePackagingFix).toHaveBeenCalledWith('packaging_1');
  });

  it('shows the existing packaging proposal instead of queueing a duplicate', async () => {
    mockSeoInsightsApi.listPackagingAudits.mockResolvedValue({
      ...buildListResult(),
      data: [
        {
          ...buildAudit(),
          existingPackagingFixProposal: buildExistingPackagingFixProposal(),
        },
      ],
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('/news')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /view queued proposal/i });
    await user.click(button);

    expect(mockSeoInsightsApi.proposePackagingFix).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/admin/seo-insights/proposals?status=pending');
  });

  it('shows the existing packaging proposal in the detail drawer too', async () => {
    mockSeoInsightsApi.listPackagingAudits.mockResolvedValue({
      ...buildListResult(),
      data: [
        {
          ...buildAudit(),
          existingPackagingFixProposal: buildExistingPackagingFixProposal(),
        },
      ],
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('/news')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view detail/i }));
    expect(await screen.findByText(/read-only serp packaging audit/i)).toBeInTheDocument();

    const buttons = screen.getAllByRole('button', { name: /view queued proposal/i });
    await user.click(buttons[buttons.length - 1]);

    expect(mockSeoInsightsApi.proposePackagingFix).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/admin/seo-insights/proposals?status=pending');
  });

  it('routes to the existing proposal when the backend duplicate guard returns proposal details', async () => {
    mockSeoInsightsApi.listPackagingAudits.mockResolvedValue(buildListResult());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('/news')).toBeInTheDocument();

    const duplicateError = new (jest.requireMock('../../../../src/services/api').ApiError)(409, 'duplicate', {
      existingId: 'proposal_fix_1',
      existingStatus: 'pending',
      proposalType: 'packaging_fix',
    });
    mockSeoInsightsApi.proposePackagingFix.mockRejectedValueOnce(duplicateError);

    await user.click(screen.getByRole('button', { name: /queue packaging fix/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/admin/seo-insights/proposals?status=pending');
    expect(await screen.findByRole('button', { name: /view queued proposal/i })).toBeInTheDocument();
  });
});

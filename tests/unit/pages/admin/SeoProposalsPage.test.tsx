import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../../src/services/api', () => ({
  seoInsightsApi: {
    listProposals: jest.fn(),
    approveProposal: jest.fn(),
    rejectProposal: jest.fn(),
    linkProposalDraft: jest.fn(),
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
import SeoProposalsPage from '../../../../src/pages/admin/SeoProposalsPage';

const mockSeoInsightsApi = seoInsightsApi as jest.Mocked<typeof seoInsightsApi>;

function renderPage(initialEntries?: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <SeoProposalsPage />
    </MemoryRouter>
  );
}

function buildProposal(overrides: Partial<{
  id: string;
  sourceType: string;
  status: 'pending' | 'drafting' | 'approved' | 'rejected' | 'shipped';
  proposalType: 'blog_post' | 'evergreen_routing' | 'packaging_fix';
  targetKeyword: string;
  suggestedAngle: string;
  rejectedReason: string | null;
  sourcePage: string;
  sourceQuery: string;
  draftPost: {
    id: string;
    slug: string;
    title: string;
    status: string;
    publishedAt: string | null;
  } | null;
}> = {}) {
  return {
    id: overrides.id ?? 'proposal_1',
    sourceType: overrides.sourceType ?? 'weekly_snapshot',
    sourceId: 'snapshot_1',
    proposalType: overrides.proposalType ?? 'blog_post',
    targetKeyword: overrides.targetKeyword ?? 'AI agents in healthcare',
    suggestedAngle: overrides.suggestedAngle ?? 'Why AI agent pilots in healthcare keep hitting workflow bottlenecks',
    rationale: 'The query is rising and the workflow bottleneck gives the post a real thesis.',
    hypothesis: 'The query is rising and the workflow bottleneck gives the post a real thesis.',
    confidence: 0.86,
    status: overrides.status ?? 'pending',
    rejectedReason: overrides.rejectedReason ?? null,
    createdAt: '2026-04-30T12:00:00.000Z',
    actedAt: null,
    sourceWindowStart: '2026-04-21T00:00:00.000Z',
    sourceWindowEnd: null,
    sourceBucket: 'content_gap',
    sourcePage: overrides.sourcePage ?? 'https://letaiexplainai.com/news',
    sourceQuery: overrides.sourceQuery ?? 'AI agents in healthcare',
    linkInventory: [
      {
        entityType: 'organization' as const,
        id: 'org_1',
        label: 'OpenAI',
        path: '/organizations/openai',
        reason: 'Related organization match for internal linking.',
      },
    ],
    newsHooks: [
      {
        articleId: 'article_1',
        title: 'Hospitals test AI agents for clinician workflows',
        externalUrl: 'https://example.com/hospitals-test-ai-agents',
        sourceName: 'Example Source',
        publishedAt: '2026-04-28T12:00:00.000Z',
      },
    ],
    topicPod: null,
    routingPlan: null,
    packagingFixPlan: null,
    handoff: {
      mode: overrides.proposalType === 'packaging_fix' ? 'manual_packaging_fix' as const : 'blog_draft' as const,
      label: overrides.proposalType === 'packaging_fix' ? 'Review packaging plan' : 'Send to /AIBlogDraft',
      topic: 'Why AI agent pilots in healthcare keep hitting workflow bottlenecks',
      keyword: overrides.targetKeyword ?? 'AI agents in healthcare',
      newsUrl: overrides.proposalType === 'packaging_fix' ? null : 'https://example.com/hospitals-test-ai-agents',
      command: overrides.proposalType === 'packaging_fix'
        ? null
        : '/AIBlogDraft topic: "Why AI agent pilots in healthcare keep hitting workflow bottlenecks" keyword: "AI agents in healthcare" news_url: "https://example.com/hospitals-test-ai-agents"',
      proposalPath: 'https://letaiexplainai.com/admin/seo-insights/proposals',
      guidance: overrides.proposalType === 'packaging_fix'
        ? 'Review the recommended title, metadata, breadcrumb, and structured-data changes manually before shipping. Packaging fixes stay human-approved.'
        : 'Approving this proposal keeps a human in the loop and prepares a structured /AIBlogDraft handoff.',
    },
    draftPost: overrides.draftPost ?? null,
  };
}

function buildListResult(overrides: Partial<Awaited<ReturnType<typeof seoInsightsApi.listProposals>>> = {}) {
  return {
    data: [buildProposal()],
    pagination: {
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
    },
    meta: {
      counts: {
        all: 1,
        pending: 1,
        drafting: 0,
        approved: 0,
        rejected: 0,
        shipped: 0,
      },
    },
    ...overrides,
  };
}

describe('SeoProposalsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the proposals table and opens the detail drawer', async () => {
    mockSeoInsightsApi.listProposals.mockResolvedValue(buildListResult());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('AI agents in healthcare')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view detail/i }));

    expect(await screen.findByText(/human-reviewed follow-through plan/i)).toBeInTheDocument();
    expect(screen.getByText(/hospitals test ai agents for clinician workflows/i)).toBeInTheDocument();
    expect(screen.getByText(/link inventory/i)).toBeInTheDocument();
  });

  it('explains that keyword-opportunity blog URLs are planned destinations, not live drafts', async () => {
    mockSeoInsightsApi.listProposals.mockResolvedValue(buildListResult({
      data: [
        buildProposal({
          sourceType: 'keyword_opportunity',
          status: 'drafting',
          targetKeyword: 'chip gaines',
          sourcePage: 'https://letaiexplainai.com/blog/chip-gaines',
          sourceQuery: 'chip gaines',
          draftPost: null,
        }),
      ],
    }));

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('chip gaines')).toBeInTheDocument();
    expect(screen.getByText(/planned destination https:\/\/letaiexplainai\.com\/blog\/chip-gaines/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /view detail/i }));

    expect(await screen.findByText(/^planned destination$/i, { selector: 'dt' })).toBeInTheDocument();
    expect(screen.getByText(/it does not mean a blog draft already exists yet/i)).toBeInTheDocument();
    expect(screen.getByText(/planned destinations like \/blog\/chip-gaines do not count until a real post exists/i)).toBeInTheDocument();
  });

  it('respects the status query param when opening the proposals page', async () => {
    mockSeoInsightsApi.listProposals.mockResolvedValue(buildListResult({
      data: [buildProposal({ status: 'rejected', rejectedReason: 'Too broad and too close to an existing page.' })],
      meta: {
        counts: {
          all: 1,
          pending: 0,
          drafting: 0,
          approved: 0,
          rejected: 1,
          shipped: 0,
        },
      },
    }));

    renderPage(['/admin/seo-insights/proposals?status=rejected']);

    await waitFor(() => {
      expect(mockSeoInsightsApi.listProposals).toHaveBeenCalledWith({
        status: 'rejected',
        page: 1,
        limit: 25,
      });
    });
    expect(await screen.findByText('AI agents in healthcare')).toBeInTheDocument();
  });

  it('approves a proposal from the table and refreshes the queue', async () => {
    mockSeoInsightsApi.listProposals
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce(buildListResult({
        data: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
        meta: {
          counts: {
            all: 1,
            pending: 0,
            drafting: 1,
            approved: 0,
            rejected: 0,
            shipped: 0,
          },
        },
      }));
    mockSeoInsightsApi.approveProposal.mockResolvedValue({
      proposal: buildProposal({ status: 'drafting' }),
      handoff: buildProposal().handoff,
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('AI agents in healthcare')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /send to \/aiblogdraft/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.approveProposal).toHaveBeenCalledWith('proposal_1');
    });
  });

  it('shows the packaging approval action for manual packaging proposals', async () => {
    mockSeoInsightsApi.listProposals.mockResolvedValue(buildListResult({
      data: [
        {
          ...buildProposal({
            proposalType: 'packaging_fix',
            targetKeyword: '/news',
            suggestedAngle: 'Tighten the title signal on /news so the page presents a clearer answer in search.',
          }),
          sourceType: 'packaging_audit',
          sourceId: 'packaging_1',
          sourceBucket: 'serp_packaging',
          sourcePage: 'https://letaiexplainai.com/news',
          sourceQuery: null,
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
                severity: 'warning',
                label: 'Archive page is attracting impressions without clicks',
                details: '80 impressions produced no clicks.',
                recommendedFix: 'Strengthen the page title and description.',
              },
            ],
          },
        },
      ],
    }));

    renderPage();

    expect(await screen.findByText('/news')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve packaging plan/i })).toBeInTheDocument();
  });

  it('rejects a proposal after collecting a reason', async () => {
    mockSeoInsightsApi.listProposals.mockResolvedValue(buildListResult());
    mockSeoInsightsApi.rejectProposal.mockResolvedValue(buildProposal({
      status: 'rejected',
      rejectedReason: 'Too broad and too close to an existing glossary page.',
    }));

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('AI agents in healthcare')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^reject$/i }));
    expect(await screen.findByTestId('reject-proposal-dialog')).toBeInTheDocument();

    await user.type(screen.getByTestId('reject-reason-input'), 'Too broad and too close to an existing glossary page.');
    await user.click(screen.getByRole('button', { name: /reject proposal/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.rejectProposal).toHaveBeenCalledWith(
        'proposal_1',
        'Too broad and too close to an existing glossary page.'
      );
    });
  });

  it('links a draft post from the drawer when the proposal is already drafting', async () => {
    mockSeoInsightsApi.listProposals.mockResolvedValue(buildListResult({
      data: [buildProposal({ status: 'drafting' })],
      meta: {
        counts: {
          all: 1,
          pending: 0,
          drafting: 1,
          approved: 0,
          rejected: 0,
          shipped: 0,
        },
      },
    }));
    mockSeoInsightsApi.linkProposalDraft.mockResolvedValue(buildProposal({
      status: 'approved',
      draftPost: {
        id: 'post_1',
        slug: 'ai-agents-healthcare',
        title: 'Why AI agent pilots in healthcare keep hitting workflow bottlenecks',
        status: 'draft',
        publishedAt: null,
      },
    }));

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('AI agents in healthcare')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view detail/i }));
    await user.type(await screen.findByTestId('proposal-draft-post-id'), 'post_1');
    await user.click(screen.getByRole('button', { name: /link draft/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.linkProposalDraft).toHaveBeenCalledWith('proposal_1', 'post_1');
    });
  });
});

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

function renderPage() {
  return render(
    <MemoryRouter>
      <SeoProposalsPage />
    </MemoryRouter>
  );
}

function buildProposal(overrides: Partial<{
  id: string;
  status: 'pending' | 'drafting' | 'approved' | 'rejected' | 'shipped';
  targetKeyword: string;
  suggestedAngle: string;
  rejectedReason: string | null;
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
    snapshotId: 'snapshot_1',
    proposalType: 'blog_post',
    targetKeyword: overrides.targetKeyword ?? 'AI agents in healthcare',
    suggestedAngle: overrides.suggestedAngle ?? 'Why AI agent pilots in healthcare keep hitting workflow bottlenecks',
    rationale: 'The query is rising and the workflow bottleneck gives the post a real thesis.',
    confidence: 0.86,
    status: overrides.status ?? 'pending',
    rejectedReason: overrides.rejectedReason ?? null,
    createdAt: '2026-04-30T12:00:00.000Z',
    actedAt: null,
    weekStart: '2026-04-21T00:00:00.000Z',
    sourceBucket: 'content_gap',
    sourcePage: 'https://letaiexplainai.com/news',
    sourceQuery: 'AI agents in healthcare',
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
    handoff: {
      topic: 'Why AI agent pilots in healthcare keep hitting workflow bottlenecks',
      keyword: 'AI agents in healthcare',
      newsUrl: 'https://example.com/hospitals-test-ai-agents',
      command: '/AIBlogDraft topic: "Why AI agent pilots in healthcare keep hitting workflow bottlenecks" keyword: "AI agents in healthcare" news_url: "https://example.com/hospitals-test-ai-agents"',
      proposalPath: 'https://letaiexplainai.com/admin/seo-insights/proposals',
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

    expect(await screen.findByText(/structured \/aiblogdraft handoff/i)).toBeInTheDocument();
    expect(screen.getByText(/hospitals test ai agents for clinician workflows/i)).toBeInTheDocument();
    expect(screen.getByText(/link inventory/i)).toBeInTheDocument();
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

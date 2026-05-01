import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../../src/services/api', () => ({
  seoInsightsApi: {
    listExperiments: jest.fn(),
    reviewExperiment: jest.fn(),
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
import SeoExperimentsPage from '../../../../src/pages/admin/SeoExperimentsPage';

const mockSeoInsightsApi = seoInsightsApi as jest.Mocked<typeof seoInsightsApi>;

function renderPage() {
  return render(
    <MemoryRouter>
      <SeoExperimentsPage />
    </MemoryRouter>
  );
}

function buildExperiment(overrides: Partial<{
  id: string;
  status: 'planned' | 'running' | 'won' | 'flat' | 'lost' | 'archived';
  targetKeyword: string;
}> = {}) {
  return {
    id: overrides.id ?? 'experiment_1',
    sourceType: 'cluster_snapshot',
    sourceId: 'cluster_1',
    proposalId: 'proposal_1',
    actionId: null,
    targetKeyword: overrides.targetKeyword ?? 'AI timeline',
    targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
    hypothesis: 'A dedicated AI timeline explainer should outperform the generic hub page.',
    variantType: 'blog_post',
    status: overrides.status ?? 'planned',
    scheduledReviewAt: '2026-05-15T00:00:00.000Z',
    reviewWindowDays: 7,
    notes: null,
    lastReviewedAt: null,
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-01T12:00:00.000Z',
    metricsBefore: {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      avgPosition: 0,
      windowStart: '2026-04-24',
      windowEnd: '2026-04-30',
    },
    metricsAfter: null,
    checkpoints: [
      {
        label: 'D+14',
        reviewWindowDays: 7,
        scheduledReviewAt: '2026-05-15T00:00:00.000Z',
        state: 'due' as const,
        reviewedAt: null,
        outcome: null,
        metricsAfter: null,
        notes: null,
      },
      {
        label: 'D+28',
        reviewWindowDays: 7,
        scheduledReviewAt: '2026-05-29T00:00:00.000Z',
        state: 'scheduled' as const,
        reviewedAt: null,
        outcome: null,
        metricsAfter: null,
        notes: null,
      },
      {
        label: 'D+56',
        reviewWindowDays: 7,
        scheduledReviewAt: '2026-06-26T00:00:00.000Z',
        state: 'scheduled' as const,
        reviewedAt: null,
        outcome: null,
        metricsAfter: null,
        notes: null,
      },
    ],
    topicPod: null,
  };
}

function buildListResult(overrides: Partial<Awaited<ReturnType<typeof seoInsightsApi.listExperiments>>> = {}) {
  return {
    data: [buildExperiment()],
    pagination: {
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
    },
    meta: {
      dueCount: 1,
      counts: {
        all: 1,
        planned: 1,
        running: 0,
        won: 0,
        flat: 0,
        lost: 0,
        archived: 0,
      },
    },
    ...overrides,
  };
}

describe('SeoExperimentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the experiment ledger and opens the drawer', async () => {
    mockSeoInsightsApi.listExperiments.mockResolvedValue(buildListResult());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('AI timeline')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view detail/i }));

    expect(await screen.findByText(/scheduled seo experiment ledger/i)).toBeInTheDocument();
    expect(screen.getAllByText(/next review/i).length).toBeGreaterThan(0);
  });

  it('reviews a due checkpoint and refreshes the table', async () => {
    mockSeoInsightsApi.listExperiments
      .mockResolvedValueOnce(buildListResult())
      .mockResolvedValueOnce(buildListResult({
        data: [buildExperiment({ status: 'running' })],
        meta: {
          dueCount: 0,
          counts: {
            all: 1,
            planned: 0,
            running: 1,
            won: 0,
            flat: 0,
            lost: 0,
            archived: 0,
          },
        },
      }));
    mockSeoInsightsApi.reviewExperiment.mockResolvedValue(buildExperiment({ status: 'running' }));

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('AI timeline')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /review d\+14/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.reviewExperiment).toHaveBeenCalledWith('experiment_1');
    });
  });
});

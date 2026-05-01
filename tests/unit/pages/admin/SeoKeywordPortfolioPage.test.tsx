import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../../src/services/api', () => ({
  seoInsightsApi: {
    listKeywordPortfolio: jest.fn(),
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

const mockSeoInsightsApi = seoInsightsApi as jest.Mocked<typeof seoInsightsApi>;

function renderPage() {
  return render(
    <MemoryRouter>
      <SeoKeywordPortfolioPage />
    </MemoryRouter>
  );
}

function buildOpportunity() {
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
});

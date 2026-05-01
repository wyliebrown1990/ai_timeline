import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../../src/services/api', () => ({
  seoInsightsApi: {
    listActions: jest.fn(),
    rollbackAction: jest.fn(),
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
import SeoActionsPage from '../../../../src/pages/admin/SeoActionsPage';

const mockSeoInsightsApi = seoInsightsApi as jest.Mocked<typeof seoInsightsApi>;

function renderPage() {
  return render(
    <MemoryRouter>
      <SeoActionsPage />
    </MemoryRouter>
  );
}

function buildActionsResult(overrides: Partial<Awaited<ReturnType<typeof seoInsightsApi.listActions>>> = {}) {
  return {
    data: [
      {
        id: 'action_1',
        snapshotId: 'snapshot_1',
        actionType: 'metadata_rewrite',
        targetType: 'blog_post',
        targetId: 'post_1',
        targetLabel: 'The Turing Award Quiz Is Harder Than It Looks',
        targetPath: 'https://letaiexplainai.com/blog/turing-award-quiz',
        query: 'turing award multiple winners quiz',
        status: 'shipped' as const,
        confidence: 0.91,
        rationale: 'The rewrite surfaces the exact query intent more clearly.',
        shippedAt: '2026-04-30T12:00:00.000Z',
        rolledBackAt: null,
        measuredAt: null,
        before: {
          slug: 'turing-award-quiz',
          pageUrl: 'https://letaiexplainai.com/blog/turing-award-quiz',
          seoTitle: 'Turing Award Quiz',
          seoDescription: 'Original description.',
        },
        after: {
          slug: 'turing-award-quiz',
          pageUrl: 'https://letaiexplainai.com/blog/turing-award-quiz',
          seoTitle: 'Turing Award Quiz: Why Multiple Winners Matter',
          seoDescription: 'Rewritten description.',
        },
      },
    ],
    pagination: {
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
    },
    ...overrides,
  };
}

describe('SeoActionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the actions table and opens the diff drawer', async () => {
    mockSeoInsightsApi.listActions.mockResolvedValue(buildActionsResult());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('The Turing Award Quiz Is Harder Than It Looks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view diff/i }));

    expect(await screen.findByText('SEO Title')).toBeInTheDocument();
    expect(screen.getByText('Turing Award Quiz')).toBeInTheDocument();
    expect(screen.getByText('Turing Award Quiz: Why Multiple Winners Matter')).toBeInTheDocument();
  });

  it('rolls back an action after confirm and refreshes the list', async () => {
    mockSeoInsightsApi.listActions
      .mockResolvedValueOnce(buildActionsResult())
      .mockResolvedValueOnce(buildActionsResult({
        data: [
          {
            ...buildActionsResult().data[0],
            status: 'rolled_back',
            rolledBackAt: '2026-05-01T09:00:00.000Z',
          },
        ],
      }));
    mockSeoInsightsApi.rollbackAction.mockResolvedValue({
      ...buildActionsResult().data[0],
      status: 'rolled_back',
      rolledBackAt: '2026-05-01T09:00:00.000Z',
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('The Turing Award Quiz Is Harder Than It Looks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /rollback/i }));
    expect(await screen.findByText('Roll back this rewrite?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /rollback rewrite/i }));

    await waitFor(() => {
      expect(mockSeoInsightsApi.rollbackAction).toHaveBeenCalledWith('action_1');
    });
    expect(await screen.findByText('rolled back')).toBeInTheDocument();
  });
});

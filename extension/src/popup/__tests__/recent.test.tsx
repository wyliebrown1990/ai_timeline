import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RecentSubmissions } from '../components/RecentSubmissions';
import * as api from '../../lib/api';
import { setCachedRecent } from '../../lib/storage';

const ROWS: api.IngestedArticleListItem[] = [
  {
    id: 'a1',
    title: 'Single URL article',
    externalUrl: 'https://example.com/a1',
    analysisStatus: 'complete',
    createdAt: '2026-04-26T00:00:00Z',
    source: { sourceType: 'single_url' },
  },
  {
    id: 'rss-noise',
    title: 'RSS noise',
    externalUrl: 'https://example.com/rss',
    analysisStatus: 'complete',
    createdAt: '2026-04-25T00:00:00Z',
    source: { sourceType: 'rss' },
  },
  {
    id: 'a2',
    title: 'Another single URL',
    externalUrl: 'https://example.com/a2',
    analysisStatus: 'screening',
    createdAt: '2026-04-26T01:00:00Z',
    source: { sourceType: 'single_url' },
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('<RecentSubmissions />', () => {
  it('shows skeleton while loading and populated state after fetch', async () => {
    vi.spyOn(api, 'fetchRecentArticles').mockResolvedValue(ROWS);
    const { container } = render(<RecentSubmissions onUnauthorized={() => {}} />);

    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);

    await waitFor(() => expect(screen.getByText('Single URL article')).toBeInTheDocument());
    expect(screen.getByText('Another single URL')).toBeInTheDocument();
    // RSS noise filtered out
    expect(screen.queryByText('RSS noise')).not.toBeInTheDocument();
  });

  it('hydrates instantly from cache before network resolves', async () => {
    await setCachedRecent<api.IngestedArticleListItem[]>([ROWS[0]]);
    let resolveFetch: (rows: api.IngestedArticleListItem[]) => void;
    vi.spyOn(api, 'fetchRecentArticles').mockReturnValue(
      new Promise((r) => {
        resolveFetch = r;
      }),
    );

    render(<RecentSubmissions onUnauthorized={() => {}} />);
    await waitFor(() => expect(screen.getByText('Single URL article')).toBeInTheDocument());

    resolveFetch!(ROWS);
  });

  it('calls onUnauthorized when API throws UnauthorizedError', async () => {
    vi.spyOn(api, 'fetchRecentArticles').mockRejectedValue(new api.UnauthorizedError());
    const onUnauthorized = vi.fn();
    render(<RecentSubmissions onUnauthorized={onUnauthorized} />);
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledOnce());
  });

  it('renders the empty state when no single_url rows', async () => {
    vi.spyOn(api, 'fetchRecentArticles').mockResolvedValue([ROWS[1]]);
    render(<RecentSubmissions onUnauthorized={() => {}} />);
    await waitFor(() => expect(screen.getByText('Nothing submitted yet')).toBeInTheDocument());
  });

  it('renders error state with retry when fetch fails and no cache', async () => {
    vi.spyOn(api, 'fetchRecentArticles').mockRejectedValue(new Error('boom'));
    render(<RecentSubmissions onUnauthorized={() => {}} />);
    await waitFor(() => expect(screen.getByText('Could not load recent submissions.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Inbox, RefreshCw } from 'lucide-react';
import {
  fetchRecentArticles,
  type IngestedArticleListItem,
  UnauthorizedError,
} from '../../lib/api';
import { getCachedRecent, setCachedRecent } from '../../lib/storage';
import { StatusBadge } from './StatusBadge';

const ADMIN_BASE = 'https://letaiexplainai.com/admin';

type State =
  | { kind: 'loading' }
  | { kind: 'populated'; rows: IngestedArticleListItem[] }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

interface Props {
  onUnauthorized: () => void;
}

export function RecentSubmissions({ onUnauthorized }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts: { fromCacheFirst: boolean }) => {
      // 1) Hydrate from cache instantly if available so the popup never feels blank
      if (opts.fromCacheFirst) {
        const cached = await getCachedRecent<IngestedArticleListItem[]>();
        if (cached && cached.length > 0) {
          setState({ kind: 'populated', rows: cached });
        }
      }

      setRefreshing(true);
      try {
        const all = await fetchRecentArticles(20);
        // Show only single_url submissions (extension + manual). Everything else
        // is RSS/YouTube noise that the admin doesn't want in this popup.
        const filtered = all.filter((a) => a.source?.sourceType === 'single_url').slice(0, 10);
        await setCachedRecent(filtered);
        setState(filtered.length === 0 ? { kind: 'empty' } : { kind: 'populated', rows: filtered });
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          onUnauthorized();
          return;
        }
        // Keep showing the cached rows if we have them — but flag the staleness
        const cached = await getCachedRecent<IngestedArticleListItem[]>();
        if (cached && cached.length > 0) {
          setState({ kind: 'populated', rows: cached });
        } else {
          setState({ kind: 'error', message: 'Could not load recent submissions.' });
        }
      } finally {
        setRefreshing(false);
      }
    },
    [onUnauthorized],
  );

  useEffect(() => {
    void load({ fromCacheFirst: true });
  }, [load]);

  return (
    <section aria-labelledby="recent-heading" className="space-y-2">
      <header className="flex items-center justify-between">
        <h2
          id="recent-heading"
          className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
        >
          Recent submissions
        </h2>
        <button
          type="button"
          onClick={() => void load({ fromCacheFirst: false })}
          disabled={refreshing}
          aria-label="Refresh recent submissions"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </header>

      {state.kind === 'loading' && <SkeletonList />}

      {state.kind === 'empty' && <EmptyState />}

      {state.kind === 'error' && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-3 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-xs text-red-700 dark:text-red-300">{state.message}</p>
          <button
            type="button"
            onClick={() => void load({ fromCacheFirst: false })}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            Retry
          </button>
        </div>
      )}

      {state.kind === 'populated' && (
        <ul className="space-y-1.5" role="list">
          {state.rows.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-xs font-medium text-gray-900 dark:text-gray-100"
                    title={row.title ?? row.externalUrl}
                  >
                    {row.title ?? row.externalUrl}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {hostnameOf(row.externalUrl)}
                  </p>
                </div>
                <a
                  href={`${ADMIN_BASE}/articles/${row.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${row.title ?? row.externalUrl} in admin`}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
              <div className="mt-1.5">
                <StatusBadge status={row.analysisStatus} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-1.5" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-2"
        >
          <div className="skeleton h-3 w-3/4" />
          <div className="mt-1.5 skeleton h-2.5 w-1/3" />
          <div className="mt-2 skeleton h-4 w-20 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-6 text-center">
      <Inbox className="h-6 w-6 text-gray-400 dark:text-gray-600" aria-hidden="true" />
      <p className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">Nothing submitted yet</p>
      <p className="mt-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
        Click the extension on any article tab to submit it.
      </p>
    </div>
  );
}

/**
 * Admin blog list — /admin/blog.
 *
 * Status filter tabs (counts inline), debounced title search, row actions,
 * and a primary "New Post" CTA. Matches the MilestonesListPage density +
 * card-and-table conventions.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, X as XIcon, PenLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { blogAdminApi, type AdminBlogPost } from '../../services/api';
import { EmptyState, ErrorState } from '../../components/ui';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

type StatusFilter = 'all' | 'draft' | 'scheduled' | 'published' | 'archived';
const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'published', label: 'Published' },
  { id: 'archived', label: 'Archived' },
];

const STATUS_CHIP: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 line-through',
};

export default function BlogAdminListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [posts, setPosts] = useState<AdminBlogPost[] | null>(null);
  const [counts, setCounts] = useState<Record<StatusFilter, number>>({
    all: 0,
    draft: 0,
    scheduled: 0,
    published: 0,
    archived: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminBlogPost | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Debounce the search input to keep the API quiet.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Pull unfiltered for counts; filter client-side so we don't burn a round-trip.
      const all = await blogAdminApi.list({ pageSize: 100 });
      setPosts(all.posts);
      const nextCounts: Record<StatusFilter, number> = {
        all: all.posts.length,
        draft: 0,
        scheduled: 0,
        published: 0,
        archived: 0,
      };
      for (const p of all.posts) {
        const s = p.status as StatusFilter;
        if (s in nextCounts) nextCounts[s] += 1;
      }
      setCounts(nextCounts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load posts';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!posts) return [];
    return posts.filter((p) => {
      if (status !== 'all' && p.status !== status) return false;
      if (debouncedQ && !p.title.toLowerCase().includes(debouncedQ.toLowerCase())) return false;
      return true;
    });
  }, [posts, status, debouncedQ]);

  const onArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setArchiveLoading(true);
    try {
      await blogAdminApi.archive(archiveTarget.id);
      toast.success('Post archived');
      setArchiveTarget(null);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Archive failed';
      toast.error(message);
    } finally {
      setArchiveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Longform posts. Draft, schedule, publish, archive.
          </p>
        </div>
        <Link
          to="/admin/blog/new"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Post
        </Link>
      </header>

      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatus(tab.id)}
                className={
                  active
                    ? 'inline-flex items-center gap-2 px-4 py-2 border-b-2 border-orange-500 text-orange-600 dark:text-orange-400 text-sm font-medium -mb-px'
                    : 'inline-flex items-center gap-2 px-4 py-2 border-b-2 border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm'
                }
              >
                {tab.label}
                <span className="text-xs text-gray-500 dark:text-gray-500">{counts[tab.id]}</span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles…"
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Couldn't load posts" message={error} onRetry={() => void refresh()} />
      ) : filtered.length === 0 ? (
        posts && posts.length === 0 ? (
          <EmptyState
            icon={<PenLine className="h-6 w-6" />}
            title="No blog posts yet"
            description="Create your first longform post — draft it now, publish when you're ready."
            cta={{ label: 'Create your first post', to: '/admin/blog/new' }}
          />
        ) : (
          <EmptyState
            icon={<XIcon className="h-6 w-6" />}
            title="No posts match"
            description="Try a different status filter or clear the search."
            cta={{
              label: 'Clear filters',
              onClick: () => {
                setStatus('all');
                setQ('');
              },
            }}
          />
        )
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Author</th>
                <th className="text-left px-4 py-3">Published</th>
                <th className="text-left px-4 py-3">Updated</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => navigate(`/admin/blog/${p.id}/edit`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{p.title}</div>
                    {p.subtitle && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {p.subtitle}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_CHIP[p.status] ?? STATUS_CHIP.draft
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {p.author?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </td>
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-2">
                      <Link
                        to={`/admin/blog/${p.id}/edit`}
                        className="text-sm text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400"
                      >
                        Edit
                      </Link>
                      {p.status === 'published' && (
                        <Link
                          to={`/blog/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400"
                        >
                          View
                        </Link>
                      )}
                      {p.status !== 'archived' && (
                        <button
                          type="button"
                          onClick={() => setArchiveTarget(p)}
                          className="text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!archiveTarget}
        title="Archive this post?"
        message={
          archiveTarget
            ? `"${archiveTarget.title}" will disappear from the public blog. You can unarchive it from this page later.`
            : ''
        }
        onConfirm={() => void onArchiveConfirm()}
        onCancel={() => setArchiveTarget(null)}
        confirmLabel="Archive"
        destructive
        isLoading={archiveLoading}
      />
    </div>
  );
}

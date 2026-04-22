/**
 * BlogIndexPage — `/blog`.
 *
 * Hero featured post + 3-col grid + filter chips (subject/tag) + pagination.
 * Filter state lives in the URL (`?subject=…&tag=…&page=…`) so links are
 * shareable and Cmd+Click on pagination opens a new tab on the right page.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PenLine, X as XIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { SEO } from '../components/SEO';
import { blogApi } from '../services/api';
import type { BlogListResponse, BlogPostListItem } from '../types/blog';
import { BlogPostCard } from '../components/Blog/BlogPostCard';
import { BlogPostCardSkeleton } from '../components/Blog/BlogPostCardSkeleton';
import { BlogBreadcrumbs } from '../components/Blog/BlogBreadcrumbs';
import { NewsletterCta } from '../components/Blog/NewsletterCta';
import { EmptyState, ErrorState } from '../components/ui';

const PAGE_SIZE = 12;

export default function BlogIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const subjectSlug = searchParams.get('subject') ?? undefined;
  const tag = searchParams.get('tag') ?? undefined;
  const hasFilters = Boolean(subjectSlug || tag);

  const [data, setData] = useState<BlogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    blogApi
      .list({ page, pageSize: PAGE_SIZE, subjectSlug, tag })
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load posts');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, subjectSlug, tag]);

  const featured = useMemo<BlogPostListItem | null>(() => {
    if (!data || data.posts.length === 0) return null;
    return data.posts.find((p) => p.featured) ?? data.posts[0] ?? null;
  }, [data]);

  // Editor's picks row (Sprint Blog-6 §5): all featured posts beyond the hero,
  // cap at 3. Hide the whole row if none left over after the hero absorbed one.
  const editorsPicks = useMemo<BlogPostListItem[]>(() => {
    if (!data || data.posts.length === 0) return [];
    return data.posts
      .filter((p) => p.featured && p.id !== featured?.id)
      .slice(0, 3);
  }, [data, featured]);

  const rest = useMemo<BlogPostListItem[]>(() => {
    if (!data || data.posts.length === 0) return [];
    const excludedIds = new Set<string>();
    if (featured) excludedIds.add(featured.id);
    editorsPicks.forEach((p) => excludedIds.add(p.id));
    return data.posts.filter((p) => !excludedIds.has(p.id));
  }, [data, featured, editorsPicks]);

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('subject');
    next.delete('tag');
    next.delete('page');
    setSearchParams(next);
  };

  const goToPage = (n: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(n));
    setSearchParams(next);
  };

  return (
    <>
      <SEO
        title="Blog — essays and explainers"
        description="Longform essays, explainers, and retrospectives from the AI Timeline Atlas."
      />
      <div className="container-main mx-auto max-w-7xl px-4 py-10">
        <BlogBreadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Blog' }]} />

        <header className="mt-4 mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">Blog</h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
            Longform essays, explainers, and retrospectives — where the atlas thinks out loud.
          </p>
        </header>

        {hasFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Filtered by:</span>
            {subjectSlug && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1">
                subject: {subjectSlug}
              </span>
            )}
            {tag && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1">
                tag: {tag}
              </span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <XIcon className="h-3 w-3" />
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            title="Couldn't load blog posts"
            message={error}
            onRetry={() => {
              // Trigger effect rerun by bumping page state round-trip
              const next = new URLSearchParams(searchParams);
              setSearchParams(next);
            }}
          />
        ) : !data || data.posts.length === 0 ? (
          <EmptyPosts hasFilters={hasFilters} onClear={clearFilters} />
        ) : (
          <>
            {featured && (
              <div className="mb-10">
                <BlogPostCard post={featured} variant="featured" lcp />
              </div>
            )}

            {editorsPicks.length > 0 && (
              <section className="mb-10">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-3">
                  Editor's picks
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {editorsPicks.map((p) => (
                    <BlogPostCard key={p.id} post={p} variant="default" />
                  ))}
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((p) => (
                  <BlogPostCard key={p.id} post={p} variant="default" />
                ))}
              </div>
            )}

            {data.pagination.totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={data.pagination.totalPages}
                onChange={goToPage}
              />
            )}

            <NewsletterCta source="blog-index" className="mt-12" />
          </>
        )}
      </div>
    </>
  );
}

function LoadingState() {
  return (
    <>
      <div className="mb-10">
        <BlogPostCardSkeleton variant="featured" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <BlogPostCardSkeleton key={i} variant="default" />
        ))}
      </div>
    </>
  );
}

function EmptyPosts({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  if (hasFilters) {
    return (
      <EmptyState
        icon={<PenLine className="h-6 w-6" />}
        title="No posts match these filters"
        description="Try clearing a filter or browsing the full feed."
        cta={{ label: 'Clear filters', onClick: onClear }}
      />
    );
  }
  return (
    <EmptyState
      icon={<PenLine className="h-6 w-6" />}
      title="No posts yet"
      description="Longform AI explainers are coming soon. Subscribe to the RSS feed to be notified when the first post drops."
      cta={{ label: 'Subscribe via RSS', to: '/api/blog/rss.xml' }}
    />
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (n: number) => void;
}) {
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  return (
    <nav
      className="mt-12 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-6"
      aria-label="Pagination"
    >
      <Link
        to={`?${withPage(page - 1)}`}
        onClick={(e) => {
          if (prevDisabled) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          onChange(page - 1);
        }}
        className={
          prevDisabled
            ? 'inline-flex items-center gap-1 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400'
        }
        aria-disabled={prevDisabled}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Link>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Page {page} of {totalPages}
      </span>
      <Link
        to={`?${withPage(page + 1)}`}
        onClick={(e) => {
          if (nextDisabled) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          onChange(page + 1);
        }}
        className={
          nextDisabled
            ? 'inline-flex items-center gap-1 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400'
        }
        aria-disabled={nextDisabled}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}

function withPage(n: number): string {
  const qs = new URLSearchParams(window.location.search);
  qs.set('page', String(n));
  return qs.toString();
}

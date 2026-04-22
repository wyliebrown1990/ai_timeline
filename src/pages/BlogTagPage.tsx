/**
 * BlogTagPage — /blog/tag/:tag
 *
 * Archive of every published post with a given tag. Emits `noIndex` when
 * the archive has fewer than 3 posts (thin-content rule from the sprint's
 * SEO section) so Google doesn't fill its index with near-empty pages.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Hash } from 'lucide-react';
import { SEO } from '../components/SEO';
import { blogApi } from '../services/api';
import type { BlogListResponse } from '../types/blog';
import { BlogPostCard } from '../components/Blog/BlogPostCard';
import { BlogPostCardSkeleton } from '../components/Blog/BlogPostCardSkeleton';
import { BlogBreadcrumbs } from '../components/Blog/BlogBreadcrumbs';
import { EmptyState, ErrorState } from '../components/ui';

const THIN_CONTENT_THRESHOLD = 3;

export default function BlogTagPage() {
  const { tag = '' } = useParams<{ tag: string }>();
  const [data, setData] = useState<BlogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    blogApi
      .list({ tag, pageSize: 50 })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message ?? 'Failed to load posts');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tag]);

  const posts = data?.posts ?? [];
  const thinContent = useMemo(
    () => !loading && posts.length > 0 && posts.length < THIN_CONTENT_THRESHOLD,
    [loading, posts]
  );

  return (
    <>
      <SEO
        title={`#${tag} posts`}
        description={`Every blog post tagged #${tag} from the AI Timeline Atlas.`}
        noIndex={thinContent || posts.length === 0}
      />
      <div className="container-main mx-auto max-w-7xl px-4 py-10">
        <BlogBreadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Blog', to: '/blog' },
            { label: `Tag: ${tag}` },
          ]}
        />
        <header className="mt-4 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Hash className="h-8 w-8 text-orange-500" />
            {tag}
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
            {loading
              ? 'Loading posts…'
              : posts.length === 1
                ? 'One post tagged with this topic.'
                : posts.length === 0
                  ? 'No posts yet.'
                  : `${posts.length} posts tagged with this topic — essays, explainers, and retrospectives filed under #${tag}.`}
          </p>
          {thinContent && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              (Archive has fewer than {THIN_CONTENT_THRESHOLD} posts — excluded from search-engine indexing.)
            </p>
          )}
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <BlogPostCardSkeleton key={i} variant="default" />
            ))}
          </div>
        ) : error ? (
          <ErrorState title="Couldn't load posts" message={error} />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<Hash className="h-6 w-6" />}
            title={`No posts tagged #${tag}`}
            description="Try the main blog feed or another tag."
            cta={{ label: 'All posts', to: '/blog' }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((p) => (
              <BlogPostCard key={p.id} post={p} variant="default" />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

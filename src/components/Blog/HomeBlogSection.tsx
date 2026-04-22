/**
 * HomeBlogSection — "From the blog" feature slot on the homepage.
 *
 * Shows the featured post (or newest published) as a big card + a 3-up grid
 * of latest posts. Hides itself entirely when the API returns zero — the
 * homepage already has plenty to render; an empty "From the blog" block
 * would just add noise.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { blogApi } from '../../services/api';
import type { BlogPostListItem } from '../../types/blog';
import { BlogPostCard } from './BlogPostCard';
import { BlogPostCardSkeleton } from './BlogPostCardSkeleton';

export function HomeBlogSection() {
  const [posts, setPosts] = useState<BlogPostListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    blogApi
      .list({ pageSize: 4 })
      .then(({ posts }) => {
        if (!cancelled) {
          setPosts(posts);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        // Secondary surface — log, hide, never break the homepage.
        console.warn('[HomeBlogSection] load failed', err);
        if (!cancelled) {
          setErrored(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Error + empty both hide the section.
  if (errored) return null;
  if (!loading && (!posts || posts.length === 0)) return null;

  const featured = posts?.find((p) => p.featured) ?? posts?.[0] ?? null;
  const rest = posts && featured ? posts.filter((p) => p.id !== featured.id).slice(0, 3) : [];

  return (
    <section className="py-16 bg-warm-50 dark:bg-gray-800/40 sm:py-20">
      <div className="container-main">
        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">From the blog</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Longform essays, explainers, and retrospectives.
            </p>
          </div>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400 hover:underline"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-6">
            <BlogPostCardSkeleton variant="featured" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <BlogPostCardSkeleton key={i} variant="default" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {featured && <BlogPostCard post={featured} variant="featured" lcp />}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((p) => (
                  <BlogPostCard key={p.id} post={p} variant="default" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default HomeBlogSection;

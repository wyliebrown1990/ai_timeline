/**
 * FromTheBlog — "From the blog" cross-entity injection.
 *
 * Drop-in section for Person / Organization / GlossaryTerm / Subject /
 * Milestone pages. Fetches `/api/blog/for-entity` (direct BlogPostRelation
 * match first, subject overlap fallback) and renders up to `limit` posts as
 * compact cards. Hides itself entirely when the backend returns zero — no
 * empty placeholder, no broken layout.
 *
 * Errors are swallowed and logged (see sprint Blog-4 §4.1): this is secondary
 * content, we never let it block the main entity page. Skeletons show during
 * the initial fetch so the section doesn't pop in visibly.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { blogApi } from '../../services/api';
import type { BlogPostListItem } from '../../types/blog';
import { BlogPostCard } from './BlogPostCard';
import { BlogPostCardSkeleton } from './BlogPostCardSkeleton';

type EntityType = 'milestone' | 'person' | 'organization' | 'glossary_term' | 'subject';

interface Props {
  entityType: EntityType;
  entityId: string;
  title?: string;
  limit?: number;
  /** Where the "See all posts →" link should point. Usually a subject/tag filter. */
  seeAllHref?: string;
  className?: string;
}

export function FromTheBlog({
  entityType,
  entityId,
  title = 'From the blog',
  limit = 3,
  seeAllHref,
  className,
}: Props) {
  const [posts, setPosts] = useState<BlogPostListItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    blogApi
      .forEntity(entityType, entityId, limit)
      .then(({ posts }) => {
        if (!cancelled) {
          setPosts(posts);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        // Secondary content — never disrupt the page for this. Log and hide.
        console.warn('[FromTheBlog] failed to load', err);
        if (!cancelled) {
          setPosts([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId, limit]);

  if (loading) {
    return (
      <section className={className}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <BlogPostCardSkeleton key={i} variant="compact" />
          ))}
        </div>
      </section>
    );
  }

  if (!posts || posts.length === 0) return null;

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        {seeAllHref && (
          <Link
            to={seeAllHref}
            className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
          >
            See all posts →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {posts.map((p) => (
          <BlogPostCard key={p.id} post={p} variant="compact" />
        ))}
      </div>
    </section>
  );
}

export default FromTheBlog;

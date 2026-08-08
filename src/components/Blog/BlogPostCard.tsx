/**
 * BlogPostCard — three variants (default / featured / compact).
 *
 * Matches the LAEA card shell conventions used across Timeline, Resources, News
 * (rounded-xl border + shadow-warm + subtle hover lift). Keeps cover-image
 * loading explicit so the featured-variant LCP can be marked eager and CLS
 * stays low (we hint aspect-ratio via the image wrapper).
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, User } from 'lucide-react';
import type { BlogPostListItem } from '../../types/blog';
import { cn } from '../../lib/utils';
import { useRenderableImageUrl } from '../../hooks/useRenderableImageUrl';

type Variant = 'default' | 'featured' | 'compact';

interface BlogPostCardProps {
  post: BlogPostListItem;
  variant?: Variant;
  /** When true, eagerly loads the cover image (use on featured/LCP only). */
  lcp?: boolean;
  className?: string;
}

function formatDate(input: string | Date | null | undefined): string | null {
  if (!input) return null;
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function AuthorAvatar({ author }: { author: BlogPostListItem['author'] }) {
  if (author.avatarUrl) {
    return (
      <img
        src={author.avatarUrl}
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 rounded-full object-cover"
      />
    );
  }
  const initials = author.name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-[10px] font-semibold text-orange-700 dark:text-orange-300"
    >
      {initials || <User className="h-3 w-3" />}
    </span>
  );
}

export function BlogPostCard({
  post,
  variant = 'default',
  lcp = false,
  className,
}: BlogPostCardProps) {
  const [coverImageFailed, setCoverImageFailed] = useState(false);

  useEffect(() => {
    setCoverImageFailed(false);
  }, [post.coverImageUrl]);

  const href = `/blog/${post.slug}`;
  const published = formatDate(post.publishedAt);
  const renderableCoverImageUrl = useRenderableImageUrl(post.coverImageUrl);
  const showCoverImage = Boolean(renderableCoverImageUrl && !coverImageFailed);

  // Compact variant — no cover, used in sidebars / homepage secondary rows.
  if (variant === 'compact') {
    return (
      <Link
        to={href}
        data-testid="blog-post-card"
        data-variant="compact"
        className={cn(
          'group block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-warm hover:shadow-warm-md transition-all motion-safe:hover:-translate-y-0.5',
          className
        )}
      >
        <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 line-clamp-2">
          {post.title}
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{post.excerpt}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <AuthorAvatar author={post.author} />
          <span>{post.author.name}</span>
          <span aria-hidden="true">·</span>
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>{post.readingMinutes} min read</span>
        </div>
      </Link>
    );
  }

  const isFeatured = variant === 'featured';
  return (
    <Link
      to={href}
      data-testid="blog-post-card"
      data-variant={variant}
      className={cn(
        'group block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-warm hover:shadow-warm-md transition-all motion-safe:hover:-translate-y-0.5',
        isFeatured && 'md:flex md:items-stretch',
        className
      )}
    >
      {showCoverImage && (
        <div
          className={cn(
            'relative bg-gray-100 dark:bg-gray-900 overflow-hidden',
            isFeatured ? 'md:w-1/2 aspect-[16/9] md:aspect-auto' : 'aspect-[16/9]'
          )}
        >
          <img
            src={renderableCoverImageUrl ?? undefined}
            alt={post.title}
            loading={lcp ? 'eager' : 'lazy'}
            // React 18 does not recognise camelCase `fetchPriority`; pass the
            // HTML attribute name through directly.
            {...{ fetchpriority: lcp ? 'high' : 'auto' }}
            onError={() => setCoverImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.02] motion-safe:transition-transform motion-safe:duration-500"
          />
        </div>
      )}

      <div
        className={cn(
          'p-5',
          isFeatured && 'md:w-1/2 md:p-8 md:flex md:flex-col md:justify-center'
        )}
      >
        {post.featured && (
          <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            Featured
          </span>
        )}
        <h2
          className={cn(
            'font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 line-clamp-2',
            isFeatured ? 'text-2xl md:text-3xl leading-tight' : 'text-xl'
          )}
        >
          {post.title}
        </h2>
        {post.subtitle && isFeatured && (
          <p className="mt-2 text-gray-600 dark:text-gray-400 line-clamp-2">{post.subtitle}</p>
        )}
        <p
          className={cn(
            'mt-3 text-gray-600 dark:text-gray-400',
            isFeatured ? 'line-clamp-3' : 'line-clamp-2 text-sm'
          )}
        >
          {post.excerpt}
        </p>

        <div className="mt-4 flex items-center flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
          <AuthorAvatar author={post.author} />
          <span className="font-medium text-gray-800 dark:text-gray-200">{post.author.name}</span>
          {published && (
            <>
              <span aria-hidden="true">·</span>
              <span>{published}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{post.readingMinutes} min read</span>
        </div>

        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default BlogPostCard;

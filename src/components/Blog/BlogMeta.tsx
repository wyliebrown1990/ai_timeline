/**
 * BlogMeta — author byline + publication date + reading time.
 *
 * Shown under the h1 on `/blog/:slug`. Handles fallback initials when the
 * author has no avatar and surfaces `Updated` only when it meaningfully
 * differs from published (>24h) as an honest E-E-A-T signal.
 */

import { Link } from 'react-router-dom';
import { Clock, User } from 'lucide-react';
import type { BlogPost } from '../../types/blog';
import { SubjectBadge } from '../ui/SubjectBadge';

function formatDate(input: string | Date | null | undefined): string | null {
  if (!input) return null;
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function shouldShowUpdated(post: BlogPost): boolean {
  if (!post.publishedAt || !post.updatedAt) return false;
  const pub = new Date(post.publishedAt).getTime();
  const upd = new Date(post.updatedAt).getTime();
  if (Number.isNaN(pub) || Number.isNaN(upd)) return false;
  return upd - pub > 24 * 60 * 60 * 1000;
}

function Initials({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-xs font-semibold text-orange-700 dark:text-orange-300"
    >
      {letters || <User className="h-4 w-4" />}
    </span>
  );
}

interface Props {
  post: BlogPost;
}

export function BlogMeta({ post }: Props) {
  const published = formatDate(post.publishedAt);
  const updated = shouldShowUpdated(post) ? formatDate(post.updatedAt) : null;
  const authorHref = `/blog/author/${post.author.slug}`;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
        {post.author.avatarUrl ? (
          <img
            src={post.author.avatarUrl}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <Initials name={post.author.name} />
        )}
        <Link
          to={authorHref}
          className="font-medium text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400"
        >
          {post.author.name}
        </Link>
        {published && (
          <>
            <span aria-hidden="true" className="text-gray-400 dark:text-gray-600">·</span>
            <span>Published {published}</span>
          </>
        )}
        {updated && (
          <>
            <span aria-hidden="true" className="text-gray-400 dark:text-gray-600">·</span>
            <span>Updated {updated}</span>
          </>
        )}
        <span aria-hidden="true" className="text-gray-400 dark:text-gray-600">·</span>
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>~{post.readingMinutes} min read</span>
      </div>

      {(post.subjects.length > 0 || post.tags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {post.subjects.map((s) => (
            <SubjectBadge
              key={s.subjectId}
              subject={{
                id: s.subjectId,
                slug: s.slug,
                name: s.name,
                level: 0,
                path: s.name,
              }}
              size="sm"
            />
          ))}
          {post.tags.map((tag) => (
            <Link
              key={tag}
              to={`/blog/tag/${encodeURIComponent(tag)}`}
              className="rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default BlogMeta;

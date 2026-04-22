/**
 * AuthorPage — /blog/author/:slug
 *
 * Profile + post list for a single blog Author. Emits visible E-E-A-T
 * signals (bio, role, optional links). Sets `noIndex` on the `<SEO>`
 * when the author has zero published posts (thin-content rule).
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Globe, Twitter, Linkedin, User } from 'lucide-react';
import { SEO } from '../components/SEO';
import { authorsApi } from '../services/api';
import type { Author, BlogPostListItem } from '../types/blog';
import { BlogPostCard } from '../components/Blog/BlogPostCard';
import { BlogPostCardSkeleton } from '../components/Blog/BlogPostCardSkeleton';
import { BlogBreadcrumbs } from '../components/Blog/BlogBreadcrumbs';
import { EmptyState, ErrorState } from '../components/ui';

interface AuthorResponse {
  author: Author;
  posts: BlogPostListItem[];
}

type FetchState =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: AuthorResponse };

export default function AuthorPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [state, setState] = useState<FetchState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    authorsApi
      .getBySlug(slug)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        const msg = err.message ?? 'Failed to load author';
        if (/404|not found/i.test(msg)) setState({ status: 'notfound' });
        else setState({ status: 'error', message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === 'loading') {
    return (
      <div className="container-main mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <BlogPostCardSkeleton key={i} variant="default" />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === 'notfound') {
    return (
      <div className="container-main mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Author not found
        </h1>
        <Link
          to="/blog"
          className="inline-flex items-center rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium"
        >
          Back to blog
        </Link>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="container-main mx-auto max-w-2xl px-4 py-16">
        <ErrorState title="Couldn't load this author" message={state.message} />
      </div>
    );
  }

  const { author, posts } = state.data;
  const thinContent = posts.length === 0;
  const links = (author.links ?? {}) as { twitter?: string; linkedin?: string; website?: string };

  return (
    <>
      <SEO
        title={author.name}
        description={author.bio ?? `${author.name} on the AI Timeline Atlas blog.`}
        noIndex={thinContent}
      />
      <div className="container-main mx-auto max-w-7xl px-4 py-10">
        <BlogBreadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Blog', to: '/blog' },
            { label: author.name },
          ]}
        />

        <header className="mt-6 mb-10 flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex-shrink-0">
            {author.avatarUrl ? (
              <img
                src={author.avatarUrl}
                alt=""
                width={96}
                height={96}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-24 w-24 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-2xl font-semibold text-orange-700 dark:text-orange-300"
              >
                {author.name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || <User className="h-8 w-8" />}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              {author.name}
            </h1>
            {author.role && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{author.role}</p>
            )}
            {author.bio && (
              <p className="mt-3 text-lg text-gray-700 dark:text-gray-300 max-w-2xl">
                {author.bio}
              </p>
            )}
            {(links.website || links.twitter || links.linkedin) && (
              <div className="mt-4 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                {links.website && (
                  <a
                    href={links.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400"
                  >
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
                {links.twitter && (
                  <a
                    href={`https://twitter.com/${links.twitter.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400"
                  >
                    <Twitter className="h-4 w-4" /> Twitter
                  </a>
                )}
                {links.linkedin && (
                  <a
                    href={links.linkedin}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400"
                  >
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>
        </header>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {posts.length === 0
            ? 'No posts yet'
            : posts.length === 1
              ? '1 post'
              : `${posts.length} posts`}
        </h2>

        {posts.length === 0 ? (
          <EmptyState
            icon={<User className="h-6 w-6" />}
            title={`${author.name} hasn't published yet`}
            description="Check back soon — or browse the main blog feed in the meantime."
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

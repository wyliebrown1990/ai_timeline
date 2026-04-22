/**
 * BlogPostPage — `/blog/:slug`.
 *
 * Renders a single published post: breadcrumb → optional cover → h1 → meta →
 * TOC (sticky at lg+) + prose body in a centered reading column → related
 * posts → "From our timeline" entity refs.
 *
 * BlogMarkdown is imported via React.lazy so the shiki bundle doesn't land
 * on /blog (the index doesn't render post bodies).
 */

import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  SEO,
  generateArticleJsonLd,
  generateBreadcrumbListJsonLd,
} from '../components/SEO';
import { blogApi } from '../services/api';
import type { BlogPost, BlogPostListItem } from '../types/blog';

const SITE_URL = 'https://letaiexplainai.com';
import { BlogBreadcrumbs } from '../components/Blog/BlogBreadcrumbs';
import { BlogMeta } from '../components/Blog/BlogMeta';
import { BlogTOC } from '../components/Blog/BlogTOC';
import { BlogPostCard } from '../components/Blog/BlogPostCard';
import { ErrorState } from '../components/ui';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

const BlogMarkdown = lazy(() =>
  import('../components/Blog/BlogMarkdown').then((m) => ({ default: m.BlogMarkdown }))
);

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'error'; message: string }
  | { status: 'ready'; post: BlogPost; related: BlogPostListItem[] };

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = Boolean(searchParams.get('preview'));
  const [state, setState] = useState<FetchState>({ status: 'idle' });

  useEffect(() => {
    if (!slug) {
      setState({ status: 'notfound' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });

    Promise.all([blogApi.getBySlug(slug), blogApi.related(slug).catch(() => ({ posts: [] }))])
      .then(([detail, rel]) => {
        if (cancelled) return;
        setState({ status: 'ready', post: detail.post, related: rel.posts });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        // fetchJson throws on non-2xx; surface 404s as notfound, everything else as error.
        const msg = err.message ?? 'Failed to load post';
        if (/404|not found/i.test(msg)) setState({ status: 'notfound' });
        else setState({ status: 'error', message: msg });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="container-main mx-auto max-w-4xl px-4 py-10">
        <LoadingSkeleton className="h-4 w-48 mb-4" />
        <LoadingSkeleton className="h-12 w-3/4 mb-3" />
        <LoadingSkeleton className="h-6 w-1/2 mb-8" />
        <LoadingSkeleton className="h-64 w-full mb-10" />
        <div className="space-y-3">
          <LoadingSkeleton className="h-4 w-full" />
          <LoadingSkeleton className="h-4 w-full" />
          <LoadingSkeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (state.status === 'notfound') {
    return (
      <div className="container-main mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Post not found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This post may have moved or been unpublished.
        </p>
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium"
        >
          Back to blog
        </Link>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="container-main mx-auto max-w-2xl px-4 py-16">
        <ErrorState
          title="Couldn't load this post"
          message={state.message}
          onRetry={() => {
            // Bump state to re-trigger effect by forcing URL no-op.
            window.location.reload();
          }}
        />
      </div>
    );
  }

  const { post, related } = state;
  const relationLinks = resolveRelationLinks(post);
  const canonical = post.canonicalUrl ?? `${SITE_URL}/blog/${post.slug}`;
  const authorUrl = `${SITE_URL}/blog/author/${post.author.slug}`;
  const primarySubject = post.subjects.find((s) => s.isPrimary) ?? post.subjects[0];

  // Word count used for Article wordCount schema field. Done once per render
  // off the canonical markdown body — cheap enough that memoisation is overkill.
  const wordCount = post.bodyMarkdown.trim().split(/\s+/).filter(Boolean).length;

  const articleJsonLd = generateArticleJsonLd({
    url: canonical,
    title: post.title,
    description: post.seoDescription ?? post.excerpt,
    image: post.coverImageUrl ?? undefined,
    datePublished: post.publishedAt ?? post.createdAt,
    dateModified: post.updatedAt,
    author: { name: post.author.name, url: authorUrl },
    tags: post.tags,
    wordCount,
    readingMinutes: post.readingMinutes,
  });

  const breadcrumbJsonLd = generateBreadcrumbListJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Blog', url: `${SITE_URL}/blog` },
    { name: post.title, url: canonical },
  ]);

  return (
    <>
      <SEO
        title={post.seoTitle ?? post.title}
        description={(post.seoDescription ?? post.excerpt).slice(0, 160)}
        canonical={canonical}
        type="article"
        image={post.coverImageUrl ?? undefined}
        jsonLd={[articleJsonLd, breadcrumbJsonLd]}
        noIndex={isPreview}
      />
      {/*
       * article:* OG tags aren't in the base SEO component — emit them in a
       * sibling Helmet so react-helmet-async merges them into <head>. They
       * power rich LinkedIn/Facebook cards and help crawlers understand the
       * publish/modified timeline without re-parsing JSON-LD.
       */}
      <Helmet>
        {post.publishedAt && (
          <meta
            property="article:published_time"
            content={new Date(post.publishedAt).toISOString()}
          />
        )}
        <meta
          property="article:modified_time"
          content={new Date(post.updatedAt).toISOString()}
        />
        <meta property="article:author" content={authorUrl} />
        {primarySubject && (
          <meta property="article:section" content={primarySubject.name} />
        )}
        {post.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
      </Helmet>
      <article className="container-main mx-auto max-w-7xl px-4 py-10">
        <BlogBreadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Blog', to: '/blog' },
            { label: post.title },
          ]}
        />

        {post.coverImageUrl && (
          <figure className="mt-6 mb-8">
            <img
              src={post.coverImageUrl}
              alt={post.title}
              loading="eager"
              {...{ fetchpriority: 'high' }}
              className="w-full rounded-xl object-cover max-h-[480px]"
            />
          </figure>
        )}

        <header className={post.coverImageUrl ? '' : 'mt-6'}>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
            {post.title}
          </h1>
          {post.subtitle && (
            <p className="mt-3 text-xl text-gray-600 dark:text-gray-400">{post.subtitle}</p>
          )}
          <BlogMeta post={post} />
        </header>

        <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
          <div className="min-w-0">
            <Suspense
              fallback={
                <div className="space-y-3">
                  <LoadingSkeleton className="h-4 w-full" />
                  <LoadingSkeleton className="h-4 w-full" />
                  <LoadingSkeleton className="h-4 w-5/6" />
                </div>
              }
            >
              <BlogMarkdown markdown={post.bodyMarkdown} />
            </Suspense>
          </div>
          <div className="mt-10 lg:mt-0 lg:order-last">
            <BlogTOC markdown={post.bodyMarkdown} />
          </div>
        </div>

        {relationLinks.length > 0 && (
          <section className="mt-16 border-t border-gray-200 dark:border-gray-700 pt-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              From our timeline
            </h2>
            <ul className="flex flex-wrap gap-2">
              {relationLinks.map((r) => (
                <li key={`${r.type}-${r.slug}`}>
                  <Link
                    to={r.href}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-1.5 text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {r.type}
                    </span>
                    <span>{r.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-16 border-t border-gray-200 dark:border-gray-700 pt-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Related posts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.slice(0, 3).map((p) => (
                <BlogPostCard key={p.id} post={p} variant="compact" />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}

interface RelationLink {
  type: string;
  slug: string;
  href: string;
  label: string;
}

function resolveRelationLinks(post: BlogPost): RelationLink[] {
  return post.relations
    .map((r): RelationLink | null => {
      const id = r.entityId;
      const label = r.entity?.title ?? r.entity?.slug ?? id;
      switch (r.entityType) {
        case 'person':
          return { type: 'Person', slug: id, href: `/people/${id}`, label };
        case 'organization':
          return { type: 'Organization', slug: id, href: `/organizations/${id}`, label };
        case 'glossary_term':
          return { type: 'Concept', slug: id, href: `/glossary/${id}`, label };
        case 'milestone':
          return { type: 'Milestone', slug: id, href: `/events/${id}`, label };
        default:
          return null;
      }
    })
    .filter((r): r is RelationLink => r !== null);
}

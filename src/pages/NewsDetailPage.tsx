/**
 * NewsDetailPage - Individual news event page for sharing
 * Sprint Feed-5: OG tags and social sharing support
 *
 * This page serves as the landing page for shared news links.
 * It displays full event details and sets proper OG meta tags.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, Eye, ThumbsUp, ThumbsDown, Play, Lock } from 'lucide-react';
import { SEO } from '../components/SEO';
import { feedApi } from '../services/feedApi';
import { RelatedBySubject } from '../components/RelatedBySubject';
import { PaywallBadge } from '../components/ui/PaywallBadge';
import type { FeedItem } from '../types/feed';

// News detail may not have commentCount from API
type NewsDetailItem = Omit<FeedItem, 'commentCount'> & { commentCount?: number };

const SITE_URL = 'https://letaiexplainai.com';

/**
 * Generate NewsArticle JSON-LD schema for the event
 */
function generateNewsArticleJsonLd(event: NewsDetailItem) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: event.headline,
    description: event.summary,
    datePublished: event.publishedDate,
    dateModified: event.publishedDate,
    author: {
      '@type': 'Organization',
      name: event.sourcePublisher || 'Let AI Explain AI',
      url: event.sourceUrl || SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Let AI Explain AI',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/og-image.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/news/${event.id}`,
    },
    image: event.thumbnailUrl || `${SITE_URL}/og-image.png`,
    articleSection: 'AI News',
    keywords: 'AI, artificial intelligence, machine learning, technology news',
  };
}

function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<NewsDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      if (!id) {
        setError('No event ID provided');
        setLoading(false);
        return;
      }

      try {
        const data = await feedApi.getById(id);
        setEvent(data);
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Event not found');
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <SEO
          title="Event Not Found"
          description="The requested AI news event could not be found."
          canonical={`${SITE_URL}/news/${id}`}
          noIndex
        />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Event Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          The news event you're looking for doesn't exist or has been removed.
        </p>
        <div className="flex gap-4">
          <Link
            to="/feed"
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Browse AI News Feed
          </Link>
          <Link
            to="/"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Go to Timeline
          </Link>
        </div>
      </div>
    );
  }

  const canonicalUrl = `${SITE_URL}/news/${event.id}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* SEO Component with OG tags */}
      <SEO
        title={event.headline}
        description={event.summary}
        canonical={canonicalUrl}
        type="article"
        image={event.thumbnailUrl || undefined}
        jsonLd={generateNewsArticleJsonLd(event)}
      />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <Link
            to="/feed"
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            View More News
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {/* Thumbnail/Video */}
          {event.thumbnailUrl && (
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
              {event.mediaType === 'video' && event.videoId ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={event.thumbnailUrl}
                    alt={event.headline}
                    className="w-full h-full object-cover"
                  />
                  <a
                    href={`https://www.youtube.com/watch?v=${event.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
                  >
                    <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-10 h-10 text-white ml-1" fill="white" />
                    </div>
                  </a>
                </div>
              ) : (
                <img
                  src={event.thumbnailUrl}
                  alt={event.headline}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
              {event.sourcePublisher && (
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {event.sourcePublisher}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(event.publishedDate)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {event.viewCount.toLocaleString()} views
              </span>
              {event.isPaywalled && <PaywallBadge paywallReason={event.paywallReason} />}
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {event.headline}
            </h1>

            {/* Summary */}
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              {event.summary}
            </p>

            {/* Why It Matters */}
            {event.whyItMatters && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-6">
                <h2 className="text-sm font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">
                  Why It Matters
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  {event.whyItMatters}
                </p>
              </div>
            )}

            {/* Connection to AI History */}
            {event.connectionExplanation && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                <h2 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                  Connection to AI History
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  {event.connectionExplanation}
                </p>
              </div>
            )}

            {/* Engagement Stats */}
            <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <ThumbsUp className="w-5 h-5" />
                <span>{event.upvotes.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <ThumbsDown className="w-5 h-5" />
                <span>{event.downvotes.toLocaleString()}</span>
              </div>
              {event.sourceUrl && (
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium"
                >
                  Read Original
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            {event.isPaywalled && event.sourceUrl && (
              <div className="mt-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  This source may require a subscription to read in full.
                </p>
              </div>
            )}
          </div>
        </article>

        {/* Related by Subject (Sprint Subj-5) */}
        <RelatedBySubject
          contentType="current_event"
          contentId={event.id}
          limit={5}
          excludeTypes={['current_event']}
          className="mt-8"
        />

        {/* CTA Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Discover more AI news and explore the history of artificial intelligence
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/feed"
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Browse AI News Feed
            </Link>
            <Link
              to="/"
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Explore AI Timeline
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default NewsDetailPage;

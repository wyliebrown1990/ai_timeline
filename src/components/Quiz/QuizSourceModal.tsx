import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink, FileText, Loader2, X } from 'lucide-react';
import type { NewsQuizQuestion } from '../../services/api';
import { feedApi, newsInteractionApi } from '../../services/feedApi';
import type { FeedItem } from '../../types/feed';

type NewsDetailItem = Omit<FeedItem, 'commentCount'> & { commentCount?: number };

interface QuizSourceModalProps {
  question: NewsQuizQuestion;
  sessionId?: string | null;
  onClose: () => void;
}

function buildSeedEvent(question: NewsQuizQuestion): NewsDetailItem | null {
  const hasSeedData =
    Boolean(question.sourceSummary) ||
    Boolean(question.sourceWhyItMatters) ||
    Boolean(question.sourceConnectionExplanation) ||
    Boolean(question.sourceUrl) ||
    Boolean(question.sourcePublisher);

  if (!hasSeedData) {
    return null;
  }

  return {
    id: question.newsEventId,
    headline: question.newsHeadline,
    summary: question.sourceSummary ?? '',
    sourceUrl: question.sourceUrl ?? null,
    sourcePublisher: question.sourcePublisher ?? null,
    publishedDate: question.sourcePublishedDate ?? new Date().toISOString(),
    featured: false,
    mediaType: 'text',
    videoId: null,
    thumbnailUrl: null,
    upvotes: 0,
    downvotes: 0,
    viewCount: 0,
    hotScore: 0,
    whyItMatters: question.sourceWhyItMatters ?? null,
    connectionExplanation: question.sourceConnectionExplanation ?? '',
    commentCount: 0,
  };
}

function formatDate(dateString?: string): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function QuizSourceModal({
  question,
  sessionId,
  onClose,
}: QuizSourceModalProps) {
  const seedEvent = useMemo(() => buildSeedEvent(question), [question]);
  const [event, setEvent] = useState<NewsDetailItem | null>(seedEvent);
  const [isLoading, setIsLoading] = useState(!seedEvent);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEvent(seedEvent);
    setError(null);
    setIsLoading(!seedEvent);

    (async () => {
      try {
        const freshEvent = await feedApi.getById(question.newsEventId);
        if (!cancelled) {
          setEvent(freshEvent);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[QuizSourceModal] Failed to load source event:', err);
        if (!cancelled) {
          if (!seedEvent) {
            setError(err instanceof Error ? err.message : 'Failed to load source context');
          }
          setIsLoading(false);
        }
      }
    })();

    if (sessionId) {
      newsInteractionApi
        .recordEngagement(question.newsEventId, sessionId, 'read_context')
        .catch((err) => {
          console.warn('[QuizSourceModal] Failed to record read_context engagement:', err);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [question.newsEventId, seedEvent, sessionId]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const publishedLabel = formatDate(event?.publishedDate ?? question.sourcePublishedDate);
  const sourceUrl = event?.sourceUrl ?? question.sourceUrl ?? null;
  const hostedArticlePath = question.hostedArticlePath ?? `/news/${question.newsEventId}`;
  const milestoneTitles = Array.from(
    new Set([
      ...(question.prerequisiteMilestoneTitles ?? []),
      ...(question.relatedMilestoneTitles ?? []),
    ])
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-source-modal-title"
      data-testid="quiz-source-modal"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Close source context"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-gray-200 p-6 dark:border-gray-800">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
            <FileText className="h-3.5 w-3.5" />
            Source Context
          </div>
          <h2
            id="quiz-source-modal-title"
            className="pr-10 text-2xl font-bold text-gray-900 dark:text-white"
          >
            {event?.headline ?? question.newsHeadline}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {(event?.sourcePublisher ?? question.sourcePublisher) && (
              <span>{event?.sourcePublisher ?? question.sourcePublisher}</span>
            )}
            {publishedLabel && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {publishedLabel}
              </span>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to={hostedArticlePath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Open hosted article
              <ExternalLink className="h-4 w-4" />
            </Link>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Open original source
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div className="space-y-6 p-6">
          {isLoading && !event && (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading source context...
            </div>
          )}

          {error && !event && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {event && (
            <>
              <section className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Summary
                </div>
                <p className="text-base leading-7 text-gray-700 dark:text-gray-200">
                  {event.summary}
                </p>
              </section>

              {event.whyItMatters && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-950/30">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                    Why It Matters
                  </div>
                  <p className="text-sm leading-7 text-amber-950 dark:text-amber-100">
                    {event.whyItMatters}
                  </p>
                </section>
              )}

              {event.connectionExplanation && (
                <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/30 dark:bg-blue-950/30">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
                    Connection To AI History
                  </div>
                  <p className="text-sm leading-7 text-blue-950 dark:text-blue-100">
                    {event.connectionExplanation}
                  </p>
                </section>
              )}
            </>
          )}

          {milestoneTitles.length > 0 && (
            <section className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Historical Anchors
              </div>
              <div className="flex flex-wrap gap-2">
                {milestoneTitles.map((title) => (
                  <span
                    key={title}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    {title}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

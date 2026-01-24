/**
 * FilteredTimelinePage Component
 * Sprint TD-2 - Dedicated SEO Landing Pages
 *
 * Displays a filtered view of the timeline for specific companies, categories,
 * or date ranges. Each filter type has dedicated SEO metadata.
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { SEO, generateTimelineItemListJsonLd } from '../components/SEO';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Building2,
  Tags,
  Calendar,
  TrendingUp,
  Filter,
} from 'lucide-react';
import {
  getFilterBySlug,
  type TimelineFilterConfig,
  COMPANY_FILTERS,
  CATEGORY_FILTERS,
} from '../config/timelineFilters';
import { getEraBySlug } from '../config/eras';
import type { PaginatedResponse } from '../services/api';
import type { MilestoneResponse } from '../types/milestone';
import { CategoryBadge } from '../components/Timeline/CategoryBadge';
import { SignificanceBadge } from '../components/Timeline/SignificanceBadge';
import type { SignificanceLevel, MilestoneCategory } from '../types/milestone';

/**
 * Loading skeleton for filter page
 */
function FilterSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-12 w-full max-w-xl bg-gray-200 dark:bg-gray-700 rounded mb-6" />
      <div className="grid gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    </div>
  );
}

/**
 * Stats bar for filtered results
 */
function StatsBar({
  totalMilestones,
  dateRange,
}: {
  totalMilestones: number;
  dateRange: { earliest: Date; latest: Date } | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>
          <strong className="text-gray-900 dark:text-white">{totalMilestones}</strong> milestones
        </span>
      </div>
      {dateRange && (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>
            {dateRange.earliest.getFullYear()} - {dateRange.latest.getFullYear()}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Related filters section for internal linking
 */
function RelatedFilters({
  currentSlug,
  filterType,
}: {
  currentSlug: string;
  filterType: 'company' | 'category' | 'dateRange';
}) {
  const relatedFilters =
    filterType === 'company'
      ? COMPANY_FILTERS.filter((f) => f.slug !== currentSlug)
      : CATEGORY_FILTERS.filter((f) => f.slug !== currentSlug);

  if (relatedFilters.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {filterType === 'company' ? 'Other Company Timelines' : 'Related Timeline Views'}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {relatedFilters.slice(0, 4).map((filter) => (
          <Link
            key={filter.slug}
            to={filter.path}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-sm transition-all text-center"
          >
            <div className="font-medium text-gray-900 dark:text-white">
              {filter.slug.charAt(0).toUpperCase() + filter.slug.slice(1).replace('-', ' ')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Timeline</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * Icon for filter type
 */
function FilterIcon({ type }: { type: 'company' | 'category' | 'dateRange' }) {
  switch (type) {
    case 'company':
      return <Building2 className="h-6 w-6" />;
    case 'category':
      return <Tags className="h-6 w-6" />;
    case 'dateRange':
      return <Calendar className="h-6 w-6" />;
  }
}

/**
 * Theme color classes based on filter config
 */
function getThemeClasses(color: TimelineFilterConfig['themeColor']) {
  const colors = {
    orange: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
      hover: 'hover:border-orange-400 dark:hover:border-orange-600',
    },
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      hover: 'hover:border-blue-400 dark:hover:border-blue-600',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
      hover: 'hover:border-green-400 dark:hover:border-green-600',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      hover: 'hover:border-purple-400 dark:hover:border-purple-600',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
      hover: 'hover:border-red-400 dark:hover:border-red-600',
    },
    cyan: {
      bg: 'bg-cyan-100 dark:bg-cyan-900/30',
      text: 'text-cyan-600 dark:text-cyan-400',
      border: 'border-cyan-200 dark:border-cyan-800',
      hover: 'hover:border-cyan-400 dark:hover:border-cyan-600',
    },
  };
  return colors[color];
}

/**
 * FilteredTimelinePage - SEO-optimized filtered timeline view
 */
export default function FilteredTimelinePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState<MilestoneResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Get filter config - check both era and filter configs
  const eraConfig = slug ? getEraBySlug(slug) : undefined;
  const filterConfig = slug ? getFilterBySlug(slug) : undefined;

  // If this is an era slug, redirect to let EraPage handle it
  useEffect(() => {
    if (eraConfig && !filterConfig) {
      // This is handled by EraPage, but we shouldn't reach here due to routing
      return;
    }
  }, [eraConfig, filterConfig]);

  // Fetch filtered milestones
  useEffect(() => {
    if (!slug || !filterConfig) return;

    setIsLoading(true);
    setError(null);

    const fetchMilestones = async () => {
      try {
        let response: PaginatedResponse<MilestoneResponse>;

        // Build query params based on filter type
        const params = new URLSearchParams();
        params.set('limit', '100'); // Get more results for filtered views

        if (filterConfig.type === 'company') {
          params.set('organization', filterConfig.filterValue);
        } else if (filterConfig.type === 'category') {
          if (filterConfig.filterValue !== 'all') {
            params.set('categories', filterConfig.filterValue);
          }
        } else if (filterConfig.type === 'dateRange') {
          const [start, end] = filterConfig.filterValue.split(',');
          if (start) params.set('dateStart', start);
          if (end) params.set('dateEnd', end);
        }

        // Fetch from filter endpoint
        const url = `/api/milestones/filter?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch milestones');
        response = await res.json();

        setMilestones(response.data);
        setTotal(response.pagination.total);
      } catch (err) {
        console.error('Failed to fetch filtered milestones:', err);
        setError(err instanceof Error ? err.message : 'Failed to load milestones');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMilestones();
  }, [slug, filterConfig]);

  // Calculate date range from milestones
  const dateRange = useMemo(() => {
    if (milestones.length === 0) return null;
    const dates = milestones.map((m) => new Date(m.date));
    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
    return { earliest, latest };
  }, [milestones]);

  // Generate schema.org structured data
  const timelineSchema = useMemo(() => {
    if (!filterConfig || milestones.length === 0) return null;
    return generateTimelineItemListJsonLd(
      milestones.map((m) => ({
        id: m.id,
        title: m.title,
        date: m.date,
        description: m.description,
        organization: m.organization,
      })),
      filterConfig.title,
      filterConfig.description
    );
  }, [filterConfig, milestones]);

  // Handle milestone click
  const handleMilestoneClick = (milestoneId: string) => {
    navigate(`/timeline?milestone=${milestoneId}`);
  };

  // Not found state (neither era nor filter)
  if (!filterConfig && !eraConfig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Filter className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Timeline Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We couldn't find a timeline with the slug "{slug}".
            </p>
            <Link
              to="/timeline"
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Main Timeline
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If this is an era config, we shouldn't be here (routing should have sent to EraPage)
  // But handle it just in case
  if (eraConfig && !filterConfig) {
    return null;
  }

  const theme = getThemeClasses(filterConfig!.themeColor);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* SEO */}
      <SEO
        title={`${filterConfig!.title} | LAEA`}
        description={filterConfig!.metaDescription}
        canonical={`https://letaiexplainai.com${filterConfig!.path}`}
        type="article"
        jsonLd={timelineSchema || undefined}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          to="/timeline"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Full Timeline
        </Link>

        {/* Header */}
        <header className="mb-8">
          <div className={`flex items-center gap-2 ${theme.text} mb-2`}>
            <FilterIcon type={filterConfig!.type} />
            <span className="font-medium capitalize">{filterConfig!.type} Timeline</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {filterConfig!.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{filterConfig!.tagline}</p>
        </header>

        {/* Stats */}
        {!isLoading && (
          <div className="mb-8">
            <StatsBar totalMilestones={total} dateRange={dateRange} />
          </div>
        )}

        {/* Description */}
        <section className="mb-10 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {filterConfig!.description}
          </p>
          {/* Related keywords for SEO */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <strong>Related searches:</strong>{' '}
              {filterConfig!.relatedKeywords.join(', ')}
            </div>
          </div>
        </section>

        {/* Loading state */}
        {isLoading && <FilterSkeleton />}

        {/* Error state */}
        {error && (
          <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Milestones list */}
        {!isLoading && !error && milestones.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className={`h-5 w-5 ${theme.text}`} />
              Timeline ({total} milestones)
            </h2>
            <div className="grid gap-3">
              {milestones.map((milestone) => (
                <button
                  key={milestone.id}
                  onClick={() => handleMilestoneClick(milestone.id)}
                  className={`flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border ${theme.border} ${theme.hover} hover:shadow-sm transition-all text-left w-full`}
                >
                  <div className="flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400 pt-0.5 w-20">
                    {new Date(milestone.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      {milestone.title}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {milestone.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <CategoryBadge
                      category={milestone.category as MilestoneCategory}
                      size="sm"
                    />
                    <SignificanceBadge
                      significance={milestone.significance as SignificanceLevel}
                      variant="badge"
                      size="sm"
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* View all link */}
            {total > milestones.length && (
              <div className="mt-6 text-center">
                <Link
                  to="/timeline"
                  className={`inline-flex items-center gap-2 ${theme.text} hover:underline`}
                >
                  View all milestones on the main timeline
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </section>
        )}

        {/* Empty state */}
        {!isLoading && !error && milestones.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Milestones Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We don't have any milestones matching this filter yet.
            </p>
            <Link
              to="/timeline"
              className={`inline-flex items-center gap-2 ${theme.text} hover:underline`}
            >
              Explore the full timeline
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Related filters for internal linking */}
        <RelatedFilters currentSlug={slug!} filterType={filterConfig!.type} />

        {/* Link back to main timeline */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <Link
            to="/timeline"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Explore the Full AI Timeline
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

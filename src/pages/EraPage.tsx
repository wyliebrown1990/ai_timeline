/**
 * EraPage Component
 * Sprint SEO-3 Task 7 - Era/Decade Landing Pages
 *
 * Dedicated landing page for each AI history era/decade with:
 * - Era overview and description
 * - Key milestones from the era
 * - Key figures who contributed
 * - Key concepts/terms that emerged
 * - SEO optimized with structured data
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SEO } from '../components/SEO';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Users,
  BookOpen,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { erasApi, type EraPageResponse } from '../services/api';
import { getEraBySlug, ERAS, type EraConfig } from '../config/eras';
import { CategoryBadge } from '../components/Timeline/CategoryBadge';
import { SignificanceBadge } from '../components/Timeline/SignificanceBadge';
import type { SignificanceLevel, MilestoneCategory } from '../types/milestone';

/**
 * Loading skeleton for era page
 */
function EraSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-12 w-full max-w-xl bg-gray-200 dark:bg-gray-700 rounded mb-6" />
      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    </div>
  );
}

/**
 * Error state component
 */
function EraNotFound({ slug }: { slug: string }) {
  return (
    <div className="text-center py-16">
      <Clock className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Era Not Found
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        We couldn't find an era with the slug "{slug}".
      </p>
      <Link
        to="/timeline"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Timeline
      </Link>
    </div>
  );
}

/**
 * Stats card component
 */
function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </div>
  );
}

/**
 * Era navigation component
 */
function EraNavigation({ currentSlug }: { currentSlug: string }) {
  const currentIndex = ERAS.findIndex((e) => e.slug === currentSlug);
  const prevEra = currentIndex > 0 ? ERAS[currentIndex - 1] : null;
  const nextEra = currentIndex < ERAS.length - 1 ? ERAS[currentIndex + 1] : null;

  return (
    <div className="flex justify-between items-center py-4 border-t border-gray-200 dark:border-gray-700">
      {prevEra ? (
        <Link
          to={prevEra.path}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">{prevEra.slug}</span>
        </Link>
      ) : (
        <div />
      )}
      {nextEra ? (
        <Link
          to={nextEra.path}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <span className="text-sm">{nextEra.slug}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}

/**
 * EraPage - Landing page for a specific AI history era
 */
export default function EraPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [eraData, setEraData] = useState<EraPageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get era config from frontend config
  const eraConfig: EraConfig | undefined = slug ? getEraBySlug(slug) : undefined;

  // Fetch era data from API
  useEffect(() => {
    if (!slug || !eraConfig) return;

    setIsLoading(true);
    setError(null);

    erasApi
      .getBySlug(slug)
      .then(setEraData)
      .catch((err) => {
        console.error('Failed to fetch era data:', err);
        setError(err.message || 'Failed to load era data');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug, eraConfig]);

  // Handle milestone click
  const handleMilestoneClick = (milestoneId: string) => {
    navigate(`/timeline?milestone=${milestoneId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EraSkeleton />
        </div>
      </div>
    );
  }

  // Error/Not found state
  if (error || !eraConfig || !eraData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EraNotFound slug={slug || ''} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* SEO */}
      <SEO
        title={`${eraConfig.title} | AI Timeline | Let AI Explain AI`}
        description={eraConfig.metaDescription}
        canonical={`https://letaiexplainai.com${eraConfig.path}`}
        type="article"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: eraConfig.title,
            description: eraConfig.metaDescription,
            datePublished: eraConfig.startDate,
            about: {
              '@type': 'Thing',
              name: 'Artificial Intelligence History',
            },
            keywords: eraConfig.themes.join(', '),
          },
        ]}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          to="/timeline"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Timeline
        </Link>

        {/* Era header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <Calendar className="h-5 w-5" />
            <span className="font-medium">
              {new Date(eraConfig.startDate).getFullYear()} -{' '}
              {new Date(eraConfig.endDate).getFullYear()}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {eraConfig.title}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {eraConfig.tagline}
          </p>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Clock}
            label="Milestones"
            value={eraData.stats.totalMilestones}
          />
          <StatCard
            icon={Users}
            label="Contributors"
            value={eraData.stats.totalContributors}
          />
          <StatCard
            icon={BookOpen}
            label="Key Terms"
            value={eraData.stats.totalTerms}
          />
          <StatCard
            icon={TrendingUp}
            label="Top Category"
            value={
              eraData.stats.topCategories[0]?.category
                .replace(/_/g, ' ')
                .toLowerCase() || 'N/A'
            }
          />
        </div>

        {/* Era description */}
        <section className="mb-10 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            About This Era
          </h2>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            {eraConfig.description.split('\n\n').map((paragraph, i) => (
              <p
                key={i}
                className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 last:mb-0"
              >
                {paragraph}
              </p>
            ))}
          </div>
          {/* Themes */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Key Themes
            </div>
            <div className="flex flex-wrap gap-2">
              {eraConfig.themes.map((theme) => (
                <span
                  key={theme}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Key Milestones */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Key Milestones
          </h2>
          <div className="grid gap-4">
            {eraData.milestones.slice(0, 10).map((milestone) => (
              <button
                key={milestone.id}
                onClick={() => handleMilestoneClick(milestone.id)}
                className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all text-left w-full"
              >
                <div className="flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400 pt-0.5">
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
          {eraData.stats.totalMilestones > 10 && (
            <div className="mt-4 text-center">
              <Link
                to={`/timeline?dateStart=${eraConfig.startDate}&dateEnd=${eraConfig.endDate}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                View all {eraData.stats.totalMilestones} milestones
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        {/* Key Figures */}
        {eraData.keyFigures.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Key Figures of the Era
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {eraData.keyFigures.map((figure) => (
                <Link
                  key={figure.id}
                  to={`/people/${figure.slug}`}
                  className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm transition-all"
                >
                  {figure.imageUrl ? (
                    <img
                      src={figure.imageUrl}
                      alt={figure.canonicalName}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white truncate">
                      {figure.canonicalName}
                    </div>
                    {figure.currentRole && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {figure.currentRole}
                      </div>
                    )}
                    <div className="text-xs text-purple-600 dark:text-purple-400">
                      {figure.contributionCount} contribution
                      {figure.contributionCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Key Terms */}
        {eraData.keyTerms.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-500" />
              Key Concepts & Terms
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {eraData.keyTerms.map((term) => (
                <Link
                  key={term.id}
                  to={term.slug ? `/glossary/${term.slug}` : `/glossary?term=${term.id}`}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-sm transition-all"
                >
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">
                    {term.term}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {term.shortDefinition}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Era navigation */}
        <EraNavigation currentSlug={slug!} />
      </div>
    </div>
  );
}

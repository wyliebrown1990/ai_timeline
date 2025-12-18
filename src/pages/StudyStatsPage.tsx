/**
 * StudyStatsPage - Flashcard Statistics Dashboard
 *
 * Displays comprehensive statistics about the user's flashcard study progress including:
 * - Overview stats (total cards, mastered, retention, streak)
 * - Review activity chart (last 30 days)
 * - Retention rate trend
 * - Upcoming review forecast
 * - Card performance insights
 * - Category breakdown
 *
 * Performance: Heavy chart components are lazy loaded to reduce initial bundle size.
 */

import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, Loader2 } from 'lucide-react';
import { useFlashcardContext } from '../contexts/FlashcardContext';
import {
  StatsOverview,
  StreakDisplay,
  DataManagement,
} from '../components/Flashcards';
import {
  calculateComputedStats,
  getReviewCountsForDays,
  getRollingRetentionRates,
  getReviewForecast,
} from '../lib/flashcardStats';

// Lazy load chart components for better initial page load
const ReviewActivityChart = lazy(() =>
  import('../components/Flashcards/ReviewActivityChart').then((m) => ({
    default: m.ReviewActivityChart,
  }))
);
const RetentionChart = lazy(() =>
  import('../components/Flashcards/RetentionChart').then((m) => ({
    default: m.RetentionChart,
  }))
);
const ReviewForecast = lazy(() =>
  import('../components/Flashcards/ReviewForecast').then((m) => ({
    default: m.ReviewForecast,
  }))
);
const CardInsights = lazy(() =>
  import('../components/Flashcards/CardInsights').then((m) => ({
    default: m.CardInsights,
  }))
);
const CategoryBreakdown = lazy(() =>
  import('../components/Flashcards/CategoryBreakdown').then((m) => ({
    default: m.CategoryBreakdown,
  }))
);

// Loading fallback for lazy components
function ChartSkeleton({ height = 128 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700/50"
      style={{ height }}
    >
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );
}

/**
 * Statistics page for flashcard study progress.
 * Provides detailed insights into learning patterns and card performance.
 */
function StudyStatsPage() {
  const { cards, stats, reviewHistory, streakHistory } = useFlashcardContext();

  // Calculate comprehensive statistics
  const computedStats = calculateComputedStats(
    cards,
    reviewHistory,
    stats.currentStreak,
    stats.longestStreak,
    stats.lastStudyDate
  );

  // Get data for charts
  const reviewActivity = getReviewCountsForDays(reviewHistory, 30);
  const retentionTrend = getRollingRetentionRates(reviewHistory, 30);
  const forecast = getReviewForecast(cards, 7);

  return (
    <div className="container-main py-6 md:py-8">
      <div className="space-y-8">
        {/* Header with back navigation */}
        <div className="flex items-center gap-4">
          <Link
            to="/study"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            data-testid="back-to-study"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Study Center</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Study Statistics</h1>
        </div>

        {/* Empty State */}
        {cards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              No statistics yet
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Add some flashcards and start studying to see your progress.
            </p>
            <Link
              to="/timeline"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
            >
              Explore Timeline
            </Link>
          </div>
        ) : (
          <>
            {/* Overview Stats Grid */}
            <section aria-labelledby="overview-heading">
              <h2 id="overview-heading" className="sr-only">Overview Statistics</h2>
              <StatsOverview stats={computedStats} />
            </section>

            {/* Streak Display with Milestones */}
            <section aria-labelledby="streak-heading">
              <h2 id="streak-heading" className="sr-only">Study Streak</h2>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Study Streak
                </h3>
                <StreakDisplay streakHistory={streakHistory} variant="full" />
              </div>
            </section>

            {/* Charts Section - Stack on mobile, side-by-side on desktop */}
            <section className="grid gap-6 lg:grid-cols-2" aria-labelledby="charts-heading">
              <h2 id="charts-heading" className="sr-only">Activity Charts</h2>

              {/* Review Activity Chart */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Review Activity
                </h3>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                  Last 30 days
                </p>
                <Suspense fallback={<ChartSkeleton height={128} />}>
                  <ReviewActivityChart data={reviewActivity} days={30} height={128} />
                </Suspense>
              </div>

              {/* Retention Trend Chart */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Retention Trend
                </h3>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                  7-day rolling average
                </p>
                <Suspense fallback={<ChartSkeleton height={128} />}>
                  <RetentionChart data={retentionTrend} days={30} height={128} />
                </Suspense>
              </div>
            </section>

            {/* Forecast & Insights Row */}
            <section className="grid gap-6 lg:grid-cols-2" aria-labelledby="insights-heading">
              <h2 id="insights-heading" className="sr-only">Insights and Forecast</h2>

              {/* Upcoming Reviews Forecast */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Upcoming Reviews
                </h3>
                <Suspense fallback={<ChartSkeleton height={96} />}>
                  <ReviewForecast data={forecast} days={7} />
                </Suspense>
              </div>

              {/* Card Insights */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Card Insights
                </h3>
                <Suspense fallback={<ChartSkeleton height={96} />}>
                  <CardInsights cards={cards} limit={3} />
                </Suspense>
              </div>
            </section>

            {/* Category Breakdown */}
            <section aria-labelledby="breakdown-heading">
              <h2 id="breakdown-heading" className="sr-only">Category Breakdown</h2>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Category Breakdown
                </h3>
                <Suspense fallback={<ChartSkeleton height={120} />}>
                  <CategoryBreakdown cards={cards} />
                </Suspense>
              </div>
            </section>

            {/* Summary Stats */}
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Summary</h3>
              <ul className="mt-2 grid gap-2 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2 lg:grid-cols-4">
                <li>• {computedStats.totalReviewsAllTime} total reviews</li>
                <li>• {computedStats.newCards} new cards</li>
                <li>• {computedStats.learningCards} learning</li>
                <li>• {Math.round(computedStats.totalMinutesStudied)} minutes studied</li>
              </ul>
            </section>

            {/* Data Management */}
            <section aria-labelledby="data-management-heading">
              <h2 id="data-management-heading" className="sr-only">Data Management</h2>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Data Management
                </h3>
                <DataManagement onDataCleared={() => window.location.reload()} />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export { StudyStatsPage };
export default StudyStatsPage;

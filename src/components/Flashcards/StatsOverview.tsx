/**
 * StatsOverview Component
 *
 * Displays a grid of key statistics for the flashcard study system.
 * Shows total cards, mastered cards, current streak, total reviews,
 * and average retention rate in a responsive grid layout.
 */

import { Flame, BookOpen, Trophy, BarChart3, Target } from 'lucide-react';
import type { ComputedStats } from '../../lib/flashcardStats';

// =============================================================================
// Types
// =============================================================================

export interface StatsOverviewProps {
  /** Computed statistics from flashcardStats module */
  stats: ComputedStats;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  colorClass: string;
}

/**
 * Individual stat card with icon, value, label, and optional sub-value.
 */
function StatCard({ label, value, subValue, icon, colorClass }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          {value}
        </p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {label}
        </p>
        {subValue && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// StatsOverview Component
// =============================================================================

/**
 * Displays an overview grid of key flashcard statistics.
 *
 * @example
 * ```tsx
 * import { StatsOverview } from './StatsOverview';
 * import { calculateComputedStats } from '../../lib/flashcardStats';
 *
 * const stats = calculateComputedStats(cards, history, streak, longestStreak, lastDate);
 * <StatsOverview stats={stats} />
 * ```
 */
export function StatsOverview({ stats, className = '' }: StatsOverviewProps) {
  // Format retention rate as percentage
  const retentionPercent = stats.retentionRate30d > 0
    ? `${Math.round(stats.retentionRate30d * 100)}%`
    : '—';

  // Format total reviews with thousands separator
  const totalReviewsFormatted = stats.totalReviewsAllTime.toLocaleString();

  // Determine streak color based on current streak
  const streakColorClass = stats.currentStreak > 0
    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';

  // Determine retention color based on value
  const getRetentionColorClass = () => {
    if (stats.retentionRate30d >= 0.85) {
      return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    }
    if (stats.retentionRate30d >= 0.7) {
      return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    if (stats.retentionRate30d > 0) {
      return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
    }
    return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
  };

  return (
    <div
      className={`grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5 ${className}`}
      role="region"
      aria-label="Study statistics overview"
    >
      {/* Total Cards */}
      <StatCard
        label="Total Cards"
        value={stats.totalCards}
        icon={<BookOpen className="h-5 w-5" />}
        colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
      />

      {/* Mastered Cards */}
      <StatCard
        label="Mastered"
        value={stats.masteredCards}
        subValue={stats.totalCards > 0
          ? `${Math.round((stats.masteredCards / stats.totalCards) * 100)}% of total`
          : undefined}
        icon={<Trophy className="h-5 w-5" />}
        colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
      />

      {/* Current Streak */}
      <StatCard
        label="Day Streak"
        value={stats.currentStreak}
        subValue={stats.longestStreak > stats.currentStreak
          ? `Best: ${stats.longestStreak} days`
          : stats.currentStreak > 0
          ? 'Personal best!'
          : undefined}
        icon={<Flame className="h-5 w-5" />}
        colorClass={streakColorClass}
      />

      {/* Total Reviews */}
      <StatCard
        label="Total Reviews"
        value={totalReviewsFormatted}
        icon={<BarChart3 className="h-5 w-5" />}
        colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
      />

      {/* Retention Rate */}
      <StatCard
        label="Retention"
        value={retentionPercent}
        subValue={stats.retentionRate30d > 0 ? '30-day average' : 'No data yet'}
        icon={<Target className="h-5 w-5" />}
        colorClass={getRetentionColorClass()}
      />
    </div>
  );
}

export default StatsOverview;

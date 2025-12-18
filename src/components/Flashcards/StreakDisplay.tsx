/**
 * StreakDisplay Component
 *
 * Shows the user's study streak with milestone progress and achievements.
 * Displays current streak, progress to next milestone, and achieved badges.
 */

import { useMemo } from 'react';
import { Flame, Award, Target, Zap } from 'lucide-react';
import type { StreakHistory, StreakAchievement } from '../../types/flashcard';
import { STREAK_MILESTONES } from '../../types/flashcard';
import {
  getMilestoneProgress,
  getMilestoneLabel,
  getStreakMessage,
  getTodayDateString,
} from '../../lib/flashcardStats';

// =============================================================================
// Types
// =============================================================================

export interface StreakDisplayProps {
  /** Streak history data */
  streakHistory: StreakHistory;
  /** Whether to show the full display or compact version */
  variant?: 'full' | 'compact';
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get milestone badge color based on milestone value
 */
function getMilestoneColor(milestone: number): string {
  if (milestone >= 365) return 'text-yellow-500'; // Gold
  if (milestone >= 100) return 'text-purple-500'; // Purple
  if (milestone >= 30) return 'text-blue-500';    // Blue
  return 'text-gray-500';                          // Silver
}

/**
 * Get milestone badge background class
 */
function getMilestoneBgClass(milestone: number): string {
  if (milestone >= 365) return 'bg-yellow-100 dark:bg-yellow-900/30';
  if (milestone >= 100) return 'bg-purple-100 dark:bg-purple-900/30';
  if (milestone >= 30) return 'bg-blue-100 dark:bg-blue-900/30';
  return 'bg-gray-100 dark:bg-gray-800';
}

// =============================================================================
// MilestoneBadge Component
// =============================================================================

interface MilestoneBadgeProps {
  achievement: StreakAchievement;
}

function MilestoneBadge({ achievement }: MilestoneBadgeProps) {
  const label = getMilestoneLabel(achievement.milestone);
  const colorClass = getMilestoneColor(achievement.milestone);
  const bgClass = getMilestoneBgClass(achievement.milestone);
  const achievedDate = new Date(achievement.achievedAt).toLocaleDateString();

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${bgClass}`}
      title={`Achieved on ${achievedDate}`}
      data-testid={`milestone-badge-${achievement.milestone}`}
    >
      <Award className={`h-3.5 w-3.5 ${colorClass}`} />
      <span className={`text-xs font-medium ${colorClass}`}>{label}</span>
    </div>
  );
}

// =============================================================================
// ProgressBar Component
// =============================================================================

interface ProgressBarProps {
  progress: number;
  label: string;
}

function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <div className="space-y-1" data-testid="milestone-progress">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">Next: {label}</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

// =============================================================================
// StreakDisplay Component
// =============================================================================

/**
 * Displays streak information with milestone progress and achievements.
 *
 * @example
 * ```tsx
 * import { StreakDisplay } from './StreakDisplay';
 *
 * <StreakDisplay streakHistory={streakHistory} variant="full" />
 * ```
 */
export function StreakDisplay({
  streakHistory,
  variant = 'full',
  className = '',
}: StreakDisplayProps) {
  const { currentStreak, longestStreak, lastStudyDate, achievements } = streakHistory;

  // Check if user has studied today
  const today = getTodayDateString();
  const studiedToday = lastStudyDate === today;

  // Calculate milestone progress
  const { nextMilestone, progress, daysRemaining } = useMemo(
    () => getMilestoneProgress(currentStreak),
    [currentStreak]
  );

  // Get encouraging message
  const message = useMemo(
    () => getStreakMessage(currentStreak, studiedToday),
    [currentStreak, studiedToday]
  );

  // Sort achievements by milestone descending
  const sortedAchievements = useMemo(
    () => [...achievements].sort((a, b) => b.milestone - a.milestone),
    [achievements]
  );

  // Determine streak fire color based on streak length
  const streakColorClass = useMemo(() => {
    if (currentStreak === 0) return 'text-gray-400 dark:text-gray-600';
    if (!studiedToday) return 'text-orange-300 dark:text-orange-700'; // Fading
    if (currentStreak >= 30) return 'text-orange-500';
    if (currentStreak >= 7) return 'text-orange-400';
    return 'text-orange-400';
  }, [currentStreak, studiedToday]);

  // Compact variant - just the streak number with icon
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-2 ${className}`}
        data-testid="streak-display-compact"
      >
        <Flame className={`h-5 w-5 ${streakColorClass}`} />
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          {currentStreak}
        </span>
        {studiedToday && currentStreak > 0 && (
          <span title="Studied today!">
            <Zap className="h-4 w-4 text-yellow-500" aria-label="Studied today" />
          </span>
        )}
      </div>
    );
  }

  // Full variant - complete display with progress and badges
  return (
    <div className={className} data-testid="streak-display">
      {/* Main Streak Display */}
      <div className="flex items-center gap-4">
        {/* Streak Fire Icon */}
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-xl ${
            currentStreak > 0
              ? 'bg-orange-100 dark:bg-orange-900/30'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          <Flame className={`h-8 w-8 ${streakColorClass}`} />
        </div>

        {/* Streak Info */}
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {currentStreak}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              day{currentStreak !== 1 ? 's' : ''}
            </span>
            {studiedToday && currentStreak > 0 && (
              <span title="Studied today!">
                <Zap className="h-4 w-4 text-yellow-500" aria-label="Studied today" />
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400" data-testid="streak-message">
            {message}
          </p>
          {longestStreak > currentStreak && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
              Best: {longestStreak} days
            </p>
          )}
        </div>
      </div>

      {/* Milestone Progress */}
      {nextMilestone !== null && currentStreak > 0 && (
        <div className="mt-4">
          <ProgressBar
            progress={progress}
            label={`${getMilestoneLabel(nextMilestone)} (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left)`}
          />
        </div>
      )}

      {/* Achieved Milestones */}
      {sortedAchievements.length > 0 && (
        <div className="mt-4" data-testid="achieved-milestones">
          <div className="mb-2 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Milestones Achieved
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedAchievements.map((achievement) => (
              <MilestoneBadge key={achievement.milestone} achievement={achievement} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Milestones (show when no achievements yet) */}
      {sortedAchievements.length === 0 && currentStreak > 0 && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50" data-testid="upcoming-milestones">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Upcoming milestones:</span>{' '}
            {STREAK_MILESTONES.slice(0, 3).map((m) => getMilestoneLabel(m)).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

export default StreakDisplay;

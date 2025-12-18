/**
 * ReviewForecast Component
 *
 * Displays upcoming review schedule with a mini bar chart and list view.
 * Helps users plan their study time by showing cards due each day.
 * Includes visual indicators for heavy review days and weekly totals.
 */

import { useMemo } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

/** Forecast data point for a single day */
export interface ForecastDay {
  date: string;
  count: number;
}

export interface ReviewForecastProps {
  /** Array of forecast data with date and count */
  data: ForecastDay[];
  /** Number of days to display (default: 7) */
  days?: number;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Threshold for "heavy" review day (shows warning indicator) */
const HEAVY_DAY_THRESHOLD = 15;

/** Day names for display */
const DAY_LABELS = ['Today', 'Tomorrow'] as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get display label for a day (Today, Tomorrow, or weekday name)
 */
function getDayLabel(dateStr: string, index: number): string {
  if (index < DAY_LABELS.length) {
    return DAY_LABELS[index]!;
  }
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Calculate study time estimate based on card count
 * Assumes ~30 seconds per card on average
 */
function getStudyTimeEstimate(count: number): string {
  if (count === 0) return '';
  const minutes = Math.ceil(count * 0.5);
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) return `~${hours}h`;
  return `~${hours}h ${remainingMins}m`;
}

// =============================================================================
// ForecastBar Component (mini bar chart)
// =============================================================================

interface ForecastBarProps {
  data: ForecastDay[];
  maxCount: number;
}

function ForecastBar({ data, maxCount }: ForecastBarProps) {
  return (
    <div
      className="mb-4 flex items-end gap-1 h-16"
      role="img"
      aria-label="Review forecast bar chart"
      data-testid="forecast-bar-chart"
    >
      {data.map((day, i) => {
        const heightPercent = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
        const isHeavy = day.count >= HEAVY_DAY_THRESHOLD;
        const isToday = i === 0;

        return (
          <div
            key={day.date}
            className="flex flex-1 flex-col items-center"
          >
            {/* Bar */}
            <div
              className={`w-full rounded-t transition-all ${
                isToday
                  ? 'bg-orange-500'
                  : isHeavy
                  ? 'bg-amber-500 dark:bg-amber-600'
                  : 'bg-blue-400 dark:bg-blue-500'
              }`}
              style={{
                height: `${Math.max(heightPercent, day.count > 0 ? 10 : 2)}%`,
                minHeight: day.count > 0 ? '4px' : '2px',
              }}
              title={`${getDayLabel(day.date, i)}: ${day.count} cards`}
            />
            {/* Day initial label */}
            <span className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              {getDayLabel(day.date, i).charAt(0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// ForecastList Component (detailed list view)
// =============================================================================

interface ForecastListProps {
  data: ForecastDay[];
}

function ForecastList({ data }: ForecastListProps) {
  return (
    <ul className="space-y-2" data-testid="forecast-list">
      {data.map((day, i) => {
        const isHeavy = day.count >= HEAVY_DAY_THRESHOLD;
        const isToday = i === 0;
        const timeEstimate = getStudyTimeEstimate(day.count);

        return (
          <li
            key={day.date}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              isToday
                ? 'bg-orange-50 dark:bg-orange-900/20'
                : 'bg-gray-50 dark:bg-gray-900/50'
            }`}
            data-testid={`forecast-day-${i}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium ${
                  isToday
                    ? 'text-orange-700 dark:text-orange-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {getDayLabel(day.date, i)}
              </span>
              {isHeavy && (
                <AlertCircle
                  className="h-3.5 w-3.5 text-amber-500"
                  aria-label="Heavy review day"
                />
              )}
            </div>
            <div className="flex items-center gap-3">
              {timeEstimate && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {timeEstimate}
                </span>
              )}
              <span
                className={`text-sm font-semibold ${
                  isToday
                    ? 'text-orange-600 dark:text-orange-400'
                    : day.count > 0
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {day.count} {day.count === 1 ? 'card' : 'cards'}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// =============================================================================
// ReviewForecast Component
// =============================================================================

/**
 * Displays upcoming review schedule with bar chart and list view.
 * Helps users plan their study sessions by showing daily card counts.
 *
 * @example
 * ```tsx
 * import { ReviewForecast } from './ReviewForecast';
 * import { getReviewForecast } from '../../lib/flashcardStats';
 *
 * const forecast = getReviewForecast(cards, 7);
 * <ReviewForecast data={forecast} />
 * ```
 */
export function ReviewForecast({
  data,
  days = 7,
  className = '',
}: ReviewForecastProps) {
  // Take only the specified number of days
  const forecastData = useMemo(() => data.slice(0, days), [data, days]);

  // Calculate totals and max for scaling
  const { totalCards, maxCount, hasAnyCards, heavyDays } = useMemo(() => {
    const total = forecastData.reduce((sum, day) => sum + day.count, 0);
    const max = Math.max(...forecastData.map((d) => d.count), 1);
    const hasAny = total > 0;
    const heavy = forecastData.filter((d) => d.count >= HEAVY_DAY_THRESHOLD).length;
    return { totalCards: total, maxCount: max, hasAnyCards: hasAny, heavyDays: heavy };
  }, [forecastData]);

  // Study time estimate for the week
  const weeklyTimeEstimate = getStudyTimeEstimate(totalCards);

  return (
    <div className={className} data-testid="review-forecast">
      {/* Header with icon */}
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Next {days} Days
        </span>
      </div>

      {hasAnyCards ? (
        <>
          {/* Mini bar chart */}
          <ForecastBar data={forecastData} maxCount={maxCount} />

          {/* Detailed list */}
          <ForecastList data={forecastData} />

          {/* Weekly summary */}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700/50">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              This week
            </span>
            <div className="flex items-center gap-2">
              {weeklyTimeEstimate && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {weeklyTimeEstimate}
                </span>
              )}
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {totalCards} total
              </span>
            </div>
          </div>

          {/* Planning tip for heavy days */}
          {heavyDays > 0 && (
            <p className="mt-3 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <span>
                {heavyDays === 1
                  ? 'You have 1 heavy review day coming up. Consider spreading out your study sessions.'
                  : `You have ${heavyDays} heavy review days. Plan extra study time this week.`}
              </span>
            </p>
          )}
        </>
      ) : (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8 dark:border-gray-600 dark:bg-gray-900/50"
          data-testid="forecast-empty"
        >
          <Calendar className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No upcoming reviews
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Add cards to start scheduling
          </p>
        </div>
      )}
    </div>
  );
}

export default ReviewForecast;

/**
 * ReviewActivityChart Component
 *
 * Displays a stacked bar chart showing review activity over time.
 * Each bar represents a day and is color-coded by rating distribution:
 * - Red: Again (failed, quality 0-2)
 * - Yellow: Hard (quality 3)
 * - Green: Good (quality 4)
 * - Blue: Easy (quality 5)
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { DailyReviewRecord } from '../../types/flashcard';

// =============================================================================
// Types
// =============================================================================

export interface ReviewActivityChartProps {
  /** Array of daily review records to display */
  data: DailyReviewRecord[];
  /** Number of days to show (default: 30) */
  days?: number;
  /** Height of the chart in pixels (default: 128) */
  height?: number;
  /** Optional additional CSS classes */
  className?: string;
}

interface TooltipData {
  date: string;
  total: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
  x: number;
  y: number;
}

// =============================================================================
// Rating Colors
// =============================================================================

const RATING_COLORS = {
  again: 'bg-red-500 dark:bg-red-600',
  hard: 'bg-yellow-500 dark:bg-yellow-600',
  good: 'bg-green-500 dark:bg-green-600',
  easy: 'bg-blue-500 dark:bg-blue-600',
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format date string for display (e.g., "Dec 18")
 */
function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date for tooltip header (e.g., "Wednesday, Dec 18")
 */
function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

// =============================================================================
// Tooltip Component
// =============================================================================

interface ChartTooltipProps {
  data: TooltipData;
  onClose: () => void;
}

function ChartTooltip({ data, onClose }: ChartTooltipProps) {
  // Calculate tooltip position (center above the bar, adjust if near edges)
  const tooltipWidth = 180;
  const tooltipHeight = 140;
  const padding = 8;

  let left = data.x - tooltipWidth / 2;
  let top = data.y - tooltipHeight - padding;

  // Adjust if tooltip would go off screen
  if (left < padding) left = padding;
  if (left + tooltipWidth > window.innerWidth - padding) {
    left = window.innerWidth - tooltipWidth - padding;
  }
  if (top < padding) {
    top = data.y + 30; // Show below if not enough space above
  }

  return createPortal(
    <div
      className="fixed z-50 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${tooltipWidth}px`,
      }}
      onMouseLeave={onClose}
    >
      <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
        {formatDateFull(data.date)}
      </p>
      <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
        {data.total} total {data.total === 1 ? 'review' : 'reviews'}
      </p>
      <div className="space-y-1 text-xs">
        {data.easy > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Easy
            </span>
            <span className="text-gray-700 dark:text-gray-300">{data.easy}</span>
          </div>
        )}
        {data.good > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Good
            </span>
            <span className="text-gray-700 dark:text-gray-300">{data.good}</span>
          </div>
        )}
        {data.hard > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              Hard
            </span>
            <span className="text-gray-700 dark:text-gray-300">{data.hard}</span>
          </div>
        )}
        {data.again > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Again
            </span>
            <span className="text-gray-700 dark:text-gray-300">{data.again}</span>
          </div>
        )}
        {data.total === 0 && (
          <p className="text-gray-500">No reviews</p>
        )}
      </div>
    </div>,
    document.body
  );
}

// =============================================================================
// Bar Component
// =============================================================================

interface BarProps {
  record: DailyReviewRecord;
  maxReviews: number;
  height: number;
  onHover: (data: TooltipData | null) => void;
}

function Bar({ record, maxReviews, height, onHover }: BarProps) {
  const total = record.totalReviews;

  // Calculate bar height as percentage of max
  const barHeight = maxReviews > 0 && total > 0
    ? Math.max((total / maxReviews) * 100, 5) // Minimum 5% for visibility
    : 0;

  // Calculate segment heights as percentages of total bar
  const getSegmentHeight = (count: number) => {
    if (total === 0) return 0;
    return (count / total) * 100;
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onHover({
      date: record.date,
      total: record.totalReviews,
      again: record.againCount,
      hard: record.hardCount,
      good: record.goodCount,
      easy: record.easyCount,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  return (
    <div
      className="group relative flex-1 cursor-pointer"
      style={{ height: `${height}px` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Bar container - grows from bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col-reverse overflow-hidden rounded-t transition-all group-hover:opacity-80">
        <div
          className="flex flex-col-reverse"
          style={{ height: `${barHeight}%` }}
        >
          {/* Stack segments from bottom: again, hard, good, easy */}
          {record.againCount > 0 && (
            <div
              className={`${RATING_COLORS.again} w-full`}
              style={{ height: `${getSegmentHeight(record.againCount)}%` }}
            />
          )}
          {record.hardCount > 0 && (
            <div
              className={`${RATING_COLORS.hard} w-full`}
              style={{ height: `${getSegmentHeight(record.hardCount)}%` }}
            />
          )}
          {record.goodCount > 0 && (
            <div
              className={`${RATING_COLORS.good} w-full`}
              style={{ height: `${getSegmentHeight(record.goodCount)}%` }}
            />
          )}
          {record.easyCount > 0 && (
            <div
              className={`${RATING_COLORS.easy} w-full`}
              style={{ height: `${getSegmentHeight(record.easyCount)}%` }}
            />
          )}
        </div>
      </div>

      {/* Empty state indicator */}
      {total === 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-t bg-gray-200 dark:bg-gray-700" />
      )}
    </div>
  );
}

// =============================================================================
// ReviewActivityChart Component
// =============================================================================

/**
 * Displays a stacked bar chart of review activity over time.
 *
 * @example
 * ```tsx
 * import { ReviewActivityChart } from './ReviewActivityChart';
 * import { getReviewCountsForDays } from '../../lib/flashcardStats';
 *
 * const reviewData = getReviewCountsForDays(history, 30);
 * <ReviewActivityChart data={reviewData} />
 * ```
 */
export function ReviewActivityChart({
  data,
  days = 30,
  height = 128,
  className = '',
}: ReviewActivityChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Take only the last N days of data
  const chartData = data.slice(-days);

  // Find max reviews for scaling
  const maxReviews = Math.max(...chartData.map(d => d.totalReviews), 1);

  // Get first and last dates for axis labels
  const firstDate = chartData[0]?.date ?? '';
  const lastDate = chartData[chartData.length - 1]?.date ?? '';

  return (
    <div className={className}>
      {/* Chart container */}
      <div
        className="flex items-end gap-0.5 sm:gap-1"
        style={{ height: `${height}px` }}
        role="img"
        aria-label={`Review activity chart showing ${days} days of data`}
      >
        {chartData.map((record) => (
          <Bar
            key={record.date}
            record={record}
            maxReviews={maxReviews}
            height={height}
            onHover={setTooltip}
          />
        ))}
      </div>

      {/* X-axis labels */}
      <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatDateLabel(firstDate)}</span>
        <span>{formatDateLabel(lastDate)}</span>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Easy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Good
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          Hard
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Again
        </span>
      </div>

      {/* Tooltip */}
      {tooltip && <ChartTooltip data={tooltip} onClose={() => setTooltip(null)} />}
    </div>
  );
}

export default ReviewActivityChart;

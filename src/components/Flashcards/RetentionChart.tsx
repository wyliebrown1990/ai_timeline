/**
 * RetentionChart Component
 *
 * Displays a line chart showing retention rate (% correct) over time.
 * Uses a 7-day rolling average to smooth the data and shows a target line at 85%.
 * Includes trend indicator to show if retention is improving or declining.
 */

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { TARGET_RETENTION_RATE } from '../../lib/flashcardStats';

// =============================================================================
// Types
// =============================================================================

/** Data point for retention rate on a specific date */
export interface RetentionDataPoint {
  date: string;
  retentionRate: number;
}

export interface RetentionChartProps {
  /** Array of retention data points with date and rate */
  data: RetentionDataPoint[];
  /** Number of days to display (default: 30) */
  days?: number;
  /** Height of the chart in pixels (default: 128) */
  height?: number;
  /** Optional additional CSS classes */
  className?: string;
}

interface TooltipData {
  date: string;
  retentionRate: number;
  x: number;
  y: number;
}

/** Trend direction based on retention rate changes */
type TrendDirection = 'improving' | 'declining' | 'stable';

// =============================================================================
// Constants
// =============================================================================

/** Threshold for determining trend (percentage point difference) */
const TREND_THRESHOLD = 0.02;

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

/**
 * Calculate trend direction by comparing recent vs earlier averages
 * Compares last 7 days average to previous 7 days average
 */
function calculateTrend(data: RetentionDataPoint[]): TrendDirection {
  if (data.length < 14) return 'stable';

  // Filter out days with no data (rate === 0)
  const withData = data.filter((d) => d.retentionRate > 0);
  if (withData.length < 7) return 'stable';

  // Get recent 7 data points vs previous 7
  const recent = withData.slice(-7);
  const previous = withData.slice(-14, -7);

  if (previous.length < 3) return 'stable';

  const recentAvg = recent.reduce((sum, d) => sum + d.retentionRate, 0) / recent.length;
  const previousAvg = previous.reduce((sum, d) => sum + d.retentionRate, 0) / previous.length;

  const diff = recentAvg - previousAvg;

  if (diff > TREND_THRESHOLD) return 'improving';
  if (diff < -TREND_THRESHOLD) return 'declining';
  return 'stable';
}

// =============================================================================
// Tooltip Component
// =============================================================================

interface ChartTooltipProps {
  data: TooltipData;
  onClose: () => void;
}

function ChartTooltip({ data, onClose }: ChartTooltipProps) {
  const tooltipWidth = 160;
  const tooltipHeight = 80;
  const padding = 8;

  let left = data.x - tooltipWidth / 2;
  let top = data.y - tooltipHeight - padding;

  // Adjust if tooltip would go off screen
  if (left < padding) left = padding;
  if (left + tooltipWidth > window.innerWidth - padding) {
    left = window.innerWidth - tooltipWidth - padding;
  }
  if (top < padding) {
    top = data.y + 20; // Show below if not enough space above
  }

  const percentDisplay = data.retentionRate > 0
    ? `${Math.round(data.retentionRate * 100)}%`
    : 'No data';

  const targetDiff = data.retentionRate - TARGET_RETENTION_RATE;
  const targetStatus = data.retentionRate === 0
    ? ''
    : targetDiff >= 0
    ? `${Math.round(targetDiff * 100)}% above target`
    : `${Math.round(Math.abs(targetDiff) * 100)}% below target`;

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
      <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
        {formatDateFull(data.date)}
      </p>
      <p className="text-lg font-bold text-orange-500">{percentDisplay}</p>
      {targetStatus && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {targetStatus}
        </p>
      )}
    </div>,
    document.body
  );
}

// =============================================================================
// Trend Indicator Component
// =============================================================================

interface TrendIndicatorProps {
  trend: TrendDirection;
}

function TrendIndicator({ trend }: TrendIndicatorProps) {
  const config = {
    improving: {
      Icon: TrendingUp,
      label: 'Improving',
      colorClass: 'text-green-500',
      bgClass: 'bg-green-100 dark:bg-green-900/30',
    },
    declining: {
      Icon: TrendingDown,
      label: 'Declining',
      colorClass: 'text-red-500',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
    },
    stable: {
      Icon: Minus,
      label: 'Stable',
      colorClass: 'text-gray-500',
      bgClass: 'bg-gray-100 dark:bg-gray-700/50',
    },
  };

  const { Icon, label, colorClass, bgClass } = config[trend];

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bgClass}`}
    >
      <Icon className={`h-3 w-3 ${colorClass}`} />
      <span className={colorClass}>{label}</span>
    </div>
  );
}

// =============================================================================
// RetentionChart Component
// =============================================================================

/**
 * Displays a line chart of retention rate over time with 7-day rolling average.
 * Shows a target line at 85% and indicates whether the trend is improving or declining.
 *
 * @example
 * ```tsx
 * import { RetentionChart } from './RetentionChart';
 * import { getRollingRetentionRates } from '../../lib/flashcardStats';
 *
 * const retentionData = getRollingRetentionRates(history, 30);
 * <RetentionChart data={retentionData} />
 * ```
 */
export function RetentionChart({
  data,
  days = 30,
  height = 128,
  className = '',
}: RetentionChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Take only the last N days of data
  const chartData = useMemo(() => data.slice(-days), [data, days]);

  // Calculate trend
  const trend = useMemo(() => calculateTrend(chartData), [chartData]);

  // Chart dimensions - leave space for Y axis labels
  const chartWidth = 100; // percentage
  const padding = { left: 35, right: 10, top: 10, bottom: 5 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Check if there's any data with reviews
  const hasData = chartData.some((d) => d.retentionRate > 0);

  // Build SVG path for the line
  const linePath = useMemo(() => {
    if (!hasData || chartData.length === 0) return '';

    // Filter to only points with data for a cleaner line
    const pointsWithData = chartData
      .map((d, i) => ({ ...d, index: i }))
      .filter((d) => d.retentionRate > 0);

    if (pointsWithData.length < 2) return '';

    const xScale = plotWidth / (chartData.length - 1 || 1);

    return pointsWithData
      .map((d, i) => {
        const x = padding.left + d.index * xScale;
        const y = padding.top + plotHeight - d.retentionRate * plotHeight;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [chartData, hasData, padding.left, padding.top, plotHeight, plotWidth]);

  // Build SVG path for the area fill under the line
  const areaPath = useMemo(() => {
    if (!hasData || chartData.length === 0 || !linePath) return '';

    const pointsWithData = chartData
      .map((d, i) => ({ ...d, index: i }))
      .filter((d) => d.retentionRate > 0);

    if (pointsWithData.length < 2) return '';

    const xScale = plotWidth / (chartData.length - 1 || 1);
    const firstX = padding.left + pointsWithData[0]!.index * xScale;
    const lastX = padding.left + pointsWithData[pointsWithData.length - 1]!.index * xScale;
    const bottomY = padding.top + plotHeight;

    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [chartData, hasData, linePath, padding.left, padding.top, plotHeight, plotWidth]);

  // Target line Y position (85%)
  const targetY = padding.top + plotHeight - TARGET_RETENTION_RATE * plotHeight;

  // Handle mouse hover to show tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hasData) return;

    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const relativeX = (mouseX / svgRect.width) * 100;

    // Determine which data point is closest
    const xScale = plotWidth / (chartData.length - 1 || 1);
    const dataIndex = Math.round((relativeX - padding.left) / xScale);
    const clampedIndex = Math.max(0, Math.min(chartData.length - 1, dataIndex));
    const dataPoint = chartData[clampedIndex];

    if (dataPoint) {
      const pointX = svgRect.left + ((padding.left + clampedIndex * xScale) / 100) * svgRect.width;
      const pointY = svgRect.top + ((padding.top + plotHeight - dataPoint.retentionRate * plotHeight) / height) * svgRect.height;

      setTooltip({
        date: dataPoint.date,
        retentionRate: dataPoint.retentionRate,
        x: pointX,
        y: pointY,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  // Get first and last dates for axis labels
  const firstDate = chartData[0]?.date ?? '';
  const lastDate = chartData[chartData.length - 1]?.date ?? '';

  return (
    <div className={className}>
      {/* Trend indicator */}
      {hasData && (
        <div className="mb-2 flex items-center justify-between">
          <TrendIndicator trend={trend} />
          {chartData.length > 0 && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round((chartData[chartData.length - 1]?.retentionRate ?? 0) * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Chart SVG */}
      <svg
        viewBox={`0 0 100 ${height}`}
        className="w-full cursor-crosshair"
        style={{ height: `${height}px` }}
        role="img"
        aria-label={`Retention rate chart showing ${days} days of data`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        data-testid="retention-chart-svg"
      >
        {/* Y-axis labels */}
        <text
          x={padding.left - 3}
          y={padding.top + 4}
          className="fill-gray-400 text-[6px] dark:fill-gray-500"
          textAnchor="end"
        >
          100%
        </text>
        <text
          x={padding.left - 3}
          y={padding.top + plotHeight / 2 + 2}
          className="fill-gray-400 text-[6px] dark:fill-gray-500"
          textAnchor="end"
        >
          50%
        </text>
        <text
          x={padding.left - 3}
          y={padding.top + plotHeight + 2}
          className="fill-gray-400 text-[6px] dark:fill-gray-500"
          textAnchor="end"
        >
          0%
        </text>

        {/* Grid lines */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left + plotWidth}
          y2={padding.top}
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth="0.3"
        />
        <line
          x1={padding.left}
          y1={padding.top + plotHeight / 2}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight / 2}
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth="0.3"
        />
        <line
          x1={padding.left}
          y1={padding.top + plotHeight}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight}
          className="stroke-gray-300 dark:stroke-gray-600"
          strokeWidth="0.5"
        />

        {/* Target line at 85% */}
        <line
          x1={padding.left}
          y1={targetY}
          x2={padding.left + plotWidth}
          y2={targetY}
          className="stroke-orange-400 dark:stroke-orange-500"
          strokeWidth="0.5"
          strokeDasharray="2,1"
        />
        <text
          x={padding.left + plotWidth - 1}
          y={targetY - 2}
          className="fill-orange-400 text-[5px] dark:fill-orange-500"
          textAnchor="end"
        >
          85%
        </text>

        {hasData ? (
          <>
            {/* Area fill under line */}
            <path
              d={areaPath}
              className="fill-orange-100 dark:fill-orange-900/20"
            />

            {/* Line chart */}
            <path
              d={linePath}
              fill="none"
              className="stroke-orange-500"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {chartData.map((d, i) => {
              if (d.retentionRate === 0) return null;
              const xScale = plotWidth / (chartData.length - 1 || 1);
              const x = padding.left + i * xScale;
              const y = padding.top + plotHeight - d.retentionRate * plotHeight;
              return (
                <circle
                  key={d.date}
                  cx={x}
                  cy={y}
                  r="1"
                  className="fill-orange-500"
                />
              );
            })}
          </>
        ) : (
          /* Empty state */
          <text
            x="50"
            y={height / 2}
            className="fill-gray-400 text-[8px] dark:fill-gray-500"
            textAnchor="middle"
          >
            No review data yet
          </text>
        )}
      </svg>

      {/* X-axis labels */}
      <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatDateLabel(firstDate)}</span>
        <span>{formatDateLabel(lastDate)}</span>
      </div>

      {/* Legend */}
      <div className="mt-2 flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded bg-orange-500" />
          Retention
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded border-b border-dashed border-orange-400" />
          Target (85%)
        </span>
      </div>

      {/* Tooltip */}
      {tooltip && <ChartTooltip data={tooltip} onClose={() => setTooltip(null)} />}
    </div>
  );
}

export default RetentionChart;

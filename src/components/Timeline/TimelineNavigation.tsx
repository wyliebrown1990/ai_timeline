import { ChevronFirst, ChevronLast, Clock } from 'lucide-react';
import { useMemo } from 'react';
import type { MilestoneResponse } from '../../types/milestone';
import { categoryColors } from '../../utils/timelineUtils';
import type { MilestoneCategory } from '../../types/milestone';

interface TimelineNavigationProps {
  /** Array of milestones for navigation */
  milestones: MilestoneResponse[];
  /** Callback to jump to a specific year */
  onJumpToYear: (year: number) => void;
  /** Callback to jump to earliest milestone */
  onJumpToEarliest: () => void;
  /** Callback to jump to latest milestone */
  onJumpToLatest: () => void;
  /** Currently visible year range */
  visibleYearRange?: [number, number];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Navigation controls for the timeline including year jump and quick navigation
 */
export function TimelineNavigation({
  milestones,
  onJumpToYear,
  onJumpToEarliest,
  onJumpToLatest,
  visibleYearRange,
  className = '',
}: TimelineNavigationProps) {
  // Calculate available years from milestones
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    milestones.forEach((m) => {
      yearSet.add(new Date(m.date).getFullYear());
    });
    return Array.from(yearSet).sort((a, b) => a - b);
  }, [milestones]);

  // Generate decade markers
  const decades = useMemo(() => {
    if (years.length === 0) return [];
    const firstYear = years[0];
    const lastYear = years[years.length - 1];
    if (firstYear === undefined || lastYear === undefined) return [];
    const minYear = Math.floor(firstYear / 10) * 10;
    const maxYear = Math.ceil(lastYear / 10) * 10;
    const result: number[] = [];
    for (let year = minYear; year <= maxYear; year += 10) {
      result.push(year);
    }
    return result;
  }, [years]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value, 10);
    if (!isNaN(year)) {
      onJumpToYear(year);
    }
  };

  return (
    <div
      data-testid="timeline-navigation"
      className={`flex items-center gap-2 ${className}`}
    >
      {/* Jump to earliest */}
      <button
        onClick={onJumpToEarliest}
        className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 transition-colors"
        aria-label="Jump to earliest milestone"
        title="Jump to earliest"
      >
        <ChevronFirst className="h-4 w-4" />
      </button>

      {/* Decade quick buttons */}
      <div className="hidden md:flex items-center gap-1">
        {decades.slice(-5).map((decade) => (
          <button
            key={decade}
            onClick={() => onJumpToYear(decade)}
            className={`
              px-2 py-1 text-xs font-medium rounded transition-colors
              ${
                visibleYearRange &&
                decade >= visibleYearRange[0] &&
                decade <= visibleYearRange[1]
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {decade}s
          </button>
        ))}
      </div>

      {/* Year dropdown */}
      <select
        onChange={handleYearChange}
        data-testid="year-jump-select"
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Jump to year"
        defaultValue=""
      >
        <option value="" disabled>
          Jump to year
        </option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      {/* Jump to today/latest */}
      <button
        onClick={onJumpToLatest}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        aria-label="Jump to latest milestone"
        title="Jump to latest"
      >
        <Clock className="h-4 w-4" />
        <span className="hidden sm:inline">Latest</span>
      </button>

      {/* Jump to latest button */}
      <button
        onClick={onJumpToLatest}
        className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 transition-colors"
        aria-label="Jump to latest milestone"
        title="Jump to latest"
      >
        <ChevronLast className="h-4 w-4" />
      </button>
    </div>
  );
}

interface TimelineMinimapProps {
  /** Array of milestones to display */
  milestones: MilestoneResponse[];
  /** Currently visible range as [startDate, endDate] */
  visibleRange: [Date, Date];
  /** Total range of the timeline */
  totalRange: [Date, Date];
  /** Callback when user clicks on minimap to navigate */
  onNavigate: (date: Date) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Minimap overview of the timeline showing milestone density
 * Click to navigate to specific time periods
 */
export function TimelineMinimap({
  milestones,
  visibleRange,
  totalRange,
  onNavigate,
  className = '',
}: TimelineMinimapProps) {
  const minimapWidth = 200;

  // Calculate position for a date
  const getPosition = (date: Date) => {
    const totalMs = totalRange[1].getTime() - totalRange[0].getTime();
    const dateMs = date.getTime() - totalRange[0].getTime();
    return (dateMs / totalMs) * minimapWidth;
  };

  // Calculate visible area indicator
  const visibleStart = getPosition(visibleRange[0]);
  const visibleEnd = getPosition(visibleRange[1]);
  const visibleWidth = Math.max(visibleEnd - visibleStart, 10);

  // Handle click on minimap
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / minimapWidth;
    const totalMs = totalRange[1].getTime() - totalRange[0].getTime();
    const targetMs = totalRange[0].getTime() + ratio * totalMs;
    onNavigate(new Date(targetMs));
  };

  return (
    <div
      data-testid="timeline-minimap"
      className={`relative h-8 bg-gray-100 rounded cursor-pointer ${className}`}
      style={{ width: minimapWidth }}
      onClick={handleClick}
      role="slider"
      aria-label="Timeline minimap"
      aria-valuemin={totalRange[0].getFullYear()}
      aria-valuemax={totalRange[1].getFullYear()}
    >
      {/* Milestone markers */}
      {milestones.map((milestone) => {
        const date = new Date(milestone.date);
        const x = getPosition(date);
        const color = categoryColors[milestone.category as MilestoneCategory] || '#6B7280';

        return (
          <div
            key={milestone.id}
            className="absolute top-1 w-1 h-6 rounded-full opacity-60"
            style={{
              left: `${x}px`,
              backgroundColor: color,
            }}
            title={`${milestone.title} (${date.getFullYear()})`}
          />
        );
      })}

      {/* Visible area indicator */}
      <div
        className="absolute top-0 h-full bg-blue-500/20 border border-blue-500 rounded"
        style={{
          left: `${visibleStart}px`,
          width: `${visibleWidth}px`,
        }}
      />

      {/* Year labels */}
      <div className="absolute -bottom-4 left-0 text-xs text-gray-500">
        {totalRange[0].getFullYear()}
      </div>
      <div className="absolute -bottom-4 right-0 text-xs text-gray-500">
        {totalRange[1].getFullYear()}
      </div>
    </div>
  );
}

export default TimelineNavigation;

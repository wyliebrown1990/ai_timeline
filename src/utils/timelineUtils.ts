import { MilestoneCategory, SignificanceLevel } from '../types/milestone';

/**
 * Color palette for milestone categories
 * Each color is chosen for visual distinction and accessibility
 */
export const categoryColors: Record<MilestoneCategory, string> = {
  [MilestoneCategory.RESEARCH]: '#3B82F6', // Blue
  [MilestoneCategory.MODEL_RELEASE]: '#10B981', // Green
  [MilestoneCategory.BREAKTHROUGH]: '#F59E0B', // Amber
  [MilestoneCategory.PRODUCT]: '#8B5CF6', // Purple
  [MilestoneCategory.REGULATION]: '#EF4444', // Red
  [MilestoneCategory.INDUSTRY]: '#6366F1', // Indigo
};

/**
 * Tailwind CSS class names for category colors (background)
 */
export const categoryBgClasses: Record<MilestoneCategory, string> = {
  [MilestoneCategory.RESEARCH]: 'bg-blue-500',
  [MilestoneCategory.MODEL_RELEASE]: 'bg-emerald-500',
  [MilestoneCategory.BREAKTHROUGH]: 'bg-amber-500',
  [MilestoneCategory.PRODUCT]: 'bg-purple-500',
  [MilestoneCategory.REGULATION]: 'bg-red-500',
  [MilestoneCategory.INDUSTRY]: 'bg-indigo-500',
};

/**
 * Tailwind CSS class names for category colors (text)
 */
export const categoryTextClasses: Record<MilestoneCategory, string> = {
  [MilestoneCategory.RESEARCH]: 'text-blue-500',
  [MilestoneCategory.MODEL_RELEASE]: 'text-emerald-500',
  [MilestoneCategory.BREAKTHROUGH]: 'text-amber-500',
  [MilestoneCategory.PRODUCT]: 'text-purple-500',
  [MilestoneCategory.REGULATION]: 'text-red-500',
  [MilestoneCategory.INDUSTRY]: 'text-indigo-500',
};

/**
 * Light background classes for category badges
 */
export const categoryBadgeClasses: Record<MilestoneCategory, string> = {
  [MilestoneCategory.RESEARCH]: 'bg-blue-100 text-blue-700 border-blue-200',
  [MilestoneCategory.MODEL_RELEASE]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [MilestoneCategory.BREAKTHROUGH]: 'bg-amber-100 text-amber-700 border-amber-200',
  [MilestoneCategory.PRODUCT]: 'bg-purple-100 text-purple-700 border-purple-200',
  [MilestoneCategory.REGULATION]: 'bg-red-100 text-red-700 border-red-200',
  [MilestoneCategory.INDUSTRY]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

/**
 * Human-readable labels for milestone categories
 */
export const categoryLabels: Record<MilestoneCategory, string> = {
  [MilestoneCategory.RESEARCH]: 'Research',
  [MilestoneCategory.MODEL_RELEASE]: 'Model Release',
  [MilestoneCategory.BREAKTHROUGH]: 'Breakthrough',
  [MilestoneCategory.PRODUCT]: 'Product',
  [MilestoneCategory.REGULATION]: 'Regulation',
  [MilestoneCategory.INDUSTRY]: 'Industry',
};

/**
 * Human-readable labels for significance levels
 */
export const significanceLabels: Record<SignificanceLevel, string> = {
  [SignificanceLevel.MINOR]: 'Minor',
  [SignificanceLevel.MODERATE]: 'Moderate',
  [SignificanceLevel.MAJOR]: 'Major',
  [SignificanceLevel.GROUNDBREAKING]: 'Groundbreaking',
};

/**
 * Visual scale multiplier for significance-based sizing
 */
export const significanceScale: Record<SignificanceLevel, number> = {
  [SignificanceLevel.MINOR]: 0.85,
  [SignificanceLevel.MODERATE]: 1,
  [SignificanceLevel.MAJOR]: 1.1,
  [SignificanceLevel.GROUNDBREAKING]: 1.25,
};

/**
 * Calculate horizontal position of a milestone on the timeline
 * @param date - The milestone date
 * @param timeRange - Tuple of [startDate, endDate] for the timeline
 * @param containerWidth - Width of the timeline container in pixels
 * @returns Position in pixels from the left edge
 */
export function calculateMilestonePosition(
  date: Date,
  timeRange: [Date, Date],
  containerWidth: number
): number {
  const [startDate, endDate] = timeRange;
  const totalMs = endDate.getTime() - startDate.getTime();
  const dateMs = date.getTime() - startDate.getTime();

  // Clamp the position between 0 and containerWidth
  const ratio = Math.max(0, Math.min(1, dateMs / totalMs));
  return ratio * containerWidth;
}

/**
 * Generate year markers for the timeline based on the date range
 * @param startYear - First year to display
 * @param endYear - Last year to display
 * @param interval - Years between markers (default: 5)
 * @returns Array of years to display as markers
 */
export function generateYearMarkers(
  startYear: number,
  endYear: number,
  interval: number = 5
): number[] {
  const markers: number[] = [];
  // Start from the nearest interval year
  const firstMarker = Math.ceil(startYear / interval) * interval;

  for (let year = firstMarker; year <= endYear; year += interval) {
    markers.push(year);
  }

  return markers;
}

/**
 * Calculate the time range for milestones with padding
 * @param dates - Array of milestone dates
 * @param paddingYears - Years of padding on each side (default: 2)
 * @returns Tuple of [startDate, endDate]
 */
export function calculateTimeRange(
  dates: Date[],
  paddingYears: number = 2
): [Date, Date] {
  if (dates.length === 0) {
    const now = new Date();
    return [
      new Date(now.getFullYear() - 10, 0, 1),
      new Date(now.getFullYear() + 1, 11, 31),
    ];
  }

  const timestamps = dates.map((d) => d.getTime());
  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));

  return [
    new Date(minDate.getFullYear() - paddingYears, 0, 1),
    new Date(maxDate.getFullYear() + paddingYears, 11, 31),
  ];
}

/**
 * Group milestones by year for staggering
 * @param milestones - Array of objects with date property
 * @returns Map of year to array of milestone indices
 */
export function groupMilestonesByYear<T extends { date: string | Date }>(
  milestones: T[]
): Map<number, number[]> {
  const groups = new Map<number, number[]>();

  milestones.forEach((milestone, index) => {
    const year = new Date(milestone.date).getFullYear();
    const existing = groups.get(year) || [];
    existing.push(index);
    groups.set(year, existing);
  });

  return groups;
}

/**
 * Calculate vertical offset for overlapping milestones
 * @param indexInYear - Index of milestone within its year group
 * @param baseOffset - Base vertical offset in pixels
 * @param staggerAmount - Additional offset per milestone
 * @returns Vertical offset in pixels
 */
export function calculateVerticalStagger(
  indexInYear: number,
  baseOffset: number = 60,
  staggerAmount: number = 100
): number {
  // Alternate above and below the timeline
  const isAbove = indexInYear % 2 === 0;
  const level = Math.floor(indexInYear / 2);
  const offset = baseOffset + level * staggerAmount;

  return isAbove ? -offset : offset;
}

/**
 * Format a date for display on the timeline
 * @param date - Date to format
 * @param format - 'year' | 'month' | 'full'
 * @returns Formatted date string
 */
export function formatTimelineDate(
  date: Date,
  format: 'year' | 'month' | 'full' = 'year'
): string {
  switch (format) {
    case 'year':
      return date.getFullYear().toString();
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'full':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    default:
      return date.getFullYear().toString();
  }
}

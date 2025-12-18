/**
 * CategoryBreakdown Component
 *
 * Displays a breakdown of flashcards by category:
 * - Pie chart showing milestones vs concepts distribution
 * - Bar chart showing milestone breakdown by era
 * - Identifies gaps in study coverage (eras with no cards)
 */

import { useMemo } from 'react';
import { PieChart, Layers, AlertCircle } from 'lucide-react';
import type { UserFlashcard } from '../../types/flashcard';

// =============================================================================
// Types
// =============================================================================

export interface CategoryBreakdownProps {
  /** Array of user flashcards */
  cards: UserFlashcard[];
  /** Optional additional CSS classes */
  className?: string;
}

/** Era definition for categorizing milestones */
interface Era {
  id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  color: string;
}

/** Breakdown data for a single category */
interface CategoryData {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

// =============================================================================
// Constants - Era Definitions
// =============================================================================

/**
 * AI timeline eras for categorizing milestones by year
 */
const ERAS: Era[] = [
  { id: 'foundations', name: 'Foundations', startYear: 1940, endYear: 1955, color: '#6B7280' },
  { id: 'birth_of_ai', name: 'Birth of AI', startYear: 1956, endYear: 1969, color: '#8B5CF6' },
  { id: 'symbolic_expert', name: 'Symbolic & Expert', startYear: 1970, endYear: 1987, color: '#3B82F6' },
  { id: 'winters_statistical', name: 'Statistical ML', startYear: 1988, endYear: 2011, color: '#10B981' },
  { id: 'deep_learning', name: 'Deep Learning', startYear: 2012, endYear: 2016, color: '#F59E0B' },
  { id: 'transformers', name: 'Transformers', startYear: 2017, endYear: 2019, color: '#EF4444' },
  { id: 'scaling_llms', name: 'Scaling LLMs', startYear: 2020, endYear: 2021, color: '#EC4899' },
  { id: 'alignment', name: 'Alignment Era', startYear: 2022, endYear: 2023, color: '#8B5CF6' },
  { id: 'multimodal', name: 'Multimodal', startYear: 2024, endYear: null, color: '#06B6D4' },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract year from milestone ID (e.g., E2017_TRANSFORMER -> 2017)
 */
function extractYearFromMilestoneId(sourceId: string): number | null {
  const match = sourceId.match(/^E(\d{4})_/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Get era for a given year
 */
function getEraForYear(year: number): Era | null {
  return ERAS.find((era) => {
    if (era.endYear === null) {
      return year >= era.startYear;
    }
    return year >= era.startYear && year <= era.endYear;
  }) ?? null;
}

/**
 * Calculate breakdown of cards by type (milestone vs concept)
 */
function calculateTypeBreakdown(cards: UserFlashcard[]): CategoryData[] {
  const milestones = cards.filter((c) => c.sourceType === 'milestone').length;
  const concepts = cards.filter((c) => c.sourceType === 'concept').length;
  const total = cards.length || 1;

  return [
    {
      name: 'Milestones',
      count: milestones,
      percentage: (milestones / total) * 100,
      color: '#F97316', // Orange
    },
    {
      name: 'Concepts',
      count: concepts,
      percentage: (concepts / total) * 100,
      color: '#3B82F6', // Blue
    },
  ];
}

/**
 * Calculate breakdown of milestone cards by era
 */
function calculateEraBreakdown(cards: UserFlashcard[]): CategoryData[] {
  const milestoneCards = cards.filter((c) => c.sourceType === 'milestone');

  // Count cards per era
  const eraCounts = new Map<string, number>();
  ERAS.forEach((era) => eraCounts.set(era.id, 0));

  for (const card of milestoneCards) {
    const year = extractYearFromMilestoneId(card.sourceId);
    if (year !== null) {
      const era = getEraForYear(year);
      if (era) {
        eraCounts.set(era.id, (eraCounts.get(era.id) ?? 0) + 1);
      }
    }
  }

  const total = milestoneCards.length || 1;

  return ERAS.map((era) => ({
    name: era.name,
    count: eraCounts.get(era.id) ?? 0,
    percentage: ((eraCounts.get(era.id) ?? 0) / total) * 100,
    color: era.color,
  }));
}

/**
 * Find eras with no cards (study gaps)
 */
function findStudyGaps(eraBreakdown: CategoryData[]): string[] {
  return eraBreakdown
    .filter((era) => era.count === 0)
    .map((era) => era.name);
}

// =============================================================================
// PieChart Component (Simple SVG)
// =============================================================================

interface SimplePieChartProps {
  data: CategoryData[];
  size?: number;
}

function SimplePieChart({ data, size = 120 }: SimplePieChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return null;

  const radius = size / 2;
  const cx = radius;
  const cy = radius;
  const innerRadius = radius * 0.6; // Donut chart

  // Calculate pie segments
  let cumulativeAngle = -90; // Start from top
  const segments = data.map((d) => {
    const angle = (d.count / total) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return { ...d, startAngle, angle };
  });

  // Convert angles to arc path
  const polarToCartesian = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const createArcPath = (startAngle: number, endAngle: number, outerR: number, innerR: number) => {
    const start = polarToCartesian(startAngle, outerR);
    const end = polarToCartesian(endAngle, outerR);
    const innerStart = polarToCartesian(endAngle, innerR);
    const innerEnd = polarToCartesian(startAngle, innerR);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${start.x} ${start.y} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${end.x} ${end.y} L ${innerStart.x} ${innerStart.y} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y} Z`;
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
      role="img"
      aria-label="Category distribution pie chart"
      data-testid="pie-chart"
    >
      {segments.map((segment) => {
        if (segment.count === 0) return null;
        const endAngle = segment.startAngle + segment.angle;
        // Handle full circle case
        const actualEndAngle = segment.angle >= 359.9 ? segment.startAngle + 359.9 : endAngle;
        return (
          <path
            key={segment.name}
            d={createArcPath(segment.startAngle, actualEndAngle, radius - 2, innerRadius)}
            fill={segment.color}
            className="transition-opacity hover:opacity-80"
          >
            <title>{`${segment.name}: ${segment.count} (${Math.round(segment.percentage)}%)`}</title>
          </path>
        );
      })}
      {/* Center text */}
      <text
        x={cx}
        y={cy - 5}
        textAnchor="middle"
        className="fill-gray-700 text-lg font-bold dark:fill-gray-200"
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        className="fill-gray-500 text-[10px] dark:fill-gray-400"
      >
        cards
      </text>
    </svg>
  );
}

// =============================================================================
// HorizontalBarChart Component
// =============================================================================

interface HorizontalBarChartProps {
  data: CategoryData[];
}

function HorizontalBarChart({ data }: HorizontalBarChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2" data-testid="era-bar-chart">
      {data.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <span className="w-24 truncate text-xs text-gray-600 dark:text-gray-400" title={item.name}>
            {item.name}
          </span>
          <div className="flex-1">
            <div className="h-4 rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  backgroundColor: item.color,
                  minWidth: item.count > 0 ? '4px' : '0',
                }}
                title={`${item.count} cards`}
              />
            </div>
          </div>
          <span className="w-8 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Legend Component
// =============================================================================

interface LegendProps {
  data: CategoryData[];
}

function Legend({ data }: LegendProps) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
      {data.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {item.name} ({item.count})
          </span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// CategoryBreakdown Component
// =============================================================================

/**
 * Displays category breakdown of flashcards with pie and bar charts.
 * Shows milestones vs concepts distribution and milestone breakdown by era.
 *
 * @example
 * ```tsx
 * import { CategoryBreakdown } from './CategoryBreakdown';
 *
 * <CategoryBreakdown cards={userCards} />
 * ```
 */
export function CategoryBreakdown({
  cards,
  className = '',
}: CategoryBreakdownProps) {
  // Calculate breakdowns
  const typeBreakdown = useMemo(() => calculateTypeBreakdown(cards), [cards]);
  const eraBreakdown = useMemo(() => calculateEraBreakdown(cards), [cards]);
  const studyGaps = useMemo(() => findStudyGaps(eraBreakdown), [eraBreakdown]);

  const hasMilestones = cards.some((c) => c.sourceType === 'milestone');
  const hasCards = cards.length > 0;

  return (
    <div className={className} data-testid="category-breakdown">
      {hasCards ? (
        <div className="space-y-6">
          {/* Type Distribution (Milestones vs Concepts) */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Card Types
              </span>
            </div>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
              <SimplePieChart data={typeBreakdown} size={100} />
              <Legend data={typeBreakdown} />
            </div>
          </div>

          {/* Era Breakdown (for milestones) */}
          {hasMilestones && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Milestones by Era
                </span>
              </div>
              <HorizontalBarChart data={eraBreakdown} />
            </div>
          )}

          {/* Study Gaps Warning */}
          {studyGaps.length > 0 && hasMilestones && (
            <div
              className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20"
              data-testid="study-gaps"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Coverage Gaps
                </p>
                <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
                  No cards from: {studyGaps.join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8 dark:border-gray-600 dark:bg-gray-900/50"
          data-testid="breakdown-empty"
        >
          <PieChart className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No cards to analyze
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Add flashcards to see breakdown
          </p>
        </div>
      )}
    </div>
  );
}

export default CategoryBreakdown;

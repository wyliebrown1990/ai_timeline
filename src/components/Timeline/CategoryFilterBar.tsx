import { useMemo } from 'react';
import { MilestoneCategory } from '../../types/milestone';
import { categoryLabels } from '../../utils/timelineUtils';
import { CategoryIcon } from './CategoryBadge';

interface CategoryFilterBarProps {
  /** Currently selected categories */
  activeCategories: MilestoneCategory[];
  /** Callback when category is toggled */
  onToggleCategory: (category: MilestoneCategory) => void;
  /** Callback to clear all filters */
  onClearAll?: () => void;
  /** Milestone counts per category */
  categoryCounts?: Record<MilestoneCategory, number>;
  /** Total milestone count (when no filters active) */
  totalCount?: number;
}

const CATEGORY_COLORS: Record<MilestoneCategory, { active: string; inactive: string }> = {
  [MilestoneCategory.MODEL_RELEASE]: {
    active: 'bg-purple-500 text-white border-purple-500',
    inactive: 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:border-purple-400',
  },
  [MilestoneCategory.RESEARCH]: {
    active: 'bg-blue-500 text-white border-blue-500',
    inactive: 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:border-blue-400',
  },
  [MilestoneCategory.BREAKTHROUGH]: {
    active: 'bg-amber-500 text-white border-amber-500',
    inactive: 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:border-amber-400',
  },
  [MilestoneCategory.PRODUCT]: {
    active: 'bg-green-500 text-white border-green-500',
    inactive: 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:border-green-400',
  },
  [MilestoneCategory.REGULATION]: {
    active: 'bg-red-500 text-white border-red-500',
    inactive: 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:border-red-400',
  },
  [MilestoneCategory.INDUSTRY]: {
    active: 'bg-teal-500 text-white border-teal-500',
    inactive: 'bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800 hover:border-teal-400',
  },
};

/**
 * CategoryFilterBar - Prominent category filter buttons with counts
 * Sprint TD-5: UX & Search Intent Matching
 */
export function CategoryFilterBar({
  activeCategories,
  onToggleCategory,
  onClearAll,
  categoryCounts,
  totalCount,
}: CategoryFilterBarProps) {
  const categories = Object.values(MilestoneCategory);
  const hasActiveFilters = activeCategories.length > 0;

  // Calculate filtered count
  const filteredCount = useMemo(() => {
    if (!hasActiveFilters || !categoryCounts) return totalCount;
    return activeCategories.reduce((sum, cat) => sum + (categoryCounts[cat] || 0), 0);
  }, [hasActiveFilters, activeCategories, categoryCounts, totalCount]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* All button */}
      <button
        type="button"
        onClick={onClearAll}
        className={`
          inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all
          ${!hasActiveFilters
            ? 'bg-orange-500 text-white border-orange-500'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-orange-400'
          }
        `}
        aria-pressed={!hasActiveFilters}
      >
        All
        {totalCount !== undefined && (
          <span className={`text-xs ${!hasActiveFilters ? 'text-orange-100' : 'text-gray-400'}`}>
            ({totalCount})
          </span>
        )}
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Category buttons */}
      {categories.map((category) => {
        const isActive = activeCategories.includes(category);
        const count = categoryCounts?.[category];
        const colors = CATEGORY_COLORS[category];

        return (
          <button
            key={category}
            type="button"
            onClick={() => onToggleCategory(category)}
            className={`
              inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all
              ${isActive ? colors.active : colors.inactive}
            `}
            aria-pressed={isActive}
            title={`Filter by ${categoryLabels[category]}`}
          >
            <CategoryIcon category={category} className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{categoryLabels[category]}</span>
            {count !== undefined && (
              <span className={`text-xs ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                ({count})
              </span>
            )}
          </button>
        );
      })}

      {/* Show filtered count when filters active */}
      {hasActiveFilters && filteredCount !== undefined && (
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredCount} milestone{filteredCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

export default CategoryFilterBar;

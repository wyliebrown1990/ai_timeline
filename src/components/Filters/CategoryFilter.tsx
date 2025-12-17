/**
 * CategoryFilter component for filtering milestones by category
 */

import { MilestoneCategory, type MilestoneCategory as MilestoneCategoryType } from '../../types/milestone';

interface CategoryFilterProps {
  selected: MilestoneCategoryType[];
  onChange: (categories: MilestoneCategoryType[]) => void;
  counts?: Record<string, number>;
}

/**
 * Category display configuration
 */
const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  [MilestoneCategory.MODEL_RELEASE]: {
    label: 'Model Release',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    borderColor: 'border-purple-300 dark:border-purple-700',
  },
  [MilestoneCategory.BREAKTHROUGH]: {
    label: 'Breakthrough',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    borderColor: 'border-amber-300 dark:border-amber-700',
  },
  [MilestoneCategory.RESEARCH]: {
    label: 'Research',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
  },
  [MilestoneCategory.PRODUCT]: {
    label: 'Product',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    borderColor: 'border-green-300 dark:border-green-700',
  },
  [MilestoneCategory.REGULATION]: {
    label: 'Regulation',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    borderColor: 'border-red-300 dark:border-red-700',
  },
  [MilestoneCategory.INDUSTRY]: {
    label: 'Industry',
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-50 dark:bg-teal-900/30',
    borderColor: 'border-teal-300 dark:border-teal-700',
  },
};

const ALL_CATEGORIES = Object.values(MilestoneCategory);

/** Default config for unknown categories */
const DEFAULT_CONFIG = {
  label: 'Unknown',
  color: 'text-gray-700 dark:text-gray-300',
  bgColor: 'bg-gray-50 dark:bg-gray-900/30',
  borderColor: 'border-gray-300 dark:border-gray-700',
};

export function CategoryFilter({ selected, onChange, counts }: CategoryFilterProps) {
  const handleToggle = (category: MilestoneCategoryType) => {
    if (selected.includes(category)) {
      onChange(selected.filter((c) => c !== category));
    } else {
      onChange([...selected, category]);
    }
  };

  const handleSelectAll = () => {
    onChange([...ALL_CATEGORIES]);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Categories</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            All
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {ALL_CATEGORIES.map((category) => {
          const config = CATEGORY_CONFIG[category] ?? DEFAULT_CONFIG;
          const isSelected = selected.includes(category);
          const count = counts?.[category];

          return (
            <label
              key={category}
              className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors ${
                isSelected
                  ? `${config.bgColor} ${config.borderColor}`
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(category)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                data-testid={`category-${category}`}
              />
              <span className={`flex-1 text-sm ${isSelected ? config.color : 'text-gray-700 dark:text-gray-300'}`}>
                {config.label}
              </span>
              {count !== undefined && (
                <span className="text-xs text-gray-400 dark:text-gray-500">({count})</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

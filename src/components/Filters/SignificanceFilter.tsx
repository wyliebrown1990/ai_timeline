/**
 * SignificanceFilter component for filtering milestones by significance level
 */

import { SignificanceLevel } from '../../types/milestone';

interface SignificanceFilterProps {
  selected: SignificanceLevel[];
  onChange: (levels: SignificanceLevel[]) => void;
  counts?: Record<number, number>;
}

/**
 * Significance level display configuration
 */
const SIGNIFICANCE_CONFIG: Record<
  number,
  { label: string; description: string; color: string; bgColor: string }
> = {
  [SignificanceLevel.MINOR]: {
    label: 'Minor',
    description: 'Incremental progress',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
  },
  [SignificanceLevel.MODERATE]: {
    label: 'Moderate',
    description: 'Notable advancement',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  [SignificanceLevel.MAJOR]: {
    label: 'Major',
    description: 'Significant milestone',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  [SignificanceLevel.GROUNDBREAKING]: {
    label: 'Groundbreaking',
    description: 'Paradigm-shifting event',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

const ALL_LEVELS: SignificanceLevel[] = [
  SignificanceLevel.MINOR,
  SignificanceLevel.MODERATE,
  SignificanceLevel.MAJOR,
  SignificanceLevel.GROUNDBREAKING,
];

/** Default config for unknown levels */
const DEFAULT_LEVEL_CONFIG = {
  label: 'Unknown',
  description: 'Unknown significance',
  color: 'text-gray-600 dark:text-gray-400',
  bgColor: 'bg-gray-100 dark:bg-gray-700',
};

/**
 * Visual representation of significance level
 */
function SignificanceIndicator({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full ${
            i <= level
              ? level === 4
                ? 'bg-red-500'
                : level === 3
                  ? 'bg-amber-500'
                  : level === 2
                    ? 'bg-blue-500'
                    : 'bg-gray-400'
              : 'bg-gray-200 dark:bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

export function SignificanceFilter({ selected, onChange, counts }: SignificanceFilterProps) {
  const handleToggle = (level: SignificanceLevel) => {
    if (selected.includes(level)) {
      onChange(selected.filter((l) => l !== level));
    } else {
      onChange([...selected, level]);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Significance</h3>
      <div className="space-y-2">
        {ALL_LEVELS.map((level) => {
          const config = SIGNIFICANCE_CONFIG[level] ?? DEFAULT_LEVEL_CONFIG;
          const isSelected = selected.includes(level);
          const count = counts?.[level];

          return (
            <label
              key={level}
              className={`flex cursor-pointer items-center gap-3 rounded-md border p-2 transition-colors ${
                isSelected
                  ? `${config.bgColor} border-current ${config.color}`
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(level)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                data-testid={`significance-${level}`}
              />
              <SignificanceIndicator level={level} />
              <div className="flex-1">
                <span
                  className={`text-sm font-medium ${
                    isSelected ? config.color : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {config.label}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">{config.description}</p>
              </div>
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

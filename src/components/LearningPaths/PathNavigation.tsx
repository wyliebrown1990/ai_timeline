import { ChevronLeft, ChevronRight, X, CheckCircle } from 'lucide-react';
import type { LearningPath } from '../../types/learningPath';

interface PathNavigationProps {
  /** The current learning path */
  path: LearningPath;
  /** Current milestone index within the path (0-based) */
  currentIndex: number;
  /** Completion percentage (0-100) */
  completionPercentage: number;
  /** Callback to navigate to previous milestone */
  onPrevious?: () => void;
  /** Callback to navigate to next milestone */
  onNext?: () => void;
  /** Callback to exit the path */
  onExitPath?: () => void;
  /** Whether this is the last milestone */
  isLastMilestone?: boolean;
  /** Whether the current milestone has been viewed */
  currentMilestoneViewed?: boolean;
}

/**
 * Path Navigation Component
 *
 * Displays navigation controls when viewing milestones as part of a learning path.
 * Shows:
 * - Path name and current position (e.g., "Step 3 of 7")
 * - Progress bar
 * - Previous/Next navigation buttons
 * - Exit path button
 */
export function PathNavigation({
  path,
  currentIndex,
  completionPercentage,
  onPrevious,
  onNext,
  onExitPath,
  isLastMilestone = false,
  currentMilestoneViewed = false,
}: PathNavigationProps) {
  const totalMilestones = path.milestoneIds.length;
  const currentStep = currentIndex + 1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < totalMilestones - 1;

  return (
    <div
      className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800"
      data-testid="path-navigation"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-hidden="true">
            {path.icon || '📚'}
          </span>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
              {path.title}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Step {currentStep} of {totalMilestones}
            </p>
          </div>
        </div>

        {/* Exit path button */}
        {onExitPath && (
          <button
            onClick={onExitPath}
            className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="Exit learning path"
            title="Exit learning path"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2 bg-white dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {completionPercentage}% complete
        </p>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium
            transition-colors
            ${
              hasPrevious
                ? 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }
          `}
          aria-label="Previous milestone in path"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Center indicator */}
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(totalMilestones, 7) }).map((_, i) => {
            // For paths with more than 7 milestones, show a subset around current
            let displayIndex = i;
            if (totalMilestones > 7) {
              const start = Math.max(0, Math.min(currentIndex - 3, totalMilestones - 7));
              displayIndex = start + i;
            }

            const isActive = displayIndex === currentIndex;
            const isViewed = displayIndex < currentIndex || (displayIndex === currentIndex && currentMilestoneViewed);

            return (
              <div
                key={displayIndex}
                className={`
                  w-2 h-2 rounded-full transition-all duration-200
                  ${isActive ? 'w-4 bg-blue-500' : isViewed ? 'bg-blue-300 dark:bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
                `}
                aria-hidden="true"
              />
            );
          })}
        </div>

        {isLastMilestone ? (
          <button
            onClick={onNext}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
            aria-label="Complete learning path"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Finish</span>
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={!hasNext}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors
              ${
                hasNext
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }
            `}
            aria-label="Next milestone in path"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default PathNavigation;

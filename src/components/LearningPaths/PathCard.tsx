import { Clock, BookOpen, CheckCircle2, ChevronRight } from 'lucide-react';
import type { LearningPath } from '../../types/learningPath';

/**
 * Difficulty badge colors
 */
const DIFFICULTY_COLORS: Record<LearningPath['difficulty'], string> = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

/**
 * Difficulty labels
 */
const DIFFICULTY_LABELS: Record<LearningPath['difficulty'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

interface PathCardProps {
  /** The learning path to display */
  path: LearningPath;
  /** Current completion percentage (0-100) */
  completionPercentage?: number;
  /** Whether the path has been completed */
  isCompleted?: boolean;
  /** Callback when the card is clicked */
  onClick?: () => void;
  /** Optional additional className */
  className?: string;
}

/**
 * Learning Path Card Component
 *
 * Displays a learning path as a clickable card with:
 * - Title and description
 * - Milestone count and estimated time
 * - Difficulty badge
 * - Progress bar (when in progress)
 * - Completion checkmark (when completed)
 */
export function PathCard({
  path,
  completionPercentage = 0,
  isCompleted = false,
  onClick,
  className = '',
}: PathCardProps) {
  const hasStarted = completionPercentage > 0;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-5 rounded-xl border
        ${isCompleted
          ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }
        hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700
        transition-all duration-200 ease-out
        group
        ${className}
      `}
      data-testid={`path-card-${path.id}`}
    >
      {/* Header with icon and title */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          {/* Path Icon */}
          <span className="text-2xl" role="img" aria-hidden="true">
            {path.icon || '📚'}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {path.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[path.difficulty]}`}>
                {DIFFICULTY_LABELS[path.difficulty]}
              </span>
            </div>
          </div>
        </div>

        {/* Completion indicator or chevron */}
        {isCompleted ? (
          <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors flex-shrink-0" />
        )}
      </div>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
        {path.description}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          <span>{path.milestoneIds.length} milestones</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>~{path.estimatedMinutes} min</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isCompleted
                ? 'bg-green-500'
                : hasStarted
                ? 'bg-blue-500'
                : 'bg-gray-200 dark:bg-gray-600'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isCompleted
              ? 'Completed!'
              : hasStarted
              ? `${completionPercentage}% complete`
              : 'Not started'}
          </span>
          {hasStarted && !isCompleted && (
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Continue →
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default PathCard;

import { ArrowRight, Check } from 'lucide-react';

/**
 * Minimal term interface for PrerequisiteChip
 * Compatible with both GlossaryEntry and GlossaryTerm from API
 */
interface TermLike {
  id: string;
  term: string;
  shortDefinition: string;
}

interface PrerequisiteChipProps {
  term: TermLike;
  onClick: (id: string) => void;
  isCompleted?: boolean;
  showDefinition?: boolean;
}

/**
 * Chip component for displaying a prerequisite term
 * Shows completion status and allows navigation to the term
 */
export function PrerequisiteChip({
  term,
  onClick,
  isCompleted = false,
  showDefinition = false,
}: PrerequisiteChipProps) {
  return (
    <button
      onClick={() => onClick(term.id)}
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${
        isCompleted
          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
      }`}
      title={term.shortDefinition}
    >
      {/* Completion indicator */}
      {isCompleted && (
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </span>
      )}

      {/* Term info */}
      <div className="flex-1 min-w-0">
        <span
          className={`font-medium text-sm ${
            isCompleted
              ? 'text-green-700 dark:text-green-300'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {term.term}
        </span>
        {showDefinition && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
            {term.shortDefinition}
          </p>
        )}
      </div>

      {/* Arrow indicator */}
      <ArrowRight
        className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
          isCompleted
            ? 'text-green-500 dark:text-green-400'
            : 'text-gray-400 group-hover:text-blue-500'
        }`}
      />
    </button>
  );
}

export default PrerequisiteChip;

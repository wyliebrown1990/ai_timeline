/**
 * SearchResults component for displaying search results with highlighting
 */

import type { SearchResult } from '../../types/filters';
import { MilestoneCategory } from '../../types/milestone';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading: boolean;
  total: number;
  onResultClick: (id: string) => void;
  onClose: () => void;
}

/**
 * Category colors for badges
 */
const CATEGORY_COLORS: Record<string, string> = {
  [MilestoneCategory.MODEL_RELEASE]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  [MilestoneCategory.BREAKTHROUGH]: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  [MilestoneCategory.RESEARCH]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [MilestoneCategory.PRODUCT]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [MilestoneCategory.REGULATION]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [MilestoneCategory.INDUSTRY]: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

/**
 * Highlight matched text in a string
 */
function highlightText(text: string, query: string): JSX.Element {
  if (!query.trim()) {
    return <span>{text}</span>;
  }

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-yellow-200 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100 rounded px-0.5"
            data-testid="search-highlight"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function SearchResults({
  results,
  query,
  isLoading,
  total,
  onResultClick,
  onClose,
}: SearchResultsProps) {
  // Don't show if no query
  if (!query.trim()) {
    return null;
  }

  return (
    <div
      className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
      data-testid="search-results"
      role="listbox"
    >
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Searching...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="p-4 text-center" data-testid="no-results">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No results found for &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Try adjusting your search terms
          </p>
        </div>
      ) : (
        <>
          <div className="sticky top-0 border-b border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {total} result{total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
              </span>
              <button
                onClick={onClose}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Close
              </button>
            </div>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => onResultClick(result.id)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                  data-testid="search-result-item"
                  role="option"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {highlightText(result.title, query)}
                      </h4>
                      {result.snippet && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                          {highlightText(result.snippet, query)}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(result.date)}
                        </span>
                        {result.organization && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {result.organization}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        CATEGORY_COLORS[result.category] ||
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {result.category.replace('_', ' ')}
                    </span>
                  </div>
                  {result.matchedFields.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {result.matchedFields.map((field) => (
                        <span
                          key={field}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        >
                          matched in {field}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

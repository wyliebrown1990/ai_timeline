/**
 * ErrorState - Displays error messages with retry option
 */

import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading the content. Please try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-900/20 ${className}`}
      role="alert"
      data-testid="error-state"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-red-800 dark:text-red-200">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-red-600 dark:text-red-300">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-offset-gray-900"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * EmptyState - Displays when no content is available
 */
interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'No results found',
  message = 'Try adjusting your search or filters to find what you\'re looking for.',
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800 ${className}`}
      data-testid="empty-state"
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          {icon}
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-300">
        {message}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

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
 * EmptyState — the project's canonical "nothing here yet" surface.
 * Sprint Blog-2 established this as a shared primitive; reuse rather than
 * hand-rolling parallel empty patterns per feature.
 */
import { Link } from 'react-router-dom';

interface EmptyStateCta {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  cta?: EmptyStateCta;
  className?: string;
}

export function EmptyState({ icon, title, description, cta, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl bg-warm-50 dark:bg-gray-800/40 p-8 md:p-12 text-center ${className}`}
      data-testid="empty-state"
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">{description}</p>
      )}
      {cta &&
        (cta.to ? (
          <Link
            to={cta.to}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            {cta.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={cta.onClick}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            {cta.label}
          </button>
        ))}
    </div>
  );
}

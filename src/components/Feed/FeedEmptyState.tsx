/**
 * FeedEmptyState Component (Sprint Feed-2)
 *
 * Displays empty/error states for the feed with appropriate actions.
 */

import { memo } from 'react';
import { RefreshCw, ArrowLeft, AlertCircle, Inbox } from 'lucide-react';

interface FeedEmptyStateProps {
  type: 'empty' | 'error';
  message?: string;
  onRefresh: () => void;
  onBack: () => void;
}

function FeedEmptyStateComponent({
  type,
  message,
  onRefresh,
  onBack,
}: FeedEmptyStateProps) {
  const isError = type === 'error';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
      {/* Icon */}
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
          isError ? 'bg-red-500/10' : 'bg-gray-800'
        }`}
      >
        {isError ? (
          <AlertCircle className="w-8 h-8 text-red-400" />
        ) : (
          <Inbox className="w-8 h-8 text-gray-400" />
        )}
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-white mb-2">
        {isError ? 'Something went wrong' : "You're all caught up!"}
      </h2>

      {/* Message */}
      <p className="text-gray-400 mb-8">
        {message ||
          (isError
            ? 'We had trouble loading your feed. Please try again.'
            : 'Check back later for more AI news and updates.')}
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={onRefresh}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {isError ? 'Try Again' : 'Refresh Feed'}
        </button>
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to News
        </button>
      </div>
    </div>
  );
}

export const FeedEmptyState = memo(FeedEmptyStateComponent);

export default FeedEmptyState;

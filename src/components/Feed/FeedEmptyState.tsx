/**
 * FeedEmptyState Component (Sprint Feed-2, Updated Feed-6)
 *
 * Displays empty/error states for the feed with appropriate actions.
 * Enhanced with more personality and helpful suggestions.
 */

import { memo, useMemo } from 'react';
import { RefreshCw, ArrowLeft, AlertCircle, Sparkles, BookOpen, Coffee } from 'lucide-react';

interface FeedEmptyStateProps {
  type: 'empty' | 'error';
  message?: string;
  onRefresh: () => void;
  onBack: () => void;
}

// Fun messages for when the feed is empty
const emptyMessages = [
  {
    title: "You're all caught up!",
    subtitle: "Nice work staying on top of AI news.",
    icon: Sparkles,
  },
  {
    title: "Nothing new here",
    subtitle: "Take a break - your brain will thank you.",
    icon: Coffee,
  },
  {
    title: "Feed complete!",
    subtitle: "Why not review your saved stories?",
    icon: BookOpen,
  },
];

function FeedEmptyStateComponent({
  type,
  message,
  onRefresh,
  onBack,
}: FeedEmptyStateProps) {
  const isError = type === 'error';

  // Pick a random empty message (stable per render)
  const emptyContent = useMemo(() => {
    const index = Math.floor(Math.random() * emptyMessages.length);
    return emptyMessages[index];
  }, []);

  const EmptyIcon = emptyContent?.icon ?? Sparkles;

  return (
    <div
      className="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto"
      role="status"
      aria-label={isError ? 'Error loading feed' : 'Feed is empty'}
    >
      {/* Icon */}
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
          isError ? 'bg-red-500/10' : 'bg-blue-500/10'
        }`}
      >
        {isError ? (
          <AlertCircle className="w-10 h-10 text-red-400" />
        ) : (
          <EmptyIcon className="w-10 h-10 text-blue-400" />
        )}
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-white mb-2">
        {isError ? 'Oops, something went wrong' : emptyContent?.title}
      </h2>

      {/* Message */}
      <p className="text-gray-400 mb-8">
        {message ||
          (isError
            ? "We couldn't load your feed. This might be a network issue."
            : emptyContent?.subtitle)}
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={onRefresh}
          className={`flex items-center justify-center gap-2 w-full py-3 px-4 font-medium rounded-xl transition-colors ${
            isError
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          {isError ? 'Try Again' : 'Check for New Stories'}
        </button>
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to News
        </button>
      </div>

      {/* Helpful tip */}
      {!isError && (
        <p className="text-xs text-gray-600 mt-6">
          💡 Stories refresh throughout the day
        </p>
      )}
      {isError && (
        <p className="text-xs text-gray-600 mt-6">
          If this keeps happening, check your internet connection
        </p>
      )}
    </div>
  );
}

export const FeedEmptyState = memo(FeedEmptyStateComponent);

export default FeedEmptyState;

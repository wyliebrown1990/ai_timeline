/**
 * FeedLoadingCard Component (Sprint Feed-2)
 *
 * Loading skeleton for feed cards with animated placeholders.
 */

import { memo } from 'react';

function FeedLoadingCardComponent() {
  return (
    <div
      className="absolute inset-0 flex flex-col bg-gray-950 text-white overflow-hidden animate-pulse"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Header Skeleton */}
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-gray-800 rounded" />
          <div className="h-4 w-16 bg-gray-800 rounded" />
        </div>
      </header>

      {/* Media Skeleton */}
      <div className="w-full aspect-video bg-gray-800 flex-shrink-0" />

      {/* Content Skeleton */}
      <div className="flex-1 flex flex-col px-4 py-4">
        {/* Headline */}
        <div className="space-y-2 mb-4">
          <div className="h-7 w-full bg-gray-800 rounded" />
          <div className="h-7 w-4/5 bg-gray-800 rounded" />
        </div>

        {/* Summary */}
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full bg-gray-800 rounded" />
          <div className="h-4 w-full bg-gray-800 rounded" />
          <div className="h-4 w-3/4 bg-gray-800 rounded" />
        </div>

        {/* Why It Matters Skeleton */}
        <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
          <div className="h-4 w-24 bg-gray-700 rounded mb-2" />
          <div className="h-3 w-full bg-gray-700 rounded" />
          <div className="h-3 w-2/3 bg-gray-700 rounded mt-1" />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Link Skeleton */}
        <div className="h-4 w-36 bg-gray-800 rounded" />
      </div>

      {/* Action Bar Skeleton */}
      <div className="flex items-center justify-around px-4 py-4 border-t border-gray-800">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-gray-800 rounded-full" />
            <div className="h-3 w-6 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export const FeedLoadingCard = memo(FeedLoadingCardComponent);

export default FeedLoadingCard;

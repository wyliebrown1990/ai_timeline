/**
 * FeedCardHeader Component (Sprint Feed-3)
 *
 * Header section of feed cards showing source, time, and share button.
 */

import { memo } from 'react';
import { Clock, Share2, Sparkles, BookOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FeedCardHeaderProps {
  sourcePublisher: string | null;
  publishedDate: string;
  sourceUrl: string | null;
  featured: boolean;
  onShareClick: () => void;
  personalizationType?: 'for_you' | 'learning' | null;
}

/**
 * Format relative time for display
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
}

function FeedCardHeaderComponent({
  sourcePublisher,
  publishedDate,
  featured,
  onShareClick,
  personalizationType,
}: FeedCardHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 z-10">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="font-medium text-gray-300">
          {sourcePublisher || 'AI News'}
        </span>
        <span className="text-gray-600">·</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(publishedDate)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Personalization badges */}
        {personalizationType === 'for_you' && (
          <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            For You
          </span>
        )}
        {personalizationType === 'learning' && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <BookOpen className="w-3 h-3" />
            Learning
          </span>
        )}
        {featured && !personalizationType && (
          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            Featured
          </span>
        )}
        <button
          onClick={onShareClick}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Share this article"
        >
          <Share2 className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </header>
  );
}

export const FeedCardHeader = memo(FeedCardHeaderComponent);

export default FeedCardHeader;

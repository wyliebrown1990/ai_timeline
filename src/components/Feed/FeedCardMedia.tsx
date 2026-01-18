/**
 * FeedCardMedia Component (Sprint Feed-3)
 *
 * Media section of feed cards showing thumbnails, video play buttons, or gradients.
 */

import { memo, useState } from 'react';
import { Play } from 'lucide-react';

interface FeedCardMediaProps {
  thumbnailUrl: string | null;
  videoId: string | null;
  mediaType: 'text' | 'video' | 'audio';
  headline: string;
  isActive: boolean;
  onVideoClick?: () => void;
}

function FeedCardMediaComponent({
  thumbnailUrl,
  videoId,
  mediaType,
  headline,
  isActive,
  onVideoClick,
}: FeedCardMediaProps) {
  const [imageError, setImageError] = useState(false);

  // Determine if we should show video overlay
  const isVideo = mediaType === 'video' && videoId;

  // If we have a thumbnail and no error, show the image (reduced height)
  if (thumbnailUrl && !imageError) {
    return (
      <div className="relative w-full max-h-[25vh] bg-gray-900 flex-shrink-0 overflow-hidden">
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full h-full object-cover"
          loading={isActive ? 'eager' : 'lazy'}
          onError={() => setImageError(true)}
        />
        {isVideo && (
          <button
            onClick={onVideoClick}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
            aria-label={`Play video: ${headline}`}
          >
            <div className="w-14 h-14 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
              <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
            </div>
          </button>
        )}
        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-950 to-transparent" />
      </div>
    );
  }

  // No thumbnail: show minimal header bar instead of large placeholder
  if (isVideo) {
    return (
      <div className="relative w-full h-16 bg-gradient-to-r from-gray-800 to-gray-900 flex-shrink-0 flex items-center justify-center">
        <button
          onClick={onVideoClick}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label={`Play video: ${headline}`}
        >
          <Play className="w-5 h-5 text-white" fill="currentColor" />
          <span className="text-sm text-white font-medium">Watch Video</span>
        </button>
      </div>
    );
  }

  // No media at all - return minimal spacer
  return <div className="h-4 flex-shrink-0" />;
}

export const FeedCardMedia = memo(FeedCardMediaComponent);

export default FeedCardMedia;

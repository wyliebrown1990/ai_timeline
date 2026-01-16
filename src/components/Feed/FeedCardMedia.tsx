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

  // If we have a thumbnail and no error, show the image
  if (thumbnailUrl && !imageError) {
    return (
      <div className="relative w-full aspect-video bg-gray-900 flex-shrink-0 overflow-hidden">
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
            <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
              <Play className="w-7 h-7 text-gray-900 ml-1" fill="currentColor" />
            </div>
          </button>
        )}
        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-950 to-transparent" />
      </div>
    );
  }

  // Fallback: gradient background
  return (
    <div className="relative w-full aspect-video bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 flex-shrink-0">
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      {isVideo && (
        <button
          onClick={onVideoClick}
          className="absolute inset-0 flex items-center justify-center hover:bg-white/5 transition-colors group"
          aria-label={`Play video: ${headline}`}
        >
          <div className="w-16 h-16 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all">
            <Play className="w-7 h-7 text-white ml-1" fill="currentColor" />
          </div>
        </button>
      )}
      {/* Gradient overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-950 to-transparent" />
    </div>
  );
}

export const FeedCardMedia = memo(FeedCardMediaComponent);

export default FeedCardMedia;

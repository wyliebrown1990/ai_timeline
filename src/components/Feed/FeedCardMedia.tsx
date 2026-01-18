/**
 * FeedCardMedia Component (Sprint Feed-3)
 *
 * Media section of feed cards showing thumbnails, embedded YouTube videos, or gradients.
 */

import { memo, useState } from 'react';
import { Play, X } from 'lucide-react';

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
}: FeedCardMediaProps) {
  const [imageError, setImageError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Determine if we should show video
  const isVideo = mediaType === 'video' && videoId;

  // Privacy-enhanced YouTube embed URL
  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
    : '';

  // If video is playing, show embedded player
  if (isPlaying && isVideo) {
    return (
      <div className="relative w-full aspect-video bg-black flex-shrink-0">
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={embedUrl}
          title={headline}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {/* Close button to stop video */}
        <button
          onClick={() => setIsPlaying(false)}
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors"
          aria-label="Close video"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // If we have a thumbnail and no error, show the image with play button
  if (thumbnailUrl && !imageError) {
    return (
      <div className="relative w-full aspect-video max-h-[30vh] bg-gray-900 flex-shrink-0 overflow-hidden">
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full h-full object-cover"
          loading={isActive ? 'eager' : 'lazy'}
          onError={() => setImageError(true)}
        />
        {isVideo && (
          <button
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
            aria-label={`Play video: ${headline}`}
          >
            <div className="w-16 h-16 rounded-full bg-red-600 group-hover:bg-red-500 flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
              <Play className="w-7 h-7 text-white ml-1" fill="currentColor" />
            </div>
          </button>
        )}
        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-950 to-transparent" />
      </div>
    );
  }

  // No thumbnail but video exists: show play button
  if (isVideo) {
    return (
      <div className="relative w-full h-20 bg-gradient-to-r from-gray-800 to-gray-900 flex-shrink-0 flex items-center justify-center">
        <button
          onClick={() => setIsPlaying(true)}
          className="flex items-center gap-3 px-5 py-3 rounded-full bg-red-600 hover:bg-red-500 transition-colors"
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

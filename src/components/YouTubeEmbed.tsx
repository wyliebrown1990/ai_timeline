/**
 * YouTube Video Embed Component
 *
 * Displays an embedded YouTube player for video content.
 * Uses the privacy-enhanced mode (youtube-nocookie.com) by default.
 */

import { Play } from 'lucide-react';
import { useState } from 'react';

interface YouTubeEmbedProps {
  /** YouTube video ID */
  videoId: string;
  /** Video title for accessibility */
  title?: string;
  /** Optional thumbnail URL (uses YouTube default if not provided) */
  thumbnailUrl?: string;
  /** Aspect ratio: 16:9 (default) or 4:3 */
  aspectRatio?: '16:9' | '4:3';
  /** Whether to autoplay when loaded (default: false) */
  autoplay?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * YouTubeEmbed - Lazy-loaded YouTube video player with thumbnail preview
 *
 * Features:
 * - Privacy-enhanced embedding (youtube-nocookie.com)
 * - Lazy loading - only loads iframe when user clicks to play
 * - Responsive sizing with configurable aspect ratio
 * - Accessible with proper title and keyboard navigation
 */
export function YouTubeEmbed({
  videoId,
  title = 'YouTube video',
  thumbnailUrl,
  aspectRatio = '16:9',
  autoplay = false,
  className = '',
}: YouTubeEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay);

  // Calculate padding for aspect ratio
  const paddingBottom = aspectRatio === '16:9' ? '56.25%' : '75%';

  // Use provided thumbnail or YouTube's default
  const thumbnail =
    thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  // Privacy-enhanced embed URL
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;

  if (isPlaying) {
    return (
      <div
        className={`relative w-full bg-black rounded-lg overflow-hidden ${className}`}
        style={{ paddingBottom }}
      >
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsPlaying(true)}
      className={`relative w-full bg-black rounded-lg overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      style={{ paddingBottom }}
      aria-label={`Play video: ${title}`}
    >
      {/* Thumbnail */}
      <img
        src={thumbnail}
        alt={`Thumbnail for ${title}`}
        className="absolute top-0 left-0 w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          // Fallback to hqdefault if maxresdefault fails
          const target = e.target as HTMLImageElement;
          if (target.src.includes('maxresdefault')) {
            target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          }
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 group-focus:scale-110">
          <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="currentColor" />
        </div>
      </div>

      {/* YouTube watermark */}
      <div className="absolute bottom-3 right-3 bg-black/70 px-2 py-1 rounded text-xs text-white/90 font-medium">
        YouTube
      </div>
    </button>
  );
}

export default YouTubeEmbed;

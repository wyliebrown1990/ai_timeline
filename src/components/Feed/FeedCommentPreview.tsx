/**
 * FeedCommentPreview Component (Sprint Feed-4)
 *
 * Shows a floating "hot take" preview of top comments on feed cards.
 * Appears above the action bar when there are comments.
 */

import { useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

interface Comment {
  id: string;
  content: string;
  author: {
    displayName: string;
    avatarUrl?: string;
  } | null;
  score: number;
}

interface FeedCommentPreviewProps {
  eventId: string;
  commentCount: number;
  onViewAll: () => void;
  isActive: boolean;
}

function FeedCommentPreviewComponent({
  eventId,
  commentCount,
  onViewAll,
  isActive,
}: FeedCommentPreviewProps) {
  const [topComments, setTopComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Fetch top comments when card becomes active
  useEffect(() => {
    if (!isActive || commentCount === 0 || isDismissed) {
      return;
    }

    const fetchTopComments = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${API_URL}/comments/news_event/${eventId}?sort=best&limit=2`
        );
        if (response.ok) {
          const data = await response.json();
          setTopComments(data.comments || []);
        }
      } catch (error) {
        console.error('Failed to fetch top comments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Delay fetch to let card settle
    const timer = setTimeout(fetchTopComments, 300);
    return () => clearTimeout(timer);
  }, [eventId, commentCount, isActive, isDismissed]);

  // Reset dismissed state when eventId changes
  useEffect(() => {
    setIsDismissed(false);
  }, [eventId]);

  // Don't show if no comments or loading
  if (commentCount === 0 || isLoading || topComments.length === 0 || isDismissed) {
    return null;
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ delay: 0.3, duration: 0.2 }}
        className="absolute bottom-20 left-4 right-4 z-20"
      >
        <button
          onClick={onViewAll}
          className="w-full bg-gray-900/90 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 text-left hover:bg-gray-800/90 transition-colors"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-amber-400">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Hot Takes
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <span>View all {commentCount}</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Comments Preview */}
          <div className="space-y-2">
            {topComments.slice(0, 2).map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                {/* Avatar */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                  {comment.author?.avatarUrl ? (
                    <img
                      src={comment.author.avatarUrl}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitial(comment.author?.displayName || 'A')
                  )}
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 leading-snug">
                    {truncateText(comment.content, 80)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {comment.author?.displayName || 'Anonymous'}
                    {comment.score > 0 && (
                      <span className="ml-2 text-emerald-500">
                        +{comment.score}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </button>

        {/* Dismiss hint - swipe up */}
        <p className="text-center text-xs text-gray-600 mt-1">
          Tap to view all comments
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

export const FeedCommentPreview = memo(FeedCommentPreviewComponent);

export default FeedCommentPreview;

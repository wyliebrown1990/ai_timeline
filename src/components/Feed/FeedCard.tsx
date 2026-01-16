/**
 * FeedCard Component (Sprint Feed-3)
 *
 * Full-screen card for the swipeable feed with complete UI.
 * Composed of: Header, Media, Headline, Teaser, Context, ActionBar
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import toast from 'react-hot-toast';
import type { FeedItem } from '../../types/feed';
import { FeedCardHeader } from './FeedCardHeader';
import { FeedCardMedia } from './FeedCardMedia';
import { FeedActionBar } from './FeedActionBar';
import { FeedCommentSheet } from './FeedCommentSheet';
import { FeedAIChatSheet } from './FeedAIChatSheet';
import { FeedCommentPreview } from './FeedCommentPreview';
import { FeedConceptChips } from './FeedConceptChips';
import { FeedShareSheet } from './FeedShareSheet';
import { cn } from '../../lib/utils';
import { hapticService } from '../../services/hapticService';
import { announceService } from '../../services/announceService';

interface FeedCardProps {
  item: FeedItem;
  isActive: boolean;
  voteState: {
    userVote: 'up' | 'down' | null;
    upvotes: number;
    downvotes: number;
  };
  onVote: (eventId: string, vote: 'up' | 'down') => void;
  onInitializeVote: (eventId: string, upvotes: number, downvotes: number) => void;
  isSaved: boolean;
  onToggleSave: (eventId: string) => Promise<void>;
  onCheckSavedStatus: (eventId: string) => Promise<boolean>;
}

function FeedCardComponent({
  item,
  isActive,
  voteState,
  onVote,
  onInitializeVote,
  isSaved,
  onToggleSave,
  onCheckSavedStatus,
}: FeedCardProps) {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const reducedMotion = useReducedMotion();

  // Double-tap detection
  const lastTapTimeRef = useRef(0);
  const DOUBLE_TAP_DELAY = 300; // ms

  // Initialize vote state and check saved status when card mounts
  useEffect(() => {
    onInitializeVote(item.id, item.upvotes, item.downvotes);
    onCheckSavedStatus(item.id);
  }, [item.id, item.upvotes, item.downvotes, onInitializeVote, onCheckSavedStatus]);

  // Action handlers
  const handleShareClick = useCallback(() => {
    setIsShareSheetOpen(true);
  }, []);

  const handleVideoClick = useCallback(() => {
    // TODO: Open video modal or expand video player
    if (item.sourceUrl) {
      window.open(item.sourceUrl, '_blank');
    }
  }, [item.sourceUrl]);

  const handleVote = useCallback(
    (vote: 'up' | 'down') => {
      hapticService.medium();
      onVote(item.id, vote);
      // Announce vote result (with updated totals)
      const newUpvotes = vote === 'up' ? voteState.upvotes + 1 : voteState.upvotes;
      const newDownvotes = vote === 'down' ? voteState.downvotes + 1 : voteState.downvotes;
      announceService.announceVote(vote, newUpvotes, newDownvotes);
    },
    [item.id, onVote, voteState.upvotes, voteState.downvotes]
  );

  const handleComment = useCallback(() => {
    setIsCommentSheetOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    hapticService.success();
    onToggleSave(item.id);
    // Announce save state change (toggling to opposite of current)
    announceService.announceSave(!isSaved);
  }, [item.id, onToggleSave, isSaved]);

  const handleAIChat = useCallback(() => {
    setIsAIChatOpen(true);
  }, []);

  // Double-tap to save handler
  const handleDoubleTap = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;

      if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
        // Double tap detected - save the item
        e.preventDefault();
        if (!isSaved) {
          hapticService.double();
          onToggleSave(item.id);
          setShowHeartAnimation(true);
          toast.success('Saved!', { duration: 1500 });
          announceService.announceSave(true);
          setTimeout(() => setShowHeartAnimation(false), 1000);
        } else {
          toast('Already saved', { duration: 1500 });
        }
        lastTapTimeRef.current = 0; // Reset to prevent triple-tap
      } else {
        lastTapTimeRef.current = now;
      }
    },
    [isSaved, item.id, onToggleSave]
  );

  return (
    <article
      className="absolute inset-0 flex flex-col bg-gray-950 text-white overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {/* Header */}
      <FeedCardHeader
        sourcePublisher={item.sourcePublisher}
        publishedDate={item.publishedDate}
        sourceUrl={item.sourceUrl}
        featured={item.featured}
        onShareClick={handleShareClick}
      />

      {/* Media Section */}
      <FeedCardMedia
        thumbnailUrl={item.thumbnailUrl}
        videoId={item.videoId}
        mediaType={item.mediaType}
        headline={item.headline}
        isActive={isActive}
        onVideoClick={handleVideoClick}
      />

      {/* Content - with double-tap handler */}
      <div
        className="flex-1 flex flex-col px-4 py-4 overflow-y-auto relative"
        onTouchEnd={handleDoubleTap}
        onClick={handleDoubleTap}
      >
        {/* Heart animation overlay */}
        <AnimatePresence>
          {showHeartAnimation && (
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { scale: 0, opacity: 0 }}
              animate={reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { scale: 1.5, opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <Heart
                className="w-24 h-24 text-red-500 drop-shadow-lg"
                fill="currentColor"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Headline */}
        <h1
          className="font-bold leading-tight mb-3 text-[clamp(1.5rem,5vw,2rem)]"
        >
          {item.headline}
        </h1>

        {/* Summary / Teaser */}
        <div className="mb-4">
          <p
            className={cn(
              'text-gray-300 leading-relaxed',
              'text-[clamp(0.875rem,3vw,1rem)]',
              !isSummaryExpanded && 'line-clamp-3'
            )}
          >
            {item.summary}
          </p>
          {item.summary.length > 150 && (
            <button
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              {isSummaryExpanded ? (
                <>
                  Show less <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Read more <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Concept Chips */}
        <FeedConceptChips eventId={item.id} isActive={isActive} />

        {/* Why It Matters Section */}
        {item.whyItMatters && (
          <div
            className={cn(
              'bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4',
              'transition-all duration-200'
            )}
          >
            <button
              onClick={() => setIsContextExpanded(!isContextExpanded)}
              className="w-full flex items-center justify-between p-3 text-left"
            >
              <h3 className="text-sm font-semibold text-amber-400">
                Why it matters
              </h3>
              {isContextExpanded ? (
                <ChevronUp className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              )}
            </button>
            <div
              className={cn(
                'overflow-hidden transition-all duration-200',
                isContextExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <p className="px-3 pb-3 text-sm text-gray-300 leading-relaxed">
                {item.whyItMatters}
              </p>
            </div>
            {!isContextExpanded && (
              <p className="px-3 pb-3 text-sm text-gray-400 line-clamp-1">
                {item.whyItMatters}
              </p>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 min-h-4" />

        {/* Source Link */}
        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors pb-2"
          >
            <ExternalLink className="w-4 h-4" />
            Read original article
          </a>
        )}
      </div>

      {/* Comment Preview (Hot Takes) */}
      <FeedCommentPreview
        eventId={item.id}
        commentCount={item.commentCount}
        onViewAll={handleComment}
        isActive={isActive}
      />

      {/* Action Bar */}
      <FeedActionBar
        eventId={item.id}
        upvotes={voteState.upvotes}
        downvotes={voteState.downvotes}
        commentCount={item.commentCount}
        userVote={voteState.userVote}
        isSaved={isSaved}
        onVote={handleVote}
        onComment={handleComment}
        onSave={handleSave}
        onAIChat={handleAIChat}
        onShare={handleShareClick}
      />

      {/* Comment Sheet */}
      <FeedCommentSheet
        isOpen={isCommentSheetOpen}
        onClose={() => setIsCommentSheetOpen(false)}
        eventId={item.id}
        headline={item.headline}
        commentCount={item.commentCount}
      />

      {/* AI Chat Sheet */}
      <FeedAIChatSheet
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        eventId={item.id}
        headline={item.headline}
        summary={item.summary}
        whyItMatters={item.whyItMatters}
      />

      {/* Share Sheet */}
      <FeedShareSheet
        event={item}
        isOpen={isShareSheetOpen}
        onClose={() => setIsShareSheetOpen(false)}
      />
    </article>
  );
}

// Memoize to prevent unnecessary re-renders
export const FeedCard = memo(FeedCardComponent);

export default FeedCard;

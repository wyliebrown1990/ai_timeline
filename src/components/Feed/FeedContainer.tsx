/**
 * FeedContainer Component (Sprint Feed-2)
 *
 * Manages the swipeable card stack with:
 * - Virtualized rendering (only 3 cards at a time)
 * - Smooth swipe animations using framer-motion
 * - Keyboard navigation
 * - Session memory integration
 */

import { useCallback, useEffect, useRef, useState, memo } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { X, ChevronUp, ChevronDown, Bookmark, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeedCard } from './FeedCard';
import { FeedLoadingCard } from './FeedLoadingCard';
import { FeedEmptyState } from './FeedEmptyState';
import { useFeedVoting } from '../../hooks/useFeedVoting';
import { useFeedSave } from '../../hooks/useFeedSave';
import { useFeedSwipeActions } from '../../hooks/useFeedSwipeActions';
import type { FeedItem } from '../../types/feed';

interface FeedContainerProps {
  items: FeedItem[];
  currentIndex: number;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  onIndexChange: (index: number) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
}

// Animation configuration
const SWIPE_THRESHOLD = 100; // pixels for vertical swipe
const HORIZONTAL_SWIPE_THRESHOLD = 80; // pixels for horizontal swipe
const VELOCITY_THRESHOLD = 500; // pixels per second
const HORIZONTAL_VELOCITY_THRESHOLD = 400; // pixels per second for horizontal

const cardVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    y: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

function FeedContainerComponent({
  items,
  currentIndex,
  isLoading,
  hasMore,
  error,
  onIndexChange,
  onLoadMore,
  onRefresh,
}: FeedContainerProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [horizontalOffset, setHorizontalOffset] = useState(0);

  // Motion values for tracking drag
  const dragX = useMotionValue(0);

  // Transform horizontal offset to overlay opacity (max at threshold)
  const rightOverlayOpacity = useTransform(
    dragX,
    [0, HORIZONTAL_SWIPE_THRESHOLD],
    [0, 1]
  );
  const leftOverlayOpacity = useTransform(
    dragX,
    [0, -HORIZONTAL_SWIPE_THRESHOLD],
    [0, 1]
  );

  // Voting hook
  const { getVoteState, vote, initializeVoteState } = useFeedVoting();

  // Save hook
  const { isSaved, toggleSave, checkSavedStatus } = useFeedSave();

  // Swipe actions hook
  const { handleSwipeRight, handleSwipeLeft } = useFeedSwipeActions();

  // Check if this is user's first visit
  useEffect(() => {
    const hasSeenHint = sessionStorage.getItem('feed_swipe_hint_seen');
    if (!hasSeenHint && items.length > 0) {
      setShowSwipeHint(true);
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
        sessionStorage.setItem('feed_swipe_hint_seen', 'true');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [items.length]);

  // Handle swipe navigation
  const handleSwipe = useCallback(
    (newDirection: number) => {
      // Hide hint on first swipe
      if (showSwipeHint) {
        setShowSwipeHint(false);
        sessionStorage.setItem('feed_swipe_hint_seen', 'true');
      }

      const newIndex = currentIndex + newDirection;

      if (newDirection > 0 && currentIndex < items.length - 1) {
        // Swipe up - next item
        setDirection(1);
        onIndexChange(newIndex);
      } else if (newDirection < 0 && currentIndex > 0) {
        // Swipe down - previous item
        setDirection(-1);
        onIndexChange(newIndex);
      }
    },
    [currentIndex, items.length, onIndexChange, showSwipeHint]
  );

  // Handle drag (track horizontal offset for visual feedback)
  const handleDrag = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setHorizontalOffset(info.offset.x);
      dragX.set(info.offset.x);
    },
    [dragX]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      setHorizontalOffset(0);
      dragX.set(0);

      const { offset, velocity } = info;

      // Determine if horizontal swipe is more dominant than vertical
      const isHorizontalSwipe = Math.abs(offset.x) > Math.abs(offset.y);

      if (isHorizontalSwipe) {
        // Swipe right (save to collection)
        if (
          offset.x > HORIZONTAL_SWIPE_THRESHOLD ||
          velocity.x > HORIZONTAL_VELOCITY_THRESHOLD
        ) {
          const currentItem = items[currentIndex];
          if (currentItem) {
            handleSwipeRight(currentItem.id);
            // Move to next card after action
            if (currentIndex < items.length - 1) {
              setDirection(1);
              onIndexChange(currentIndex + 1);
            }
          }
          return;
        }
        // Swipe left (not interested)
        if (
          offset.x < -HORIZONTAL_SWIPE_THRESHOLD ||
          velocity.x < -HORIZONTAL_VELOCITY_THRESHOLD
        ) {
          const currentItem = items[currentIndex];
          if (currentItem) {
            handleSwipeLeft(currentItem.id);
            // Move to next card after action
            if (currentIndex < items.length - 1) {
              setDirection(1);
              onIndexChange(currentIndex + 1);
            }
          }
          return;
        }
      }

      // Swipe up (next item)
      if (offset.y < -SWIPE_THRESHOLD || velocity.y < -VELOCITY_THRESHOLD) {
        handleSwipe(1);
      }
      // Swipe down (previous item)
      else if (offset.y > SWIPE_THRESHOLD || velocity.y > VELOCITY_THRESHOLD) {
        handleSwipe(-1);
      }
      // Otherwise, card snaps back (handled by framer-motion)
    },
    [
      handleSwipe,
      handleSwipeRight,
      handleSwipeLeft,
      items,
      currentIndex,
      onIndexChange,
      dragX,
    ]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
        case 'j':
        case ' ':
          event.preventDefault();
          handleSwipe(1);
          break;
        case 'ArrowUp':
        case 'k':
          event.preventDefault();
          handleSwipe(-1);
          break;
        case 'Escape':
          event.preventDefault();
          navigate('/news');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwipe, navigate]);

  // Prevent body scroll when feed is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Auto-load more when approaching end
  useEffect(() => {
    if (items.length > 0 && currentIndex >= items.length - 3 && hasMore) {
      onLoadMore();
    }
  }, [currentIndex, items.length, hasMore, onLoadMore]);

  // Handle exit
  const handleExit = useCallback(() => {
    navigate('/news');
  }, [navigate]);

  // Loading state
  if (isLoading && items.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-950">
        <FeedLoadingCard />
      </div>
    );
  }

  // Error state
  if (error && items.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <FeedEmptyState
          type="error"
          message={error}
          onRefresh={onRefresh}
          onBack={handleExit}
        />
      </div>
    );
  }

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <FeedEmptyState
          type="empty"
          onRefresh={onRefresh}
          onBack={handleExit}
        />
      </div>
    );
  }

  // End of feed state
  const isAtEnd = currentIndex >= items.length - 1 && !hasMore;
  const currentItem = items[currentIndex];

  // Safety check if currentIndex is somehow out of bounds
  if (!currentItem) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <FeedEmptyState
          type="empty"
          onRefresh={onRefresh}
          onBack={handleExit}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-gray-950 overflow-hidden select-none"
      style={{
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
      }}
    >
      {/* Exit Button */}
      <button
        onClick={handleExit}
        className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        aria-label="Exit feed"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Position Indicator */}
      <div
        className="absolute top-4 right-4 z-50 px-3 py-1 rounded-full bg-black/50 text-white text-sm"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        {currentIndex + 1} / {items.length}
        {hasMore && '+'}
      </div>

      {/* Card Stack */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentItem.id}
          custom={direction}
          variants={cardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={springTransition}
          drag
          dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={() => setIsDragging(true)}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{
            willChange: 'transform',
            touchAction: 'none',
            x: dragX,
          }}
        >
          <FeedCard
            item={currentItem}
            isActive={true}
            voteState={getVoteState(currentItem.id)}
            onVote={vote}
            onInitializeVote={initializeVoteState}
            isSaved={isSaved(currentItem.id)}
            onToggleSave={toggleSave}
            onCheckSavedStatus={checkSavedStatus}
          />
        </motion.div>
      </AnimatePresence>

      {/* Horizontal Swipe Visual Feedback Overlays */}
      {isDragging && (
        <>
          {/* Right swipe (Save) indicator */}
          <motion.div
            style={{ opacity: rightOverlayOpacity }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="absolute inset-0 bg-gradient-to-l from-emerald-500/30 to-transparent" />
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: horizontalOffset > 0 ? 1 : 0.8 }}
              className="relative z-10 flex flex-col items-center gap-2"
            >
              <div className="p-4 rounded-full bg-emerald-500/80 backdrop-blur-sm">
                <Bookmark className="w-10 h-10 text-white" />
              </div>
              <span className="text-lg font-semibold text-white drop-shadow-lg">
                Save
              </span>
            </motion.div>
          </motion.div>

          {/* Left swipe (Not Interested) indicator */}
          <motion.div
            style={{ opacity: leftOverlayOpacity }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/30 to-transparent" />
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: horizontalOffset < 0 ? 1 : 0.8 }}
              className="relative z-10 flex flex-col items-center gap-2"
            >
              <div className="p-4 rounded-full bg-red-500/80 backdrop-blur-sm">
                <XCircle className="w-10 h-10 text-white" />
              </div>
              <span className="text-lg font-semibold text-white drop-shadow-lg">
                Not Interested
              </span>
            </motion.div>
          </motion.div>
        </>
      )}

      {/* Swipe Hint Overlay */}
      {showSwipeHint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
        >
          <div className="flex flex-col items-center gap-4 text-white/80">
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ChevronUp className="w-8 h-8" />
            </motion.div>
            <span className="text-lg font-medium">Swipe to explore</span>
            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ChevronDown className="w-8 h-8" />
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Navigation Hints (subtle) */}
      {!isDragging && (
        <>
          {/* Previous indicator */}
          {currentIndex > 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+200px)] z-30 pointer-events-none">
              <ChevronUp className="w-6 h-6 text-white/20" />
            </div>
          )}
          {/* Next indicator */}
          {currentIndex < items.length - 1 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[calc(-50%+200px)] z-30 pointer-events-none">
              <ChevronDown className="w-6 h-6 text-white/20" />
            </div>
          )}
        </>
      )}

      {/* End of Feed Indicator */}
      {isAtEnd && (
        <div className="absolute bottom-24 left-0 right-0 z-40 flex justify-center">
          <div className="bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-300">
            You've reached the end!
          </div>
        </div>
      )}
    </div>
  );
}

export const FeedContainer = memo(FeedContainerComponent);

export default FeedContainer;

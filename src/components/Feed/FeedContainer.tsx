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
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeedCard } from './FeedCard';
import { FeedLoadingCard } from './FeedLoadingCard';
import { FeedEmptyState } from './FeedEmptyState';
import { FeedProgress } from './FeedProgress';
import { BreakReminder } from './BreakReminder';
import { FeedQuizPrompt } from './FeedQuizPrompt';
import { AchievementToast } from './AchievementToast';
import { useFeedVoting } from '../../hooks/useFeedVoting';
import { useAchievements } from '../../hooks/useAchievements';
import { useImagePrefetch } from '../../hooks/useImagePrefetch';
import { useFeedSave } from '../../hooks/useFeedSave';
import { useFeedSession } from '../../hooks/useFeedSession';
import { streakService } from '../../services/streakService';
import { hapticService } from '../../services/hapticService';
import { announceService } from '../../services/announceService';
import { soundService } from '../../services/soundService';
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

  // Gamification state
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [recentEventIds, setRecentEventIds] = useState<string[]>([]);
  const lastBreakCheckRef = useRef<number>(0);
  const quizShownAtRef = useRef<number>(0);

  // Session tracking
  const { getStats, markSeen } = useFeedSession();

  // Voting hook
  const { getVoteState, vote, initializeVoteState } = useFeedVoting();

  // Save hook
  const { isSaved, toggleSave, checkSavedStatus } = useFeedSave();

  // Achievements hook
  const { pendingAchievements, dismissAchievement, checkAchievements } = useAchievements();

  // Image prefetch hook for performance
  useImagePrefetch(items, currentIndex);

  // Update streak on first view
  useEffect(() => {
    if (items.length > 0) {
      streakService.updateStreak();
    }
  }, [items.length]);

  // Track current item as viewed and update recent IDs for quiz
  useEffect(() => {
    const currentItem = items[currentIndex];
    if (currentItem) {
      markSeen(currentItem.id);
      setRecentEventIds((prev) => {
        const updated = [...prev, currentItem.id];
        return updated.slice(-10); // Keep last 10
      });

      // Announce to screen readers
      announceService.announceCardNavigation(currentIndex, items.length);
    }
  }, [currentIndex, items, markSeen]);

  // Check for break reminder triggers
  useEffect(() => {
    const checkBreakReminder = () => {
      const stats = getStats();
      const now = Date.now();

      // Only check once per minute
      if (now - lastBreakCheckRef.current < 60000) return;
      lastBreakCheckRef.current = now;

      // Trigger after 20 items or 15 minutes
      if (stats.itemsViewed >= 20 || stats.sessionDurationMinutes >= 15) {
        // Only show if not shown recently (reset after 5 min break)
        const lastBreakShown = sessionStorage.getItem('feed_last_break_shown');
        if (!lastBreakShown || now - parseInt(lastBreakShown) > 5 * 60 * 1000) {
          setShowBreakReminder(true);
        }
      }
    };

    checkBreakReminder();
    const interval = setInterval(checkBreakReminder, 30000);
    return () => clearInterval(interval);
  }, [getStats]);

  // Check for quiz prompt triggers
  useEffect(() => {
    const stats = getStats();
    const itemsSinceLastQuiz = stats.itemsViewed - quizShownAtRef.current;

    // Show quiz prompt after 7-10 items (with some randomness)
    const threshold = 7 + Math.floor(Math.random() * 4);
    if (itemsSinceLastQuiz >= threshold && !showQuizPrompt && !showBreakReminder) {
      // Only show once per session until dismissed
      const quizDismissed = sessionStorage.getItem('feed_quiz_dismissed');
      if (!quizDismissed) {
        setShowQuizPrompt(true);
        quizShownAtRef.current = stats.itemsViewed;
      }
    }
  }, [getStats, showQuizPrompt, showBreakReminder]);

  // Check achievements periodically
  useEffect(() => {
    const stats = getStats();
    const streak = streakService.getCurrentStreak();

    checkAchievements({
      itemsViewed: stats.itemsViewed,
      streak,
      conceptsLearned: stats.conceptsLearned,
    });
  }, [getStats, checkAchievements]);

  // Handle break reminder actions
  const handleContinueFromBreak = useCallback(() => {
    setShowBreakReminder(false);
    sessionStorage.setItem('feed_last_break_shown', String(Date.now()));
  }, []);

  const handleTakeBreak = useCallback(() => {
    setShowBreakReminder(false);
    navigate('/');
  }, [navigate]);

  // Handle quiz prompt actions
  const handleStartQuiz = useCallback(() => {
    setShowQuizPrompt(false);
    sessionStorage.setItem('feed_quiz_dismissed', 'true');
    navigate('/news/quiz');
  }, [navigate]);

  const handleSkipQuiz = useCallback(() => {
    setShowQuizPrompt(false);
    sessionStorage.setItem('feed_quiz_dismissed', 'true');
  }, []);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      onIndexChange(currentIndex - 1);
      hapticService.light();
      soundService.swipe();
    }
  }, [currentIndex, onIndexChange]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setDirection(1);
      onIndexChange(currentIndex + 1);
      hapticService.light();
      soundService.swipe();
    }
  }, [currentIndex, items.length, onIndexChange]);

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
          handleNext();
          break;
        case 'ArrowUp':
        case 'k':
          event.preventDefault();
          handlePrevious();
          break;
        case 'Escape':
          event.preventDefault();
          navigate('/news');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, navigate]);

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

      {/* Progress Tracker */}
      <div
        className="absolute left-4 right-4 z-40"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}
      >
        <FeedProgress />
      </div>

      {/* Break Reminder Overlay */}
      <AnimatePresence>
        {showBreakReminder && (
          <BreakReminder
            itemsViewed={getStats().itemsViewed}
            minutesSpent={getStats().sessionDurationMinutes}
            conceptsLearned={getStats().conceptsLearned}
            onContinue={handleContinueFromBreak}
            onTakeBreak={handleTakeBreak}
          />
        )}
      </AnimatePresence>

      {/* Quiz Prompt Overlay */}
      <AnimatePresence>
        {showQuizPrompt && !showBreakReminder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[90]"
          >
            <FeedQuizPrompt
              recentEventIds={recentEventIds}
              itemsViewed={getStats().itemsViewed}
              onStartQuiz={handleStartQuiz}
              onSkip={handleSkipQuiz}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement Toast */}
      <AnimatePresence>
        {pendingAchievements.length > 0 && pendingAchievements[0] && (
          <AchievementToast
            achievement={pendingAchievements[0]}
            onDismiss={dismissAchievement}
          />
        )}
      </AnimatePresence>

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
          className="absolute inset-0"
          style={{
            willChange: 'transform',
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

      {/* Navigation Buttons */}
      <div className="absolute bottom-28 left-0 right-0 z-40 flex justify-center gap-4 px-4">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-gray-800/90 backdrop-blur-sm text-white font-medium transition-all hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          aria-label="Previous article"
        >
          <ArrowUp className="w-5 h-5" />
          <span>Previous</span>
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex >= items.length - 1}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-blue-600/90 backdrop-blur-sm text-white font-medium transition-all hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          aria-label="Next article"
        >
          <span>Next</span>
          <ArrowDown className="w-5 h-5" />
        </button>
      </div>

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

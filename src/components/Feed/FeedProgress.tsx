/**
 * FeedProgress Component (Sprint Feed-6)
 *
 * Displays session progress stats including items viewed,
 * concepts learned, and streak information.
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, BookOpen, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useFeedSession } from '../../hooks/useFeedSession';
import { streakService } from '../../services/streakService';

interface FeedProgressProps {
  className?: string;
}

function FeedProgressComponent({ className = '' }: FeedProgressProps) {
  const { getStats } = useFeedSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState({
    itemsViewed: 0,
    conceptsLearned: 0,
    sessionDurationMinutes: 0,
  });
  const [streak, setStreak] = useState(0);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setStats(getStats());
      const currentStreak = streakService.getCurrentStreak();
      setStreak(currentStreak);
    };

    // Initial update
    updateStats();

    // Update every 10 seconds
    const interval = setInterval(updateStats, 10000);

    return () => clearInterval(interval);
  }, [getStats]);

  // Check for streak milestones
  useEffect(() => {
    const milestones = [7, 14, 30, 60, 100, 365];
    if (milestones.includes(streak)) {
      setShowStreakCelebration(true);
      setTimeout(() => setShowStreakCelebration(false), 3000);
    }
  }, [streak]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden ${className}`}
    >
      {/* Collapsed view - always visible */}
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-4">
          {/* Streak */}
          {streak > 0 && (
            <motion.div
              className="flex items-center gap-1.5"
              animate={showStreakCelebration ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.5, repeat: showStreakCelebration ? 2 : 0 }}
            >
              <Flame
                className={`w-4 h-4 ${
                  streak >= 7 ? 'text-orange-500' : 'text-gray-400'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  streak >= 7 ? 'text-orange-500' : 'text-gray-400'
                }`}
              >
                {streak}
              </span>
            </motion.div>
          )}

          {/* Items viewed */}
          <div className="flex items-center gap-1.5 text-gray-400">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm">
              <motion.span
                key={stats.itemsViewed}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-medium text-white"
              >
                {stats.itemsViewed}
              </motion.span>{' '}
              stories
            </span>
          </div>

          {/* Concepts learned */}
          {stats.conceptsLearned > 0 && (
            <div className="text-sm text-gray-500">
              ·{' '}
              <span className="text-emerald-400">{stats.conceptsLearned}</span>{' '}
              concepts
            </div>
          )}
        </div>

        {/* Expand/collapse icon */}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Expanded view with more details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-800"
          >
            <div className="p-4 space-y-3">
              {/* Session duration */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Session time</span>
                </div>
                <span className="text-sm text-white">
                  {stats.sessionDurationMinutes < 1
                    ? 'Just started'
                    : `${stats.sessionDurationMinutes} min`}
                </span>
              </div>

              {/* Streak info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm">Daily streak</span>
                </div>
                <span
                  className={`text-sm font-medium ${
                    streak >= 7
                      ? 'text-orange-500'
                      : streak > 0
                      ? 'text-white'
                      : 'text-gray-500'
                  }`}
                >
                  {streak > 0 ? `${streak} day${streak !== 1 ? 's' : ''}` : 'Start today!'}
                </span>
              </div>

              {/* Longest streak */}
              {streakService.getLongestStreak() > streak && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Best streak</span>
                  <span className="text-sm text-gray-400">
                    {streakService.getLongestStreak()} days
                  </span>
                </div>
              )}

              {/* Encouragement message */}
              <div className="pt-2 text-center">
                <span className="text-xs text-gray-500">
                  {getEncouragementMessage(stats.itemsViewed, streak)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak celebration overlay */}
      <AnimatePresence>
        {showStreakCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="text-center"
            >
              <Flame className="w-12 h-12 text-orange-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-white">
                🔥 {streak} Day Streak!
              </p>
              <p className="text-sm text-gray-400">Keep it up!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Get an encouragement message based on progress
 */
function getEncouragementMessage(itemsViewed: number, streak: number): string {
  if (streak >= 30) return "You're a legend! 🏆";
  if (streak >= 7) return "Amazing dedication! 🌟";
  if (itemsViewed >= 20) return "Great learning session!";
  if (itemsViewed >= 10) return "You're on a roll!";
  if (itemsViewed >= 5) return "Keep exploring!";
  if (streak > 0) return `Day ${streak} - Keep the streak alive!`;
  return "Start your streak today!";
}

export const FeedProgress = memo(FeedProgressComponent);

export default FeedProgress;

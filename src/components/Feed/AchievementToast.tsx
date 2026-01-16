/**
 * AchievementToast Component (Sprint Feed-6)
 *
 * Displays a toast notification when an achievement is unlocked.
 * Animated celebration with sound and haptic feedback.
 */

import { memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { Achievement } from '../../services/achievementService';
import { hapticService } from '../../services/hapticService';
import { soundService } from '../../services/soundService';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
}

function AchievementToastComponent({ achievement, onDismiss }: AchievementToastProps) {
  const reducedMotion = useReducedMotion();

  // Trigger celebration effects
  useEffect(() => {
    hapticService.heavy();
    soundService.achievement();

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -100, scale: 0.8 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -50, scale: 0.9 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm"
      onClick={onDismiss}
    >
      <div className="bg-gradient-to-r from-amber-600 to-yellow-500 rounded-2xl shadow-2xl p-4 cursor-pointer">
        <div className="flex items-center gap-4">
          {/* Achievement Icon */}
          <motion.div
            initial={reducedMotion ? {} : { rotate: -10 }}
            animate={reducedMotion ? {} : { rotate: [0, -10, 10, -10, 0] }}
            transition={reducedMotion ? {} : { duration: 0.5, delay: 0.3 }}
            className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl"
          >
            {achievement.icon}
          </motion.div>

          {/* Achievement Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-white/80" />
              <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
                Achievement Unlocked!
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">{achievement.name}</h3>
            <p className="text-sm text-white/80">{achievement.description}</p>
          </div>
        </div>

        {/* Tap to dismiss hint */}
        <p className="text-xs text-white/50 text-center mt-2">Tap to dismiss</p>
      </div>
    </motion.div>
  );
}

export const AchievementToast = memo(AchievementToastComponent);

export default AchievementToast;

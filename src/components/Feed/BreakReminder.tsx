/**
 * BreakReminder Component (Sprint Feed-6)
 *
 * Full-screen overlay that encourages users to take a break
 * after extended feed usage. Non-judgmental, wellness-focused.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Coffee, BookOpen, Brain, ArrowRight } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface BreakReminderProps {
  itemsViewed: number;
  minutesSpent: number;
  conceptsLearned: number;
  onContinue: () => void;
  onTakeBreak: () => void;
}

function BreakReminderComponent({
  itemsViewed,
  minutesSpent,
  conceptsLearned,
  onContinue,
  onTakeBreak,
}: BreakReminderProps) {
  const reducedMotion = useReducedMotion();

  // Animation variants - disabled when reduced motion is preferred
  const fadeIn = reducedMotion ? false : { opacity: 0 };
  const fadeInSlide = reducedMotion ? false : { opacity: 0, y: 20 };
  const scaleIn = reducedMotion ? false : { scale: 0 };
  const instantTransition = reducedMotion ? { duration: 0 } : undefined;

  return (
    <motion.div
      initial={fadeIn}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={instantTransition}
      className="fixed inset-0 z-[100] bg-gray-950 flex flex-col items-center justify-center p-6"
    >
      {/* Icon */}
      <motion.div
        initial={scaleIn}
        animate={{ scale: 1 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.2, type: 'spring' }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Coffee className="w-10 h-10 text-emerald-400" />
        </div>
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={fadeInSlide}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.3 }}
        className="text-2xl font-bold text-white text-center mb-2"
      >
        Great learning session!
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={fadeInSlide}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.4 }}
        className="text-gray-400 text-center mb-8"
      >
        You've been exploring AI news for {minutesSpent} minutes
      </motion.p>

      {/* Stats */}
      <motion.div
        initial={fadeInSlide}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.5 }}
        className="flex gap-6 mb-10"
      >
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-white mb-1">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span className="text-2xl font-bold">{itemsViewed}</span>
          </div>
          <span className="text-sm text-gray-500">stories read</span>
        </div>

        {conceptsLearned > 0 && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 text-white mb-1">
              <Brain className="w-5 h-5 text-emerald-400" />
              <span className="text-2xl font-bold">{conceptsLearned}</span>
            </div>
            <span className="text-sm text-gray-500">concepts explored</span>
          </div>
        )}
      </motion.div>

      {/* Message */}
      <motion.p
        initial={fadeInSlide}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.6 }}
        className="text-gray-300 text-center mb-8 max-w-sm"
      >
        Taking breaks helps information sink in. Your brain needs time to process what you've learned.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={fadeInSlide}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.7 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <button
          onClick={onTakeBreak}
          className="w-full py-4 px-6 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
        >
          <Coffee className="w-5 h-5" />
          Take a break
        </button>

        <button
          onClick={onContinue}
          className="w-full py-4 px-6 bg-gray-800 text-gray-300 rounded-xl font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          Keep learning
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Footer note */}
      <motion.p
        initial={fadeIn}
        animate={{ opacity: 1 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.9 }}
        className="text-xs text-gray-600 mt-8 text-center"
      >
        You can adjust break reminders in settings
      </motion.p>
    </motion.div>
  );
}

export const BreakReminder = memo(BreakReminderComponent);

export default BreakReminder;

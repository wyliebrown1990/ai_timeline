/**
 * FeedQuizPrompt Component (Sprint Feed-6)
 *
 * Inline prompt that appears in the feed after viewing
 * multiple items, encouraging users to test their knowledge.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowRight, Sparkles } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface FeedQuizPromptProps {
  recentEventIds: string[];
  itemsViewed: number;
  onStartQuiz: () => void;
  onSkip: () => void;
}

function FeedQuizPromptComponent({
  itemsViewed,
  onStartQuiz,
  onSkip,
}: FeedQuizPromptProps) {
  const reducedMotion = useReducedMotion();

  // Animation variants - disabled when reduced motion is preferred
  const fadeIn = reducedMotion ? false : { opacity: 0 };
  const fadeInSlide = reducedMotion ? false : { opacity: 0, y: 20 };
  const scaleIn = reducedMotion ? false : { scale: 0 };
  const scaleRotateIn = reducedMotion ? false : { scale: 0, rotate: -180 };

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.95 }}
      transition={reducedMotion ? { duration: 0 } : undefined}
      className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-950 text-white p-6"
    >
      {/* Icon */}
      <motion.div
        initial={scaleRotateIn}
        animate={{ scale: 1, rotate: 0 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-6"
      >
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-12 h-12 text-purple-400" />
          </div>
          <motion.div
            initial={scaleIn}
            animate={{ scale: 1 }}
            transition={reducedMotion ? { duration: 0 } : { delay: 0.5 }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </motion.div>
        </div>
      </motion.div>

      {/* Heading */}
      <motion.h2
        initial={fadeInSlide}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.3 }}
        className="text-2xl font-bold text-center mb-3"
      >
        Test what you learned?
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        initial={fadeInSlide}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.4 }}
        className="text-gray-400 text-center mb-8 max-w-sm"
      >
        You've read {itemsViewed} stories. Quick quiz to reinforce your knowledge!
      </motion.p>

      {/* Quiz preview */}
      <motion.div
        initial={fadeInSlide}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.5 }}
        className="bg-gray-800/50 rounded-xl p-4 mb-8 w-full max-w-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <span className="text-lg font-bold text-purple-400">3</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Quick Quiz</p>
            <p className="text-xs text-gray-500">
              3 questions · Based on recent stories
            </p>
          </div>
        </div>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={fadeInSlide}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.6 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <button
          onClick={onStartQuiz}
          className="w-full py-4 px-6 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
        >
          <Brain className="w-5 h-5" />
          Start Quiz
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onSkip}
          className="w-full py-3 px-6 text-gray-400 hover:text-white transition-colors"
        >
          Continue reading
        </button>
      </motion.div>

      {/* Fun fact */}
      <motion.p
        initial={fadeIn}
        animate={{ opacity: 1 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.8 }}
        className="text-xs text-gray-600 mt-8 text-center max-w-xs"
      >
        💡 Quizzing yourself helps you remember 50% more than just reading!
      </motion.p>
    </motion.div>
  );
}

export const FeedQuizPrompt = memo(FeedQuizPromptComponent);

export default FeedQuizPrompt;

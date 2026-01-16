/**
 * FeedCommentSheet Component (Sprint Feed-3)
 *
 * Slide-up sheet for viewing and posting comments on feed items.
 * Wraps the existing CommentThread component with mobile-optimized UX.
 */

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';
import { CommentThread } from '../Comments';
import { cn } from '../../lib/utils';

interface FeedCommentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  headline: string;
  commentCount: number;
}

export function FeedCommentSheet({
  isOpen,
  onClose,
  eventId,
  headline,
  commentCount,
}: FeedCommentSheetProps) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50',
              'bg-white dark:bg-gray-900',
              'rounded-t-2xl shadow-2xl',
              'max-h-[85vh] flex flex-col'
            )}
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MessageSquare className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Comments
                    {commentCount > 0 && (
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({commentCount})
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {headline}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-full flex-shrink-0',
                  'text-gray-500 hover:text-gray-700',
                  'dark:text-gray-400 dark:hover:text-gray-200',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'transition-colors'
                )}
                aria-label="Close comments"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <CommentThread
                targetType="news_event"
                targetId={eventId}
                className="pb-4"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default FeedCommentSheet;

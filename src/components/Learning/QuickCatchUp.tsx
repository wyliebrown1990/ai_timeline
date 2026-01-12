import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, BookOpen, CheckCircle2, ExternalLink, Lightbulb } from 'lucide-react';
import { DifficultyBadge } from './DifficultyBadge';
import type { GlossaryEntry } from '../../types/glossary';

interface QuickCatchUpProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** List of prerequisite terms to learn */
  prerequisites: GlossaryEntry[];
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when a concept is marked as understood */
  onMarkSeen: (termId: string) => void;
  /** Callback to navigate to full glossary entry */
  onLearnMore: (termId: string) => void;
  /** IDs of concepts already seen */
  seenConceptIds?: string[];
  /** The target term user wants to learn */
  targetTerm?: GlossaryEntry;
}

/**
 * Quick catch-up modal for learning prerequisite concepts
 * Shows quick explanations with "Got it!" progression
 */
export function QuickCatchUp({
  isOpen,
  prerequisites,
  onClose,
  onMarkSeen,
  onLearnMore,
  seenConceptIds = [],
  targetTerm,
}: QuickCatchUpProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [markedSeen, setMarkedSeen] = useState<Set<string>>(new Set());
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Filter to only unseen prerequisites
  const unseenPrereqs = prerequisites.filter(
    (p) => !seenConceptIds.includes(p.id) && !markedSeen.has(p.id)
  );

  const allPrereqs = prerequisites;
  const currentPrereq = allPrereqs[currentIndex];
  const totalCount = allPrereqs.length;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setMarkedSeen(new Set());
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentIndex, onClose]);

  const handleNext = useCallback(() => {
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, totalCount]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleGotIt = useCallback(() => {
    if (currentPrereq) {
      onMarkSeen(currentPrereq.id);
      setMarkedSeen((prev) => new Set([...prev, currentPrereq.id]));

      // Auto-advance to next unseen prerequisite or close if all done
      if (currentIndex < totalCount - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (unseenPrereqs.length <= 1) {
        // All caught up!
        onClose();
      }
    }
  }, [currentPrereq, currentIndex, totalCount, unseenPrereqs.length, onMarkSeen, onClose]);

  const handleLearnMore = useCallback(() => {
    if (currentPrereq) {
      onLearnMore(currentPrereq.id);
      onClose();
    }
  }, [currentPrereq, onLearnMore, onClose]);

  if (!isOpen || !currentPrereq) return null;

  const isCurrentSeen = seenConceptIds.includes(currentPrereq.id) || markedSeen.has(currentPrereq.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-catchup-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal */}
      <div
        data-testid="quick-catchup-modal"
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 id="quick-catchup-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Quick Catch-Up
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Progress indicator */}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentIndex + 1} of {totalCount}
            </span>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Target context */}
        {targetTerm && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <BookOpen className="inline h-4 w-4 mr-1" />
              Preparing to learn: <span className="font-medium">{targetTerm.term}</span>
            </p>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Term header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {currentPrereq.term}
              </h3>
              {currentPrereq.category && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {currentPrereq.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isCurrentSeen && (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Seen
                </span>
              )}
              <DifficultyBadge difficulty={currentPrereq.difficulty} size="sm" />
            </div>
          </div>

          {/* Quick explanation */}
          <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {currentPrereq.shortDefinition}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-6">
            {allPrereqs.map((prereq, idx) => {
              const isSeen = seenConceptIds.includes(prereq.id) || markedSeen.has(prereq.id);
              return (
                <button
                  key={prereq.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`
                    w-2.5 h-2.5 rounded-full transition-all
                    ${idx === currentIndex
                      ? 'w-6 bg-blue-500'
                      : isSeen
                        ? 'bg-green-400 dark:bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                    }
                  `}
                  aria-label={`Go to ${prereq.term}`}
                />
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous concept"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === totalCount - 1}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next concept"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLearnMore}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Learn More
            </button>
            <button
              onClick={handleGotIt}
              disabled={isCurrentSeen}
              data-testid="quick-catchup-got-it"
              className={`
                flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${isCurrentSeen
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
            >
              {isCurrentSeen ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Got it!
                </>
              ) : (
                'Got it!'
              )}
            </button>
          </div>
        </div>

        {/* Completion message */}
        {unseenPrereqs.length === 0 && totalCount > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/95 dark:bg-gray-900/95">
            <div className="text-center p-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                All Caught Up!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You're ready to learn about{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {targetTerm?.term || 'this concept'}
                </span>
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                Continue Learning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuickCatchUp;

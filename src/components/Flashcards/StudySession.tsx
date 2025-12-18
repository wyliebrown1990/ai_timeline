/**
 * StudySession Component
 *
 * Active flashcard study session interface with:
 * - Card 3D flip animation
 * - Rating buttons (Again, Hard, Good, Easy) with keyboard shortcuts
 * - Progress indicator with card count and progress bar
 * - Session completion screen with streak display and encouraging messages
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, ChevronRight, Flame } from 'lucide-react';
import { useFlashcardContext } from '../../contexts/FlashcardContext';
import { useMilestones } from '../../hooks/useMilestones';
import { useGlossary } from '../../hooks/useContent';
import type { UserFlashcard, QualityRating } from '../../types/flashcard';
import type { MilestoneResponse } from '../../types/milestone';
import type { GlossaryEntry } from '../../types/glossary';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get an encouraging message based on session performance.
 */
function getEncouragingMessage(successRate: number, reviewedCount: number): string {
  if (reviewedCount === 0) {
    return 'No cards reviewed yet!';
  }
  if (successRate >= 90) {
    return 'Outstanding! You really know your stuff! 🌟';
  }
  if (successRate >= 75) {
    return 'Great job! Keep up the good work! 💪';
  }
  if (successRate >= 50) {
    return 'Good progress! Practice makes perfect! 📚';
  }
  return 'Keep learning! Every review helps! 🎯';
}

// =============================================================================
// Types
// =============================================================================

export interface StudySessionProps {
  /** Optional pack ID to filter cards. If not provided, all due cards are studied */
  packId?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Active study session component for reviewing flashcards.
 * Handles card presentation, flipping, rating, and session progress.
 */
export function StudySession({ packId }: StudySessionProps) {
  const navigate = useNavigate();
  const { getDueCards, recordReview, packs, stats } = useFlashcardContext();

  // Fetch milestones for content lookup
  const { data: milestones, isLoading: milestonesLoading } = useMilestones({ limit: 1000 });

  // Fetch glossary terms for content lookup
  const { data: glossaryTerms } = useGlossary();

  // Create lookup map for milestone data
  const milestoneMap = useMemo(() => {
    const map = new Map<string, MilestoneResponse>();
    if (milestones) {
      milestones.forEach((m) => map.set(m.id, m));
    }
    return map;
  }, [milestones]);

  // Create lookup map for glossary data
  const glossaryMap = useMemo(() => {
    const map = new Map<string, GlossaryEntry>();
    if (glossaryTerms) {
      glossaryTerms.forEach((g) => map.set(g.id, g));
    }
    return map;
  }, [glossaryTerms]);

  // Session state
  const [sessionCards, setSessionCards] = useState<UserFlashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [againCards, setAgainCards] = useState<string[]>([]);

  // Get pack name for display
  const pack = packId ? packs.find((p) => p.id === packId) : null;

  // Initialize session with due cards
  useEffect(() => {
    const dueCards = getDueCards(packId);
    // Shuffle cards for variety
    const shuffled = [...dueCards].sort(() => Math.random() - 0.5);
    setSessionCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsComplete(shuffled.length === 0);
  }, [getDueCards, packId]);

  // Current card
  const currentCard = sessionCards[currentIndex];

  // Get content for the current card
  const getCardContent = useCallback(
    (card: UserFlashcard | undefined) => {
      if (!card) return { title: 'Loading...', description: '', date: '' };

      if (card.sourceType === 'milestone') {
        const milestone = milestoneMap.get(card.sourceId);
        if (milestone) {
          return {
            title: milestone.title,
            description: milestone.description,
            date: milestone.date,
            organization: milestone.organization,
            category: milestone.category,
          };
        }
      } else if (card.sourceType === 'concept') {
        const glossaryTerm = glossaryMap.get(card.sourceId);
        if (glossaryTerm) {
          return {
            title: glossaryTerm.term,
            description: glossaryTerm.fullDefinition,
            shortDefinition: glossaryTerm.shortDefinition,
            businessContext: glossaryTerm.businessContext,
            category: glossaryTerm.category,
          };
        }
      }
      // Fallback if content not found
      return { title: card.sourceId, description: 'Content not found', date: '' };
    },
    [milestoneMap, glossaryMap]
  );

  const cardContent = getCardContent(currentCard);

  // Handle card flip
  const handleFlip = useCallback(() => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  }, [isFlipped]);

  // Handle rating selection
  const handleRate = useCallback(
    (quality: QualityRating) => {
      if (!currentCard) return;

      // Record the review
      recordReview(currentCard.id, quality);
      setReviewedCount((prev) => prev + 1);

      // Track "Again" cards for repeat at end
      if (quality === 0) {
        setAgainCards((prev) => [...prev, currentCard.id]);
      }

      // Move to next card
      if (currentIndex < sessionCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        setIsComplete(true);
      }
    },
    [currentCard, currentIndex, sessionCards.length, recordReview]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComplete) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleFlip();
          break;
        case '1':
          if (isFlipped) handleRate(0);
          break;
        case '2':
          if (isFlipped) handleRate(3);
          break;
        case '3':
          if (isFlipped) handleRate(4);
          break;
        case '4':
          if (isFlipped) handleRate(5);
          break;
        case 'Escape':
          navigate('/study');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleRate, isFlipped, isComplete, navigate]);

  // Empty state - no due cards
  if (sessionCards.length === 0 && !isComplete) {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <RotateCcw className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            No cards to review
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {pack ? `No cards due in "${pack.name}".` : 'No cards due for review right now.'}
          </p>
          <Link
            to="/study"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Study Center
          </Link>
        </div>
      </div>
    );
  }

  // Session complete screen
  if (isComplete) {
    const successRate = reviewedCount > 0
      ? Math.round(((reviewedCount - againCards.length) / reviewedCount) * 100)
      : 0;
    const encouragingMessage = getEncouragingMessage(successRate, reviewedCount);

    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <span className="text-5xl">🎉</span>
          <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            Session Complete!
          </h2>

          {/* Encouraging message */}
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {encouragingMessage}
          </p>

          {/* Session stats */}
          <div className="mt-6 space-y-2 text-gray-600 dark:text-gray-400">
            <p>{reviewedCount} cards reviewed</p>
            <p>{reviewedCount - againCards.length} correct ({successRate}%)</p>
            {againCards.length > 0 && (
              <p className="text-orange-600 dark:text-orange-400">
                {againCards.length} to review again
              </p>
            )}
          </div>

          {/* Streak display */}
          {stats.currentStreak > 0 && (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-orange-50 px-4 py-3 dark:bg-orange-900/20">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="font-semibold text-orange-700 dark:text-orange-400">
                {stats.currentStreak} day streak!
              </span>
            </div>
          )}

          <div className="mt-8 space-y-3">
            {againCards.length > 0 && (
              <button
                onClick={() => {
                  // Reset session with again cards
                  const cardsToReview = sessionCards.filter((c) => againCards.includes(c.id));
                  setSessionCards(cardsToReview);
                  setCurrentIndex(0);
                  setIsFlipped(false);
                  setIsComplete(false);
                  setAgainCards([]);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-600"
              >
                <RotateCcw className="h-4 w-4" />
                Review Weak Cards ({againCards.length})
              </button>
            )}
            <Link
              to="/study"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Back to Study Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active session - card display
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/study"
          className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit
        </Link>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Card {currentIndex + 1} of {sessionCards.length}
        </div>
        <div className="w-24">
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-2 rounded-full bg-orange-500 transition-all"
              style={{ width: `${((currentIndex + 1) / sessionCards.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card with 3D flip animation */}
      <div
        onClick={handleFlip}
        className="cursor-pointer perspective-1000"
        style={{ minHeight: '300px', perspective: '1000px' }}
      >
        <div
          className={`relative h-full w-full transition-transform duration-500 ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Card Front */}
          <div
            className={`absolute inset-0 rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
              isFlipped ? 'invisible' : ''
            }`}
            style={{ backfaceVisibility: 'hidden', height: '320px' }}
          >
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {currentCard?.sourceType === 'milestone' ? '📅 Milestone' : '📖 Concept'}
              </p>
              <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                {milestonesLoading ? 'Loading...' : cardContent.title}
              </p>
              {cardContent.date && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {new Date(cardContent.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
              <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
                (tap or press space to reveal)
              </p>
            </div>
          </div>

          {/* Card Back */}
          <div
            className={`absolute inset-0 rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
              !isFlipped ? 'invisible' : ''
            }`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', height: '320px' }}
          >
            <div className="flex h-full flex-col text-center">
              {/* Scrollable content area */}
              <div
                className="flex-1 overflow-y-auto px-2"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  {milestonesLoading ? 'Loading...' : cardContent.description}
                </p>
                {cardContent.organization && (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    {cardContent.organization}
                  </p>
                )}
              </div>
              {/* Fixed footer with link */}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
                <Link
                  to={`/${currentCard?.sourceType === 'milestone' ? 'timeline' : 'glossary'}?highlight=${currentCard?.sourceId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                >
                  View Details <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Buttons - shown when flipped */}
      {isFlipped && (
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => handleRate(0)}
            title="I didn't know this. Show again soon."
            className="flex flex-col items-center gap-1 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400 dark:hover:border-red-700"
          >
            <span className="font-medium">Again</span>
            <span className="text-xs opacity-70">1</span>
          </button>
          <button
            onClick={() => handleRate(3)}
            title="Correct, but it was difficult to recall."
            className="flex flex-col items-center gap-1 rounded-lg border-2 border-orange-200 bg-orange-50 px-4 py-3 text-orange-700 transition-colors hover:border-orange-300 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:border-orange-700"
          >
            <span className="font-medium">Hard</span>
            <span className="text-xs opacity-70">2</span>
          </button>
          <button
            onClick={() => handleRate(4)}
            title="Correct with some hesitation."
            className="flex flex-col items-center gap-1 rounded-lg border-2 border-green-200 bg-green-50 px-4 py-3 text-green-700 transition-colors hover:border-green-300 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400 dark:hover:border-green-700"
          >
            <span className="font-medium">Good</span>
            <span className="text-xs opacity-70">3</span>
          </button>
          <button
            onClick={() => handleRate(5)}
            title="Perfect! I knew this instantly."
            className="flex flex-col items-center gap-1 rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:border-blue-700"
          >
            <span className="font-medium">Easy</span>
            <span className="text-xs opacity-70">4</span>
          </button>
        </div>
      )}

      {/* Keyboard hints */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Press <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">Space</kbd> to flip,
        <kbd className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">1-4</kbd> to rate,
        <kbd className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">Esc</kbd> to exit
      </p>
    </div>
  );
}

export default StudySession;

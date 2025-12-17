/**
 * Flashcard Deck Component
 *
 * Displays a deck of flashcards with term on front, definition on back.
 * Features flip animation, "Got it" / "Review again" buttons, and progress tracking.
 */

import { useState, useCallback, useMemo } from 'react';
import { RotateCcw, Check, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Flashcard } from '../../types/checkpoint';

interface FlashcardDeckProps {
  /** Array of flashcards to display */
  flashcards: Flashcard[];
  /** Title for the deck (optional) */
  title?: string;
  /** Callback when user marks a card as "Got it" */
  onGotIt?: (cardId: string) => void;
  /** Callback when user marks a card for review */
  onReviewAgain?: (cardId: string) => void;
  /** Callback when deck is completed */
  onComplete?: (stats: { gotIt: number; reviewAgain: number }) => void;
  /** Optional additional className */
  className?: string;
}

/**
 * Shuffle an array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }
  return shuffled;
}

/**
 * Flashcard Deck Component
 *
 * Features:
 * - Card flip animation (tap/click)
 * - "Got it" and "Review again" buttons
 * - Progress indicator
 * - Deck completion summary
 * - Option to restart or review missed cards
 */
export function FlashcardDeck({
  flashcards,
  title = 'Flashcards',
  onGotIt,
  onReviewAgain,
  onComplete,
  className = '',
}: FlashcardDeckProps) {
  // Shuffle cards on initial render
  const [shuffledCards] = useState<Flashcard[]>(() => shuffleArray(flashcards));

  // Current card index
  const [currentIndex, setCurrentIndex] = useState(0);
  // Whether current card is flipped
  const [isFlipped, setIsFlipped] = useState(false);
  // Track cards marked as "Got it"
  const [gotItCards, setGotItCards] = useState<Set<string>>(new Set());
  // Track cards marked for review
  const [reviewCards, setReviewCards] = useState<Set<string>>(new Set());
  // Whether deck is completed
  const [isComplete, setIsComplete] = useState(false);
  // Whether showing review mode (going through missed cards again)
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Current deck based on mode
  const currentDeck = useMemo(() => {
    if (isReviewMode) {
      return shuffledCards.filter((card) => reviewCards.has(card.id));
    }
    return shuffledCards;
  }, [shuffledCards, isReviewMode, reviewCards]);

  // Current card
  const currentCard = currentDeck[currentIndex];

  // Handle card flip
  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Check if we should complete the deck
  const checkCompletion = useCallback(
    (newGotIt: Set<string>, newReview: Set<string>) => {
      const totalAnswered = newGotIt.size + newReview.size;
      const currentDeckSize = isReviewMode
        ? reviewCards.size
        : shuffledCards.length;

      if (totalAnswered >= currentDeckSize || currentIndex >= currentDeck.length - 1) {
        if (isReviewMode) {
          // End of review mode
          setIsComplete(true);
          onComplete?.({
            gotIt: newGotIt.size,
            reviewAgain: newReview.size,
          });
        } else if (newReview.size === 0) {
          // All cards got it on first pass
          setIsComplete(true);
          onComplete?.({
            gotIt: newGotIt.size,
            reviewAgain: 0,
          });
        }
      }
    },
    [isReviewMode, reviewCards.size, shuffledCards.length, currentIndex, currentDeck.length, onComplete]
  );

  // Handle "Got it" action
  const handleGotIt = useCallback(() => {
    if (!currentCard) return;

    const newGotIt = new Set(gotItCards).add(currentCard.id);
    // Remove from review if it was there
    const newReview = new Set(reviewCards);
    newReview.delete(currentCard.id);

    setGotItCards(newGotIt);
    setReviewCards(newReview);
    setIsFlipped(false);
    onGotIt?.(currentCard.id);

    // Move to next card or check completion
    if (currentIndex < currentDeck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      checkCompletion(newGotIt, newReview);
      if (newReview.size > 0 && !isReviewMode) {
        // Start review mode
        setIsReviewMode(true);
        setCurrentIndex(0);
      } else {
        setIsComplete(true);
        onComplete?.({
          gotIt: newGotIt.size,
          reviewAgain: newReview.size,
        });
      }
    }
  }, [currentCard, gotItCards, reviewCards, currentIndex, currentDeck.length, isReviewMode, onGotIt, onComplete, checkCompletion]);

  // Handle "Review again" action
  const handleReviewAgain = useCallback(() => {
    if (!currentCard) return;

    const newReview = new Set(reviewCards).add(currentCard.id);
    setReviewCards(newReview);
    setIsFlipped(false);
    onReviewAgain?.(currentCard.id);

    // Move to next card
    if (currentIndex < currentDeck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (!isReviewMode) {
      // Start review mode
      setIsReviewMode(true);
      setCurrentIndex(0);
    } else {
      // End of review mode
      setIsComplete(true);
      onComplete?.({
        gotIt: gotItCards.size,
        reviewAgain: newReview.size,
      });
    }
  }, [currentCard, reviewCards, currentIndex, currentDeck.length, isReviewMode, gotItCards.size, onReviewAgain, onComplete]);

  // Navigate to previous card
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  // Navigate to next card
  const handleNext = useCallback(() => {
    if (currentIndex < currentDeck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, currentDeck.length]);

  // Restart the deck
  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setGotItCards(new Set());
    setReviewCards(new Set());
    setIsComplete(false);
    setIsReviewMode(false);
  }, []);

  // Progress calculation
  const progress = useMemo(() => {
    const total = shuffledCards.length;
    const answered = gotItCards.size + reviewCards.size;
    return Math.round((answered / total) * 100);
  }, [shuffledCards.length, gotItCards.size, reviewCards.size]);

  // Completion screen
  if (isComplete) {
    const totalCards = shuffledCards.length;
    const gotItCount = gotItCards.size;
    const percentage = Math.round((gotItCount / totalCards) * 100);

    return (
      <div className={`text-center space-y-6 ${className}`} data-testid="flashcard-deck-complete">
        <div className="text-6xl mb-4">
          {percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '📚'}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Deck Complete!
        </h2>
        <div className="space-y-2">
          <p className="text-gray-600 dark:text-gray-400">
            You got <span className="font-bold text-green-600 dark:text-green-400">{gotItCount}</span> of {totalCards} cards
          </p>
          <div className="text-4xl font-bold text-gray-900 dark:text-white">
            {percentage}%
          </div>
        </div>
        <button
          onClick={handleRestart}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          data-testid="restart-button"
        >
          <RefreshCw className="w-5 h-5" />
          Study Again
        </button>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className={`text-center ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No flashcards available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} data-testid="flashcard-deck">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {isReviewMode ? 'Review Mode' : title}
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {currentIndex + 1} / {currentDeck.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Flashcard */}
      <div className="perspective-1000">
        <button
          onClick={handleFlip}
          className={`
            w-full aspect-[3/2] rounded-2xl cursor-pointer transition-transform duration-500
            transform-style-preserve-3d relative
            ${isFlipped ? 'rotate-y-180' : ''}
          `}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
          data-testid="flashcard"
        >
          {/* Front (Term) */}
          <div
            className={`
              absolute inset-0 rounded-2xl p-6 flex flex-col items-center justify-center
              bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg
              backface-hidden
            `}
            style={{ backfaceVisibility: 'hidden' }}
            data-testid="flashcard-front"
          >
            <span className="text-xs uppercase tracking-wide opacity-70 mb-4">Term</span>
            <h4 className="text-2xl font-bold text-center">{currentCard.term}</h4>
            <span className="text-sm mt-4 opacity-70">(tap to flip)</span>
          </div>

          {/* Back (Definition) */}
          <div
            className={`
              absolute inset-0 rounded-2xl p-6 flex flex-col items-center justify-center
              bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg
              backface-hidden
            `}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
            data-testid="flashcard-back"
          >
            <span className="text-xs uppercase tracking-wide opacity-70 mb-4">Definition</span>
            <p className="text-lg text-center leading-relaxed">{currentCard.definition}</p>
          </div>
        </button>
      </div>

      {/* Navigation and action buttons */}
      <div className="flex items-center justify-between gap-4">
        {/* Navigation */}
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className={`
            p-2 rounded-lg transition-colors
            ${currentIndex === 0
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }
          `}
          aria-label="Previous card"
          data-testid="prev-button"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleReviewAgain}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
            data-testid="review-again-button"
          >
            <RotateCcw className="w-4 h-4" />
            Review Again
          </button>
          <button
            onClick={handleGotIt}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
            data-testid="got-it-button"
          >
            <Check className="w-4 h-4" />
            Got It
          </button>
        </div>

        {/* Navigation */}
        <button
          onClick={handleNext}
          disabled={currentIndex === currentDeck.length - 1}
          className={`
            p-2 rounded-lg transition-colors
            ${currentIndex === currentDeck.length - 1
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }
          `}
          aria-label="Next card"
          data-testid="next-button"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6 text-sm">
        <span className="text-green-600 dark:text-green-400">
          Got it: {gotItCards.size}
        </span>
        <span className="text-amber-600 dark:text-amber-400">
          Review: {reviewCards.size}
        </span>
      </div>
    </div>
  );
}

export default FlashcardDeck;

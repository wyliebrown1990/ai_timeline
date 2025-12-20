/**
 * EmptyState Component
 *
 * Enhanced empty state for the Study Dashboard when user has no flashcards.
 * Features:
 * - Value proposition explaining spaced repetition benefits
 * - Featured prebuilt deck suggestion (AI Essentials)
 * - Visual example showing what studying looks like
 * - Clear CTAs to get started
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Library,
  Brain,
  TrendingUp,
  Clock,
  ChevronRight,
  RotateCcw,
  Check,
  X as XIcon,
} from 'lucide-react';
import { usePrebuiltDecks } from '../../hooks';

// =============================================================================
// Types
// =============================================================================

export interface EmptyStateProps {
  /** Callback when user clicks "Browse Decks" */
  onBrowseDecks: () => void;
  /** Optional className */
  className?: string;
}

// =============================================================================
// Study Example Component
// =============================================================================

/**
 * Interactive example showing what flashcard studying looks like.
 * Demonstrates the flip animation and rating buttons.
 */
function StudyExample() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showRating, setShowRating] = useState(false);

  const handleFlip = () => {
    setIsFlipped(true);
    // Show rating buttons after flip
    setTimeout(() => setShowRating(true), 300);
  };

  const handleReset = () => {
    setIsFlipped(false);
    setShowRating(false);
  };

  return (
    <div className="relative">
      {/* Example Card */}
      <div
        className="relative mx-auto h-48 w-full max-w-xs cursor-pointer perspective-1000"
        onClick={!isFlipped ? handleFlip : undefined}
        data-testid="study-example-card"
      >
        <div
          className={`relative h-full w-full transition-transform duration-500 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front (Question) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 backface-hidden dark:border-orange-800 dark:from-orange-950/30 dark:to-amber-950/30">
            <span className="text-xs font-medium uppercase tracking-wide text-orange-600 dark:text-orange-400">
              Question
            </span>
            <p className="mt-2 text-center text-lg font-medium text-gray-900 dark:text-white">
              What is a Transformer?
            </p>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Tap to reveal answer
            </p>
          </div>

          {/* Back (Answer) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 backface-hidden rotate-y-180 dark:border-green-800 dark:from-green-950/30 dark:to-emerald-950/30">
            <span className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-400">
              Answer
            </span>
            <p className="mt-2 text-center text-sm text-gray-700 dark:text-gray-300">
              A neural network architecture that processes sequences in parallel using self-attention mechanisms.
            </p>
          </div>
        </div>
      </div>

      {/* Rating Buttons (shown after flip) */}
      {showRating && (
        <div className="mt-4 flex justify-center gap-2" data-testid="rating-buttons">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
          >
            <XIcon className="h-3 w-3" />
            Again
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-700 transition-colors hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
          >
            Hard
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
          >
            <Check className="h-3 w-3" />
            Good
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
          >
            Easy
          </button>
        </div>
      )}

      {/* Reset button */}
      {isFlipped && (
        <button
          onClick={handleReset}
          className="absolute -right-2 -top-2 rounded-full bg-gray-200 p-1 text-gray-600 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
          aria-label="Reset example"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Featured Deck Card
// =============================================================================

interface FeaturedDeckCardProps {
  onBrowseDecks: () => void;
}

/**
 * Displays a featured prebuilt deck with preview information.
 * Fetches the first available deck from the API.
 */
function FeaturedDeckCard({ onBrowseDecks }: FeaturedDeckCardProps) {
  const { data: decks, isLoading } = usePrebuiltDecks();

  // Get AI Essentials deck or fall back to first deck
  const featuredDeck = decks.find((d) => d.name === 'AI Essentials') || decks[0];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/50">
        <div className="animate-pulse space-y-3">
          <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-48 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  if (!featuredDeck) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900/50">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No decks available yet.
        </p>
        <button
          onClick={onBrowseDecks}
          className="mt-3 text-sm font-medium text-orange-500 hover:text-orange-600"
        >
          Browse Decks
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 dark:border-orange-800 dark:from-orange-950/20 dark:to-amber-950/20">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-xl dark:bg-orange-900/30">
            ⭐
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {featuredDeck.name}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {featuredDeck.cardCount} cards · ~{featuredDeck.estimatedMinutes} min
            </p>
          </div>
        </div>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Recommended
        </span>
      </div>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {featuredDeck.description}
      </p>
      <button
        onClick={onBrowseDecks}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        data-testid="featured-deck-cta"
      >
        <Library className="h-4 w-4" />
        Get Started with This Deck
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// =============================================================================
// Main EmptyState Component
// =============================================================================

/**
 * Enhanced empty state with value proposition, deck suggestion, and study preview.
 */
export function EmptyState({ onBrowseDecks, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}
      data-testid="empty-state"
    >
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
          <GraduationCap className="h-8 w-8 text-orange-500" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
          Welcome to the Study Center
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Master AI concepts with smart flashcards that adapt to your learning pace.
        </p>
      </div>

      {/* Value Proposition */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col items-center rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-900/50">
          <Brain className="h-6 w-6 text-purple-500" />
          <h4 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Spaced Repetition
          </h4>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Review cards at optimal intervals for long-term retention
          </p>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-900/50">
          <TrendingUp className="h-6 w-6 text-green-500" />
          <h4 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Track Progress
          </h4>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            See your streaks, mastery levels, and learning statistics
          </p>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-900/50">
          <Clock className="h-6 w-6 text-blue-500" />
          <h4 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Just Minutes a Day
          </h4>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Short daily sessions build lasting knowledge over time
          </p>
        </div>
      </div>

      {/* Two-column layout: Featured Deck + Study Example */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Featured Deck */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Recommended for You
          </h3>
          <FeaturedDeckCard onBrowseDecks={onBrowseDecks} />
        </div>

        {/* Study Example */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            What Studying Looks Like
          </h3>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <StudyExample />
            <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
              Tap the card to flip it, then rate how well you knew the answer.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTAs */}
      <div className="mt-8 flex flex-col items-center gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-center dark:border-gray-700">
        <button
          onClick={onBrowseDecks}
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          data-testid="browse-all-decks-button"
        >
          <Library className="h-4 w-4" />
          Browse All Decks
        </button>
        <Link
          to="/timeline"
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Explore Timeline
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default EmptyState;

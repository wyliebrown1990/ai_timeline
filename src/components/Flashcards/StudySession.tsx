/**
 * StudySession Component
 *
 * Active flashcard study session interface with:
 * - Card 3D flip animation with improved smoothness
 * - Rating buttons (Again, Hard, Good, Easy) with keyboard shortcuts
 * - Progress indicator with card count and progress bar
 * - Session completion screen with streak display and encouraging messages
 * - Sound effects option (off by default)
 * - Undo last rating (within 5 seconds)
 * - Time spent on current card display
 * - Skip for now functionality
 * - Pause/resume on tab visibility
 *
 * Accessibility features:
 * - Full keyboard navigation
 * - ARIA labels on all interactive elements
 * - Live region for screen reader announcements
 * - Reduce motion option (respects system preference)
 * - High contrast mode support
 * - Focus management
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCcw,
  ChevronRight,
  Flame,
  Volume2,
  VolumeX,
  Undo2,
  SkipForward,
  Clock,
  Pause,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useFlashcardContext } from '../../contexts/FlashcardContext';
import { useMilestones } from '../../hooks/useMilestones';
import { useGlossary } from '../../hooks';
import { useStudySettings } from '../../hooks/useStudySettings';
import { playSound, initAudio } from '../../lib/studySounds';
import type { UserFlashcard, QualityRating } from '../../types/flashcard';
import type { MilestoneResponse } from '../../types/milestone';
import type { GlossaryEntry } from '../../types/glossary';

// =============================================================================
// Constants
// =============================================================================

/** Time window (ms) during which undo is available */
const UNDO_WINDOW_MS = 5000;

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
    return 'Outstanding! You really know your stuff!';
  }
  if (successRate >= 75) {
    return 'Great job! Keep up the good work!';
  }
  if (successRate >= 50) {
    return 'Good progress! Practice makes perfect!';
  }
  return 'Keep learning! Every review helps!';
}

/**
 * Format seconds as mm:ss or ss.
 */
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// =============================================================================
// Types
// =============================================================================

export interface StudySessionProps {
  /** Optional pack ID to filter cards. If not provided, all due cards are studied */
  packId?: string;
}

/** Stores info needed to undo a rating */
interface UndoState {
  cardId: string;
  cardIndex: number;
  quality: QualityRating;
  timestamp: number;
  wasAgain: boolean;
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
  const { getDueCards, recordReview, undoLastReview, packs, stats } = useFlashcardContext();
  const {
    settings,
    toggleSound,
    toggleReduceMotion,
    toggleHighContrast,
    prefersReducedMotion,
    prefersHighContrast,
  } = useStudySettings();

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

  // UX enhancement state
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());
  const [cardElapsedSeconds, setCardElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [totalSessionTime, setTotalSessionTime] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Accessibility: screen reader announcement
  const [announcement, setAnnouncement] = useState('');

  // Refs for focus management and timers
  const cardRef = useRef<HTMLDivElement>(null);
  const firstRatingRef = useRef<HTMLButtonElement>(null);
  const cardTimerRef = useRef<number | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  // Get pack name for display
  const pack = packId ? packs.find((p) => p.id === packId) : null;

  // Announce to screen readers
  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    // Clear after announcement is read
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  // Initialize session with due cards
  useEffect(() => {
    const dueCards = getDueCards(packId);
    // Shuffle cards for variety
    const shuffled = [...dueCards].sort(() => Math.random() - 0.5);
    setSessionCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsComplete(shuffled.length === 0);
    setCardStartTime(Date.now());
    setCardElapsedSeconds(0);

    // Initialize audio on first user interaction
    initAudio();

    // Announce session start
    if (shuffled.length > 0) {
      announce(`Study session started. ${shuffled.length} cards to review.`);
    }
  }, [getDueCards, packId, announce]);

  // Card timer - updates every second
  useEffect(() => {
    if (isComplete || isPaused) {
      if (cardTimerRef.current) {
        clearInterval(cardTimerRef.current);
        cardTimerRef.current = null;
      }
      return;
    }

    cardTimerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - cardStartTime) / 1000);
      setCardElapsedSeconds(elapsed);
    }, 1000);

    return () => {
      if (cardTimerRef.current) {
        clearInterval(cardTimerRef.current);
      }
    };
  }, [cardStartTime, isComplete, isPaused]);

  // Page visibility - pause/resume on tab change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      } else {
        // Resume: adjust start time to account for pause
        setIsPaused(false);
        setCardStartTime(Date.now() - cardElapsedSeconds * 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [cardElapsedSeconds]);

  // Undo timer - clear undo state after window expires
  useEffect(() => {
    if (!undoState) return;

    const remaining = UNDO_WINDOW_MS - (Date.now() - undoState.timestamp);
    if (remaining <= 0) {
      setUndoState(null);
      return;
    }

    undoTimerRef.current = window.setTimeout(() => {
      setUndoState(null);
    }, remaining);

    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, [undoState]);

  // Focus management: focus card when it changes
  useEffect(() => {
    if (!isComplete && cardRef.current) {
      cardRef.current.focus();
    }
  }, [currentIndex, isComplete]);

  // Focus management: focus first rating button when flipped
  useEffect(() => {
    if (isFlipped && firstRatingRef.current) {
      firstRatingRef.current.focus();
    }
  }, [isFlipped]);

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
      if (settings.soundEnabled) {
        playSound('flip');
      }
      announce(`Card flipped. ${cardContent.description?.slice(0, 100)}...`);
    }
  }, [isFlipped, settings.soundEnabled, announce, cardContent.description]);

  // Handle rating selection
  const handleRate = useCallback(
    (quality: QualityRating) => {
      if (!currentCard) return;

      const ratingNames: Record<QualityRating, string> = {
        0: 'Again',
        1: 'Hard',
        2: 'Hard',
        3: 'Hard',
        4: 'Good',
        5: 'Easy',
      };

      // Store undo state before recording
      setUndoState({
        cardId: currentCard.id,
        cardIndex: currentIndex,
        quality,
        timestamp: Date.now(),
        wasAgain: quality === 0,
      });

      // Record the review
      recordReview(currentCard.id, quality);
      setReviewedCount((prev) => prev + 1);
      setTotalSessionTime((prev) => prev + cardElapsedSeconds);

      // Play sound based on rating
      if (settings.soundEnabled) {
        if (quality >= 4) {
          playSound('correct');
        } else if (quality === 0) {
          playSound('incorrect');
        }
      }

      // Track "Again" cards for repeat at end
      if (quality === 0) {
        setAgainCards((prev) => [...prev, currentCard.id]);
      }

      // Move to next card
      if (currentIndex < sessionCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
        setCardStartTime(Date.now());
        setCardElapsedSeconds(0);
        announce(`Rated ${ratingNames[quality]}. Card ${currentIndex + 2} of ${sessionCards.length}.`);
      } else {
        setIsComplete(true);
        announce('Session complete!');
      }
    },
    [currentCard, currentIndex, sessionCards.length, recordReview, settings.soundEnabled, cardElapsedSeconds, announce]
  );

  // Handle undo last rating
  const handleUndo = useCallback(() => {
    if (!undoState) return;

    // Call undo on the context
    undoLastReview(undoState.cardId);
    setReviewedCount((prev) => Math.max(0, prev - 1));

    // Remove from againCards if it was there
    if (undoState.wasAgain) {
      setAgainCards((prev) => prev.filter((id) => id !== undoState.cardId));
    }

    // Go back to that card
    setCurrentIndex(undoState.cardIndex);
    setIsFlipped(false);
    setIsComplete(false);
    setCardStartTime(Date.now());
    setCardElapsedSeconds(0);

    // Clear undo state
    setUndoState(null);
    announce('Rating undone. Review the card again.');
  }, [undoState, undoLastReview, announce]);

  // Handle skip for now (move card to end)
  const handleSkip = useCallback(() => {
    if (!currentCard || sessionCards.length <= 1) return;

    // Move current card to end
    setSessionCards((prev) => {
      const updated = [...prev];
      const skipped = updated.splice(currentIndex, 1)[0];
      if (skipped) {
        updated.push(skipped);
      }
      return updated;
    });

    // Reset for new card (index stays same since card was removed)
    setIsFlipped(false);
    setCardStartTime(Date.now());
    setCardElapsedSeconds(0);
    announce('Card skipped. Moved to end of queue.');
  }, [currentCard, currentIndex, sessionCards.length, announce]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComplete) return;

      // Don't trigger shortcuts when settings modal is open
      if (showSettings) return;

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
        case 'z':
          if ((e.ctrlKey || e.metaKey) && undoState) {
            e.preventDefault();
            handleUndo();
          }
          break;
        case 's':
          if (!isFlipped && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleSkip();
          }
          break;
        case 'Escape':
          if (showSettings) {
            setShowSettings(false);
          } else {
            navigate('/study');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleRate, handleUndo, handleSkip, isFlipped, isComplete, navigate, undoState, showSettings]);

  // High contrast class
  const highContrastClass = prefersHighContrast
    ? 'ring-2 ring-black dark:ring-white'
    : '';

  // Empty state - no due cards
  if (sessionCards.length === 0 && !isComplete) {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center" role="main" aria-label="No cards to review">
        <div className={`rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${highContrastClass}`}>
          <RotateCcw className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            No cards to review
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {pack ? `No cards due in "${pack.name}".` : 'No cards due for review right now.'}
          </p>
          <Link
            to="/study"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
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
      <div className="mx-auto max-w-lg space-y-6 text-center" role="main" aria-label="Session complete">
        <div className={`rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${highContrastClass}`}>
          <span className="text-5xl" role="img" aria-label="Celebration">🎉</span>
          <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            Session Complete!
          </h2>

          {/* Encouraging message */}
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {encouragingMessage}
          </p>

          {/* Session stats */}
          <div className="mt-6 space-y-2 text-gray-600 dark:text-gray-400" aria-label="Session statistics">
            <p>{reviewedCount} cards reviewed</p>
            <p>{reviewedCount - againCards.length} correct ({successRate}%)</p>
            {againCards.length > 0 && (
              <p className="text-orange-600 dark:text-orange-400">
                {againCards.length} to review again
              </p>
            )}
            {totalSessionTime > 0 && (
              <p className="text-sm">Total time: {formatTime(totalSessionTime)}</p>
            )}
          </div>

          {/* Streak display */}
          {stats.currentStreak > 0 && (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-orange-50 px-4 py-3 dark:bg-orange-900/20">
              <Flame className="h-5 w-5 text-orange-500" aria-hidden="true" />
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
                  setCardStartTime(Date.now());
                  setCardElapsedSeconds(0);
                  setTotalSessionTime(0);
                  announce(`Starting review of ${cardsToReview.length} weak cards.`);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Review Weak Cards ({againCards.length})
              </button>
            )}
            <Link
              to="/study"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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
    <div className="mx-auto max-w-2xl space-y-6" role="main" aria-label="Study session">
      {/* Screen reader live region for announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/study"
          className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg p-1 dark:text-gray-400 dark:hover:text-white"
          aria-label="Exit study session and return to Study Center"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Exit
        </Link>

        {/* Card counter and timer */}
        <div className="flex items-center gap-4">
          <div
            className="text-sm text-gray-600 dark:text-gray-400"
            aria-label={`Card ${currentIndex + 1} of ${sessionCards.length}`}
          >
            Card {currentIndex + 1} of {sessionCards.length}
          </div>
          <div
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
            aria-label={`Time on this card: ${formatTime(cardElapsedSeconds)}${isPaused ? ', paused' : ''}`}
            data-testid="card-timer"
          >
            {isPaused ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {formatTime(cardElapsedSeconds)}
          </div>
        </div>

        {/* Progress bar, sound toggle, and settings */}
        <div className="flex items-center gap-3">
          <div
            className="w-24"
            role="progressbar"
            aria-valuenow={currentIndex + 1}
            aria-valuemin={1}
            aria-valuemax={sessionCards.length}
            aria-label={`Progress: ${currentIndex + 1} of ${sessionCards.length} cards`}
          >
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-2 rounded-full bg-orange-500 ${prefersReducedMotion ? '' : 'transition-all duration-300'}`}
                style={{ width: `${((currentIndex + 1) / sessionCards.length) * 100}%` }}
              />
            </div>
          </div>
          <button
            onClick={toggleSound}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label={settings.soundEnabled ? 'Disable sound effects' : 'Enable sound effects'}
            aria-pressed={settings.soundEnabled}
            data-testid="sound-toggle"
          >
            {settings.soundEnabled ? (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Open accessibility settings"
            aria-expanded={showSettings}
            data-testid="settings-toggle"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Settings dropdown */}
      {showSettings && (
        <div
          className={`rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${highContrastClass}`}
          role="dialog"
          aria-label="Accessibility settings"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Accessibility Settings
          </h3>
          <div className="space-y-3">
            <button
              onClick={toggleReduceMotion}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-pressed={prefersReducedMotion}
            >
              <span className="flex items-center gap-2">
                {prefersReducedMotion ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Reduce Motion
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {settings.reduceMotion === 'system' ? 'System' : settings.reduceMotion ? 'On' : 'Off'}
              </span>
            </button>
            <button
              onClick={toggleHighContrast}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-pressed={prefersHighContrast}
            >
              <span>High Contrast</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {settings.highContrast === 'system' ? 'System' : settings.highContrast ? 'On' : 'Off'}
              </span>
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            &quot;System&quot; follows your OS preferences
          </p>
        </div>
      )}

      {/* Undo banner */}
      {undoState && (
        <div
          className={`flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2 dark:bg-blue-900/20 ${highContrastClass}`}
          role="alert"
          data-testid="undo-banner"
        >
          <span className="text-sm text-blue-700 dark:text-blue-400">
            Rated card - undo available
          </span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-800/50 dark:text-blue-300 dark:hover:bg-blue-800"
            aria-label="Undo last rating"
            data-testid="undo-button"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
            Undo
          </button>
        </div>
      )}

      {/* Card with improved 3D flip animation */}
      <div
        ref={cardRef}
        onClick={handleFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFlip();
          }
        }}
        className={`cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-xl ${highContrastClass}`}
        style={{ perspective: '1200px', minHeight: '320px' }}
        tabIndex={0}
        role="button"
        aria-label={isFlipped ? 'Card is flipped, showing answer' : `Flashcard: ${cardContent.title}. Press Enter or Space to flip and reveal answer.`}
        aria-pressed={isFlipped}
        data-testid="flashcard"
      >
        <div
          className={`relative h-full w-full ${prefersReducedMotion ? '' : 'transition-all duration-500 ease-out'} ${
            isFlipped && !prefersReducedMotion ? 'scale-[1.02]' : ''
          }`}
          style={{
            transformStyle: prefersReducedMotion ? undefined : 'preserve-3d',
            transform: prefersReducedMotion ? undefined : (isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'),
            transition: prefersReducedMotion ? undefined : 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
            // Performance: hint browser to prepare for transform animation
            willChange: prefersReducedMotion ? undefined : 'transform',
          }}
        >
          {/* Card Front - shown when not flipped or when reduce motion is on */}
          <div
            className={`${prefersReducedMotion ? '' : 'absolute inset-0'} rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
              prefersReducedMotion
                ? (isFlipped ? 'hidden' : '')
                : (isFlipped ? 'invisible' : 'hover:shadow-xl')
            } ${prefersHighContrast ? 'border-2 border-black dark:border-white' : ''}`}
            style={prefersReducedMotion ? undefined : {
              backfaceVisibility: 'hidden',
              height: '320px',
              // GPU acceleration for smoother animation
              transform: 'translateZ(0)',
            }}
            aria-hidden={isFlipped}
          >
            <div className="flex h-full flex-col items-center justify-center text-center" style={{ minHeight: prefersReducedMotion ? '280px' : undefined }}>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {currentCard?.sourceType === 'milestone' ? '📅 Milestone' : '📖 Concept'}
              </p>
              <p className={`mt-4 text-2xl font-bold text-gray-900 dark:text-white ${prefersHighContrast ? 'text-black dark:text-white' : ''}`}>
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

          {/* Card Back - shown when flipped */}
          <div
            className={`${prefersReducedMotion ? '' : 'absolute inset-0'} rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
              prefersReducedMotion
                ? (!isFlipped ? 'hidden' : '')
                : (!isFlipped ? 'invisible' : '')
            } ${prefersHighContrast ? 'border-2 border-black dark:border-white' : ''}`}
            style={prefersReducedMotion ? undefined : {
              backfaceVisibility: 'hidden',
              // Combine rotation with translateZ for GPU acceleration
              transform: 'rotateY(180deg) translateZ(0)',
              height: '320px',
            }}
            aria-hidden={!isFlipped}
          >
            <div className="flex h-full flex-col text-center" style={{ minHeight: prefersReducedMotion ? '280px' : undefined }}>
              {/* Scrollable content area */}
              <div
                className="flex-1 overflow-y-auto px-2"
                onClick={(e) => e.stopPropagation()}
              >
                <p className={`text-lg leading-relaxed ${prefersHighContrast ? 'text-black dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
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
                  className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded dark:text-orange-400 dark:hover:text-orange-300"
                >
                  View Details <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skip button - shown before flip */}
      {!isFlipped && sessionCards.length > 1 && (
        <div className="flex justify-center">
          <button
            onClick={handleSkip}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Skip this card and move it to the end of the queue"
            data-testid="skip-button"
          >
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            Skip for now
          </button>
        </div>
      )}

      {/* Rating Buttons - shown when flipped */}
      {isFlipped && (
        <div
          className="grid grid-cols-4 gap-3"
          role="group"
          aria-label="Rate how well you knew this card"
          data-testid="rating-buttons"
        >
          <button
            ref={firstRatingRef}
            onClick={() => handleRate(0)}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-red-700 hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400 dark:hover:border-red-700 ${
              prefersReducedMotion ? '' : 'transition-all duration-200 hover:scale-105 active:scale-95'
            } ${prefersHighContrast ? 'border-4' : ''}`}
            aria-label="Again - I didn't know this. Show again soon. Press 1"
            data-testid="rate-again"
          >
            <span className="font-medium">Again</span>
            <span className="text-xs opacity-70">1</span>
          </button>
          <button
            onClick={() => handleRate(3)}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 border-orange-200 bg-orange-50 px-4 py-3 text-orange-700 hover:border-orange-300 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:border-orange-700 ${
              prefersReducedMotion ? '' : 'transition-all duration-200 hover:scale-105 active:scale-95'
            } ${prefersHighContrast ? 'border-4' : ''}`}
            aria-label="Hard - Correct, but it was difficult to recall. Press 2"
            data-testid="rate-hard"
          >
            <span className="font-medium">Hard</span>
            <span className="text-xs opacity-70">2</span>
          </button>
          <button
            onClick={() => handleRate(4)}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 border-green-200 bg-green-50 px-4 py-3 text-green-700 hover:border-green-300 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400 dark:hover:border-green-700 ${
              prefersReducedMotion ? '' : 'transition-all duration-200 hover:scale-105 active:scale-95'
            } ${prefersHighContrast ? 'border-4' : ''}`}
            aria-label="Good - Correct with some hesitation. Press 3"
            data-testid="rate-good"
          >
            <span className="font-medium">Good</span>
            <span className="text-xs opacity-70">3</span>
          </button>
          <button
            onClick={() => handleRate(5)}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:border-blue-700 ${
              prefersReducedMotion ? '' : 'transition-all duration-200 hover:scale-105 active:scale-95'
            } ${prefersHighContrast ? 'border-4' : ''}`}
            aria-label="Easy - Perfect! I knew this instantly. Press 4"
            data-testid="rate-easy"
          >
            <span className="font-medium">Easy</span>
            <span className="text-xs opacity-70">4</span>
          </button>
        </div>
      )}

      {/* Keyboard hints */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400" aria-hidden="true">
        <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">Space</kbd> flip
        {!isFlipped && sessionCards.length > 1 && (
          <>
            {' · '}
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">S</kbd> skip
          </>
        )}
        {isFlipped && (
          <>
            {' · '}
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">1-4</kbd> rate
          </>
        )}
        {undoState && (
          <>
            {' · '}
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">⌘Z</kbd> undo
          </>
        )}
        {' · '}
        <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">Esc</kbd> exit
      </p>
    </div>
  );
}

export default StudySession;

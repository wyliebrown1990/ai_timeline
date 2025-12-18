/**
 * CardInsights Component
 *
 * Displays card performance insights in three categories:
 * - Most Challenging: cards with lowest ease factor (hardest to remember)
 * - Well Known: cards with highest intervals (best retention)
 * - Needs Review: cards that are overdue for review
 *
 * Each card is clickable to view details or start a study session.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Trophy, Clock, BookOpen, ChevronRight } from 'lucide-react';
import type { UserFlashcard } from '../../types/flashcard';
import {
  getMostChallengingCards,
  getWellKnownCards,
  getOverdueCards,
} from '../../lib/flashcardStats';

// =============================================================================
// Types
// =============================================================================

export interface CardInsightsProps {
  /** Array of user flashcards */
  cards: UserFlashcard[];
  /** Number of cards to show per category (default: 3) */
  limit?: number;
  /** Optional additional CSS classes */
  className?: string;
}

/** Category type for display */
type InsightCategory = 'challenging' | 'wellKnown' | 'overdue';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format card source ID for display
 * Removes prefix and converts underscores to spaces
 */
function formatCardName(sourceId: string): string {
  return sourceId.replace(/^[A-Z]+\d*_/, '').replace(/_/g, ' ');
}

/**
 * Calculate days overdue for a card
 */
function getDaysOverdue(card: UserFlashcard): number {
  if (!card.nextReviewDate) return 0;
  const now = new Date();
  const reviewDate = new Date(card.nextReviewDate);
  const diffMs = now.getTime() - reviewDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Format interval as human-readable string
 */
function formatInterval(days: number): string {
  if (days === 0) return 'New';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
}

/**
 * Get badge color based on ease factor
 */
function getEaseFactorColor(easeFactor: number): string {
  if (easeFactor < 1.8) return 'text-red-600 dark:text-red-400';
  if (easeFactor < 2.2) return 'text-amber-600 dark:text-amber-400';
  return 'text-green-600 dark:text-green-400';
}

// =============================================================================
// InsightCard Component
// =============================================================================

interface InsightCardProps {
  card: UserFlashcard;
  category: InsightCategory;
}

function InsightCard({ card, category }: InsightCardProps) {
  const daysOverdue = getDaysOverdue(card);

  // Metadata based on category
  const metadata = useMemo(() => {
    switch (category) {
      case 'challenging':
        return {
          label: 'Ease',
          value: card.easeFactor.toFixed(2),
          colorClass: getEaseFactorColor(card.easeFactor),
        };
      case 'wellKnown':
        return {
          label: 'Interval',
          value: formatInterval(card.interval),
          colorClass: 'text-green-600 dark:text-green-400',
        };
      case 'overdue':
        return {
          label: 'Overdue',
          value: daysOverdue === 0 ? 'Due now' : `${daysOverdue}d`,
          colorClass: daysOverdue > 7 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400',
        };
    }
  }, [card, category, daysOverdue]);

  return (
    <Link
      to={`/study/session?card=${card.id}`}
      className="group flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 transition-colors hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-800/80"
      data-testid={`insight-card-${card.id}`}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <BookOpen className="h-4 w-4 flex-shrink-0 text-gray-400" />
        <span
          className="truncate text-sm font-medium text-gray-700 dark:text-gray-300"
          title={card.sourceId}
        >
          {formatCardName(card.sourceId)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${metadata.colorClass}`}>
          {metadata.value}
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

// =============================================================================
// InsightSection Component
// =============================================================================

interface InsightSectionProps {
  title: string;
  icon: React.ReactNode;
  cards: UserFlashcard[];
  category: InsightCategory;
  emptyMessage: string;
  accentColor: string;
}

function InsightSection({
  title,
  icon,
  cards,
  category,
  emptyMessage,
  accentColor,
}: InsightSectionProps) {
  return (
    <div data-testid={`insight-section-${category}`}>
      {/* Section header */}
      <div className="mb-2 flex items-center gap-2">
        <span className={accentColor}>{icon}</span>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {title}
        </h4>
        {cards.length > 0 && (
          <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {cards.length}
          </span>
        )}
      </div>

      {/* Cards list */}
      {cards.length > 0 ? (
        <ul className="space-y-1.5">
          {cards.map((card) => (
            <li key={card.id}>
              <InsightCard card={card} category={category} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-center text-xs text-gray-400 dark:text-gray-500">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// CardInsights Component
// =============================================================================

/**
 * Displays card performance insights with three categories:
 * Most Challenging, Well Known, and Needs Review.
 *
 * @example
 * ```tsx
 * import { CardInsights } from './CardInsights';
 *
 * <CardInsights cards={userCards} limit={3} />
 * ```
 */
export function CardInsights({
  cards,
  limit = 3,
  className = '',
}: CardInsightsProps) {
  // Calculate card categories
  const { challenging, wellKnown, overdue } = useMemo(() => {
    return {
      challenging: getMostChallengingCards(cards, limit),
      wellKnown: getWellKnownCards(cards, limit),
      overdue: getOverdueCards(cards).slice(0, limit),
    };
  }, [cards, limit]);

  // Check if there's any data to show
  const hasAnyData = challenging.length > 0 || wellKnown.length > 0 || overdue.length > 0;
  const hasReviewedCards = cards.some((c) => c.lastReviewedAt !== null);

  return (
    <div className={className} data-testid="card-insights">
      {hasAnyData ? (
        <div className="space-y-5">
          {/* Most Challenging */}
          <InsightSection
            title="Most Challenging"
            icon={<AlertTriangle className="h-4 w-4" />}
            cards={challenging}
            category="challenging"
            emptyMessage="No challenging cards yet"
            accentColor="text-red-500"
          />

          {/* Needs Review (Overdue) */}
          <InsightSection
            title="Needs Review"
            icon={<Clock className="h-4 w-4" />}
            cards={overdue}
            category="overdue"
            emptyMessage="All caught up!"
            accentColor="text-amber-500"
          />

          {/* Well Known */}
          <InsightSection
            title="Well Known"
            icon={<Trophy className="h-4 w-4" />}
            cards={wellKnown}
            category="wellKnown"
            emptyMessage="Keep studying to master cards"
            accentColor="text-green-500"
          />
        </div>
      ) : (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8 dark:border-gray-600 dark:bg-gray-900/50"
          data-testid="insights-empty"
        >
          <BookOpen className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {hasReviewedCards ? 'No insights available' : 'Review cards to see insights'}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Study more to discover patterns
          </p>
        </div>
      )}

      {/* Study weak cards button */}
      {challenging.length > 0 && (
        <Link
          to="/study/session?filter=challenging"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30"
          data-testid="study-weak-cards"
        >
          <AlertTriangle className="h-4 w-4" />
          Study Weak Cards
        </Link>
      )}
    </div>
  );
}

export default CardInsights;

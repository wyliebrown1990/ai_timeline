/**
 * PackCard Component
 *
 * Displays a flashcard pack in a card format with:
 * - Pack name with color indicator
 * - Total cards and due cards count
 * - Click navigation to pack detail
 * - "Study This Pack" quick action button
 * - Visual distinction for system vs custom packs
 */

import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import type { FlashcardPack } from '../../types/flashcard';

// =============================================================================
// Types
// =============================================================================

export interface PackCardProps {
  /** The flashcard pack to display */
  pack: FlashcardPack;
  /** Total number of cards in this pack */
  totalCards: number;
  /** Number of cards due for review */
  dueCards: number;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * PackCard displays a single flashcard pack with its stats and actions.
 *
 * Features:
 * - Color indicator matching pack color
 * - Card count and due count display
 * - System badge for default packs
 * - Study button when cards are due
 * - Links to pack detail page
 *
 * @example
 * ```tsx
 * <PackCard
 *   pack={pack}
 *   totalCards={15}
 *   dueCards={3}
 * />
 * ```
 */
export function PackCard({ pack, totalCards, dueCards, className = '' }: PackCardProps) {
  return (
    <div
      className={`group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-orange-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-600 ${className}`}
      data-testid={`pack-card-${pack.id}`}
    >
      {/* Pack header - links to pack detail page */}
      <Link to={`/study/packs/${pack.id}`} className="block">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {/* Color indicator */}
            <span
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: pack.color }}
              aria-hidden="true"
            />
            {/* Pack name */}
            <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">
              {pack.name}
            </h3>
          </div>
          {/* System badge for default packs */}
          {pack.isDefault && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400 flex-shrink-0">
              System
            </span>
          )}
        </div>

        {/* Card counts */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {totalCards} {totalCards === 1 ? 'card' : 'cards'}
          </span>
          {dueCards > 0 && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {dueCards} due
            </span>
          )}
        </div>
      </Link>

      {/* Study button - shown when cards are due */}
      {dueCards > 0 && (
        <Link
          to={`/study/session/${pack.id}`}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50"
          data-testid={`study-pack-${pack.id}`}
        >
          <Play className="h-3 w-3" />
          Study This Pack
        </Link>
      )}
    </div>
  );
}

export default PackCard;

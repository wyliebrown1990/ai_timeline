/**
 * AddToFlashcardButton Component
 *
 * A button to add or remove milestones/concepts from the user's flashcard collection.
 * Supports icon-only and button-with-text variants, and multiple sizes.
 */

import { useState, useCallback } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useFlashcardContext } from '../../contexts/FlashcardContext';
import type { UserFlashcard } from '../../types/flashcard';

// =============================================================================
// Types
// =============================================================================

export interface AddToFlashcardButtonProps {
  /** Type of content being saved */
  sourceType: UserFlashcard['sourceType'];
  /** ID of the milestone or concept */
  sourceId: string;
  /** Display variant: icon-only or button with text */
  variant?: 'icon' | 'button';
  /** Size variant for different contexts */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Callback after save/unsave action */
  onToggle?: (isSaved: boolean) => void;
}

// =============================================================================
// Size Configuration
// =============================================================================

const sizeConfig = {
  sm: {
    icon: 'w-4 h-4',
    button: 'px-2 py-1 text-xs gap-1',
    iconOnly: 'p-1.5',
  },
  md: {
    icon: 'w-5 h-5',
    button: 'px-3 py-1.5 text-sm gap-1.5',
    iconOnly: 'p-2',
  },
  lg: {
    icon: 'w-6 h-6',
    button: 'px-4 py-2 text-base gap-2',
    iconOnly: 'p-2.5',
  },
} as const;

// =============================================================================
// Component
// =============================================================================

/**
 * Button to add/remove content from flashcards.
 *
 * @example
 * ```tsx
 * // Icon-only variant for timeline cards
 * <AddToFlashcardButton
 *   sourceType="milestone"
 *   sourceId="E2017_TRANSFORMER"
 *   variant="icon"
 *   size="sm"
 * />
 *
 * // Button variant for detail panels
 * <AddToFlashcardButton
 *   sourceType="milestone"
 *   sourceId="E2017_TRANSFORMER"
 *   variant="button"
 *   size="md"
 * />
 * ```
 */
export function AddToFlashcardButton({
  sourceType,
  sourceId,
  variant = 'icon',
  size = 'md',
  className = '',
  onToggle,
}: AddToFlashcardButtonProps) {
  const { isCardSaved, addCard, removeCard, getCardBySource } = useFlashcardContext();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const isSaved = isCardSaved(sourceType, sourceId);
  const config = sizeConfig[size];

  // Handle click to toggle save state
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent triggering parent click handlers

      if (isSaved) {
        // Remove from flashcards
        const card = getCardBySource(sourceType, sourceId);
        if (card) {
          removeCard(card.id);
          onToggle?.(false);
        }
      } else {
        // Add to flashcards
        const newCard = addCard(sourceType, sourceId);
        if (newCard) {
          // Trigger brief animation
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 300);
          onToggle?.(true);
        }
      }
    },
    [isSaved, sourceType, sourceId, getCardBySource, removeCard, addCard, onToggle]
  );

  // Handle keyboard interaction
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick(e as unknown as React.MouseEvent);
      }
    },
    [handleClick]
  );

  // Tooltip text
  const tooltipText = isSaved ? 'Remove from Flashcards' : 'Add to Flashcards';

  // Button text for button variant
  const buttonText = isSaved ? 'In Flashcards' : 'Add to Flashcards';

  // Common icon props
  const IconComponent = isSaved ? BookmarkCheck : Bookmark;
  const iconElement = (
    <IconComponent
      className={`
        ${config.icon}
        transition-all duration-200
        ${isSaved ? 'fill-current' : ''}
        ${isAnimating ? 'scale-125' : ''}
      `}
      aria-hidden="true"
    />
  );

  // Render icon-only variant
  if (variant === 'icon') {
    return (
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          className={`
            ${config.iconOnly}
            inline-flex items-center justify-center
            rounded-lg
            transition-all duration-200
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            ${
              isSaved
                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
            }
            ${className}
          `}
          aria-label={tooltipText}
          aria-pressed={isSaved}
          data-testid={`add-to-flashcard-button-${sourceType}-${sourceId}`}
        >
          {iconElement}

          {/* Success checkmark animation */}
          {isAnimating && (
            <span
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              aria-hidden="true"
            >
              <span className="w-6 h-6 rounded-full bg-green-500/20 animate-ping" />
            </span>
          )}
        </button>

        {/* Tooltip */}
        {showTooltip && (
          <div
            role="tooltip"
            className="
              absolute bottom-full left-1/2 -translate-x-1/2 mb-2
              z-50 pointer-events-none
              animate-in fade-in-0 zoom-in-95 duration-200
            "
          >
            <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
              {tooltipText}
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render button variant with text
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={`
          ${config.button}
          inline-flex items-center justify-center
          rounded-lg font-medium
          transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          ${
            isSaved
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
          }
          ${className}
        `}
        aria-label={tooltipText}
        aria-pressed={isSaved}
        data-testid={`add-to-flashcard-button-${sourceType}-${sourceId}`}
      >
        {iconElement}
        <span>{buttonText}</span>

        {/* Success animation overlay */}
        {isAnimating && (
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-lg overflow-hidden"
            aria-hidden="true"
          >
            <span className="absolute inset-0 bg-green-500/10 animate-pulse" />
          </span>
        )}
      </button>

      {/* Tooltip - shows additional context for button variant */}
      {showTooltip && isSaved && (
        <div
          role="tooltip"
          className="
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2
            z-50 pointer-events-none
            animate-in fade-in-0 zoom-in-95 duration-200
          "
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
            Click to remove
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddToFlashcardButton;

/**
 * DeckLibrary Component
 *
 * Displays prebuilt flashcard decks for users to browse and add to their collection.
 * Features:
 * - Grid of prebuilt decks with descriptions and card counts
 * - Difficulty badges (beginner, intermediate, advanced)
 * - Preview modal showing 3 sample cards before adding
 * - "Add to My Collection" button with duplicate detection
 * - Visual indicator for already-added decks
 */

import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Library, Plus, Check, Clock, Eye, X, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useFlashcardContext } from '../../contexts/FlashcardContext';
import { useGlossary, usePrebuiltDecks } from '../../hooks';
import { useMilestones } from '../../hooks/useMilestones';
import type { PrebuiltDeck, PrebuiltDeckCard } from '../../services/api';
import type { GlossaryEntry } from '../../types/glossary';
import type { MilestoneResponse } from '../../types/milestone';

// =============================================================================
// Import Result Types
// =============================================================================

/**
 * Result of importing a deck, including stats about what was added.
 */
interface DeckImportResult {
  deckId: string;
  deckName: string;
  newCardsAdded: number;
  existingCardsLinked: number;
  skippedCards: number;
  totalCards: number;
}

// =============================================================================
// Types
// =============================================================================

export interface DeckLibraryProps {
  /** Optional callback when a deck is added with import results */
  onDeckAdded?: (result: DeckImportResult) => void;
  /** Optional additional CSS classes */
  className?: string;
}

interface PreviewModalProps {
  deck: PrebuiltDeck;
  previewCards: Array<{ term: string; definition: string }>;
  isAdded: boolean;
  existingCardsCount: number;
  onClose: () => void;
  onAddDeck: (addMissingOnly: boolean) => void;
}

interface ConfirmationModalProps {
  result: DeckImportResult;
  onClose: () => void;
}

// =============================================================================
// Difficulty Badge Component
// =============================================================================

/**
 * Displays a colored badge for deck difficulty level.
 */
type DeckDifficulty = 'beginner' | 'intermediate' | 'advanced';

function DifficultyBadge({ difficulty }: { difficulty: DeckDifficulty }) {
  const config = {
    beginner: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      label: 'Beginner',
    },
    intermediate: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'Intermediate',
    },
    advanced: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      label: 'Advanced',
    },
  };

  const { bg, text, label } = config[difficulty];

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

// =============================================================================
// Confirmation Modal Component
// =============================================================================

/**
 * Modal showing the results of importing a deck.
 * Displays count of new cards added and existing cards linked.
 */
function ConfirmationModal({ result, onClose }: ConfirmationModalProps) {
  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Success icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>

        {/* Title */}
        <h2
          id="confirmation-modal-title"
          className="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-white"
        >
          Deck Added Successfully!
        </h2>

        {/* Results */}
        <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">{result.deckName}</span> has been added to your collection.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {result.newCardsAdded > 0 && (
              <li className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-green-500" />
                <span>{result.newCardsAdded} new cards added</span>
              </li>
            )}
            {result.existingCardsLinked > 0 && (
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-500" />
                <span>{result.existingCardsLinked} existing cards linked to pack</span>
              </li>
            )}
            {result.skippedCards > 0 && (
              <li className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>{result.skippedCards} cards skipped (content not found)</span>
              </li>
            )}
          </ul>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          data-testid="confirmation-close-button"
        >
          Got it!
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// =============================================================================
// Preview Modal Component
// =============================================================================

/**
 * Modal showing 3 sample cards from a deck before adding.
 * Uses React Portal to render at document.body level.
 * Shows option to add missing cards only if deck is partially added.
 */
function PreviewModal({
  deck,
  previewCards,
  isAdded,
  existingCardsCount,
  onClose,
  onAddDeck,
}: PreviewModalProps) {
  // Determine if this is a partial add scenario
  const isPartiallyAdded = existingCardsCount > 0 && existingCardsCount < deck.cardCount;
  const missingCardsCount = deck.cardCount - existingCardsCount;
  // Handle escape key to close
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2
              id="preview-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {deck.name}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Preview: 3 sample cards
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview cards */}
        <div className="space-y-3 p-6">
          {previewCards.map((card, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50"
            >
              <p className="font-medium text-gray-900 dark:text-white">{card.term}</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {card.definition}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium">{deck.cardCount}</span> cards total
            {existingCardsCount > 0 && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                ({existingCardsCount} already in your collection)
              </span>
            )}
          </div>

          {isAdded ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Check className="h-4 w-4" />
              Already Added
            </div>
          ) : isPartiallyAdded ? (
            /* Partial add scenario - show both options */
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onAddDeck(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                data-testid={`add-missing-deck-${deck.id}`}
              >
                <Plus className="h-4 w-4" />
                Add {missingCardsCount} Missing Cards
              </button>
              <button
                onClick={() => onAddDeck(false)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                data-testid={`add-all-deck-${deck.id}`}
              >
                Add All {deck.cardCount} Cards to New Pack
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAddDeck(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
              data-testid={`add-deck-${deck.id}`}
            >
              <Plus className="h-4 w-4" />
              Add to My Collection
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// =============================================================================
// Deck Card Component
// =============================================================================

interface DeckCardProps {
  deck: PrebuiltDeck;
  isAdded: boolean;
  existingCardsCount: number;
  onPreview: () => void;
  onAddDeck: (addMissingOnly: boolean) => void;
}

/**
 * Single deck card in the library grid.
 */
function DeckCard({ deck, isAdded, existingCardsCount, onPreview, onAddDeck }: DeckCardProps) {
  // Determine if this is a partial add scenario
  const isPartiallyAdded = existingCardsCount > 0 && existingCardsCount < deck.cardCount;
  return (
    <div
      className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-orange-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-600"
      data-testid={`deck-card-${deck.id}`}
    >
      {/* Header with name and difficulty */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">{deck.name}</h3>
        </div>
        <DifficultyBadge difficulty={deck.difficulty} />
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
        {deck.description}
      </p>

      {/* Stats row */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <BookOpen className="h-4 w-4" />
          {deck.cardCount} cards
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          ~{deck.estimatedMinutes} min
        </span>
      </div>

      {/* Existing cards indicator */}
      {existingCardsCount > 0 && !isAdded && (
        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
          {existingCardsCount} of {deck.cardCount} cards already in collection
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onPreview}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          data-testid={`preview-deck-${deck.id}`}
        >
          <Eye className="h-4 w-4" />
          Preview
        </button>
        {isAdded ? (
          <div
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
            data-testid={`deck-added-${deck.id}`}
          >
            <Check className="h-4 w-4" />
            Added
          </div>
        ) : isPartiallyAdded ? (
          <button
            onClick={() => onAddDeck(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
            data-testid={`add-deck-button-${deck.id}`}
          >
            <Plus className="h-4 w-4" />
            Add Missing
          </button>
        ) : (
          <button
            onClick={() => onAddDeck(false)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
            data-testid={`add-deck-button-${deck.id}`}
          >
            <Plus className="h-4 w-4" />
            Add Deck
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main DeckLibrary Component
// =============================================================================

/**
 * DeckLibrary displays available prebuilt decks for users to browse and add.
 *
 * @example
 * ```tsx
 * <DeckLibrary
 *   onDeckAdded={(deckId, count) => console.log(`Added ${count} cards from ${deckId}`)}
 * />
 * ```
 */
export function DeckLibrary({ onDeckAdded, className = '' }: DeckLibraryProps) {
  const { cards, addCard, createPack, packs, moveCardToPack } = useFlashcardContext();
  const { data: glossaryTerms } = useGlossary();
  const { data: milestones } = useMilestones({ limit: 1000 });
  const { data: prebuiltDecks, isLoading: isLoadingDecks } = usePrebuiltDecks();

  // Modal states
  const [previewDeck, setPreviewDeck] = useState<PrebuiltDeck | null>(null);
  const [importResult, setImportResult] = useState<DeckImportResult | null>(null);

  // Create lookup maps for content
  const glossaryMap = useMemo(() => {
    const map = new Map<string, GlossaryEntry>();
    if (glossaryTerms) {
      glossaryTerms.forEach((g) => map.set(g.id, g));
    }
    return map;
  }, [glossaryTerms]);

  const milestoneMap = useMemo(() => {
    const map = new Map<string, MilestoneResponse>();
    if (milestones) {
      milestones.forEach((m) => map.set(m.id, m));
    }
    return map;
  }, [milestones]);

  /**
   * Resolve a PrebuiltDeckCard to its term and definition.
   */
  const resolveCardContent = useCallback(
    (card: PrebuiltDeckCard): { term: string; definition: string } => {
      // Custom cards have inline content
      if (card.sourceType === 'custom' && card.customTerm && card.customDefinition) {
        return { term: card.customTerm, definition: card.customDefinition };
      }

      // Concept cards reference glossary terms
      if (card.sourceType === 'concept' && card.sourceId) {
        const glossaryTerm = glossaryMap.get(card.sourceId);
        if (glossaryTerm) {
          return { term: glossaryTerm.term, definition: glossaryTerm.shortDefinition };
        }
      }

      // Milestone cards reference milestones
      if (card.sourceType === 'milestone' && card.sourceId) {
        const milestone = milestoneMap.get(card.sourceId);
        if (milestone) {
          return { term: milestone.title, definition: milestone.description };
        }
      }

      // Fallback for unresolved content
      return {
        term: card.customTerm || card.sourceId || 'Unknown',
        definition: card.customDefinition || 'Content not found'
      };
    },
    [glossaryMap, milestoneMap]
  );

  /**
   * Check if a deck has been added to the user's collection.
   * A deck is considered "added" if a pack with the deck's name exists.
   */
  const isDeckAdded = useCallback(
    (deck: PrebuiltDeck): boolean => {
      // Check if there's a pack with this deck's name
      return packs.some((p) => p.name === deck.name && !p.isDefault);
    },
    [packs]
  );

  /**
   * Count how many cards from a deck already exist in user's collection.
   */
  const getExistingCardsCount = useCallback(
    (deck: PrebuiltDeck): number => {
      if (!deck.cards) return 0;

      let count = 0;
      for (const deckCard of deck.cards) {
        if (deckCard.sourceType === 'custom') continue;

        const sourceType = deckCard.sourceType === 'concept' ? 'concept' : 'milestone';
        const sourceId = deckCard.sourceId || '';

        if (!sourceId) continue;

        const existingCard = cards.find(
          (c) => c.sourceType === sourceType && c.sourceId === sourceId
        );

        if (existingCard) count++;
      }
      return count;
    },
    [cards]
  );

  /**
   * Add a prebuilt deck to the user's collection.
   * Creates a new pack and adds all cards to it.
   * @param deck - The prebuilt deck to add
   * @param addMissingOnly - If true, only adds cards not already in collection (no new pack)
   */
  const handleAddDeck = useCallback(
    (deck: PrebuiltDeck, addMissingOnly: boolean = false) => {
      if (!deck.cards) return;

      // Track import statistics
      let newCardsAdded = 0;
      let existingCardsLinked = 0;
      let skippedCards = 0;

      // Create a new pack for this deck (unless adding missing only to existing cards)
      let packId: string | null = null;
      if (!addMissingOnly) {
        const newPack = createPack(deck.name, deck.description);
        packId = newPack.id;
      }

      // Add each card from the deck
      for (const deckCard of deck.cards) {
        // Determine sourceType and sourceId for the card
        let sourceType: 'milestone' | 'concept';
        let sourceId: string;

        if (deckCard.sourceType === 'custom') {
          // Custom cards are skipped - they require backend support to persist
          skippedCards++;
          continue;
        } else if (deckCard.sourceType === 'concept') {
          sourceType = 'concept';
          sourceId = deckCard.sourceId || '';

          // Verify the concept exists in glossary
          if (!sourceId || !glossaryMap.has(sourceId)) {
            skippedCards++;
            continue;
          }
        } else {
          sourceType = 'milestone';
          sourceId = deckCard.sourceId || '';

          // Verify the milestone exists
          if (!sourceId || !milestoneMap.has(sourceId)) {
            skippedCards++;
            continue;
          }
        }

        // Check if card already exists in user's collection
        const existingCard = cards.find(
          (c) => c.sourceType === sourceType && c.sourceId === sourceId
        );

        if (existingCard) {
          // Card exists - link it to the new pack if we created one
          if (packId && !existingCard.packIds.includes(packId)) {
            moveCardToPack(existingCard.id, packId);
            existingCardsLinked++;
          }
        } else {
          // Add new card to the collection
          const newCard = addCard(sourceType, sourceId, packId ? [packId] : undefined);
          if (newCard) {
            newCardsAdded++;
          }
        }
      }

      // Close preview modal
      setPreviewDeck(null);

      // Create result object
      const result: DeckImportResult = {
        deckId: deck.id,
        deckName: deck.name,
        newCardsAdded,
        existingCardsLinked,
        skippedCards,
        totalCards: deck.cardCount,
      };

      // Show confirmation modal
      setImportResult(result);

      // Notify caller
      onDeckAdded?.(result);
    },
    [cards, addCard, createPack, moveCardToPack, glossaryMap, milestoneMap, onDeckAdded]
  );

  /**
   * Get preview cards with resolved content.
   * Returns the first 3 cards from the deck.
   */
  const getResolvedPreviewCards = useCallback(
    (deck: PrebuiltDeck): Array<{ term: string; definition: string }> => {
      if (!deck.cards) return [];
      // Get first 3 cards for preview
      const previewCards = deck.cards.slice(0, 3);
      return previewCards.map(resolveCardContent);
    },
    [resolveCardContent]
  );

  // Loading state
  if (isLoadingDecks) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-3">
          <Library className="h-6 w-6 text-orange-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Deck Library
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Curated flashcard decks to accelerate your learning
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Library className="h-6 w-6 text-orange-500" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Deck Library
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Curated flashcard decks to accelerate your learning
          </p>
        </div>
      </div>

      {/* Empty state */}
      {prebuiltDecks.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-400">No decks available yet.</p>
        </div>
      )}

      {/* Deck grid */}
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="deck-library-grid"
      >
        {prebuiltDecks.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            isAdded={isDeckAdded(deck)}
            existingCardsCount={getExistingCardsCount(deck)}
            onPreview={() => setPreviewDeck(deck)}
            onAddDeck={(addMissingOnly) => handleAddDeck(deck, addMissingOnly)}
          />
        ))}
      </div>

      {/* Preview modal */}
      {previewDeck && (
        <PreviewModal
          deck={previewDeck}
          previewCards={getResolvedPreviewCards(previewDeck)}
          isAdded={isDeckAdded(previewDeck)}
          existingCardsCount={getExistingCardsCount(previewDeck)}
          onClose={() => setPreviewDeck(null)}
          onAddDeck={(addMissingOnly) => handleAddDeck(previewDeck, addMissingOnly)}
        />
      )}

      {/* Confirmation modal */}
      {importResult && (
        <ConfirmationModal
          result={importResult}
          onClose={() => setImportResult(null)}
        />
      )}
    </div>
  );
}

export type { DeckImportResult };
export default DeckLibrary;

/**
 * PathFlashcardsModal Component
 *
 * Modal that allows users to create flashcards from a completed learning path.
 * Features:
 * - Lists all milestones and concepts from the path
 * - Checkboxes to select/deselect items
 * - Creates a pack named after the path
 * - Shows confirmation with count of cards added
 */

import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  BookOpen,
  Lightbulb,
  Check,
  Plus,
  Bookmark,
} from 'lucide-react';
import { useFlashcardContext } from '../../contexts/FlashcardContext';
import { useGlossary } from '../../hooks/useContent';
import { useMilestones } from '../../hooks/useMilestones';
import type { LearningPath } from '../../types/learningPath';
import type { GlossaryEntry } from '../../types/glossary';
import type { MilestoneResponse } from '../../types/milestone';

// =============================================================================
// Types
// =============================================================================

export interface PathFlashcardsModalProps {
  /** The completed learning path */
  path: LearningPath;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Optional callback when flashcards are created */
  onFlashcardsCreated?: (packId: string, cardsAdded: number) => void;
}

interface SelectableItem {
  id: string;
  type: 'milestone' | 'concept';
  title: string;
  description: string;
  selected: boolean;
  alreadySaved: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Modal for creating flashcards from a completed learning path.
 * Displays milestones and concepts with selection checkboxes.
 */
export function PathFlashcardsModal({
  path,
  onClose,
  onFlashcardsCreated,
}: PathFlashcardsModalProps) {
  const { cards, addCard, createPack, isCardSaved, moveCardToPack } = useFlashcardContext();
  const { data: glossaryTerms } = useGlossary();
  const { data: milestones } = useMilestones({ limit: 1000 });

  // Track creation state
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [creationResult, setCreationResult] = useState<{
    packId: string;
    cardsAdded: number;
    cardsLinked: number;
  } | null>(null);

  // Create lookup maps
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

  // Build selectable items list from path milestones and concepts
  const initialItems = useMemo((): SelectableItem[] => {
    const items: SelectableItem[] = [];

    // Add milestones
    for (const milestoneId of path.milestoneIds) {
      const milestone = milestoneMap.get(milestoneId);
      if (milestone) {
        items.push({
          id: milestoneId,
          type: 'milestone',
          title: milestone.title,
          description: milestone.description,
          selected: true, // Auto-select all by default
          alreadySaved: isCardSaved('milestone', milestoneId),
        });
      }
    }

    // Add concepts
    for (const conceptId of path.conceptsCovered) {
      const concept = glossaryMap.get(conceptId);
      if (concept) {
        items.push({
          id: conceptId,
          type: 'concept',
          title: concept.term,
          description: concept.shortDefinition,
          selected: true, // Auto-select all by default
          alreadySaved: isCardSaved('concept', conceptId),
        });
      }
    }

    return items;
  }, [path, milestoneMap, glossaryMap, isCardSaved]);

  // Manage selection state
  const [items, setItems] = useState<SelectableItem[]>(initialItems);

  // Toggle item selection
  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  }, []);

  // Select/deselect all
  const selectAll = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: true })));
  }, []);

  const deselectAll = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: false })));
  }, []);

  // Count selected items
  const selectedCount = items.filter((i) => i.selected).length;
  const newCardsCount = items.filter((i) => i.selected && !i.alreadySaved).length;
  const existingCardsCount = items.filter((i) => i.selected && i.alreadySaved).length;

  // Create flashcards from selected items
  const handleCreateFlashcards = useCallback(() => {
    setIsCreating(true);

    // Create a new pack named after the path
    const packName = `${path.title} Flashcards`;
    const newPack = createPack(packName, `Flashcards from completing "${path.title}"`);

    let cardsAdded = 0;
    let cardsLinked = 0;

    // Add selected items as flashcards
    for (const item of items) {
      if (!item.selected) continue;

      const sourceType = item.type;
      const sourceId = item.id;

      // Check if card already exists
      const existingCard = cards.find(
        (c) => c.sourceType === sourceType && c.sourceId === sourceId
      );

      if (existingCard) {
        // Link existing card to the new pack
        if (!existingCard.packIds.includes(newPack.id)) {
          moveCardToPack(existingCard.id, newPack.id);
          cardsLinked++;
        }
      } else {
        // Add new card
        const newCard = addCard(sourceType, sourceId, [newPack.id]);
        if (newCard) {
          cardsAdded++;
        }
      }
    }

    setCreationResult({
      packId: newPack.id,
      cardsAdded,
      cardsLinked,
    });
    setShowSuccess(true);
    setIsCreating(false);

    // Notify parent
    onFlashcardsCreated?.(newPack.id, cardsAdded + cardsLinked);
  }, [items, path.title, cards, addCard, createPack, moveCardToPack, onFlashcardsCreated]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Success view
  if (showSuccess && creationResult) {
    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        onKeyDown={handleKeyDown}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Success content */}
        <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>

          <h2 className="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-white">
            Flashcards Created!
          </h2>

          <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Your <span className="font-semibold">{path.title} Flashcards</span> pack is ready.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {creationResult.cardsAdded > 0 && (
                <li className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-500" />
                  {creationResult.cardsAdded} new cards added
                </li>
              )}
              {creationResult.cardsLinked > 0 && (
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-500" />
                  {creationResult.cardsLinked} existing cards linked
                </li>
              )}
            </ul>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
            data-testid="path-flashcards-done-button"
          >
            Start Studying
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // Selection view
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="path-flashcards-title"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Bookmark className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2
                id="path-flashcards-title"
                className="font-semibold text-gray-900 dark:text-white"
              >
                Create Flashcards
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                from {path.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selection controls */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-900/50">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedCount} of {items.length} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Select All
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              onClick={deselectAll}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {/* Milestones section */}
            {items.filter((i) => i.type === 'milestone').length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <BookOpen className="h-4 w-4" />
                  Milestones
                </div>
                {items
                  .filter((i) => i.type === 'milestone')
                  .map((item) => (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        item.selected
                          ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20'
                          : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItem(item.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.title}
                          </span>
                          {item.alreadySaved && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              Already saved
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  ))}
              </div>
            )}

            {/* Concepts section */}
            {items.filter((i) => i.type === 'concept').length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <Lightbulb className="h-4 w-4" />
                  Concepts
                </div>
                {items
                  .filter((i) => i.type === 'concept')
                  .map((item) => (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        item.selected
                          ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20'
                          : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItem(item.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.title}
                          </span>
                          {item.alreadySaved && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              Already saved
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            {newCardsCount > 0 && (
              <span>{newCardsCount} new cards will be added</span>
            )}
            {newCardsCount > 0 && existingCardsCount > 0 && <span>, </span>}
            {existingCardsCount > 0 && (
              <span>{existingCardsCount} existing cards will be linked</span>
            )}
            {selectedCount === 0 && <span>Select items to create flashcards</span>}
          </div>

          <button
            onClick={handleCreateFlashcards}
            disabled={selectedCount === 0 || isCreating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="create-path-flashcards-button"
          >
            <Bookmark className="h-4 w-4" />
            {isCreating ? 'Creating...' : `Create ${selectedCount} Flashcards`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PathFlashcardsModal;

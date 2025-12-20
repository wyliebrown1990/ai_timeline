/**
 * PackManager Component
 *
 * Displays and manages cards within a specific flashcard pack.
 * Features include:
 * - List of all cards in the pack with search
 * - Swipe to remove card on mobile
 * - Bulk select and move cards between packs
 * - Remove card from pack
 * - Edit pack name and color
 * - Delete pack
 * - Start study session for this pack
 */

import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Trash2,
  Edit2,
  Calendar,
  BookOpen,
  Search,
  X,
  CheckSquare,
  Square,
  FolderInput,
  Check,
} from 'lucide-react';
import { useFlashcardContext } from '../../contexts/FlashcardContext';
import { useMilestones } from '../../hooks/useMilestones';
import { useGlossary } from '../../hooks';
import { SwipeableCard } from './SwipeableCard';
import { VirtualizedCardList } from './VirtualizedCardList';
import type { UserFlashcard } from '../../types/flashcard';
import type { MilestoneResponse } from '../../types/milestone';
import type { GlossaryEntry } from '../../types/glossary';

/** Threshold for virtualization - lists smaller than this render normally */
const VIRTUALIZATION_THRESHOLD = 30;
/** Estimated card item height in pixels */
const CARD_ITEM_HEIGHT = 72;

// =============================================================================
// Types
// =============================================================================

interface CardsListProps {
  filteredCards: UserFlashcard[];
  packCards: UserFlashcard[];
  pack: { isDefault: boolean };
  milestoneMap: Map<string, MilestoneResponse>;
  glossaryMap: Map<string, GlossaryEntry>;
  isSelectionMode: boolean;
  selectedCards: Set<string>;
  onToggleSelection: (cardId: string) => void;
  onRemoveCard: (cardId: string) => void;
}

export interface PackManagerProps {
  /** ID of the pack to manage */
  packId: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get card title from content data.
 */
function getCardTitle(
  card: UserFlashcard,
  milestoneMap: Map<string, MilestoneResponse>,
  glossaryMap: Map<string, GlossaryEntry>
): string {
  if (card.sourceType === 'milestone') {
    const milestone = milestoneMap.get(card.sourceId);
    return milestone?.title || card.sourceId;
  }
  const glossary = glossaryMap.get(card.sourceId);
  return glossary?.term || card.sourceId;
}

/**
 * Format date for display.
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Due now';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 30) return `In ${Math.round(diffDays / 7)} weeks`;
  return `In ${Math.round(diffDays / 30)} months`;
}

// =============================================================================
// CardsList Component - Uses virtualization for large lists
// =============================================================================

function CardsList({
  filteredCards,
  packCards,
  pack,
  milestoneMap,
  glossaryMap,
  isSelectionMode,
  selectedCards,
  onToggleSelection,
  onRemoveCard,
}: CardsListProps) {
  // Render a single card item
  const renderCardItem = useCallback(
    (card: UserFlashcard) => {
      const isDue = card.nextReviewDate
        ? new Date(card.nextReviewDate) <= new Date()
        : true;
      const title = getCardTitle(card, milestoneMap, glossaryMap);
      const isSelected = selectedCards.has(card.id);

      const cardContent = (
        <div
          className={`flex items-center justify-between rounded-lg border bg-white p-4 dark:bg-gray-800 ${
            isSelected
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
              : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-3">
            {isSelectionMode && (
              <button
                onClick={() => onToggleSelection(card.id)}
                className="text-gray-400 hover:text-orange-500"
                data-testid={`select-card-${card.id}`}
              >
                {isSelected ? (
                  <CheckSquare className="h-5 w-5 text-orange-500" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
              </button>
            )}
            {card.sourceType === 'milestone' ? (
              <Calendar className="h-5 w-5 text-gray-400" />
            ) : (
              <BookOpen className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {card.sourceType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm ${isDue ? 'font-medium text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {card.nextReviewDate ? formatDate(card.nextReviewDate) : 'New'}
            </span>
            {!pack.isDefault && !isSelectionMode && (
              <button
                onClick={() => onRemoveCard(card.id)}
                className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700 dark:hover:text-red-400"
                title="Remove from pack"
                data-testid={`remove-card-${card.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      );

      // Wrap in swipeable on mobile for non-default packs
      if (!pack.isDefault && !isSelectionMode) {
        return (
          <SwipeableCard onDelete={() => onRemoveCard(card.id)}>
            {cardContent}
          </SwipeableCard>
        );
      }

      return cardContent;
    },
    [milestoneMap, glossaryMap, selectedCards, isSelectionMode, pack.isDefault, onToggleSelection, onRemoveCard]
  );

  const shouldVirtualize = filteredCards.length >= VIRTUALIZATION_THRESHOLD;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          {filteredCards.length === packCards.length
            ? 'Cards'
            : `${filteredCards.length} of ${packCards.length} cards`}
        </span>
        <span>Next Review</span>
      </div>

      {shouldVirtualize ? (
        <VirtualizedCardList
          items={filteredCards}
          itemHeight={CARD_ITEM_HEIGHT}
          threshold={VIRTUALIZATION_THRESHOLD}
          keyExtractor={(card) => card.id}
          renderItem={renderCardItem}
          className="space-y-2"
        />
      ) : (
        <ul className="space-y-2" data-testid="cards-list">
          {filteredCards.map((card) => (
            <li key={card.id}>{renderCardItem(card)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Pack management component for viewing and managing cards in a pack.
 */
export function PackManager({ packId }: PackManagerProps) {
  const navigate = useNavigate();
  const {
    packs,
    getDueCards,
    getCardsByPack,
    removeCardFromPack,
    deletePack,
    moveCardToPack,
  } = useFlashcardContext();

  // Content lookups
  const { data: milestones } = useMilestones({ limit: 1000 });
  const { data: glossaryTerms } = useGlossary();

  // Create lookup maps
  const milestoneMap = useMemo(() => {
    const map = new Map<string, MilestoneResponse>();
    milestones?.forEach((m) => map.set(m.id, m));
    return map;
  }, [milestones]);

  const glossaryMap = useMemo(() => {
    const map = new Map<string, GlossaryEntry>();
    glossaryTerms?.forEach((g) => map.set(g.id, g));
    return map;
  }, [glossaryTerms]);

  // Local state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Find the pack
  const pack = packs.find((p) => p.id === packId);
  const packCards = getCardsByPack(packId);
  const dueCards = getDueCards(packId);

  // Filter cards by search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return packCards;

    const query = searchQuery.toLowerCase();
    return packCards.filter((card) => {
      const title = getCardTitle(card, milestoneMap, glossaryMap).toLowerCase();
      return title.includes(query) || card.sourceId.toLowerCase().includes(query);
    });
  }, [packCards, searchQuery, milestoneMap, glossaryMap]);

  // Get other packs for move destination (exclude current pack and default packs that can't receive moves)
  const movablePacks = useMemo(() => {
    return packs.filter((p) => p.id !== packId);
  }, [packs, packId]);

  // Pack not found
  if (!pack) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pack not found</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          This pack may have been deleted.
        </p>
        <Link
          to="/study"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Study Center
        </Link>
      </div>
    );
  }

  // Handle pack deletion
  const handleDelete = () => {
    deletePack(packId);
    navigate('/study');
  };

  // Handle card removal from pack
  const handleRemoveCard = (cardId: string) => {
    removeCardFromPack(cardId, packId);
    setSelectedCards((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  };

  // Toggle card selection
  const toggleCardSelection = (cardId: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  // Select all filtered cards
  const selectAll = () => {
    setSelectedCards(new Set(filteredCards.map((c) => c.id)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedCards(new Set());
  };

  // Cancel selection mode
  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedCards(new Set());
  };

  // Move selected cards to another pack
  const handleMoveCards = (targetPackId: string) => {
    selectedCards.forEach((cardId) => {
      moveCardToPack(cardId, targetPackId);
    });
    setShowMoveModal(false);
    setSelectedCards(new Set());
    setIsSelectionMode(false);
  };

  // Remove selected cards from this pack
  const handleRemoveSelected = () => {
    selectedCards.forEach((cardId) => {
      removeCardFromPack(cardId, packId);
    });
    setSelectedCards(new Set());
    setIsSelectionMode(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/study"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: pack.color }}
              aria-hidden="true"
            />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{pack.name}</h1>
          </div>
          {pack.isDefault && (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              System
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {dueCards.length > 0 && (
            <Link
              to={`/study/session/${packId}`}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
            >
              <Play className="h-4 w-4" />
              Study Pack
            </Link>
          )}
        </div>
      </div>

      {/* Pack info */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>{packCards.length} cards</span>
          <span>•</span>
          <span>{dueCards.length} due</span>
          {pack.description && (
            <>
              <span>•</span>
              <span>{pack.description}</span>
            </>
          )}
        </div>
      </div>

      {/* Search and Selection Controls */}
      {packCards.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-10 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              data-testid="pack-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Selection Mode Toggle */}
          {!pack.isDefault && (
            <div className="flex items-center gap-2">
              {isSelectionMode ? (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedCards.size} selected
                  </span>
                  <button
                    onClick={selectAll}
                    className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    Clear
                  </button>
                  <button
                    onClick={cancelSelection}
                    className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsSelectionMode(true)}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  data-testid="select-mode-button"
                >
                  <CheckSquare className="h-4 w-4" />
                  Select
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {isSelectionMode && selectedCards.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-orange-50 px-4 py-3 dark:bg-orange-900/20">
          <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
            {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMoveModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
              data-testid="move-cards-button"
            >
              <FolderInput className="h-4 w-4" />
              Move to Pack
            </button>
            <button
              onClick={handleRemoveSelected}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
              data-testid="remove-selected-button"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Cards List */}
      {packCards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <p className="text-gray-600 dark:text-gray-400">No cards in this pack yet.</p>
          <Link
            to="/timeline"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Add cards from Timeline
          </Link>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <p className="text-gray-600 dark:text-gray-400">
            No cards match &quot;{searchQuery}&quot;
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Clear search
          </button>
        </div>
      ) : (
        <CardsList
          filteredCards={filteredCards}
          packCards={packCards}
          pack={pack}
          milestoneMap={milestoneMap}
          glossaryMap={glossaryMap}
          isSelectionMode={isSelectionMode}
          selectedCards={selectedCards}
          onToggleSelection={toggleCardSelection}
          onRemoveCard={handleRemoveCard}
        />
      )}

      {/* Pack Actions - only for custom packs */}
      {!pack.isDefault && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-700">
          <button
            className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            onClick={() => {
              // TODO: Open edit modal
            }}
          >
            <Edit2 className="h-4 w-4" />
            Edit Pack
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-sm text-red-600 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
            Delete Pack
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Pack?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Cards will be removed from this pack but remain in your collection.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Pack Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Move {selectedCards.size} Card{selectedCards.size !== 1 ? 's' : ''} to Pack
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Select a destination pack:
            </p>
            <ul className="mt-4 max-h-60 space-y-2 overflow-y-auto">
              {movablePacks.length === 0 ? (
                <li className="text-sm text-gray-500 dark:text-gray-400">
                  No other packs available. Create a new pack first.
                </li>
              ) : (
                movablePacks.map((targetPack) => (
                  <li key={targetPack.id}>
                    <button
                      onClick={() => handleMoveCards(targetPack.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-700/50 dark:hover:bg-gray-700"
                      data-testid={`move-to-${targetPack.id}`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: targetPack.color }}
                      />
                      <span className="flex-1 font-medium text-gray-900 dark:text-white">
                        {targetPack.name}
                      </span>
                      <Check className="h-4 w-4 text-gray-400" />
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-6">
              <button
                onClick={() => setShowMoveModal(false)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PackManager;

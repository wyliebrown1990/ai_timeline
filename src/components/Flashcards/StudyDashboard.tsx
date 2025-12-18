/**
 * StudyDashboard Component
 *
 * Main dashboard for the Study Center showing:
 * - Cards due today with call-to-action
 * - Current study streak
 * - Grid of user's flashcard packs with sort and drag-to-reorder
 * - Quick stats summary
 */

import { useState, useMemo, useCallback, useRef, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Flame,
  Plus,
  Play,
  BarChart3,
  Library,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { useFlashcardContext } from '../../contexts/FlashcardContext';
import { PackCard } from './PackCard';
import { CreatePackModal } from './CreatePackModal';
import { DeckLibrary } from './DeckLibrary';
import { EmptyState } from './EmptyState';
import { StorageWarningBanner } from './StorageWarningBanner';
import { useStorageError } from '../../hooks/useStorageError';
import type { FlashcardPack } from '../../types/flashcard';

// =============================================================================
// Types
// =============================================================================

type SortOption = 'custom' | 'name' | 'cardCount' | 'dueCount';

interface SortConfig {
  label: string;
  sortFn: (
    a: FlashcardPack,
    b: FlashcardPack,
    getCardCount: (packId: string) => number,
    getDueCount: (packId: string) => number
  ) => number;
}

// =============================================================================
// Sort Options
// =============================================================================

const SORT_OPTIONS: Record<SortOption, SortConfig> = {
  custom: {
    label: 'Custom Order',
    sortFn: () => 0, // Keep original order
  },
  name: {
    label: 'Name (A-Z)',
    sortFn: (a, b) => a.name.localeCompare(b.name),
  },
  cardCount: {
    label: 'Most Cards',
    sortFn: (a, b, getCardCount) => getCardCount(b.id) - getCardCount(a.id),
  },
  dueCount: {
    label: 'Most Due',
    sortFn: (a, b, _, getDueCount) => getDueCount(b.id) - getDueCount(a.id),
  },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Study dashboard displaying user's flashcard collection and study options.
 */
export function StudyDashboard() {
  const {
    cards,
    packs,
    stats,
    dueToday,
    hasCards,
    getDueCards,
    reorderPacks,
  } = useFlashcardContext();

  // Storage error handling
  const { warnings, dismissWarning, usingFallback } = useStorageError();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showDeckLibrary, setShowDeckLibrary] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('custom');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Drag and drop state
  const [draggedPackId, setDraggedPackId] = useState<string | null>(null);
  const [dragOverPackId, setDragOverPackId] = useState<string | null>(null);
  const dragCounter = useRef(0);

  // Helper functions for sorting
  const getCardCount = useCallback(
    (packId: string) => cards.filter((c) => c.packIds.includes(packId)).length,
    [cards]
  );

  const getDueCount = useCallback(
    (packId: string) => getDueCards(packId).length,
    [getDueCards]
  );

  // Sort packs based on current sort option
  const sortedPacks = useMemo(() => {
    if (sortBy === 'custom') {
      return packs;
    }
    const sortConfig = SORT_OPTIONS[sortBy];
    return [...packs].sort((a, b) =>
      sortConfig.sortFn(a, b, getCardCount, getDueCount)
    );
  }, [packs, sortBy, getCardCount, getDueCount]);

  // Get mastered cards count
  const masteredCount = stats.masteredCards;

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, packId: string) => {
      // Only allow drag reorder in custom sort mode
      if (sortBy !== 'custom') return;

      setDraggedPackId(packId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', packId);

      // Add drag styling
      const target = e.currentTarget;
      requestAnimationFrame(() => {
        target.style.opacity = '0.5';
      });
    },
    [sortBy]
  );

  const handleDragEnd = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    setDraggedPackId(null);
    setDragOverPackId(null);
    dragCounter.current = 0;
  }, []);

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>, packId: string) => {
      e.preventDefault();
      dragCounter.current++;

      if (packId !== draggedPackId) {
        setDragOverPackId(packId);
      }
    },
    [draggedPackId]
  );

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverPackId(null);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetPackId: string) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDragOverPackId(null);

      if (!draggedPackId || draggedPackId === targetPackId) {
        setDraggedPackId(null);
        return;
      }

      // Calculate new order
      const currentOrder = packs.map((p) => p.id);
      const draggedIndex = currentOrder.indexOf(draggedPackId);
      const targetIndex = currentOrder.indexOf(targetPackId);

      if (draggedIndex === -1 || targetIndex === -1) {
        setDraggedPackId(null);
        return;
      }

      // Remove dragged item and insert at target position
      const newOrder = [...currentOrder];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedPackId);

      reorderPacks(newOrder);
      setDraggedPackId(null);
    },
    [draggedPackId, packs, reorderPacks]
  );

  return (
    <div className="space-y-8">
      {/* Storage Warnings */}
      <StorageWarningBanner warnings={warnings} onDismiss={dismissWarning} />

      {/* Fallback indicator (subtle) */}
      {usingFallback && warnings.length === 0 && (
        <div className="text-center text-xs text-gray-400 dark:text-gray-500">
          Using temporary storage - changes may not persist
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-orange-500" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Study Center</h1>
        </div>
        <div className="flex items-center gap-2" role="toolbar" aria-label="Study Center actions">
          <Link
            to="/study/stats"
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            data-testid="stats-link"
            aria-label="View study statistics"
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Stats</span>
          </Link>
          <button
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => setShowDeckLibrary(!showDeckLibrary)}
            data-testid="browse-decks-button"
            aria-label="Browse prebuilt decks"
            aria-expanded={showDeckLibrary}
          >
            <Library className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Browse Decks</span>
          </button>
          <button
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="new-pack-button"
            aria-label="Create new pack"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">New Pack</span>
          </button>
        </div>
      </div>

      {/* Deck Library Section - Collapsible */}
      {showDeckLibrary && (
        <DeckLibrary
          onDeckAdded={() => setShowDeckLibrary(false)}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        />
      )}

      {/* Main Content */}
      {!hasCards ? (
        /* Empty State - Enhanced with value proposition, deck suggestions, and study preview */
        <EmptyState onBrowseDecks={() => setShowDeckLibrary(true)} />
      ) : (
        <>
          {/* Due Cards + Streak Row */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cards Due Today */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="text-center">
                <p className="text-4xl font-bold text-orange-500">{dueToday}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {dueToday === 1 ? 'card due' : 'cards due'} today
                </p>
              </div>
              {dueToday > 0 ? (
                <Link
                  to="/study/session"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                  aria-label={`Start studying ${dueToday} ${dueToday === 1 ? 'card' : 'cards'} due today`}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Start Studying
                </Link>
              ) : (
                <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-center text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  All caught up! Check back tomorrow.
                </div>
              )}
            </div>

            {/* Streak */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800" aria-label={`Study streak: ${stats.currentStreak} days`}>
              <div className="flex items-center justify-center gap-2">
                <Flame className={`h-8 w-8 ${stats.currentStreak > 0 ? 'text-orange-500' : 'text-gray-400'}`} aria-hidden="true" />
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {stats.currentStreak}
                </span>
              </div>
              <p className="mt-1 text-center text-sm text-gray-600 dark:text-gray-400">
                day {stats.currentStreak === 1 ? 'streak' : 'streak'}
              </p>
              {stats.longestStreak > stats.currentStreak && (
                <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-500">
                  Best: {stats.longestStreak} days
                </p>
              )}
            </div>
          </div>

          {/* Your Packs */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Packs</h2>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  data-testid="sort-dropdown-button"
                  aria-haspopup="listbox"
                  aria-expanded={showSortDropdown}
                  aria-label={`Sort packs by: ${SORT_OPTIONS[sortBy].label}`}
                >
                  {SORT_OPTIONS[sortBy].label}
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>

                {showSortDropdown && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSortDropdown(false)}
                      aria-hidden="true"
                    />
                    {/* Dropdown */}
                    <div
                      className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                      role="listbox"
                      aria-label="Sort options"
                    >
                      {(Object.keys(SORT_OPTIONS) as SortOption[]).map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setSortBy(option);
                            setShowSortDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                            sortBy === option
                              ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                              : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                          data-testid={`sort-option-${option}`}
                          role="option"
                          aria-selected={sortBy === option}
                        >
                          {SORT_OPTIONS[option].label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Drag hint */}
            {sortBy === 'custom' && packs.length > 1 && (
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Drag packs to reorder
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPacks.map((pack) => {
                const packCardCount = getCardCount(pack.id);
                const packDue = getDueCount(pack.id);
                const isDragTarget = dragOverPackId === pack.id;
                const isDragging = draggedPackId === pack.id;

                return (
                  <div
                    key={pack.id}
                    draggable={sortBy === 'custom'}
                    onDragStart={(e) => handleDragStart(e, pack.id)}
                    onDragEnd={handleDragEnd}
                    onDragEnter={(e) => handleDragEnter(e, pack.id)}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, pack.id)}
                    className={`relative transition-transform ${
                      sortBy === 'custom' ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${isDragTarget ? 'scale-105' : ''} ${isDragging ? 'opacity-50' : ''}`}
                    data-testid={`pack-draggable-${pack.id}`}
                  >
                    {/* Drag handle indicator */}
                    {sortBy === 'custom' && (
                      <div
                        className="absolute -left-2 top-1/2 z-10 -translate-y-1/2 rounded bg-gray-200 p-1 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-700 sm:opacity-50"
                        aria-label="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      </div>
                    )}

                    {/* Drop indicator */}
                    {isDragTarget && (
                      <div className="absolute inset-0 rounded-xl border-2 border-dashed border-orange-500 bg-orange-50/50 dark:bg-orange-900/20" />
                    )}

                    <PackCard
                      pack={pack}
                      totalCards={packCardCount}
                      dueCards={packDue}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Stats</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• {cards.length} total cards</li>
              <li>• {masteredCount} cards mastered (review interval &gt; 21 days)</li>
              {stats.cardsReviewedToday > 0 && (
                <li>• {stats.cardsReviewedToday} reviewed today</li>
              )}
            </ul>
          </div>
        </>
      )}

      {/* Create Pack Modal */}
      <CreatePackModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

export default StudyDashboard;

/**
 * PackManager Component
 *
 * Displays and manages cards within a specific flashcard pack.
 * Features include:
 * - List of all cards in the pack
 * - Remove card from pack
 * - Edit pack name and color
 * - Delete pack
 * - Start study session for this pack
 *
 * This is a placeholder component that will be fully implemented in Sprint 23.10.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Trash2, Edit2, Calendar, BookOpen } from 'lucide-react';
import { useFlashcardContext } from '../../contexts/FlashcardContext';

// =============================================================================
// Types
// =============================================================================

export interface PackManagerProps {
  /** ID of the pack to manage */
  packId: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Pack management component for viewing and managing cards in a pack.
 */
export function PackManager({ packId }: PackManagerProps) {
  const navigate = useNavigate();
  const { packs, getDueCards, getCardsByPack, removeCardFromPack, deletePack } =
    useFlashcardContext();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Find the pack
  const pack = packs.find((p) => p.id === packId);
  const packCards = getCardsByPack(packId);
  const dueCards = getDueCards(packId);

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
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Due now';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.round(diffDays / 7)} weeks`;
    return `In ${Math.round(diffDays / 30)} months`;
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
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Cards</span>
            <span>Next Review</span>
          </div>
          <ul className="space-y-2">
            {packCards.map((card) => {
              const isDue = card.nextReviewDate
                ? new Date(card.nextReviewDate) <= new Date()
                : true;
              return (
                <li
                  key={card.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    {card.sourceType === 'milestone' ? (
                      <Calendar className="h-5 w-5 text-gray-400" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{card.sourceId}</p>
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
                    {!pack.isDefault && (
                      <button
                        onClick={() => handleRemoveCard(card.id)}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700 dark:hover:text-red-400"
                        title="Remove from pack"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Pack Actions - only for custom packs */}
      {!pack.isDefault && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-700">
          <button
            className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            onClick={() => {
              // TODO: Open edit modal (Sprint 23.10)
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
    </div>
  );
}

export default PackManager;

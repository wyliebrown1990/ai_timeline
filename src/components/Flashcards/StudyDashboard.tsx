/**
 * StudyDashboard Component
 *
 * Main dashboard for the Study Center showing:
 * - Cards due today with call-to-action
 * - Current study streak
 * - Grid of user's flashcard packs
 * - Quick stats summary
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Flame, Plus, Play } from 'lucide-react';
import { useFlashcardContext } from '../../contexts/FlashcardContext';
import { PackCard } from './PackCard';
import { CreatePackModal } from './CreatePackModal';

/**
 * Study dashboard displaying user's flashcard collection and study options.
 */
export function StudyDashboard() {
  const { cards, packs, stats, dueToday, hasCards, getDueCards } = useFlashcardContext();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Get mastered cards count (cards with interval > 21 days)
  const masteredCount = stats.masteredCards;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Study Center</h1>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          onClick={() => setIsCreateModalOpen(true)}
          data-testid="new-pack-button"
        >
          <Plus className="h-4 w-4" />
          <span>New Pack</span>
        </button>
      </div>

      {/* Main Content */}
      {!hasCards ? (
        /* Empty State */
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            No flashcards yet
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Add milestones and concepts to your flashcard collection while browsing the timeline.
          </p>
          <Link
            to="/timeline"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            Explore Timeline
          </Link>
        </div>
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
                >
                  <Play className="h-4 w-4" />
                  Start Studying
                </Link>
              ) : (
                <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-center text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  All caught up! Check back tomorrow.
                </div>
              )}
            </div>

            {/* Streak */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-center gap-2">
                <Flame className={`h-8 w-8 ${stats.currentStreak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
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
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Your Packs</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packs.map((pack) => {
                const packCards = cards.filter((c) => c.packIds.includes(pack.id));
                const packDue = getDueCards(pack.id).length;
                return (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    totalCards={packCards.length}
                    dueCards={packDue}
                  />
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

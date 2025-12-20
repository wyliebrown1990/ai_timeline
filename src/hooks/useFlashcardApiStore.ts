/**
 * Flashcard API Store Hook
 *
 * Database-backed flashcard storage with spaced repetition support.
 * Replaces localStorage operations with API calls for cross-device sync.
 *
 * Sprint 38 - User Data Migration
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  userFlashcardsApi,
  type UserFlashcardResponse,
  type UserPackResponse,
  type ReviewResult,
} from '../services/api';
import { useSession } from '../contexts/SessionContext';
import {
  type UserFlashcard,
  type FlashcardPack,
  type FlashcardStats,
  type QualityRating,
  type DailyReviewRecord,
  type StreakHistory,
  createInitialStats,
  createInitialStreakHistory,
  isCardDue,
  isCardMastered,
} from '../types/flashcard';
import {
  loadReviewHistory,
  saveReviewHistory,
  recordReviewInHistory,
  addStudyTimeToHistory,
  loadStreakHistory,
  saveStreakHistory,
  updateStreakAfterReview,
} from '../lib/flashcardStats';

// =============================================================================
// Type Conversions
// =============================================================================

/**
 * Convert API response to local UserFlashcard type
 */
function toUserFlashcard(response: UserFlashcardResponse): UserFlashcard {
  return {
    id: response.id,
    sourceType: response.sourceType as UserFlashcard['sourceType'],
    sourceId: response.sourceId,
    packIds: response.packIds,
    createdAt: response.createdAt,
    easeFactor: response.easeFactor,
    interval: response.interval,
    repetitions: response.repetitions,
    nextReviewDate: response.nextReviewDate,
    lastReviewedAt: response.lastReviewedAt,
  };
}

/**
 * Convert API pack response to local FlashcardPack type
 */
function toFlashcardPack(response: UserPackResponse): FlashcardPack {
  return {
    id: response.id,
    name: response.name,
    description: response.description ?? undefined,
    color: response.color,
    isDefault: response.isDefault,
    createdAt: response.createdAt,
  };
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseFlashcardApiStoreReturn {
  // State
  cards: UserFlashcard[];
  packs: FlashcardPack[];
  stats: FlashcardStats;
  reviewHistory: DailyReviewRecord[];
  streakHistory: StreakHistory;

  // Loading state
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;

  // Card Operations (async)
  addCard: (
    sourceType: UserFlashcard['sourceType'],
    sourceId: string,
    packIds?: string[]
  ) => Promise<UserFlashcard | null>;
  removeCard: (cardId: string) => Promise<void>;
  getCardBySource: (
    sourceType: UserFlashcard['sourceType'],
    sourceId: string
  ) => UserFlashcard | undefined;
  getCardById: (cardId: string) => UserFlashcard | undefined;
  getDueCards: (packId?: string) => UserFlashcard[];
  getCardsByPack: (packId: string) => UserFlashcard[];

  // Review Operations (async)
  recordReview: (cardId: string, quality: QualityRating) => Promise<void>;
  undoLastReview: (cardId: string) => boolean;

  // History Operations
  addStudyTime: (minutes: number) => void;

  // Pack Operations (async)
  createPack: (
    name: string,
    description?: string,
    color?: string
  ) => Promise<FlashcardPack>;
  deletePack: (packId: string) => Promise<void>;
  renamePack: (packId: string, name: string) => Promise<void>;
  moveCardToPack: (cardId: string, packId: string) => Promise<void>;
  removeCardFromPack: (cardId: string, packId: string) => Promise<void>;
  getDefaultPack: () => FlashcardPack | undefined;
  reorderPacks: (packIds: string[]) => void;

  // Utility
  isCardSaved: (sourceType: UserFlashcard['sourceType'], sourceId: string) => boolean;
  resetAll: () => Promise<void>;
  refetch: () => Promise<void>;
}

// =============================================================================
// Last Review State (for undo functionality)
// =============================================================================

interface LastReviewState {
  cardId: string;
  previousCard: UserFlashcard;
  previousStats: FlashcardStats;
  timestamp: number;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing flashcard collection using database API.
 * Requires SessionProvider to be mounted in the component tree.
 *
 * @example
 * ```tsx
 * const {
 *   cards,
 *   isLoading,
 *   addCard,
 *   removeCard,
 *   getDueCards,
 *   isCardSaved,
 * } = useFlashcardApiStore();
 *
 * // Add a milestone to flashcards
 * await addCard('milestone', 'E2017_TRANSFORMER');
 *
 * // Check if already saved
 * const saved = isCardSaved('milestone', 'E2017_TRANSFORMER');
 *
 * // Get cards due for review
 * const dueCards = getDueCards();
 * ```
 */
export function useFlashcardApiStore(): UseFlashcardApiStoreReturn {
  const { sessionId, isReady } = useSession();

  // State
  const [cards, setCards] = useState<UserFlashcard[]>([]);
  const [packs, setPacks] = useState<FlashcardPack[]>([]);
  const [stats, setStats] = useState<FlashcardStats>(createInitialStats());
  const [reviewHistory, setReviewHistory] = useState<DailyReviewRecord[]>([]);
  const [streakHistory, setStreakHistory] = useState<StreakHistory>(createInitialStreakHistory());
  const [lastReviewState, setLastReviewState] = useState<LastReviewState | null>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Prevent duplicate fetches
  const fetchingRef = useRef(false);

  // ==========================================================================
  // Data Fetching
  // ==========================================================================

  /**
   * Fetch all data from API
   */
  const fetchData = useCallback(async () => {
    if (!sessionId || fetchingRef.current) return;

    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch cards and packs in parallel
      const [flashcardsResponse, packsResponse] = await Promise.all([
        userFlashcardsApi.getFlashcards(sessionId),
        userFlashcardsApi.getPacks(sessionId),
      ]);

      const loadedCards = flashcardsResponse.data.map(toUserFlashcard);
      const loadedPacks = packsResponse.data.map(toFlashcardPack);

      setCards(loadedCards);
      setPacks(loadedPacks);

      // Recalculate stats from cards
      const calculatedStats = calculateStats(loadedCards);
      setStats(calculatedStats);

      // Load history from localStorage (local only for now)
      const loadedHistory = loadReviewHistory();
      const loadedStreak = loadStreakHistory();
      setReviewHistory(loadedHistory);
      setStreakHistory(loadedStreak);

      setIsInitialized(true);
    } catch (err) {
      console.error('[useFlashcardApiStore] Failed to fetch data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch flashcards'));
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [sessionId]);

  /**
   * Refetch data from API
   */
  const refetch = useCallback(async () => {
    fetchingRef.current = false;
    await fetchData();
  }, [fetchData]);

  // Fetch data when session is ready
  useEffect(() => {
    if (isReady && sessionId) {
      fetchData();
    }
  }, [isReady, sessionId, fetchData]);

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  /**
   * Calculate stats from cards
   */
  function calculateStats(cardList: UserFlashcard[]): FlashcardStats {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const dueCards = cardList.filter((c) => isCardDue(c));
    const masteredCards = cardList.filter((c) => isCardMastered(c));
    const reviewedToday = cardList.filter(
      (c) => c.lastReviewedAt && new Date(c.lastReviewedAt) >= todayStart
    );

    return {
      totalCards: cardList.length,
      cardsDueToday: dueCards.length,
      cardsReviewedToday: reviewedToday.length,
      masteredCards: masteredCards.length,
      currentStreak: streakHistory.currentStreak,
      longestStreak: streakHistory.longestStreak,
      lastStudyDate: streakHistory.lastStudyDate,
    };
  }

  /**
   * Update local stats after card changes
   */
  const updateLocalStats = useCallback((newCards: UserFlashcard[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const dueCards = newCards.filter((c) => isCardDue(c));
    const masteredCards = newCards.filter((c) => isCardMastered(c));
    const reviewedToday = newCards.filter(
      (c) => c.lastReviewedAt && new Date(c.lastReviewedAt) >= todayStart
    );

    setStats((prev) => ({
      ...prev,
      totalCards: newCards.length,
      cardsDueToday: dueCards.length,
      cardsReviewedToday: reviewedToday.length,
      masteredCards: masteredCards.length,
    }));
  }, []);

  // ==========================================================================
  // Card Operations
  // ==========================================================================

  const getCardBySource = useCallback(
    (sourceType: UserFlashcard['sourceType'], sourceId: string): UserFlashcard | undefined => {
      return cards.find((c) => c.sourceType === sourceType && c.sourceId === sourceId);
    },
    [cards]
  );

  const getCardById = useCallback(
    (cardId: string): UserFlashcard | undefined => {
      return cards.find((c) => c.id === cardId);
    },
    [cards]
  );

  const addCard = useCallback(
    async (
      sourceType: UserFlashcard['sourceType'],
      sourceId: string,
      packIds?: string[]
    ): Promise<UserFlashcard | null> => {
      if (!sessionId) return null;

      // Check for duplicate locally first
      const existing = getCardBySource(sourceType, sourceId);
      if (existing) {
        return null; // Card already exists
      }

      try {
        const response = await userFlashcardsApi.addFlashcard(
          sessionId,
          sourceType,
          sourceId,
          packIds
        );
        const newCard = toUserFlashcard(response);

        setCards((prev) => {
          const updated = [...prev, newCard];
          updateLocalStats(updated);
          return updated;
        });

        return newCard;
      } catch (err) {
        console.error('[useFlashcardApiStore] Failed to add card:', err);
        throw err;
      }
    },
    [sessionId, getCardBySource, updateLocalStats]
  );

  const removeCard = useCallback(
    async (cardId: string): Promise<void> => {
      if (!sessionId) return;

      try {
        await userFlashcardsApi.removeFlashcard(sessionId, cardId);

        setCards((prev) => {
          const updated = prev.filter((c) => c.id !== cardId);
          updateLocalStats(updated);
          return updated;
        });
      } catch (err) {
        console.error('[useFlashcardApiStore] Failed to remove card:', err);
        throw err;
      }
    },
    [sessionId, updateLocalStats]
  );

  const getDueCards = useCallback(
    (packId?: string): UserFlashcard[] => {
      let filteredCards = cards;

      if (packId) {
        filteredCards = filteredCards.filter((c) => c.packIds.includes(packId));
      }

      return filteredCards.filter((c) => isCardDue(c));
    },
    [cards]
  );

  const getCardsByPack = useCallback(
    (packId: string): UserFlashcard[] => {
      return cards.filter((c) => c.packIds.includes(packId));
    },
    [cards]
  );

  // ==========================================================================
  // Review Operations
  // ==========================================================================

  const recordReview = useCallback(
    async (cardId: string, quality: QualityRating): Promise<void> => {
      if (!sessionId) return;

      const card = cards.find((c) => c.id === cardId);
      if (!card) return;

      // Store previous state for undo
      setLastReviewState({
        cardId,
        previousCard: { ...card },
        previousStats: { ...stats },
        timestamp: Date.now(),
      });

      try {
        const result: ReviewResult = await userFlashcardsApi.reviewFlashcard(
          sessionId,
          cardId,
          quality
        );

        // Update card locally with result
        const updatedCard: UserFlashcard = {
          ...card,
          easeFactor: result.easeFactor,
          interval: result.interval,
          repetitions: result.repetitions,
          nextReviewDate: result.nextReviewDate,
          lastReviewedAt: new Date().toISOString(),
        };

        setCards((prev) => {
          const updated = prev.map((c) => (c.id === cardId ? updatedCard : c));
          return updated;
        });

        // Record review in local history
        const updatedHistory = recordReviewInHistory(reviewHistory, cardId, quality);
        setReviewHistory(updatedHistory);
        saveReviewHistory(updatedHistory);

        // Update streak
        const updatedStreak = updateStreakAfterReview(streakHistory, updatedHistory);
        setStreakHistory(updatedStreak);
        saveStreakHistory(updatedStreak);

        // Update stats
        const now = new Date();
        setStats((prev) => ({
          ...prev,
          cardsReviewedToday: prev.cardsReviewedToday + 1,
          currentStreak: updatedStreak.currentStreak,
          longestStreak: updatedStreak.longestStreak,
          masteredCards: result.isMastered
            ? prev.masteredCards + (isCardMastered(card) ? 0 : 1)
            : prev.masteredCards,
          cardsDueToday: Math.max(0, prev.cardsDueToday - 1),
          lastStudyDate: now.toISOString(),
        }));
      } catch (err) {
        // Revert undo state on error
        setLastReviewState(null);
        console.error('[useFlashcardApiStore] Failed to record review:', err);
        throw err;
      }
    },
    [sessionId, cards, stats, reviewHistory, streakHistory]
  );

  const undoLastReview = useCallback(
    (cardId: string): boolean => {
      if (!lastReviewState || lastReviewState.cardId !== cardId) {
        return false;
      }

      // Restore previous card state locally
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? lastReviewState.previousCard : c))
      );

      // Restore previous stats
      setStats(lastReviewState.previousStats);

      // Clear undo state
      setLastReviewState(null);

      return true;
    },
    [lastReviewState]
  );

  // ==========================================================================
  // Pack Operations
  // ==========================================================================

  const createPack = useCallback(
    async (name: string, description?: string, color?: string): Promise<FlashcardPack> => {
      if (!sessionId) throw new Error('No session');

      try {
        const response = await userFlashcardsApi.createPack(
          sessionId,
          name,
          description,
          color
        );
        const newPack = toFlashcardPack(response);

        setPacks((prev) => [...prev, newPack]);

        return newPack;
      } catch (err) {
        console.error('[useFlashcardApiStore] Failed to create pack:', err);
        throw err;
      }
    },
    [sessionId]
  );

  const deletePack = useCallback(
    async (packId: string): Promise<void> => {
      if (!sessionId) return;

      const pack = packs.find((p) => p.id === packId);
      if (!pack || pack.isDefault) {
        return; // Cannot delete default packs
      }

      try {
        await userFlashcardsApi.deletePack(sessionId, packId);

        setPacks((prev) => prev.filter((p) => p.id !== packId));

        // Remove pack from cards locally
        setCards((prev) =>
          prev.map((card) => ({
            ...card,
            packIds: card.packIds.filter((id) => id !== packId),
          }))
        );
      } catch (err) {
        console.error('[useFlashcardApiStore] Failed to delete pack:', err);
        throw err;
      }
    },
    [sessionId, packs]
  );

  const renamePack = useCallback(
    async (packId: string, name: string): Promise<void> => {
      if (!sessionId) return;

      const pack = packs.find((p) => p.id === packId);
      if (!pack || pack.isDefault) return;

      try {
        const response = await userFlashcardsApi.updatePack(sessionId, packId, { name });
        const updatedPack = toFlashcardPack(response);

        setPacks((prev) => prev.map((p) => (p.id === packId ? updatedPack : p)));
      } catch (err) {
        console.error('[useFlashcardApiStore] Failed to rename pack:', err);
        throw err;
      }
    },
    [sessionId, packs]
  );

  const moveCardToPack = useCallback(
    async (cardId: string, packId: string): Promise<void> => {
      if (!sessionId) return;

      const card = cards.find((c) => c.id === cardId);
      if (!card || card.packIds.includes(packId)) return;

      const newPackIds = [...card.packIds, packId];

      try {
        await userFlashcardsApi.updateFlashcardPacks(sessionId, cardId, newPackIds);

        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, packIds: newPackIds } : c))
        );
      } catch (err) {
        console.error('[useFlashcardApiStore] Failed to move card to pack:', err);
        throw err;
      }
    },
    [sessionId, cards]
  );

  const removeCardFromPack = useCallback(
    async (cardId: string, packId: string): Promise<void> => {
      if (!sessionId) return;

      const pack = packs.find((p) => p.id === packId);
      if (pack?.isDefault) return;

      const card = cards.find((c) => c.id === cardId);
      if (!card) return;

      const newPackIds = card.packIds.filter((id) => id !== packId);

      try {
        await userFlashcardsApi.updateFlashcardPacks(sessionId, cardId, newPackIds);

        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, packIds: newPackIds } : c))
        );
      } catch (err) {
        console.error('[useFlashcardApiStore] Failed to remove card from pack:', err);
        throw err;
      }
    },
    [sessionId, cards, packs]
  );

  const getDefaultPack = useCallback((): FlashcardPack | undefined => {
    return packs.find((p) => p.name === 'All Cards' && p.isDefault);
  }, [packs]);

  const reorderPacks = useCallback(
    (packIds: string[]) => {
      const packMap = new Map(packs.map((p) => [p.id, p]));
      const reordered: FlashcardPack[] = [];

      for (const id of packIds) {
        const pack = packMap.get(id);
        if (pack) {
          reordered.push(pack);
          packMap.delete(id);
        }
      }

      for (const pack of packMap.values()) {
        reordered.push(pack);
      }

      setPacks(reordered);
      // Note: Pack order is local only for now
    },
    [packs]
  );

  // ==========================================================================
  // Utility
  // ==========================================================================

  const isCardSaved = useCallback(
    (sourceType: UserFlashcard['sourceType'], sourceId: string): boolean => {
      return getCardBySource(sourceType, sourceId) !== undefined;
    },
    [getCardBySource]
  );

  const resetAll = useCallback(async (): Promise<void> => {
    if (!sessionId) return;

    // Remove all cards one by one
    for (const card of cards) {
      try {
        await userFlashcardsApi.removeFlashcard(sessionId, card.id);
      } catch {
        // Ignore errors during reset
      }
    }

    // Delete non-default packs
    for (const pack of packs) {
      if (!pack.isDefault) {
        try {
          await userFlashcardsApi.deletePack(sessionId, pack.id);
        } catch {
          // Ignore errors during reset
        }
      }
    }

    // Refetch to get clean state
    await refetch();
  }, [sessionId, cards, packs, refetch]);

  // ==========================================================================
  // History Operations (local only)
  // ==========================================================================

  const addStudyTime = useCallback(
    (minutes: number) => {
      const updatedHistory = addStudyTimeToHistory(reviewHistory, minutes);
      setReviewHistory(updatedHistory);
      saveReviewHistory(updatedHistory);
    },
    [reviewHistory]
  );

  // ==========================================================================
  // Return Hook Interface
  // ==========================================================================

  return useMemo(
    () => ({
      // State
      cards,
      packs,
      stats,
      reviewHistory,
      streakHistory,

      // Loading state
      isLoading,
      isInitialized,
      error,

      // Card Operations
      addCard,
      removeCard,
      getCardBySource,
      getCardById,
      getDueCards,
      getCardsByPack,

      // Review Operations
      recordReview,
      undoLastReview,

      // History Operations
      addStudyTime,

      // Pack Operations
      createPack,
      deletePack,
      renamePack,
      moveCardToPack,
      removeCardFromPack,
      getDefaultPack,
      reorderPacks,

      // Utility
      isCardSaved,
      resetAll,
      refetch,
    }),
    [
      cards,
      packs,
      stats,
      reviewHistory,
      streakHistory,
      isLoading,
      isInitialized,
      error,
      addCard,
      removeCard,
      getCardBySource,
      getCardById,
      getDueCards,
      getCardsByPack,
      recordReview,
      undoLastReview,
      addStudyTime,
      createPack,
      deletePack,
      renamePack,
      moveCardToPack,
      removeCardFromPack,
      getDefaultPack,
      reorderPacks,
      isCardSaved,
      resetAll,
      refetch,
    ]
  );
}

export default useFlashcardApiStore;

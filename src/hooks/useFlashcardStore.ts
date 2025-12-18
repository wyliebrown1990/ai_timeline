/**
 * Flashcard Store Hook
 *
 * Manages user flashcard collection using localStorage with spaced repetition support.
 * Provides CRUD operations for cards and packs, duplicate detection, and review queue.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  type UserFlashcard,
  type FlashcardPack,
  type FlashcardStats,
  type QualityRating,
  FLASHCARD_STORAGE_KEYS,
  PACK_COLORS,
  createUserFlashcard,
  createFlashcardPack,
  createInitialStats,
  calculateNextReview,
  getNextReviewDate,
  isCardDue,
  isCardMastered,
  safeParseUserFlashcard,
  safeParseFlashcardPack,
  safeParseFlashcardStats,
} from '../types/flashcard';

// =============================================================================
// UUID Generation - Use built-in crypto.randomUUID()
// =============================================================================

/**
 * Generate a UUID v4 string using the built-in Web Crypto API.
 * Falls back to a simple implementation for older environments.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// Storage Schema Version - Increment when making breaking changes
// =============================================================================

const SCHEMA_VERSION = 1;
const SCHEMA_VERSION_KEY = 'ai-timeline-flashcard-schema-version';

// =============================================================================
// Storage Types
// =============================================================================

interface StoredFlashcardData {
  cards: UserFlashcard[];
  schemaVersion: number;
}

interface StoredPackData {
  packs: FlashcardPack[];
  schemaVersion: number;
}

// =============================================================================
// Default State
// =============================================================================

const DEFAULT_CARDS: StoredFlashcardData = {
  cards: [],
  schemaVersion: SCHEMA_VERSION,
};

const DEFAULT_PACKS_DATA: StoredPackData = {
  packs: [],
  schemaVersion: SCHEMA_VERSION,
};

// =============================================================================
// Migration Functions
// =============================================================================

/**
 * Migrate cards data from older schema versions.
 * Add migration logic here when incrementing SCHEMA_VERSION.
 */
function migrateCards(data: unknown, fromVersion: number): StoredFlashcardData {
  // Version 0 -> 1: Initial schema, no migration needed
  if (fromVersion === 0) {
    // Treat as array of cards without version wrapper
    if (Array.isArray(data)) {
      const validCards: UserFlashcard[] = [];
      for (const item of data) {
        const result = safeParseUserFlashcard(item);
        if (result.success) {
          validCards.push(result.data);
        }
      }
      return { cards: validCards, schemaVersion: SCHEMA_VERSION };
    }
  }

  // If data has schemaVersion, validate and return
  if (typeof data === 'object' && data !== null && 'cards' in data) {
    const typedData = data as StoredFlashcardData;
    const validCards: UserFlashcard[] = [];
    for (const item of typedData.cards || []) {
      const result = safeParseUserFlashcard(item);
      if (result.success) {
        validCards.push(result.data);
      }
    }
    return { cards: validCards, schemaVersion: SCHEMA_VERSION };
  }

  return DEFAULT_CARDS;
}

/**
 * Migrate packs data from older schema versions.
 */
function migratePacks(data: unknown, fromVersion: number): StoredPackData {
  // Version 0 -> 1: Initial schema, no migration needed
  if (fromVersion === 0) {
    if (Array.isArray(data)) {
      const validPacks: FlashcardPack[] = [];
      for (const item of data) {
        const result = safeParseFlashcardPack(item);
        if (result.success) {
          validPacks.push(result.data);
        }
      }
      return { packs: validPacks, schemaVersion: SCHEMA_VERSION };
    }
  }

  if (typeof data === 'object' && data !== null && 'packs' in data) {
    const typedData = data as StoredPackData;
    const validPacks: FlashcardPack[] = [];
    for (const item of typedData.packs || []) {
      const result = safeParseFlashcardPack(item);
      if (result.success) {
        validPacks.push(result.data);
      }
    }
    return { packs: validPacks, schemaVersion: SCHEMA_VERSION };
  }

  return DEFAULT_PACKS_DATA;
}

// =============================================================================
// Storage Functions
// =============================================================================

/**
 * Get stored schema version
 */
function getStoredSchemaVersion(): number {
  if (typeof window === 'undefined') return SCHEMA_VERSION;
  try {
    const version = localStorage.getItem(SCHEMA_VERSION_KEY);
    return version ? parseInt(version, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Save schema version to localStorage
 */
function saveSchemaVersion(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
  } catch (error) {
    console.error('Failed to save schema version:', error);
  }
}

/**
 * Load cards from localStorage with migration support
 */
function loadCards(): StoredFlashcardData {
  if (typeof window === 'undefined') return DEFAULT_CARDS;

  try {
    const stored = localStorage.getItem(FLASHCARD_STORAGE_KEYS.CARDS);
    if (!stored) return DEFAULT_CARDS;

    const data = JSON.parse(stored);
    const storedVersion = getStoredSchemaVersion();

    if (storedVersion < SCHEMA_VERSION) {
      const migrated = migrateCards(data, storedVersion);
      saveSchemaVersion();
      return migrated;
    }

    return migrateCards(data, storedVersion);
  } catch (error) {
    console.error('Failed to load flashcards:', error);
    return DEFAULT_CARDS;
  }
}

/**
 * Save cards to localStorage
 */
function saveCards(data: StoredFlashcardData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FLASHCARD_STORAGE_KEYS.CARDS, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save flashcards:', error);
  }
}

/**
 * Load packs from localStorage with migration support
 */
function loadPacks(): StoredPackData {
  if (typeof window === 'undefined') return DEFAULT_PACKS_DATA;

  try {
    const stored = localStorage.getItem(FLASHCARD_STORAGE_KEYS.PACKS);
    if (!stored) return DEFAULT_PACKS_DATA;

    const data = JSON.parse(stored);
    const storedVersion = getStoredSchemaVersion();

    if (storedVersion < SCHEMA_VERSION) {
      const migrated = migratePacks(data, storedVersion);
      return migrated;
    }

    return migratePacks(data, storedVersion);
  } catch (error) {
    console.error('Failed to load flashcard packs:', error);
    return DEFAULT_PACKS_DATA;
  }
}

/**
 * Save packs to localStorage
 */
function savePacks(data: StoredPackData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FLASHCARD_STORAGE_KEYS.PACKS, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save flashcard packs:', error);
  }
}

/**
 * Load stats from localStorage
 */
function loadStats(): FlashcardStats {
  if (typeof window === 'undefined') return createInitialStats();

  try {
    const stored = localStorage.getItem(FLASHCARD_STORAGE_KEYS.STATS);
    if (!stored) return createInitialStats();

    const data = JSON.parse(stored);
    const result = safeParseFlashcardStats(data);
    return result.success ? result.data : createInitialStats();
  } catch (error) {
    console.error('Failed to load flashcard stats:', error);
    return createInitialStats();
  }
}

/**
 * Save stats to localStorage
 */
function saveStats(stats: FlashcardStats): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FLASHCARD_STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to save flashcard stats:', error);
  }
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseFlashcardStoreReturn {
  // State
  cards: UserFlashcard[];
  packs: FlashcardPack[];
  stats: FlashcardStats;

  // Card Operations
  addCard: (
    sourceType: UserFlashcard['sourceType'],
    sourceId: string,
    packIds?: string[]
  ) => UserFlashcard | null;
  removeCard: (cardId: string) => void;
  getCardBySource: (
    sourceType: UserFlashcard['sourceType'],
    sourceId: string
  ) => UserFlashcard | undefined;
  getCardById: (cardId: string) => UserFlashcard | undefined;
  getDueCards: (packId?: string) => UserFlashcard[];
  getCardsByPack: (packId: string) => UserFlashcard[];

  // Review Operations
  recordReview: (cardId: string, quality: QualityRating) => void;

  // Pack Operations
  createPack: (name: string, description?: string, color?: string) => FlashcardPack;
  deletePack: (packId: string) => void;
  renamePack: (packId: string, name: string) => void;
  moveCardToPack: (cardId: string, packId: string) => void;
  removeCardFromPack: (cardId: string, packId: string) => void;
  getDefaultPack: () => FlashcardPack | undefined;

  // Utility
  isCardSaved: (sourceType: UserFlashcard['sourceType'], sourceId: string) => boolean;
  resetAll: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing flashcard collection with spaced repetition
 *
 * @example
 * ```tsx
 * const {
 *   addCard,
 *   removeCard,
 *   getDueCards,
 *   isCardSaved,
 * } = useFlashcardStore();
 *
 * // Add a milestone to flashcards
 * addCard('milestone', 'E2017_TRANSFORMER');
 *
 * // Check if already saved
 * const saved = isCardSaved('milestone', 'E2017_TRANSFORMER');
 *
 * // Get cards due for review
 * const dueCards = getDueCards();
 * ```
 */
export function useFlashcardStore(): UseFlashcardStoreReturn {
  const [cardsData, setCardsData] = useState<StoredFlashcardData>(DEFAULT_CARDS);
  const [packsData, setPacksData] = useState<StoredPackData>(DEFAULT_PACKS_DATA);
  const [stats, setStats] = useState<FlashcardStats>(createInitialStats());

  // Initialize default packs if needed
  const initializeDefaultPacks = useCallback((currentPacks: FlashcardPack[]): FlashcardPack[] => {
    const hasAllCards = currentPacks.some((p) => p.name === 'All Cards' && p.isDefault);
    const hasRecentlyAdded = currentPacks.some((p) => p.name === 'Recently Added' && p.isDefault);

    if (hasAllCards && hasRecentlyAdded) {
      return currentPacks;
    }

    const newPacks = [...currentPacks];

    if (!hasAllCards) {
      newPacks.unshift(createFlashcardPack(generateUUID, 'All Cards', PACK_COLORS[0], undefined, true));
    }
    if (!hasRecentlyAdded) {
      const insertIndex = hasAllCards ? 1 : 1;
      newPacks.splice(
        insertIndex,
        0,
        createFlashcardPack(generateUUID, 'Recently Added', PACK_COLORS[1], undefined, true)
      );
    }

    return newPacks;
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedCards = loadCards();
    const loadedPacks = loadPacks();
    const loadedStats = loadStats();

    // Initialize default packs if needed
    const packsWithDefaults = initializeDefaultPacks(loadedPacks.packs);
    if (packsWithDefaults.length !== loadedPacks.packs.length) {
      const updatedPacksData = { ...loadedPacks, packs: packsWithDefaults };
      savePacks(updatedPacksData);
      setPacksData(updatedPacksData);
    } else {
      setPacksData(loadedPacks);
    }

    setCardsData(loadedCards);
    setStats(loadedStats);
    saveSchemaVersion();
  }, [initializeDefaultPacks]);

  // Update cards and persist
  const updateCards = useCallback((newCards: UserFlashcard[]) => {
    const newData = { cards: newCards, schemaVersion: SCHEMA_VERSION };
    setCardsData(newData);
    saveCards(newData);
  }, []);

  // Update packs and persist
  const updatePacks = useCallback((newPacks: FlashcardPack[]) => {
    const newData = { packs: newPacks, schemaVersion: SCHEMA_VERSION };
    setPacksData(newData);
    savePacks(newData);
  }, []);

  // Update stats and persist
  const updateStats = useCallback((newStats: FlashcardStats) => {
    setStats(newStats);
    saveStats(newStats);
  }, []);

  // Recalculate stats based on current cards
  const recalculateStats = useCallback(
    (cards: UserFlashcard[]) => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const dueCards = cards.filter((c) => isCardDue(c));
      const masteredCards = cards.filter((c) => isCardMastered(c));
      const reviewedToday = cards.filter(
        (c) => c.lastReviewedAt && new Date(c.lastReviewedAt) >= todayStart
      );

      const newStats: FlashcardStats = {
        ...stats,
        totalCards: cards.length,
        cardsDueToday: dueCards.length,
        cardsReviewedToday: reviewedToday.length,
        masteredCards: masteredCards.length,
      };

      updateStats(newStats);
    },
    [stats, updateStats]
  );

  // ==========================================================================
  // Card Operations
  // ==========================================================================

  const getCardBySource = useCallback(
    (sourceType: UserFlashcard['sourceType'], sourceId: string): UserFlashcard | undefined => {
      return cardsData.cards.find((c) => c.sourceType === sourceType && c.sourceId === sourceId);
    },
    [cardsData.cards]
  );

  const getCardById = useCallback(
    (cardId: string): UserFlashcard | undefined => {
      return cardsData.cards.find((c) => c.id === cardId);
    },
    [cardsData.cards]
  );

  const addCard = useCallback(
    (
      sourceType: UserFlashcard['sourceType'],
      sourceId: string,
      packIds?: string[]
    ): UserFlashcard | null => {
      // Check for duplicate
      const existing = getCardBySource(sourceType, sourceId);
      if (existing) {
        return null; // Card already exists
      }

      // Get default pack ID (All Cards)
      const defaultPack = packsData.packs.find((p) => p.name === 'All Cards' && p.isDefault);
      const recentlyAddedPack = packsData.packs.find(
        (p) => p.name === 'Recently Added' && p.isDefault
      );

      // Build pack IDs array - always include All Cards and Recently Added
      const finalPackIds = new Set<string>(packIds || []);
      if (defaultPack) finalPackIds.add(defaultPack.id);
      if (recentlyAddedPack) finalPackIds.add(recentlyAddedPack.id);

      const newCard = createUserFlashcard(generateUUID, sourceType, sourceId, Array.from(finalPackIds));

      const newCards = [...cardsData.cards, newCard];
      updateCards(newCards);
      recalculateStats(newCards);

      return newCard;
    },
    [cardsData.cards, packsData.packs, getCardBySource, updateCards, recalculateStats]
  );

  const removeCard = useCallback(
    (cardId: string) => {
      const newCards = cardsData.cards.filter((c) => c.id !== cardId);
      updateCards(newCards);
      recalculateStats(newCards);
    },
    [cardsData.cards, updateCards, recalculateStats]
  );

  const getDueCards = useCallback(
    (packId?: string): UserFlashcard[] => {
      let cards = cardsData.cards;

      // Filter by pack if specified
      if (packId) {
        cards = cards.filter((c) => c.packIds.includes(packId));
      }

      // Return only due cards
      return cards.filter((c) => isCardDue(c));
    },
    [cardsData.cards]
  );

  const getCardsByPack = useCallback(
    (packId: string): UserFlashcard[] => {
      return cardsData.cards.filter((c) => c.packIds.includes(packId));
    },
    [cardsData.cards]
  );

  // ==========================================================================
  // Review Operations
  // ==========================================================================

  const recordReview = useCallback(
    (cardId: string, quality: QualityRating) => {
      const cardIndex = cardsData.cards.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) return;

      const card = cardsData.cards[cardIndex];
      if (!card) return; // Additional safety check for TypeScript

      const { easeFactor, interval, repetitions } = calculateNextReview(
        quality,
        card.easeFactor,
        card.interval,
        card.repetitions
      );

      const updatedCard: UserFlashcard = {
        id: card.id,
        sourceType: card.sourceType,
        sourceId: card.sourceId,
        packIds: card.packIds,
        createdAt: card.createdAt,
        easeFactor,
        interval,
        repetitions,
        nextReviewDate: getNextReviewDate(interval),
        lastReviewedAt: new Date().toISOString(),
      };

      const newCards = [...cardsData.cards];
      newCards[cardIndex] = updatedCard;
      updateCards(newCards);

      // Update stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastStudyDate = stats.lastStudyDate ? new Date(stats.lastStudyDate) : null;

      let newStreak = stats.currentStreak;
      if (!lastStudyDate || lastStudyDate < todayStart) {
        // First review today
        const yesterday = new Date(todayStart);
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastStudyDate && lastStudyDate >= yesterday) {
          // Continued from yesterday
          newStreak = stats.currentStreak + 1;
        } else {
          // Streak broken or new start
          newStreak = 1;
        }
      }

      const newStats: FlashcardStats = {
        ...stats,
        cardsReviewedToday: stats.cardsReviewedToday + 1,
        currentStreak: newStreak,
        longestStreak: Math.max(stats.longestStreak, newStreak),
        masteredCards: newCards.filter((c) => isCardMastered(c)).length,
        cardsDueToday: newCards.filter((c) => isCardDue(c)).length,
        lastStudyDate: now.toISOString(),
      };

      updateStats(newStats);
    },
    [cardsData.cards, stats, updateCards, updateStats]
  );

  // ==========================================================================
  // Pack Operations
  // ==========================================================================

  const createPack = useCallback(
    (name: string, description?: string, color?: string): FlashcardPack => {
      const newPack = createFlashcardPack(
        generateUUID,
        name,
        color || PACK_COLORS[packsData.packs.length % PACK_COLORS.length],
        description,
        false
      );

      updatePacks([...packsData.packs, newPack]);
      return newPack;
    },
    [packsData.packs, updatePacks]
  );

  const deletePack = useCallback(
    (packId: string) => {
      const pack = packsData.packs.find((p) => p.id === packId);
      if (!pack || pack.isDefault) {
        return; // Cannot delete default packs
      }

      // Remove pack from all cards
      const updatedCards = cardsData.cards.map((card) => ({
        ...card,
        packIds: card.packIds.filter((id) => id !== packId),
      }));

      updateCards(updatedCards);
      updatePacks(packsData.packs.filter((p) => p.id !== packId));
    },
    [packsData.packs, cardsData.cards, updateCards, updatePacks]
  );

  const renamePack = useCallback(
    (packId: string, name: string) => {
      const packIndex = packsData.packs.findIndex((p) => p.id === packId);
      if (packIndex === -1) return;

      const pack = packsData.packs[packIndex];
      if (!pack || pack.isDefault) return; // Cannot rename default packs

      const updatedPack: FlashcardPack = {
        id: pack.id,
        name,
        description: pack.description,
        color: pack.color,
        isDefault: pack.isDefault,
        createdAt: pack.createdAt,
      };

      const newPacks = [...packsData.packs];
      newPacks[packIndex] = updatedPack;
      updatePacks(newPacks);
    },
    [packsData.packs, updatePacks]
  );

  const moveCardToPack = useCallback(
    (cardId: string, packId: string) => {
      const cardIndex = cardsData.cards.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) return;

      const card = cardsData.cards[cardIndex];
      if (!card || card.packIds.includes(packId)) return; // Not found or already in pack

      const updatedCard: UserFlashcard = {
        id: card.id,
        sourceType: card.sourceType,
        sourceId: card.sourceId,
        packIds: [...card.packIds, packId],
        createdAt: card.createdAt,
        easeFactor: card.easeFactor,
        interval: card.interval,
        repetitions: card.repetitions,
        nextReviewDate: card.nextReviewDate,
        lastReviewedAt: card.lastReviewedAt,
      };

      const newCards = [...cardsData.cards];
      newCards[cardIndex] = updatedCard;
      updateCards(newCards);
    },
    [cardsData.cards, updateCards]
  );

  const removeCardFromPack = useCallback(
    (cardId: string, packId: string) => {
      const cardIndex = cardsData.cards.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) return;

      // Don't allow removing from default packs
      const pack = packsData.packs.find((p) => p.id === packId);
      if (pack?.isDefault) return;

      const card = cardsData.cards[cardIndex];
      if (!card) return; // Safety check for TypeScript

      const updatedCard: UserFlashcard = {
        id: card.id,
        sourceType: card.sourceType,
        sourceId: card.sourceId,
        packIds: card.packIds.filter((id) => id !== packId),
        createdAt: card.createdAt,
        easeFactor: card.easeFactor,
        interval: card.interval,
        repetitions: card.repetitions,
        nextReviewDate: card.nextReviewDate,
        lastReviewedAt: card.lastReviewedAt,
      };

      const newCards = [...cardsData.cards];
      newCards[cardIndex] = updatedCard;
      updateCards(newCards);
    },
    [cardsData.cards, packsData.packs, updateCards]
  );

  const getDefaultPack = useCallback((): FlashcardPack | undefined => {
    return packsData.packs.find((p) => p.name === 'All Cards' && p.isDefault);
  }, [packsData.packs]);

  // ==========================================================================
  // Utility
  // ==========================================================================

  const isCardSaved = useCallback(
    (sourceType: UserFlashcard['sourceType'], sourceId: string): boolean => {
      return getCardBySource(sourceType, sourceId) !== undefined;
    },
    [getCardBySource]
  );

  const resetAll = useCallback(() => {
    const defaultPacks = initializeDefaultPacks([]);
    updateCards([]);
    updatePacks(defaultPacks);
    updateStats(createInitialStats());
  }, [initializeDefaultPacks, updateCards, updatePacks, updateStats]);

  // ==========================================================================
  // Return Hook Interface
  // ==========================================================================

  return useMemo(
    () => ({
      // State
      cards: cardsData.cards,
      packs: packsData.packs,
      stats,

      // Card Operations
      addCard,
      removeCard,
      getCardBySource,
      getCardById,
      getDueCards,
      getCardsByPack,

      // Review Operations
      recordReview,

      // Pack Operations
      createPack,
      deletePack,
      renamePack,
      moveCardToPack,
      removeCardFromPack,
      getDefaultPack,

      // Utility
      isCardSaved,
      resetAll,
    }),
    [
      cardsData.cards,
      packsData.packs,
      stats,
      addCard,
      removeCard,
      getCardBySource,
      getCardById,
      getDueCards,
      getCardsByPack,
      recordReview,
      createPack,
      deletePack,
      renamePack,
      moveCardToPack,
      removeCardFromPack,
      getDefaultPack,
      isCardSaved,
      resetAll,
    ]
  );
}

export default useFlashcardStore;

/**
 * Flashcard API Hooks
 *
 * React hooks for fetching flashcard and deck data from the database API.
 * These hooks replace the static content for flashcards.
 *
 * Sprint 36 - Flashcard Database Migration
 *
 * Usage:
 *   const { data: cards, isLoading } = useFlashcards();
 *   const { data: decks } = usePrebuiltDecks();
 *   const { data: deck } = usePrebuiltDeck(deckId);
 */

import { useState, useEffect, useCallback } from 'react';
import {
  flashcardsApi,
  decksApi,
  type Flashcard,
  type FlashcardCategory,
  type PrebuiltDeck,
  type DeckDifficulty,
} from '../services/api';

// =============================================================================
// Types
// =============================================================================

interface ApiResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// =============================================================================
// Cache for flashcard and deck data to reduce API calls
// =============================================================================

const flashcardCache: {
  cards: Flashcard[] | null;
  timestamp: number | null;
  byId: Map<string, Flashcard>;
} = {
  cards: null,
  timestamp: null,
  byId: new Map(),
};

const deckCache: {
  decks: PrebuiltDeck[] | null;
  timestamp: number | null;
  byId: Map<string, PrebuiltDeck>;
} = {
  decks: null,
  timestamp: null,
  byId: new Map(),
};

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

function isFlashcardCacheValid(): boolean {
  return (
    flashcardCache.cards !== null &&
    flashcardCache.timestamp !== null &&
    Date.now() - flashcardCache.timestamp < CACHE_TTL
  );
}

function isDeckCacheValid(): boolean {
  return (
    deckCache.decks !== null &&
    deckCache.timestamp !== null &&
    Date.now() - deckCache.timestamp < CACHE_TTL
  );
}

function clearFlashcardCache(): void {
  flashcardCache.cards = null;
  flashcardCache.timestamp = null;
  flashcardCache.byId.clear();
}

function clearDeckCache(): void {
  deckCache.decks = null;
  deckCache.timestamp = null;
  deckCache.byId.clear();
}

// =============================================================================
// Flashcard Hooks
// =============================================================================

/**
 * Fetch all flashcards from the database API
 */
export function useFlashcards(params?: {
  category?: FlashcardCategory;
  search?: string;
}): ApiResult<Flashcard[]> {
  const [data, setData] = useState<Flashcard[]>(
    isFlashcardCacheValid() && !params?.category && !params?.search
      ? flashcardCache.cards!
      : []
  );
  const [isLoading, setIsLoading] = useState(
    !isFlashcardCacheValid() || !!params?.category || !!params?.search
  );
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Stable dependency for params
  const cacheKey = `${params?.category || ''}-${params?.search || ''}`;

  const refetch = useCallback(() => {
    clearFlashcardCache();
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Use cache if available and no filters applied
    if (isFlashcardCacheValid() && !params?.category && !params?.search) {
      setData(flashcardCache.cards!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    flashcardsApi
      .getAll({
        category: params?.category,
        search: params?.search,
        limit: 500, // Get all cards in one request
      })
      .then((response) => {
        if (cancelled) return;

        setData(response.data);
        setIsLoading(false);

        // Update cache only for unfiltered requests
        if (!params?.category && !params?.search) {
          flashcardCache.cards = response.data;
          flashcardCache.timestamp = Date.now();
          flashcardCache.byId.clear();
          response.data.forEach((card) => flashcardCache.byId.set(card.id, card));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, refetchTrigger]);

  return { data, isLoading, error, refetch };
}

/**
 * Fetch a single flashcard by ID
 */
export function useFlashcard(id: string): ApiResult<Flashcard | undefined> {
  // First, check cache
  const cachedCard = flashcardCache.byId.get(id);

  const [data, setData] = useState<Flashcard | undefined>(cachedCard);
  const [isLoading, setIsLoading] = useState(!cachedCard && !!id);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(() => {
    flashcardCache.byId.delete(id);
    setData(undefined);
    setIsLoading(true);
  }, [id]);

  useEffect(() => {
    if (!id) {
      setData(undefined);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = flashcardCache.byId.get(id);
    if (cached) {
      setData(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    flashcardsApi
      .getById(id)
      .then((card) => {
        if (cancelled) return;
        setData(card);
        setIsLoading(false);
        flashcardCache.byId.set(id, card);
      })
      .catch((err) => {
        if (cancelled) return;
        // If 404, set data as undefined without error
        if (err?.statusCode === 404) {
          setData(undefined);
          setIsLoading(false);
        } else {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, isLoading, error, refetch };
}

/**
 * Get flashcards by category
 */
export function useFlashcardsByCategory(
  category: FlashcardCategory
): ApiResult<Flashcard[]> {
  return useFlashcards({ category });
}

// =============================================================================
// Prebuilt Deck Hooks
// =============================================================================

/**
 * Fetch all prebuilt decks from the database API
 */
export function usePrebuiltDecks(
  difficulty?: DeckDifficulty
): ApiResult<PrebuiltDeck[]> {
  const [data, setData] = useState<PrebuiltDeck[]>(
    isDeckCacheValid() && !difficulty ? deckCache.decks! : []
  );
  const [isLoading, setIsLoading] = useState(!isDeckCacheValid() || !!difficulty);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    clearDeckCache();
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Use cache if available and no filter applied
    if (isDeckCacheValid() && !difficulty) {
      setData(deckCache.decks!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    decksApi
      .getAll(difficulty)
      .then((response) => {
        if (cancelled) return;

        setData(response.data);
        setIsLoading(false);

        // Update cache only for unfiltered requests
        if (!difficulty) {
          deckCache.decks = response.data;
          deckCache.timestamp = Date.now();
          deckCache.byId.clear();
          response.data.forEach((deck) => deckCache.byId.set(deck.id, deck));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [difficulty, refetchTrigger]);

  return { data, isLoading, error, refetch };
}

/**
 * Fetch a single prebuilt deck by ID (includes cards)
 */
export function usePrebuiltDeck(id: string): ApiResult<PrebuiltDeck | undefined> {
  const [data, setData] = useState<PrebuiltDeck | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(!!id);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(() => {
    deckCache.byId.delete(id);
    setData(undefined);
    setIsLoading(true);
  }, [id]);

  useEffect(() => {
    if (!id) {
      setData(undefined);
      setIsLoading(false);
      return;
    }

    // For individual deck fetch, we always fetch to get cards
    // The list API doesn't include cards
    let cancelled = false;
    setIsLoading(true);

    decksApi
      .getById(id)
      .then((deck) => {
        if (cancelled) return;
        setData(deck);
        setIsLoading(false);
        deckCache.byId.set(id, deck);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.statusCode === 404) {
          setData(undefined);
          setIsLoading(false);
        } else {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, isLoading, error, refetch };
}

/**
 * Get prebuilt decks by difficulty
 */
export function usePrebuiltDecksByDifficulty(
  difficulty: DeckDifficulty
): ApiResult<PrebuiltDeck[]> {
  return usePrebuiltDecks(difficulty);
}

/**
 * Feed Data Hook (Sprint Feed-2)
 *
 * Manages feed data fetching with:
 * - Automatic exclusion of seen items
 * - Load more pagination
 * - Session memory integration
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { feedApi, newsInteractionApi } from '../services/feedApi';
import { useFeedSession } from './useFeedSession';
import type { FeedItem } from '../types/feed';

interface UseFeedOptions {
  initialLimit?: number;
  autoFetch?: boolean;
}

interface UseFeedReturn {
  items: FeedItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  currentIndex: number;
  fetchFeed: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  markItemSeen: (eventId: string) => void;
  goToIndex: (index: number) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  refresh: () => Promise<void>;
}

const DEFAULT_LIMIT = 10;
const MAX_ITEMS_IN_MEMORY = 30; // Limit items to prevent memory bloat

export function useFeed(options: UseFeedOptions = {}): UseFeedReturn {
  const { initialLimit = DEFAULT_LIMIT, autoFetch = true } = options;

  const { getSessionId, markSeen, getSeenIds } = useFeedSession();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Track if initial fetch has happened
  const hasFetched = useRef(false);

  /**
   * Fetch feed items from API
   */
  const fetchFeed = useCallback(
    async (reset = false) => {
      try {
        setIsLoading(true);
        setError(null);

        const sessionId = getSessionId();
        const seenIds = reset ? [] : getSeenIds();

        const response = await feedApi.getFeed({
          limit: initialLimit,
          exclude: seenIds,
          sessionId,
        });

        setItems(response.items);
        setHasMore(response.hasMore);
        setCurrentIndex(0);
      } catch (err) {
        console.error('Error fetching feed:', err);
        setError(err instanceof Error ? err.message : 'Failed to load feed');
      } finally {
        setIsLoading(false);
      }
    },
    [getSessionId, getSeenIds, initialLimit]
  );

  /**
   * Load more items when approaching end of feed
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);

      const sessionId = getSessionId();
      const seenIds = getSeenIds();
      const currentIds = items.map((item) => item.id);
      const excludeIds = [...new Set([...seenIds, ...currentIds])];

      const response = await feedApi.getFeed({
        limit: initialLimit,
        exclude: excludeIds,
        sessionId,
      });

      if (response.items.length > 0) {
        setItems((prev) => {
          const newItems = [...prev, ...response.items];
          // Memory optimization: trim old items if exceeding limit
          // Keep a buffer around current index to allow going back
          if (newItems.length > MAX_ITEMS_IN_MEMORY) {
            const trimCount = newItems.length - MAX_ITEMS_IN_MEMORY;
            // Adjust currentIndex when trimming from start
            setCurrentIndex((idx) => Math.max(0, idx - trimCount));
            return newItems.slice(trimCount);
          }
          return newItems;
        });
      }
      setHasMore(response.hasMore);
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, getSessionId, getSeenIds, items, initialLimit]);

  /**
   * Mark an item as seen when user swipes past it
   */
  const markItemSeen = useCallback(
    (eventId: string) => {
      markSeen(eventId);

      // Also record view to API
      const sessionId = getSessionId();
      newsInteractionApi.recordView(eventId, sessionId).catch(console.error);
    },
    [markSeen, getSessionId]
  );

  /**
   * Navigate to specific index
   */
  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < items.length) {
        // Mark current item as seen when leaving
        if (items[currentIndex]) {
          markItemSeen(items[currentIndex].id);
        }
        setCurrentIndex(index);

        // Preload more items if approaching end
        if (index >= items.length - 3 && hasMore && !isLoadingMore) {
          loadMore();
        }
      }
    },
    [items, currentIndex, markItemSeen, hasMore, isLoadingMore, loadMore]
  );

  /**
   * Go to next item
   */
  const goToNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      goToIndex(currentIndex + 1);
    }
  }, [currentIndex, items.length, goToIndex]);

  /**
   * Go to previous item
   */
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      goToIndex(currentIndex - 1);
    }
  }, [currentIndex, goToIndex]);

  /**
   * Refresh feed (clear seen items for this refresh)
   */
  const refresh = useCallback(async () => {
    await fetchFeed(false);
  }, [fetchFeed]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && !hasFetched.current) {
      hasFetched.current = true;
      fetchFeed();
    }
  }, [autoFetch, fetchFeed]);

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    currentIndex,
    fetchFeed,
    loadMore,
    markItemSeen,
    goToIndex,
    goToNext,
    goToPrevious,
    refresh,
  };
}

export default useFeed;

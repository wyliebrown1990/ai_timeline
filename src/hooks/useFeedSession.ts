/**
 * Feed Session Hook (Sprint Feed-1)
 *
 * Manages feed session state including:
 * - Session ID generation and persistence
 * - Tracking seen items (to avoid showing duplicates)
 * - Session statistics (items viewed, time spent)
 */

import { useCallback, useMemo } from 'react';
import type { FeedSessionData } from '../types/feed';

const STORAGE_KEY = 'ai_timeline_feed_session';

/**
 * Generate a UUID v4 for session ID
 */
function generateSessionId(): string {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `feed_${crypto.randomUUID()}`;
  }

  // Fallback for older browsers
  return `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get or create session data from sessionStorage
 */
function getSessionData(): FeedSessionData {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FeedSessionData;
      // Validate the data structure
      if (parsed.sessionId && Array.isArray(parsed.seenIds)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to parse feed session data:', error);
  }

  // Create new session
  const newSession: FeedSessionData = {
    sessionId: generateSessionId(),
    seenIds: [],
    sessionStart: new Date().toISOString(),
    itemsViewed: 0,
    conceptsLearned: 0,
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
  } catch (error) {
    console.warn('Failed to save feed session data:', error);
  }

  return newSession;
}

/**
 * Update session data in sessionStorage
 */
function updateSessionData(updates: Partial<FeedSessionData>): FeedSessionData {
  const current = getSessionData();
  const updated = { ...current, ...updates };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to update feed session data:', error);
  }

  return updated;
}

/**
 * Hook for managing feed session state
 *
 * @returns Session management utilities
 */
export function useFeedSession() {
  /**
   * Get the current session ID
   * Creates a new one if none exists
   */
  const getSessionId = useCallback((): string => {
    return getSessionData().sessionId;
  }, []);

  /**
   * Mark an item as seen in this session
   * Prevents it from being shown again
   */
  const markSeen = useCallback((eventId: string): void => {
    const session = getSessionData();

    if (!session.seenIds.includes(eventId)) {
      updateSessionData({
        seenIds: [...session.seenIds, eventId],
        itemsViewed: session.itemsViewed + 1,
      });
    }
  }, []);

  /**
   * Mark multiple items as seen
   */
  const markManySeen = useCallback((eventIds: string[]): void => {
    const session = getSessionData();
    const newSeenIds = new Set(session.seenIds);
    let newItems = 0;

    for (const id of eventIds) {
      if (!newSeenIds.has(id)) {
        newSeenIds.add(id);
        newItems++;
      }
    }

    if (newItems > 0) {
      updateSessionData({
        seenIds: Array.from(newSeenIds),
        itemsViewed: session.itemsViewed + newItems,
      });
    }
  }, []);

  /**
   * Get array of all seen item IDs
   */
  const getSeenIds = useCallback((): string[] => {
    return getSessionData().seenIds;
  }, []);

  /**
   * Check if an item has been seen in this session
   */
  const isSeen = useCallback((eventId: string): boolean => {
    return getSessionData().seenIds.includes(eventId);
  }, []);

  /**
   * Check if an item is unseen (not yet viewed)
   */
  const isUnseen = useCallback((eventId: string): boolean => {
    return !getSessionData().seenIds.includes(eventId);
  }, []);

  /**
   * Increment concepts learned counter
   */
  const incrementConceptsLearned = useCallback((count = 1): void => {
    const session = getSessionData();
    updateSessionData({
      conceptsLearned: session.conceptsLearned + count,
    });
  }, []);

  /**
   * Get session statistics
   */
  const getStats = useCallback((): {
    itemsViewed: number;
    conceptsLearned: number;
    sessionDurationMinutes: number;
  } => {
    const session = getSessionData();
    const startTime = new Date(session.sessionStart).getTime();
    const now = Date.now();
    const durationMs = now - startTime;
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    return {
      itemsViewed: session.itemsViewed,
      conceptsLearned: session.conceptsLearned,
      sessionDurationMinutes: durationMinutes,
    };
  }, []);

  /**
   * Clear the session (start fresh)
   * Useful for "refresh feed" functionality
   */
  const clearSession = useCallback((): void => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear feed session:', error);
    }
  }, []);

  /**
   * Clear only seen items (keep session ID and stats)
   * Useful for "show me content I've seen" functionality
   */
  const clearSeenItems = useCallback((): void => {
    updateSessionData({ seenIds: [] });
  }, []);

  return useMemo(
    () => ({
      getSessionId,
      markSeen,
      markManySeen,
      getSeenIds,
      isSeen,
      isUnseen,
      incrementConceptsLearned,
      getStats,
      clearSession,
      clearSeenItems,
    }),
    [
      getSessionId,
      markSeen,
      markManySeen,
      getSeenIds,
      isSeen,
      isUnseen,
      incrementConceptsLearned,
      getStats,
      clearSession,
      clearSeenItems,
    ]
  );
}

export default useFeedSession;

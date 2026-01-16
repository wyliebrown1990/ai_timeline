/**
 * useFeedSwipeActions Hook (Sprint Feed-3)
 *
 * Handles horizontal swipe actions:
 * - Swipe right: Save to collection (flashcard-like behavior)
 * - Swipe left: Mark as "not interested"
 */

import { useCallback, useRef } from 'react';
import { useFeedSession } from './useFeedSession';

const API_URL = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

interface UseSwipeActionsResult {
  handleSwipeRight: (eventId: string) => Promise<void>;
  handleSwipeLeft: (eventId: string) => Promise<void>;
}

export function useFeedSwipeActions(): UseSwipeActionsResult {
  const { getSessionId } = useFeedSession();
  const sessionId = getSessionId();
  const pendingActions = useRef<Set<string>>(new Set());

  /**
   * Handle swipe right - save to collection
   */
  const handleSwipeRight = useCallback(
    async (eventId: string) => {
      // Prevent concurrent actions on same item
      const actionKey = `right-${eventId}`;
      if (pendingActions.current.has(actionKey)) {
        return;
      }

      pendingActions.current.add(actionKey);

      try {
        const response = await fetch(`${API_URL}/collections/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            eventId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save');
        }
      } catch (error) {
        console.error('Swipe right (save) failed:', error);
      } finally {
        pendingActions.current.delete(actionKey);
      }
    },
    [sessionId]
  );

  /**
   * Handle swipe left - mark as not interested
   */
  const handleSwipeLeft = useCallback(
    async (eventId: string) => {
      // Prevent concurrent actions on same item
      const actionKey = `left-${eventId}`;
      if (pendingActions.current.has(actionKey)) {
        return;
      }

      pendingActions.current.add(actionKey);

      try {
        const response = await fetch(`${API_URL}/news/${eventId}/not-interested`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to record not interested');
        }
      } catch (error) {
        console.error('Swipe left (not interested) failed:', error);
      } finally {
        pendingActions.current.delete(actionKey);
      }
    },
    [sessionId]
  );

  return {
    handleSwipeRight,
    handleSwipeLeft,
  };
}

export default useFeedSwipeActions;

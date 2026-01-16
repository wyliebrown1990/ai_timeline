/**
 * useFeedSave Hook (Sprint Feed-3)
 *
 * Handles save/bookmark functionality with optimistic updates.
 * Persists to the default "Saved" collection via API.
 */

import { useState, useCallback, useRef } from 'react';
import { useFeedSession } from './useFeedSession';

interface UseSaveResult {
  isSaved: (eventId: string) => boolean;
  toggleSave: (eventId: string) => Promise<void>;
  checkSavedStatus: (eventId: string) => Promise<boolean>;
}

const API_URL = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

export function useFeedSave(): UseSaveResult {
  const { getSessionId } = useFeedSession();
  const sessionId = getSessionId();
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const pendingSaves = useRef<Set<string>>(new Set());
  const checkedItems = useRef<Set<string>>(new Set());

  /**
   * Check if an item is saved
   */
  const isSaved = useCallback(
    (eventId: string): boolean => {
      return savedItems.has(eventId);
    },
    [savedItems]
  );

  /**
   * Check saved status from API (called once per item)
   */
  const checkSavedStatus = useCallback(
    async (eventId: string): Promise<boolean> => {
      // Only check once per session
      if (checkedItems.current.has(eventId)) {
        return savedItems.has(eventId);
      }

      try {
        const response = await fetch(
          `${API_URL}/collections/check-saved?sessionId=${encodeURIComponent(sessionId)}&eventId=${encodeURIComponent(eventId)}`
        );

        if (!response.ok) {
          throw new Error('Failed to check saved status');
        }

        const data = await response.json();
        checkedItems.current.add(eventId);

        if (data.isSaved) {
          setSavedItems((prev) => {
            const next = new Set(prev);
            next.add(eventId);
            return next;
          });
        }

        return data.isSaved;
      } catch (error) {
        console.error('Error checking saved status:', error);
        return false;
      }
    },
    [sessionId, savedItems]
  );

  /**
   * Toggle save state for an item
   */
  const toggleSave = useCallback(
    async (eventId: string) => {
      // Prevent concurrent saves on same item
      if (pendingSaves.current.has(eventId)) {
        return;
      }

      const wasSaved = savedItems.has(eventId);

      // Optimistic update
      setSavedItems((prev) => {
        const next = new Set(prev);
        if (wasSaved) {
          next.delete(eventId);
        } else {
          next.add(eventId);
        }
        return next;
      });

      // Mark as pending
      pendingSaves.current.add(eventId);

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
          throw new Error('Save failed');
        }

        const data = await response.json();

        // Sync with server response
        setSavedItems((prev) => {
          const next = new Set(prev);
          if (data.isSaved) {
            next.add(eventId);
          } else {
            next.delete(eventId);
          }
          return next;
        });
      } catch (error) {
        console.error('Save failed, rolling back:', error);

        // Rollback on failure
        setSavedItems((prev) => {
          const next = new Set(prev);
          if (wasSaved) {
            next.add(eventId);
          } else {
            next.delete(eventId);
          }
          return next;
        });
      } finally {
        pendingSaves.current.delete(eventId);
      }
    },
    [savedItems, sessionId]
  );

  return {
    isSaved,
    toggleSave,
    checkSavedStatus,
  };
}

export default useFeedSave;

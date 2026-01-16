/**
 * useCollections Hook (Sprint Feed-5)
 *
 * Manages user's saved collections with full CRUD operations.
 */

import { useState, useCallback, useEffect } from 'react';
import { useFeedSession } from './useFeedSession';

const API_URL = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

export interface Collection {
  id: string;
  sessionId: string;
  userId: string | null;
  name: string;
  items: string[]; // Array of event IDs
  isPublic: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseCollectionsResult {
  collections: Collection[];
  isLoading: boolean;
  error: string | null;
  fetchCollections: () => Promise<void>;
  createCollection: (name: string, isPublic?: boolean) => Promise<Collection | null>;
  updateCollection: (id: string, updates: { name?: string; isPublic?: boolean }) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addToCollection: (collectionId: string, eventId: string) => Promise<void>;
  removeFromCollection: (collectionId: string, eventId: string) => Promise<void>;
  isInCollection: (collectionId: string, eventId: string) => boolean;
  isInAnyCollection: (eventId: string) => boolean;
  getDefaultCollection: () => Collection | undefined;
}

export function useCollections(): UseCollectionsResult {
  const { getSessionId } = useFeedSession();
  const sessionId = getSessionId();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all collections for the current session
   */
  const fetchCollections = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/collections?sessionId=${encodeURIComponent(sessionId)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }

      const data = await response.json();
      setCollections(data.collections || []);
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch collections');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Create a new collection
   */
  const createCollection = useCallback(
    async (name: string, isPublic = false): Promise<Collection | null> => {
      if (!sessionId) return null;

      try {
        const response = await fetch(`${API_URL}/collections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, name, isPublic }),
        });

        if (!response.ok) {
          throw new Error('Failed to create collection');
        }

        const data = await response.json();
        const newCollection = { ...data.collection, items: [] };

        setCollections((prev) => [...prev, newCollection]);
        return newCollection;
      } catch (err) {
        console.error('Error creating collection:', err);
        setError(err instanceof Error ? err.message : 'Failed to create collection');
        return null;
      }
    },
    [sessionId]
  );

  /**
   * Update a collection's name or visibility
   */
  const updateCollection = useCallback(
    async (id: string, updates: { name?: string; isPublic?: boolean }) => {
      try {
        const response = await fetch(`${API_URL}/collections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Failed to update collection');
        }

        setCollections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
      } catch (err) {
        console.error('Error updating collection:', err);
        setError(err instanceof Error ? err.message : 'Failed to update collection');
      }
    },
    []
  );

  /**
   * Delete a collection
   */
  const deleteCollection = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/collections/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete collection');
      }

      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error deleting collection:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
    }
  }, []);

  /**
   * Add an item to a collection
   */
  const addToCollection = useCallback(
    async (collectionId: string, eventId: string) => {
      try {
        const response = await fetch(
          `${API_URL}/collections/${collectionId}/items`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to add item to collection');
        }

        // Optimistic update
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? { ...c, items: [...c.items, eventId] }
              : c
          )
        );
      } catch (err) {
        console.error('Error adding to collection:', err);
        setError(err instanceof Error ? err.message : 'Failed to add item');
      }
    },
    []
  );

  /**
   * Remove an item from a collection
   */
  const removeFromCollection = useCallback(
    async (collectionId: string, eventId: string) => {
      try {
        const response = await fetch(
          `${API_URL}/collections/${collectionId}/items/${eventId}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          throw new Error('Failed to remove item from collection');
        }

        // Optimistic update
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? { ...c, items: c.items.filter((id) => id !== eventId) }
              : c
          )
        );
      } catch (err) {
        console.error('Error removing from collection:', err);
        setError(err instanceof Error ? err.message : 'Failed to remove item');
      }
    },
    []
  );

  /**
   * Check if an item is in a specific collection
   */
  const isInCollection = useCallback(
    (collectionId: string, eventId: string): boolean => {
      const collection = collections.find((c) => c.id === collectionId);
      return collection?.items.includes(eventId) ?? false;
    },
    [collections]
  );

  /**
   * Check if an item is in any collection
   */
  const isInAnyCollection = useCallback(
    (eventId: string): boolean => {
      return collections.some((c) => c.items.includes(eventId));
    },
    [collections]
  );

  /**
   * Get the default "Saved" collection
   */
  const getDefaultCollection = useCallback((): Collection | undefined => {
    return collections.find((c) => c.isDefault);
  }, [collections]);

  // Fetch collections on mount
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  return {
    collections,
    isLoading,
    error,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
    isInCollection,
    isInAnyCollection,
    getDefaultCollection,
  };
}

export default useCollections;

/**
 * Feed API Client (Sprint Feed-1)
 *
 * API client for the TikTok-style news feed functionality:
 * - Feed retrieval (ranked by hot score)
 * - Interaction tracking (views, votes, engagement)
 * - Collections management (save/organize items)
 */

import type { SavedCollection, VoteResponse, FeedResponse, FeedItem } from '../types/feed';

const API_BASE = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: { error?: string } = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      // Not JSON
    }
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============================================================================
// Feed API
// ============================================================================

export const feedApi = {
  /**
   * Get personalized feed sorted by hot score
   *
   * @param options.limit - Number of items (default: 10, max: 50)
   * @param options.exclude - Array of event IDs to exclude (seen items)
   * @param options.sessionId - Session ID for personalization
   */
  async getFeed(options: {
    limit?: number;
    exclude?: string[];
    sessionId?: string;
  } = {}): Promise<FeedResponse> {
    const params = new URLSearchParams();

    if (options.limit) {
      params.set('limit', String(options.limit));
    }
    if (options.exclude && options.exclude.length > 0) {
      params.set('exclude', options.exclude.join(','));
    }
    if (options.sessionId) {
      params.set('sessionId', options.sessionId);
    }

    const queryString = params.toString();
    const url = `${API_BASE}/feed${queryString ? `?${queryString}` : ''}`;

    return fetchJson<FeedResponse>(url);
  },

  /**
   * Get trending items (high engagement in last 24 hours)
   */
  async getTrending(limit?: number): Promise<FeedResponse> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<FeedResponse>(`${API_BASE}/feed/trending${params}`);
  },

  /**
   * Get fresh items (newest, sorted by published date)
   */
  async getFresh(limit?: number): Promise<FeedResponse> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchJson<FeedResponse>(`${API_BASE}/feed/fresh${params}`);
  },

  /**
   * Get a single news event by ID
   * Sprint Feed-5: For sharing and deep linking with OG tags
   * Note: Returns partial FeedItem (commentCount may be missing)
   */
  async getById(id: string): Promise<Omit<FeedItem, 'commentCount'> & { commentCount?: number }> {
    return fetchJson<Omit<FeedItem, 'commentCount'> & { commentCount?: number }>(`${API_BASE}/news/${id}`);
  },
};

// ============================================================================
// Interaction API
// ============================================================================

export const newsInteractionApi = {
  /**
   * Record upvote or downvote on a news event
   *
   * @param eventId - The event ID
   * @param vote - 'up' or 'down'
   * @param sessionId - Session ID for tracking
   */
  async vote(
    eventId: string,
    vote: 'up' | 'down',
    sessionId: string
  ): Promise<VoteResponse> {
    return fetchJson<VoteResponse>(`${API_BASE}/news/${eventId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote, sessionId }),
    });
  },

  /**
   * Remove vote from a news event
   */
  async removeVote(eventId: string, sessionId: string): Promise<VoteResponse> {
    return fetchJson<VoteResponse>(`${API_BASE}/news/${eventId}/vote`, {
      method: 'DELETE',
      body: JSON.stringify({ sessionId }),
    });
  },

  /**
   * Record a view on a news event
   */
  async recordView(eventId: string, sessionId: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`${API_BASE}/news/${eventId}/view`, {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  /**
   * Record meaningful engagement (completion) on a news event
   *
   * @param eventId - The event ID
   * @param sessionId - Session ID for tracking
   * @param engagementType - Type of engagement: 'read_context' | 'watch_video' | 'view_concepts' | 'chat'
   */
  async recordEngagement(
    eventId: string,
    sessionId: string,
    engagementType?: string
  ): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`${API_BASE}/news/${eventId}/engage`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, engagementType }),
    });
  },

  /**
   * Record a share action
   *
   * @param eventId - The event ID
   * @param sessionId - Session ID for tracking
   * @param platform - Share platform: 'twitter' | 'linkedin' | 'facebook' | 'whatsapp' | 'email' | 'copy'
   */
  async recordShare(
    eventId: string,
    sessionId: string,
    platform: string
  ): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`${API_BASE}/news/${eventId}/share`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, platform }),
    });
  },

  /**
   * Get current user's vote on an event
   */
  async getUserVote(
    eventId: string,
    sessionId: string
  ): Promise<{ userVote: 'up' | 'down' | null }> {
    return fetchJson<{ userVote: 'up' | 'down' | null }>(
      `${API_BASE}/news/${eventId}/user-vote?sessionId=${encodeURIComponent(sessionId)}`
    );
  },
};

// ============================================================================
// Collections API
// ============================================================================

export const collectionsApi = {
  /**
   * Get all collections for a session
   */
  async getAll(sessionId: string): Promise<{ collections: SavedCollection[] }> {
    return fetchJson<{ collections: SavedCollection[] }>(
      `${API_BASE}/collections?sessionId=${encodeURIComponent(sessionId)}`
    );
  },

  /**
   * Create a new collection
   */
  async create(
    sessionId: string,
    name: string,
    isPublic = false
  ): Promise<SavedCollection> {
    return fetchJson<SavedCollection>(`${API_BASE}/collections`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, name, isPublic }),
    });
  },

  /**
   * Update a collection
   */
  async update(
    id: string,
    data: { name?: string; isPublic?: boolean }
  ): Promise<SavedCollection> {
    return fetchJson<SavedCollection>(`${API_BASE}/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a collection
   */
  async delete(id: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`${API_BASE}/collections/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Add an item to a collection
   */
  async addItem(collectionId: string, eventId: string): Promise<{ items: string[] }> {
    return fetchJson<{ items: string[] }>(`${API_BASE}/collections/${collectionId}/items`, {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    });
  },

  /**
   * Remove an item from a collection
   */
  async removeItem(collectionId: string, eventId: string): Promise<{ items: string[] }> {
    return fetchJson<{ items: string[] }>(
      `${API_BASE}/collections/${collectionId}/items/${eventId}`,
      { method: 'DELETE' }
    );
  },

  /**
   * Quick save/unsave to default "Saved" collection
   * Returns the new saved state
   */
  async toggleSave(sessionId: string, eventId: string): Promise<{ isSaved: boolean }> {
    return fetchJson<{ isSaved: boolean }>(`${API_BASE}/collections/save`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, eventId }),
    });
  },

  /**
   * Check if an item is saved
   */
  async checkSaved(
    sessionId: string,
    eventId: string
  ): Promise<{ isSaved: boolean }> {
    return fetchJson<{ isSaved: boolean }>(
      `${API_BASE}/collections/check-saved?sessionId=${encodeURIComponent(sessionId)}&eventId=${encodeURIComponent(eventId)}`
    );
  },
};

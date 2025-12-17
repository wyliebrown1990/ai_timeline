/**
 * Chat API Client
 * Provides methods for interacting with the AI Learning Companion API
 */

import type {
  ChatRequest,
  ChatResponse,
  RateLimitStatus,
  PrerequisitesResponse,
} from '../types/chat';
import { ApiError } from './api';

/**
 * API base URL - uses relative URL to work with Vite proxy in development
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Generate a unique session ID for rate limiting
 * Persists across page refreshes using sessionStorage
 */
export function getSessionId(): string {
  const storageKey = 'ai_companion_session_id';
  let sessionId = sessionStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
}

/**
 * Chat API client for the AI Learning Companion
 */
export const chatApi = {
  /**
   * Send a message to the AI companion
   */
  async sendMessage(request: Omit<ChatRequest, 'sessionId'>): Promise<ChatResponse> {
    const sessionId = getSessionId();

    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        sessionId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));

      // Handle rate limit specifically
      if (response.status === 429) {
        const retryAfter = error.retryAfterMs
          ? Math.ceil(error.retryAfterMs / 1000)
          : 60;
        throw new ApiError(
          429,
          `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`,
          { retryAfterMs: error.retryAfterMs }
        );
      }

      throw new ApiError(
        response.status,
        error.error || error.message || 'Failed to send message',
        error
      );
    }

    return response.json();
  },

  /**
   * Get current rate limit status
   */
  async getStatus(): Promise<RateLimitStatus> {
    const sessionId = getSessionId();

    const response = await fetch(`${API_BASE}/chat/status?sessionId=${encodeURIComponent(sessionId)}`);

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to get rate limit status');
    }

    return response.json();
  },

  /**
   * Get prerequisite concepts for a topic
   */
  async getPrerequisites(concept: string): Promise<PrerequisitesResponse> {
    const response = await fetch(
      `${API_BASE}/chat/prerequisites?concept=${encodeURIComponent(concept)}`
    );

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to get prerequisites');
    }

    return response.json();
  },

  /**
   * Check if the chat service is healthy
   */
  async healthCheck(): Promise<{ status: string; apiKeyConfigured: boolean }> {
    const response = await fetch(`${API_BASE}/chat/health`);

    if (!response.ok) {
      throw new ApiError(response.status, 'Chat service unavailable');
    }

    return response.json();
  },
};

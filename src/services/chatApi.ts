/**
 * Chat API Client
 * Provides methods for interacting with the AI Learning Companion API
 *
 * Supports two modes:
 * 1. Direct Anthropic API calls using user-provided API key (BYOK)
 * 2. Backend proxy calls when no user key is available
 */

import type {
  ChatRequest,
  ChatResponse,
  RateLimitStatus,
  PrerequisitesResponse,
} from '../types/chat';
import { ApiError } from './api';
import { apiKeyService } from './apiKeyService';

/**
 * API base URL - uses relative URL to work with Vite proxy in development
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Anthropic API URL for direct browser calls
 */
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

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
 * Send a message directly to Anthropic API using user's key
 */
async function sendMessageDirect(
  request: Omit<ChatRequest, 'sessionId'>,
  apiKey: string
): Promise<ChatResponse> {
  // Build system prompt based on explain mode
  let systemPrompt = `You are an AI Learning Companion helping users understand the history of artificial intelligence.
Be educational, engaging, and accurate. Reference specific historical milestones when relevant.`;

  if (request.explainMode === 'plain_english') {
    systemPrompt += '\n\nExplain concepts in simple, accessible language suitable for beginners.';
  } else if (request.explainMode === 'technical') {
    systemPrompt += '\n\nProvide technical details appropriate for someone with a CS background.';
  }

  // Add milestone context if provided
  if (request.milestoneContext) {
    systemPrompt += `\n\nContext: The user is viewing milestone "${request.milestoneContext.title}" (${request.milestoneContext.date}): ${request.milestoneContext.description}`;
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: request.message }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    if (response.status === 429) {
      throw new ApiError(429, 'Rate limit exceeded. Please wait before trying again.');
    }

    if (response.status === 401) {
      throw new ApiError(401, 'Invalid API key. Please update your key in settings.');
    }

    throw new ApiError(
      response.status,
      error.error?.message || 'Failed to get AI response'
    );
  }

  const data = await response.json();

  // Extract text from Anthropic response format
  const textContent = data.content?.find((c: { type: string }) => c.type === 'text');
  const responseText = textContent?.text || 'No response generated.';

  return {
    response: responseText,
  };
}

/**
 * Chat API client for the AI Learning Companion
 */
export const chatApi = {
  /**
   * Send a message to the AI companion
   * Uses direct Anthropic API if user has provided an API key,
   * otherwise falls back to backend proxy
   */
  async sendMessage(request: Omit<ChatRequest, 'sessionId'>): Promise<ChatResponse> {
    // Check for user-provided API key first
    const userApiKey = await apiKeyService.getKey();

    if (userApiKey) {
      // Use direct Anthropic API with user's key
      return sendMessageDirect(request, userApiKey);
    }

    // Fall back to backend proxy
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

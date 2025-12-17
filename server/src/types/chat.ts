/**
 * Chat API Types
 * Type definitions for the AI Learning Companion chat functionality
 */

/**
 * Milestone context passed to the AI for contextual explanations
 */
export interface MilestoneContext {
  id: string;
  title: string;
  description: string;
  date: string;
  category?: string;
  tags?: string[];
}

/**
 * Request body for the POST /api/chat endpoint
 */
export interface ChatRequest {
  message: string;
  milestoneContext?: MilestoneContext;
  sessionId: string;
  explainMode?: ExplainMode;
}

/**
 * Available explanation modes for tailoring responses
 */
export type ExplainMode =
  | 'plain_english'    // Default: Simple, accessible explanations
  | 'for_boss'         // Business-focused, emphasizes ROI and strategy
  | 'technical'        // Deep technical details for developers
  | 'interview';       // Concise answers suitable for job interviews

/**
 * Response body from the POST /api/chat endpoint
 */
export interface ChatResponse {
  response: string;
  suggestedFollowUps?: string[];
  prerequisites?: string[];
}

/**
 * Chat message for history tracking (used internally)
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * Rate limit tracking per session
 */
export interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/**
 * Chat Types for AI Learning Companion
 * Frontend type definitions for the chat functionality
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
 * Available explanation modes for tailoring responses
 */
export type ExplainMode =
  | 'plain_english'    // Default: Simple, accessible explanations
  | 'for_boss'         // Business-focused, emphasizes ROI and strategy
  | 'technical'        // Deep technical details for developers
  | 'interview';       // Concise answers suitable for job interviews

/**
 * Display labels for explain modes
 */
export const EXPLAIN_MODE_LABELS: Record<ExplainMode, string> = {
  plain_english: 'Plain English',
  for_boss: 'For My Boss',
  technical: 'Technical Deep-Dive',
  interview: 'Interview Prep',
};

/**
 * Chat message in the conversation
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * User profile context for personalized AI responses
 */
export interface UserProfileContext {
  role: string;
  goals: string[];
  preferredExplanationLevel: string;
}

/**
 * Request to send a chat message
 */
export interface ChatRequest {
  message: string;
  sessionId: string;
  milestoneContext?: MilestoneContext;
  explainMode?: ExplainMode;
  userProfile?: UserProfileContext;
}

/**
 * Response from the chat API
 */
export interface ChatResponse {
  response: string;
  suggestedFollowUps?: string[];
}

/**
 * Rate limit status from the API
 */
export interface RateLimitStatus {
  remaining: number;
  resetAt: number;
  canSendMessage: boolean;
}

/**
 * Prerequisite concept information
 */
export interface Prerequisite {
  name: string;
  reason: string;
}

/**
 * Response from prerequisites endpoint
 */
export interface PrerequisitesResponse {
  concept: string;
  prerequisites: Prerequisite[];
  message: string | null;
}

/**
 * Chat panel state
 */
export interface ChatPanelState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  milestoneContext: MilestoneContext | null;
  explainMode: ExplainMode;
  suggestedFollowUps: string[];
}

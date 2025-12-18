/**
 * Claude API Client Service
 * Handles communication with the Anthropic Claude API
 */

import type { ChatMessage, ChatResponse, ExplainMode, MilestoneContext } from '../types/chat';
import { buildSystemPrompt, generateFollowUpPrompt, generatePrerequisitePrompt } from '../prompts';

// API Configuration
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'; // Using Claude Sonnet for balance of quality/cost
const MAX_TOKENS = 1024;

/**
 * Request logging for cost monitoring
 * Logs are stored in-memory for real-time stats and written to CloudWatch for historical queries
 */
interface ChatLogEntry {
  timestamp: string;
  requestId: string;
  sessionId: string;
  requestType: 'chat' | 'prerequisites' | 'follow-ups';
  inputTokens: number;
  outputTokens: number;
  model: string;
  duration: number;
  success: boolean;
  error?: string;
  errorType?: 'rate_limit' | 'api_error' | 'timeout' | 'auth' | 'network' | 'unknown';
  explainMode?: string;
  milestoneId?: string;
  clientIp?: string;
  userAgent?: string;
}

const chatLogs: ChatLogEntry[] = [];
const MAX_IN_MEMORY_LOGS = 500; // Keep recent logs in memory for real-time stats

/**
 * Generate a simple request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Categorize error into error type
 */
function categorizeError(error: string): ChatLogEntry['errorType'] {
  const lowerError = error.toLowerCase();
  if (lowerError.includes('rate limit') || lowerError.includes('too many')) return 'rate_limit';
  if (lowerError.includes('timeout') || lowerError.includes('timed out')) return 'timeout';
  if (lowerError.includes('api key') || lowerError.includes('unauthorized') || lowerError.includes('401')) return 'auth';
  if (lowerError.includes('network') || lowerError.includes('connection')) return 'network';
  if (lowerError.includes('500') || lowerError.includes('api')) return 'api_error';
  return 'unknown';
}

/**
 * Logs a chat request for cost monitoring
 */
function logChatRequest(entry: ChatLogEntry): void {
  chatLogs.push(entry);

  // Keep only recent logs in memory
  if (chatLogs.length > MAX_IN_MEMORY_LOGS) {
    chatLogs.shift();
  }

  // Write to CloudWatch via console.warn (structured JSON for Logs Insights queries)
  console.warn('[CHAT_LOG]', JSON.stringify(entry));
}

/**
 * Gets the Anthropic API key from environment
 * In production, this would fetch from AWS Secrets Manager
 */
function getApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Anthropic API response types
 */
interface AnthropicMessage {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicError {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

/**
 * Sends a message to Claude and returns the response
 */
export async function sendMessage(
  userMessage: string,
  sessionId: string,
  options: {
    milestoneContext?: MilestoneContext;
    explainMode?: ExplainMode;
    conversationHistory?: ChatMessage[];
    clientIp?: string;
    userAgent?: string;
  } = {}
): Promise<ChatResponse> {
  const startTime = Date.now();
  const { milestoneContext, explainMode = 'plain_english', conversationHistory = [], clientIp, userAgent } = options;

  // Build the system prompt based on mode and context
  const systemPrompt = buildSystemPrompt(explainMode, milestoneContext);

  // Convert conversation history to Claude format
  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  const requestId = generateRequestId();
  let logEntry: ChatLogEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    sessionId,
    requestType: 'chat',
    inputTokens: 0,
    outputTokens: 0,
    model: CLAUDE_MODEL,
    duration: 0,
    success: false,
    explainMode,
    milestoneId: milestoneContext?.id,
    clientIp,
    userAgent,
  };

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getApiKey(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as AnthropicError;
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }

    const data = (await response.json()) as AnthropicMessage;

    // Extract the response text
    const responseText =
      data.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('') || 'I apologize, but I was unable to generate a response.';

    // Update log entry with success data
    logEntry = {
      ...logEntry,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      duration: Date.now() - startTime,
      success: true,
    };

    logChatRequest(logEntry);

    // Generate follow-up suggestions asynchronously (non-blocking)
    const suggestedFollowUps = await generateFollowUps(userMessage);

    return {
      response: responseText,
      suggestedFollowUps,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logEntry = {
      ...logEntry,
      duration: Date.now() - startTime,
      success: false,
      error: errorMessage,
      errorType: categorizeError(errorMessage),
    };

    logChatRequest(logEntry);
    throw error;
  }
}

/**
 * Prerequisite information returned by detection
 */
export interface Prerequisite {
  name: string;
  reason: string;
}

/**
 * Generates follow-up question suggestions based on the conversation
 */
async function generateFollowUps(topic: string): Promise<string[]> {
  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getApiKey(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest', // Use Haiku for quick, cheap follow-up generation
        max_tokens: 256,
        messages: [{ role: 'user', content: generateFollowUpPrompt(topic) }],
      }),
    });

    if (!response.ok) {
      return []; // Silently fail for follow-ups
    }

    const data = (await response.json()) as AnthropicMessage;
    const text =
      data.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('') || '[]';

    // Parse the JSON array from the response
    const followUps = JSON.parse(text);
    return Array.isArray(followUps) ? followUps.slice(0, 3) : [];
  } catch {
    // Silently fail for follow-up generation - it's not critical
    return [];
  }
}

/**
 * Gets recent chat logs for cost monitoring
 * In production, this would query CloudWatch
 */
export function getRecentLogs(limit = 100): ChatLogEntry[] {
  return chatLogs.slice(-limit);
}

/**
 * Calculates estimated cost from log entries
 * Based on Claude API pricing
 */
export function estimateCosts(logs: ChatLogEntry[]): {
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUsd: number;
} {
  const inputTokens = logs.reduce((sum, log) => sum + log.inputTokens, 0);
  const outputTokens = logs.reduce((sum, log) => sum + log.outputTokens, 0);

  // Claude Sonnet pricing (as of 2024): $3/1M input, $15/1M output
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;

  return {
    totalInputTokens: inputTokens,
    totalOutputTokens: outputTokens,
    estimatedCostUsd: inputCost + outputCost,
  };
}

/**
 * Detects prerequisite concepts that users should understand
 * before diving into a complex topic
 */
export async function detectPrerequisites(concept: string): Promise<Prerequisite[]> {
  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getApiKey(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest', // Use Haiku for quick, cheap prerequisite detection
        max_tokens: 512,
        messages: [{ role: 'user', content: generatePrerequisitePrompt(concept) }],
      }),
    });

    if (!response.ok) {
      return []; // Silently fail for prerequisites
    }

    const data = (await response.json()) as AnthropicMessage;
    const text =
      data.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('') || '[]';

    // Parse the JSON array from the response
    const prerequisites = JSON.parse(text);
    if (Array.isArray(prerequisites)) {
      return prerequisites
        .filter((p): p is Prerequisite =>
          typeof p === 'object' &&
          p !== null &&
          typeof p.name === 'string' &&
          typeof p.reason === 'string'
        )
        .slice(0, 3);
    }
    return [];
  } catch {
    // Silently fail for prerequisite detection - it's not critical
    return [];
  }
}

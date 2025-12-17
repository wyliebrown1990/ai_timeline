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
 * In production, this would write to CloudWatch or a logging service
 */
interface ChatLogEntry {
  timestamp: string;
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  duration: number;
  success: boolean;
  error?: string;
}

const chatLogs: ChatLogEntry[] = [];

/**
 * Logs a chat request for cost monitoring
 */
function logChatRequest(entry: ChatLogEntry): void {
  chatLogs.push(entry);

  // In production, send to CloudWatch
  // Using console.warn for visibility in logs while complying with lint rules
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
  } = {}
): Promise<ChatResponse> {
  const startTime = Date.now();
  const { milestoneContext, explainMode = 'plain_english', conversationHistory = [] } = options;

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

  let logEntry: ChatLogEntry = {
    timestamp: new Date().toISOString(),
    sessionId,
    inputTokens: 0,
    outputTokens: 0,
    model: CLAUDE_MODEL,
    duration: 0,
    success: false,
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
    logEntry = {
      ...logEntry,
      duration: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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

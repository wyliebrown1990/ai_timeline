/**
 * Chat Controller
 * Handles HTTP requests for the AI Learning Companion chat API
 */

import type { Request, Response, NextFunction } from 'express';
import type { ChatRequest, ChatResponse } from '../types/chat';
import { sendMessage, getRecentLogs, estimateCosts, detectPrerequisites } from '../services/claude';
import { checkRateLimit, getRateLimitStatus } from '../services/rateLimit';

/**
 * POST /api/chat
 * Send a message to the AI companion and receive a response
 */
export async function chat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { message, sessionId, milestoneContext, explainMode } = req.body as ChatRequest;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required and must be a string' });
      return;
    }

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    // Check rate limit
    const rateLimitResult = checkRateLimit(sessionId);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', '10');
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt.toString());

    if (!rateLimitResult.allowed) {
      res.setHeader('Retry-After', Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000).toString());
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfterMs: rateLimitResult.retryAfterMs,
        message: 'Please wait before sending more messages. Limit: 10 requests per minute.',
      });
      return;
    }

    // Send message to Claude
    const response = await sendMessage(message, sessionId, {
      milestoneContext,
      explainMode,
    });

    const chatResponse: ChatResponse = {
      response: response.response,
      suggestedFollowUps: response.suggestedFollowUps,
    };

    res.json(chatResponse);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/chat/status
 * Get rate limit status for a session without incrementing counter
 */
export function getStatus(req: Request, res: Response): void {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({ error: 'Session ID is required' });
    return;
  }

  const status = getRateLimitStatus(sessionId);

  res.json({
    remaining: status.remaining,
    resetAt: status.resetAt,
    canSendMessage: status.allowed,
  });
}

/**
 * GET /api/chat/logs
 * Get recent chat logs for cost monitoring (admin only in production)
 */
export function getLogs(req: Request, res: Response): void {
  const limit = parseInt(req.query.limit as string) || 100;
  const logs = getRecentLogs(limit);
  const costs = estimateCosts(logs);

  res.json({
    logs,
    summary: {
      totalRequests: logs.length,
      successfulRequests: logs.filter((log) => log.success).length,
      failedRequests: logs.filter((log) => !log.success).length,
      ...costs,
    },
  });
}

/**
 * GET /api/chat/health
 * Health check for the chat service
 */
export function healthCheck(_req: Request, res: Response): void {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  res.json({
    status: hasApiKey ? 'healthy' : 'degraded',
    apiKeyConfigured: hasApiKey,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/chat/prerequisites
 * Get prerequisite concepts for understanding a topic
 */
export async function getPrerequisites(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const concept = req.query.concept as string;

    if (!concept || typeof concept !== 'string') {
      res.status(400).json({ error: 'Concept query parameter is required' });
      return;
    }

    const prerequisites = await detectPrerequisites(concept);

    res.json({
      concept,
      prerequisites,
      message: prerequisites.length > 0
        ? `To understand ${concept}, first learn about:`
        : null,
    });
  } catch (error) {
    next(error);
  }
}

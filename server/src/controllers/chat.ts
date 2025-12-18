/**
 * Chat Controller
 * Handles HTTP requests for the AI Learning Companion chat API
 */

import type { Request, Response, NextFunction } from 'express';
import type { ChatRequest, ChatResponse } from '../types/chat';
import { sendMessage, getRecentLogs, estimateCosts, detectPrerequisites } from '../services/claude';
import { checkRateLimit, getRateLimitStatus, getRateLimitStats } from '../services/rateLimit';
import { queryHistoricalStats } from '../services/cloudwatchLogs';

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

    // Extract client info for tracking
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Send message to Claude
    const response = await sendMessage(message, sessionId, {
      milestoneContext,
      explainMode,
      clientIp,
      userAgent,
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
 * GET /api/chat/admin-stats
 * Get comprehensive API usage statistics for admin monitoring (admin only)
 * Query params:
 *   - hours: number (1, 24, 168, 720) - time range to query (default: 24)
 *   - source: 'memory' | 'cloudwatch' | 'both' - data source (default: 'both')
 */
export async function getAdminStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hours = Math.min(parseInt(req.query.hours as string) || 24, 720); // Max 30 days
    const source = (req.query.source as string) || 'both';

    // Get in-memory logs (real-time, but lost on Lambda cold start)
    const memoryLogs = getRecentLogs(1000);
    const rateLimitStats = getRateLimitStats();

    // Query CloudWatch for historical data (persisted)
    let historicalStats = null;
    if (source === 'cloudwatch' || source === 'both') {
      try {
        historicalStats = await queryHistoricalStats(hours);
      } catch (cwError) {
        console.error('[AdminStats] CloudWatch query failed:', cwError);
        // Continue with memory-only data
      }
    }

    // Use CloudWatch data if available, otherwise fall back to memory
    const useCloudWatch = historicalStats && historicalStats.totalRequests > 0;
    const primaryData = useCloudWatch ? historicalStats : null;

    // Calculate stats from memory logs for comparison/fallback
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const memoryLogsLastHour = memoryLogs.filter((log) => new Date(log.timestamp).getTime() > oneHourAgo);

    // Calculate memory-based stats
    const memoryErrorLogs = memoryLogs.filter((log) => !log.success);
    const memorySuccessfulLogs = memoryLogs.filter((log) => log.success);
    const memoryAvgResponseTime =
      memorySuccessfulLogs.length > 0
        ? memorySuccessfulLogs.reduce((sum, log) => sum + log.duration, 0) / memorySuccessfulLogs.length
        : 0;
    const memoryUniqueSessions = new Set(memoryLogs.map((log) => log.sessionId)).size;
    const memoryCosts = estimateCosts(memoryLogs);

    // Merge or use primary data
    const totalRequests = primaryData?.totalRequests ?? memoryLogs.length;
    const successfulRequests = primaryData?.successfulRequests ?? memorySuccessfulLogs.length;
    const failedRequests = primaryData?.failedRequests ?? memoryErrorLogs.length;
    const totalInputTokens = primaryData?.totalInputTokens ?? memoryCosts.totalInputTokens;
    const totalOutputTokens = primaryData?.totalOutputTokens ?? memoryCosts.totalOutputTokens;
    const uniqueSessions = primaryData?.uniqueSessions ?? memoryUniqueSessions;
    const uniqueIps = primaryData?.uniqueIps ?? 0; // Only available from CloudWatch (has clientIp)
    const avgResponseTime = primaryData
      ? primaryData.totalRequests > 0
        ? primaryData.totalDurationMs / primaryData.totalRequests
        : 0
      : memoryAvgResponseTime;
    const errorsByType = primaryData?.errorsByType ?? {};

    // Estimate costs (Claude Sonnet: $3/1M input, $15/1M output)
    const inputCost = (totalInputTokens / 1_000_000) * 3;
    const outputCost = (totalOutputTokens / 1_000_000) * 15;
    const estimatedCostUsd = inputCost + outputCost;

    // Prepare recent logs (prefer CloudWatch for historical view)
    const recentLogs = primaryData?.logs?.slice(0, 50) ?? memoryLogs.slice(-50).reverse();

    res.json({
      summary: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : '0',
        avgResponseTimeMs: Math.round(avgResponseTime),
        uniqueSessions: typeof uniqueSessions === 'number' ? uniqueSessions : uniqueSessions,
        uniqueIps: typeof uniqueIps === 'number' ? uniqueIps : uniqueIps,
      },
      timeStats: {
        requestsLastHour: memoryLogsLastHour.length,
        requestsInRange: totalRequests,
        errorsLastHour: memoryLogsLastHour.filter((log) => !log.success).length,
        errorsInRange: failedRequests,
        hoursQueried: hours,
      },
      costs: {
        totalInputTokens,
        totalOutputTokens,
        estimatedCostUsd: estimatedCostUsd.toFixed(4),
      },
      rateLimit: {
        activeSessions: rateLimitStats.activeSessions,
        totalRequestsInWindow: rateLimitStats.totalRequestsInWindow,
        sessionsAtLimit: rateLimitStats.sessionsAtLimit,
        limitPerMinute: 10,
      },
      errors: {
        total: failedRequests,
        byType: errorsByType,
      },
      requestsByHour: primaryData?.requestsByHour ?? [],
      recentLogs,
      dataSource: useCloudWatch ? 'cloudwatch' : 'memory',
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
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

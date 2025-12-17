/**
 * Chat API Routes
 * All routes are prefixed with /api/chat
 */

import { Router } from 'express';
import * as chatController from '../controllers/chat';

const router = Router();

/**
 * POST /api/chat
 * Send a message to the AI companion
 *
 * Request body:
 * {
 *   message: string;           // The user's question
 *   sessionId: string;         // Unique session identifier
 *   milestoneContext?: {       // Optional: context about current milestone
 *     id: string;
 *     title: string;
 *     description: string;
 *     date: string;
 *     category?: string;
 *     tags?: string[];
 *   };
 *   explainMode?: 'plain_english' | 'for_boss' | 'technical' | 'interview';
 * }
 *
 * Response:
 * {
 *   response: string;
 *   suggestedFollowUps?: string[];
 * }
 */
router.post('/', chatController.chat);

/**
 * GET /api/chat/status
 * Get rate limit status for a session
 *
 * Query params:
 * - sessionId: string
 *
 * Response:
 * {
 *   remaining: number;
 *   resetAt: number;
 *   canSendMessage: boolean;
 * }
 */
router.get('/status', chatController.getStatus);

/**
 * GET /api/chat/logs
 * Get recent chat logs for cost monitoring
 * Note: Should be protected in production
 *
 * Query params:
 * - limit?: number (default: 100)
 *
 * Response:
 * {
 *   logs: ChatLogEntry[];
 *   summary: {
 *     totalRequests: number;
 *     successfulRequests: number;
 *     failedRequests: number;
 *     totalInputTokens: number;
 *     totalOutputTokens: number;
 *     estimatedCostUsd: number;
 *   };
 * }
 */
router.get('/logs', chatController.getLogs);

/**
 * GET /api/chat/health
 * Health check for the chat service
 *
 * Response:
 * {
 *   status: 'healthy' | 'degraded';
 *   apiKeyConfigured: boolean;
 *   timestamp: string;
 * }
 */
router.get('/health', chatController.healthCheck);

/**
 * GET /api/chat/prerequisites
 * Get prerequisite concepts for understanding a topic
 *
 * Query params:
 * - concept: string (the topic to analyze)
 *
 * Response:
 * {
 *   concept: string;
 *   prerequisites: Array<{ name: string; reason: string }>;
 *   message: string | null;
 * }
 */
router.get('/prerequisites', chatController.getPrerequisites);

export default router;

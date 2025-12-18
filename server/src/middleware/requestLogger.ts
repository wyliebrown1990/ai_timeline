/**
 * Request Logger Middleware
 * Logs API requests to CloudWatch in structured JSON format for monitoring
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Log entry format for CloudWatch Logs Insights queries
 */
interface ApiLogEntry {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userAgent?: string;
  sessionId?: string;
  error?: string;
  apiType: 'chat' | 'health' | 'auth' | 'milestones' | 'other';
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Determine API type from path for categorization
 */
function getApiType(path: string): ApiLogEntry['apiType'] {
  if (path.includes('/chat')) return 'chat';
  if (path.includes('/health')) return 'health';
  if (path.includes('/auth')) return 'auth';
  if (path.includes('/milestones')) return 'milestones';
  return 'other';
}

/**
 * Request logging middleware
 * Logs structured JSON for CloudWatch Logs Insights analysis
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = generateRequestId();

  // Attach request ID for tracing
  req.headers['x-request-id'] = requestId;

  // Log after response is sent
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const sessionId = req.body?.sessionId || req.query?.sessionId;

    const logEntry: ApiLogEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      userAgent: req.headers['user-agent'],
      sessionId: sessionId as string | undefined,
      apiType: getApiType(req.path),
    };

    // Add error info for failed requests
    if (res.statusCode >= 400) {
      logEntry.error = res.statusMessage || 'Request failed';
    }

    // Log as JSON for CloudWatch Logs Insights
    console.log(JSON.stringify({
      level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
      message: `API ${req.method} ${req.path}`,
      ...logEntry,
    }));
  });

  next();
}

export default requestLogger;

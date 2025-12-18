/**
 * CloudWatch Logs Insights Service
 * Queries historical chat logs for API monitoring
 */

import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
  QueryStatus,
} from '@aws-sdk/client-cloudwatch-logs';

const client = new CloudWatchLogsClient({ region: 'us-east-1' });
const LOG_GROUP = '/aws/lambda/ai-timeline-api-prod';

// Cache for query results to reduce costs
interface CacheEntry {
  data: HistoricalStats;
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Historical stats from CloudWatch Logs
 */
export interface HistoricalStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  uniqueSessions: Set<string> | number;
  uniqueIps: Set<string> | number;
  totalDurationMs: number;
  errorsByType: Record<string, number>;
  requestsByHour: Array<{ hour: string; count: number }>;
  logs: HistoricalLogEntry[];
}

export interface HistoricalLogEntry {
  timestamp: string;
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  duration: number;
  success: boolean;
  error?: string;
  requestType?: string;
  clientIp?: string;
  userAgent?: string;
}

/**
 * Query CloudWatch Logs Insights for chat logs
 */
export async function queryHistoricalStats(hours: number = 24): Promise<HistoricalStats> {
  const cacheKey = `stats-${hours}h`;
  const cached = queryCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const endTime = Date.now();
  const startTime = endTime - hours * 60 * 60 * 1000;

  // Query for CHAT_LOG entries
  const query = `
    fields @timestamp, @message
    | filter @message like /\\[CHAT_LOG\\]/
    | sort @timestamp desc
    | limit 1000
  `;

  try {
    const startQuery = await client.send(
      new StartQueryCommand({
        logGroupName: LOG_GROUP,
        startTime: Math.floor(startTime / 1000),
        endTime: Math.floor(endTime / 1000),
        queryString: query,
      })
    );

    if (!startQuery.queryId) {
      throw new Error('Failed to start CloudWatch query');
    }

    // Poll for results (queries are async)
    let status: QueryStatus | string = QueryStatus.Running;
    let results: Array<Array<{ field?: string; value?: string }>> = [];
    let attempts = 0;
    const maxAttempts = 30; // 15 seconds max

    while ((status === QueryStatus.Running || status === QueryStatus.Scheduled) && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;

      const response = await client.send(
        new GetQueryResultsCommand({
          queryId: startQuery.queryId,
        })
      );

      status = response.status || QueryStatus.Complete;
      results = response.results || [];
    }

    // Parse results into stats
    const stats = parseQueryResults(results);

    // Cache the results
    queryCache.set(cacheKey, {
      data: stats,
      timestamp: Date.now(),
    });

    return stats;
  } catch (error) {
    console.error('[CloudWatch] Query failed:', error);
    // Return empty stats on error
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      uniqueSessions: 0,
      uniqueIps: 0,
      totalDurationMs: 0,
      errorsByType: {},
      requestsByHour: [],
      logs: [],
    };
  }
}

/**
 * Parse CloudWatch Logs Insights query results
 */
function parseQueryResults(
  results: Array<Array<{ field?: string; value?: string }>>
): HistoricalStats {
  const logs: HistoricalLogEntry[] = [];
  const uniqueSessions = new Set<string>();
  const uniqueIps = new Set<string>();
  const errorsByType: Record<string, number> = {};
  const requestsByHour: Record<string, number> = {};

  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalDurationMs = 0;

  for (const row of results) {
    const messageField = row.find((f) => f.field === '@message');
    const timestampField = row.find((f) => f.field === '@timestamp');

    if (!messageField?.value) continue;

    // Extract JSON from [CHAT_LOG] message
    const jsonMatch = messageField.value.match(/\[CHAT_LOG\]\s*(.+)/);
    if (!jsonMatch) continue;

    try {
      const logData = JSON.parse(jsonMatch[1]);

      const entry: HistoricalLogEntry = {
        timestamp: timestampField?.value || logData.timestamp || '',
        sessionId: logData.sessionId || 'unknown',
        inputTokens: logData.inputTokens || 0,
        outputTokens: logData.outputTokens || 0,
        duration: logData.duration || 0,
        success: logData.success === true,
        error: logData.error,
        requestType: logData.requestType,
        clientIp: logData.clientIp,
        userAgent: logData.userAgent,
      };

      logs.push(entry);
      totalRequests++;

      if (entry.success) {
        successfulRequests++;
      } else {
        failedRequests++;
        const errorType = categorizeError(entry.error);
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      }

      uniqueSessions.add(entry.sessionId);
      // Track unique IPs (skip unknown/empty)
      if (entry.clientIp && entry.clientIp !== 'unknown') {
        uniqueIps.add(entry.clientIp);
      }
      totalInputTokens += entry.inputTokens;
      totalOutputTokens += entry.outputTokens;
      totalDurationMs += entry.duration;

      // Track requests by hour
      if (entry.timestamp) {
        const hour = entry.timestamp.substring(0, 13); // YYYY-MM-DDTHH
        requestsByHour[hour] = (requestsByHour[hour] || 0) + 1;
      }
    } catch {
      // Skip malformed log entries
      continue;
    }
  }

  // Convert requestsByHour to sorted array
  const requestsByHourArray = Object.entries(requestsByHour)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    totalInputTokens,
    totalOutputTokens,
    uniqueSessions: uniqueSessions.size,
    uniqueIps: uniqueIps.size,
    totalDurationMs,
    errorsByType,
    requestsByHour: requestsByHourArray,
    logs,
  };
}

/**
 * Categorize error message into error type
 */
function categorizeError(error?: string): string {
  if (!error) return 'unknown';

  const lowerError = error.toLowerCase();

  if (lowerError.includes('rate limit') || lowerError.includes('too many')) {
    return 'rate_limit';
  }
  if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
    return 'timeout';
  }
  if (lowerError.includes('api key') || lowerError.includes('unauthorized') || lowerError.includes('401')) {
    return 'auth';
  }
  if (lowerError.includes('500') || lowerError.includes('internal')) {
    return 'server_error';
  }
  if (lowerError.includes('network') || lowerError.includes('connection')) {
    return 'network';
  }

  return 'other';
}

/**
 * Clear the query cache (useful for testing)
 */
export function clearCache(): void {
  queryCache.clear();
}

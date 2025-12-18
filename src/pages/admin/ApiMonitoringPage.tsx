/**
 * API Monitoring Page
 * Admin dashboard for monitoring AI API usage, errors, and rate limiting
 * Uses CloudWatch Logs Insights for persistent historical data
 */

import { useState, useCallback } from 'react';
import {
  RefreshCw,
  Activity,
  AlertTriangle,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Database,
  Cloud,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// =============================================================================
// Types
// =============================================================================

interface ChatLogEntry {
  timestamp: string;
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  model?: string;
  duration: number;
  success: boolean;
  error?: string;
  requestType?: string;
}

interface ApiStats {
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: string;
    avgResponseTimeMs: number;
    uniqueSessions: number;
    uniqueIps: number;
  };
  timeStats: {
    requestsLastHour: number;
    requestsInRange: number;
    errorsLastHour: number;
    errorsInRange: number;
    hoursQueried: number;
  };
  costs: {
    totalInputTokens: number;
    totalOutputTokens: number;
    estimatedCostUsd: string;
  };
  rateLimit: {
    activeSessions: number;
    totalRequestsInWindow: number;
    sessionsAtLimit: number;
    limitPerMinute: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  requestsByHour: Array<{ hour: string; count: number }>;
  recentLogs: ChatLogEntry[];
  dataSource: 'cloudwatch' | 'memory';
  generatedAt: string;
}

// Time range options
const TIME_RANGES = [
  { label: '1 Hour', value: 1 },
  { label: '24 Hours', value: 24 },
  { label: '7 Days', value: 168 },
  { label: '30 Days', value: 720 },
];

// =============================================================================
// Component
// =============================================================================

export function ApiMonitoringPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState(24); // Default to 24 hours

  // Fetch stats from API
  const fetchStats = useCallback(async () => {
    if (!token) {
      setError('Not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/admin-stats?hours=${timeRange}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  }, [token, timeRange]);

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI API Monitoring
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor usage, errors, and costs for the AI Learning Companion
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              {TIME_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          {/* Refresh Button */}
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh Stats'}
          </button>
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex flex-wrap items-center gap-4">
        {lastRefresh && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {lastRefresh.toLocaleString()}
          </p>
        )}
        {stats && (
          <div className="flex items-center gap-1 text-xs">
            {stats.dataSource === 'cloudwatch' ? (
              <>
                <Cloud className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400">CloudWatch Logs</span>
              </>
            ) : (
              <>
                <Database className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">In-Memory (this instance only)</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Initial state - no data yet */}
      {!stats && !isLoading && !error && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            No Data Loaded
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Click "Refresh Stats" to load API usage data
          </p>
        </div>
      )}

      {/* Stats display */}
      {stats && (
        <>
          {/* Summary stats grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Requests */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                  <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Requests
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.summary.totalRequests}
                  </p>
                </div>
              </div>
            </div>

            {/* Success Rate */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Success Rate
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.summary.successRate}%
                  </p>
                </div>
              </div>
            </div>

            {/* Errors */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 rounded-lg p-3 ${
                  stats.summary.failedRequests > 0
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <XCircle className={`h-6 w-6 ${
                    stats.summary.failedRequests > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Failed Requests
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.summary.failedRequests}
                  </p>
                </div>
              </div>
            </div>

            {/* Estimated Cost */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
                  <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Est. Cost (USD)
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${stats.costs.estimatedCostUsd}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Second row of stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Unique Sessions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Unique Sessions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.summary.uniqueSessions}
                  </p>
                </div>
              </div>
            </div>

            {/* Unique IPs (Free Tier Users) */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
                  <Globe className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Unique IPs
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.summary.uniqueIps}
                  </p>
                </div>
              </div>
            </div>

            {/* Avg Response Time */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 rounded-lg bg-cyan-100 p-3 dark:bg-cyan-900/30">
                  <Clock className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Avg Response Time
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatDuration(stats.summary.avgResponseTimeMs)}
                  </p>
                </div>
              </div>
            </div>

            {/* Rate Limited Sessions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 rounded-lg p-3 ${
                  stats.rateLimit.sessionsAtLimit > 0
                    ? 'bg-orange-100 dark:bg-orange-900/30'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Zap className={`h-6 w-6 ${
                    stats.rateLimit.sessionsAtLimit > 0
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    At Rate Limit
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.rateLimit.sessionsAtLimit}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Two column layout for details */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Error Breakdown */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Error Breakdown
              </h2>
              {stats.errors.total === 0 ? (
                <p className="py-4 text-center text-gray-500 dark:text-gray-400">
                  No errors recorded
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.errors.byType).map(([errorType, count]) => (
                    <div key={errorType} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                        {errorType}
                      </span>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Token Usage */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <DollarSign className="h-5 w-5 text-amber-500" />
                Token Usage & Costs
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Input Tokens
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.costs.totalInputTokens.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Output Tokens
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.costs.totalOutputTokens.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Estimated Cost
                  </span>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    ${stats.costs.estimatedCostUsd}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Based on Claude Sonnet pricing: $3/1M input, $15/1M output
                </p>
              </div>
            </div>
          </div>

          {/* Recent Logs Table */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Recent API Calls
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Time</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Duration</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Tokens</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {stats.recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No recent logs
                      </td>
                    </tr>
                  ) : (
                    stats.recentLogs.map((log, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 text-gray-900 dark:text-white">
                          {formatTime(log.timestamp)}
                        </td>
                        <td className="py-3">
                          {log.success ? (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="h-4 w-4" />
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                              <XCircle className="h-4 w-4" />
                              {log.error || 'Failed'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">
                          {formatDuration(log.duration)}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">
                          {log.inputTokens + log.outputTokens}
                        </td>
                        <td className="py-3 font-mono text-xs text-gray-500 dark:text-gray-500">
                          {log.sessionId.slice(0, 12)}...
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Data generated at: {formatTime(stats.generatedAt)}
          </p>
        </>
      )}
    </div>
  );
}

export default ApiMonitoringPage;

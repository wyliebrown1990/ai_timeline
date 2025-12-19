/**
 * Ingestion Monitoring Panel
 *
 * Displays comprehensive pipeline health stats including:
 * - Last/next run times
 * - Articles fetched today
 * - Duplicate detection stats
 * - Analysis pipeline stats
 * - Per-source health
 *
 * Sprint 32.10 - Ingestion Monitoring Dashboard
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  FileSearch,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Rss,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  pipelineApi,
  sourcesApi,
  type PipelineStats,
  type SourceHealth,
  type ErrorStats,
} from '../../services/api';

/**
 * Format a date string for display
 */
function formatTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get time ago string
 */
function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status: 'ok' | 'warning' | 'error' }) {
  const colors = {
    ok: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status]}`}
      title={status}
    />
  );
}

/**
 * Stat card component
 */
function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * Source health row component
 */
function SourceRow({ source }: { source: SourceHealth }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <StatusIndicator status={source.status} />
        <span className="text-sm font-medium text-gray-900 truncate">{source.name}</span>
        {!source.isActive && (
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
            Paused
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span title="Articles today">+{source.articlesToday}</span>
        <span title="Total articles">{source.articlesTotal} total</span>
        <span title="Last checked" className="text-gray-400">
          {getTimeAgo(source.lastCheckedAt) || 'Never'}
        </span>
      </div>
    </div>
  );
}

/**
 * Main ingestion monitoring panel component
 */
export function IngestionMonitoringPanel() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDuplicateRunning, setIsDuplicateRunning] = useState(false);
  const [isClearingErrors, setIsClearingErrors] = useState(false);
  const [isTogglingIngestion, setIsTogglingIngestion] = useState(false);
  const [isTogglingAnalysis, setIsTogglingAnalysis] = useState(false);
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load pipeline stats and errors
  const loadStats = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const [pipelineData, errorsData] = await Promise.all([
        pipelineApi.getStats(),
        pipelineApi.getErrors(),
      ]);
      setStats(pipelineData);
      setErrorStats(errorsData);
    } catch (error) {
      console.error('Failed to load pipeline stats:', error);
      toast.error('Failed to load pipeline stats');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Handle duplicate detection trigger
  const handleDetectDuplicates = async () => {
    setIsDuplicateRunning(true);
    try {
      const result = await pipelineApi.triggerDuplicateDetection();
      toast.success(`Found ${result.duplicatesFound} duplicates`);
      // Refresh stats after detection
      await loadStats();
    } catch (error) {
      console.error('Duplicate detection failed:', error);
      toast.error('Duplicate detection failed');
    } finally {
      setIsDuplicateRunning(false);
    }
  };

  // Handle clear errors
  const handleClearErrors = async () => {
    setIsClearingErrors(true);
    try {
      const result = await pipelineApi.clearErrors();
      toast.success(`Cleared ${result.cleared} errors`);
      await loadStats();
    } catch (error) {
      console.error('Failed to clear errors:', error);
      toast.error('Failed to clear errors');
    } finally {
      setIsClearingErrors(false);
    }
  };

  // Handle toggle ingestion pause
  const handleToggleIngestion = async () => {
    if (!stats) return;
    setIsTogglingIngestion(true);
    try {
      const newPaused = !stats.settings.ingestionPaused;
      await pipelineApi.setIngestionPaused(newPaused);
      toast.success(`Ingestion ${newPaused ? 'paused' : 'resumed'}`);
      await loadStats();
    } catch (error) {
      console.error('Failed to toggle ingestion:', error);
      toast.error('Failed to toggle ingestion');
    } finally {
      setIsTogglingIngestion(false);
    }
  };

  // Handle toggle analysis pause
  const handleToggleAnalysis = async () => {
    if (!stats) return;
    setIsTogglingAnalysis(true);
    try {
      const newPaused = !stats.settings.analysisPaused;
      await pipelineApi.setAnalysisPaused(newPaused);
      toast.success(`Analysis ${newPaused ? 'paused' : 'resumed'}`);
      await loadStats();
    } catch (error) {
      console.error('Failed to toggle analysis:', error);
      toast.error('Failed to toggle analysis');
    } finally {
      setIsTogglingAnalysis(false);
    }
  };

  // Handle fetch all sources
  const handleFetchAll = async () => {
    setIsFetchingAll(true);
    try {
      const result = await sourcesApi.fetchAllArticles();
      toast.success(`Fetched ${result.created} new articles`);
      await loadStats();
    } catch (error) {
      console.error('Fetch all failed:', error);
      toast.error('Fetch all failed');
    } finally {
      setIsFetchingAll(false);
    }
  };

  // Handle trigger analysis
  const handleTriggerAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await pipelineApi.triggerAnalysis(10);
      toast.success(`Analyzed ${result.analyzed} articles`);
      await loadStats();
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-gray-500 text-center">Failed to load pipeline stats</p>
      </div>
    );
  }

  // Calculate overall pipeline health
  const activeSourceCount = stats.sources.filter((s) => s.isActive).length;
  const healthySourceCount = stats.sources.filter((s) => s.status === 'ok').length;
  const hasUnresolvedErrors = errorStats && errorStats.unresolved > 0;
  const pipelineHealthy =
    healthySourceCount === activeSourceCount &&
    stats.analysis.errors === 0 &&
    !hasUnresolvedErrors;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${pipelineHealthy ? 'bg-green-100' : 'bg-yellow-100'}`}
            >
              {pipelineHealthy ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ingestion Pipeline</h2>
              <p className="text-sm text-gray-500">
                {pipelineHealthy ? 'All systems operational' : 'Some issues detected'}
              </p>
            </div>
          </div>
          <button
            onClick={() => loadStats(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Schedule info and pause controls */}
      <div className="px-6 py-3 border-b border-gray-100 bg-blue-50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-gray-600">Last run:</span>
              <span className="font-medium text-gray-900">
                {formatTime(stats.ingestion.lastRunAt)}
              </span>
            </div>
            <div className="text-gray-400">|</div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Next run:</span>
              <span className="font-medium text-gray-900">
                {formatTime(stats.ingestion.nextScheduledAt)}
              </span>
            </div>
          </div>
          {/* Pause/Resume controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleIngestion}
              disabled={isTogglingIngestion}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                stats.settings.ingestionPaused
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              } disabled:opacity-50`}
              title={stats.settings.ingestionPaused ? 'Resume ingestion' : 'Pause ingestion'}
            >
              {isTogglingIngestion ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : stats.settings.ingestionPaused ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
              Ingestion
            </button>
            <button
              onClick={handleToggleAnalysis}
              disabled={isTogglingAnalysis}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                stats.settings.analysisPaused
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              } disabled:opacity-50`}
              title={stats.settings.analysisPaused ? 'Resume analysis' : 'Pause analysis'}
            >
              {isTogglingAnalysis ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : stats.settings.analysisPaused ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
              Analysis
            </button>
          </div>
        </div>
        {/* Pause status indicators */}
        {(stats.settings.ingestionPaused || stats.settings.analysisPaused) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-yellow-700">
            <AlertTriangle className="h-3 w-3" />
            <span>
              {stats.settings.ingestionPaused && stats.settings.analysisPaused
                ? 'Ingestion and analysis are paused'
                : stats.settings.ingestionPaused
                  ? 'Ingestion is paused'
                  : 'Analysis is paused'}
            </span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Fetched Today"
            value={stats.ingestion.fetchedToday}
            subValue={`${stats.ingestion.fetchedYesterday} yesterday`}
            icon={Rss}
            color="bg-blue-500"
          />
          <StatCard
            label="Duplicates Found"
            value={stats.duplicates.foundToday}
            subValue={`${stats.duplicates.total} total`}
            icon={Copy}
            color="bg-orange-500"
          />
          <StatCard
            label="Analyzed Today"
            value={stats.analysis.analyzedToday}
            subValue={`${stats.analysis.pending} pending`}
            icon={FileSearch}
            color="bg-purple-500"
          />
          <StatCard
            label="Error Rate"
            value={`${(stats.analysis.errorRate * 100).toFixed(1)}%`}
            subValue={`${stats.analysis.errors} errors`}
            icon={stats.analysis.errors > 0 ? XCircle : Zap}
            color={stats.analysis.errors > 0 ? 'bg-red-500' : 'bg-green-500'}
          />
        </div>

        {/* Source health section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Source Health</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <StatusIndicator status="ok" /> OK
              </span>
              <span className="flex items-center gap-1">
                <StatusIndicator status="warning" /> Warning
              </span>
              <span className="flex items-center gap-1">
                <StatusIndicator status="error" /> Error
              </span>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg px-4 py-2">
            {stats.sources.length > 0 ? (
              stats.sources.map((source) => (
                <SourceRow key={source.id} source={source} />
              ))
            ) : (
              <p className="text-sm text-gray-500 py-2">No sources configured</p>
            )}
          </div>
        </div>

        {/* Error section */}
        {errorStats && errorStats.unresolved > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Unresolved Errors ({errorStats.unresolved})
              </h3>
              <button
                onClick={handleClearErrors}
                disabled={isClearingErrors}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600"
              >
                {isClearingErrors ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Clear All
              </button>
            </div>
            <div className="border border-red-200 rounded-lg bg-red-50 px-4 py-2 max-h-40 overflow-y-auto">
              {errorStats.recentErrors.slice(0, 5).map((error) => (
                <div
                  key={error.id}
                  className="py-2 border-b border-red-100 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-red-700 uppercase">
                      {error.errorType}
                    </span>
                    <span className="text-xs text-red-500">
                      {error.retryCount > 0 && `Retried ${error.retryCount}x • `}
                      {getTimeAgo(error.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-red-800 truncate">{error.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual actions */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Manual Actions</h3>
            <span className="text-xs text-gray-400">Run pipeline steps manually</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFetchAll}
              disabled={isFetchingAll || stats.settings.ingestionPaused}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={stats.settings.ingestionPaused ? 'Resume ingestion first' : 'Fetch articles from all sources'}
            >
              {isFetchingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rss className="h-4 w-4" />
              )}
              Fetch Now
            </button>
            <button
              onClick={handleDetectDuplicates}
              disabled={isDuplicateRunning}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDuplicateRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Detect Duplicates
            </button>
            <button
              onClick={handleTriggerAnalysis}
              disabled={isAnalyzing || stats.settings.analysisPaused || stats.analysis.pending === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                stats.settings.analysisPaused
                  ? 'Resume analysis first'
                  : stats.analysis.pending === 0
                    ? 'No pending articles'
                    : 'Analyze pending articles'
              }
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSearch className="h-4 w-4" />
              )}
              Analyze ({stats.analysis.pending})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IngestionMonitoringPanel;

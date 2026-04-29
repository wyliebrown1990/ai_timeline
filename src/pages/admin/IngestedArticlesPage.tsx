import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  FileText,
  Filter,
  Play,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  BarChart3,
  RefreshCw,
  Copy,
  Link,
  Trash2,
  X,
  CheckSquare,
  Square,
  Zap,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  articlesApi,
  sourcesApi,
  type IngestedArticle,
  type NewsSource,
  type AnalysisStats,
} from '../../services/api';
import { PaywallBadge } from '../../components/ui/PaywallBadge';

/**
 * Admin page for viewing and analyzing ingested articles
 */
export function IngestedArticlesPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<IngestedArticle[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyzingArticleId, setAnalyzingArticleId] = useState<string | null>(null);
  const [generatingArticleIds, setGeneratingArticleIds] = useState<Set<string>>(new Set());
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    sourceId: '',
    analysisStatus: '',
    isDuplicate: '', // '', 'true', 'false'
  });
  // Delete confirmation state
  const [deleteArticle, setDeleteArticle] = useState<IngestedArticle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAllDuplicates, setIsDeletingAllDuplicates] = useState(false);
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  // Auto-refresh for generating articles
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await articlesApi.getAll({
        page,
        limit: 20,
        sourceId: filters.sourceId || undefined,
        analysisStatus: filters.analysisStatus || undefined,
        isDuplicate: filters.isDuplicate || undefined,
      });
      setArticles(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Failed to load articles:', error);
      toast.error('Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  const loadSources = useCallback(async () => {
    try {
      const response = await sourcesApi.getAll();
      setSources(response.data);
    } catch (error) {
      console.error('Failed to load sources:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await articlesApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadSources();
    loadStats();
  }, [loadSources, loadStats]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleAnalyzeOne = async (articleId: string) => {
    setAnalyzingArticleId(articleId);
    try {
      const result = await articlesApi.analyze(articleId);
      const relevance = Math.round((result.screening?.relevanceScore || 0) * 100);

      if (result.status === 'screened') {
        toast.success(
          `Milestone-worthy! Relevance: ${relevance}%. View details to generate content.`
        );
      } else if (result.status === 'complete') {
        toast.success(
          `Screening complete. Relevance: ${relevance}%. Not milestone-worthy.`
        );
      } else {
        toast.success(result.message || 'Screening complete');
      }

      loadArticles();
      loadStats();
    } catch (error) {
      console.error('Failed to analyze article:', error);
      toast.error('Failed to analyze article');
    } finally {
      setAnalyzingArticleId(null);
    }
  };

  const handleGenerateContent = async (articleId: string) => {
    setGeneratingArticleIds((prev) => new Set(prev).add(articleId));
    try {
      const result = await articlesApi.generateContent(articleId);
      // The API returns 202 for async processing - start auto-refresh
      if (result.status === 'generating') {
        toast.success(
          'Content generation started! Page will auto-refresh when complete.',
          { duration: 5000, icon: '🚀' }
        );
        startAutoRefresh();
      } else {
        toast.success(
          `Content generated! ${result.draftsCreated || 0} draft(s) created. Check Review Queue.`
        );
        setGeneratingArticleIds((prev) => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
      }
      loadArticles();
      loadStats();
    } catch (error) {
      console.error('Failed to generate content:', error);
      // Even if API times out, the Lambda may still be running
      toast.success(
        'Content generation may be running in background. Page will auto-refresh.',
        { duration: 5000, icon: '⏳' }
      );
      startAutoRefresh();
    }
  };

  // Auto-refresh to check for completed generation
  const startAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) return; // Already running

    let refreshCount = 0;
    const maxRefreshes = 12; // 2 minutes max (12 * 10 seconds)

    autoRefreshRef.current = setInterval(async () => {
      refreshCount++;
      await loadArticles();
      await loadStats();

      // Check if any articles are still generating
      const stillGenerating = articles.some(
        (a) => a.analysisStatus === 'generating' || a.analysisStatus === 'screening'
      );

      if (!stillGenerating || refreshCount >= maxRefreshes) {
        if (autoRefreshRef.current) {
          clearInterval(autoRefreshRef.current);
          autoRefreshRef.current = null;
        }
        setGeneratingArticleIds(new Set());
        if (!stillGenerating && refreshCount > 1) {
          toast.success('Content generation complete! Check Review Queue.', { icon: '✅' });
        }
      }
    }, 10000); // Every 10 seconds
  }, [articles, loadArticles, loadStats]);

  // Cleanup auto-refresh on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, []);

  // Clear selections when articles change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, filters]);

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map((a) => a.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmMsg = `Delete ${selectedIds.size} selected article(s)? This cannot be undone.`;
    if (!confirm(confirmMsg)) return;

    setIsBulkDeleting(true);
    try {
      const result = await articlesApi.bulkDelete(Array.from(selectedIds));
      toast.success(result.message);
      setSelectedIds(new Set());
      loadArticles();
      loadStats();
    } catch (error) {
      console.error('Failed to bulk delete articles:', error);
      toast.error('Failed to delete selected articles');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Bulk analyze handler
  const handleBulkAnalyze = async () => {
    if (selectedIds.size === 0) return;

    setIsBulkAnalyzing(true);
    try {
      const result = await articlesApi.bulkAnalyze(Array.from(selectedIds));
      if (result.analyzing > 0) {
        toast.success(
          `Analyzing ${result.analyzing} article(s)! Page will auto-refresh.`,
          { duration: 5000, icon: '🚀' }
        );
        startAutoRefresh();
      } else {
        toast.success(result.message);
      }
      setSelectedIds(new Set());
      loadArticles();
      loadStats();
    } catch (error) {
      console.error('Failed to bulk analyze articles:', error);
      toast.error('Failed to analyze selected articles');
    } finally {
      setIsBulkAnalyzing(false);
    }
  };

  const handleAnalyzeAll = async () => {
    if (!stats || stats.articles.pending === 0) {
      toast.error('No pending articles to analyze');
      return;
    }

    setIsAnalyzingAll(true);
    try {
      const result = await articlesApi.analyzePending(10);
      toast.success(
        `Analyzed ${result.analyzed} articles with ${result.errors} errors`
      );
      loadArticles();
      loadStats();
    } catch (error) {
      console.error('Failed to analyze pending articles:', error);
      toast.error('Failed to analyze pending articles');
    } finally {
      setIsAnalyzingAll(false);
    }
  };

  // Reset a stuck article back to pending
  const handleResetArticle = async (articleId: string) => {
    setAnalyzingArticleId(articleId);
    try {
      await articlesApi.reanalyze(articleId);
      toast.success('Article reset to pending. Click Analyze to process it.');
      loadArticles();
      loadStats();
    } catch (error) {
      console.error('Failed to reset article:', error);
      toast.error('Failed to reset article');
    } finally {
      setAnalyzingArticleId(null);
    }
  };

  // Handle delete single article
  const handleDeleteConfirm = async () => {
    if (!deleteArticle) return;

    setIsDeleting(true);
    try {
      const result = await articlesApi.delete(deleteArticle.id);
      toast.success(result.message);
      if (result.promotedId) {
        toast.success(`Promoted another article to primary`);
      }
      setDeleteArticle(null);
      loadArticles();
      loadStats();
    } catch (error) {
      console.error('Failed to delete article:', error);
      toast.error('Failed to delete article');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete all duplicates
  const handleDeleteAllDuplicates = async () => {
    if (!confirm('Delete all duplicate articles? This keeps primary articles and removes duplicates.')) {
      return;
    }

    setIsDeletingAllDuplicates(true);
    try {
      const result = await articlesApi.deleteAllDuplicates();
      toast.success(result.message);
      loadArticles();
      loadStats();
    } catch (error) {
      console.error('Failed to delete duplicates:', error);
      toast.error('Failed to delete duplicate articles');
    } finally {
      setIsDeletingAllDuplicates(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'screening':
      case 'generating':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'screened':
        return <Star className="h-4 w-4 text-purple-500" />; // Milestone-worthy, needs generation
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      screening: 'bg-blue-100 text-blue-800',
      screened: 'bg-purple-100 text-purple-800', // Milestone-worthy, needs content generation
      generating: 'bg-blue-100 text-blue-800',
      complete: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingested Articles</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} articles from {sources.length} sources
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Delete All Duplicates button - only shown when filtering duplicates or when duplicates exist */}
          <button
            onClick={handleDeleteAllDuplicates}
            disabled={isDeletingAllDuplicates}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isDeletingAllDuplicates
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
            }`}
          >
            {isDeletingAllDuplicates ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete All Duplicates
          </button>
          <button
            onClick={handleAnalyzeAll}
            disabled={isAnalyzingAll || !stats || stats.articles.pending === 0}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isAnalyzingAll || !stats || stats.articles.pending === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isAnalyzingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Analyze Pending ({stats?.articles.pending || 0})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.articles.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Loader2 className="h-4 w-4" />
              <span className="text-sm font-medium">Analyzing</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.articles.analyzing}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Complete</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.articles.complete}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Star className="h-4 w-4" />
              <span className="text-sm font-medium">Milestone Worthy</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.articles.milestoneWorthy}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm font-medium">Total Drafts</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.drafts.total}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={filters.sourceId}
            onChange={(e) => {
              setFilters({ ...filters, sourceId: e.target.value });
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Sources</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
          <select
            value={filters.analysisStatus}
            onChange={(e) => {
              setFilters({ ...filters, analysisStatus: e.target.value });
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="screening">Screening</option>
            <option value="generating">Generating</option>
            <option value="complete">Complete</option>
            <option value="error">Error</option>
          </select>
          <select
            value={filters.isDuplicate}
            onChange={(e) => {
              setFilters({ ...filters, isDuplicate: e.target.value });
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Articles</option>
            <option value="true">Duplicates Only</option>
            <option value="false">Non-Duplicates Only</option>
          </select>
          <button
            onClick={() => {
              loadArticles();
              loadStats();
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Bulk Action Bar - shows when items are selected */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedIds.size} article(s) selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkAnalyze}
              disabled={isBulkAnalyzing}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isBulkAnalyzing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isBulkAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Analyze Selected
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isBulkDeleting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isBulkDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Articles List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
          <p className="text-gray-500">
            {filters.sourceId || filters.analysisStatus || filters.isDuplicate
              ? 'Try adjusting your filters.'
              : 'Fetch articles from your sources to see them here.'}
          </p>
        </div>
      ) : (
        <>
          {/* Select All Header */}
          <div className="flex items-center gap-3 px-2">
            <button
              onClick={toggleSelectAll}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={selectedIds.size === articles.length ? 'Deselect all' : 'Select all'}
            >
              {selectedIds.size === articles.length && articles.length > 0 ? (
                <CheckSquare className="h-5 w-5 text-blue-600" />
              ) : selectedIds.size > 0 ? (
                <div className="relative">
                  <Square className="h-5 w-5 text-gray-400" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-0.5 bg-blue-600" />
                  </div>
                </div>
              ) : (
                <Square className="h-5 w-5 text-gray-400" />
              )}
            </button>
            <span className="text-sm text-gray-500">
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${articles.length} selected`
                : `${articles.length} articles`}
            </span>
          </div>

          <div className="space-y-4">
            {articles.map((article) => (
              <div
                key={article.id}
                className={`rounded-xl border p-6 transition-colors ${
                  selectedIds.has(article.id)
                    ? 'bg-blue-50 border-blue-300'
                    : article.isDuplicate
                      ? 'bg-gray-50 border-orange-200 opacity-75'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Selection checkbox */}
                  <button
                    onClick={() => toggleSelection(article.id)}
                    className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors mt-0.5"
                  >
                    {selectedIds.has(article.id) ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {/* Duplicate badge - shown first for visibility */}
                      {article.isDuplicate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          Duplicate
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${getStatusBadge(
                          article.analysisStatus
                        )}`}
                      >
                        {getStatusIcon(article.analysisStatus)}
                        {article.analysisStatus}
                      </span>
                      {article.isMilestoneWorthy && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                          <Star className="h-3 w-3" aria-hidden="true" />
                          Milestone Candidate
                        </span>
                      )}
                      {article.isPaywalled && (
                        <PaywallBadge
                          paywallReason={article.paywallReason}
                          showReasonInTooltip
                        />
                      )}
                      {article.relevanceScore !== undefined && (
                        <span className="text-xs text-gray-500">
                          Relevance: {(article.relevanceScore * 100).toFixed(0)}%
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {article.source?.name ||
                          new URL(article.externalUrl).hostname.replace('www.', '')}
                      </span>
                    </div>
                    <h3
                      className="text-lg font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
                      onClick={() => navigate(`/admin/articles/${article.id}`)}
                    >
                      {article.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {article.content}
                    </p>
                    {article.milestoneRationale && (
                      <p className="mt-2 text-sm text-gray-500 italic">
                        AI: {article.milestoneRationale}
                      </p>
                    )}
                    {article.analysisError && (
                      <p className="mt-2 text-sm text-red-600">
                        Error: {article.analysisError}
                      </p>
                    )}
                    {/* Duplicate of link - shows original article info */}
                    {article.isDuplicate && article.duplicateOf && (
                      <div className="mt-2 p-2 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="flex items-center gap-2 text-sm text-orange-700">
                          <Link className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">Duplicate of:</span>
                          <button
                            onClick={() => navigate(`/admin/articles/${article.duplicateOfId}`)}
                            className="text-orange-800 underline hover:text-orange-900 truncate"
                          >
                            {article.duplicateOf.title}
                          </button>
                          <span className="text-orange-600 flex-shrink-0">
                            ({article.duplicateOf.source?.name ||
                              new URL(article.duplicateOf.externalUrl).hostname.replace('www.', '')})
                          </span>
                        </div>
                        {article.duplicateScore !== undefined && article.duplicateReason && (
                          <p className="mt-1 text-xs text-orange-600 ml-6">
                            Similarity: {(article.duplicateScore * 100).toFixed(0)}% ({article.duplicateReason.replace('_', ' ')})
                          </p>
                        )}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      Published: {formatDate(article.publishedAt)}
                      {article.analyzedAt && ` | Analyzed: ${formatDate(article.analyzedAt)}`}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {article.analysisStatus === 'pending' && (
                      <button
                        onClick={() => handleAnalyzeOne(article.id)}
                        disabled={analyzingArticleId === article.id}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          analyzingArticleId === article.id
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {analyzingArticleId === article.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Screen
                      </button>
                    )}
                    {article.analysisStatus === 'screened' && (
                      <>
                        <button
                          onClick={() => handleGenerateContent(article.id)}
                          disabled={generatingArticleIds.has(article.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            generatingArticleIds.has(article.id)
                              ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {generatingArticleIds.has(article.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                          {generatingArticleIds.has(article.id) ? 'Generating...' : 'Generate Content'}
                        </button>
                        <button
                          onClick={() => navigate(`/admin/articles/${article.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          View Details
                        </button>
                      </>
                    )}
                    {/* Reset button for stuck articles */}
                    {(article.analysisStatus === 'screening' || article.analysisStatus === 'generating') && (
                      <button
                        onClick={() => handleResetArticle(article.id)}
                        disabled={analyzingArticleId === article.id}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          analyzingArticleId === article.id
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                        }`}
                      >
                        {analyzingArticleId === article.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Reset (Stuck)
                      </button>
                    )}
                    {article.analysisStatus === 'complete' && (
                      <button
                        onClick={() => navigate(`/admin/articles/${article.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        View Details
                      </button>
                    )}
                    <a
                      href={article.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Source
                    </a>
                    {/* Delete button - available for pending articles and duplicates */}
                    <button
                      onClick={() => setDeleteArticle(article)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  page === 1
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  page === totalPages
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteArticle(null)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <button
              onClick={() => !isDeleting && setDeleteArticle(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              disabled={isDeleting}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Article</h3>
            </div>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this article?
            </p>
            <p className="text-sm text-gray-500 mb-4 font-medium truncate">
              "{deleteArticle.title}"
            </p>
            {deleteArticle.isDuplicate ? (
              <p className="text-sm text-gray-500 mb-4">
                This is a duplicate article. Deleting it will remove the duplicate link.
              </p>
            ) : (
              <p className="text-sm text-orange-600 mb-4">
                This action cannot be undone. Any drafts associated with this article will also be deleted.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteArticle(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IngestedArticlesPage;

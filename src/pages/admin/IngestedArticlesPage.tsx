import { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  articlesApi,
  sourcesApi,
  type IngestedArticle,
  type NewsSource,
  type AnalysisStats,
} from '../../services/api';

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
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    sourceId: '',
    analysisStatus: '',
  });

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await articlesApi.getAll({
        page,
        limit: 20,
        sourceId: filters.sourceId || undefined,
        analysisStatus: filters.analysisStatus || undefined,
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
      toast.success(
        `Analysis complete! ${result.draftsCreated} draft(s) created. ` +
          `Relevance: ${(result.screening.relevanceScore * 100).toFixed(0)}%`
      );
      loadArticles();
      loadStats();
    } catch (error) {
      console.error('Failed to analyze article:', error);
      toast.error('Failed to analyze article');
    } finally {
      setAnalyzingArticleId(null);
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
            {filters.sourceId || filters.analysisStatus
              ? 'Try adjusting your filters.'
              : 'Fetch articles from your sources to see them here.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {articles.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${getStatusBadge(
                          article.analysisStatus
                        )}`}
                      >
                        {getStatusIcon(article.analysisStatus)}
                        {article.analysisStatus}
                      </span>
                      {article.isMilestoneWorthy && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">
                          <Star className="h-3 w-3" />
                          Milestone Candidate
                        </span>
                      )}
                      {article.relevanceScore !== undefined && (
                        <span className="text-xs text-gray-500">
                          Relevance: {(article.relevanceScore * 100).toFixed(0)}%
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {article.source.name}
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
                        Analyze
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
    </div>
  );
}

export default IngestedArticlesPage;

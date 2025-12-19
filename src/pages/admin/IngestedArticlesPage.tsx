import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileText, Filter } from 'lucide-react';
import { articlesApi, sourcesApi, type IngestedArticle, type NewsSource } from '../../services/api';

/**
 * Admin page for viewing ingested articles
 */
export function IngestedArticlesPage() {
  const [articles, setArticles] = useState<IngestedArticle[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      analyzing: 'bg-blue-100 text-blue-800',
      analyzed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ingested Articles</h1>
        <p className="mt-1 text-sm text-gray-500">
          {total} articles from {sources.length} sources
        </p>
      </div>

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
            <option value="analyzing">Analyzing</option>
            <option value="analyzed">Analyzed</option>
            <option value="error">Error</option>
          </select>
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
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getStatusBadge(
                          article.analysisStatus
                        )}`}
                      >
                        {article.analysisStatus}
                      </span>
                      <span className="text-xs text-gray-500">
                        {article.source.name}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {article.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {article.content}
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      Published: {formatDate(article.publishedAt)} | Ingested:{' '}
                      {formatDate(article.ingestedAt)}
                    </div>
                  </div>
                  <a
                    href={article.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View
                  </a>
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

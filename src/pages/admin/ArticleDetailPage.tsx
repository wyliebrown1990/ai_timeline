import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Star,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  FileText,
  BookOpen,
  Milestone,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  articlesApi,
  type IngestedArticle,
  type ContentDraft,
} from '../../services/api';

/**
 * Admin page for viewing article details and drafts
 */
export function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<IngestedArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const loadArticle = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const data = await articlesApi.getById(id);
      setArticle(data);
    } catch (error) {
      console.error('Failed to load article:', error);
      toast.error('Failed to load article');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  const handleReanalyze = async () => {
    if (!id) return;

    setIsReanalyzing(true);
    try {
      const result = await articlesApi.reanalyze(id);
      toast.success(
        `Re-analysis complete! ${result.draftsCreated} draft(s) created.`
      );
      loadArticle();
    } catch (error) {
      console.error('Failed to re-analyze article:', error);
      toast.error('Failed to re-analyze article');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'screening':
      case 'generating':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">Article not found</h2>
        <Link
          to="/admin/articles"
          className="text-blue-600 hover:text-blue-700"
        >
          Back to articles
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/admin/articles')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon(article.analysisStatus)}
              <span className="text-sm font-medium text-gray-500 capitalize">
                {article.analysisStatus}
              </span>
              {article.isMilestoneWorthy && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">
                  <Star className="h-3 w-3" />
                  Milestone Candidate
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {article.source?.name ||
                new URL(article.externalUrl).hostname.replace('www.', '')}{' '}
              • Published {formatDate(article.publishedAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {article.analysisStatus === 'complete' && (
            <button
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isReanalyzing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isReanalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Re-analyze
            </button>
          )}
          <a
            href={article.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View Original
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original Article */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Original Article</h2>
          <div className="prose prose-sm max-w-none text-gray-600">
            <p className="whitespace-pre-wrap">{article.content}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            Ingested: {formatDate(article.ingestedAt)}
            {article.analyzedAt && ` • Analyzed: ${formatDate(article.analyzedAt)}`}
          </div>
        </div>

        {/* Analysis Results */}
        <div className="space-y-6">
          {/* Screening Results */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Screening</h2>

            {article.analysisStatus === 'pending' ? (
              <p className="text-gray-500">Not yet analyzed</p>
            ) : article.analysisError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Analysis Error</p>
                <p className="text-red-600 text-sm mt-1">{article.analysisError}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Relevance Score */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Relevance Score</span>
                    <span className="text-sm font-bold text-gray-900">
                      {article.relevanceScore !== undefined
                        ? `${(article.relevanceScore * 100).toFixed(0)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(article.relevanceScore || 0) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Milestone Status */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  {article.isMilestoneWorthy ? (
                    <>
                      <Star className="h-6 w-6 text-purple-500" />
                      <div>
                        <p className="font-medium text-gray-900">Milestone Candidate</p>
                        <p className="text-sm text-gray-600">This article describes a significant AI development</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FileText className="h-6 w-6 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Not Milestone-Worthy</p>
                        <p className="text-sm text-gray-600">May still be relevant as a news event</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Rationale */}
                {article.milestoneRationale && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">AI Rationale</p>
                    <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-lg">
                      "{article.milestoneRationale}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generated Drafts */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Generated Drafts ({article.drafts?.length || 0})
            </h2>

            {!article.drafts || article.drafts.length === 0 ? (
              <p className="text-gray-500">No drafts generated yet</p>
            ) : (
              <div className="space-y-4">
                {article.drafts.map((draft) => (
                  <DraftCard key={draft.id} draft={draft} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Card component for displaying a content draft
 */
function DraftCard({ draft }: { draft: ContentDraft }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getDraftTypeIcon = (type: string) => {
    switch (type) {
      case 'milestone':
        return <Milestone className="h-5 w-5 text-purple-500" />;
      case 'news_event':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'glossary_term':
        return <BookOpen className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getDraftTypeLabel = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'Milestone';
      case 'news_event':
        return 'News Event';
      case 'glossary_term':
        return 'Glossary Term';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string, isValid: boolean) => {
    if (!isValid) {
      return 'bg-red-100 text-red-800';
    }
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const draftData = draft.draftData as Record<string, unknown>;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {getDraftTypeIcon(draft.contentType)}
          <div>
            <p className="font-medium text-gray-900">
              {getDraftTypeLabel(draft.contentType)}
            </p>
            <p className="text-sm text-gray-500">
              {(draftData.title || draftData.headline || draftData.term) as string}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusBadge(
              draft.status,
              draft.isValid
            )}`}
          >
            {!draft.isValid ? 'Invalid' : draft.status}
          </span>
          <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-gray-200">
          {/* Validation Errors */}
          {!draft.isValid && draft.validationErrors && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-800 mb-1">Validation Errors</p>
              <ul className="text-sm text-red-600 list-disc list-inside">
                {(draft.validationErrors as Array<{ message: string }>).map((err, i) => (
                  <li key={i}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Draft Data */}
          <div className="space-y-3">
            {Object.entries(draftData).map(([key, value]) => (
              <div key={key}>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">{key}</p>
                <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                  {typeof value === 'object' ? (
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    String(value)
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ArticleDetailPage;

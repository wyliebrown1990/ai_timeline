import { useCallback, useEffect, useState } from 'react';
import {
  Newspaper,
  Trophy,
  BookOpen,
  CheckCircle,
  XCircle,
  Edit,
  ExternalLink,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  reviewApi,
  type DraftWithArticle,
  type QueueCounts,
} from '../../services/api';
import { ReviewDetailModal } from '../../components/admin/ReviewDetailModal';

type TabType = 'all' | 'news_event' | 'milestone' | 'glossary_term' | 'published';

/**
 * Admin page for reviewing and publishing AI-generated drafts
 */
export function ReviewQueuePage() {
  const [drafts, setDrafts] = useState<DraftWithArticle[]>([]);
  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedDraft, setSelectedDraft] = useState<DraftWithArticle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const loadCounts = useCallback(async () => {
    try {
      const data = await reviewApi.getCounts();
      setCounts(data);
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  }, []);

  const loadDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'published') {
        const response = await reviewApi.getPublished({ limit: 50 });
        setDrafts(response.drafts);
      } else {
        const type = activeTab === 'all' ? undefined : activeTab;
        const response = await reviewApi.getQueue({ type, limit: 50 });
        setDrafts(response.drafts);
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
      toast.error('Failed to load review queue');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const handleQuickApprove = async (draft: DraftWithArticle) => {
    setApprovingId(draft.id);
    try {
      const result = await reviewApi.approve(draft.id);
      toast.success(`Published successfully! ID: ${result.publishedId}`);
      loadDrafts();
      loadCounts();
    } catch (error) {
      console.error('Failed to approve draft:', error);
      toast.error('Failed to publish draft');
    } finally {
      setApprovingId(null);
    }
  };

  const handleQuickReject = async (draft: DraftWithArticle) => {
    const reason = window.prompt('Rejection reason (optional):');
    if (reason === null) return; // User cancelled

    setRejectingId(draft.id);
    try {
      await reviewApi.reject(draft.id, reason || undefined);
      toast.success('Draft rejected');
      loadDrafts();
      loadCounts();
    } catch (error) {
      console.error('Failed to reject draft:', error);
      toast.error('Failed to reject draft');
    } finally {
      setRejectingId(null);
    }
  };

  const handleViewEdit = (draft: DraftWithArticle) => {
    setSelectedDraft(draft);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDraft(null);
  };

  const handleModalSave = () => {
    loadDrafts();
    loadCounts();
    handleModalClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'news_event':
        return <Newspaper className="h-4 w-4 text-blue-500" />;
      case 'milestone':
        return <Trophy className="h-4 w-4 text-purple-500" />;
      case 'glossary_term':
        return <BookOpen className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getContentTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      news_event: 'bg-blue-100 text-blue-800',
      milestone: 'bg-purple-100 text-purple-800',
      glossary_term: 'bg-green-100 text-green-800',
    };
    const labels: Record<string, string> = {
      news_event: 'News Event',
      milestone: 'Milestone',
      glossary_term: 'Glossary Term',
    };
    return {
      style: styles[type] || 'bg-gray-100 text-gray-800',
      label: labels[type] || type,
    };
  };

  const getDraftTitle = (draft: DraftWithArticle): string => {
    const data = draft.draftData as Record<string, unknown>;
    if (draft.contentType === 'news_event') {
      return (data.headline as string) || draft.article.title;
    }
    if (draft.contentType === 'milestone') {
      return (data.title as string) || draft.article.title;
    }
    if (draft.contentType === 'glossary_term') {
      return (data.term as string) || 'Glossary Term';
    }
    return draft.article.title;
  };

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: counts?.total },
    { key: 'news_event', label: 'News Events', count: counts?.news_event },
    { key: 'milestone', label: 'Milestones', count: counts?.milestone },
    { key: 'glossary_term', label: 'Glossary', count: counts?.glossary_term },
    { key: 'published', label: 'Published', count: counts?.publishedThisWeek },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and publish AI-generated content
          </p>
        </div>
        <button
          onClick={() => {
            loadDrafts();
            loadCounts();
          }}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Stats Cards */}
      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Newspaper className="h-4 w-4" />
              <span className="text-sm font-medium">News Events</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{counts.news_event}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">Milestones</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{counts.milestone}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm font-medium">Glossary Terms</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{counts.glossary_term}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Published This Week</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{counts.publishedThisWeek}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.key ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Drafts List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activeTab === 'published' ? 'No published items yet' : 'Queue is empty!'}
          </h3>
          <p className="text-gray-500">
            {activeTab === 'published'
              ? 'Approve drafts to see them here.'
              : 'All drafts have been reviewed. Check back later for new content.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => {
            const badge = getContentTypeBadge(draft.contentType);
            const isPublished = draft.status === 'published';

            return (
              <div
                key={draft.id}
                className={`bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors ${
                  isPublished ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${badge.style}`}
                      >
                        {getContentTypeIcon(draft.contentType)}
                        {badge.label}
                      </span>
                      {draft.article.relevanceScore !== undefined && (
                        <span className="text-xs text-gray-500">
                          Relevance: {(draft.article.relevanceScore * 100).toFixed(0)}%
                        </span>
                      )}
                      {isPublished && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3" />
                          Published
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {getDraftTitle(draft)}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Source:{' '}
                      {draft.article.source?.name ||
                        new URL(draft.article.externalUrl).hostname.replace('www.', '')}{' '}
                      | {formatDate(draft.article.publishedAt)}
                    </p>
                    {/* Show appropriate preview based on content type */}
                    {draft.contentType === 'glossary_term' ? (
                      <p className="mt-2 text-sm text-gray-500 italic">
                        Definition:{' '}
                        {(draft.draftData as { shortDefinition?: string; fullDefinition?: string })
                          .shortDefinition ||
                          (draft.draftData as { fullDefinition?: string }).fullDefinition}
                      </p>
                    ) : (
                      draft.article.milestoneRationale && (
                        <p className="mt-2 text-sm text-gray-500 italic">
                          AI: {draft.article.milestoneRationale}
                        </p>
                      )
                    )}
                    {draft.publishedId && (
                      <p className="mt-1 text-xs text-green-600">
                        Published ID: {draft.publishedId}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {!isPublished && (
                      <>
                        <button
                          onClick={() => handleViewEdit(draft)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          View & Edit
                        </button>
                        <button
                          onClick={() => handleQuickApprove(draft)}
                          disabled={approvingId === draft.id}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            approvingId === draft.id
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {approvingId === draft.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleQuickReject(draft)}
                          disabled={rejectingId === draft.id}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            rejectingId === draft.id
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'text-red-600 bg-red-50 hover:bg-red-100'
                          }`}
                        >
                          {rejectingId === draft.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Reject
                        </button>
                      </>
                    )}
                    <a
                      href={draft.article.externalUrl}
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
            );
          })}
        </div>
      )}

      {/* Review Detail Modal */}
      {isModalOpen && selectedDraft && (
        <ReviewDetailModal
          draft={selectedDraft}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

export default ReviewQueuePage;

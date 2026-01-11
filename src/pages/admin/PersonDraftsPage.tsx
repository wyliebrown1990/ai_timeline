/**
 * Person Drafts Review Page
 * Sprint KPC-4 - AI Entity Detection & Auto-Linking
 *
 * Admin page for reviewing person drafts extracted from articles via entity detection.
 * Allows approve (create new Person), reject, or merge with existing Person.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  User,
  CheckCircle,
  XCircle,
  GitMerge,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Building2,
  Quote,
  Percent,
  CheckSquare,
  Square,
  Plus,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  personDraftsApi,
  personsApi,
  type PersonDraft,
  type PersonDraftStats,
  type Person,
} from '../../services/api';

type TabType = 'pending' | 'approved' | 'rejected' | 'merged';

/**
 * Admin page for reviewing and processing person drafts from entity extraction
 */
export function PersonDraftsPage() {
  const [drafts, setDrafts] = useState<PersonDraft[]>([]);
  const [stats, setStats] = useState<PersonDraftStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // For merge modal
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeDraftId, setMergeDraftId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await personDraftsApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const loadDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await personDraftsApi.getAll({
        status: activeTab,
        limit: 50,
      });
      setDrafts(response.data);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to load drafts:', error);
      toast.error('Failed to load person drafts');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const handleApprove = async (draft: PersonDraft) => {
    setProcessingId(draft.id);
    try {
      const result = await personDraftsApi.approve(draft.id);
      toast.success(`Created person: ${result.person.canonicalName}`);
      loadDrafts();
      loadStats();
    } catch (error) {
      console.error('Failed to approve draft:', error);
      toast.error('Failed to create person');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (draft: PersonDraft) => {
    const reason = window.prompt('Rejection reason (optional):');
    if (reason === null) return;

    setProcessingId(draft.id);
    try {
      await personDraftsApi.reject(draft.id, reason || undefined);
      toast.success('Draft rejected');
      loadDrafts();
      loadStats();
    } catch (error) {
      console.error('Failed to reject draft:', error);
      toast.error('Failed to reject draft');
    } finally {
      setProcessingId(null);
    }
  };

  const openMergeModal = (draftId: string) => {
    setMergeDraftId(draftId);
    setShowMergeModal(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await personsApi.getAll({ search: query, limit: 10 });
      setSearchResults(result.data);
    } catch (error) {
      console.error('Failed to search persons:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMerge = async (personId: string) => {
    if (!mergeDraftId) return;

    setProcessingId(mergeDraftId);
    try {
      const result = await personDraftsApi.merge(mergeDraftId, personId);
      toast.success(`Merged with ${result.person.canonicalName}`);
      setShowMergeModal(false);
      setMergeDraftId(null);
      loadDrafts();
      loadStats();
    } catch (error) {
      console.error('Failed to merge draft:', error);
      toast.error('Failed to merge draft');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;

    const reason = window.prompt(`Reject ${selectedIds.size} drafts? Enter reason (optional):`);
    if (reason === null) return;

    try {
      const result = await personDraftsApi.batchReject(Array.from(selectedIds), reason || undefined);
      toast.success(`Rejected ${result.count} drafts`);
      loadDrafts();
      loadStats();
    } catch (error) {
      console.error('Failed to batch reject:', error);
      toast.error('Failed to reject drafts');
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === drafts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(drafts.map((d) => d.id)));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRoleBadge = (role: string | null) => {
    const styles: Record<string, string> = {
      researcher: 'bg-blue-100 text-blue-800',
      executive: 'bg-purple-100 text-purple-800',
      founder: 'bg-green-100 text-green-800',
      engineer: 'bg-orange-100 text-orange-800',
      policy_maker: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return styles[role || 'other'] || styles.other;
  };

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'pending', label: 'Pending', count: stats?.byStatus.pending },
    { key: 'approved', label: 'Approved', count: stats?.byStatus.approved },
    { key: 'rejected', label: 'Rejected', count: stats?.byStatus.rejected },
    { key: 'merged', label: 'Merged', count: stats?.byStatus.merged },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Person Drafts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review people extracted from articles via entity detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'pending' && selectedIds.size > 0 && (
            <button
              onClick={handleBatchReject}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Reject Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => {
              loadDrafts();
              loadStats();
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.byStatus.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Approved</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.byStatus.approved}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Rejected</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.byStatus.rejected}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <GitMerge className="h-4 w-4" />
              <span className="text-sm font-medium">Merged</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.byStatus.merged}</p>
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
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No {activeTab} drafts
          </h3>
          <p className="text-gray-500">
            {activeTab === 'pending'
              ? 'All drafts have been reviewed.'
              : `No drafts with status "${activeTab}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select All for pending */}
          {activeTab === 'pending' && drafts.length > 0 && (
            <div className="flex items-center gap-2 px-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {selectedIds.size === drafts.length ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Select All
              </button>
            </div>
          )}

          {drafts.map((draft) => (
            <div
              key={draft.id}
              className={`bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors ${
                draft.status !== 'pending' ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox for pending */}
                {activeTab === 'pending' && (
                  <button
                    onClick={() => toggleSelect(draft.id)}
                    className="mt-1 text-gray-400 hover:text-gray-600"
                  >
                    {selectedIds.has(draft.id) ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                )}

                <div className="flex-1 min-w-0">
                  {/* Header with name and role */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <User className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {draft.extractedName}
                    </h3>
                    {draft.suggestedRole && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getRoleBadge(draft.suggestedRole)}`}>
                        {draft.suggestedRole.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {/* Organization */}
                  {draft.suggestedOrg && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      {draft.suggestedOrg}
                    </div>
                  )}

                  {/* Context sentence */}
                  <div className="flex items-start gap-2 text-sm text-gray-600 mb-3 bg-gray-50 rounded-lg p-3">
                    <Quote className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="italic">{draft.context}</p>
                  </div>

                  {/* Suggested match */}
                  {draft.matchedPerson && (
                    <div className="text-sm mb-3 bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-blue-500" />
                        <span className="text-blue-700">
                          Suggested match: <strong>{draft.matchedPerson.canonicalName}</strong>
                          {draft.matchConfidence && (
                            <span className="ml-2 text-blue-500">
                              ({(draft.matchConfidence * 100).toFixed(0)}% confidence)
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1 ml-6">
                        Merging will add "{draft.extractedName}" as an alias for better future matching
                      </p>
                    </div>
                  )}

                  {/* Source article */}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>From: {draft.article?.title || 'Unknown article'}</span>
                    <span>{formatDate(draft.createdAt)}</span>
                    {draft.article && (
                      <a
                        href={draft.article.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Source
                      </a>
                    )}
                  </div>

                  {/* Review notes for non-pending */}
                  {draft.reviewNotes && draft.status !== 'pending' && (
                    <p className="mt-2 text-sm text-gray-500 italic">
                      Note: {draft.reviewNotes}
                    </p>
                  )}
                </div>

                {/* Actions for pending drafts */}
                {draft.status === 'pending' && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleApprove(draft)}
                      disabled={processingId === draft.id}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        processingId === draft.id
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {processingId === draft.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Create New
                    </button>
                    <button
                      onClick={() => openMergeModal(draft.id)}
                      disabled={processingId === draft.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <GitMerge className="h-4 w-4" />
                      Merge
                    </button>
                    <button
                      onClick={() => handleReject(draft)}
                      disabled={processingId === draft.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && mergeDraftId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Merge with Existing Person
            </h2>

            {/* Show what will be merged */}
            {(() => {
              const draft = drafts.find((d) => d.id === mergeDraftId);
              return draft ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Plus className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">
                        "{draft.extractedName}" will be added as an alias
                      </p>
                      <p className="text-green-600 text-xs mt-1">
                        This improves future matching accuracy for this name variant.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            <p className="text-sm text-gray-600 mb-4">
              Search for an existing person to merge this draft with.
            </p>

            {/* Search input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search persons..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                autoFocus
              />
            </div>

            {/* Search results */}
            <div className="max-h-64 overflow-y-auto mb-4">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery.length < 2
                    ? 'Type at least 2 characters to search'
                    : 'No matching persons found'}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => handleMerge(person.id)}
                      disabled={processingId !== null}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{person.canonicalName}</div>
                      <div className="text-sm text-gray-500">{person.shortBio}</div>
                      {person.primaryOrg && (
                        <div className="text-xs text-gray-400 mt-1">{person.primaryOrg}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal actions */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setMergeDraftId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonDraftsPage;

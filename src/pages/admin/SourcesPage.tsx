import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Plus, RefreshCw, Rss, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sourcesApi, type NewsSource, type CreateSourceDto } from '../../services/api';

/**
 * Admin page for managing news sources
 */
export function SourcesPage() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<CreateSourceDto>({
    name: '',
    url: '',
    feedUrl: '',
    isActive: true,
    checkFrequency: 60,
  });

  const loadSources = useCallback(async () => {
    try {
      const response = await sourcesApi.getAll();
      setSources(response.data);
    } catch (error) {
      toast.error('Failed to load sources');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleFetch = async (source: NewsSource) => {
    setFetchingId(source.id);
    try {
      const result = await sourcesApi.fetchArticles(source.id);
      toast.success(`Fetched ${result.created} new articles from ${source.name}`);
      loadSources(); // Refresh to update article counts
    } catch (error) {
      toast.error(`Failed to fetch from ${source.name}`);
      console.error(error);
    } finally {
      setFetchingId(null);
    }
  };

  const handleDelete = async (source: NewsSource) => {
    if (!confirm(`Delete "${source.name}" and all its articles?`)) return;

    try {
      await sourcesApi.delete(source.id);
      toast.success(`Deleted ${source.name}`);
      setSources(sources.filter((s) => s.id !== source.id));
    } catch (error) {
      toast.error('Failed to delete source');
      console.error(error);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newSource = await sourcesApi.create(formData);
      toast.success(`Added ${newSource.name}`);
      setSources([newSource, ...sources]);
      setShowAddForm(false);
      setFormData({
        name: '',
        url: '',
        feedUrl: '',
        isActive: true,
        checkFrequency: 60,
      });
    } catch (error) {
      toast.error('Failed to add source');
      console.error(error);
    }
  };

  const formatLastChecked = (date: string | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">News Sources</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage RSS feeds for article ingestion
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Source
        </button>
      </div>

      {/* Add Source Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Source</h2>
          <form onSubmit={handleAddSource} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., The Neuron Daily"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RSS Feed URL
                </label>
                <input
                  type="url"
                  value={formData.feedUrl}
                  onChange={(e) => setFormData({ ...formData, feedUrl: e.target.value })}
                  placeholder="https://rss.beehiiv.com/feeds/xxx.xml"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Frequency (minutes)
                </label>
                <input
                  type="number"
                  value={formData.checkFrequency}
                  onChange={(e) =>
                    setFormData({ ...formData, checkFrequency: parseInt(e.target.value) || 60 })
                  }
                  min="1"
                  max="1440"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active (include in automated fetching)
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Add Source
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sources List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Rss className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sources yet</h3>
          <p className="text-gray-500 mb-4">Add an RSS feed to start ingesting articles.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
            Add Source
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sources.map((source) => (
            <div
              key={source.id}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 p-2 rounded-lg ${
                      source.isActive ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    <Rss
                      className={`h-5 w-5 ${
                        source.isActive ? 'text-green-600' : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {source.name}
                      {!source.isActive && (
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </h3>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {source.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                      <span>Articles: {source.articleCount ?? 0}</span>
                      <span>Last checked: {formatLastChecked(source.lastCheckedAt)}</span>
                      <span>Every {source.checkFrequency}min</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFetch(source)}
                    disabled={fetchingId === source.id}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      fetchingId === source.id
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${fetchingId === source.id ? 'animate-spin' : ''}`}
                    />
                    {fetchingId === source.id ? 'Fetching...' : 'Fetch Now'}
                  </button>
                  <button
                    onClick={() => handleDelete(source)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SourcesPage;

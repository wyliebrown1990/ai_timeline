import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Rss,
  Trash2,
  Youtube,
  Zap,
  Filter,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  sourcesApi,
  type NewsSource,
  type CreateSourceDto,
  type SourceType,
  type TestConnectionResult,
  type RssConfig,
  type YouTubeChannelConfig,
  type YouTubePlaylistConfig,
  type WebScraperConfig,
} from '../../services/api';

/**
 * Source type options for the dropdown (recurring sources only - for adding new sources)
 */
const SOURCE_TYPE_OPTIONS: { value: SourceType; label: string; icon: React.ReactNode }[] = [
  { value: 'rss', label: 'RSS Feed', icon: <Rss className="h-4 w-4" /> },
  { value: 'youtube_channel', label: 'YouTube Channel', icon: <Youtube className="h-4 w-4" /> },
  { value: 'youtube_playlist', label: 'YouTube Playlist', icon: <Youtube className="h-4 w-4" /> },
  { value: 'web_scraper', label: 'Web Scraper', icon: <Globe className="h-4 w-4" /> },
];

/**
 * One-time source types (created from manual submissions, excluded from daily sync)
 */
const ONE_TIME_SOURCE_TYPES: SourceType[] = ['single_url', 'youtube_video'];

/**
 * Check if a source type is a one-time (non-recurring) type
 */
function isOneTimeSourceType(sourceType: SourceType): boolean {
  return ONE_TIME_SOURCE_TYPES.includes(sourceType);
}

/**
 * Get the icon component for a source type
 */
function getSourceIcon(sourceType: SourceType, isActive: boolean) {
  const colorClass = isActive ? 'text-green-600' : 'text-gray-400';
  const bgClass = isActive ? 'bg-green-100' : 'bg-gray-100';

  const icons: Record<SourceType, React.ReactNode> = {
    rss: <Rss className={`h-5 w-5 ${colorClass}`} />,
    youtube_channel: <Youtube className={`h-5 w-5 ${colorClass}`} />,
    youtube_playlist: <Youtube className={`h-5 w-5 ${colorClass}`} />,
    web_scraper: <Globe className={`h-5 w-5 ${colorClass}`} />,
    single_url: <FileText className={`h-5 w-5 ${colorClass}`} />,
    youtube_video: <Youtube className={`h-5 w-5 ${colorClass}`} />,
  };

  return (
    <div className={`flex-shrink-0 p-2 rounded-lg ${bgClass}`}>
      {icons[sourceType] || icons.rss}
    </div>
  );
}

/**
 * Get the display label for a source type
 */
function getSourceTypeLabel(sourceType: SourceType): string {
  const labels: Record<SourceType, string> = {
    rss: 'RSS',
    youtube_channel: 'YouTube Channel',
    youtube_playlist: 'YouTube Playlist',
    web_scraper: 'Web Scraper',
    single_url: 'Single URL',
    youtube_video: 'YouTube Video',
  };
  return labels[sourceType] || sourceType;
}

/**
 * Health status badge component
 */
function HealthBadge({ source }: { source: NewsSource }) {
  const failures = source.consecutiveFailures || 0;

  if (!source.isActive) {
    return (
      <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
        Inactive
      </span>
    );
  }

  if (failures >= 5) {
    return (
      <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Failing ({failures})
      </span>
    );
  }

  if (failures > 0) {
    return (
      <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
        {failures} failures
      </span>
    );
  }

  if (source.lastSuccessAt) {
    return (
      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Healthy
      </span>
    );
  }

  return null;
}

/**
 * Initial form state
 */
const initialFormData: CreateSourceDto = {
  name: '',
  url: '',
  sourceType: 'rss',
  config: { feedUrl: '' },
  isActive: true,
  checkFrequency: 60,
};

type SourceFilter = 'recurring' | 'one_time' | 'all';

/**
 * Admin page for managing news sources
 */
export function SourcesPage() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<CreateSourceDto>(initialFormData);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('recurring');

  // Filter sources based on the selected filter
  const filteredSources = useMemo(() => {
    if (sourceFilter === 'all') return sources;
    const isOneTime = sourceFilter === 'one_time';
    return sources.filter((s) => isOneTimeSourceType(s.sourceType) === isOneTime);
  }, [sources, sourceFilter]);

  // Count sources by category
  const sourceCounts = useMemo(() => {
    const recurring = sources.filter((s) => !isOneTimeSourceType(s.sourceType)).length;
    const oneTime = sources.filter((s) => isOneTimeSourceType(s.sourceType)).length;
    return { recurring, oneTime, all: sources.length };
  }, [sources]);

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

  const handleSourceTypeChange = (newType: SourceType) => {
    // Reset config when source type changes
    let newConfig: CreateSourceDto['config'];

    switch (newType) {
      case 'rss':
        newConfig = { feedUrl: '' };
        break;
      case 'youtube_channel':
        newConfig = { channelId: '', transcriptLanguage: 'en', includeShorts: false };
        break;
      case 'youtube_playlist':
        newConfig = { playlistId: '', transcriptLanguage: 'en' };
        break;
      case 'web_scraper':
        newConfig = { targetUrl: '', maxArticlesPerFetch: 10 };
        break;
      default:
        newConfig = { feedUrl: '' };
    }

    setFormData({
      ...formData,
      sourceType: newType,
      config: newConfig,
    });
    setTestResult(null);
  };

  const handleFetch = async (source: NewsSource) => {
    setFetchingId(source.id);
    try {
      const result = await sourcesApi.fetchArticles(source.id);
      toast.success(`Fetched ${result.created} new articles from ${source.name}`);
      loadSources();
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

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await sourcesApi.testConnection(formData);
      setTestResult(result);
      if (result.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Test failed';
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newSource = await sourcesApi.create(formData);
      toast.success(`Added ${newSource.name}`);
      setSources([newSource, ...sources]);
      setShowAddForm(false);
      setFormData(initialFormData);
      setTestResult(null);
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

  // Type-safe config update helpers
  const updateRssConfig = (updates: Partial<RssConfig>) => {
    setFormData({
      ...formData,
      config: { ...(formData.config as RssConfig), ...updates },
    });
  };

  const updateYouTubeChannelConfig = (updates: Partial<YouTubeChannelConfig>) => {
    setFormData({
      ...formData,
      config: { ...(formData.config as YouTubeChannelConfig), ...updates },
    });
  };

  const updateYouTubePlaylistConfig = (updates: Partial<YouTubePlaylistConfig>) => {
    setFormData({
      ...formData,
      config: { ...(formData.config as YouTubePlaylistConfig), ...updates },
    });
  };

  const updateWebScraperConfig = (updates: Partial<WebScraperConfig>) => {
    setFormData({
      ...formData,
      config: { ...(formData.config as WebScraperConfig), ...updates },
    });
  };

  // Render config fields based on source type
  const renderConfigFields = () => {
    switch (formData.sourceType) {
      case 'rss': {
        const config = formData.config as RssConfig;
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RSS Feed URL
            </label>
            <input
              type="url"
              value={config.feedUrl || ''}
              onChange={(e) => updateRssConfig({ feedUrl: e.target.value })}
              placeholder="https://example.com/feed.xml"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              required
            />
          </div>
        );
      }

      case 'youtube_channel': {
        const config = formData.config as YouTubeChannelConfig;
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel ID or URL
              </label>
              <input
                type="text"
                value={config.channelId || ''}
                onChange={(e) => updateYouTubeChannelConfig({ channelId: e.target.value })}
                placeholder="UCxxxxxx or https://youtube.com/@channel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter a channel ID (starts with UC) or a full YouTube channel URL
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transcript Language
                </label>
                <input
                  type="text"
                  value={config.transcriptLanguage || 'en'}
                  onChange={(e) => updateYouTubeChannelConfig({ transcriptLanguage: e.target.value })}
                  placeholder="en"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="includeShorts"
                  checked={config.includeShorts || false}
                  onChange={(e) => updateYouTubeChannelConfig({ includeShorts: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="includeShorts" className="ml-2 text-sm text-gray-700">
                  Include Shorts (&lt;60s)
                </label>
              </div>
            </div>
          </>
        );
      }

      case 'youtube_playlist': {
        const config = formData.config as YouTubePlaylistConfig;
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Playlist ID or URL
              </label>
              <input
                type="text"
                value={config.playlistId || ''}
                onChange={(e) => updateYouTubePlaylistConfig({ playlistId: e.target.value })}
                placeholder="PLxxxxxx or https://youtube.com/playlist?list=PLxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transcript Language
              </label>
              <input
                type="text"
                value={config.transcriptLanguage || 'en'}
                onChange={(e) => updateYouTubePlaylistConfig({ transcriptLanguage: e.target.value })}
                placeholder="en"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
          </>
        );
      }

      case 'web_scraper': {
        const config = formData.config as WebScraperConfig;
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target URL (Index Page)
              </label>
              <input
                type="url"
                value={config.targetUrl || ''}
                onChange={(e) => updateWebScraperConfig({ targetUrl: e.target.value })}
                placeholder="https://example.com/news"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Article Link Selector (CSS)
                </label>
                <input
                  type="text"
                  value={config.articleLinkSelector || ''}
                  onChange={(e) => updateWebScraperConfig({ articleLinkSelector: e.target.value })}
                  placeholder="a.article-link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Article Link Pattern (Regex)
                </label>
                <input
                  type="text"
                  value={config.articleLinkPattern || ''}
                  onChange={(e) => updateWebScraperConfig({ articleLinkPattern: e.target.value })}
                  placeholder="/\d{4}/\d{2}/\d{2}/"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Selector (CSS)
                </label>
                <input
                  type="text"
                  value={config.contentSelector || ''}
                  onChange={(e) => updateWebScraperConfig({ contentSelector: e.target.value })}
                  placeholder="article.post-content"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wait For Selector (CSS)
                </label>
                <input
                  type="text"
                  value={config.waitForSelector || ''}
                  onChange={(e) => updateWebScraperConfig({ waitForSelector: e.target.value })}
                  placeholder="article"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Articles Per Fetch
              </label>
              <input
                type="number"
                value={config.maxArticlesPerFetch || 10}
                onChange={(e) => updateWebScraperConfig({ maxArticlesPerFetch: parseInt(e.target.value) || 10 })}
                min="1"
                max="50"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">News Sources</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage RSS feeds, YouTube channels, and web scrapers for article ingestion
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

      {/* Source Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSourceFilter('recurring')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              sourceFilter === 'recurring'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Recurring ({sourceCounts.recurring})
          </button>
          <button
            onClick={() => setSourceFilter('one_time')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              sourceFilter === 'one_time'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            One-time ({sourceCounts.oneTime})
          </button>
          <button
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              sourceFilter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({sourceCounts.all})
          </button>
        </div>
      </div>

      {/* Add Source Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Source</h2>
          <form onSubmit={handleAddSource} className="space-y-4">
            {/* Source Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Type
              </label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSourceTypeChange(option.value)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      formData.sourceType === option.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Common Fields */}
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
            </div>

            {/* Source Type Specific Fields */}
            {renderConfigFields()}

            {/* Check Frequency */}
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
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>

            {/* Active Checkbox */}
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

            {/* Test Result */}
            {testResult && (
              <div
                className={`p-4 rounded-lg ${
                  testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testResult.message}
                    </p>
                    {testResult.sourceInfo && (
                      <p className="text-sm text-green-700 mt-1">
                        {testResult.sourceInfo.name} - {testResult.sourceInfo.itemCount} items found
                      </p>
                    )}
                    {testResult.sampleArticles && testResult.sampleArticles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-green-700">Sample articles:</p>
                        <ul className="mt-1 text-sm text-green-600 space-y-1">
                          {testResult.sampleArticles.slice(0, 3).map((article, i) => (
                            <li key={i} className="truncate">
                              • {article.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Test Connection
                  </>
                )}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Add Source
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData(initialFormData);
                  setTestResult(null);
                }}
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
      ) : filteredSources.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          {sources.length === 0 ? (
            <>
              <Rss className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sources yet</h3>
              <p className="text-gray-500 mb-4">Add an RSS feed, YouTube channel, or web scraper to start ingesting articles.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" />
                Add Source
              </button>
            </>
          ) : (
            <>
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {sourceFilter === 'recurring' ? 'recurring' : 'one-time'} sources
              </h3>
              <p className="text-gray-500 mb-4">
                {sourceFilter === 'recurring'
                  ? 'Add RSS feeds, YouTube channels, or web scrapers for automated article fetching.'
                  : 'One-time sources are created when you submit articles manually via Submit Article.'}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSources.map((source) => (
            <div
              key={source.id}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {getSourceIcon(source.sourceType, source.isActive)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                      {source.name}
                      <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {getSourceTypeLabel(source.sourceType)}
                      </span>
                      <HealthBadge source={source} />
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
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 flex-wrap">
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

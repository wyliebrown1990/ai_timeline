import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { articlesApi, ApiError } from '../../services/api';
import { Loader2, Send, ExternalLink, CheckCircle, AlertCircle, Download, Youtube, FileText } from 'lucide-react';

/**
 * Check if a URL is a YouTube video URL
 */
function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace('www.', '');
    return hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtu.be';
  } catch {
    return false;
  }
}

/**
 * Admin page for manually submitting articles for AI analysis
 * Sprint 40: Manual Article Submission MVP
 * Sprint 41: URL Scraper Integration
 * Supports: Web URLs (scraped via Playwright/Jina) and YouTube videos (with transcript extraction)
 */
export function SubmitArticlePage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [result, setResult] = useState<{
    success: boolean;
    articleId: string;
    analysisStatus: 'pending';
    message?: string;
  } | null>(null);
  const [duplicateArticleId, setDuplicateArticleId] = useState<string | null>(null);

  // Detect if the URL is a YouTube video
  const isYouTube = useMemo(() => isYouTubeUrl(sourceUrl.trim()), [sourceUrl]);

  // Fetch content from URL using Jina Reader API
  const handleFetchUrl = async () => {
    if (!sourceUrl.trim()) {
      toast.error('Enter a URL first');
      return;
    }

    // Basic URL validation
    try {
      new URL(sourceUrl.trim());
    } catch {
      toast.error('Invalid URL format');
      return;
    }

    setIsScraping(true);
    setResult(null);

    try {
      const response = await articlesApi.scrape({
        url: sourceUrl.trim(),
        submitForAnalysis: false, // Just fetch content, don't analyze yet
      });

      if (response.success && response.content) {
        setTitle(response.title || '');
        setContent(response.content);
        toast.success(`Fetched ${response.wordCount?.toLocaleString() || 0} words`);
      } else {
        toast.error(response.error || 'Failed to fetch content');
      }
    } catch (error) {
      console.error('Scrape error:', error);
      toast.error('Failed to fetch content from URL');
    } finally {
      setIsScraping(false);
    }
  };

  // Fetch and immediately analyze
  const handleFetchAndAnalyze = async () => {
    if (!sourceUrl.trim()) {
      toast.error('Enter a URL first');
      return;
    }

    try {
      new URL(sourceUrl.trim());
    } catch {
      toast.error('Invalid URL format');
      return;
    }

    setIsScraping(true);
    setResult(null);

    try {
      const response = await articlesApi.scrape({
        url: sourceUrl.trim(),
        submitForAnalysis: false, // Just fetch content, don't create article
      });

      if (response.success && response.content) {
        setTitle(response.title || '');
        setContent(response.content);
        toast.success(`Fetched ${response.wordCount || 0} words. Review and submit when ready.`);
      } else {
        toast.error(response.error || 'Failed to fetch content');
      }
    } catch (error) {
      console.error('Scrape error:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        toast.error('An article with this URL already exists');
      } else {
        toast.error('Failed to fetch and analyze content');
      }
    } finally {
      setIsScraping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceUrl.trim()) {
      toast.error('Source URL is required');
      return;
    }
    if (!content.trim()) {
      toast.error('Article content is required');
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await articlesApi.submit({
        sourceUrl: sourceUrl.trim(),
        title: title.trim() || undefined,
        content: content.trim(),
      });

      setResult(response);

      if (response.success) {
        toast.success('Article saved! Go to Ingested Articles to analyze it.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      // Check for duplicate article (409 Conflict)
      if (error instanceof ApiError && error.statusCode === 409) {
        const existingId = (error.details as { existingId?: string })?.existingId;
        if (existingId) {
          setDuplicateArticleId(existingId);
        }
        toast.error('An article with this URL already exists');
      } else if (error instanceof Error && error.message.includes('already exists')) {
        toast.error('An article with this URL already exists');
      } else {
        toast.error('Failed to submit article');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit a YouTube video directly (extracts transcript automatically)
  const handleSubmitYouTube = async () => {
    if (!sourceUrl.trim()) {
      toast.error('Enter a YouTube URL first');
      return;
    }

    setIsSubmitting(true);
    setResult(null);
    setDuplicateArticleId(null);

    try {
      const response = await articlesApi.submitYouTube({
        videoUrl: sourceUrl.trim(),
      });

      setResult({
        success: response.success,
        articleId: response.articleId,
        analysisStatus: response.analysisStatus,
        message: response.message,
      });

      if (response.success) {
        const transcriptInfo = response.hasTranscript
          ? `with transcript (${response.wordCount.toLocaleString()} words)`
          : 'using description (no transcript available)';
        toast.success(`YouTube video submitted ${transcriptInfo}`);
      }
    } catch (error) {
      console.error('YouTube submit error:', error);
      if (error instanceof ApiError && error.statusCode === 409) {
        const existingId = (error.details as { existingId?: string })?.existingId;
        if (existingId) {
          setDuplicateArticleId(existingId);
        }
        toast.error('This YouTube video has already been submitted');
      } else {
        toast.error('Failed to submit YouTube video');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSourceUrl('');
    setTitle('');
    setContent('');
    setResult(null);
    setDuplicateArticleId(null);
  };

  const isLoading = isSubmitting || isScraping;

  return (
    <div data-testid="submit-article-page" className="max-w-4xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit Article</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fetch article content from a URL or paste it manually for AI analysis.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source URL with Fetch button */}
          <div>
            <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Source URL <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                id="sourceUrl"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleFetchUrl}
                disabled={isLoading || !sourceUrl.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                title="Fetch article content from URL"
              >
                {isScraping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Fetch
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter URL and click "Fetch" to auto-fill content, or paste content manually below
            </p>
          </div>

          {/* Quick action: YouTube Video or Fetch & Analyze */}
          {sourceUrl.trim() && !content.trim() && (
            isYouTube ? (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-900">YouTube Video Detected</p>
                      <p className="text-xs text-red-700">Transcript will be extracted automatically</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitYouTube}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Youtube className="w-4 h-4" />
                        Submit Video
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Quick Action</p>
                      <p className="text-xs text-blue-700">Fetch content and run AI analysis in one step</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchAndAnalyze}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isScraping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Fetch & Analyze
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          )}

          {/* Title (optional) */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Article Title <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Will be extracted from content if not provided"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              disabled={isLoading}
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Article Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the full article text here or use 'Fetch' to auto-fill..."
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-900 bg-white"
              required
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              {content.length.toLocaleString()} characters
              {content.length > 0 && ` (~${Math.ceil(content.split(/\s+/).length)} words)`}
            </p>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isLoading || !sourceUrl.trim() || !content.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Article
                </>
              )}
            </button>

            {(sourceUrl || title || content) && !isLoading && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear Form
              </button>
            )}
          </div>
        </form>

        {/* Result display */}
        {result && (
          <div className="mt-6 p-4 rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              )}

              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {result.success ? 'Article Saved' : 'Submission Failed'}
                </h3>

                {result.success && (
                  <p className="mt-2 text-sm text-gray-600">
                    {result.message || 'Article saved. Go to Ingested Articles to analyze it.'}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/admin/articles?highlight=${result.articleId}`)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Go to Ingested Articles
                  </button>

                  <button
                    onClick={handleReset}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Submit Another
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate article notification */}
        {duplicateArticleId && !result && (
          <div className="mt-6 p-4 rounded-lg border border-orange-200 bg-orange-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-orange-900">Article Already Exists</h3>
                <p className="mt-1 text-sm text-orange-700">
                  An article with this URL has already been submitted.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/admin/articles/${duplicateArticleId}`)}
                    className="flex items-center gap-1 text-sm text-orange-700 hover:text-orange-900 font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Existing Article
                  </button>
                  <button
                    onClick={handleReset}
                    className="text-sm text-orange-600 hover:text-orange-800"
                  >
                    Submit Different Article
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How it works</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Enter a URL and click "Fetch" to auto-fill content, or paste manually</li>
          <li>For YouTube videos, transcripts are extracted automatically</li>
          <li>AI screens the content for relevance to AI history</li>
          <li>If relevant, AI generates milestone, news event, and/or glossary drafts</li>
          <li>Review and approve drafts in the Review Queue</li>
        </ol>
        <div className="mt-3 flex items-center gap-4 text-xs text-blue-700">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" /> Web Articles
          </span>
          <span className="flex items-center gap-1">
            <Youtube className="w-3 h-3" /> YouTube Videos
          </span>
        </div>
      </div>
    </div>
  );
}

export default SubmitArticlePage;

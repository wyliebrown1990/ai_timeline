import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { currentEventsApi } from '../../services/api';
import { Loader2, Save, X, Calendar, Link, FileText } from 'lucide-react';

/**
 * Admin page for creating news events directly (bypassing AI pipeline)
 * Sprint 42: Quick Create Forms
 */
export function CreateNewsEventPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourcePublisher, setSourcePublisher] = useState('');
  const [publishedDate, setPublishedDate] = useState(new Date().toISOString().split('T')[0]);
  const [connectionExplanation, setConnectionExplanation] = useState('');
  const [featured, setFeatured] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!headline.trim()) {
      toast.error('Headline is required');
      return;
    }
    if (!summary.trim()) {
      toast.error('Summary is required');
      return;
    }
    if (!publishedDate) {
      toast.error('Published date is required');
      return;
    }
    if (!connectionExplanation.trim()) {
      toast.error('Connection explanation is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await currentEventsApi.create({
        headline: headline.trim(),
        summary: summary.trim(),
        sourceUrl: sourceUrl.trim() || undefined,
        sourcePublisher: sourcePublisher.trim() || undefined,
        publishedDate,
        connectionExplanation: connectionExplanation.trim(),
        featured,
      });

      toast.success('News event created successfully!');
      navigate('/admin/review'); // Go to review queue to see it
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Failed to create news event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-testid="create-news-event-page" className="max-w-3xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create News Event</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a news event directly without AI analysis. For quick manual entries.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Headline */}
          <div>
            <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-1">
              Headline <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g., OpenAI announces GPT-5 with reasoning capabilities"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              maxLength={200}
              required
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              {headline.length}/200 characters
            </p>
          </div>

          {/* Summary */}
          <div>
            <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
              Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of the news event..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              maxLength={500}
              required
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              {summary.length}/500 characters
            </p>
          </div>

          {/* Source URL and Publisher */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 mb-1">
                <Link className="w-4 h-4 inline mr-1" />
                Source URL
              </label>
              <input
                type="url"
                id="sourceUrl"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="sourcePublisher" className="block text-sm font-medium text-gray-700 mb-1">
                Source Publisher
              </label>
              <input
                type="text"
                id="sourcePublisher"
                value={sourcePublisher}
                onChange={(e) => setSourcePublisher(e.target.value)}
                placeholder="e.g., TechCrunch, The Verge"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Published Date */}
          <div>
            <label htmlFor="publishedDate" className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Published Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="publishedDate"
              value={publishedDate}
              onChange={(e) => setPublishedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Connection Explanation */}
          <div>
            <label htmlFor="connectionExplanation" className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Connection Explanation <span className="text-red-500">*</span>
            </label>
            <textarea
              id="connectionExplanation"
              value={connectionExplanation}
              onChange={(e) => setConnectionExplanation(e.target.value)}
              placeholder="Explain how this news connects to AI history and why it matters..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              required
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              How does this event relate to the AI timeline?
            </p>
          </div>

          {/* Featured checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isSubmitting}
            />
            <label htmlFor="featured" className="text-sm text-gray-700">
              Feature this event (show prominently)
            </label>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Event
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Help text */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
        <h3 className="text-sm font-medium text-yellow-900 mb-2">Note</h3>
        <p className="text-sm text-yellow-800">
          This creates an event directly without AI-generated content fields.
          For full AI analysis, use the "Submit Article" page instead.
        </p>
      </div>
    </div>
  );
}

export default CreateNewsEventPage;

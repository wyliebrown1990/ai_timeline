/**
 * SEO Content Generator Admin Page
 * Sprint SEO-4 Task 8 - Admin Tools for Content Generation
 *
 * Admin page for bulk generating Explained and Who Invented content using Claude API.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Play,
  FileText,
  Users,
  Eye,
  RotateCcw,
  ChevronRight,
  Square,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  seoContentApi,
  type SeoContentStats,
  type SeoContentTerm,
  type SeoTermContent,
  type SeoGenerationResult,
} from '../../services/api';

// Status colors
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  generating: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  complete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

/**
 * Stats card component
 */
function StatsCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`p-4 rounded-xl ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}

/**
 * Term preview modal
 */
function PreviewModal({
  termId,
  onClose,
}: {
  termId: string;
  onClose: () => void;
}) {
  const [content, setContent] = useState<SeoTermContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const data = await seoContentApi.getTermContent(termId);
        setContent(data);
      } catch (error) {
        console.error('Failed to load content:', error);
        toast.error('Failed to load content');
      } finally {
        setIsLoading(false);
      }
    }
    loadContent();
  }, [termId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {content.term} - Generated Content
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] space-y-6">
          {/* History Section */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">History Section</h3>
            {content.historySection ? (
              <div className="prose dark:prose-invert max-w-none text-sm">
                {content.historySection.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">Not generated</p>
            )}
          </div>

          {/* How It Works Section */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">How It Works Section</h3>
            {content.howItWorksSection ? (
              <div className="prose dark:prose-invert max-w-none text-sm">
                {content.howItWorksSection.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">Not generated</p>
            )}
          </div>

          {/* FAQ Items */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">FAQ Items</h3>
            {content.faqItems.length > 0 ? (
              <div className="space-y-3">
                {content.faqItems.map((faq, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      Q: {faq.question}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                      A: {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">Not generated</p>
            )}
          </div>

          {/* Who Invented Quick Answer */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Who Invented Quick Answer</h3>
            {content.whoInventedQuickAnswer ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-sm">
                {content.whoInventedQuickAnswer}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">Not generated</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main SEO Content Generator Page
 */
export default function SeoContentGeneratorPage() {
  // State
  const [stats, setStats] = useState<SeoContentStats | null>(null);
  const [terms, setTerms] = useState<SeoContentTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<'explained' | 'who-invented'>('explained');
  const [generationResults, setGenerationResults] = useState<SeoGenerationResult[]>([]);
  const [previewTermId, setPreviewTermId] = useState<string | null>(null);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const data = await seoContentApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // Load terms
  const loadTerms = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await seoContentApi.getTermsNeedingGeneration(100);
      setTerms(data.terms);
    } catch (error) {
      console.error('Failed to load terms:', error);
      toast.error('Failed to load terms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStats();
    loadTerms();
  }, [loadStats, loadTerms]);

  // Toggle selection
  const toggleSelection = (termId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(termId)) {
        next.delete(termId);
      } else {
        next.add(termId);
      }
      return next;
    });
  };

  // Select all
  const selectAll = () => {
    if (selectedIds.size === terms.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(terms.map((t) => t.id)));
    }
  };

  // Generate content for selected terms
  const generateContent = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one term');
      return;
    }

    if (selectedIds.size > 20) {
      toast.error('Maximum 20 terms per batch');
      return;
    }

    setIsGenerating(true);
    setGenerationResults([]);

    try {
      const termIds = Array.from(selectedIds);

      if (generationType === 'explained') {
        const result = await seoContentApi.bulkGenerateExplained(termIds);
        setGenerationResults(result.results);
        toast.success(`Generated ${result.success} of ${result.total} terms`);
      } else {
        const result = await seoContentApi.bulkGenerateWhoInvented(termIds);
        setGenerationResults(result.results);
        toast.success(
          `Generated ${result.success} of ${result.total} terms (${result.skipped} skipped - no key figures)`
        );
      }

      // Refresh data
      await loadStats();
      await loadTerms();
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to generate content:', error);
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset term status
  const resetTerm = async (termId: string) => {
    try {
      await seoContentApi.resetTermStatus(termId);
      toast.success('Term reset to pending');
      await loadStats();
      await loadTerms();
    } catch (error) {
      console.error('Failed to reset term:', error);
      toast.error('Failed to reset term');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              SEO Content Generator
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Bulk generate Explained and Who Invented content using Claude
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            loadStats();
            loadTerms();
          }}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard
            label="Total Terms"
            value={stats.total}
            color="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <StatsCard
            label="Pending"
            value={stats.pending}
            color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"
          />
          <StatsCard
            label="Generating"
            value={stats.generating}
            color="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
          />
          <StatsCard
            label="Complete"
            value={stats.complete}
            color="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
          />
          <StatsCard
            label="Error"
            value={stats.error}
            color="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
          />
        </div>
      )}

      {/* Generation Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Generation Type:
              </label>
              <select
                value={generationType}
                onChange={(e) => setGenerationType(e.target.value as 'explained' | 'who-invented')}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value="explained">Explained Content</option>
                <option value="who-invented">Who Invented Content</option>
              </select>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedIds.size} of {terms.length} selected
            </div>
          </div>

          <button
            onClick={generateContent}
            disabled={isGenerating || selectedIds.size === 0}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate {generationType === 'explained' ? 'Explained' : 'Who Invented'} Content
              </>
            )}
          </button>
        </div>

        {/* Generation type info */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          {generationType === 'explained' ? (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Explained Content Generation</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generates History section, How It Works section, and 5 FAQ items for each term.
                  Uses Claude Sonnet for high-quality educational content.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Who Invented Content Generation</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generates a 50-70 word quick answer for "Who invented X?" featured snippets.
                  Only works for terms with linked key figures.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generation Results */}
      {generationResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Generation Results</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {generationResults.map((result) => (
              <div
                key={result.termId}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  result.success
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">{result.term}</span>
                </div>
                {result.error && (
                  <span className="text-xs text-red-600 dark:text-red-400">{result.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terms List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Terms Needing Content Generation
          </h3>
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {selectedIds.size === terms.length ? (
              <>
                <CheckSquare className="h-4 w-4" />
                Deselect All
              </>
            ) : (
              <>
                <Square className="h-4 w-4" />
                Select All
              </>
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          </div>
        ) : terms.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>All terms have been processed!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {terms.map((term) => (
              <div
                key={term.id}
                className={`p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  selectedIds.has(term.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelection(term.id)}
                  className="flex-shrink-0"
                >
                  {selectedIds.has(term.id) ? (
                    <CheckSquare className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Square className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {/* Term Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {term.term}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[term.seoContentStatus]}`}
                    >
                      {term.seoContentStatus}
                    </span>
                    {term.hasKeyFigures && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">
                        <Users className="h-3 w-3" />
                        Has Figures
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {term.shortDefinition}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {term.seoContentStatus === 'complete' && (
                    <button
                      onClick={() => setPreviewTermId(term.id)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                      title="Preview content"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  {(term.seoContentStatus === 'complete' || term.seoContentStatus === 'error') && (
                    <button
                      onClick={() => resetTerm(term.id)}
                      className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg"
                      title="Reset to pending"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTermId && (
        <PreviewModal termId={previewTermId} onClose={() => setPreviewTermId(null)} />
      )}
    </div>
  );
}

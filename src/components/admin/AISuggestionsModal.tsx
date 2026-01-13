import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, Check, AlertCircle, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  glossaryApi,
  type GlossaryTerm,
  type PrerequisiteSuggestion,
  type PrerequisiteSuggestionResult,
} from '../../services/api';

/**
 * Difficulty level labels and colors
 */
const DIFFICULTY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Beginner', color: 'bg-green-100 text-green-800' },
  2: { label: 'Intermediate', color: 'bg-lime-100 text-lime-800' },
  3: { label: 'Advanced', color: 'bg-yellow-100 text-yellow-800' },
  4: { label: 'Expert', color: 'bg-orange-100 text-orange-800' },
  5: { label: 'Specialist', color: 'bg-red-100 text-red-800' },
};

/**
 * Match type colors
 */
const MATCH_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  exact: { label: 'Exact Match', color: 'bg-green-100 text-green-700' },
  fuzzy: { label: 'Fuzzy Match', color: 'bg-blue-100 text-blue-700' },
  semantic: { label: 'Semantic', color: 'bg-purple-100 text-purple-700' },
};

interface AISuggestionsModalProps {
  term: GlossaryTerm;
  onClose: () => void;
  onApply: (term: GlossaryTerm) => void;
}

/**
 * Modal for reviewing and applying AI-powered prerequisite suggestions
 */
export function AISuggestionsModal({ term, onClose, onApply }: AISuggestionsModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrerequisiteSuggestionResult['data'] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(term.difficulty || 1);

  // Fetch AI suggestions on mount
  useEffect(() => {
    async function fetchSuggestions() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await glossaryApi.suggestPrerequisites(term.id);
        setResult(response.data);
        // Pre-select high confidence suggestions (>0.7)
        const highConfidence = response.data.suggestions
          .filter((s) => s.confidence > 0.7 && s.termId)
          .map((s) => s.termId);
        setSelectedIds(new Set(highConfidence));
        setSelectedDifficulty(response.data.suggestedDifficulty);
      } catch (err) {
        console.error('[AISuggestionsModal] Failed to fetch suggestions:', err);
        setError(err instanceof Error ? err.message : 'Failed to get AI suggestions');
      } finally {
        setIsLoading(false);
      }
    }
    fetchSuggestions();
  }, [term.id]);

  // Toggle suggestion selection
  const toggleSuggestion = (suggestion: PrerequisiteSuggestion) => {
    if (!suggestion.termId) return; // Can't select unmatched suggestions
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(suggestion.termId)) {
        next.delete(suggestion.termId);
      } else {
        next.add(suggestion.termId);
      }
      return next;
    });
  };

  // Apply selected suggestions
  const handleApply = async () => {
    setIsApplying(true);
    try {
      const response = await glossaryApi.applySuggestions(term.id, {
        prerequisiteIds: Array.from(selectedIds),
        difficulty: selectedDifficulty,
      });
      toast.success('Prerequisites updated successfully');
      onApply(response.term);
      onClose();
    } catch (err) {
      console.error('[AISuggestionsModal] Failed to apply suggestions:', err);
      toast.error('Failed to apply suggestions');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Prerequisite Suggestions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">for "{term.term}"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Analyzing term with AI...</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                This may take a few seconds
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400 mb-2">Failed to get suggestions</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Try Again
              </button>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* AI Reasoning */}
              {result.reasoning && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h3 className="font-medium text-purple-900 dark:text-purple-200 mb-2">
                    AI Analysis
                  </h3>
                  <p className="text-sm text-purple-800 dark:text-purple-300">{result.reasoning}</p>
                </div>
              )}

              {/* Suggested Difficulty */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  Suggested Difficulty Level
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const config = DIFFICULTY_CONFIG[level] ?? { label: `Level ${level}`, color: 'bg-gray-100 text-gray-800' };
                    const isSelected = selectedDifficulty === level;
                    const isSuggested = result.suggestedDifficulty === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setSelectedDifficulty(level)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? `${config.color} ring-2 ring-offset-2 ring-purple-500`
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {config.label}
                        {isSuggested && !isSelected && (
                          <span className="ml-1 text-xs">(suggested)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  Suggested Prerequisites ({result.suggestions.length})
                </h3>
                {result.suggestions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No prerequisites suggested - this appears to be a foundational concept.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {result.suggestions.map((suggestion, index) => {
                      const isSelected = suggestion.termId && selectedIds.has(suggestion.termId);
                      const canSelect = !!suggestion.termId;
                      const matchConfig = MATCH_TYPE_CONFIG[suggestion.matchType] ?? { label: 'Match', color: 'bg-gray-100 text-gray-700' };

                      return (
                        <button
                          key={`${suggestion.termId || suggestion.termName}-${index}`}
                          onClick={() => toggleSuggestion(suggestion)}
                          disabled={!canSelect}
                          className={`w-full text-left p-4 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : canSelect
                                ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-500'
                                  : canSelect
                                    ? 'border-gray-300 dark:border-gray-600'
                                    : 'border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {suggestion.termName}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${matchConfig.color}`}>
                                  {matchConfig.label}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    suggestion.confidence > 0.8
                                      ? 'bg-green-100 text-green-700'
                                      : suggestion.confidence > 0.5
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {Math.round(suggestion.confidence * 100)}% confidence
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {suggestion.reason}
                              </p>
                              {!canSelect && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                  Not in glossary - add this term first to use as prerequisite
                                </p>
                              )}
                            </div>

                            {/* Arrow */}
                            {canSelect && (
                              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Current Prerequisites */}
              {result.currentPrerequisites.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Current Prerequisites
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {result.currentPrerequisites.length} existing prerequisite
                    {result.currentPrerequisites.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!isLoading && !error && result && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedIds.size} prerequisite{selectedIds.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Apply Suggestions
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AISuggestionsModal;

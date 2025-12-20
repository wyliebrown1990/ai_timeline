import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, BookOpen, Filter, X, Sparkles, CheckSquare, Square, Bookmark } from 'lucide-react';
import { useOnboarding } from '../components/Onboarding';
import { useGlossary } from '../hooks';
import { GlossaryTermDetail } from '../components/Glossary/GlossaryTermDetail';
import { AddToFlashcardButton } from '../components/Flashcards';
import { useFlashcardContext } from '../contexts/FlashcardContext';
import { GLOSSARY_CATEGORIES, GLOSSARY_CATEGORY_LABELS, type GlossaryCategory } from '../types/glossary';
import type { GlossaryEntry } from '../types/glossary';

/**
 * Generate alphabet array for navigation
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Group glossary terms by their first letter
 */
function groupTermsByLetter(terms: GlossaryEntry[]): Record<string, GlossaryEntry[]> {
  const groups: Record<string, GlossaryEntry[]> = {};

  terms.forEach((term) => {
    const firstLetter = term.term.charAt(0).toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(term);
  });

  // Sort terms within each group
  Object.keys(groups).forEach((letter) => {
    groups[letter]?.sort((a, b) => a.term.localeCompare(b.term));
  });

  return groups;
}

/**
 * GlossaryPage component
 * Displays all glossary terms with alphabetical navigation, search, and category filters
 * Anthropic Warm theme - elegant, minimal design
 */
export default function GlossaryPage() {
  const { data: glossaryData, isLoading } = useGlossary();
  const allTerms = glossaryData ?? [];
  const [searchParams, setSearchParams] = useSearchParams();
  const { openOnboarding } = useOnboarding();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GlossaryCategory | 'all'>('all');
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  // Multi-select mode state (Sprint 22)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTermIds, setSelectedTermIds] = useState<Set<string>>(new Set());

  // Flashcard context for batch operations (Sprint 22)
  const { addCard, isCardSaved } = useFlashcardContext();

  // Handle URL hash for direct linking to terms
  useEffect(() => {
    const termId = searchParams.get('term');
    if (termId) {
      setSelectedTermId(termId);
    }
  }, [searchParams]);

  // Filter terms based on search and category
  const filteredTerms = useMemo(() => {
    let terms = allTerms;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      terms = terms.filter(
        (term) =>
          term.term.toLowerCase().includes(query) ||
          term.shortDefinition.toLowerCase().includes(query) ||
          term.fullDefinition.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      terms = terms.filter((term) => term.category === selectedCategory);
    }

    return terms;
  }, [allTerms, searchQuery, selectedCategory]);

  // Group filtered terms by letter
  const groupedTerms = useMemo(() => groupTermsByLetter(filteredTerms), [filteredTerms]);

  // Get letters that have terms
  const availableLetters = useMemo(() => new Set(Object.keys(groupedTerms)), [groupedTerms]);

  // Handle term selection
  const handleTermClick = (term: GlossaryEntry) => {
    setSelectedTermId(term.id);
    setSearchParams({ term: term.id });
  };

  // Handle closing the detail panel
  const handleCloseDetail = () => {
    setSelectedTermId(null);
    setSearchParams({});
  };

  // Toggle select mode (Sprint 22)
  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => {
      if (prev) {
        // Exiting select mode - clear selections
        setSelectedTermIds(new Set());
      }
      return !prev;
    });
  }, []);

  // Toggle term selection (Sprint 22)
  const toggleTermSelection = useCallback((termId: string) => {
    setSelectedTermIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(termId)) {
        newSet.delete(termId);
      } else {
        newSet.add(termId);
      }
      return newSet;
    });
  }, []);

  // Select all filtered terms (Sprint 22)
  const selectAllFiltered = useCallback(() => {
    const notSavedIds = filteredTerms
      .filter((term) => !isCardSaved('concept', term.id))
      .map((term) => term.id);
    setSelectedTermIds(new Set(notSavedIds));
  }, [filteredTerms, isCardSaved]);

  // Clear all selections (Sprint 22)
  const clearSelections = useCallback(() => {
    setSelectedTermIds(new Set());
  }, []);

  // Add selected terms to flashcards (Sprint 22, async Sprint 38)
  const addSelectedToFlashcards = useCallback(async () => {
    let addedCount = 0;

    for (const termId of selectedTermIds) {
      if (!isCardSaved('concept', termId)) {
        try {
          const result = await addCard('concept', termId);
          if (result) addedCount++;
        } catch (error) {
          console.error('[GlossaryPage] Failed to add flashcard:', error);
        }
      }
    }

    // Clear selections and exit select mode
    setSelectedTermIds(new Set());
    setIsSelectMode(false);

    return addedCount;
  }, [selectedTermIds, isCardSaved, addCard]);

  // Count of terms that can be added (not already saved)
  const addableCount = useMemo(() => {
    return Array.from(selectedTermIds).filter(
      (id) => !isCardSaved('concept', id)
    ).length;
  }, [selectedTermIds, isCardSaved]);

  // Find the selected term
  const selectedTerm = useMemo(
    () => allTerms.find((t) => t.id === selectedTermId),
    [allTerms, selectedTermId]
  );

  // Handle keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          document.getElementById('glossary-search')?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll to letter section
  const scrollToLetter = (letter: string) => {
    const element = document.getElementById(`glossary-section-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
      <div className="container-main py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-orange-500 dark:text-orange-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Glossary
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Select Mode Toggle (Sprint 22) */}
            <button
              onClick={toggleSelectMode}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isSelectMode
                  ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-300'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              title={isSelectMode ? 'Exit select mode' : 'Select multiple terms to add to flashcards'}
              data-testid="select-mode-toggle"
            >
              {isSelectMode ? (
                <>
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Select</span>
                </>
              )}
            </button>
            <button
              onClick={openOnboarding}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Get personalized learning recommendations"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Personalize</span>
            </button>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
          Plain-language definitions of AI terms with business context.
          Click any term to learn more, or hover for quick definitions.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            id="glossary-search"
            type="text"
            placeholder="Search terms... (Press '/' to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            All ({allTerms.length})
          </button>
          {GLOSSARY_CATEGORIES.map((category) => {
            const count = allTerms.filter((t) => t.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {GLOSSARY_CATEGORY_LABELS[category]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Alphabetical navigation */}
      <nav
        className="mb-6 flex flex-wrap gap-1 sticky top-16 z-10 bg-gray-50 dark:bg-gray-900 py-3 border-b border-gray-200 dark:border-gray-700"
        aria-label="Alphabetical navigation"
      >
        {ALPHABET.map((letter) => {
          const isAvailable = availableLetters.has(letter);
          return (
            <button
              key={letter}
              onClick={() => isAvailable && scrollToLetter(letter)}
              disabled={!isAvailable}
              className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                isAvailable
                  ? 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-orange-900/50 dark:hover:text-orange-300'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }`}
              aria-label={isAvailable ? `Jump to ${letter}` : `No terms starting with ${letter}`}
            >
              {letter}
            </button>
          );
        })}
      </nav>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredTerms.length} of {allTerms.length} terms
        {searchQuery && ` matching "${searchQuery}"`}
        {selectedCategory !== 'all' && ` in ${GLOSSARY_CATEGORY_LABELS[selectedCategory]}`}
      </p>

      {/* Terms list */}
      {filteredTerms.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No terms found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {ALPHABET.filter((letter) => groupedTerms[letter]).map((letter) => (
            <section
              key={letter}
              id={`glossary-section-${letter}`}
              className="scroll-mt-32"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                {letter}
              </h2>
              <div className="grid gap-3">
                {(groupedTerms[letter] ?? []).map((term) => {
                  const isSelected = selectedTermIds.has(term.id);
                  const isSaved = isCardSaved('concept', term.id);

                  return (
                    <div
                      key={term.id}
                      className={`
                        relative p-4 rounded-lg border transition-colors group
                        ${isSelectMode && isSelected
                          ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                        }
                      `}
                    >
                      {/* Select mode: checkbox */}
                      {isSelectMode ? (
                        <button
                          onClick={() => toggleTermSelection(term.id)}
                          className="absolute top-4 left-4 z-10"
                          aria-label={isSelected ? `Deselect ${term.term}` : `Select ${term.term}`}
                          disabled={isSaved}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          ) : isSaved ? (
                            <CheckSquare className="w-5 h-5 text-green-500 dark:text-green-400" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      ) : (
                        /* Normal mode: flashcard button (Sprint 22) */
                        <div
                          className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AddToFlashcardButton
                            sourceType="concept"
                            sourceId={term.id}
                            variant="icon"
                            size="sm"
                          />
                        </div>
                      )}

                      <button
                        onClick={() => isSelectMode ? toggleTermSelection(term.id) : handleTermClick(term)}
                        className={`text-left w-full ${isSelectMode ? 'pl-8' : ''}`}
                        disabled={isSelectMode && isSaved}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                {term.term}
                              </h3>
                              {isSaved && (
                                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
                                  <Bookmark className="w-3 h-3 fill-current" />
                                  Saved
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {term.shortDefinition}
                            </p>
                          </div>
                          <span className="shrink-0 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            {GLOSSARY_CATEGORY_LABELS[term.category]}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Bulk action bar (Sprint 22) */}
      {isSelectMode && selectedTermIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-200"
          data-testid="bulk-action-bar"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            {/* Selection count */}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedTermIds.size} selected
              {addableCount < selectedTermIds.size && (
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  ({selectedTermIds.size - addableCount} already saved)
                </span>
              )}
            </span>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Select all button */}
            <button
              onClick={selectAllFiltered}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Select all
            </button>

            {/* Clear button */}
            <button
              onClick={clearSelections}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Clear
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Add to flashcards button */}
            <button
              onClick={addSelectedToFlashcards}
              disabled={addableCount === 0}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors
                ${addableCount > 0
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                }
              `}
              data-testid="add-selected-to-flashcards"
            >
              <Bookmark className="w-4 h-4" />
              Add {addableCount > 0 ? addableCount : ''} to Flashcards
            </button>
          </div>
        </div>
      )}

      {/* Term detail panel */}
      {selectedTerm && (
        <GlossaryTermDetail
          term={selectedTerm}
          onClose={handleCloseDetail}
          onSelectTerm={(id) => {
            setSelectedTermId(id);
            setSearchParams({ term: id });
          }}
        />
      )}
    </div>
  );
}

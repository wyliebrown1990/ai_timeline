import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, BookOpen, Filter, X } from 'lucide-react';
import { useGlossary } from '../hooks/useContent';
import { GlossaryTermDetail } from '../components/Glossary/GlossaryTermDetail';
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
 */
export default function GlossaryPage() {
  const { data: glossaryData, isLoading } = useGlossary();
  const allTerms = glossaryData ?? [];
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GlossaryCategory | 'all'>('all');
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

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
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Glossary
          </h1>
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
            className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
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
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
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
        className="mb-6 flex flex-wrap gap-1 sticky top-16 z-10 bg-white dark:bg-gray-900 py-3 border-b border-gray-200 dark:border-gray-700"
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
                  ? 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/50 dark:hover:text-blue-300'
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                {letter}
              </h2>
              <div className="grid gap-3">
                {(groupedTerms[letter] ?? []).map((term) => (
                  <button
                    key={term.id}
                    onClick={() => handleTermClick(term)}
                    className="text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {term.term}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {term.shortDefinition}
                        </p>
                      </div>
                      <span className="shrink-0 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {GLOSSARY_CATEGORY_LABELS[term.category]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
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

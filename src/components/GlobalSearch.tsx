/**
 * Global Search Component
 * Sprint 47 - Phase 7: Search Integration
 *
 * Command palette style search across milestones, glossary terms, and key figures.
 * Activated via Cmd/Ctrl+K or search button in header.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, FileText, User, Loader2 } from 'lucide-react';
import {
  globalSearchApi,
  type GlobalSearchResult,
  type MilestoneSearchResult,
  type GlossarySearchResult,
  type KeyFigureSearchResult,
} from '../services/api';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Debounce hook for search input
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Type guard for milestone result
 */
function isMilestone(result: GlobalSearchResult): result is MilestoneSearchResult {
  return result.type === 'milestone';
}

/**
 * Type guard for glossary result
 */
function isGlossary(result: GlobalSearchResult): result is GlossarySearchResult {
  return result.type === 'glossary';
}

/**
 * Type guard for key figure result
 */
function isKeyFigure(result: GlobalSearchResult): result is KeyFigureSearchResult {
  return result.type === 'keyFigure';
}

/**
 * Get role badge color for key figures
 */
function getRoleBadgeColor(role: string): string {
  const defaultColor = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const colors: Record<string, string> = {
    researcher: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    executive: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    founder: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    policy_maker: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    engineer: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    other: defaultColor,
  };
  return colors[role] ?? defaultColor;
}

/**
 * Get category badge color for glossary and milestones
 */
function getCategoryBadgeColor(category: string): string {
  const defaultColor = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const colors: Record<string, string> = {
    // Milestone categories
    MODEL_RELEASE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    RESEARCH: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    PRODUCT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    INDUSTRY: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    REGULATION: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    BREAKTHROUGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    // Glossary categories
    core_concept: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    technical_term: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    business_term: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    model_architecture: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    company_product: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  };
  return colors[category] ?? defaultColor;
}

/**
 * Format category for display
 */
function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(query, 200);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search when debounced query changes
  useEffect(() => {
    async function search() {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await globalSearchApi.search(debouncedQuery, { limit: 5 });
        setResults(response.results);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }

    search();
  }, [debouncedQuery]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    },
    [results, selectedIndex, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    const resultElements = resultsRef.current?.querySelectorAll('[data-result-item]');
    resultElements?.[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Handle result selection
  const handleSelect = useCallback(
    (result: GlobalSearchResult) => {
      onClose();
      if (isMilestone(result)) {
        navigate(`/timeline?milestone=${result.id}`);
      } else if (isGlossary(result)) {
        navigate(`/glossary?term=${result.id}`);
      } else if (isKeyFigure(result)) {
        navigate(`/glossary?tab=figures&figure=${result.id}`);
      }
    },
    [navigate, onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="w-full max-w-xl mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search milestones, terms, people..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none text-lg"
            autoComplete="off"
            spellCheck="false"
          />
          {isLoading && <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto">
          {query.length >= 2 && results.length === 0 && !isLoading && (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No results found for "{query}"
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  data-result-item
                  onClick={() => handleSelect(result)}
                  className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-orange-50 dark:bg-orange-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${
                      isMilestone(result)
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : isGlossary(result)
                          ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                  >
                    {isMilestone(result) && <Clock className="h-4 w-4" />}
                    {isGlossary(result) && <FileText className="h-4 w-4" />}
                    {isKeyFigure(result) && <User className="h-4 w-4" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {isMilestone(result) && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {result.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-xs font-medium rounded ${getCategoryBadgeColor(result.category)}`}
                          >
                            {formatCategory(result.category)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                          {result.description}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(result.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                          })}
                          {result.organization && ` • ${result.organization}`}
                        </p>
                      </>
                    )}

                    {isGlossary(result) && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {result.term}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-xs font-medium rounded ${getCategoryBadgeColor(result.category)}`}
                          >
                            {formatCategory(result.category)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                          {result.shortDefinition}
                        </p>
                      </>
                    )}

                    {isKeyFigure(result) && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {result.canonicalName}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-xs font-medium rounded ${getRoleBadgeColor(result.role)}`}
                          >
                            {formatCategory(result.role)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                          {result.shortBio}
                        </p>
                        {result.primaryOrg && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {result.primaryOrg}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Keyboard hints */}
          {query.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Search across milestones, glossary terms, and key figures
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                    ↑↓
                  </kbd>{' '}
                  Navigate
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                    Enter
                  </kbd>{' '}
                  Select
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                    Esc
                  </kbd>{' '}
                  Close
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Hook to manage global search state and keyboard shortcut
 */
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => setIsOpen(false), []);

  // Register Cmd/Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, openSearch, closeSearch };
}

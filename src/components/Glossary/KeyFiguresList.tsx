/**
 * KeyFiguresList Component
 * Sprint 47 - Key Figures Frontend
 * Updated: Now uses Person model instead of legacy KeyFigure model
 *
 * Displays all key figures with role filtering, search, and alphabetical grouping
 */

import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, X, Users } from 'lucide-react';
import { personsApi } from '../../services/api';
import { KeyFigureCard } from './KeyFigureCard';
import type { KeyFigure, KeyFigureRole } from '../../types/keyFigure';
import { ROLE_LABELS } from '../../types/keyFigure';
import type { Person } from '../../types/person';

// Role filter options
const ROLE_OPTIONS: Array<{ value: KeyFigureRole | 'all'; label: string }> = [
  { value: 'all', label: 'All Roles' },
  { value: 'researcher', label: 'Researchers' },
  { value: 'executive', label: 'Executives' },
  { value: 'founder', label: 'Founders' },
  { value: 'engineer', label: 'Engineers' },
  { value: 'policy_maker', label: 'Policy Makers' },
  { value: 'other', label: 'Other' },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface KeyFiguresListProps {
  onSelectFigure: (figure: KeyFigure) => void;
}

/**
 * Group figures by first letter of canonical name
 */
function groupFiguresByLetter(figures: KeyFigure[]): Record<string, KeyFigure[]> {
  const groups: Record<string, KeyFigure[]> = {};

  figures.forEach((figure) => {
    const firstLetter = figure.canonicalName.charAt(0).toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(figure);
  });

  // Sort figures within each group
  Object.keys(groups).forEach((letter) => {
    groups[letter]?.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  });

  return groups;
}

export function KeyFiguresList({ onSelectFigure }: KeyFiguresListProps) {
  const [figures, setFigures] = useState<KeyFigure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<KeyFigureRole | 'all'>('all');

  /**
   * Map Person to KeyFigure for backwards compatibility with Card/Modal components
   */
  function personToKeyFigure(person: Person): KeyFigure {
    return {
      id: person.id,
      canonicalName: person.canonicalName,
      aliases: person.aliases,
      shortBio: person.shortBio,
      fullBio: person.fullBio ?? person.background ?? undefined,
      primaryOrg: person.primaryOrg ?? person.currentOrg?.name ?? undefined,
      previousOrgs: person.previousOrgs ?? [],
      role: person.role as KeyFigureRole,
      // Use contributions field if notableFor is not set
      notableFor: person.notableFor ?? person.contributions ?? person.shortBio,
      imageUrl: person.imageUrl ?? undefined,
      wikipediaUrl: person.wikipediaUrl ?? undefined,
      linkedInUrl: person.linkedInUrl ?? undefined,
      twitterHandle: person.twitterHandle ?? undefined,
      status: person.status as 'draft' | 'pending_review' | 'published',
      sourceArticleId: person.sourceArticleId ?? undefined,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    };
  }

  // Fetch persons (formerly key figures)
  useEffect(() => {
    async function fetchFigures() {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch all published persons
        const response = await personsApi.getAll({
          status: 'published',
          limit: 500, // Get all for client-side filtering
        });
        // Map Person to KeyFigure for backwards compatibility
        const mappedFigures: KeyFigure[] = response.data.map(personToKeyFigure);
        setFigures(mappedFigures);
      } catch (err) {
        console.error('[KeyFiguresList] Failed to fetch figures:', err);
        setError('Failed to load key figures. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchFigures();
  }, []);

  // Filter figures based on search and role
  const filteredFigures = useMemo(() => {
    let result = figures;

    // Filter by role
    if (selectedRole !== 'all') {
      result = result.filter((f) => f.role === selectedRole);
    }

    // Filter by search query (name and aliases)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.canonicalName.toLowerCase().includes(query) ||
          f.aliases.some((alias) => alias.toLowerCase().includes(query)) ||
          f.primaryOrg?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [figures, searchQuery, selectedRole]);

  // Group filtered figures by letter
  const groupedFigures = useMemo(() => groupFiguresByLetter(filteredFigures), [filteredFigures]);

  // Get letters that have figures
  const availableLetters = useMemo(() => new Set(Object.keys(groupedFigures)), [groupedFigures]);

  // Count figures by role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: figures.length };
    figures.forEach((f) => {
      counts[f.role] = (counts[f.role] || 0) + 1;
    });
    return counts;
  }, [figures]);

  // Scroll to letter section
  const scrollToLetter = (letter: string) => {
    const element = document.getElementById(`figures-section-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Search skeleton */}
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        {/* Filter skeleton */}
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          ))}
        </div>
        {/* Cards skeleton */}
        <div className="grid gap-3 mt-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Error Loading Figures
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or organization..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     placeholder-gray-500 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          data-testid="key-figures-search"
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

      {/* Role filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        {ROLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedRole(option.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedRole === option.value
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
            data-testid={`role-filter-${option.value}`}
          >
            {option.label} ({roleCounts[option.value] || 0})
          </button>
        ))}
      </div>

      {/* Alphabetical navigation */}
      <nav
        className="flex flex-wrap gap-1 sticky top-16 z-10 bg-gray-50 dark:bg-gray-900 py-3
                   border-b border-gray-200 dark:border-gray-700"
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
              aria-label={isAvailable ? `Jump to ${letter}` : `No figures starting with ${letter}`}
            >
              {letter}
            </button>
          );
        })}
      </nav>

      {/* Results count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredFigures.length} of {figures.length} key figures
        {searchQuery && ` matching "${searchQuery}"`}
        {selectedRole !== 'all' && ` (${ROLE_LABELS[selectedRole]})`}
      </p>

      {/* Figures list */}
      {filteredFigures.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No key figures found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {ALPHABET.filter((letter) => groupedFigures[letter]).map((letter) => (
            <section
              key={letter}
              id={`figures-section-${letter}`}
              className="scroll-mt-32"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4
                            border-b border-gray-200 dark:border-gray-700 pb-2">
                {letter}
              </h2>
              <div className="grid gap-3">
                {(groupedFigures[letter] ?? []).map((figure) => (
                  <KeyFigureCard
                    key={figure.id}
                    figure={figure}
                    onClick={() => onSelectFigure(figure)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

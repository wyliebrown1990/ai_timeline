import { useState, useEffect } from 'react';
import { Network, Filter, LayoutGrid, List, RefreshCw, BookOpen, CheckCircle } from 'lucide-react';
import { ConceptGraph } from '../components/Learning/ConceptGraph';
import { useConceptProgress } from '../hooks/useConceptProgress';
import { glossaryApi, type GlossaryTerm, type GlossaryCategory } from '../services/api';

/**
 * Difficulty filter options
 */
const DIFFICULTY_OPTIONS = [
  { value: null, label: 'All Levels' },
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Intermediate' },
  { value: 3, label: 'Advanced' },
  { value: 4, label: 'Expert' },
  { value: 5, label: 'Specialist' },
];

/**
 * Category filter options
 */
const CATEGORY_OPTIONS: { value: GlossaryCategory | null; label: string }[] = [
  { value: null, label: 'All Categories' },
  { value: 'core_concept', label: 'Core Concepts' },
  { value: 'technical_term', label: 'Technical Terms' },
  { value: 'model_architecture', label: 'Model Architectures' },
  { value: 'business_term', label: 'Business Terms' },
  { value: 'company_product', label: 'Company Products' },
];

/**
 * View mode for the concepts display
 */
type ViewMode = 'graph' | 'list';

/**
 * ConceptsPage - Interactive concept dependency graph
 * Shows all glossary concepts and their prerequisite relationships
 */
export default function ConceptsPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterDifficulty, setFilterDifficulty] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<GlossaryCategory | null>(null);
  const [showOnlyWithPrerequisites, setShowOnlyWithPrerequisites] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');

  // Progress tracking
  const { seenConceptIds } = useConceptProgress();

  // Fetch all terms
  useEffect(() => {
    async function fetchTerms() {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch all terms (high limit to get everything)
        const response = await glossaryApi.getAll({ limit: 500 });
        setTerms(response.data);
      } catch (err) {
        console.error('[ConceptsPage] Failed to fetch terms:', err);
        setError('Failed to load concepts. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchTerms();
  }, []);

  // Calculate stats
  const totalTerms = terms.length;
  const termsWithPrerequisites = terms.filter((t) => t.prerequisiteIds.length > 0).length;
  const seenTermsCount = terms.filter((t) => seenConceptIds.includes(t.id)).length;

  // Apply filters for list view
  const filteredTerms = terms.filter((t) => {
    if (filterDifficulty !== null && t.difficulty !== filterDifficulty) return false;
    if (filterCategory !== null && t.category !== filterCategory) return false;
    if (showOnlyWithPrerequisites) {
      const hasPrereqs = t.prerequisiteIds.length > 0;
      const isPrereq = terms.some((other) => other.prerequisiteIds.includes(t.id));
      if (!hasPrereqs && !isPrereq) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Network className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Concept Map</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Explore how AI concepts connect to each other. Click any concept to learn more.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <BookOpen className="h-4 w-4" />
            Total Concepts
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalTerms}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <Network className="h-4 w-4" />
            With Prerequisites
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{termsWithPrerequisites}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Concepts Learned
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{seenTermsCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <RefreshCw className="h-4 w-4" />
            Progress
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalTerms > 0 ? Math.round((seenTermsCount / totalTerms) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters:</span>
          </div>

          {/* Difficulty Filter */}
          <select
            value={filterDifficulty ?? ''}
            onChange={(e) => setFilterDifficulty(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {DIFFICULTY_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value ?? ''}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory ?? ''}
            onChange={(e) => setFilterCategory((e.target.value as GlossaryCategory) || null)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value ?? ''}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Show Only Connected */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyWithPrerequisites}
              onChange={(e) => setShowOnlyWithPrerequisites(e.target.checked)}
              className="w-4 h-4 text-blue-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show only connected</span>
          </label>

          {/* View Mode Toggle */}
          <div className="ml-auto flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'graph'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : viewMode === 'graph' ? (
        <ConceptGraph
          terms={terms}
          height={600}
          filterDifficulty={filterDifficulty}
          filterCategory={filterCategory}
          showOnlyWithPrerequisites={showOnlyWithPrerequisites}
        />
      ) : (
        <ConceptList terms={filteredTerms} seenConceptIds={seenConceptIds} />
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">How to use this graph</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>
            <strong>Drag nodes</strong> to rearrange the graph
          </li>
          <li>
            <strong>Scroll to zoom</strong> in and out
          </li>
          <li>
            <strong>Click a node</strong> to view the full concept explanation
          </li>
          <li>
            <strong>Arrows</strong> point from prerequisites to concepts that require them
          </li>
          <li>
            <strong>Checkmarks</strong> indicate concepts you've already learned
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * List view for concepts
 */
function ConceptList({
  terms,
  seenConceptIds,
}: {
  terms: GlossaryTerm[];
  seenConceptIds: string[];
}) {
  const DIFFICULTY_COLORS: Record<number, string> = {
    1: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    2: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
    3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    4: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    5: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  const DIFFICULTY_LABELS: Record<number, string> = {
    1: 'Beginner',
    2: 'Intermediate',
    3: 'Advanced',
    4: 'Expert',
    5: 'Specialist',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Concept
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Difficulty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Prerequisites
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {terms.map((term) => {
              const isSeen = seenConceptIds.includes(term.id);
              return (
                <tr
                  key={term.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => (window.location.href = `/glossary?term=${term.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">{term.term}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                      {term.shortDefinition}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${DIFFICULTY_COLORS[term.difficulty] || DIFFICULTY_COLORS[1]}`}
                    >
                      {DIFFICULTY_LABELS[term.difficulty] || 'Beginner'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {term.prerequisiteIds.length > 0 ? (
                      <span>{term.prerequisiteIds.length} required</span>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isSeen ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        Learned
                      </span>
                    ) : (
                      <span className="text-gray-400">Not seen</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {terms.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No concepts match your filters
        </div>
      )}
    </div>
  );
}

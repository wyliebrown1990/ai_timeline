/**
 * CompareHubPage Component
 * Sprint SEO-4 Task 6 - Hub Pages
 *
 * Index page listing all available comparison pages.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import {
  Scale,
  User,
  Building2,
  BookOpen,
  ChevronRight,
  Search,
} from 'lucide-react';
import { comparisonApi } from '../services/api';

interface ComparisonType {
  type: string;
  label: string;
  description: string;
  sampleComparisons: Array<{
    nameA: string;
    nameB: string;
    url: string;
  }>;
}

/**
 * Loading skeleton
 */
function HubSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-6 w-full max-w-xl bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * Get icon for comparison type
 */
function getTypeIcon(type: string) {
  switch (type) {
    case 'person':
      return User;
    case 'organization':
      return Building2;
    case 'term':
      return BookOpen;
    default:
      return Scale;
  }
}

/**
 * Comparison type card
 */
function TypeCard({ typeData }: { typeData: ComparisonType }) {
  const Icon = getTypeIcon(typeData.type);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {typeData.label}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {typeData.description}
        </p>
      </div>

      {typeData.sampleComparisons.length > 0 ? (
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Popular Comparisons
          </h3>
          <div className="space-y-2">
            {typeData.sampleComparisons.slice(0, 5).map((comparison, index) => (
              <Link
                key={index}
                to={comparison.url}
                className="flex items-center justify-between p-3 -mx-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-gray-900 dark:text-white">
                  {comparison.nameA} vs {comparison.nameB}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          No comparisons available yet
        </div>
      )}
    </div>
  );
}

/**
 * CompareHubPage - Main component
 */
export default function CompareHubPage() {
  const [types, setTypes] = useState<ComparisonType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const data = await comparisonApi.getOverview();
        setTypes(data.types || []);
      } catch (err) {
        console.error('[CompareHubPage] Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Get all comparisons for search
  const allComparisons = types.flatMap((t) =>
    t.sampleComparisons.map((c) => ({
      ...c,
      type: t.type,
      typeLabel: t.label,
    }))
  );

  // Filter comparisons by search
  const filteredComparisons = searchQuery
    ? allComparisons.filter(
        (c) =>
          c.nameA.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.nameB.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const title = 'AI Comparisons - Compare AI Technologies, People & Organizations';
  const description =
    'Compare AI technologies, researchers, companies, and concepts side-by-side. Explore differences between GPT vs Claude, OpenAI vs Anthropic, and more.';

  return (
    <>
      <SEO title={title} description={description} canonical="https://letaiexplainai.com/compare" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
              <Scale className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI Comparisons
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Compare AI technologies, researchers, companies, and concepts side-by-side.
            Understand the differences that matter.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search comparisons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>

          {/* Search results */}
          {searchQuery && filteredComparisons.length > 0 && (
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {filteredComparisons.slice(0, 10).map((comparison, index) => (
                  <Link
                    key={index}
                    to={comparison.url}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {comparison.nameA} vs {comparison.nameB}
                      </span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        ({comparison.typeLabel})
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {searchQuery && filteredComparisons.length === 0 && (
            <div className="mt-4 text-center text-gray-500 dark:text-gray-400">
              No comparisons found for "{searchQuery}"
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <HubSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {types.map((typeData) => (
              <TypeCard key={typeData.type} typeData={typeData} />
            ))}
          </div>
        )}

        {/* Stats */}
        {!isLoading && (
          <div className="mt-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {allComparisons.length} comparisons available across {types.length} categories
            </p>
          </div>
        )}
      </div>
    </>
  );
}

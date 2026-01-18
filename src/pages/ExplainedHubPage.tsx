/**
 * ExplainedHubPage Component
 * Sprint SEO-4 Task 6 - Hub Pages
 *
 * Index page listing all available "X Explained" pages.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import {
  BookOpen,
  Search,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { explainedApi, type ExplainedListItem } from '../services/api';

/**
 * Loading skeleton
 */
function HubSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-6 w-full max-w-xl bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * Term card component
 */
function TermCard({ item }: { item: ExplainedListItem }) {
  return (
    <Link
      to={item.url}
      className="block p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {item.term} Explained
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Updated {item.lastmod}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
      </div>
    </Link>
  );
}

/**
 * ExplainedHubPage - Main component
 */
export default function ExplainedHubPage() {
  const [pages, setPages] = useState<ExplainedListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'alpha' | 'recent'>('alpha');

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const data = await explainedApi.getList(500);
        setPages(data.pages || []);
      } catch (err) {
        console.error('[ExplainedHubPage] Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter and sort pages
  const filteredPages = pages
    .filter((page) =>
      page.term.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'alpha') {
        return a.term.localeCompare(b.term);
      }
      return new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime();
    });

  // Group by first letter for alphabetical view
  const groupedPages = sortBy === 'alpha'
    ? filteredPages.reduce((acc, page) => {
        const letter = (page.term?.[0] || '#').toUpperCase();
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(page);
        return acc;
      }, {} as Record<string, ExplainedListItem[]>)
    : null;

  const title = 'AI Concepts Explained - Deep-Dive Explanations';
  const description =
    'Comprehensive explanations of AI concepts, technologies, and terminology. Learn about transformers, neural networks, machine learning, and more.';

  return (
    <>
      <SEO title={title} description={description} canonical="https://letaiexplainai.com/explained" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
              <BookOpen className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI Concepts Explained
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Deep-dive explanations of AI technologies, concepts, and terminology.
            Each page covers what it is, how it works, and why it matters.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'alpha' | 'recent')}
              className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="alpha">A-Z</option>
              <option value="recent">Recently Updated</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <HubSkeleton />
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery
              ? `No concepts found for "${searchQuery}"`
              : 'No explained pages available'}
          </div>
        ) : sortBy === 'alpha' && groupedPages ? (
          <div className="space-y-8">
            {Object.entries(groupedPages).map(([letter, items]) => (
              <div key={letter}>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2">
                  {letter}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <TermCard key={item.slug} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPages.map((item) => (
              <TermCard key={item.slug} item={item} />
            ))}
          </div>
        )}

        {/* Stats */}
        {!isLoading && (
          <div className="mt-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {pages.length} concepts explained
            </p>
          </div>
        )}
      </div>
    </>
  );
}

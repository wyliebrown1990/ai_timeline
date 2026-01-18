/**
 * WhoInventedHubPage Component
 * Sprint SEO-4 Task 6 - Hub Pages
 *
 * Index page listing all available "Who Invented X?" pages.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import {
  Award,
  Search,
  ChevronRight,
  Filter,
  Users,
} from 'lucide-react';
import { whoInventedApi, type WhoInventedListItem } from '../services/api';

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
          <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * Term card component
 */
function TermCard({ item }: { item: WhoInventedListItem }) {
  return (
    <Link
      to={item.url}
      className="block p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            Who Invented{' '}
            <span className="text-amber-600 dark:text-amber-400">{item.term}</span>?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {item.shortDefinition}
          </p>
          {item.hasInventors && (
            <div className="flex items-center gap-1 mt-2 text-sm text-amber-600 dark:text-amber-400">
              <Users className="h-4 w-4" />
              <span>{item.inventorCount} contributor{item.inventorCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

/**
 * WhoInventedHubPage - Main component
 */
export default function WhoInventedHubPage() {
  const [pages, setPages] = useState<WhoInventedListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'with-inventors'>('all');
  const [sortBy, setSortBy] = useState<'alpha' | 'contributors'>('alpha');

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const data = await whoInventedApi.getList(500);
        setPages(data.pages || []);
      } catch (err) {
        console.error('[WhoInventedHubPage] Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter and sort pages
  const filteredPages = pages
    .filter((page) => {
      const matchesSearch = page.term.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterBy === 'all' || (filterBy === 'with-inventors' && page.hasInventors);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'alpha') {
        return a.term.localeCompare(b.term);
      }
      return b.inventorCount - a.inventorCount;
    });

  // Group by first letter for alphabetical view
  const groupedPages = sortBy === 'alpha'
    ? filteredPages.reduce((acc, page) => {
        const letter = (page.term?.[0] || '#').toUpperCase();
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(page);
        return acc;
      }, {} as Record<string, WhoInventedListItem[]>)
    : null;

  // Stats
  const pagesWithInventors = pages.filter((p) => p.hasInventors).length;

  const title = 'Who Invented AI Concepts? - Origins & Inventors';
  const description =
    'Discover who invented key AI technologies and concepts. Learn about the researchers, engineers, and visionaries behind transformers, neural networks, and more.';

  return (
    <>
      <SEO title={title} description={description} canonical="https://letaiexplainai.com/who-invented" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
              <Award className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Who Invented It?
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover the inventors, pioneers, and key contributors behind
            AI technologies and concepts. Learn the stories behind the innovations.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as 'all' | 'with-inventors')}
              className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
            >
              <option value="all">All Concepts</option>
              <option value="with-inventors">With Known Inventors</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'alpha' | 'contributors')}
              className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
            >
              <option value="alpha">A-Z</option>
              <option value="contributors">Most Contributors</option>
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
              : 'No invention pages available'}
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
          <div className="mt-12 text-center space-y-2">
            <p className="text-gray-500 dark:text-gray-400">
              {pages.length} concepts documented
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {pagesWithInventors} with known inventors/contributors
            </p>
          </div>
        )}
      </div>
    </>
  );
}

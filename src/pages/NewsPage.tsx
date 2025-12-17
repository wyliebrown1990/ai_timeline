/**
 * NewsPage Component
 *
 * Dedicated page for browsing all AI news with historical context.
 * Features:
 * - Search functionality
 * - Filter by featured status
 * - Sort by date (newest first)
 * - Category/topic filtering
 * - Grid layout with responsive design
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Newspaper,
  Search,
  Filter,
  Star,
  Clock,
  ArrowLeft,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { useCurrentEvents } from '../hooks/useContent';
import { CurrentEventCard } from '../components/CurrentEvents/CurrentEventCard';
import { NewsContextModal } from '../components/CurrentEvents/NewsContextModal';
import type { CurrentEvent } from '../types/currentEvent';

/**
 * Filter options for news display
 */
type FilterType = 'all' | 'featured' | 'recent';
type SortType = 'newest' | 'oldest';

/**
 * Get unique publishers from events for filtering
 */
function getUniquePublishers(events: CurrentEvent[]): string[] {
  const publishers = events
    .map((e) => e.sourcePublisher)
    .filter((p): p is string => Boolean(p));
  return [...new Set(publishers)].sort();
}

export function NewsPage() {
  // State for filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('newest');
  const [selectedPublisher, setSelectedPublisher] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // State for context modal
  const [selectedEvent, setSelectedEvent] = useState<CurrentEvent | null>(null);

  // Fetch all events
  const { data: allEvents, isLoading } = useCurrentEvents();

  // Get unique publishers for filter dropdown
  const publishers = useMemo(() => getUniquePublishers(allEvents), [allEvents]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let events = [...allEvents];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      events = events.filter(
        (e) =>
          e.headline.toLowerCase().includes(query) ||
          e.summary.toLowerCase().includes(query) ||
          e.sourcePublisher?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType === 'featured') {
      events = events.filter((e) => e.featured);
    } else if (filterType === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      events = events.filter((e) => new Date(e.publishedDate) >= thirtyDaysAgo);
    }

    // Apply publisher filter
    if (selectedPublisher) {
      events = events.filter((e) => e.sourcePublisher === selectedPublisher);
    }

    // Apply sort
    events.sort((a, b) => {
      const dateA = new Date(a.publishedDate).getTime();
      const dateB = new Date(b.publishedDate).getTime();
      return sortType === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return events;
  }, [allEvents, searchQuery, filterType, sortType, selectedPublisher]);

  // Count active filters
  const activeFilterCount = [
    filterType !== 'all',
    selectedPublisher !== null,
  ].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setSelectedPublisher(null);
    setSortType('newest');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white">
        <div className="container-main py-12 sm:py-16">
          {/* Breadcrumb */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-orange-100 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Newspaper className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">AI News Hub</h1>
              <p className="text-orange-100 mt-1">
                Understand today's AI headlines through historical context
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-8 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news stories..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-16 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container-main py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left side: Filter chips */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All Stories
              </button>
              <button
                onClick={() => setFilterType('featured')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterType === 'featured'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                Featured
              </button>
              <button
                onClick={() => setFilterType('recent')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterType === 'recent'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Last 30 Days
              </button>

              {/* More filters toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                More Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-orange-600 text-white text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Right side: Sort and results count */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'story' : 'stories'}
              </span>
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as SortType)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Extended filters panel */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-4">
              {/* Publisher filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedPublisher || ''}
                  onChange={(e) => setSelectedPublisher(e.target.value || null)}
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Sources</option>
                  {publishers.map((pub) => (
                    <option key={pub} value={pub}>
                      {pub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters button */}
              {(activeFilterCount > 0 || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="container-main py-8">
        {isLoading ? (
          // Loading skeleton
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Newspaper className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No stories found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your search or filters
            </p>
            <button
              onClick={clearFilters}
              className="text-orange-600 dark:text-orange-400 font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          // Events grid
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <CurrentEventCard
                key={event.id}
                event={event}
                onViewContext={setSelectedEvent}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context modal */}
      {selectedEvent && (
        <NewsContextModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

export default NewsPage;

/**
 * EventsHubPage Component
 * Sprint SEO-4 Task 6 - Hub Pages
 *
 * Index page listing all available event/milestone pages.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import {
  Calendar,
  Search,
  ChevronRight,
  Filter,
  Star,
} from 'lucide-react';
import { eventsApi, type EventListItem } from '../services/api';

/**
 * Loading skeleton
 */
function HubSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-6 w-full max-w-xl bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * Category badge
 */
function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    MODEL_RELEASE: 'Model',
    PRODUCT_LAUNCH: 'Product',
    RESEARCH_BREAKTHROUGH: 'Research',
    POLICY_REGULATION: 'Policy',
    COMPANY_NEWS: 'Company',
    INDUSTRY_TREND: 'Trend',
    FUNDING: 'Funding',
    ACQUISITION: 'M&A',
    breakthrough: 'Breakthrough',
  };

  return (
    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-medium">
      {labels[category] || category.replace(/_/g, ' ')}
    </span>
  );
}

/**
 * Significance indicator
 */
function SignificanceStars({ significance }: { significance: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i <= significance
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Event card component
 */
function EventCard({ item }: { item: EventListItem }) {
  return (
    <Link
      to={item.url}
      className="block p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <CategoryBadge category={item.category} />
            <SignificanceStars significance={item.significance} />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
            {item.title}
          </h3>
          {item.tldr && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {item.tldr}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span>{item.date}</span>
            {item.organization && <span>{item.organization}</span>}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

/**
 * EventsHubPage - Main component
 */
export default function EventsHubPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'significance'>('recent');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const data = await eventsApi.getList(500);
        setEvents(data.events || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error('[EventsHubPage] Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Get unique categories
  const categories = ['all', ...new Set(events.map((e) => e.category))];

  // Filter and sort events
  const filteredEvents = events
    .filter((event) => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return b.significance - a.significance;
    });

  // Group by year for recent view
  const groupedByYear = sortBy === 'recent'
    ? filteredEvents.reduce((acc, event) => {
        const year = event.date?.split('-')[0] || 'Unknown';
        if (!acc[year]) acc[year] = [];
        acc[year].push(event);
        return acc;
      }, {} as Record<string, EventListItem[]>)
    : null;

  const title = 'AI Timeline Events - Major Milestones in AI History';
  const description =
    'Explore major events and milestones in AI history. From breakthrough research to product launches, discover the moments that shaped artificial intelligence.';

  return (
    <>
      <SEO title={title} description={description} canonical="https://letaiexplainai.com/events" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
              <Calendar className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI Timeline Events
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Explore the major milestones and events that shaped artificial intelligence.
            Each event includes context, impact, and key people involved.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'significance')}
              className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="recent">Most Recent</option>
              <option value="significance">Most Significant</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <HubSkeleton />
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery
              ? `No events found for "${searchQuery}"`
              : 'No events available'}
          </div>
        ) : sortBy === 'recent' && groupedByYear ? (
          <div className="space-y-8">
            {Object.entries(groupedByYear)
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .map(([year, items]) => (
                <div key={year}>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2">
                    {year}
                  </h2>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <EventCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((item) => (
              <EventCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Stats */}
        {!isLoading && (
          <div className="mt-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Showing {filteredEvents.length} of {total} events
            </p>
          </div>
        )}

        {/* Link to Timeline */}
        <div className="mt-8 text-center">
          <Link
            to="/timeline"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            <Calendar className="h-5 w-5" />
            View Interactive Timeline
          </Link>
        </div>
      </div>
    </>
  );
}

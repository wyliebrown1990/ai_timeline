/**
 * InTheNewsSection Component
 *
 * Homepage section showcasing current AI news with historical context.
 * Features a horizontal scrollable carousel on mobile and grid on desktop,
 * with a prominent "View All" link to the dedicated news page.
 */

import { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { useCurrentEvents } from '../../hooks/useLearningPathsApi';
import { CurrentEventCard } from './CurrentEventCard';
import { NewsContextModal } from './NewsContextModal';
import type { CurrentEvent } from '../../types/currentEvent';

/**
 * Props for InTheNewsSection component
 */
interface InTheNewsSectionProps {
  /** Maximum number of events to display (default: 3) */
  maxEvents?: number;
  /** Optional CSS class name */
  className?: string;
}

/**
 * InTheNewsSection Component
 *
 * Displays a curated selection of current AI news items on the homepage.
 * Users can click on events to see the historical context modal.
 */
export function InTheNewsSection({
  maxEvents = 3,
  className = '',
}: InTheNewsSectionProps) {
  // Track selected event for context modal
  const [selectedEvent, setSelectedEvent] = useState<CurrentEvent | null>(null);

  // Ref for horizontal scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch current events data from API (active events only by default)
  const { data: allEvents, isLoading } = useCurrentEvents();

  // Combine featured (first) and non-featured events, removing duplicates
  // Sort by date (newest first) after combining
  const combinedEvents = useMemo(() => {
    if (!allEvents) return [];
    const featuredEvents = allEvents.filter((e) => e.featured);
    const featuredIds = new Set(featuredEvents.map((e) => e.id));
    const nonFeaturedEvents = allEvents.filter((e) => !featuredIds.has(e.id));
    return [...featuredEvents, ...nonFeaturedEvents].sort(
      (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    );
  }, [allEvents]);

  // Show limited events on homepage
  const eventsToShow = combinedEvents.slice(0, maxEvents);
  const totalCount = combinedEvents.length;

  // Handle scroll buttons
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Card width + gap
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Handle opening the context modal
  const handleViewContext = (event: CurrentEvent) => {
    setSelectedEvent(event);
  };

  // Handle closing the context modal
  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  // Show loading state or return null if no events
  if (isLoading) {
    return (
      <section className={`py-12 sm:py-16 dark:bg-gray-900 ${className}`}>
        <div className="container-main">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                In The News
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Loading latest stories...
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg h-48 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Don't render if no events available
  if (combinedEvents.length === 0) {
    return null;
  }

  return (
    <section className={`py-12 sm:py-16 dark:bg-gray-900 ${className}`}>
      <div className="container-main">
        {/* Section header with "View All" link */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                In The News
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Understand today's AI headlines through history
              </p>
            </div>
          </div>

          {/* View All link */}
          <Link
            to="/news"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
          >
            View all {totalCount} stories
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventsToShow.map((event) => (
            <CurrentEventCard
              key={event.id}
              event={event}
              onViewContext={handleViewContext}
            />
          ))}
        </div>

        {/* Mobile: Horizontal scroll carousel */}
        <div className="sm:hidden relative">
          {/* Scroll buttons */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-4 px-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {eventsToShow.map((event) => (
              <div
                key={event.id}
                className="flex-shrink-0 w-[300px] snap-start"
              >
                <CurrentEventCard
                  event={event}
                  onViewContext={handleViewContext}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: View All link */}
        <div className="sm:hidden mt-4 text-center">
          <Link
            to="/news"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
          >
            View all {totalCount} stories
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Context modal */}
      {selectedEvent && (
        <NewsContextModal
          event={selectedEvent}
          onClose={handleCloseModal}
        />
      )}
    </section>
  );
}

export default InTheNewsSection;

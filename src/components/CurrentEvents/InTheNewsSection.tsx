import { useState } from 'react';
import { Newspaper, ChevronRight, ChevronDown } from 'lucide-react';
import { useFeaturedCurrentEvents, useCurrentEvents } from '../../hooks/useContent';
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
 * Displays a section of current AI news items on the homepage.
 * Users can click on events to see the historical context modal.
 *
 * Features:
 * - Shows featured events first, then recent events
 * - Expandable to show more events
 * - Links to context paths for understanding current news
 */
export function InTheNewsSection({
  maxEvents = 3,
  className = '',
}: InTheNewsSectionProps) {
  // Track selected event for context modal
  const [selectedEvent, setSelectedEvent] = useState<CurrentEvent | null>(null);
  // Track whether expanded to show all events
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch current events data
  const { data: featuredEvents } = useFeaturedCurrentEvents();
  const { data: allEvents } = useCurrentEvents();

  // Combine featured (first) and non-featured events, removing duplicates
  const featuredIds = new Set(featuredEvents.map((e) => e.id));
  const nonFeaturedEvents = allEvents.filter((e) => !featuredIds.has(e.id));
  const combinedEvents = [...featuredEvents, ...nonFeaturedEvents];

  // Determine how many events to show
  const displayCount = isExpanded ? combinedEvents.length : maxEvents;
  const eventsToShow = combinedEvents.slice(0, displayCount);
  const hasMoreEvents = combinedEvents.length > maxEvents;

  // Handle opening the context modal
  const handleViewContext = (event: CurrentEvent) => {
    setSelectedEvent(event);
  };

  // Handle closing the context modal
  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  // Don't render if no events available
  if (combinedEvents.length === 0) {
    return null;
  }

  return (
    <section className={`py-12 sm:py-16 dark:bg-gray-900 ${className}`}>
      <div className="container-main">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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

        {/* Events grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventsToShow.map((event) => (
            <CurrentEventCard
              key={event.id}
              event={event}
              onViewContext={handleViewContext}
            />
          ))}
        </div>

        {/* Show more/less toggle */}
        {hasMoreEvents && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {isExpanded ? (
                <>
                  Show less
                  <ChevronDown className="w-4 h-4 rotate-180" />
                </>
              ) : (
                <>
                  See all {combinedEvents.length} stories
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
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

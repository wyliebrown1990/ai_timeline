import { ChevronRight, ExternalLink, Calendar, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CurrentEvent } from '../../types/currentEvent';
import { useSubjectsForContent } from '../../hooks';
import { SubjectBadgeGroup } from '../ui/SubjectBadge';

/**
 * Props for CurrentEventCard component
 */
interface CurrentEventCardProps {
  /** The current event to display */
  event: CurrentEvent;
  /** Callback when the card is clicked to view context */
  onViewContext: (event: CurrentEvent) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * CurrentEventCard Component
 *
 * Displays a single current event as a clickable card with:
 * - Headline and summary
 * - Source and publish date
 * - Count of prerequisite milestones
 * - CTA to view historical context
 */
export function CurrentEventCard({
  event,
  onViewContext,
  className = '',
}: CurrentEventCardProps) {
  const navigate = useNavigate();

  // Format the published date for display
  const formattedDate = new Date(event.publishedDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Fetch subjects for this event (Sprint Subj-5)
  const { subjects } = useSubjectsForContent('current_event', event.id);

  // Handle subject badge click
  const handleSubjectClick = (subject: { slug: string }) => {
    navigate(`/subjects/${subject.slug}`);
  };

  return (
    <article
      className={`
        group relative p-5 rounded-xl border
        bg-white dark:bg-gray-800
        border-gray-200 dark:border-gray-700
        hover:border-orange-300 dark:hover:border-orange-600
        hover:shadow-lg
        transition-all duration-200
        cursor-pointer
        ${className}
      `}
      onClick={() => onViewContext(event)}
      data-testid={`current-event-card-${event.id}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onViewContext(event);
        }
      }}
    >
      {/* Badges - positioned inside card, top-right with space for headline */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {event.videoId && (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
            <Play className="w-3 h-3" fill="currentColor" />
            Video
          </span>
        )}
        {event.featured && (
          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
            Featured
          </span>
        )}
      </div>

      {/* Headline - extra right padding to avoid overlap with Featured badge */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-snug group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors pr-20">
        {event.headline}
      </h3>

      {/* Source and date row */}
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
        {event.sourcePublisher && (
          <span className="flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            {event.sourcePublisher}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formattedDate}
        </span>
      </div>

      {/* Summary */}
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
        {event.summary}
      </p>

      {/* Subject badges (Sprint Subj-5) */}
      {subjects.length > 0 && (
        <div
          className="mt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <SubjectBadgeGroup
            subjects={subjects}
            maxVisible={2}
            size="sm"
            onBadgeClick={handleSubjectClick}
          />
        </div>
      )}

      {/* Context CTA */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {event.prerequisiteMilestoneIds.length} milestones to understand this
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400 group-hover:translate-x-1 transition-transform">
          Get context
          <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </article>
  );
}

export default CurrentEventCard;

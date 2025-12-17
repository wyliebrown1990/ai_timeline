import { Building2, Calendar, ExternalLink, Users } from 'lucide-react';
import type { MilestoneResponse } from '../../types/milestone';
import { SignificanceLevel } from '../../types/milestone';
import {
  categoryBgClasses,
  formatTimelineDate,
  significanceScale,
} from '../../utils/timelineUtils';
import { CategoryBadge } from './CategoryBadge';
import { SignificanceIndicator } from './SignificanceBadge';

interface MilestoneCardProps {
  /** The milestone data to display */
  milestone: MilestoneResponse;
  /** Whether the card is in expanded state */
  isExpanded?: boolean;
  /** Callback when card is selected */
  onSelect?: (id: string) => void;
  /** Display variant */
  variant?: 'default' | 'compact' | 'featured';
  /** Additional CSS classes */
  className?: string;
}

/**
 * A card component displaying an AI milestone with category colors,
 * significance indicators, and interactive hover effects
 */
export function MilestoneCard({
  milestone,
  isExpanded = false,
  onSelect,
  variant = 'default',
  className = '',
}: MilestoneCardProps) {
  const date = new Date(milestone.date);
  const scale = significanceScale[milestone.significance as SignificanceLevel] || 1;
  const categoryColor = categoryBgClasses[milestone.category] || 'bg-gray-500';

  // Scale-based styling for significance
  const isGroundbreaking = milestone.significance === SignificanceLevel.GROUNDBREAKING;
  const isMajor = milestone.significance >= SignificanceLevel.MAJOR;

  const handleClick = () => {
    if (onSelect) {
      onSelect(milestone.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Compact variant for dense timelines
  if (variant === 'compact') {
    return (
      <article
        data-testid="milestone-card"
        data-testid-full={`milestone-card-${milestone.id}`}
        data-category={milestone.category}
        data-significance={milestone.significance}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={onSelect ? 0 : undefined}
        role={onSelect ? 'button' : undefined}
        className={`
          group relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3
          shadow-sm transition-all duration-200
          hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          ${onSelect ? 'cursor-pointer' : ''}
          ${className}
        `.trim()}
      >
        {/* Category color indicator */}
        <div className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${categoryColor}`} />

        <div className="pl-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {formatTimelineDate(date, 'year')}
            </span>
            <SignificanceIndicator significance={milestone.significance as SignificanceLevel} />
          </div>
          <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
            {milestone.title}
          </h3>
        </div>
      </article>
    );
  }

  // Featured variant for groundbreaking milestones
  if (variant === 'featured' || isGroundbreaking) {
    return (
      <article
        data-testid="milestone-card"
        data-category={milestone.category}
        data-significance={milestone.significance}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={onSelect ? 0 : undefined}
        role={onSelect ? 'button' : undefined}
        className={`
          group relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white
          shadow-lg transition-all duration-300
          hover:border-gray-300 hover:shadow-xl hover:-translate-y-1
          ${onSelect ? 'cursor-pointer' : ''}
          ${isGroundbreaking ? 'ring-2 ring-amber-400/50' : ''}
          ${className}
        `.trim()}
        style={{
          transform: isExpanded ? 'scale(1.02)' : `scale(${scale})`,
        }}
      >
        {/* Gradient header bar */}
        <div className={`h-2 ${categoryColor}`} />

        <div className="p-5">
          {/* Header with date and badges */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <time dateTime={milestone.date}>{formatTimelineDate(date, 'full')}</time>
            </div>
            <CategoryBadge category={milestone.category} size="sm" />
            <SignificanceIndicator
              significance={milestone.significance as SignificanceLevel}
              size="md"
            />
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
            {milestone.title}
          </h3>

          {/* Description */}
          <p className={`mt-2 text-gray-600 ${isExpanded ? '' : 'line-clamp-3'}`}>
            {milestone.description}
          </p>

          {/* Metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {milestone.organization && (
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{milestone.organization}</span>
              </div>
            )}
            {milestone.contributors.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>
                  {milestone.contributors.slice(0, 2).join(', ')}
                  {milestone.contributors.length > 2 &&
                    ` +${milestone.contributors.length - 2}`}
                </span>
              </div>
            )}
            {milestone.sourceUrl && (
              <a
                href={milestone.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Source</span>
              </a>
            )}
          </div>

          {/* Tags */}
          {milestone.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {milestone.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
              {milestone.tags.length > 5 && (
                <span className="text-xs text-gray-400">+{milestone.tags.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }

  // Default variant
  return (
    <article
      data-testid="milestone-card"
      data-category={milestone.category}
      data-significance={milestone.significance}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onSelect ? 0 : undefined}
      role={onSelect ? 'button' : undefined}
      className={`
        group relative overflow-hidden rounded-lg border border-gray-200 bg-white
        shadow-sm transition-all duration-200
        hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5
        ${onSelect ? 'cursor-pointer' : ''}
        ${isMajor ? 'border-l-4' : ''}
        ${className}
      `.trim()}
      style={{
        borderLeftColor: isMajor ? undefined : 'transparent',
      }}
    >
      {/* Category color indicator */}
      <div
        className={`absolute left-0 top-0 h-full w-1 ${categoryColor} ${isMajor ? 'hidden' : ''}`}
      />

      {/* Major milestone gets thicker border */}
      {isMajor && <div className={`absolute left-0 top-0 h-full w-1 ${categoryColor}`} />}

      <div className="p-4 pl-3">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <time
              dateTime={milestone.date}
              className="text-sm font-medium text-gray-500"
            >
              {formatTimelineDate(date, 'year')}
            </time>
            <CategoryBadge category={milestone.category} size="sm" showLabel={false} />
          </div>
          <SignificanceIndicator
            significance={milestone.significance as SignificanceLevel}
            size="sm"
          />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {milestone.title}
        </h3>

        {/* Description */}
        <p className="mt-1.5 text-sm text-gray-600 line-clamp-2">{milestone.description}</p>

        {/* Contributors (if available) */}
        {milestone.contributors.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            <span className="font-medium">Key people:</span>{' '}
            {milestone.contributors.slice(0, 3).join(', ')}
            {milestone.contributors.length > 3 && '...'}
          </p>
        )}

        {/* Tags */}
        {milestone.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {milestone.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
              >
                {tag}
              </span>
            ))}
            {milestone.tags.length > 3 && (
              <span className="text-xs text-gray-400">+{milestone.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default MilestoneCard;

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MilestoneResponse } from '../../types/milestone';
import { MilestoneCategory, SignificanceLevel } from '../../types/milestone';
import {
  categoryBgClasses,
  categoryTextClasses,
  formatTimelineDate,
} from '../../utils/timelineUtils';
import { CategoryIcon } from './CategoryBadge';

interface MilestonePillProps {
  /** The milestone data */
  milestone: MilestoneResponse;
  /** Callback when pill is clicked */
  onClick?: () => void;
  /** Whether this pill is currently selected */
  isSelected?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show expanded preview on hover */
  showPreview?: boolean;
}

interface HoverCardPosition {
  top: number;
  left: number;
  showBelow: boolean;
}

/**
 * A compact pill representation of a milestone.
 * Shows category icon and truncated title.
 * Expands to show more detail on hover.
 */
export function MilestonePill({
  milestone,
  onClick,
  isSelected = false,
  className = '',
  showPreview = true,
}: MilestonePillProps) {
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hoverCardPosition, setHoverCardPosition] = useState<HoverCardPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const categoryColor = categoryBgClasses[milestone.category] || 'bg-gray-500';
  const textColor = categoryTextClasses[milestone.category] || 'text-gray-500';
  const date = new Date(milestone.date);
  const isGroundbreaking = milestone.significance === SignificanceLevel.GROUNDBREAKING;
  const isMajor = milestone.significance >= SignificanceLevel.MAJOR;

  const handleClick = () => {
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const calculatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const showBelow = rect.top < 220;
      const cardHeight = 180; // Approximate hover card height

      setHoverCardPosition({
        left: rect.left,
        top: showBelow ? rect.bottom + 8 : rect.top - cardHeight - 8,
        showBelow,
      });
    }
    setShowHoverCard(true);
  };

  const handleMouseEnter = () => {
    calculatePosition();
  };

  const handleFocus = () => {
    calculatePosition();
  };

  const hoverCard = showPreview && showHoverCard && hoverCardPosition && createPortal(
    <div
      className="pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        position: 'fixed',
        top: hoverCardPosition.top,
        left: hoverCardPosition.left,
        zIndex: 99999,
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 w-64">
        {/* Category bar */}
        {!hoverCardPosition.showBelow && (
          <div className={`h-1 -mx-3 -mt-3 mb-3 rounded-t-lg ${categoryColor}`} />
        )}

        {/* Date */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {formatTimelineDate(date, 'full')}
        </p>

        {/* Title */}
        <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
          {milestone.title}
        </h4>

        {/* Description preview */}
        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
          {milestone.description}
        </p>

        {/* Click hint */}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
          Click to view details
        </p>

        {/* Category bar at bottom when showing below */}
        {hoverCardPosition.showBelow && (
          <div className={`h-1 -mx-3 -mb-3 mt-3 rounded-b-lg ${categoryColor}`} />
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        data-testid={`milestone-pill-${milestone.id}`}
        data-category={milestone.category}
        data-significance={milestone.significance}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowHoverCard(false)}
        onFocus={handleFocus}
        onBlur={() => setShowHoverCard(false)}
        className={`
          group relative flex items-center gap-1.5
          rounded-full border bg-white
          px-2.5 py-1.5
          text-left
          transition-all duration-200
          hover:shadow-md hover:-translate-y-0.5
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}
          ${isGroundbreaking ? 'ring-2 ring-amber-400/50' : ''}
          ${className}
        `.trim()}
        aria-label={`${milestone.title} - ${formatTimelineDate(date, 'full')}`}
      >
        {/* Category color indicator */}
        <div className={`h-full w-1 rounded-l-full absolute left-0 top-0 bottom-0 ${categoryColor}`} />

        {/* Category icon */}
        <span className={`ml-1 ${textColor}`}>
          <CategoryIcon category={milestone.category as MilestoneCategory} className="h-3.5 w-3.5" />
        </span>

        {/* Title */}
        <span className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
          {milestone.title}
        </span>

        {/* Year badge for major milestones */}
        {isMajor && (
          <span className="text-[10px] text-gray-400 font-medium">
            {date.getFullYear()}
          </span>
        )}
      </button>

      {/* Hover card rendered via portal to escape stacking contexts */}
      {hoverCard}
    </div>
  );
}

export default MilestonePill;

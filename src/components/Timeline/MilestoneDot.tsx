import { useState } from 'react';
import type { MilestoneResponse } from '../../types/milestone';
import { SignificanceLevel } from '../../types/milestone';
import { categoryBgClasses, formatTimelineDate } from '../../utils/timelineUtils';

interface MilestoneDotProps {
  /** The milestone data */
  milestone: MilestoneResponse;
  /** Callback when dot is clicked */
  onClick?: () => void;
  /** Whether this dot is currently selected */
  isSelected?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * A compact dot representation of a milestone for dense timeline areas.
 * Shows tooltip on hover with title and date.
 */
export function MilestoneDot({
  milestone,
  onClick,
  isSelected = false,
  className = '',
  size = 'md',
}: MilestoneDotProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const categoryColor = categoryBgClasses[milestone.category] || 'bg-gray-500';
  const date = new Date(milestone.date);
  const isGroundbreaking = milestone.significance === SignificanceLevel.GROUNDBREAKING;
  const isMajor = milestone.significance >= SignificanceLevel.MAJOR;

  // Size classes
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  // Touch target size (always at least 44px for accessibility)
  const touchTargetSize = 'min-h-[44px] min-w-[44px]';

  const handleClick = () => {
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Touch target wrapper */}
      <button
        type="button"
        data-testid={`milestone-dot-${milestone.id}`}
        data-category={milestone.category}
        data-significance={milestone.significance}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={`
          ${touchTargetSize}
          flex items-center justify-center
          cursor-pointer transition-transform duration-200
          hover:scale-125 focus:scale-125
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          ${className}
        `.trim()}
        aria-label={`${milestone.title} - ${formatTimelineDate(date, 'full')}`}
      >
        {/* The actual dot */}
        <span
          className={`
            ${sizeClasses[size]}
            ${categoryColor}
            rounded-full
            transition-all duration-200
            ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 scale-150' : ''}
            ${isGroundbreaking ? 'ring-2 ring-amber-400 animate-pulse' : ''}
            ${isMajor && !isGroundbreaking ? 'ring-1 ring-white shadow-md' : ''}
          `.trim()}
        />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          role="tooltip"
          className="
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2
            z-50 pointer-events-none
            animate-in fade-in-0 zoom-in-95 duration-200
          "
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-[200px]">
            <p className="font-semibold line-clamp-2">{milestone.title}</p>
            <p className="text-gray-300 mt-0.5">{formatTimelineDate(date, 'full')}</p>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MilestoneDot;

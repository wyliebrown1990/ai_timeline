import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlossaryTerm } from '../../hooks/useContent';

interface GlossaryTermProps {
  /** The glossary term ID to look up */
  termId: string;
  /** The display text (defaults to term name if not provided) */
  children?: React.ReactNode;
  /** Whether to show as inline or block element */
  inline?: boolean;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

/**
 * Inline glossary term component with hover tooltip
 * Renders text with a dotted underline and shows definition on hover
 * Click navigates to the glossary page with term selected
 */
export function GlossaryTerm({ termId, children, inline = true }: GlossaryTermProps) {
  const navigate = useNavigate();
  const { data: term } = useGlossaryTerm(termId);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Calculate tooltip position
  const calculatePosition = (): TooltipPosition | null => {
    if (!triggerRef.current) return null;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipHeight = 120; // Approximate tooltip height
    const gap = 8;

    // Prefer showing tooltip above, but show below if not enough space
    const spaceAbove = triggerRect.top;
    const placement = spaceAbove > tooltipHeight + gap ? 'top' : 'bottom';

    return {
      top: placement === 'top'
        ? triggerRect.top - gap
        : triggerRect.bottom + gap,
      left: triggerRect.left + triggerRect.width / 2,
      placement,
    };
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setTooltipPosition(calculatePosition());
      setShowTooltip(true);
    }, 200); // Small delay to prevent flashing
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 100);
  };

  const handleClick = () => {
    navigate(`/glossary?term=${termId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // If term not found, just render children as plain text
  if (!term) {
    return <>{children || termId}</>;
  }

  const displayText = children || term.term;
  const Component = inline ? 'span' : 'div';

  return (
    <Component className="relative inline">
      <button
        ref={triggerRef}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        className="
          text-blue-600 dark:text-blue-400
          border-b border-dotted border-blue-400 dark:border-blue-500
          hover:text-blue-700 dark:hover:text-blue-300
          hover:border-blue-600 dark:hover:border-blue-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          rounded-sm
          transition-colors
          cursor-pointer
        "
        aria-describedby={showTooltip ? `tooltip-${termId}` : undefined}
      >
        {displayText}
      </button>

      {/* Tooltip Portal */}
      {showTooltip && tooltipPosition && (
        <div
          ref={tooltipRef}
          id={`tooltip-${termId}`}
          role="tooltip"
          className="fixed z-[100] pointer-events-none"
          style={{
            top: tooltipPosition.placement === 'top' ? 'auto' : tooltipPosition.top,
            bottom: tooltipPosition.placement === 'top' ? `calc(100vh - ${tooltipPosition.top}px)` : 'auto',
            left: tooltipPosition.left,
            transform: 'translateX(-50%)',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className={`
              pointer-events-auto
              max-w-xs w-64 p-3
              bg-gray-900 dark:bg-gray-800
              text-white
              rounded-lg shadow-lg
              text-sm
              animate-fade-in
              ${tooltipPosition.placement === 'top' ? 'mb-2' : 'mt-2'}
            `}
          >
            <p className="font-semibold text-blue-300 mb-1">{term.term}</p>
            <p className="text-gray-200 text-xs leading-relaxed">
              {term.shortDefinition}
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Click to learn more
            </p>

            {/* Arrow */}
            <div
              className={`
                absolute left-1/2 -translate-x-1/2
                w-2 h-2 bg-gray-900 dark:bg-gray-800
                rotate-45
                ${tooltipPosition.placement === 'top' ? '-bottom-1' : '-top-1'}
              `}
            />
          </div>
        </div>
      )}
    </Component>
  );
}

export default GlossaryTerm;

/**
 * SwipeableCard Component
 *
 * A card wrapper that supports swipe-to-delete gesture on mobile devices.
 * Reveals a red delete indicator when swiping left, and triggers deletion
 * when swiped past a threshold.
 */

import { useState, useRef, useCallback, type ReactNode, type TouchEvent } from 'react';
import { Trash2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface SwipeableCardProps {
  /** Content to render inside the card */
  children: ReactNode;
  /** Called when card is swiped to delete */
  onDelete: () => void;
  /** Whether swipe to delete is enabled (default: true) */
  enabled?: boolean;
  /** Additional className for the card container */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Minimum distance to trigger delete action */
const DELETE_THRESHOLD = 100;
/** Distance at which delete indicator becomes fully visible */
const INDICATOR_FULL_OPACITY_AT = 60;

// =============================================================================
// Component
// =============================================================================

/**
 * Wraps content in a swipeable container for mobile delete gesture.
 */
export function SwipeableCard({
  children,
  onDelete,
  enabled = true,
  className = '',
}: SwipeableCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      const touch = e.touches[0];
      if (!touch) return;

      startXRef.current = touch.clientX;
      currentXRef.current = touch.clientX;
      setIsDragging(true);
    },
    [enabled]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isDragging) return;
      const touch = e.touches[0];
      if (!touch) return;

      currentXRef.current = touch.clientX;
      const deltaX = currentXRef.current - startXRef.current;

      // Only allow swiping left (negative direction)
      if (deltaX < 0) {
        // Limit max swipe distance
        const clampedOffset = Math.max(deltaX, -150);
        setOffsetX(clampedOffset);
      }
    },
    [enabled, isDragging]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    setIsDragging(false);

    // Check if swiped past threshold
    if (offsetX < -DELETE_THRESHOLD) {
      // Animate off screen then delete
      setOffsetX(-300);
      setTimeout(() => {
        onDelete();
        setOffsetX(0);
      }, 200);
    } else {
      // Snap back
      setOffsetX(0);
    }
  }, [enabled, offsetX, onDelete]);

  // Calculate delete indicator opacity
  const indicatorOpacity = Math.min(Math.abs(offsetX) / INDICATOR_FULL_OPACITY_AT, 1);
  const showIndicator = offsetX < -10;

  return (
    <div className="relative overflow-hidden">
      {/* Delete indicator background */}
      {showIndicator && (
        <div
          className="absolute inset-0 flex items-center justify-end bg-red-500 pr-4"
          style={{ opacity: indicatorOpacity }}
        >
          <Trash2 className="h-5 w-5 text-white" />
        </div>
      )}

      {/* Swipeable content */}
      <div
        className={className}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          // Performance: hint browser to prepare for swipe animation
          willChange: isDragging ? 'transform' : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

export default SwipeableCard;

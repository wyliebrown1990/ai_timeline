/**
 * VirtualizedCardList Component
 *
 * A simple virtualization component that only renders items visible in the viewport
 * plus a small buffer. Improves performance for long card lists.
 *
 * Uses Intersection Observer for efficient visibility detection.
 */

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface VirtualizedCardListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Estimated height of each item in pixels */
  itemHeight: number;
  /** Buffer of items to render outside viewport */
  overscan?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Key extractor for React keys */
  keyExtractor: (item: T) => string;
  /** Optional class for the container */
  className?: string;
  /** Minimum items before virtualization kicks in */
  threshold?: number;
}

// =============================================================================
// Component
// =============================================================================

export function VirtualizedCardList<T>({
  items,
  itemHeight,
  overscan = 3,
  renderItem,
  keyExtractor,
  className = '',
  threshold = 20,
}: VirtualizedCardListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: threshold });

  // Don't virtualize small lists
  if (items.length < threshold) {
    return (
      <ul className={className} role="list">
        {items.map((item, index) => (
          <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
        ))}
      </ul>
    );
  }

  // Calculate visible range based on scroll position
  const updateVisibleRange = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = window.scrollY;
    const viewportHeight = window.innerHeight;
    const containerRect = container.getBoundingClientRect();
    const containerTop = scrollTop + containerRect.top;

    // Calculate which items are in view
    const relativeScrollTop = Math.max(0, scrollTop - containerTop);
    const startIndex = Math.floor(relativeScrollTop / itemHeight);
    const visibleCount = Math.ceil(viewportHeight / itemHeight);
    const endIndex = startIndex + visibleCount;

    // Add overscan
    const start = Math.max(0, startIndex - overscan);
    const end = Math.min(items.length, endIndex + overscan);

    setVisibleRange((prev) => {
      if (prev.start === start && prev.end === end) return prev;
      return { start, end };
    });
  }, [itemHeight, items.length, overscan]);

  // Listen to scroll and resize
  useEffect(() => {
    updateVisibleRange();

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateVisibleRange();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [updateVisibleRange]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Height of space before visible items
  const paddingTop = visibleRange.start * itemHeight;

  // Items to render
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);

  return (
    <div ref={containerRef} className={className}>
      <ul
        role="list"
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: paddingTop,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, i) => {
            const actualIndex = visibleRange.start + i;
            return <li key={keyExtractor(item)}>{renderItem(item, actualIndex)}</li>;
          })}
        </div>
      </ul>
    </div>
  );
}

export default VirtualizedCardList;

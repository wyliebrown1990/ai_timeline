/**
 * VirtualizedMilestoneList Component
 * Sprint TD-5: Performance optimization with virtualized list rendering
 *
 * Uses react-window to render only visible milestone cards,
 * dramatically improving performance for large lists.
 */

import { useCallback, useRef, useMemo } from 'react';
import type { ListChildComponentProps } from 'react-window';
import { FixedSizeList as List } from 'react-window';
import type { MilestoneWithLayeredContent } from '../../types/milestone';
import { MilestoneCard } from './MilestoneCard';

interface VirtualizedMilestoneListProps {
  /** Milestones to display */
  milestones: MilestoneWithLayeredContent[];
  /** Currently selected milestone ID */
  selectedId?: string | null;
  /** Callback when a milestone is selected */
  onSelect: (id: string) => void;
  /** Number of columns in the grid */
  columns?: number;
  /** Height of the list container */
  height?: number;
  /** Enable virtualization threshold (only virtualize if > this many items) */
  virtualizationThreshold?: number;
}

// Approximate height of a milestone card row (in pixels)
const ROW_HEIGHT = 240;

// Gap between cards (in pixels)
const GAP = 16;

/**
 * Row renderer for react-window
 */
interface RowData {
  milestones: MilestoneWithLayeredContent[];
  columns: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function Row({ index, style, data }: ListChildComponentProps<RowData>) {
  const { milestones, columns, selectedId, onSelect } = data;
  const startIdx = index * columns;
  const rowMilestones = milestones.slice(startIdx, startIdx + columns);

  return (
    <div
      style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${GAP}px`,
        paddingLeft: GAP,
        paddingRight: GAP,
      }}
    >
      {rowMilestones.map((milestone) => (
        <MilestoneCard
          key={milestone.id}
          milestone={milestone}
          isExpanded={milestone.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

/**
 * VirtualizedMilestoneList - High-performance milestone list
 */
export function VirtualizedMilestoneList({
  milestones,
  selectedId,
  onSelect,
  columns = 3,
  height = 800,
  virtualizationThreshold = 50,
}: VirtualizedMilestoneListProps) {
  const listRef = useRef<List>(null);

  // Calculate number of rows
  const rowCount = Math.ceil(milestones.length / columns);

  // Memoize row data to prevent unnecessary re-renders
  const itemData = useMemo<RowData>(
    () => ({
      milestones,
      columns,
      selectedId: selectedId ?? null,
      onSelect,
    }),
    [milestones, columns, selectedId, onSelect]
  );

  // Handle scroll to selected milestone
  const scrollToSelected = useCallback(() => {
    if (selectedId && listRef.current) {
      const idx = milestones.findIndex((m) => m.id === selectedId);
      if (idx >= 0) {
        const rowIdx = Math.floor(idx / columns);
        listRef.current.scrollToItem(rowIdx, 'center');
      }
    }
  }, [selectedId, milestones, columns]);

  // If below threshold, render normally without virtualization
  if (milestones.length <= virtualizationThreshold) {
    return (
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        style={{ padding: `0 ${GAP}px` }}
      >
        {milestones.map((milestone) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            isExpanded={milestone.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="virtualized-milestone-list">
      <List
        ref={listRef}
        height={height}
        width="100%"
        itemCount={rowCount}
        itemSize={ROW_HEIGHT + GAP}
        itemData={itemData}
        overscanCount={2}
        className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
      >
        {Row}
      </List>

      {/* Scroll to selected button */}
      {selectedId && (
        <button
          onClick={scrollToSelected}
          className="fixed bottom-24 right-4 z-40 px-3 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg shadow-lg hover:bg-orange-600 transition-colors"
        >
          Scroll to Selected
        </button>
      )}
    </div>
  );
}

export default VirtualizedMilestoneList;

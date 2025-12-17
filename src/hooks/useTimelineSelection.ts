import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { MilestoneResponse } from '../types/milestone';

interface UseTimelineSelectionOptions {
  /** Array of milestones for navigation */
  milestones: MilestoneResponse[];
  /** Whether to sync selection with URL */
  syncWithUrl?: boolean;
  /** URL parameter name for selected milestone */
  urlParam?: string;
}

interface UseTimelineSelectionReturn {
  /** Currently selected milestone ID */
  selectedId: string | null;
  /** Currently selected milestone object */
  selectedMilestone: MilestoneResponse | null;
  /** Select a milestone by ID */
  select: (id: string) => void;
  /** Deselect current milestone */
  deselect: () => void;
  /** Select the next milestone in order */
  selectNext: () => void;
  /** Select the previous milestone in order */
  selectPrevious: () => void;
  /** Check if there is a next milestone */
  hasNext: boolean;
  /** Check if there is a previous milestone */
  hasPrevious: boolean;
  /** Get index of current selection */
  currentIndex: number;
}

/**
 * Hook for managing timeline milestone selection state
 * Supports URL synchronization for shareable deep links
 */
export function useTimelineSelection({
  milestones,
  syncWithUrl = true,
  urlParam = 'selected',
}: UseTimelineSelectionOptions): UseTimelineSelectionReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Initialize from URL on mount
  useEffect(() => {
    if (syncWithUrl) {
      const urlSelectedId = searchParams.get(urlParam);
      if (urlSelectedId && milestones.some((m) => m.id === urlSelectedId)) {
        setSelectedId(urlSelectedId);
      }
    }
  }, [syncWithUrl, urlParam, searchParams, milestones]);

  // Find current milestone and index
  const currentIndex = selectedId ? milestones.findIndex((m) => m.id === selectedId) : -1;
  const selectedMilestone = currentIndex >= 0 ? milestones[currentIndex] : null;

  // Navigation availability
  const hasNext = currentIndex >= 0 && currentIndex < milestones.length - 1;
  const hasPrevious = currentIndex > 0;

  // Select a milestone
  const select = useCallback(
    (id: string) => {
      setSelectedId(id);

      if (syncWithUrl) {
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.set(urlParam, id);
          return newParams;
        });
      }
    },
    [syncWithUrl, urlParam, setSearchParams]
  );

  // Deselect current milestone
  const deselect = useCallback(() => {
    setSelectedId(null);

    if (syncWithUrl) {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete(urlParam);
        return newParams;
      });
    }
  }, [syncWithUrl, urlParam, setSearchParams]);

  // Navigate to next milestone
  const selectNext = useCallback(() => {
    const nextMilestone = milestones[currentIndex + 1];
    if (hasNext && nextMilestone) {
      select(nextMilestone.id);
    }
  }, [hasNext, currentIndex, milestones, select]);

  // Navigate to previous milestone
  const selectPrevious = useCallback(() => {
    const prevMilestone = milestones[currentIndex - 1];
    if (hasPrevious && prevMilestone) {
      select(prevMilestone.id);
    }
  }, [hasPrevious, currentIndex, milestones, select]);

  return {
    selectedId,
    selectedMilestone: selectedMilestone ?? null,
    select,
    deselect,
    selectNext,
    selectPrevious,
    hasNext,
    hasPrevious,
    currentIndex,
  };
}

export default useTimelineSelection;

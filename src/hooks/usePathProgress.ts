/**
 * Learning Path Progress Hook
 *
 * Manages user progress through learning paths using localStorage.
 * Tracks viewed milestones, completion status, and time spent.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Storage key for path progress data
 */
const STORAGE_KEY = 'ai-timeline-path-progress';

/**
 * Progress data for a single learning path
 */
export interface PathProgress {
  pathId: string;
  viewedMilestoneIds: string[];
  startedAt: string;
  completedAt?: string;
  timeSpentSeconds: number;
  lastViewedMilestoneId?: string;
}

/**
 * All stored progress data
 */
interface StoredProgress {
  paths: Record<string, PathProgress>;
  lastActivePath?: string;
}

/**
 * Default empty storage state
 */
const DEFAULT_STORAGE: StoredProgress = {
  paths: {},
  lastActivePath: undefined,
};

/**
 * Load progress from localStorage
 */
function loadProgress(): StoredProgress {
  if (typeof window === 'undefined') return DEFAULT_STORAGE;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as StoredProgress;
    }
  } catch (error) {
    console.error('Failed to load path progress:', error);
  }

  return DEFAULT_STORAGE;
}

/**
 * Save progress to localStorage
 */
function saveProgress(progress: StoredProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save path progress:', error);
  }
}

/**
 * Hook return type
 */
export interface UsePathProgressReturn {
  /** Get progress for a specific path */
  getPathProgress: (pathId: string) => PathProgress | undefined;

  /** Get all path progress */
  getAllProgress: () => Record<string, PathProgress>;

  /** Get the last active path ID */
  getLastActivePath: () => string | undefined;

  /** Mark a milestone as viewed in a path */
  markMilestoneViewed: (pathId: string, milestoneId: string) => void;

  /** Start tracking a new path */
  startPath: (pathId: string) => void;

  /** Mark a path as completed */
  completePath: (pathId: string) => void;

  /** Reset progress for a specific path */
  resetPathProgress: (pathId: string) => void;

  /** Reset all progress */
  resetAllProgress: () => void;

  /** Add time spent to a path */
  addTimeSpent: (pathId: string, seconds: number) => void;

  /** Calculate completion percentage for a path */
  getCompletionPercentage: (pathId: string, totalMilestones: number) => number;

  /** Check if a milestone has been viewed in a path */
  isMilestoneViewed: (pathId: string, milestoneId: string) => boolean;

  /** Check if a path is completed */
  isPathCompleted: (pathId: string) => boolean;

  /** Check if a path has been started */
  isPathStarted: (pathId: string) => boolean;
}

/**
 * Hook for managing learning path progress
 *
 * @example
 * ```tsx
 * const {
 *   markMilestoneViewed,
 *   getCompletionPercentage,
 *   isPathCompleted,
 * } = usePathProgress();
 *
 * // When user views a milestone
 * markMilestoneViewed('chatgpt-story', 'milestone-123');
 *
 * // Check progress
 * const progress = getCompletionPercentage('chatgpt-story', 7);
 * ```
 */
export function usePathProgress(): UsePathProgressReturn {
  const [progress, setProgress] = useState<StoredProgress>(DEFAULT_STORAGE);

  // Load progress from localStorage on mount
  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  // Save to localStorage whenever progress changes
  const updateProgress = useCallback((newProgress: StoredProgress) => {
    setProgress(newProgress);
    saveProgress(newProgress);
  }, []);

  // Get progress for a specific path
  const getPathProgress = useCallback(
    (pathId: string): PathProgress | undefined => {
      return progress.paths[pathId];
    },
    [progress]
  );

  // Get all path progress
  const getAllProgress = useCallback((): Record<string, PathProgress> => {
    return progress.paths;
  }, [progress]);

  // Get the last active path
  const getLastActivePath = useCallback((): string | undefined => {
    return progress.lastActivePath;
  }, [progress]);

  // Start tracking a new path
  const startPath = useCallback(
    (pathId: string) => {
      if (progress.paths[pathId]) {
        // Path already started, just update lastActivePath
        updateProgress({
          ...progress,
          lastActivePath: pathId,
        });
        return;
      }

      const newPathProgress: PathProgress = {
        pathId,
        viewedMilestoneIds: [],
        startedAt: new Date().toISOString(),
        timeSpentSeconds: 0,
      };

      updateProgress({
        ...progress,
        paths: {
          ...progress.paths,
          [pathId]: newPathProgress,
        },
        lastActivePath: pathId,
      });
    },
    [progress, updateProgress]
  );

  // Mark a milestone as viewed
  const markMilestoneViewed = useCallback(
    (pathId: string, milestoneId: string) => {
      const pathProgress = progress.paths[pathId];

      if (!pathProgress) {
        // Auto-start the path if not started
        const newPathProgress: PathProgress = {
          pathId,
          viewedMilestoneIds: [milestoneId],
          startedAt: new Date().toISOString(),
          timeSpentSeconds: 0,
          lastViewedMilestoneId: milestoneId,
        };

        updateProgress({
          ...progress,
          paths: {
            ...progress.paths,
            [pathId]: newPathProgress,
          },
          lastActivePath: pathId,
        });
        return;
      }

      // Check if already viewed
      if (pathProgress.viewedMilestoneIds.includes(milestoneId)) {
        // Just update lastViewedMilestoneId
        updateProgress({
          ...progress,
          paths: {
            ...progress.paths,
            [pathId]: {
              ...pathProgress,
              lastViewedMilestoneId: milestoneId,
            },
          },
          lastActivePath: pathId,
        });
        return;
      }

      // Add to viewed milestones
      updateProgress({
        ...progress,
        paths: {
          ...progress.paths,
          [pathId]: {
            ...pathProgress,
            viewedMilestoneIds: [...pathProgress.viewedMilestoneIds, milestoneId],
            lastViewedMilestoneId: milestoneId,
          },
        },
        lastActivePath: pathId,
      });
    },
    [progress, updateProgress]
  );

  // Mark path as completed
  const completePath = useCallback(
    (pathId: string) => {
      const pathProgress = progress.paths[pathId];
      if (!pathProgress) return;

      updateProgress({
        ...progress,
        paths: {
          ...progress.paths,
          [pathId]: {
            ...pathProgress,
            completedAt: new Date().toISOString(),
          },
        },
      });
    },
    [progress, updateProgress]
  );

  // Reset progress for a specific path
  const resetPathProgress = useCallback(
    (pathId: string) => {
      const { [pathId]: _, ...remainingPaths } = progress.paths;

      updateProgress({
        ...progress,
        paths: remainingPaths,
        lastActivePath:
          progress.lastActivePath === pathId ? undefined : progress.lastActivePath,
      });
    },
    [progress, updateProgress]
  );

  // Reset all progress
  const resetAllProgress = useCallback(() => {
    updateProgress(DEFAULT_STORAGE);
  }, [updateProgress]);

  // Add time spent to a path
  const addTimeSpent = useCallback(
    (pathId: string, seconds: number) => {
      const pathProgress = progress.paths[pathId];
      if (!pathProgress) return;

      updateProgress({
        ...progress,
        paths: {
          ...progress.paths,
          [pathId]: {
            ...pathProgress,
            timeSpentSeconds: pathProgress.timeSpentSeconds + seconds,
          },
        },
      });
    },
    [progress, updateProgress]
  );

  // Calculate completion percentage
  const getCompletionPercentage = useCallback(
    (pathId: string, totalMilestones: number): number => {
      const pathProgress = progress.paths[pathId];
      if (!pathProgress || totalMilestones === 0) return 0;

      const percentage =
        (pathProgress.viewedMilestoneIds.length / totalMilestones) * 100;
      return Math.min(Math.round(percentage), 100);
    },
    [progress]
  );

  // Check if milestone is viewed
  const isMilestoneViewed = useCallback(
    (pathId: string, milestoneId: string): boolean => {
      const pathProgress = progress.paths[pathId];
      return pathProgress?.viewedMilestoneIds.includes(milestoneId) ?? false;
    },
    [progress]
  );

  // Check if path is completed
  const isPathCompleted = useCallback(
    (pathId: string): boolean => {
      const pathProgress = progress.paths[pathId];
      return pathProgress?.completedAt !== undefined;
    },
    [progress]
  );

  // Check if path is started
  const isPathStarted = useCallback(
    (pathId: string): boolean => {
      return progress.paths[pathId] !== undefined;
    },
    [progress]
  );

  return useMemo(
    () => ({
      getPathProgress,
      getAllProgress,
      getLastActivePath,
      markMilestoneViewed,
      startPath,
      completePath,
      resetPathProgress,
      resetAllProgress,
      addTimeSpent,
      getCompletionPercentage,
      isMilestoneViewed,
      isPathCompleted,
      isPathStarted,
    }),
    [
      getPathProgress,
      getAllProgress,
      getLastActivePath,
      markMilestoneViewed,
      startPath,
      completePath,
      resetPathProgress,
      resetAllProgress,
      addTimeSpent,
      getCompletionPercentage,
      isMilestoneViewed,
      isPathCompleted,
      isPathStarted,
    ]
  );
}

export default usePathProgress;

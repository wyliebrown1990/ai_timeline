/**
 * Concept Progress Hook
 *
 * Manages user progress tracking for glossary concepts using localStorage.
 * Tracks which concepts users have "seen" (viewed in detail) and provides
 * utilities for the prerequisite system.
 *
 * Sprint LEarn-1 - Prerequisite Mapping & Adaptive Sequencing
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Storage key for concept progress data
 */
const STORAGE_KEY = 'ai-timeline-concept-progress';

/**
 * Current schema version for migration support
 */
const SCHEMA_VERSION = 1;

/**
 * Record of when a concept was seen
 */
export interface SeenConcept {
  conceptId: string;
  firstSeenAt: string;
  viewCount: number;
  lastSeenAt: string;
}

/**
 * Stored concept progress data with versioning
 */
interface StoredConceptProgress {
  version: number;
  seenConcepts: Record<string, SeenConcept>;
  dismissedAlerts: string[]; // Alert IDs that user has dismissed
  lastUpdated: string;
}

/**
 * Default empty storage state
 */
const DEFAULT_STORAGE: StoredConceptProgress = {
  version: SCHEMA_VERSION,
  seenConcepts: {},
  dismissedAlerts: [],
  lastUpdated: new Date().toISOString(),
};

/**
 * Type guard to check if data is a valid StoredConceptProgress
 */
function isValidStoredProgress(data: unknown): data is StoredConceptProgress {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.version === 'number' &&
    typeof obj.seenConcepts === 'object' &&
    Array.isArray(obj.dismissedAlerts) &&
    typeof obj.lastUpdated === 'string'
  );
}

/**
 * Migrate storage from older versions if needed
 */
function migrateStorage(stored: unknown): StoredConceptProgress {
  // If no version or old format, reset to default
  if (!stored || typeof stored !== 'object') {
    return DEFAULT_STORAGE;
  }

  // Check if already valid and current version
  if (isValidStoredProgress(stored) && stored.version === SCHEMA_VERSION) {
    return stored;
  }

  // Add future migrations here as schema evolves
  // For now, reset to default if version doesn't match
  return DEFAULT_STORAGE;
}

/**
 * Load progress from localStorage
 */
function loadProgress(): StoredConceptProgress {
  if (typeof window === 'undefined') return DEFAULT_STORAGE;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return migrateStorage(parsed);
    }
  } catch (error) {
    console.error('Failed to load concept progress:', error);
  }

  return DEFAULT_STORAGE;
}

/**
 * Save progress to localStorage
 */
function saveProgress(progress: StoredConceptProgress): void {
  if (typeof window === 'undefined') return;

  try {
    const updated = {
      ...progress,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save concept progress:', error);
  }
}

/**
 * Hook return type
 */
export interface UseConceptProgressReturn {
  /** List of all seen concept IDs */
  seenConceptIds: string[];

  /** Total number of concepts seen */
  seenCount: number;

  /** Check if a specific concept has been seen */
  hasSeenConcept: (conceptId: string) => boolean;

  /** Mark a concept as seen (increments view count if already seen) */
  markConceptSeen: (conceptId: string) => void;

  /** Mark multiple concepts as seen at once */
  markConceptsSeen: (conceptIds: string[]) => void;

  /** Get the full record for a seen concept */
  getConceptProgress: (conceptId: string) => SeenConcept | undefined;

  /**
   * Get missing prerequisites for a concept
   * @param conceptId - The concept to check
   * @param prerequisiteIds - The prerequisite IDs for this concept
   * @returns Array of prerequisite IDs the user hasn't seen
   */
  getMissingPrerequisites: (
    conceptId: string,
    prerequisiteIds: string[]
  ) => string[];

  /**
   * Get the number of prerequisites completed for a concept
   * @returns { completed: number, total: number }
   */
  getPrerequisiteProgress: (
    prerequisiteIds: string[]
  ) => { completed: number; total: number };

  /**
   * Check if user is ready to learn a concept (has seen all prerequisites)
   */
  isReadyToLearn: (prerequisiteIds: string[]) => boolean;

  /** Check if an alert has been dismissed */
  isAlertDismissed: (alertId: string) => boolean;

  /** Dismiss an alert (don't show again) */
  dismissAlert: (alertId: string) => void;

  /** Clear a dismissed alert (show again) */
  clearDismissedAlert: (alertId: string) => void;

  /** Clear progress for a specific concept */
  clearConceptProgress: (conceptId: string) => void;

  /** Clear all concept progress */
  clearAllProgress: () => void;

  /** Export progress data (for backup/debugging) */
  exportProgress: () => StoredConceptProgress;
}

/**
 * Hook for managing concept progress and prerequisite tracking
 *
 * @example
 * ```tsx
 * const {
 *   markConceptSeen,
 *   hasSeenConcept,
 *   getMissingPrerequisites,
 * } = useConceptProgress();
 *
 * // When user views a concept
 * useEffect(() => {
 *   if (term) {
 *     markConceptSeen(term.id);
 *   }
 * }, [term?.id]);
 *
 * // Check prerequisites
 * const missing = getMissingPrerequisites(term.id, term.prerequisiteIds);
 * ```
 */
export function useConceptProgress(): UseConceptProgressReturn {
  const [progress, setProgress] = useState<StoredConceptProgress>(DEFAULT_STORAGE);

  // Load progress from localStorage on mount
  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  // Update progress helper (saves to localStorage)
  const updateProgress = useCallback((newProgress: StoredConceptProgress) => {
    setProgress(newProgress);
    saveProgress(newProgress);
  }, []);

  // Get list of seen concept IDs
  const seenConceptIds = useMemo(
    () => Object.keys(progress.seenConcepts),
    [progress.seenConcepts]
  );

  // Get total seen count
  const seenCount = seenConceptIds.length;

  // Check if concept has been seen
  const hasSeenConcept = useCallback(
    (conceptId: string): boolean => {
      return conceptId in progress.seenConcepts;
    },
    [progress.seenConcepts]
  );

  // Mark a concept as seen
  const markConceptSeen = useCallback(
    (conceptId: string) => {
      const existing = progress.seenConcepts[conceptId];
      const now = new Date().toISOString();

      if (existing) {
        // Increment view count
        updateProgress({
          ...progress,
          seenConcepts: {
            ...progress.seenConcepts,
            [conceptId]: {
              ...existing,
              viewCount: existing.viewCount + 1,
              lastSeenAt: now,
            },
          },
        });
      } else {
        // First view
        updateProgress({
          ...progress,
          seenConcepts: {
            ...progress.seenConcepts,
            [conceptId]: {
              conceptId,
              firstSeenAt: now,
              viewCount: 1,
              lastSeenAt: now,
            },
          },
        });
      }
    },
    [progress, updateProgress]
  );

  // Mark multiple concepts as seen
  const markConceptsSeen = useCallback(
    (conceptIds: string[]) => {
      const now = new Date().toISOString();
      const updates: Record<string, SeenConcept> = {};

      for (const conceptId of conceptIds) {
        const existing = progress.seenConcepts[conceptId];
        if (existing) {
          updates[conceptId] = {
            ...existing,
            viewCount: existing.viewCount + 1,
            lastSeenAt: now,
          };
        } else {
          updates[conceptId] = {
            conceptId,
            firstSeenAt: now,
            viewCount: 1,
            lastSeenAt: now,
          };
        }
      }

      updateProgress({
        ...progress,
        seenConcepts: {
          ...progress.seenConcepts,
          ...updates,
        },
      });
    },
    [progress, updateProgress]
  );

  // Get full concept progress record
  const getConceptProgress = useCallback(
    (conceptId: string): SeenConcept | undefined => {
      return progress.seenConcepts[conceptId];
    },
    [progress.seenConcepts]
  );

  // Get missing prerequisites
  const getMissingPrerequisites = useCallback(
    (_conceptId: string, prerequisiteIds: string[]): string[] => {
      return prerequisiteIds.filter(
        (prereqId) => !progress.seenConcepts[prereqId]
      );
    },
    [progress.seenConcepts]
  );

  // Get prerequisite progress
  const getPrerequisiteProgress = useCallback(
    (prerequisiteIds: string[]): { completed: number; total: number } => {
      const completed = prerequisiteIds.filter(
        (prereqId) => prereqId in progress.seenConcepts
      ).length;
      return {
        completed,
        total: prerequisiteIds.length,
      };
    },
    [progress.seenConcepts]
  );

  // Check if ready to learn
  const isReadyToLearn = useCallback(
    (prerequisiteIds: string[]): boolean => {
      if (prerequisiteIds.length === 0) return true;
      return prerequisiteIds.every(
        (prereqId) => prereqId in progress.seenConcepts
      );
    },
    [progress.seenConcepts]
  );

  // Check if alert is dismissed
  const isAlertDismissed = useCallback(
    (alertId: string): boolean => {
      return progress.dismissedAlerts.includes(alertId);
    },
    [progress.dismissedAlerts]
  );

  // Dismiss an alert
  const dismissAlert = useCallback(
    (alertId: string) => {
      if (progress.dismissedAlerts.includes(alertId)) return;

      updateProgress({
        ...progress,
        dismissedAlerts: [...progress.dismissedAlerts, alertId],
      });
    },
    [progress, updateProgress]
  );

  // Clear dismissed alert
  const clearDismissedAlert = useCallback(
    (alertId: string) => {
      updateProgress({
        ...progress,
        dismissedAlerts: progress.dismissedAlerts.filter((id) => id !== alertId),
      });
    },
    [progress, updateProgress]
  );

  // Clear progress for specific concept
  const clearConceptProgress = useCallback(
    (conceptId: string) => {
      const { [conceptId]: _, ...remainingConcepts } = progress.seenConcepts;
      updateProgress({
        ...progress,
        seenConcepts: remainingConcepts,
      });
    },
    [progress, updateProgress]
  );

  // Clear all progress
  const clearAllProgress = useCallback(() => {
    updateProgress(DEFAULT_STORAGE);
  }, [updateProgress]);

  // Export progress
  const exportProgress = useCallback((): StoredConceptProgress => {
    return progress;
  }, [progress]);

  return useMemo(
    () => ({
      seenConceptIds,
      seenCount,
      hasSeenConcept,
      markConceptSeen,
      markConceptsSeen,
      getConceptProgress,
      getMissingPrerequisites,
      getPrerequisiteProgress,
      isReadyToLearn,
      isAlertDismissed,
      dismissAlert,
      clearDismissedAlert,
      clearConceptProgress,
      clearAllProgress,
      exportProgress,
    }),
    [
      seenConceptIds,
      seenCount,
      hasSeenConcept,
      markConceptSeen,
      markConceptsSeen,
      getConceptProgress,
      getMissingPrerequisites,
      getPrerequisiteProgress,
      isReadyToLearn,
      isAlertDismissed,
      dismissAlert,
      clearDismissedAlert,
      clearConceptProgress,
      clearAllProgress,
      exportProgress,
    ]
  );
}

export default useConceptProgress;

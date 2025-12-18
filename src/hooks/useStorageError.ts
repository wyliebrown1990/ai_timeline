/**
 * useStorageError Hook
 *
 * Manages storage error state and provides user-friendly error display.
 * Integrates with the storage utility module to show toast notifications.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  type StorageError,
  setStorageErrorCallback,
  isStorageAvailable,
  getStorageCheckError,
  estimateStorageUsage,
  checkStorageHealth,
} from '../lib/storage';

// =============================================================================
// Types
// =============================================================================

export interface StorageWarning {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  dismissible: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UseStorageErrorReturn {
  /** Current storage errors/warnings to display */
  warnings: StorageWarning[];
  /** Whether localStorage is available */
  isStorageAvailable: boolean;
  /** Whether using in-memory fallback */
  usingFallback: boolean;
  /** Storage usage percentage (0-100) */
  storageUsagePercent: number;
  /** Dismiss a warning by ID */
  dismissWarning: (id: string) => void;
  /** Clear all warnings */
  clearWarnings: () => void;
  /** Manually add a warning */
  addWarning: (warning: Omit<StorageWarning, 'id'>) => void;
  /** Run a storage health check */
  runHealthCheck: () => void;
}

// =============================================================================
// Generate unique IDs
// =============================================================================

let warningIdCounter = 0;
function generateWarningId(): string {
  return `storage-warning-${++warningIdCounter}`;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing storage errors and warnings.
 * Automatically detects storage issues and provides user-friendly messages.
 */
export function useStorageError(): UseStorageErrorReturn {
  const [warnings, setWarnings] = useState<StorageWarning[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [storageUsagePercent, setStorageUsagePercent] = useState(0);
  const shownErrorsRef = useRef(new Set<string>());

  // Check storage availability on mount
  const storageAvailable = isStorageAvailable();

  // Add a warning (deduplication by message)
  const addWarning = useCallback((warning: Omit<StorageWarning, 'id'>) => {
    const key = `${warning.type}:${warning.message}`;
    if (shownErrorsRef.current.has(key)) {
      return; // Don't show duplicate warnings
    }
    shownErrorsRef.current.add(key);

    const newWarning: StorageWarning = {
      ...warning,
      id: generateWarningId(),
    };
    setWarnings((prev) => [...prev, newWarning]);
  }, []);

  // Dismiss a warning
  const dismissWarning = useCallback((id: string) => {
    setWarnings((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // Clear all warnings
  const clearWarnings = useCallback(() => {
    setWarnings([]);
    shownErrorsRef.current.clear();
  }, []);

  // Handle storage errors from the storage module
  const handleStorageError = useCallback(
    (error: StorageError) => {
      // Track fallback usage
      if (error.type === 'unavailable' || error.type === 'quota_exceeded') {
        setUsingFallback(true);
      }

      // Map error types to warning types
      const warningType: 'error' | 'warning' | 'info' =
        error.type === 'corrupted_data' ? 'warning' : error.recoverable ? 'warning' : 'error';

      addWarning({
        type: warningType,
        message: error.userMessage,
        dismissible: error.recoverable,
        action:
          error.type === 'quota_exceeded'
            ? {
                label: 'Manage Storage',
                onClick: () => {
                  // Navigate to stats page with data management tab
                  window.location.hash = '#/study/stats?tab=data';
                },
              }
            : undefined,
      });
    },
    [addWarning]
  );

  // Set up global error callback
  useEffect(() => {
    setStorageErrorCallback(handleStorageError);
    return () => setStorageErrorCallback(null);
  }, [handleStorageError]);

  // Check for initial storage issues
  useEffect(() => {
    // Check if storage is unavailable
    if (!storageAvailable) {
      const error = getStorageCheckError();
      if (error) {
        handleStorageError(error);
      }
    }

    // Check storage usage
    const usage = estimateStorageUsage();
    setStorageUsagePercent(usage.percentage);

    if (usage.percentage > 80) {
      addWarning({
        type: 'warning',
        message: `Storage is ${usage.percentage}% full. Consider backing up and clearing old data.`,
        dismissible: true,
        action: {
          label: 'Manage Storage',
          onClick: () => {
            window.location.hash = '#/study/stats?tab=data';
          },
        },
      });
    }
  }, [storageAvailable, handleStorageError, addWarning]);

  // Run a comprehensive health check
  const runHealthCheck = useCallback(() => {
    const flashcardKeys = [
      'ai-timeline-flashcards',
      'ai-timeline-flashcard-packs',
      'ai-timeline-flashcard-stats',
      'ai-timeline-flashcard-history',
      'ai-timeline-flashcard-streak',
    ];

    const report = checkStorageHealth(flashcardKeys);

    setStorageUsagePercent(report.usagePercentage);

    // Add warnings for any issues found
    for (const error of report.errors) {
      addWarning({
        type: 'error',
        message: error.userMessage,
        dismissible: error.recoverable,
      });
    }

    // Add recommendations as info
    for (const recommendation of report.recommendations) {
      addWarning({
        type: 'info',
        message: recommendation,
        dismissible: true,
      });
    }
  }, [addWarning]);

  return {
    warnings,
    isStorageAvailable: storageAvailable,
    usingFallback,
    storageUsagePercent,
    dismissWarning,
    clearWarnings,
    addWarning,
    runHealthCheck,
  };
}

export default useStorageError;

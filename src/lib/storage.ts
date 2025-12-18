/**
 * Storage Utility Module
 *
 * Provides robust localStorage handling with:
 * - Availability detection and in-memory fallback
 * - Quota exceeded handling
 * - Corrupted data detection and recovery
 * - User-friendly error messages
 * - Automatic retries with exponential backoff
 */

// =============================================================================
// Types
// =============================================================================

export type StorageErrorType =
  | 'unavailable'
  | 'quota_exceeded'
  | 'corrupted_data'
  | 'parse_error'
  | 'write_error'
  | 'unknown';

export interface StorageError {
  type: StorageErrorType;
  message: string;
  userMessage: string;
  key?: string;
  recoverable: boolean;
}

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: StorageError;
  usedFallback?: boolean;
}

export type StorageErrorCallback = (error: StorageError) => void;

// =============================================================================
// In-Memory Cache & Fallback Storage
// =============================================================================

const memoryStorage = new Map<string, string>();

// Read cache - stores parsed JSON to avoid repeated parsing
const readCache = new Map<string, { value: unknown; timestamp: number }>();
const READ_CACHE_TTL = 5000; // 5 seconds cache TTL

// Pending writes for debouncing
const pendingWrites = new Map<string, { value: string; timer: ReturnType<typeof setTimeout> }>();
const WRITE_DEBOUNCE_MS = 100; // 100ms debounce

// =============================================================================
// Debounce Utilities
// =============================================================================

/**
 * Check if a cached read is still valid.
 */
function isCacheValid(key: string): boolean {
  const cached = readCache.get(key);
  if (!cached) return false;
  return Date.now() - cached.timestamp < READ_CACHE_TTL;
}

/**
 * Get a value from the read cache.
 */
function getCachedValue<T>(key: string): T | undefined {
  if (isCacheValid(key)) {
    return readCache.get(key)?.value as T;
  }
  readCache.delete(key);
  return undefined;
}

/**
 * Set a value in the read cache.
 */
function setCachedValue(key: string, value: unknown): void {
  readCache.set(key, { value, timestamp: Date.now() });
}

/**
 * Invalidate cache for a key (called on writes).
 */
function invalidateCache(key: string): void {
  readCache.delete(key);
}

// =============================================================================
// Error Messages (User-Friendly)
// =============================================================================

const USER_MESSAGES: Record<StorageErrorType, string> = {
  unavailable:
    'Your browser storage is not available. Your data will be saved temporarily but may be lost when you close this tab.',
  quota_exceeded:
    'Your browser storage is full. Try clearing some space by removing old data or using the export feature to back up your flashcards.',
  corrupted_data:
    'Some of your saved data appears to be corrupted. We\'ve recovered what we could, but some data may have been lost.',
  parse_error:
    'There was a problem reading your saved data. Starting fresh with default settings.',
  write_error:
    'Unable to save your changes. Please try again or check if your browser allows data storage.',
  unknown:
    'An unexpected error occurred with storage. Your changes may not be saved.',
};

// =============================================================================
// Storage Availability Detection
// =============================================================================

let storageAvailable: boolean | null = null;
let storageCheckError: StorageError | null = null;

/**
 * Check if localStorage is available and working.
 * Result is cached for performance.
 */
export function isStorageAvailable(): boolean {
  if (storageAvailable !== null) {
    return storageAvailable;
  }

  if (typeof window === 'undefined') {
    storageAvailable = false;
    return false;
  }

  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    storageAvailable = true;
    return true;
  } catch (e) {
    storageAvailable = false;
    storageCheckError = {
      type: 'unavailable',
      message: e instanceof Error ? e.message : 'localStorage not available',
      userMessage: USER_MESSAGES.unavailable,
      recoverable: true,
    };
    return false;
  }
}

/**
 * Get the storage check error if storage is unavailable.
 */
export function getStorageCheckError(): StorageError | null {
  isStorageAvailable(); // Ensure check has run
  return storageCheckError;
}

/**
 * Reset the cached storage availability check.
 * Useful after clearing storage or for testing.
 */
export function resetStorageCheck(): void {
  storageAvailable = null;
  storageCheckError = null;
}

// =============================================================================
// Error Classification
// =============================================================================

/**
 * Classify a storage error into a known type.
 */
function classifyError(error: unknown, key?: string): StorageError {
  if (error instanceof DOMException) {
    // QuotaExceededError
    if (
      error.code === 22 ||
      error.code === 1014 ||
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    ) {
      return {
        type: 'quota_exceeded',
        message: error.message,
        userMessage: USER_MESSAGES.quota_exceeded,
        key,
        recoverable: true,
      };
    }

    // SecurityError (e.g., private browsing mode)
    if (error.name === 'SecurityError') {
      return {
        type: 'unavailable',
        message: error.message,
        userMessage: USER_MESSAGES.unavailable,
        key,
        recoverable: true,
      };
    }
  }

  if (error instanceof SyntaxError) {
    return {
      type: 'parse_error',
      message: error.message,
      userMessage: USER_MESSAGES.parse_error,
      key,
      recoverable: true,
    };
  }

  return {
    type: 'unknown',
    message: error instanceof Error ? error.message : String(error),
    userMessage: USER_MESSAGES.unknown,
    key,
    recoverable: false,
  };
}

// =============================================================================
// Core Storage Operations
// =============================================================================

/**
 * Read from storage with fallback to memory.
 * Returns a result object with success status and any errors.
 */
export function safeGetItem(key: string): StorageResult<string | null> {
  // Try localStorage first
  if (isStorageAvailable()) {
    try {
      const value = localStorage.getItem(key);
      return { success: true, data: value };
    } catch (error) {
      const storageError = classifyError(error, key);
      // Fall through to memory storage
      console.warn(`localStorage read failed for ${key}:`, error);
      const memValue = memoryStorage.get(key) ?? null;
      return {
        success: true,
        data: memValue,
        error: storageError,
        usedFallback: true,
      };
    }
  }

  // Use memory storage as fallback
  const value = memoryStorage.get(key) ?? null;
  return {
    success: true,
    data: value,
    usedFallback: true,
    error: storageCheckError ?? undefined,
  };
}

/**
 * Write to storage with fallback to memory and debouncing.
 * Handles quota exceeded by attempting cleanup.
 */
export function safeSetItem(key: string, value: string, debounce = true): StorageResult<void> {
  // Invalidate read cache immediately
  invalidateCache(key);

  // Update memory storage immediately for consistency
  memoryStorage.set(key, value);

  // If debouncing and localStorage is available, debounce the actual write
  if (debounce && isStorageAvailable()) {
    // Cancel any pending write for this key
    const pending = pendingWrites.get(key);
    if (pending) {
      clearTimeout(pending.timer);
    }

    // Schedule the actual write
    const timer = setTimeout(() => {
      pendingWrites.delete(key);
      performStorageWrite(key, value);
    }, WRITE_DEBOUNCE_MS);

    pendingWrites.set(key, { value, timer });
    return { success: true };
  }

  // Immediate write if not debouncing
  return performStorageWrite(key, value);
}

/**
 * Perform the actual storage write (internal, not debounced).
 */
function performStorageWrite(key: string, value: string): StorageResult<void> {
  if (!isStorageAvailable()) {
    return {
      success: true,
      usedFallback: true,
      error: storageCheckError ?? undefined,
    };
  }

  try {
    localStorage.setItem(key, value);
    return { success: true };
  } catch (error) {
    const storageError = classifyError(error, key);

    // If quota exceeded, try cleanup and retry
    if (storageError.type === 'quota_exceeded') {
      const cleanupResult = tryCleanupAndRetry(key, value);
      if (cleanupResult.success) {
        return cleanupResult;
      }
    }

    return {
      success: true,
      error: storageError,
      usedFallback: true,
    };
  }
}

/**
 * Flush any pending writes immediately.
 * Call this before page unload or when immediate persistence is needed.
 */
export function flushPendingWrites(): void {
  for (const [key, { value, timer }] of pendingWrites) {
    clearTimeout(timer);
    performStorageWrite(key, value);
  }
  pendingWrites.clear();
}

/**
 * Remove item from storage.
 */
export function safeRemoveItem(key: string): StorageResult<void> {
  memoryStorage.delete(key);
  invalidateCache(key);

  // Cancel any pending writes
  const pending = pendingWrites.get(key);
  if (pending) {
    clearTimeout(pending.timer);
    pendingWrites.delete(key);
  }

  if (isStorageAvailable()) {
    try {
      localStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      return {
        success: true,
        error: classifyError(error, key),
      };
    }
  }

  return { success: true };
}

// =============================================================================
// Quota Management
// =============================================================================

/**
 * Estimate localStorage usage.
 */
export function estimateStorageUsage(): {
  used: number;
  total: number;
  percentage: number;
} {
  if (!isStorageAvailable()) {
    return { used: 0, total: 0, percentage: 0 };
  }

  try {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          // Estimate size in bytes (UTF-16 = 2 bytes per char)
          used += (key.length + value.length) * 2;
        }
      }
    }

    // Most browsers allow 5-10MB, assume 5MB as safe minimum
    const total = 5 * 1024 * 1024;
    const percentage = Math.round((used / total) * 100);

    return { used, total, percentage };
  } catch {
    return { used: 0, total: 0, percentage: 0 };
  }
}

/**
 * Get storage usage for a specific key.
 */
export function getKeySize(key: string): number {
  const result = safeGetItem(key);
  if (!result.success || !result.data) return 0;
  return (key.length + result.data.length) * 2;
}

/**
 * Try to clean up old data and retry the write operation.
 */
function tryCleanupAndRetry(key: string, value: string): StorageResult<void> {
  // Strategy 1: Remove history older than 30 days
  try {
    const historyKey = 'ai-timeline-flashcard-history';
    const historyStr = localStorage.getItem(historyKey);
    if (historyStr) {
      const history = JSON.parse(historyStr);
      if (Array.isArray(history)) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffStr = thirtyDaysAgo.toISOString().split('T')[0] ?? '';

        const prunedHistory = history.filter(
          (record: { date?: string }) => record.date && record.date >= cutoffStr
        );

        if (prunedHistory.length < history.length) {
          localStorage.setItem(historyKey, JSON.stringify(prunedHistory));
        }
      }
    }

    // Retry the original write
    localStorage.setItem(key, value);
    return { success: true };
  } catch {
    // Cleanup didn't help enough
    return {
      success: false,
      error: {
        type: 'quota_exceeded',
        message: 'Storage quota exceeded even after cleanup',
        userMessage: USER_MESSAGES.quota_exceeded,
        key,
        recoverable: true,
      },
    };
  }
}

// =============================================================================
// JSON Operations with Validation
// =============================================================================

/**
 * Read and parse JSON from storage with validation and caching.
 */
export function safeGetJSON<T>(
  key: string,
  defaultValue: T,
  validator?: (data: unknown) => { success: boolean; data?: T; error?: string }
): StorageResult<T> {
  // Check read cache first for performance
  const cachedValue = getCachedValue<T>(key);
  if (cachedValue !== undefined) {
    // If validator provided, still validate cached value
    if (validator) {
      const validationResult = validator(cachedValue);
      if (validationResult.success && validationResult.data !== undefined) {
        return { success: true, data: validationResult.data };
      }
      // Cache was stale/invalid, continue to read from storage
    } else {
      return { success: true, data: cachedValue };
    }
  }

  const result = safeGetItem(key);

  if (!result.success) {
    return {
      success: true,
      data: defaultValue,
      error: result.error,
      usedFallback: result.usedFallback,
    };
  }

  if (result.data === null || result.data === undefined) {
    return {
      success: true,
      data: defaultValue,
      usedFallback: result.usedFallback,
    };
  }

  try {
    const parsed = JSON.parse(result.data);
    // Cache the parsed value for future reads
    setCachedValue(key, parsed);

    // If a validator is provided, use it
    if (validator) {
      const validationResult = validator(parsed);
      if (validationResult.success && validationResult.data !== undefined) {
        return {
          success: true,
          data: validationResult.data,
          usedFallback: result.usedFallback,
        };
      } else {
        // Data is corrupted/invalid, return default
        return {
          success: true,
          data: defaultValue,
          error: {
            type: 'corrupted_data',
            message: validationResult.error || 'Validation failed',
            userMessage: USER_MESSAGES.corrupted_data,
            key,
            recoverable: true,
          },
          usedFallback: result.usedFallback,
        };
      }
    }

    return {
      success: true,
      data: parsed as T,
      usedFallback: result.usedFallback,
    };
  } catch (error) {
    // JSON parse error - data is corrupted
    return {
      success: true,
      data: defaultValue,
      error: {
        type: 'corrupted_data',
        message: error instanceof Error ? error.message : 'Parse error',
        userMessage: USER_MESSAGES.corrupted_data,
        key,
        recoverable: true,
      },
      usedFallback: result.usedFallback,
    };
  }
}

/**
 * Stringify and save JSON to storage with caching.
 */
export function safeSetJSON<T>(key: string, value: T): StorageResult<void> {
  try {
    // Update read cache immediately for consistency
    setCachedValue(key, value);

    const json = JSON.stringify(value);
    return safeSetItem(key, json);
  } catch (error) {
    // Invalidate cache on error
    invalidateCache(key);
    return {
      success: false,
      error: {
        type: 'write_error',
        message: error instanceof Error ? error.message : 'Stringify error',
        userMessage: USER_MESSAGES.write_error,
        key,
        recoverable: false,
      },
    };
  }
}

// =============================================================================
// Data Recovery
// =============================================================================

/**
 * Attempt to recover corrupted JSON data.
 * Tries multiple strategies to extract usable data.
 */
export function attemptDataRecovery<T>(
  key: string,
  defaultValue: T,
  partialValidator?: (item: unknown) => boolean
): StorageResult<T> {
  const result = safeGetItem(key);

  if (!result.success || !result.data) {
    return { success: true, data: defaultValue };
  }

  const rawData = result.data;

  // Strategy 1: Try normal JSON parse
  try {
    const parsed = JSON.parse(rawData);
    return { success: true, data: parsed as T };
  } catch {
    // Continue to recovery strategies
  }

  // Strategy 2: Try to fix common JSON issues
  try {
    // Remove trailing commas
    let fixed = rawData.replace(/,\s*([\]}])/g, '$1');
    // Fix unquoted keys (simple case)
    fixed = fixed.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    const parsed = JSON.parse(fixed);
    return {
      success: true,
      data: parsed as T,
      error: {
        type: 'corrupted_data',
        message: 'Data was repaired automatically',
        userMessage: 'Your data had some issues but was automatically repaired.',
        key,
        recoverable: true,
      },
    };
  } catch {
    // Continue to next strategy
  }

  // Strategy 3: If it's an array, try to recover individual items
  if (rawData.trim().startsWith('[') && partialValidator) {
    try {
      // Try to find valid JSON objects in the string
      const objectMatches = rawData.match(/\{[^{}]*\}/g);
      if (objectMatches) {
        const recoveredItems: unknown[] = [];
        for (const match of objectMatches) {
          try {
            const item = JSON.parse(match);
            if (partialValidator(item)) {
              recoveredItems.push(item);
            }
          } catch {
            // Skip invalid items
          }
        }
        if (recoveredItems.length > 0) {
          return {
            success: true,
            data: recoveredItems as T,
            error: {
              type: 'corrupted_data',
              message: `Recovered ${recoveredItems.length} items from corrupted data`,
              userMessage: `Some of your data was corrupted. We recovered ${recoveredItems.length} items.`,
              key,
              recoverable: true,
            },
          };
        }
      }
    } catch {
      // Recovery failed
    }
  }

  // All recovery strategies failed
  return {
    success: true,
    data: defaultValue,
    error: {
      type: 'corrupted_data',
      message: 'Could not recover data',
      userMessage: USER_MESSAGES.corrupted_data,
      key,
      recoverable: false,
    },
  };
}

// =============================================================================
// Storage Health Check
// =============================================================================

export interface StorageHealthReport {
  available: boolean;
  usagePercentage: number;
  usedBytes: number;
  errors: StorageError[];
  recommendations: string[];
}

/**
 * Perform a comprehensive storage health check.
 */
export function checkStorageHealth(keys: string[]): StorageHealthReport {
  const errors: StorageError[] = [];
  const recommendations: string[] = [];

  const available = isStorageAvailable();
  if (!available && storageCheckError) {
    errors.push(storageCheckError);
    recommendations.push('Enable localStorage in your browser settings');
  }

  const usage = estimateStorageUsage();

  if (usage.percentage > 80) {
    recommendations.push(
      'Storage is over 80% full. Consider exporting your data and clearing old history.'
    );
  }

  // Check each key for corruption
  for (const key of keys) {
    const result = safeGetItem(key);
    if (result.data) {
      try {
        JSON.parse(result.data);
      } catch {
        errors.push({
          type: 'corrupted_data',
          message: `Data in ${key} is corrupted`,
          userMessage: `Some stored data appears to be corrupted.`,
          key,
          recoverable: true,
        });
        recommendations.push(`Consider clearing and re-importing your ${key} data`);
      }
    }
  }

  return {
    available,
    usagePercentage: usage.percentage,
    usedBytes: usage.used,
    errors,
    recommendations,
  };
}

// =============================================================================
// Global Error Handler
// =============================================================================

let globalErrorCallback: StorageErrorCallback | null = null;

/**
 * Set a global callback for storage errors.
 * Useful for showing toast notifications.
 */
export function setStorageErrorCallback(callback: StorageErrorCallback | null): void {
  globalErrorCallback = callback;
}

/**
 * Notify the global error callback if set.
 */
export function notifyStorageError(error: StorageError): void {
  if (globalErrorCallback) {
    globalErrorCallback(error);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Clear all flashcard-related data from storage.
 * Returns list of keys that were cleared.
 */
export function clearFlashcardStorage(): string[] {
  const flashcardKeys = [
    'ai-timeline-flashcards',
    'ai-timeline-flashcard-packs',
    'ai-timeline-flashcard-stats',
    'ai-timeline-flashcard-sessions',
    'ai-timeline-flashcard-history',
    'ai-timeline-flashcard-streak',
    'ai-timeline-flashcard-schema-version',
  ];

  const clearedKeys: string[] = [];

  for (const key of flashcardKeys) {
    const result = safeRemoveItem(key);
    if (result.success) {
      clearedKeys.push(key);
    }
  }

  // Also clear from memory storage
  for (const key of flashcardKeys) {
    memoryStorage.delete(key);
  }

  return clearedKeys;
}

/**
 * Export all flashcard data as a backup before clearing.
 */
export function createBackup(): Record<string, string> {
  const backup: Record<string, string> = {};
  const flashcardKeys = [
    'ai-timeline-flashcards',
    'ai-timeline-flashcard-packs',
    'ai-timeline-flashcard-stats',
    'ai-timeline-flashcard-sessions',
    'ai-timeline-flashcard-history',
    'ai-timeline-flashcard-streak',
  ];

  for (const key of flashcardKeys) {
    const result = safeGetItem(key);
    if (result.success && result.data) {
      backup[key] = result.data;
    }
  }

  return backup;
}

/**
 * Restore data from a backup.
 */
export function restoreBackup(backup: Record<string, string>): StorageResult<void> {
  const errors: StorageError[] = [];

  for (const [key, value] of Object.entries(backup)) {
    const result = safeSetItem(key, value);
    if (result.error) {
      errors.push(result.error);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: {
        type: 'write_error',
        message: `Failed to restore ${errors.length} items`,
        userMessage: 'Some data could not be restored. Please try again.',
        recoverable: true,
      },
    };
  }

  return { success: true };
}

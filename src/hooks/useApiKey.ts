/**
 * useApiKey Hook
 *
 * Provides access to API key state and management functions.
 * This hook is the main interface for components to interact with
 * the API key system.
 *
 * Usage:
 *   const { hasKey, promptForKey } = useApiKey();
 *   if (!hasKey) { promptForKey(); return; }
 */

import { useState, useCallback, useEffect } from 'react';
import { apiKeyService } from '../services/apiKeyService';

/**
 * API Key state
 */
export interface ApiKeyState {
  /** Whether a valid key exists in storage */
  hasKey: boolean;
  /** Whether user has opted out of AI features */
  hasOptedOut: boolean;
  /** Last 4 characters of stored key */
  keyFingerprint: string | null;
  /** When the key was stored */
  storedAt: string | null;
  /** Whether key is currently being validated */
  isValidating: boolean;
  /** Current validation error if any */
  validationError: string | null;
}

/**
 * API Key actions
 */
export interface ApiKeyActions {
  /** Open the API key modal */
  promptForKey: () => void;
  /** Save a new API key */
  saveKey: (key: string) => Promise<boolean>;
  /** Remove the stored key */
  removeKey: () => void;
  /** Set opt-out preference */
  setOptOut: (optOut: boolean) => void;
  /** Refresh state from storage */
  refresh: () => void;
}

export type UseApiKeyReturn = ApiKeyState & ApiKeyActions & {
  /** Whether the modal should be shown */
  showModal: boolean;
  /** Close the modal */
  closeModal: () => void;
};

/**
 * Hook for managing API key state and interactions
 */
export function useApiKey(): UseApiKeyReturn {
  // Initialize state from storage (synchronous check)
  const [hasKey, setHasKey] = useState(() => apiKeyService.hasKey());
  const [hasOptedOut, setHasOptedOut] = useState(() => apiKeyService.hasOptedOut());
  const [keyFingerprint, setKeyFingerprint] = useState(() => apiKeyService.getKeyFingerprint());
  const [storedAt, setStoredAt] = useState(() => apiKeyService.getStoredAt());
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Refresh state from storage
  const refresh = useCallback(() => {
    setHasKey(apiKeyService.hasKey());
    setHasOptedOut(apiKeyService.hasOptedOut());
    setKeyFingerprint(apiKeyService.getKeyFingerprint());
    setStoredAt(apiKeyService.getStoredAt());
    setValidationError(null);
  }, []);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('ai_timeline_api')) {
        refresh();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refresh]);

  // Open modal only if no key and not opted out
  const promptForKey = useCallback(() => {
    if (hasKey || hasOptedOut) {
      return; // Already have key or opted out - don't show modal
    }
    setShowModal(true);
  }, [hasKey, hasOptedOut]);

  // Close modal
  const closeModal = useCallback(() => {
    setShowModal(false);
    setValidationError(null);
  }, []);

  // Save a new API key
  const saveKey = useCallback(async (key: string): Promise<boolean> => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const result = await apiKeyService.saveKey(key);

      if (result.success) {
        setHasKey(true);
        setKeyFingerprint(apiKeyService.getKeyFingerprint());
        setStoredAt(apiKeyService.getStoredAt());
        setShowModal(false);
        return true;
      } else {
        setValidationError(result.error || 'Failed to save key');
        return false;
      }
    } catch (error) {
      setValidationError('An unexpected error occurred');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Remove the stored key
  const removeKey = useCallback(() => {
    apiKeyService.removeKey();
    setHasKey(false);
    setKeyFingerprint(null);
    setStoredAt(null);
  }, []);

  // Set opt-out preference
  const setOptOut = useCallback((optOut: boolean) => {
    apiKeyService.setOptOut(optOut);
    setHasOptedOut(optOut);
    if (optOut) {
      setShowModal(false);
    }
  }, []);

  return {
    // State
    hasKey,
    hasOptedOut,
    keyFingerprint,
    storedAt,
    isValidating,
    validationError,
    showModal,
    // Actions
    promptForKey,
    closeModal,
    saveKey,
    removeKey,
    setOptOut,
    refresh,
  };
}

export default useApiKey;

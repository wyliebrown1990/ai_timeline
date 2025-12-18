/**
 * useStudySettings Hook
 *
 * Manages study session settings stored in localStorage.
 * Handles:
 * - Sound effects toggle (off by default)
 * - Reduce motion option (respects system preference by default)
 * - High contrast mode (respects system preference by default)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { safeGetJSON, safeSetJSON, isStorageAvailable } from '../lib/storage';

// =============================================================================
// Types
// =============================================================================

export interface StudySettings {
  /** Whether sound effects are enabled (default: false) */
  soundEnabled: boolean;
  /** Reduce motion preference: 'system' | true | false */
  reduceMotion: 'system' | boolean;
  /** High contrast preference: 'system' | true | false */
  highContrast: 'system' | boolean;
}

const STORAGE_KEY = 'ai-timeline-study-settings';

const DEFAULT_SETTINGS: StudySettings = {
  soundEnabled: false,
  reduceMotion: 'system',
  highContrast: 'system',
};

// =============================================================================
// System Preference Detection
// =============================================================================

/**
 * Check if system prefers reduced motion.
 */
function getSystemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if system prefers high contrast.
 */
function getSystemPrefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for managing study session settings with localStorage persistence.
 * Respects system preferences for accessibility options.
 */
export function useStudySettings() {
  const [settings, setSettings] = useState<StudySettings>(() => {
    if (!isStorageAvailable()) {
      return DEFAULT_SETTINGS;
    }

    const result = safeGetJSON<Partial<StudySettings>>(STORAGE_KEY, {});
    return { ...DEFAULT_SETTINGS, ...result.data };
  });

  // Track system preferences
  const [systemReducedMotion, setSystemReducedMotion] = useState(getSystemPrefersReducedMotion);
  const [systemHighContrast, setSystemHighContrast] = useState(getSystemPrefersHighContrast);

  // Listen for system preference changes
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setSystemReducedMotion(e.matches);
    };

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setSystemHighContrast(e.matches);
    };

    motionQuery.addEventListener('change', handleMotionChange);
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  // Persist to localStorage when settings change
  useEffect(() => {
    safeSetJSON(STORAGE_KEY, settings);
  }, [settings]);

  /**
   * Toggle sound effects on/off.
   */
  const toggleSound = useCallback(() => {
    setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  /**
   * Toggle reduce motion setting.
   */
  const toggleReduceMotion = useCallback(() => {
    setSettings((prev) => {
      // Cycle through: system -> true -> false -> system
      if (prev.reduceMotion === 'system') return { ...prev, reduceMotion: true };
      if (prev.reduceMotion === true) return { ...prev, reduceMotion: false };
      return { ...prev, reduceMotion: 'system' };
    });
  }, []);

  /**
   * Toggle high contrast setting.
   */
  const toggleHighContrast = useCallback(() => {
    setSettings((prev) => {
      // Cycle through: system -> true -> false -> system
      if (prev.highContrast === 'system') return { ...prev, highContrast: true };
      if (prev.highContrast === true) return { ...prev, highContrast: false };
      return { ...prev, highContrast: 'system' };
    });
  }, []);

  /**
   * Update a specific setting.
   */
  const updateSetting = useCallback(<K extends keyof StudySettings>(
    key: K,
    value: StudySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Computed: effective reduce motion value (resolves 'system' to actual value).
   */
  const prefersReducedMotion = useMemo(() => {
    if (settings.reduceMotion === 'system') {
      return systemReducedMotion;
    }
    return settings.reduceMotion;
  }, [settings.reduceMotion, systemReducedMotion]);

  /**
   * Computed: effective high contrast value (resolves 'system' to actual value).
   */
  const prefersHighContrast = useMemo(() => {
    if (settings.highContrast === 'system') {
      return systemHighContrast;
    }
    return settings.highContrast;
  }, [settings.highContrast, systemHighContrast]);

  return {
    settings,
    toggleSound,
    toggleReduceMotion,
    toggleHighContrast,
    updateSetting,
    // Computed values for easy use
    prefersReducedMotion,
    prefersHighContrast,
  };
}

/**
 * Haptic Service (Sprint Feed-6)
 *
 * Provides haptic feedback for user interactions.
 * Uses the Vibration API on supported devices.
 */

/**
 * Vibration patterns (in milliseconds)
 */
const PATTERNS = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 10],
  error: [50, 30, 50],
  double: [10, 30, 10],
};

/**
 * Check if haptics are supported
 */
function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Get haptic preference from localStorage
 */
function isEnabled(): boolean {
  try {
    const stored = localStorage.getItem('ai_timeline_haptics_enabled');
    // Default to enabled if not set
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

/**
 * Trigger a vibration pattern
 */
function vibrate(pattern: number[]): void {
  if (!isSupported() || !isEnabled()) return;

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    // Silently fail - haptics are a nice-to-have
    console.debug('Haptic feedback failed:', error);
  }
}

/**
 * Haptic Service singleton
 */
export const hapticService = {
  /**
   * Check if haptics are supported on this device
   */
  isSupported,

  /**
   * Check if haptics are enabled
   */
  isEnabled,

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    try {
      localStorage.setItem('ai_timeline_haptics_enabled', String(enabled));
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Light tap feedback - quick, subtle
   * Use for: Swipe complete, share button tap
   */
  light(): void {
    vibrate(PATTERNS.light);
  },

  /**
   * Medium tap feedback - standard interaction
   * Use for: Vote, save, menu open
   */
  medium(): void {
    vibrate(PATTERNS.medium);
  },

  /**
   * Heavy tap feedback - important action
   * Use for: Delete, confirm action
   */
  heavy(): void {
    vibrate(PATTERNS.heavy);
  },

  /**
   * Success feedback - positive outcome
   * Use for: Quiz correct, achievement, save success
   */
  success(): void {
    vibrate(PATTERNS.success);
  },

  /**
   * Error feedback - negative outcome
   * Use for: Quiz wrong, failed action
   */
  error(): void {
    vibrate(PATTERNS.error);
  },

  /**
   * Double tap feedback
   * Use for: Double-tap to save
   */
  double(): void {
    vibrate(PATTERNS.double);
  },

  /**
   * Custom pattern
   */
  custom(pattern: number[]): void {
    vibrate(pattern);
  },

  /**
   * Stop any ongoing vibration
   */
  stop(): void {
    if (isSupported()) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  },
};

export default hapticService;

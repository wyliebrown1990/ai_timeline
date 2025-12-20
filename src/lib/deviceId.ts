/**
 * Device ID Generation Utility
 *
 * Generates and manages a unique device ID for user session identification.
 * Used to link anonymous browser sessions to database records for cross-device sync.
 *
 * Sprint 38 - User Data Migration
 */

// =============================================================================
// Constants
// =============================================================================

// localStorage key for storing the device ID
const DEVICE_ID_KEY = 'ai-timeline-device-id';

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Generate a unique device ID combining UUID with browser fingerprinting.
 * Creates a stable identifier that persists across browser sessions.
 *
 * Format: {fingerprint}-{uuid}-{timestamp}
 * Example: "MTkyMHgx-550e8400-e29b-41d4-a716-446655440000-lq2x7k"
 */
function generateDeviceId(): string {
  // Generate cryptographically secure random UUID
  const random = crypto.randomUUID();

  // Base36 timestamp for uniqueness and compactness
  const timestamp = Date.now().toString(36);

  // Collect browser fingerprint data for additional uniqueness
  const screen = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;

  // Create a compact fingerprint hash (first 8 chars of base64 encoding)
  const fingerprintData = `${screen}-${timezone}-${language}`;
  const fingerprint = btoa(fingerprintData).slice(0, 8);

  return `${fingerprint}-${random}-${timestamp}`;
}

/**
 * Get or generate a unique device ID for this browser.
 * First checks localStorage for an existing ID, generates a new one if not found.
 *
 * @returns The device ID string
 */
export function getDeviceId(): string {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    // Server-side or non-browser environment - generate a temporary ID
    return `temp-${crypto.randomUUID()}`;
  }

  // Try to retrieve existing device ID from localStorage
  try {
    const existingId = localStorage.getItem(DEVICE_ID_KEY);
    if (existingId) {
      return existingId;
    }
  } catch (error) {
    // localStorage access failed (e.g., private browsing mode)
    console.warn('Could not access localStorage for device ID:', error);
    // Generate a temporary ID that won't persist
    return `temp-${crypto.randomUUID()}`;
  }

  // Generate new device ID
  const deviceId = generateDeviceId();

  // Persist to localStorage
  try {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  } catch (error) {
    // Storage failed but we can still use the generated ID for this session
    console.warn('Could not persist device ID to localStorage:', error);
  }

  return deviceId;
}

/**
 * Check if a device ID already exists in localStorage.
 * Useful for determining if this is a new or returning user.
 *
 * @returns true if a device ID exists, false otherwise
 */
export function hasDeviceId(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }

  try {
    return localStorage.getItem(DEVICE_ID_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Clear the device ID from localStorage.
 * Use for testing, user logout, or when user requests data deletion.
 *
 * WARNING: This will break the link between the browser and any stored
 * user data in the database. The user will start a fresh session.
 */
export function clearDeviceId(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(DEVICE_ID_KEY);
  } catch (error) {
    console.warn('Could not clear device ID from localStorage:', error);
  }
}

/**
 * Check if a device ID appears to be temporary (not persisted).
 * Temporary IDs start with "temp-" and are generated when localStorage
 * is unavailable.
 *
 * @param deviceId - The device ID to check
 * @returns true if the device ID is temporary
 */
export function isTemporaryDeviceId(deviceId: string): boolean {
  return deviceId.startsWith('temp-');
}

/**
 * Extract the creation timestamp from a device ID.
 * Returns null if the ID format is invalid.
 *
 * @param deviceId - The device ID to parse
 * @returns Date object of when the ID was created, or null if invalid
 */
export function getDeviceIdCreationDate(deviceId: string): Date | null {
  // Skip temporary IDs
  if (isTemporaryDeviceId(deviceId)) {
    return null;
  }

  // Device ID format: {fingerprint}-{uuid}-{timestamp}
  // UUID contains 4 hyphens, so the timestamp is after the 5th hyphen
  const parts = deviceId.split('-');

  // We expect: fingerprint + 5 UUID parts + timestamp = 7 parts minimum
  if (parts.length < 7) {
    return null;
  }

  // The timestamp is the last part
  const timestampStr = parts[parts.length - 1];
  if (!timestampStr) {
    return null;
  }

  try {
    // Parse base36 timestamp back to milliseconds
    const timestamp = parseInt(timestampStr, 36);
    if (isNaN(timestamp)) {
      return null;
    }
    return new Date(timestamp);
  } catch {
    return null;
  }
}

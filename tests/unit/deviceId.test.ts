/**
 * Device ID Utility Tests
 *
 * Sprint 38 - User Data Migration
 */

import {
  getDeviceId,
  hasDeviceId,
  clearDeviceId,
  isTemporaryDeviceId,
  getDeviceIdCreationDate,
} from '../../src/lib/deviceId';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

// Mock crypto.randomUUID
const mockUUID = '550e8400-e29b-41d4-a716-446655440000';
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => mockUUID),
  },
});

describe('Device ID Utility', () => {
  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.clear();
    jest.clearAllMocks();

    // Assign mocked localStorage to window
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  describe('getDeviceId', () => {
    it('should generate a new device ID when none exists', () => {
      const deviceId = getDeviceId();

      expect(deviceId).toBeTruthy();
      expect(typeof deviceId).toBe('string');
      expect(deviceId.length).toBeGreaterThan(0);
    });

    it('should return existing device ID from localStorage', () => {
      const existingId = 'existing-device-id-12345';
      localStorageMock.setItem('ai-timeline-device-id', existingId);

      const deviceId = getDeviceId();

      expect(deviceId).toBe(existingId);
    });

    it('should store new device ID in localStorage', () => {
      getDeviceId();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ai-timeline-device-id',
        expect.any(String)
      );
    });

    it('should include UUID in generated device ID', () => {
      const deviceId = getDeviceId();

      expect(deviceId).toContain(mockUUID);
    });
  });

  describe('hasDeviceId', () => {
    it('should return false when no device ID exists', () => {
      expect(hasDeviceId()).toBe(false);
    });

    it('should return true when device ID exists', () => {
      localStorageMock.setItem('ai-timeline-device-id', 'test-id');

      expect(hasDeviceId()).toBe(true);
    });
  });

  describe('clearDeviceId', () => {
    it('should remove device ID from localStorage', () => {
      localStorageMock.setItem('ai-timeline-device-id', 'test-id');

      clearDeviceId();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'ai-timeline-device-id'
      );
    });

    it('should not throw when no device ID exists', () => {
      expect(() => clearDeviceId()).not.toThrow();
    });
  });

  describe('isTemporaryDeviceId', () => {
    it('should return true for temporary device IDs', () => {
      expect(isTemporaryDeviceId('temp-12345')).toBe(true);
      expect(isTemporaryDeviceId('temp-550e8400-e29b-41d4')).toBe(true);
    });

    it('should return false for permanent device IDs', () => {
      expect(isTemporaryDeviceId('MTkyMHgx-550e8400-e29b-41d4-a716-446655440000-lq2x7k')).toBe(false);
      expect(isTemporaryDeviceId('fingerprint-uuid-timestamp')).toBe(false);
    });
  });

  describe('getDeviceIdCreationDate', () => {
    it('should return null for temporary device IDs', () => {
      expect(getDeviceIdCreationDate('temp-12345')).toBeNull();
    });

    it('should return null for invalid device ID formats', () => {
      expect(getDeviceIdCreationDate('invalid')).toBeNull();
      expect(getDeviceIdCreationDate('too-short')).toBeNull();
    });

    it('should parse valid device ID creation date', () => {
      // Create a device ID with a known timestamp
      const timestamp = Date.now();
      const timestampBase36 = timestamp.toString(36);
      const deviceId = `MTkyMHgx-550e8400-e29b-41d4-a716-446655440000-${timestampBase36}`;

      const date = getDeviceIdCreationDate(deviceId);

      expect(date).toBeInstanceOf(Date);
      expect(date?.getTime()).toBe(timestamp);
    });

    it('should return null for malformed timestamp', () => {
      const deviceId = 'MTkyMHgx-550e8400-e29b-41d4-a716-446655440000-!!!invalid!!!';

      const date = getDeviceIdCreationDate(deviceId);

      expect(date).toBeNull();
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage.getItem throwing an error', () => {
      localStorageMock.getItem = jest.fn(() => {
        throw new Error('Storage access denied');
      });

      // Should return a temporary ID instead of throwing
      const deviceId = getDeviceId();

      expect(deviceId).toBeTruthy();
      expect(isTemporaryDeviceId(deviceId)).toBe(true);
    });

    it('should handle localStorage.setItem throwing an error', () => {
      localStorageMock.setItem = jest.fn(() => {
        throw new Error('Quota exceeded');
      });

      // Should still return a device ID
      const deviceId = getDeviceId();

      expect(deviceId).toBeTruthy();
    });
  });
});

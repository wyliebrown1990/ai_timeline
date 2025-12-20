/**
 * Session Context Tests
 *
 * Sprint 38 - User Data Migration
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SessionProvider, useSession } from '../../src/contexts/SessionContext';

// Mock the deviceId module
jest.mock('../../src/lib/deviceId', () => ({
  getDeviceId: jest.fn(() => 'test-device-123'),
}));

// Mock the API module
const mockGetOrCreateSession = jest.fn();
const mockMigrateLocalStorageData = jest.fn();

jest.mock('../../src/services/api', () => ({
  userSessionApi: {
    getOrCreateSession: (...args: unknown[]) => mockGetOrCreateSession(...args),
    migrateLocalStorageData: (...args: unknown[]) => mockMigrateLocalStorageData(...args),
  },
}));

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
    _getStore: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test component that uses the hook
function TestConsumer() {
  const { sessionId, isLoading, error, isReady } = useSession();
  return (
    <div>
      <span data-testid="session-id">{sessionId ?? 'null'}</span>
      <span data-testid="is-loading">{isLoading.toString()}</span>
      <span data-testid="error">{error?.message ?? 'null'}</span>
      <span data-testid="is-ready">{isReady.toString()}</span>
    </div>
  );
}

describe('SessionContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('SessionProvider', () => {
    it('initializes session on mount', async () => {
      mockGetOrCreateSession.mockResolvedValueOnce({
        sessionId: 'session-abc-123',
        deviceId: 'test-device-123',
        isNewSession: true,
      });

      render(
        <SessionProvider>
          <TestConsumer />
        </SessionProvider>
      );

      // Initially loading
      expect(screen.getByTestId('is-loading').textContent).toBe('true');

      // Wait for session to be established
      await waitFor(() => {
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('session-id').textContent).toBe('session-abc-123');
      expect(screen.getByTestId('is-ready').textContent).toBe('true');
      expect(screen.getByTestId('error').textContent).toBe('null');
    });

    it('handles session creation error', async () => {
      mockGetOrCreateSession.mockRejectedValueOnce(new Error('Network error'));

      render(
        <SessionProvider>
          <TestConsumer />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('session-id').textContent).toBe('null');
      expect(screen.getByTestId('is-ready').textContent).toBe('false');
      expect(screen.getByTestId('error').textContent).toBe('Network error');
    });

    it('marks migration complete even when no data to migrate', async () => {
      mockGetOrCreateSession.mockResolvedValueOnce({
        sessionId: 'session-abc-123',
        deviceId: 'test-device-123',
        isNewSession: true,
      });

      render(
        <SessionProvider>
          <TestConsumer />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-ready').textContent).toBe('true');
      });

      // Migration should be marked complete
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ai-timeline-data-migrated',
        'true'
      );
      // No migration API call should be made
      expect(mockMigrateLocalStorageData).not.toHaveBeenCalled();
    });

    it('migrates localStorage data when present', async () => {
      // Set up localStorage with data to migrate
      localStorageMock.setItem(
        'ai-timeline-flashcards',
        JSON.stringify([{ sourceType: 'milestone', sourceId: 'test-1' }])
      );

      mockGetOrCreateSession.mockResolvedValueOnce({
        sessionId: 'session-abc-123',
        deviceId: 'test-device-123',
        isNewSession: true,
      });

      mockMigrateLocalStorageData.mockResolvedValueOnce({
        message: 'Migration complete',
        sessionId: 'session-abc-123',
        results: { flashcards: 1, packs: 0 },
      });

      render(
        <SessionProvider>
          <TestConsumer />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-ready').textContent).toBe('true');
      });

      // Migration API should be called with the data
      expect(mockMigrateLocalStorageData).toHaveBeenCalledWith('test-device-123', {
        flashcards: [{ sourceType: 'milestone', sourceId: 'test-1' }],
        packs: [],
        stats: {},
        streakHistory: {},
        profile: {},
      });

      // Migration should be marked complete
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ai-timeline-data-migrated',
        'true'
      );
    });

    it('skips migration if already completed', async () => {
      // Set migration flag
      localStorageMock.setItem('ai-timeline-data-migrated', 'true');

      // Set up localStorage with data (should not be migrated)
      localStorageMock.setItem(
        'ai-timeline-flashcards',
        JSON.stringify([{ sourceType: 'milestone', sourceId: 'test-1' }])
      );

      mockGetOrCreateSession.mockResolvedValueOnce({
        sessionId: 'session-abc-123',
        deviceId: 'test-device-123',
        isNewSession: false,
      });

      render(
        <SessionProvider>
          <TestConsumer />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-ready').textContent).toBe('true');
      });

      // Migration API should NOT be called
      expect(mockMigrateLocalStorageData).not.toHaveBeenCalled();
    });

    it('provides retry functionality', async () => {
      // First call fails
      mockGetOrCreateSession.mockRejectedValueOnce(new Error('Network error'));

      function RetryTestConsumer() {
        const { sessionId, error, retry } = useSession();
        return (
          <div>
            <span data-testid="session-id">{sessionId ?? 'null'}</span>
            <span data-testid="error">{error?.message ?? 'null'}</span>
            <button data-testid="retry-button" onClick={retry}>
              Retry
            </button>
          </div>
        );
      }

      render(
        <SessionProvider>
          <RetryTestConsumer />
        </SessionProvider>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('error').textContent).toBe('Network error');
      });

      // Second call succeeds
      mockGetOrCreateSession.mockResolvedValueOnce({
        sessionId: 'session-xyz-789',
        deviceId: 'test-device-123',
        isNewSession: true,
      });

      // Click retry
      await act(async () => {
        screen.getByTestId('retry-button').click();
      });

      // Wait for success
      await waitFor(() => {
        expect(screen.getByTestId('session-id').textContent).toBe('session-xyz-789');
      });

      expect(screen.getByTestId('error').textContent).toBe('null');
    });
  });

  describe('useSession hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useSession must be used within a SessionProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('localStorage data collection', () => {
    it('handles invalid JSON in localStorage gracefully', async () => {
      // Set up invalid JSON
      localStorageMock.setItem('ai-timeline-flashcards', 'not valid json');

      mockGetOrCreateSession.mockResolvedValueOnce({
        sessionId: 'session-abc-123',
        deviceId: 'test-device-123',
        isNewSession: true,
      });

      render(
        <SessionProvider>
          <TestConsumer />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-ready').textContent).toBe('true');
      });

      // Should not crash, and should not try to migrate invalid data
      expect(mockMigrateLocalStorageData).not.toHaveBeenCalled();
    });

    it('collects all relevant localStorage data', async () => {
      // Set up localStorage with various data
      localStorageMock.setItem(
        'ai-timeline-flashcards',
        JSON.stringify([{ sourceType: 'milestone', sourceId: 'test-1' }])
      );
      localStorageMock.setItem(
        'ai-timeline-flashcard-packs',
        JSON.stringify([{ id: 'pack-1', name: 'My Pack' }])
      );
      localStorageMock.setItem(
        'ai-timeline-flashcard-stats',
        JSON.stringify({ totalCards: 5 })
      );
      localStorageMock.setItem(
        'ai-timeline-flashcard-streak',
        JSON.stringify({ currentStreak: 3 })
      );
      localStorageMock.setItem(
        'ai-timeline-user-profile',
        JSON.stringify({ expertiseLevel: 'beginner' })
      );

      mockGetOrCreateSession.mockResolvedValueOnce({
        sessionId: 'session-abc-123',
        deviceId: 'test-device-123',
        isNewSession: true,
      });

      mockMigrateLocalStorageData.mockResolvedValueOnce({
        message: 'Migration complete',
        sessionId: 'session-abc-123',
        results: { flashcards: 1, packs: 1 },
      });

      render(
        <SessionProvider>
          <TestConsumer />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-ready').textContent).toBe('true');
      });

      // Verify all data was collected
      expect(mockMigrateLocalStorageData).toHaveBeenCalledWith('test-device-123', {
        flashcards: [{ sourceType: 'milestone', sourceId: 'test-1' }],
        packs: [{ id: 'pack-1', name: 'My Pack' }],
        stats: { totalCards: 5 },
        streakHistory: { currentStreak: 3 },
        profile: { expertiseLevel: 'beginner' },
      });
    });
  });
});

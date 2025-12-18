/**
 * Data Export/Import Tests
 *
 * Tests for data export and management functions in flashcardStats.ts including:
 * - Export data structure
 * - Clear all data
 * - Data summary
 */

import {
  exportAllFlashcardData,
  clearAllFlashcardData,
  getDataSummary,
} from '../../../src/lib/flashcardStats';
import { FLASHCARD_STORAGE_KEYS } from '../../../src/types/flashcard';

// =============================================================================
// Test Setup
// =============================================================================

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
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
    key: jest.fn((index: number) => Object.keys(store)[index] ?? null),
    resetStore: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

beforeEach(() => {
  localStorageMock.resetStore();
  jest.clearAllMocks();
});

// =============================================================================
// exportAllFlashcardData Tests
// =============================================================================

describe('exportAllFlashcardData', () => {
  it('should return export structure with version and timestamp', () => {
    const result = exportAllFlashcardData();

    expect(result.version).toBe(1);
    expect(result.exportedAt).toBeDefined();
    expect(new Date(result.exportedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should include empty arrays when no data exists', () => {
    const result = exportAllFlashcardData();

    expect(result.cards).toEqual([]);
    expect(result.packs).toEqual([]);
    expect(result.reviewHistory).toEqual([]);
  });

  it('should include cards from localStorage', () => {
    const mockCards = [
      { id: 'card-1', sourceType: 'milestone', sourceId: 'E2017_TRANSFORMER' },
      { id: 'card-2', sourceType: 'concept', sourceId: 'C_ATTENTION' },
    ];
    localStorageMock.setItem(
      FLASHCARD_STORAGE_KEYS.CARDS,
      JSON.stringify({ cards: mockCards, schemaVersion: 1 })
    );

    const result = exportAllFlashcardData();

    expect(result.cards).toEqual(mockCards);
  });

  it('should include packs from localStorage', () => {
    const mockPacks = [
      { id: 'pack-1', name: 'My Pack', color: '#3B82F6' },
    ];
    localStorageMock.setItem(
      FLASHCARD_STORAGE_KEYS.PACKS,
      JSON.stringify({ packs: mockPacks, schemaVersion: 1 })
    );

    const result = exportAllFlashcardData();

    expect(result.packs).toEqual(mockPacks);
  });

  it('should include stats from localStorage', () => {
    const mockStats = {
      totalCards: 10,
      currentStreak: 5,
      longestStreak: 10,
    };
    localStorageMock.setItem(
      FLASHCARD_STORAGE_KEYS.STATS,
      JSON.stringify(mockStats)
    );

    const result = exportAllFlashcardData();

    expect(result.stats).toEqual(mockStats);
  });

  it('should include streak history', () => {
    const mockStreakHistory = {
      currentStreak: 5,
      longestStreak: 10,
      lastStudyDate: '2024-01-15',
      achievements: [{ milestone: 7, achievedAt: '2024-01-10T12:00:00Z' }],
    };
    localStorageMock.setItem(
      FLASHCARD_STORAGE_KEYS.STREAK,
      JSON.stringify(mockStreakHistory)
    );

    const result = exportAllFlashcardData();

    expect(result.streakHistory.currentStreak).toBe(5);
    expect(result.streakHistory.longestStreak).toBe(10);
  });
});

// =============================================================================
// clearAllFlashcardData Tests
// =============================================================================

describe('clearAllFlashcardData', () => {
  it('should remove all flashcard storage keys', () => {
    // Set up some data
    localStorageMock.setItem(FLASHCARD_STORAGE_KEYS.CARDS, '[]');
    localStorageMock.setItem(FLASHCARD_STORAGE_KEYS.PACKS, '[]');
    localStorageMock.setItem(FLASHCARD_STORAGE_KEYS.STATS, '{}');
    localStorageMock.setItem(FLASHCARD_STORAGE_KEYS.HISTORY, '[]');
    localStorageMock.setItem(FLASHCARD_STORAGE_KEYS.STREAK, '{}');

    clearAllFlashcardData();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(FLASHCARD_STORAGE_KEYS.CARDS);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(FLASHCARD_STORAGE_KEYS.PACKS);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(FLASHCARD_STORAGE_KEYS.STATS);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(FLASHCARD_STORAGE_KEYS.HISTORY);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(FLASHCARD_STORAGE_KEYS.STREAK);
  });

  it('should remove sessions storage key', () => {
    localStorageMock.setItem(FLASHCARD_STORAGE_KEYS.SESSIONS, '[]');

    clearAllFlashcardData();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(FLASHCARD_STORAGE_KEYS.SESSIONS);
  });
});

// =============================================================================
// getDataSummary Tests
// =============================================================================

describe('getDataSummary', () => {
  it('should return zeros when no data exists', () => {
    const result = getDataSummary();

    expect(result.totalCards).toBe(0);
    expect(result.totalPacks).toBe(0);
    expect(result.totalReviews).toBe(0);
    expect(result.streakDays).toBe(0);
    expect(result.oldestCardDate).toBeNull();
  });

  it('should return correct card count', () => {
    const mockCards = [
      { id: 'card-1', createdAt: '2024-01-10T12:00:00Z' },
      { id: 'card-2', createdAt: '2024-01-11T12:00:00Z' },
      { id: 'card-3', createdAt: '2024-01-12T12:00:00Z' },
    ];
    localStorageMock.setItem(
      FLASHCARD_STORAGE_KEYS.CARDS,
      JSON.stringify({ cards: mockCards, schemaVersion: 1 })
    );

    const result = getDataSummary();

    expect(result.totalCards).toBe(3);
  });

  it('should return correct pack count', () => {
    const mockPacks = [
      { id: 'pack-1', name: 'Pack 1' },
      { id: 'pack-2', name: 'Pack 2' },
    ];
    localStorageMock.setItem(
      FLASHCARD_STORAGE_KEYS.PACKS,
      JSON.stringify({ packs: mockPacks, schemaVersion: 1 })
    );

    const result = getDataSummary();

    expect(result.totalPacks).toBe(2);
  });

  it('should return total reviews from history', () => {
    const mockHistory = [
      { date: '2024-01-10', totalReviews: 5, againCount: 1, hardCount: 1, goodCount: 2, easyCount: 1, minutesStudied: 10, uniqueCardsReviewed: [] },
      { date: '2024-01-11', totalReviews: 8, againCount: 0, hardCount: 2, goodCount: 4, easyCount: 2, minutesStudied: 15, uniqueCardsReviewed: [] },
    ];
    localStorageMock.setItem(
      FLASHCARD_STORAGE_KEYS.HISTORY,
      JSON.stringify(mockHistory)
    );

    const result = getDataSummary();

    expect(result.totalReviews).toBe(13);
  });

  it('should return longest streak from streak history', () => {
    const mockStreakHistory = {
      currentStreak: 3,
      longestStreak: 15,
      lastStudyDate: '2024-01-15',
      achievements: [],
    };
    localStorageMock.setItem(
      FLASHCARD_STORAGE_KEYS.STREAK,
      JSON.stringify(mockStreakHistory)
    );

    const result = getDataSummary();

    expect(result.streakDays).toBe(15);
  });

  it('should return oldest card date', () => {
    const mockCards = [
      { id: 'card-1', createdAt: '2024-01-15T12:00:00Z' },
      { id: 'card-2', createdAt: '2024-01-10T12:00:00Z' },
      { id: 'card-3', createdAt: '2024-01-12T12:00:00Z' },
    ];
    localStorageMock.setItem(
      FLASHCARD_STORAGE_KEYS.CARDS,
      JSON.stringify({ cards: mockCards, schemaVersion: 1 })
    );

    const result = getDataSummary();

    expect(result.oldestCardDate).toBe('2024-01-10T12:00:00Z');
  });
});

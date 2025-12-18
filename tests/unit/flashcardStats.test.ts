/**
 * Unit tests for flashcardStats module
 *
 * Tests cover date utilities, history management, retention calculations,
 * card analysis functions, and statistics computation.
 */

import {
  getTodayDateString,
  formatDateString,
  parseDateString,
  getDaysAgoDateString,
  getFutureDateString,
  pruneOldHistory,
  getOrCreateTodayRecord,
  recordReviewInHistory,
  addStudyTimeToHistory,
  calculateRetentionRate,
  calculateRetentionRate7d,
  calculateRetentionRate30d,
  getTotalReviewsAllTime,
  getTotalMinutesStudied,
  getReviewCountsForDays,
  getRollingRetentionRates,
  getMostChallengingCards,
  getWellKnownCards,
  getOverdueCards,
  getReviewForecast,
  calculateComputedStats,
} from '../../src/lib/flashcardStats';
import type { DailyReviewRecord, UserFlashcard } from '../../src/types/flashcard';

// =============================================================================
// Date Utility Tests
// =============================================================================

describe('Date Utilities', () => {
  describe('getTodayDateString', () => {
    it('returns date in YYYY-MM-DD format', () => {
      const today = getTodayDateString();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDateString', () => {
    it('formats date correctly with proper padding', () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(formatDateString(date)).toBe('2024-01-05');
    });

    it('handles end of year', () => {
      const date = new Date(2024, 11, 31); // December 31, 2024
      expect(formatDateString(date)).toBe('2024-12-31');
    });
  });

  describe('parseDateString', () => {
    it('parses YYYY-MM-DD string correctly', () => {
      const date = parseDateString('2024-06-15');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(5); // June is 5 (0-indexed)
      expect(date.getDate()).toBe(15);
    });
  });

  describe('getDaysAgoDateString', () => {
    it('returns today for 0 days ago', () => {
      const today = getTodayDateString();
      expect(getDaysAgoDateString(0)).toBe(today);
    });

    it('returns correct date for past days', () => {
      const result = getDaysAgoDateString(7);
      const parsed = parseDateString(result);
      const today = new Date();
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - 7);
      expect(parsed.getDate()).toBe(expectedDate.getDate());
    });
  });

  describe('getFutureDateString', () => {
    it('returns today for 0 days ahead', () => {
      const today = getTodayDateString();
      expect(getFutureDateString(0)).toBe(today);
    });

    it('returns correct date for future days', () => {
      const result = getFutureDateString(3);
      const parsed = parseDateString(result);
      const today = new Date();
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() + 3);
      expect(parsed.getDate()).toBe(expectedDate.getDate());
    });
  });
});

// =============================================================================
// History Management Tests
// =============================================================================

describe('History Management', () => {
  const createMockRecord = (date: string, overrides?: Partial<DailyReviewRecord>): DailyReviewRecord => ({
    date,
    totalReviews: 10,
    againCount: 2,
    hardCount: 3,
    goodCount: 4,
    easyCount: 1,
    minutesStudied: 30,
    uniqueCardsReviewed: ['card-1', 'card-2'],
    ...overrides,
  });

  describe('pruneOldHistory', () => {
    it('keeps records within 90 days', () => {
      const recentDate = getDaysAgoDateString(30);
      const history = [createMockRecord(recentDate)];
      const pruned = pruneOldHistory(history);
      expect(pruned).toHaveLength(1);
    });

    it('removes records older than 90 days', () => {
      const oldDate = getDaysAgoDateString(100);
      const recentDate = getDaysAgoDateString(10);
      const history = [
        createMockRecord(oldDate),
        createMockRecord(recentDate),
      ];
      const pruned = pruneOldHistory(history);
      expect(pruned).toHaveLength(1);
      expect(pruned[0]?.date).toBe(recentDate);
    });
  });

  describe('getOrCreateTodayRecord', () => {
    it('returns existing record for today', () => {
      const today = getTodayDateString();
      const existingRecord = createMockRecord(today);
      const history = [existingRecord];
      const result = getOrCreateTodayRecord(history);
      expect(result).toEqual(existingRecord);
    });

    it('creates new record when today does not exist', () => {
      const yesterday = getDaysAgoDateString(1);
      const history = [createMockRecord(yesterday)];
      const result = getOrCreateTodayRecord(history);
      expect(result.date).toBe(getTodayDateString());
      expect(result.totalReviews).toBe(0);
    });
  });

  describe('recordReviewInHistory', () => {
    it('creates today record when history is empty', () => {
      const result = recordReviewInHistory([], 'card-1', 4);
      expect(result).toHaveLength(1);
      expect(result[0]?.date).toBe(getTodayDateString());
      expect(result[0]?.totalReviews).toBe(1);
      expect(result[0]?.goodCount).toBe(1);
    });

    it('increments againCount for quality 0-2', () => {
      const result = recordReviewInHistory([], 'card-1', 1);
      expect(result[0]?.againCount).toBe(1);
    });

    it('increments hardCount for quality 3', () => {
      const result = recordReviewInHistory([], 'card-1', 3);
      expect(result[0]?.hardCount).toBe(1);
    });

    it('increments goodCount for quality 4', () => {
      const result = recordReviewInHistory([], 'card-1', 4);
      expect(result[0]?.goodCount).toBe(1);
    });

    it('increments easyCount for quality 5', () => {
      const result = recordReviewInHistory([], 'card-1', 5);
      expect(result[0]?.easyCount).toBe(1);
    });

    it('tracks unique cards reviewed', () => {
      let history = recordReviewInHistory([], 'card-1', 4);
      history = recordReviewInHistory(history, 'card-2', 4);
      history = recordReviewInHistory(history, 'card-1', 4); // Same card again
      expect(history[0]?.uniqueCardsReviewed).toContain('card-1');
      expect(history[0]?.uniqueCardsReviewed).toContain('card-2');
      expect(history[0]?.uniqueCardsReviewed).toHaveLength(2);
    });
  });

  describe('addStudyTimeToHistory', () => {
    it('adds minutes to existing record', () => {
      const today = getTodayDateString();
      const history = [createMockRecord(today, { minutesStudied: 10 })];
      const result = addStudyTimeToHistory(history, 15);
      expect(result[0]?.minutesStudied).toBe(25);
    });

    it('creates today record if missing', () => {
      const result = addStudyTimeToHistory([], 20);
      expect(result[0]?.minutesStudied).toBe(20);
    });
  });
});

// =============================================================================
// Retention Calculation Tests
// =============================================================================

describe('Retention Calculations', () => {
  const createRecordWithCounts = (date: string, again: number, hard: number, good: number, easy: number): DailyReviewRecord => ({
    date,
    totalReviews: again + hard + good + easy,
    againCount: again,
    hardCount: hard,
    goodCount: good,
    easyCount: easy,
    minutesStudied: 0,
    uniqueCardsReviewed: [],
  });

  describe('calculateRetentionRate', () => {
    it('returns 0 when no reviews', () => {
      expect(calculateRetentionRate([], 7)).toBe(0);
    });

    it('calculates correct retention rate', () => {
      const today = getTodayDateString();
      // 2 again (fail) + 3 hard + 4 good + 1 easy = 10 total
      // Correct = 3 + 4 + 1 = 8, Retention = 8/10 = 0.8
      const history = [createRecordWithCounts(today, 2, 3, 4, 1)];
      expect(calculateRetentionRate(history, 7)).toBe(0.8);
    });

    it('only includes records within the specified days', () => {
      const today = getTodayDateString();
      const oldDate = getDaysAgoDateString(10);
      const history = [
        createRecordWithCounts(today, 0, 0, 10, 0), // 100% retention
        createRecordWithCounts(oldDate, 10, 0, 0, 0), // 0% retention
      ];
      // 7-day window should only include today's record
      expect(calculateRetentionRate(history, 7)).toBe(1.0);
    });
  });

  describe('calculateRetentionRate7d', () => {
    it('uses 7-day window', () => {
      const today = getTodayDateString();
      const history = [createRecordWithCounts(today, 1, 1, 1, 1)];
      // 3 correct out of 4 = 0.75
      expect(calculateRetentionRate7d(history)).toBe(0.75);
    });
  });

  describe('calculateRetentionRate30d', () => {
    it('uses 30-day window', () => {
      const today = getTodayDateString();
      const day15Ago = getDaysAgoDateString(15);
      const history = [
        createRecordWithCounts(today, 2, 2, 4, 2), // 8 correct out of 10
        createRecordWithCounts(day15Ago, 0, 0, 10, 0), // 10 correct out of 10
      ];
      // Total: 18 correct out of 20 = 0.9
      expect(calculateRetentionRate30d(history)).toBe(0.9);
    });
  });
});

// =============================================================================
// Statistics Aggregation Tests
// =============================================================================

describe('Statistics Aggregation', () => {
  const createMockRecord = (date: string, reviews: number, minutes: number): DailyReviewRecord => ({
    date,
    totalReviews: reviews,
    againCount: 0,
    hardCount: 0,
    goodCount: reviews,
    easyCount: 0,
    minutesStudied: minutes,
    uniqueCardsReviewed: [],
  });

  describe('getTotalReviewsAllTime', () => {
    it('sums all reviews', () => {
      const history = [
        createMockRecord(getDaysAgoDateString(0), 5, 10),
        createMockRecord(getDaysAgoDateString(1), 10, 20),
        createMockRecord(getDaysAgoDateString(2), 15, 30),
      ];
      expect(getTotalReviewsAllTime(history)).toBe(30);
    });
  });

  describe('getTotalMinutesStudied', () => {
    it('sums all minutes', () => {
      const history = [
        createMockRecord(getDaysAgoDateString(0), 5, 10),
        createMockRecord(getDaysAgoDateString(1), 10, 20),
        createMockRecord(getDaysAgoDateString(2), 15, 30),
      ];
      expect(getTotalMinutesStudied(history)).toBe(60);
    });
  });

  describe('getReviewCountsForDays', () => {
    it('returns records for each day including zeros', () => {
      const today = getTodayDateString();
      const history = [createMockRecord(today, 5, 10)];
      const result = getReviewCountsForDays(history, 7);

      expect(result).toHaveLength(7);
      // Last element should be today
      expect(result[6]?.date).toBe(today);
      expect(result[6]?.totalReviews).toBe(5);
      // Other days should have zero
      expect(result[0]?.totalReviews).toBe(0);
    });
  });

  describe('getRollingRetentionRates', () => {
    it('returns retention rates for each day', () => {
      const today = getTodayDateString();
      const history = [createMockRecord(today, 10, 0)];
      const result = getRollingRetentionRates(history, 7);

      expect(result).toHaveLength(7);
      expect(result[6]?.date).toBe(today);
    });
  });
});

// =============================================================================
// Card Analysis Tests
// =============================================================================

describe('Card Analysis', () => {
  const createMockCard = (id: string, easeFactor: number, interval: number, lastReviewed: boolean, daysUntilDue: number = 0): UserFlashcard => {
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + daysUntilDue);

    return {
      id,
      sourceType: 'milestone',
      sourceId: `E2024_${id}`,
      packIds: [],
      createdAt: now.toISOString(),
      easeFactor,
      interval,
      repetitions: lastReviewed ? 3 : 0,
      nextReviewDate: dueDate.toISOString(),
      lastReviewedAt: lastReviewed ? new Date(now.getTime() - 86400000).toISOString() : null,
    };
  };

  describe('getMostChallengingCards', () => {
    it('returns cards with lowest ease factors', () => {
      const cards = [
        createMockCard('easy', 2.5, 21, true),
        createMockCard('hard', 1.5, 3, true),
        createMockCard('medium', 2.0, 7, true),
        createMockCard('never-reviewed', 2.5, 0, false),
      ];

      const challenging = getMostChallengingCards(cards, 2);
      expect(challenging).toHaveLength(2);
      expect(challenging[0]?.id).toBe('hard');
      expect(challenging[1]?.id).toBe('medium');
    });

    it('excludes cards never reviewed', () => {
      const cards = [
        createMockCard('reviewed', 1.5, 3, true),
        createMockCard('never-reviewed', 1.3, 0, false),
      ];

      const challenging = getMostChallengingCards(cards);
      expect(challenging).toHaveLength(1);
      expect(challenging[0]?.id).toBe('reviewed');
    });
  });

  describe('getWellKnownCards', () => {
    it('returns cards with highest intervals', () => {
      const cards = [
        createMockCard('low', 2.5, 3, true),
        createMockCard('high', 2.5, 60, true),
        createMockCard('medium', 2.5, 21, true),
      ];

      const wellKnown = getWellKnownCards(cards, 2);
      expect(wellKnown).toHaveLength(2);
      expect(wellKnown[0]?.id).toBe('high');
      expect(wellKnown[1]?.id).toBe('medium');
    });
  });

  describe('getOverdueCards', () => {
    it('returns overdue cards sorted by how overdue', () => {
      const cards = [
        createMockCard('future', 2.5, 7, true, 5), // Due in 5 days
        createMockCard('overdue-3', 2.5, 7, true, -3), // Overdue by 3 days
        createMockCard('overdue-1', 2.5, 7, true, -1), // Overdue by 1 day
      ];

      const overdue = getOverdueCards(cards);
      // Should only include cards with past due dates
      expect(overdue).toHaveLength(2);
      // Most overdue first
      expect(overdue[0]?.id).toBe('overdue-3');
      expect(overdue[1]?.id).toBe('overdue-1');
    });
  });

  describe('getReviewForecast', () => {
    it('returns counts for each day including today', () => {
      const cards = [
        createMockCard('today1', 2.5, 7, true, 0),
        createMockCard('today2', 2.5, 7, true, 0),
        createMockCard('tomorrow', 2.5, 7, true, 1),
        createMockCard('later', 2.5, 7, true, 5),
      ];

      const forecast = getReviewForecast(cards, 7);
      expect(forecast).toHaveLength(7);
      expect(forecast[0]?.count).toBe(2); // 2 cards due today
      expect(forecast[1]?.count).toBe(1); // 1 card due tomorrow
      expect(forecast[5]?.count).toBe(1); // 1 card due in 5 days
    });
  });
});

// =============================================================================
// Computed Statistics Tests
// =============================================================================

describe('calculateComputedStats', () => {
  const createMockCard = (id: string, interval: number, lastReviewed: boolean): UserFlashcard => ({
    id,
    sourceType: 'milestone',
    sourceId: `E2024_${id}`,
    packIds: [],
    createdAt: new Date().toISOString(),
    easeFactor: 2.5,
    interval,
    repetitions: lastReviewed ? 3 : 0,
    nextReviewDate: new Date().toISOString(),
    lastReviewedAt: lastReviewed ? new Date().toISOString() : null,
  });

  it('calculates card counts correctly', () => {
    const cards = [
      createMockCard('mastered', 30, true), // interval > 21
      createMockCard('learning', 10, true), // interval <= 21, reviewed
      createMockCard('new', 0, false), // never reviewed
    ];

    const stats = calculateComputedStats(cards, [], 5, 10, '2024-01-01');

    expect(stats.totalCards).toBe(3);
    expect(stats.masteredCards).toBe(1);
    expect(stats.learningCards).toBe(1);
    expect(stats.newCards).toBe(1);
  });

  it('includes streak information', () => {
    const stats = calculateComputedStats([], [], 7, 14, '2024-12-01');

    expect(stats.currentStreak).toBe(7);
    expect(stats.longestStreak).toBe(14);
    expect(stats.lastStudyDate).toBe('2024-12-01');
  });

  it('calculates forecast correctly', () => {
    const cards = [
      createMockCard('due', 0, true),
    ];

    const stats = calculateComputedStats(cards, [], 0, 0, null);

    expect(stats.dueToday).toBe(1);
    expect(stats.dueThisWeek).toBeGreaterThanOrEqual(1);
  });
});

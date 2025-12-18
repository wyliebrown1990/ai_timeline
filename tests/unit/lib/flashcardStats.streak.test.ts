/**
 * Streak Calculation Tests
 *
 * Tests for streak-related functions in flashcardStats.ts including:
 * - Streak calculation from history
 * - Milestone achievement detection
 * - Progress calculation
 * - Streak messages
 */

import {
  calculateStreakFromHistory,
  updateStreakAfterReview,
  checkForNewMilestones,
  getNextMilestone,
  getMilestoneProgress,
  getMilestoneLabel,
  getStreakMessage,
  getTodayDateString,
  getDaysAgoDateString,
} from '../../../src/lib/flashcardStats';
import type { DailyReviewRecord, StreakHistory, StreakAchievement } from '../../../src/types/flashcard';
import { createEmptyDailyRecord, createInitialStreakHistory } from '../../../src/types/flashcard';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a daily record with reviews for a specific date
 */
function createRecordWithReviews(date: string, totalReviews: number = 5): DailyReviewRecord {
  return {
    ...createEmptyDailyRecord(date),
    totalReviews,
    goodCount: totalReviews,
  };
}

/**
 * Create a streak history with specified values
 */
function createStreakHistory(
  currentStreak: number,
  longestStreak: number,
  achievements: StreakAchievement[] = []
): StreakHistory {
  return {
    ...createInitialStreakHistory(),
    currentStreak,
    longestStreak,
    achievements,
  };
}

// =============================================================================
// calculateStreakFromHistory Tests
// =============================================================================

describe('calculateStreakFromHistory', () => {
  describe('Empty History', () => {
    it('should return 0 streak for empty history', () => {
      const result = calculateStreakFromHistory([]);

      expect(result.currentStreak).toBe(0);
      expect(result.lastStudyDate).toBeNull();
    });

    it('should return 0 streak for history with no reviews', () => {
      const history = [
        createEmptyDailyRecord(getDaysAgoDateString(0)),
        createEmptyDailyRecord(getDaysAgoDateString(1)),
      ];

      const result = calculateStreakFromHistory(history);

      expect(result.currentStreak).toBe(0);
    });
  });

  describe('Single Day Streak', () => {
    it('should return 1 for a single day with reviews today', () => {
      const history = [createRecordWithReviews(getTodayDateString())];

      const result = calculateStreakFromHistory(history);

      expect(result.currentStreak).toBe(1);
      expect(result.lastStudyDate).toBe(getTodayDateString());
    });

    it('should return 1 for a single day with reviews yesterday', () => {
      const history = [createRecordWithReviews(getDaysAgoDateString(1))];

      const result = calculateStreakFromHistory(history);

      expect(result.currentStreak).toBe(1);
      expect(result.lastStudyDate).toBe(getDaysAgoDateString(1));
    });
  });

  describe('Multi-Day Streak', () => {
    it('should return 3 for three consecutive days ending today', () => {
      const history = [
        createRecordWithReviews(getTodayDateString()),
        createRecordWithReviews(getDaysAgoDateString(1)),
        createRecordWithReviews(getDaysAgoDateString(2)),
      ];

      const result = calculateStreakFromHistory(history);

      expect(result.currentStreak).toBe(3);
    });

    it('should return 3 for three consecutive days ending yesterday', () => {
      const history = [
        createRecordWithReviews(getDaysAgoDateString(1)),
        createRecordWithReviews(getDaysAgoDateString(2)),
        createRecordWithReviews(getDaysAgoDateString(3)),
      ];

      const result = calculateStreakFromHistory(history);

      expect(result.currentStreak).toBe(3);
    });

    it('should handle 7-day streak correctly', () => {
      const history = Array.from({ length: 7 }, (_, i) =>
        createRecordWithReviews(getDaysAgoDateString(i))
      );

      const result = calculateStreakFromHistory(history);

      expect(result.currentStreak).toBe(7);
    });
  });

  describe('Broken Streak', () => {
    it('should return 0 if most recent study was 2+ days ago', () => {
      const history = [
        createRecordWithReviews(getDaysAgoDateString(2)),
        createRecordWithReviews(getDaysAgoDateString(3)),
      ];

      const result = calculateStreakFromHistory(history);

      expect(result.currentStreak).toBe(0);
      expect(result.lastStudyDate).toBe(getDaysAgoDateString(2));
    });

    it('should handle gap in the middle of history', () => {
      const history = [
        createRecordWithReviews(getTodayDateString()),
        createRecordWithReviews(getDaysAgoDateString(1)),
        // Gap at day 2
        createRecordWithReviews(getDaysAgoDateString(3)),
        createRecordWithReviews(getDaysAgoDateString(4)),
      ];

      const result = calculateStreakFromHistory(history);

      expect(result.currentStreak).toBe(2); // Only today and yesterday count
    });
  });

  describe('Unsorted History', () => {
    it('should handle unsorted history correctly', () => {
      const history = [
        createRecordWithReviews(getDaysAgoDateString(2)),
        createRecordWithReviews(getTodayDateString()),
        createRecordWithReviews(getDaysAgoDateString(1)),
      ];

      const result = calculateStreakFromHistory(history);

      expect(result.currentStreak).toBe(3);
    });
  });
});

// =============================================================================
// checkForNewMilestones Tests
// =============================================================================

describe('checkForNewMilestones', () => {
  it('should return empty array when streak is below first milestone', () => {
    const result = checkForNewMilestones(5, []);

    expect(result).toHaveLength(0);
  });

  it('should detect 7-day milestone achievement', () => {
    const result = checkForNewMilestones(7, []);

    expect(result).toHaveLength(1);
    expect(result[0]?.milestone).toBe(7);
  });

  it('should not re-award already achieved milestones', () => {
    const existingAchievements: StreakAchievement[] = [
      { milestone: 7, achievedAt: new Date().toISOString() },
    ];

    const result = checkForNewMilestones(7, existingAchievements);

    expect(result).toHaveLength(0);
  });

  it('should detect multiple new milestones', () => {
    const result = checkForNewMilestones(35, []);

    // Should have 7, 14, 30 milestones
    expect(result).toHaveLength(3);
    expect(result.map((a) => a.milestone)).toContain(7);
    expect(result.map((a) => a.milestone)).toContain(14);
    expect(result.map((a) => a.milestone)).toContain(30);
  });

  it('should only award milestones not yet achieved', () => {
    const existingAchievements: StreakAchievement[] = [
      { milestone: 7, achievedAt: new Date().toISOString() },
      { milestone: 14, achievedAt: new Date().toISOString() },
    ];

    const result = checkForNewMilestones(35, existingAchievements);

    expect(result).toHaveLength(1);
    expect(result[0]?.milestone).toBe(30);
  });
});

// =============================================================================
// getNextMilestone Tests
// =============================================================================

describe('getNextMilestone', () => {
  it('should return 7 for streak of 0', () => {
    expect(getNextMilestone(0)).toBe(7);
  });

  it('should return 7 for streak of 5', () => {
    expect(getNextMilestone(5)).toBe(7);
  });

  it('should return 14 for streak of 7', () => {
    expect(getNextMilestone(7)).toBe(14);
  });

  it('should return 30 for streak of 20', () => {
    expect(getNextMilestone(20)).toBe(30);
  });

  it('should return null when all milestones achieved', () => {
    expect(getNextMilestone(400)).toBeNull();
  });
});

// =============================================================================
// getMilestoneProgress Tests
// =============================================================================

describe('getMilestoneProgress', () => {
  it('should return 0% progress for 0 streak', () => {
    const result = getMilestoneProgress(0);

    expect(result.nextMilestone).toBe(7);
    expect(result.progress).toBe(0);
    expect(result.daysRemaining).toBe(7);
  });

  it('should calculate progress towards 7-day milestone', () => {
    const result = getMilestoneProgress(3);

    expect(result.nextMilestone).toBe(7);
    expect(result.progress).toBe(43); // 3/7 ~= 43%
    expect(result.daysRemaining).toBe(4);
  });

  it('should calculate progress towards 14-day milestone', () => {
    const result = getMilestoneProgress(10);

    expect(result.nextMilestone).toBe(14);
    expect(result.progress).toBe(43); // (10-7)/(14-7) ~= 43%
    expect(result.daysRemaining).toBe(4);
  });

  it('should return 100% when all milestones achieved', () => {
    const result = getMilestoneProgress(400);

    expect(result.nextMilestone).toBeNull();
    expect(result.progress).toBe(100);
    expect(result.daysRemaining).toBe(0);
  });
});

// =============================================================================
// getMilestoneLabel Tests
// =============================================================================

describe('getMilestoneLabel', () => {
  it('should return "1 Week" for 7 days', () => {
    expect(getMilestoneLabel(7)).toBe('1 Week');
  });

  it('should return "2 Weeks" for 14 days', () => {
    expect(getMilestoneLabel(14)).toBe('2 Weeks');
  });

  it('should return "1 Month" for 30 days', () => {
    expect(getMilestoneLabel(30)).toBe('1 Month');
  });

  it('should return "100 Days" for 100 days', () => {
    expect(getMilestoneLabel(100)).toBe('100 Days');
  });

  it('should return "1 Year" for 365 days', () => {
    expect(getMilestoneLabel(365)).toBe('1 Year');
  });

  it('should return generic label for unknown milestones', () => {
    expect(getMilestoneLabel(50)).toBe('50 Days');
  });
});

// =============================================================================
// getStreakMessage Tests
// =============================================================================

describe('getStreakMessage', () => {
  it('should encourage starting a streak when no streak and not studied today', () => {
    const message = getStreakMessage(0, false);

    expect(message).toBe('Start a streak today!');
  });

  it('should congratulate on starting when studied today with 0 previous streak', () => {
    const message = getStreakMessage(0, true);

    expect(message).toBe('Great start! Keep it going!');
  });

  it('should warn about maintaining streak when not studied today', () => {
    const message = getStreakMessage(5, false);

    expect(message).toContain('Study today');
    expect(message).toContain('5 day streak');
  });

  it('should show progress to next milestone when studied today', () => {
    const message = getStreakMessage(5, true);

    expect(message).toContain('days to');
  });

  it('should show special message when 1 day from milestone', () => {
    const message = getStreakMessage(6, true);

    expect(message).toBe('Just 1 more day to 1 Week!');
  });

  it('should show special message when all milestones achieved', () => {
    const message = getStreakMessage(400, true);

    expect(message).toContain('all milestones');
  });
});

// =============================================================================
// updateStreakAfterReview Tests
// =============================================================================

describe('updateStreakAfterReview', () => {
  it('should update streak from review history', () => {
    const streakHistory = createStreakHistory(0, 0);
    const reviewHistory = [createRecordWithReviews(getTodayDateString())];

    const result = updateStreakAfterReview(streakHistory, reviewHistory);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it('should update longest streak when current exceeds it', () => {
    const streakHistory = createStreakHistory(2, 2);
    const reviewHistory = [
      createRecordWithReviews(getTodayDateString()),
      createRecordWithReviews(getDaysAgoDateString(1)),
      createRecordWithReviews(getDaysAgoDateString(2)),
    ];

    const result = updateStreakAfterReview(streakHistory, reviewHistory);

    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it('should preserve longest streak when current is lower', () => {
    const streakHistory = createStreakHistory(0, 10);
    const reviewHistory = [createRecordWithReviews(getTodayDateString())];

    const result = updateStreakAfterReview(streakHistory, reviewHistory);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(10);
  });

  it('should add new achievements when milestones reached', () => {
    const streakHistory = createStreakHistory(6, 6);
    const reviewHistory = Array.from({ length: 7 }, (_, i) =>
      createRecordWithReviews(getDaysAgoDateString(i))
    );

    const result = updateStreakAfterReview(streakHistory, reviewHistory);

    expect(result.currentStreak).toBe(7);
    expect(result.achievements).toHaveLength(1);
    expect(result.achievements[0]?.milestone).toBe(7);
  });

  it('should preserve existing achievements', () => {
    const existingAchievement: StreakAchievement = {
      milestone: 7,
      achievedAt: new Date().toISOString(),
    };
    const streakHistory = createStreakHistory(10, 10, [existingAchievement]);
    const reviewHistory = Array.from({ length: 14 }, (_, i) =>
      createRecordWithReviews(getDaysAgoDateString(i))
    );

    const result = updateStreakAfterReview(streakHistory, reviewHistory);

    expect(result.achievements).toHaveLength(2);
    expect(result.achievements.map((a) => a.milestone)).toContain(7);
    expect(result.achievements.map((a) => a.milestone)).toContain(14);
  });
});

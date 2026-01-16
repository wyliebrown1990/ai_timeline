/**
 * Streak Service (Sprint Feed-6)
 *
 * Manages daily visit streaks with localStorage persistence.
 * Tracks consecutive days of feed usage.
 */

const STORAGE_KEY = 'ai_timeline_streak';

interface StreakData {
  currentStreak: number;
  lastVisitDate: string; // ISO date string (YYYY-MM-DD)
  longestStreak: number;
  totalDaysActive: number;
}

/**
 * Get the start of day for a date (in local timezone)
 */
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

/**
 * Calculate difference in days between two date strings
 */
function daysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get streak data from localStorage
 */
function getStreakData(): StreakData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as StreakData;
    }
  } catch (error) {
    console.warn('Failed to parse streak data:', error);
  }

  return {
    currentStreak: 0,
    lastVisitDate: '',
    longestStreak: 0,
    totalDaysActive: 0,
  };
}

/**
 * Save streak data to localStorage
 */
function saveStreakData(data: StreakData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save streak data:', error);
  }
}

/**
 * Streak Service singleton
 */
export const streakService = {
  /**
   * Get the current streak count
   */
  getCurrentStreak(): number {
    const data = getStreakData();
    const today = getDateString(new Date());

    // If last visit was not today or yesterday, streak is broken
    if (data.lastVisitDate) {
      const diff = daysDifference(data.lastVisitDate, today);
      if (diff > 1) {
        // Streak was broken, but don't reset until updateStreak is called
        return 0;
      }
    }

    return data.currentStreak;
  },

  /**
   * Get the longest streak ever achieved
   */
  getLongestStreak(): number {
    return getStreakData().longestStreak;
  },

  /**
   * Get the total days active
   */
  getTotalDaysActive(): number {
    return getStreakData().totalDaysActive;
  },

  /**
   * Get the last visit date
   */
  getLastVisit(): Date | null {
    const data = getStreakData();
    return data.lastVisitDate ? new Date(data.lastVisitDate) : null;
  },

  /**
   * Check if user has visited today
   */
  hasVisitedToday(): boolean {
    const data = getStreakData();
    const today = getDateString(new Date());
    return data.lastVisitDate === today;
  },

  /**
   * Update the streak (call this when user views the feed)
   * Returns: { streakChanged: boolean, newStreak: number, isNewDay: boolean }
   */
  updateStreak(): { streakChanged: boolean; newStreak: number; isNewDay: boolean } {
    const data = getStreakData();
    const today = getDateString(new Date());

    // Already visited today - no change
    if (data.lastVisitDate === today) {
      return {
        streakChanged: false,
        newStreak: data.currentStreak,
        isNewDay: false,
      };
    }

    let newStreak = 1;
    let isNewDay = true;

    if (data.lastVisitDate) {
      const diff = daysDifference(data.lastVisitDate, today);

      if (diff === 1) {
        // Visited yesterday - increment streak
        newStreak = data.currentStreak + 1;
      } else if (diff === 0) {
        // Same day (shouldn't happen due to early return, but safety check)
        newStreak = data.currentStreak;
        isNewDay = false;
      }
      // diff > 1 means streak is broken, reset to 1
    }

    const newLongestStreak = Math.max(data.longestStreak, newStreak);
    const newTotalDays = data.totalDaysActive + (isNewDay ? 1 : 0);

    saveStreakData({
      currentStreak: newStreak,
      lastVisitDate: today,
      longestStreak: newLongestStreak,
      totalDaysActive: newTotalDays,
    });

    return {
      streakChanged: newStreak !== data.currentStreak,
      newStreak,
      isNewDay,
    };
  },

  /**
   * Check if streak will be lost tomorrow if user doesn't visit
   * Useful for push notification reminders
   */
  willStreakExpireSoon(): boolean {
    const data = getStreakData();
    if (data.currentStreak === 0) return false;

    const today = getDateString(new Date());
    return data.lastVisitDate !== today;
  },

  /**
   * Reset streak data (for testing or user request)
   */
  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to reset streak data:', error);
    }
  },

  /**
   * Get full streak data (for debugging/display)
   */
  getFullData(): StreakData {
    return getStreakData();
  },
};

export default streakService;

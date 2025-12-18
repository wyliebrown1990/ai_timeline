/**
 * Flashcard Statistics Module
 *
 * Provides functions for tracking, storing, and calculating flashcard review statistics.
 * Manages daily review history in localStorage with automatic pruning of old data.
 * Calculates retention rates, identifies challenging cards, and forecasts upcoming reviews.
 */

import {
  type DailyReviewRecord,
  type UserFlashcard,
  type QualityRating,
  type StreakHistory,
  type StreakAchievement,
  FLASHCARD_STORAGE_KEYS,
  STREAK_MILESTONES,
  safeParseDailyReviewRecord,
  safeParseStreakHistory,
  createEmptyDailyRecord,
  createInitialStreakHistory,
} from '../types/flashcard';
import {
  safeGetJSON,
  safeSetJSON,
  notifyStorageError,
  isStorageAvailable,
  clearFlashcardStorage,
} from './storage';

// =============================================================================
// Constants
// =============================================================================

/** Maximum days of history to retain */
const MAX_HISTORY_DAYS = 90;

/** Mastered threshold: cards with interval > 21 days */
const MASTERED_INTERVAL_THRESHOLD = 21;

/** Target retention rate for display */
export const TARGET_RETENTION_RATE = 0.85;

// =============================================================================
// Date Utilities
// =============================================================================

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const now = new Date();
  return formatDateString(now);
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date object (midnight local time)
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year!, month! - 1, day);
}

/**
 * Get date string for N days ago
 */
export function getDaysAgoDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatDateString(date);
}

/**
 * Get date string for N days in the future
 */
export function getFutureDateString(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return formatDateString(date);
}

// =============================================================================
// History Storage Functions
// =============================================================================

/**
 * Load review history from localStorage with error handling
 * Returns array of DailyReviewRecord sorted by date (oldest first)
 */
export function loadReviewHistory(): DailyReviewRecord[] {
  if (typeof window === 'undefined' || !isStorageAvailable()) {
    return [];
  }

  const result = safeGetJSON<unknown[]>(
    FLASHCARD_STORAGE_KEYS.HISTORY,
    [],
    (data) => {
      if (Array.isArray(data)) {
        return { success: true, data };
      }
      return { success: false, error: 'History data is not an array' };
    }
  );

  if (result.error) {
    notifyStorageError(result.error);
  }

  if (!Array.isArray(result.data)) {
    return [];
  }

  // Validate and filter records
  const validRecords: DailyReviewRecord[] = [];
  for (const item of result.data) {
    const parsed = safeParseDailyReviewRecord(item);
    if (parsed.success) {
      validRecords.push(parsed.data);
    }
  }

  // Sort by date ascending
  return validRecords.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Save review history to localStorage with error handling
 * Prunes records older than 90 days before saving
 */
export function saveReviewHistory(history: DailyReviewRecord[]): void {
  if (typeof window === 'undefined') return;

  // Prune old records before saving
  const prunedHistory = pruneOldHistory(history);

  const result = safeSetJSON(FLASHCARD_STORAGE_KEYS.HISTORY, prunedHistory);

  if (result.error) {
    notifyStorageError(result.error);
  }
}

/**
 * Remove records older than MAX_HISTORY_DAYS
 */
export function pruneOldHistory(history: DailyReviewRecord[]): DailyReviewRecord[] {
  const cutoffDate = getDaysAgoDateString(MAX_HISTORY_DAYS);
  return history.filter((record) => record.date >= cutoffDate);
}

/**
 * Get or create today's record from history
 */
export function getOrCreateTodayRecord(history: DailyReviewRecord[]): DailyReviewRecord {
  const today = getTodayDateString();
  const existing = history.find((r) => r.date === today);
  return existing ?? createEmptyDailyRecord(today);
}

// =============================================================================
// Review Recording Functions
// =============================================================================

/**
 * Map quality rating to the appropriate count field
 */
function getCountFieldForQuality(quality: QualityRating): keyof Pick<DailyReviewRecord, 'againCount' | 'hardCount' | 'goodCount' | 'easyCount'> {
  if (quality <= 2) return 'againCount';
  if (quality === 3) return 'hardCount';
  if (quality === 4) return 'goodCount';
  return 'easyCount';
}

/**
 * Record a single review in the daily history
 * Returns the updated history array
 */
export function recordReviewInHistory(
  history: DailyReviewRecord[],
  cardId: string,
  quality: QualityRating,
  sessionDurationMinutes: number = 0
): DailyReviewRecord[] {
  const today = getTodayDateString();
  const historyMap = new Map(history.map((r) => [r.date, r]));

  // Get or create today's record
  const todayRecord = historyMap.get(today) ?? createEmptyDailyRecord(today);

  // Update counts
  const countField = getCountFieldForQuality(quality);
  const updatedRecord: DailyReviewRecord = {
    ...todayRecord,
    totalReviews: todayRecord.totalReviews + 1,
    [countField]: todayRecord[countField] + 1,
    minutesStudied: todayRecord.minutesStudied + sessionDurationMinutes,
    uniqueCardsReviewed: todayRecord.uniqueCardsReviewed.includes(cardId)
      ? todayRecord.uniqueCardsReviewed
      : [...todayRecord.uniqueCardsReviewed, cardId],
  };

  historyMap.set(today, updatedRecord);

  // Convert back to array and sort
  const updatedHistory = Array.from(historyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return updatedHistory;
}

/**
 * Add study time to today's record
 * Used for tracking session duration when session ends
 */
export function addStudyTimeToHistory(
  history: DailyReviewRecord[],
  minutes: number
): DailyReviewRecord[] {
  const today = getTodayDateString();
  const historyMap = new Map(history.map((r) => [r.date, r]));

  const todayRecord = historyMap.get(today) ?? createEmptyDailyRecord(today);

  const updatedRecord: DailyReviewRecord = {
    ...todayRecord,
    minutesStudied: todayRecord.minutesStudied + minutes,
  };

  historyMap.set(today, updatedRecord);

  return Array.from(historyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// =============================================================================
// Statistics Calculation Functions
// =============================================================================

/**
 * Calculate retention rate for a given number of days
 * Retention = (correct reviews) / (total reviews)
 * Correct = hard + good + easy (quality >= 3)
 */
export function calculateRetentionRate(history: DailyReviewRecord[], days: number): number {
  const cutoffDate = getDaysAgoDateString(days);
  const relevantRecords = history.filter((r) => r.date >= cutoffDate);

  let totalReviews = 0;
  let correctReviews = 0;

  for (const record of relevantRecords) {
    totalReviews += record.totalReviews;
    // Correct = anything not "Again" (quality >= 3)
    correctReviews += record.hardCount + record.goodCount + record.easyCount;
  }

  if (totalReviews === 0) return 0;
  return correctReviews / totalReviews;
}

/**
 * Calculate 7-day retention rate
 */
export function calculateRetentionRate7d(history: DailyReviewRecord[]): number {
  return calculateRetentionRate(history, 7);
}

/**
 * Calculate 30-day retention rate
 */
export function calculateRetentionRate30d(history: DailyReviewRecord[]): number {
  return calculateRetentionRate(history, 30);
}

/**
 * Get total reviews all-time from history
 */
export function getTotalReviewsAllTime(history: DailyReviewRecord[]): number {
  return history.reduce((sum, record) => sum + record.totalReviews, 0);
}

/**
 * Get total minutes studied all-time from history
 */
export function getTotalMinutesStudied(history: DailyReviewRecord[]): number {
  return history.reduce((sum, record) => sum + record.minutesStudied, 0);
}

/**
 * Get review counts for last N days (for charting)
 * Returns array with one entry per day, including zeros for days with no activity
 */
export function getReviewCountsForDays(history: DailyReviewRecord[], days: number): DailyReviewRecord[] {
  const result: DailyReviewRecord[] = [];
  const historyMap = new Map(history.map((r) => [r.date, r]));

  // Build array from days ago to today
  for (let i = days - 1; i >= 0; i--) {
    const dateStr = getDaysAgoDateString(i);
    const record = historyMap.get(dateStr) ?? createEmptyDailyRecord(dateStr);
    result.push(record);
  }

  return result;
}

/**
 * Calculate rolling retention rates for charting
 * Returns array of { date, retentionRate } for each day in the period
 * Uses 7-day rolling average centered on each day
 */
export function getRollingRetentionRates(
  history: DailyReviewRecord[],
  days: number
): Array<{ date: string; retentionRate: number }> {
  const result: Array<{ date: string; retentionRate: number }> = [];
  const historyMap = new Map(history.map((r) => [r.date, r]));

  for (let i = days - 1; i >= 0; i--) {
    const centerDate = getDaysAgoDateString(i);

    // Calculate 7-day rolling average (3 days before, center day, 3 days after)
    let totalReviews = 0;
    let correctReviews = 0;

    for (let offset = -3; offset <= 3; offset++) {
      const checkDate = getDaysAgoDateString(i - offset);
      const record = historyMap.get(checkDate);
      if (record) {
        totalReviews += record.totalReviews;
        correctReviews += record.hardCount + record.goodCount + record.easyCount;
      }
    }

    const retentionRate = totalReviews > 0 ? correctReviews / totalReviews : 0;
    result.push({ date: centerDate, retentionRate });
  }

  return result;
}

// =============================================================================
// Card Analysis Functions
// =============================================================================

/**
 * Identify most challenging cards based on lowest ease factor
 * Cards with low ease factors have been answered incorrectly more often
 */
export function getMostChallengingCards(
  cards: UserFlashcard[],
  limit: number = 5
): UserFlashcard[] {
  // Only consider cards that have been reviewed at least once
  const reviewedCards = cards.filter((c) => c.lastReviewedAt !== null);

  // Sort by ease factor ascending (lowest = most challenging)
  return [...reviewedCards]
    .sort((a, b) => a.easeFactor - b.easeFactor)
    .slice(0, limit);
}

/**
 * Identify well-known cards based on highest intervals
 * Cards with high intervals have been consistently answered correctly
 */
export function getWellKnownCards(
  cards: UserFlashcard[],
  limit: number = 5
): UserFlashcard[] {
  return [...cards]
    .sort((a, b) => b.interval - a.interval)
    .slice(0, limit);
}

/**
 * Identify overdue cards (past their review date)
 * Sorted by how many days overdue
 */
export function getOverdueCards(cards: UserFlashcard[]): UserFlashcard[] {
  const now = new Date();

  return cards
    .filter((card) => {
      if (!card.nextReviewDate) return true; // Never reviewed = overdue
      return new Date(card.nextReviewDate) < now;
    })
    .sort((a, b) => {
      const aDate = a.nextReviewDate ? new Date(a.nextReviewDate) : new Date(0);
      const bDate = b.nextReviewDate ? new Date(b.nextReviewDate) : new Date(0);
      return aDate.getTime() - bDate.getTime(); // Most overdue first
    });
}

/**
 * Count cards due for each of the next N days
 * Returns array of { date, count } for forecasting
 */
export function getReviewForecast(
  cards: UserFlashcard[],
  days: number = 7
): Array<{ date: string; count: number }> {
  const result: Array<{ date: string; count: number }> = [];
  const now = new Date();
  const todayStr = formatDateString(now);

  for (let i = 0; i < days; i++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + i);
    const targetDateStr = formatDateString(targetDate);

    // For "today", count overdue + due today
    // For future days, count cards with nextReviewDate on that day
    const count = cards.filter((card) => {
      if (!card.nextReviewDate) {
        // Never reviewed: due today only
        return i === 0;
      }

      const reviewDateStr = formatDateString(new Date(card.nextReviewDate));

      if (i === 0) {
        // Today: include overdue and due today
        return reviewDateStr <= todayStr;
      }

      // Future: exact match only
      return reviewDateStr === targetDateStr;
    }).length;

    result.push({ date: targetDateStr, count });
  }

  return result;
}

// =============================================================================
// Computed Statistics Interface
// =============================================================================

/**
 * Complete computed statistics for the stats page
 */
export interface ComputedStats {
  // Counts
  totalCards: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;

  // Streaks
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;

  // Performance
  retentionRate7d: number;
  retentionRate30d: number;
  averageEaseFactor: number;
  totalReviewsAllTime: number;
  totalMinutesStudied: number;

  // Insights
  mostChallengingCardIds: string[];
  overdueCardIds: string[];

  // Forecast
  dueToday: number;
  dueTomorrow: number;
  dueThisWeek: number;
}

/**
 * Calculate all computed statistics from cards and history
 */
export function calculateComputedStats(
  cards: UserFlashcard[],
  history: DailyReviewRecord[],
  currentStreak: number,
  longestStreak: number,
  lastStudyDate: string | null
): ComputedStats {
  const masteredCards = cards.filter((c) => c.interval > MASTERED_INTERVAL_THRESHOLD);
  const newCards = cards.filter((c) => c.lastReviewedAt === null);
  const learningCards = cards.filter(
    (c) => c.lastReviewedAt !== null && c.interval <= MASTERED_INTERVAL_THRESHOLD
  );

  const mostChallenging = getMostChallengingCards(cards, 5);
  const overdue = getOverdueCards(cards);
  const forecast = getReviewForecast(cards, 7);

  // Calculate average ease factor for reviewed cards
  const reviewedCards = cards.filter((c) => c.lastReviewedAt !== null);
  const averageEaseFactor = reviewedCards.length > 0
    ? reviewedCards.reduce((sum, c) => sum + c.easeFactor, 0) / reviewedCards.length
    : 2.5; // Default ease factor

  return {
    totalCards: cards.length,
    masteredCards: masteredCards.length,
    learningCards: learningCards.length,
    newCards: newCards.length,

    currentStreak,
    longestStreak,
    lastStudyDate,

    retentionRate7d: calculateRetentionRate7d(history),
    retentionRate30d: calculateRetentionRate30d(history),
    averageEaseFactor,
    totalReviewsAllTime: getTotalReviewsAllTime(history),
    totalMinutesStudied: getTotalMinutesStudied(history),

    mostChallengingCardIds: mostChallenging.map((c) => c.id),
    overdueCardIds: overdue.map((c) => c.id),

    dueToday: forecast[0]?.count ?? 0,
    dueTomorrow: forecast[1]?.count ?? 0,
    dueThisWeek: forecast.reduce((sum, day) => sum + day.count, 0),
  };
}

// =============================================================================
// Streak Storage Functions
// =============================================================================

/**
 * Load streak history from localStorage with error handling
 */
export function loadStreakHistory(): StreakHistory {
  if (typeof window === 'undefined' || !isStorageAvailable()) {
    return createInitialStreakHistory();
  }

  const result = safeGetJSON<unknown>(
    FLASHCARD_STORAGE_KEYS.STREAK,
    null,
    (data) => {
      if (data === null) return { success: true, data: null };
      const parsed = safeParseStreakHistory(data);
      if (parsed.success) {
        return { success: true, data: parsed.data };
      }
      return { success: false, error: 'Invalid streak data' };
    }
  );

  if (result.error) {
    notifyStorageError(result.error);
  }

  if (result.data === null) {
    return createInitialStreakHistory();
  }

  const parsed = safeParseStreakHistory(result.data);
  return parsed.success ? parsed.data : createInitialStreakHistory();
}

/**
 * Save streak history to localStorage with error handling
 */
export function saveStreakHistory(streakHistory: StreakHistory): void {
  if (typeof window === 'undefined') return;

  const result = safeSetJSON(FLASHCARD_STORAGE_KEYS.STREAK, streakHistory);

  if (result.error) {
    notifyStorageError(result.error);
  }
}

// =============================================================================
// Streak Calculation Functions
// =============================================================================

/**
 * Calculate current streak from review history.
 * A streak is the number of consecutive days with at least 1 review,
 * ending at today (or yesterday if no reviews today yet).
 */
export function calculateStreakFromHistory(history: DailyReviewRecord[]): {
  currentStreak: number;
  lastStudyDate: string | null;
} {
  if (history.length === 0) {
    return { currentStreak: 0, lastStudyDate: null };
  }

  // Get dates with at least 1 review, sorted descending (most recent first)
  const datesWithReviews = history
    .filter((r) => r.totalReviews > 0)
    .map((r) => r.date)
    .sort((a, b) => b.localeCompare(a));

  if (datesWithReviews.length === 0) {
    return { currentStreak: 0, lastStudyDate: null };
  }

  const today = getTodayDateString();
  const yesterday = getDaysAgoDateString(1);
  const mostRecentStudyDate = datesWithReviews[0]!;

  // If most recent study is neither today nor yesterday, streak is broken
  if (mostRecentStudyDate !== today && mostRecentStudyDate !== yesterday) {
    return { currentStreak: 0, lastStudyDate: mostRecentStudyDate };
  }

  // Count consecutive days
  let streak = 0;
  let expectedDate = mostRecentStudyDate;

  for (const date of datesWithReviews) {
    if (date === expectedDate) {
      streak++;
      // Move to previous day
      const prevDate = parseDateString(expectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      expectedDate = formatDateString(prevDate);
    } else if (date < expectedDate) {
      // Gap found, streak ends
      break;
    }
  }

  return { currentStreak: streak, lastStudyDate: mostRecentStudyDate };
}

/**
 * Update streak after a review is recorded.
 * Returns the updated streak history with any new achievements.
 */
export function updateStreakAfterReview(
  currentStreakHistory: StreakHistory,
  reviewHistory: DailyReviewRecord[]
): StreakHistory {
  const { currentStreak, lastStudyDate } = calculateStreakFromHistory(reviewHistory);

  // Check for new milestone achievements
  const newAchievements = checkForNewMilestones(
    currentStreak,
    currentStreakHistory.achievements
  );

  const updatedHistory: StreakHistory = {
    ...currentStreakHistory,
    currentStreak,
    longestStreak: Math.max(currentStreakHistory.longestStreak, currentStreak),
    lastStudyDate,
    achievements: [...currentStreakHistory.achievements, ...newAchievements],
  };

  return updatedHistory;
}

/**
 * Check if any new milestones have been achieved.
 * Returns array of new achievements (empty if none).
 */
export function checkForNewMilestones(
  currentStreak: number,
  existingAchievements: StreakAchievement[]
): StreakAchievement[] {
  const existingMilestones = new Set(existingAchievements.map((a) => a.milestone));
  const newAchievements: StreakAchievement[] = [];

  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak >= milestone && !existingMilestones.has(milestone)) {
      newAchievements.push({
        milestone,
        achievedAt: new Date().toISOString(),
      });
    }
  }

  return newAchievements;
}

/**
 * Get the next milestone the user is working towards.
 * Returns null if all milestones have been achieved.
 */
export function getNextMilestone(currentStreak: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak < milestone) {
      return milestone;
    }
  }
  return null; // All milestones achieved
}

/**
 * Get progress towards the next milestone as a percentage (0-100).
 */
export function getMilestoneProgress(currentStreak: number): {
  nextMilestone: number | null;
  progress: number;
  daysRemaining: number;
} {
  const nextMilestone = getNextMilestone(currentStreak);

  if (nextMilestone === null) {
    return { nextMilestone: null, progress: 100, daysRemaining: 0 };
  }

  // Find previous milestone (or 0 if none)
  const milestones = [0, ...STREAK_MILESTONES];
  let previousMilestone = 0;
  for (const m of milestones) {
    if (m < nextMilestone && m <= currentStreak) {
      previousMilestone = m;
    }
  }

  const rangeSize = nextMilestone - previousMilestone;
  const progress = rangeSize > 0
    ? Math.round(((currentStreak - previousMilestone) / rangeSize) * 100)
    : 0;

  return {
    nextMilestone,
    progress,
    daysRemaining: nextMilestone - currentStreak,
  };
}

/**
 * Get human-readable milestone label.
 */
export function getMilestoneLabel(milestone: number): string {
  switch (milestone) {
    case 7:
      return '1 Week';
    case 14:
      return '2 Weeks';
    case 30:
      return '1 Month';
    case 60:
      return '2 Months';
    case 100:
      return '100 Days';
    case 180:
      return '6 Months';
    case 365:
      return '1 Year';
    default:
      return `${milestone} Days`;
  }
}

/**
 * Get an encouraging message based on streak state.
 */
export function getStreakMessage(currentStreak: number, studiedToday: boolean): string {
  if (currentStreak === 0) {
    return studiedToday ? 'Great start! Keep it going!' : 'Start a streak today!';
  }

  if (!studiedToday) {
    return `Study today to continue your ${currentStreak} day streak!`;
  }

  const { nextMilestone, daysRemaining } = getMilestoneProgress(currentStreak);

  if (nextMilestone === null) {
    return `Amazing! You've achieved all milestones!`;
  }

  if (daysRemaining === 1) {
    return `Just 1 more day to ${getMilestoneLabel(nextMilestone)}!`;
  }

  if (daysRemaining <= 3) {
    return `Only ${daysRemaining} days to ${getMilestoneLabel(nextMilestone)}!`;
  }

  return `${daysRemaining} days to ${getMilestoneLabel(nextMilestone)}`;
}

// =============================================================================
// Data Export/Import Functions
// =============================================================================

/**
 * Complete flashcard data export structure.
 * Contains all user data for backup and transfer.
 */
export interface FlashcardDataExport {
  version: number;
  exportedAt: string;
  cards: unknown[];
  packs: unknown[];
  stats: unknown;
  reviewHistory: DailyReviewRecord[];
  streakHistory: StreakHistory;
}

/** Current export format version */
const EXPORT_VERSION = 1;

/**
 * Export all flashcard data as a JSON object.
 * Includes cards, packs, stats, review history, and streak data.
 */
export function exportAllFlashcardData(): FlashcardDataExport {
  if (typeof window === 'undefined') {
    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      cards: [],
      packs: [],
      stats: null,
      reviewHistory: [],
      streakHistory: createInitialStreakHistory(),
    };
  }

  // Load all data from localStorage
  const cards = loadFromStorage(FLASHCARD_STORAGE_KEYS.CARDS, []);
  const packs = loadFromStorage(FLASHCARD_STORAGE_KEYS.PACKS, []);
  const stats = loadFromStorage(FLASHCARD_STORAGE_KEYS.STATS, null);
  const reviewHistory = loadReviewHistory();
  const streakHistory = loadStreakHistory();

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    cards,
    packs,
    stats,
    reviewHistory,
    streakHistory,
  };
}

/**
 * Helper to load data from localStorage
 */
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    const data = JSON.parse(stored);
    // Handle versioned storage format
    if (data && typeof data === 'object' && 'cards' in data) {
      return data.cards as T;
    }
    if (data && typeof data === 'object' && 'packs' in data) {
      return data.packs as T;
    }
    return data as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Download flashcard data as a JSON file.
 * Triggers browser download dialog.
 */
export function downloadFlashcardData(): void {
  const data = exportAllFlashcardData();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Create download link
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `ai-timeline-flashcards-${timestamp}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up blob URL
  URL.revokeObjectURL(url);
}

/**
 * Clear all flashcard data from localStorage.
 * This is destructive and cannot be undone.
 */
export function clearAllFlashcardData(): void {
  if (typeof window === 'undefined') return;

  clearFlashcardStorage();
}

/**
 * Get summary statistics about the data to be exported/cleared.
 * Useful for confirmation dialogs.
 */
export function getDataSummary(): {
  totalCards: number;
  totalPacks: number;
  totalReviews: number;
  streakDays: number;
  oldestCardDate: string | null;
} {
  if (typeof window === 'undefined') {
    return {
      totalCards: 0,
      totalPacks: 0,
      totalReviews: 0,
      streakDays: 0,
      oldestCardDate: null,
    };
  }

  const cards = loadFromStorage<{ createdAt?: string }[]>(FLASHCARD_STORAGE_KEYS.CARDS, []);
  const packs = loadFromStorage<unknown[]>(FLASHCARD_STORAGE_KEYS.PACKS, []);
  const reviewHistory = loadReviewHistory();
  const streakHistory = loadStreakHistory();

  // Find oldest card date
  let oldestCardDate: string | null = null;
  for (const card of cards) {
    if (card.createdAt) {
      if (!oldestCardDate || card.createdAt < oldestCardDate) {
        oldestCardDate = card.createdAt;
      }
    }
  }

  return {
    totalCards: cards.length,
    totalPacks: packs.length,
    totalReviews: getTotalReviewsAllTime(reviewHistory),
    streakDays: streakHistory.longestStreak,
    oldestCardDate,
  };
}

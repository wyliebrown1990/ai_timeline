/**
 * StreakDisplay Component Tests
 *
 * Tests for the streak display component including:
 * - Compact and full variants
 * - Milestone progress display
 * - Achievement badges
 * - Studied today indicator
 * - Encouraging messages
 */

import { render, screen } from '@testing-library/react';
import { StreakDisplay } from '../../../../src/components/Flashcards/StreakDisplay';
import type { StreakHistory, StreakAchievement } from '../../../../src/types/flashcard';
import { createInitialStreakHistory } from '../../../../src/types/flashcard';
import { getTodayDateString, getDaysAgoDateString } from '../../../../src/lib/flashcardStats';

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Create a streak history with specified values
 */
function createStreakHistory(overrides: Partial<StreakHistory> = {}): StreakHistory {
  return {
    ...createInitialStreakHistory(),
    ...overrides,
  };
}

/**
 * Create a streak achievement
 */
function createAchievement(milestone: number, daysAgo: number = 0): StreakAchievement {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    milestone,
    achievedAt: date.toISOString(),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('StreakDisplay', () => {
  describe('Component Rendering', () => {
    it('should render the streak display container', () => {
      const streakHistory = createStreakHistory();

      render(<StreakDisplay streakHistory={streakHistory} />);

      expect(screen.getByTestId('streak-display')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const streakHistory = createStreakHistory();

      render(<StreakDisplay streakHistory={streakHistory} className="custom-class" />);

      expect(screen.getByTestId('streak-display')).toHaveClass('custom-class');
    });
  });

  describe('Compact Variant', () => {
    it('should render compact variant with data-testid', () => {
      const streakHistory = createStreakHistory({ currentStreak: 5 });

      render(<StreakDisplay streakHistory={streakHistory} variant="compact" />);

      expect(screen.getByTestId('streak-display-compact')).toBeInTheDocument();
    });

    it('should display streak number in compact mode', () => {
      const streakHistory = createStreakHistory({ currentStreak: 5 });

      render(<StreakDisplay streakHistory={streakHistory} variant="compact" />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should show zap icon when studied today', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 3,
        lastStudyDate: getTodayDateString(),
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="compact" />);

      // Check for aria-label since the icon uses it
      expect(screen.getByLabelText('Studied today')).toBeInTheDocument();
    });
  });

  describe('Full Variant', () => {
    it('should display current streak prominently', () => {
      const streakHistory = createStreakHistory({ currentStreak: 12 });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display "days" label for multiple days', () => {
      const streakHistory = createStreakHistory({ currentStreak: 5 });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByText('days')).toBeInTheDocument();
    });

    it('should display "day" label for single day', () => {
      const streakHistory = createStreakHistory({ currentStreak: 1 });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByText('day')).toBeInTheDocument();
    });

    it('should display encouraging message', () => {
      const streakHistory = createStreakHistory({ currentStreak: 5 });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByTestId('streak-message')).toBeInTheDocument();
    });

    it('should show "Start a streak today!" when no streak', () => {
      const streakHistory = createStreakHistory({ currentStreak: 0 });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByText('Start a streak today!')).toBeInTheDocument();
    });
  });

  describe('Longest Streak Display', () => {
    it('should show best streak when longer than current', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 3,
        longestStreak: 10,
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByText('Best: 10 days')).toBeInTheDocument();
    });

    it('should not show best streak when equal to current', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 10,
        longestStreak: 10,
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.queryByText('Best: 10 days')).not.toBeInTheDocument();
    });
  });

  describe('Milestone Progress', () => {
    it('should show progress bar when streak > 0', () => {
      const streakHistory = createStreakHistory({ currentStreak: 3 });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByTestId('milestone-progress')).toBeInTheDocument();
    });

    it('should not show progress bar when streak is 0', () => {
      const streakHistory = createStreakHistory({ currentStreak: 0 });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.queryByTestId('milestone-progress')).not.toBeInTheDocument();
    });

    it('should show next milestone label', () => {
      const streakHistory = createStreakHistory({ currentStreak: 5 });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      // Check within the progress section specifically
      const progressSection = screen.getByTestId('milestone-progress');
      expect(progressSection).toHaveTextContent('1 Week');
    });

    it('should show days remaining to milestone', () => {
      const streakHistory = createStreakHistory({ currentStreak: 5 });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByText(/2 days left/)).toBeInTheDocument();
    });
  });

  describe('Achievement Badges', () => {
    it('should display achieved milestones', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 10,
        achievements: [createAchievement(7)],
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByTestId('achieved-milestones')).toBeInTheDocument();
      expect(screen.getByTestId('milestone-badge-7')).toBeInTheDocument();
    });

    it('should display multiple achievement badges', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 35,
        achievements: [
          createAchievement(7),
          createAchievement(14),
          createAchievement(30),
        ],
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByTestId('milestone-badge-7')).toBeInTheDocument();
      expect(screen.getByTestId('milestone-badge-14')).toBeInTheDocument();
      expect(screen.getByTestId('milestone-badge-30')).toBeInTheDocument();
    });

    it('should display "Milestones Achieved" label when has achievements', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 10,
        achievements: [createAchievement(7)],
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByText('Milestones Achieved')).toBeInTheDocument();
    });

    it('should show milestone labels on badges', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 40,
        achievements: [createAchievement(7), createAchievement(30)],
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByText('1 Week')).toBeInTheDocument();
      expect(screen.getByText('1 Month')).toBeInTheDocument();
    });
  });

  describe('Upcoming Milestones (No Achievements Yet)', () => {
    it('should show upcoming milestones when no achievements', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 3,
        achievements: [],
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByTestId('upcoming-milestones')).toBeInTheDocument();
    });

    it('should list first three milestones', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 3,
        achievements: [],
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      const upcomingSection = screen.getByTestId('upcoming-milestones');
      expect(upcomingSection).toHaveTextContent('1 Week');
      expect(upcomingSection).toHaveTextContent('2 Weeks');
      expect(upcomingSection).toHaveTextContent('1 Month');
    });

    it('should not show upcoming milestones when has achievements', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 10,
        achievements: [createAchievement(7)],
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.queryByTestId('upcoming-milestones')).not.toBeInTheDocument();
    });
  });

  describe('Studied Today Indicator', () => {
    it('should show zap icon when studied today', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 5,
        lastStudyDate: getTodayDateString(),
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByLabelText('Studied today')).toBeInTheDocument();
    });

    it('should not show zap icon when not studied today', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 5,
        lastStudyDate: getDaysAgoDateString(1),
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.queryByLabelText('Studied today')).not.toBeInTheDocument();
    });

    it('should not show zap icon when streak is 0', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 0,
        lastStudyDate: getTodayDateString(),
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.queryByLabelText('Studied today')).not.toBeInTheDocument();
    });
  });

  describe('Zero Streak State', () => {
    it('should display 0 for zero streak', () => {
      const streakHistory = createStreakHistory({ currentStreak: 0 });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should show "Start a streak" message', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 0,
        lastStudyDate: null,
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByText('Start a streak today!')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long streaks', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 500,
        longestStreak: 500,
        achievements: [
          createAchievement(7),
          createAchievement(14),
          createAchievement(30),
          createAchievement(60),
          createAchievement(100),
          createAchievement(180),
          createAchievement(365),
        ],
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('should not show progress bar when all milestones achieved', () => {
      const streakHistory = createStreakHistory({
        currentStreak: 400,
        achievements: [
          createAchievement(7),
          createAchievement(14),
          createAchievement(30),
          createAchievement(60),
          createAchievement(100),
          createAchievement(180),
          createAchievement(365),
        ],
      });

      render(<StreakDisplay streakHistory={streakHistory} variant="full" />);

      // Progress bar shouldn't show since all milestones are achieved
      expect(screen.queryByTestId('milestone-progress')).not.toBeInTheDocument();
    });
  });
});

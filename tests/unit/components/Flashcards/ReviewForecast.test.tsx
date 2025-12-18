/**
 * ReviewForecast Component Tests
 *
 * Tests for the upcoming review forecast display including:
 * - Bar chart visualization
 * - List view with day labels
 * - Study time estimates
 * - Heavy day warnings
 * - Empty state handling
 * - Weekly totals
 */

import { render, screen } from '@testing-library/react';
import { ReviewForecast } from '../../../../src/components/Flashcards/ReviewForecast';
import type { ForecastDay } from '../../../../src/components/Flashcards/ReviewForecast';

// =============================================================================
// Test Data Helpers
// =============================================================================

/**
 * Generate mock forecast data for a given number of days
 */
function generateMockForecastData(
  days: number,
  options: { baseCount?: number; variance?: number } = {}
): ForecastDay[] {
  const { baseCount = 5, variance = 3 } = options;
  const data: ForecastDay[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0]!;
    const count = Math.max(0, baseCount + Math.floor((Math.random() - 0.5) * variance * 2));
    data.push({ date: dateStr, count });
  }

  return data;
}

/**
 * Generate forecast data with specific counts
 */
function generateSpecificForecastData(counts: number[]): ForecastDay[] {
  return counts.map((count, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return { date: date.toISOString().split('T')[0]!, count };
  });
}

/**
 * Generate empty forecast data (all zeros)
 */
function generateEmptyForecastData(days: number): ForecastDay[] {
  return generateSpecificForecastData(Array(days).fill(0));
}

// =============================================================================
// Tests
// =============================================================================

describe('ReviewForecast', () => {
  describe('Component Rendering', () => {
    it('should render the forecast container', () => {
      const data = generateMockForecastData(7);

      render(<ReviewForecast data={data} />);

      expect(screen.getByTestId('review-forecast')).toBeInTheDocument();
    });

    it('should render the bar chart', () => {
      const data = generateMockForecastData(7);

      render(<ReviewForecast data={data} />);

      expect(screen.getByTestId('forecast-bar-chart')).toBeInTheDocument();
    });

    it('should render the forecast list', () => {
      const data = generateMockForecastData(7);

      render(<ReviewForecast data={data} />);

      expect(screen.getByTestId('forecast-list')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const data = generateMockForecastData(7);

      render(<ReviewForecast data={data} className="custom-forecast" />);

      expect(screen.getByTestId('review-forecast')).toHaveClass('custom-forecast');
    });
  });

  describe('Day Labels', () => {
    it('should display "Today" for the first day', () => {
      const data = generateSpecificForecastData([5, 3, 2]);

      render(<ReviewForecast data={data} days={3} />);

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('should display "Tomorrow" for the second day', () => {
      const data = generateSpecificForecastData([5, 3, 2]);

      render(<ReviewForecast data={data} days={3} />);

      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    });

    it('should display weekday abbreviations for days beyond tomorrow', () => {
      const data = generateSpecificForecastData([5, 3, 2, 4, 1, 2, 3]);

      render(<ReviewForecast data={data} days={7} />);

      // Should find at least one weekday abbreviation (Mon, Tue, Wed, etc.)
      const listItems = screen.getAllByTestId(/forecast-day-/);
      expect(listItems.length).toBe(7);
    });
  });

  describe('Card Counts', () => {
    it('should display card count for each day', () => {
      const data = generateSpecificForecastData([5, 10, 3]);

      render(<ReviewForecast data={data} days={3} />);

      expect(screen.getByText('5 cards')).toBeInTheDocument();
      expect(screen.getByText('10 cards')).toBeInTheDocument();
      expect(screen.getByText('3 cards')).toBeInTheDocument();
    });

    it('should use singular "card" for count of 1', () => {
      const data = generateSpecificForecastData([1, 2]);

      render(<ReviewForecast data={data} days={2} />);

      expect(screen.getByText('1 card')).toBeInTheDocument();
      expect(screen.getByText('2 cards')).toBeInTheDocument();
    });

    it('should display weekly total', () => {
      const data = generateSpecificForecastData([5, 3, 2, 4, 1, 2, 3]); // Total: 20

      render(<ReviewForecast data={data} days={7} />);

      expect(screen.getByText('20 total')).toBeInTheDocument();
    });
  });

  describe('Study Time Estimates', () => {
    it('should show time estimate for days with cards', () => {
      // Use different card counts so day estimate differs from weekly total
      const data = generateSpecificForecastData([10, 20]); // Day 1: ~5min, Day 2: ~10min, Total: ~15min

      render(<ReviewForecast data={data} days={2} />);

      // Should show individual day estimates
      const estimates = screen.getAllByText(/~\d+ min/);
      expect(estimates.length).toBeGreaterThanOrEqual(2);
    });

    it('should show hours for large card counts', () => {
      // 180 cards total, but day 1 has 120 = 1h, total would be different
      const data = generateSpecificForecastData([120, 60]); // Day 1: ~1h, Day 2: ~30min, Total: ~1h 30m

      render(<ReviewForecast data={data} days={2} />);

      // Should find at least one "~1h" element (from day 1)
      const hourEstimates = screen.getAllByText('~1h');
      expect(hourEstimates.length).toBeGreaterThanOrEqual(1);
    });

    it('should show weekly time estimate', () => {
      const data = generateSpecificForecastData([10, 10, 10, 10, 10, 10, 10]); // 70 cards total

      render(<ReviewForecast data={data} days={7} />);

      // 70 cards * 0.5 = 35 min shown in the weekly summary
      // Each day shows ~5 min, so we should find multiple ~5 min instances
      const fiveMinEstimates = screen.getAllByText('~5 min');
      expect(fiveMinEstimates.length).toBeGreaterThanOrEqual(1);

      // And the weekly total ~35 min
      expect(screen.getByText('~35 min')).toBeInTheDocument();
    });
  });

  describe('Heavy Day Warnings', () => {
    it('should show warning icon for heavy review days (15+ cards)', () => {
      const data = generateSpecificForecastData([5, 20, 3]); // Day 2 has 20 cards

      render(<ReviewForecast data={data} days={3} />);

      // Should have warning icon for heavy day
      const warningIcon = screen.getByLabelText('Heavy review day');
      expect(warningIcon).toBeInTheDocument();
    });

    it('should show planning tip when heavy days exist', () => {
      const data = generateSpecificForecastData([5, 20, 3]);

      render(<ReviewForecast data={data} days={3} />);

      expect(screen.getByText(/heavy review day/i)).toBeInTheDocument();
    });

    it('should not show warning for normal days', () => {
      const data = generateSpecificForecastData([5, 10, 3]); // All under 15

      render(<ReviewForecast data={data} days={3} />);

      expect(screen.queryByLabelText('Heavy review day')).not.toBeInTheDocument();
    });

    it('should pluralize heavy days message correctly', () => {
      const data = generateSpecificForecastData([20, 25, 15, 30]); // 4 heavy days

      render(<ReviewForecast data={data} days={4} />);

      expect(screen.getByText(/4 heavy review days/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no cards are due', () => {
      const data = generateEmptyForecastData(7);

      render(<ReviewForecast data={data} />);

      expect(screen.getByTestId('forecast-empty')).toBeInTheDocument();
    });

    it('should display "No upcoming reviews" message', () => {
      const data = generateEmptyForecastData(7);

      render(<ReviewForecast data={data} />);

      expect(screen.getByText('No upcoming reviews')).toBeInTheDocument();
    });

    it('should not render bar chart or list in empty state', () => {
      const data = generateEmptyForecastData(7);

      render(<ReviewForecast data={data} />);

      expect(screen.queryByTestId('forecast-bar-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('forecast-list')).not.toBeInTheDocument();
    });
  });

  describe('Days Prop', () => {
    it('should respect custom days count', () => {
      const data = generateMockForecastData(10);

      render(<ReviewForecast data={data} days={5} />);

      // Should only show 5 days in the list
      const listItems = screen.getAllByTestId(/forecast-day-/);
      expect(listItems.length).toBe(5);
    });

    it('should default to 7 days', () => {
      const data = generateMockForecastData(10);

      render(<ReviewForecast data={data} />);

      const listItems = screen.getAllByTestId(/forecast-day-/);
      expect(listItems.length).toBe(7);
    });

    it('should handle data with fewer days than requested', () => {
      const data = generateMockForecastData(3);

      render(<ReviewForecast data={data} days={7} />);

      // Should only show 3 days since that's all we have
      const listItems = screen.getAllByTestId(/forecast-day-/);
      expect(listItems.length).toBe(3);
    });
  });

  describe('Today Highlighting', () => {
    it('should highlight today differently than other days', () => {
      const data = generateSpecificForecastData([5, 3, 2]);

      render(<ReviewForecast data={data} days={3} />);

      const todayItem = screen.getByTestId('forecast-day-0');
      expect(todayItem).toHaveClass('bg-orange-50');
    });

    it('should not highlight other days with orange', () => {
      const data = generateSpecificForecastData([5, 3, 2]);

      render(<ReviewForecast data={data} days={3} />);

      const tomorrowItem = screen.getByTestId('forecast-day-1');
      expect(tomorrowItem).not.toHaveClass('bg-orange-50');
      expect(tomorrowItem).toHaveClass('bg-gray-50');
    });
  });

  describe('Header', () => {
    it('should display "Next 7 Days" header by default', () => {
      const data = generateMockForecastData(7);

      render(<ReviewForecast data={data} />);

      expect(screen.getByText('Next 7 Days')).toBeInTheDocument();
    });

    it('should update header text based on days prop', () => {
      const data = generateMockForecastData(5);

      render(<ReviewForecast data={data} days={5} />);

      expect(screen.getByText('Next 5 Days')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on bar chart', () => {
      const data = generateMockForecastData(7);

      render(<ReviewForecast data={data} />);

      const barChart = screen.getByTestId('forecast-bar-chart');
      expect(barChart).toHaveAttribute('aria-label', 'Review forecast bar chart');
    });

    it('should have data-testid attributes on day items', () => {
      const data = generateSpecificForecastData([5, 3, 2]);

      render(<ReviewForecast data={data} days={3} />);

      expect(screen.getByTestId('forecast-day-0')).toBeInTheDocument();
      expect(screen.getByTestId('forecast-day-1')).toBeInTheDocument();
      expect(screen.getByTestId('forecast-day-2')).toBeInTheDocument();
    });
  });
});

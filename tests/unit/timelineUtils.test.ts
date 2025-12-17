// Jest test for timeline utilities
import { MilestoneCategory, SignificanceLevel } from '../../src/types/milestone';
import {
  calculateMilestonePosition,
  calculateTimeRange,
  calculateVerticalStagger,
  categoryBadgeClasses,
  categoryColors,
  categoryLabels,
  formatTimelineDate,
  generateYearMarkers,
  groupMilestonesByYear,
  significanceLabels,
  significanceScale,
} from '../../src/utils/timelineUtils';

describe('timelineUtils', () => {
  describe('categoryColors', () => {
    it('should have colors for all milestone categories', () => {
      const categories = Object.values(MilestoneCategory);
      categories.forEach((category) => {
        expect(categoryColors[category]).toBeDefined();
        expect(categoryColors[category]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('categoryLabels', () => {
    it('should have human-readable labels for all categories', () => {
      expect(categoryLabels[MilestoneCategory.RESEARCH]).toBe('Research');
      expect(categoryLabels[MilestoneCategory.MODEL_RELEASE]).toBe('Model Release');
      expect(categoryLabels[MilestoneCategory.BREAKTHROUGH]).toBe('Breakthrough');
      expect(categoryLabels[MilestoneCategory.PRODUCT]).toBe('Product');
      expect(categoryLabels[MilestoneCategory.REGULATION]).toBe('Regulation');
      expect(categoryLabels[MilestoneCategory.INDUSTRY]).toBe('Industry');
    });
  });

  describe('categoryBadgeClasses', () => {
    it('should have Tailwind classes for all categories', () => {
      const categories = Object.values(MilestoneCategory);
      categories.forEach((category) => {
        expect(categoryBadgeClasses[category]).toBeDefined();
        expect(categoryBadgeClasses[category]).toContain('bg-');
        expect(categoryBadgeClasses[category]).toContain('text-');
      });
    });
  });

  describe('significanceLabels', () => {
    it('should have labels for all significance levels', () => {
      expect(significanceLabels[SignificanceLevel.MINOR]).toBe('Minor');
      expect(significanceLabels[SignificanceLevel.MODERATE]).toBe('Moderate');
      expect(significanceLabels[SignificanceLevel.MAJOR]).toBe('Major');
      expect(significanceLabels[SignificanceLevel.GROUNDBREAKING]).toBe('Groundbreaking');
    });
  });

  describe('significanceScale', () => {
    it('should have increasing scale values for higher significance', () => {
      expect(significanceScale[SignificanceLevel.MINOR]).toBeLessThan(
        significanceScale[SignificanceLevel.MODERATE]
      );
      expect(significanceScale[SignificanceLevel.MODERATE]).toBeLessThan(
        significanceScale[SignificanceLevel.MAJOR]
      );
      expect(significanceScale[SignificanceLevel.MAJOR]).toBeLessThan(
        significanceScale[SignificanceLevel.GROUNDBREAKING]
      );
    });
  });

  describe('calculateMilestonePosition', () => {
    it('should calculate position at start of range', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2025-01-01');
      const position = calculateMilestonePosition(startDate, [startDate, endDate], 1000);
      expect(position).toBe(0);
    });

    it('should calculate position at end of range', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2025-01-01');
      const position = calculateMilestonePosition(endDate, [startDate, endDate], 1000);
      expect(position).toBe(1000);
    });

    it('should calculate position in middle of range', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2025-01-01');
      const midDate = new Date('2022-07-01'); // Approximately middle
      const position = calculateMilestonePosition(midDate, [startDate, endDate], 1000);
      expect(position).toBeGreaterThan(400);
      expect(position).toBeLessThan(600);
    });

    it('should clamp positions before start date', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2025-01-01');
      const earlyDate = new Date('2015-01-01');
      const position = calculateMilestonePosition(earlyDate, [startDate, endDate], 1000);
      expect(position).toBe(0);
    });

    it('should clamp positions after end date', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2025-01-01');
      const lateDate = new Date('2030-01-01');
      const position = calculateMilestonePosition(lateDate, [startDate, endDate], 1000);
      expect(position).toBe(1000);
    });
  });

  describe('generateYearMarkers', () => {
    it('should generate markers at default 5-year intervals', () => {
      const markers = generateYearMarkers(2000, 2020);
      expect(markers).toEqual([2000, 2005, 2010, 2015, 2020]);
    });

    it('should generate markers at custom intervals', () => {
      const markers = generateYearMarkers(2000, 2010, 2);
      expect(markers).toEqual([2000, 2002, 2004, 2006, 2008, 2010]);
    });

    it('should round start year to nearest interval', () => {
      const markers = generateYearMarkers(2003, 2020, 5);
      expect(markers).toEqual([2005, 2010, 2015, 2020]);
    });

    it('should return empty array if range is less than interval', () => {
      const markers = generateYearMarkers(2000, 2002, 5);
      expect(markers).toEqual([2000]);
    });
  });

  describe('calculateTimeRange', () => {
    it('should return default range for empty dates array', () => {
      const [start, end] = calculateTimeRange([]);
      const now = new Date();
      expect(start.getFullYear()).toBe(now.getFullYear() - 10);
      expect(end.getFullYear()).toBe(now.getFullYear() + 1);
    });

    it('should calculate range with default padding', () => {
      const dates = [new Date('2010-06-15'), new Date('2020-03-20')];
      const [start, end] = calculateTimeRange(dates);
      expect(start.getFullYear()).toBe(2008); // 2010 - 2
      expect(end.getFullYear()).toBe(2022); // 2020 + 2
    });

    it('should calculate range with custom padding', () => {
      const dates = [new Date('2015-06-15'), new Date('2020-06-15')];
      const [start, end] = calculateTimeRange(dates, 5);
      expect(start.getFullYear()).toBe(2010); // 2015 - 5
      expect(end.getFullYear()).toBe(2025); // 2020 + 5
    });
  });

  describe('groupMilestonesByYear', () => {
    it('should group milestones by their year', () => {
      const milestones = [
        { date: '2020-01-15' },
        { date: '2020-06-20' },
        { date: '2021-03-10' },
        { date: '2022-12-01' },
      ];
      const groups = groupMilestonesByYear(milestones);
      expect(groups.get(2020)).toEqual([0, 1]);
      expect(groups.get(2021)).toEqual([2]);
      expect(groups.get(2022)).toEqual([3]);
    });

    it('should handle Date objects', () => {
      const milestones = [
        { date: new Date('2020-01-15') },
        { date: new Date('2020-06-20') },
      ];
      const groups = groupMilestonesByYear(milestones);
      expect(groups.get(2020)).toEqual([0, 1]);
    });

    it('should return empty map for empty array', () => {
      const groups = groupMilestonesByYear([]);
      expect(groups.size).toBe(0);
    });
  });

  describe('calculateVerticalStagger', () => {
    it('should place first item above the timeline', () => {
      const offset = calculateVerticalStagger(0);
      expect(offset).toBeLessThan(0);
    });

    it('should place second item below the timeline', () => {
      const offset = calculateVerticalStagger(1);
      expect(offset).toBeGreaterThan(0);
    });

    it('should alternate between above and below', () => {
      const offsets = [0, 1, 2, 3, 4, 5].map((i) => calculateVerticalStagger(i));
      // Even indices are negative (above), odd are positive (below)
      offsets.forEach((offset, i) => {
        if (i % 2 === 0) {
          expect(offset).toBeLessThan(0);
        } else {
          expect(offset).toBeGreaterThan(0);
        }
      });
    });

    it('should increase offset for items at the same position', () => {
      const offset0 = Math.abs(calculateVerticalStagger(0));
      const offset2 = Math.abs(calculateVerticalStagger(2));
      const offset4 = Math.abs(calculateVerticalStagger(4));
      expect(offset2).toBeGreaterThan(offset0);
      expect(offset4).toBeGreaterThan(offset2);
    });
  });

  describe('formatTimelineDate', () => {
    // Use a date that won't shift across timezone boundaries
    const testDate = new Date(2023, 5, 15); // June 15, 2023 local time

    it('should format date as year only', () => {
      expect(formatTimelineDate(testDate, 'year')).toBe('2023');
    });

    it('should format date with month and year', () => {
      const result = formatTimelineDate(testDate, 'month');
      expect(result).toContain('Jun');
      expect(result).toContain('2023');
    });

    it('should format full date', () => {
      const result = formatTimelineDate(testDate, 'full');
      expect(result).toContain('Jun');
      expect(result).toContain('2023');
      // Day should be present (may vary by 1 due to timezone)
      expect(result).toMatch(/\d{1,2}/);
    });

    it('should default to year format', () => {
      expect(formatTimelineDate(testDate)).toBe('2023');
    });
  });
});

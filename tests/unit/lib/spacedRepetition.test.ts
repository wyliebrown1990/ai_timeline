import {
  calculateSM2,
  calculateEaseFactor,
  addDays,
  getNextReviewDate,
  isCardDueForReview,
  isCardMastered,
  getRatingLabel,
  getEstimatedInterval,
  formatInterval,
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
  MAX_EASE_FACTOR,
  EASY_BONUS,
  type QualityRating,
  type SM2Input,
} from '../../../src/lib/spacedRepetition';

describe('SM-2 Spaced Repetition Algorithm', () => {
  // ==========================================================================
  // Core SM-2 Algorithm Tests
  // ==========================================================================

  describe('calculateSM2', () => {
    describe('failed recall (quality < 3)', () => {
      it('should reset repetitions to 0 on "Again" rating', () => {
        const input: SM2Input = {
          quality: 0,
          currentEaseFactor: 2.5,
          currentInterval: 10,
          currentRepetitions: 5,
        };
        const result = calculateSM2(input);

        expect(result.repetitions).toBe(0);
      });

      it('should set interval to 1 day on failure', () => {
        const input: SM2Input = {
          quality: 0,
          currentEaseFactor: 2.5,
          currentInterval: 30,
          currentRepetitions: 10,
        };
        const result = calculateSM2(input);

        expect(result.interval).toBe(1);
      });

      it('should still update ease factor on failure', () => {
        const input: SM2Input = {
          quality: 0,
          currentEaseFactor: 2.5,
          currentInterval: 10,
          currentRepetitions: 3,
        };
        const result = calculateSM2(input);

        // Quality 0: EF' = 2.5 + (0.1 - 5 * (0.08 + 5 * 0.02)) = 2.5 + (0.1 - 0.9) = 1.7
        expect(result.easeFactor).toBeLessThan(2.5);
      });
    });

    describe('first successful review', () => {
      it('should set interval to 1 day on first success', () => {
        const input: SM2Input = {
          quality: 4,
          currentEaseFactor: 2.5,
          currentInterval: 0,
          currentRepetitions: 0,
        };
        const result = calculateSM2(input);

        expect(result.interval).toBe(1);
        expect(result.repetitions).toBe(1);
      });
    });

    describe('second successful review', () => {
      it('should set interval to 3 days on second success', () => {
        const input: SM2Input = {
          quality: 4,
          currentEaseFactor: 2.5,
          currentInterval: 1,
          currentRepetitions: 1,
        };
        const result = calculateSM2(input);

        expect(result.interval).toBe(3);
        expect(result.repetitions).toBe(2);
      });
    });

    describe('subsequent successful reviews', () => {
      it('should multiply interval by ease factor', () => {
        const input: SM2Input = {
          quality: 4,
          currentEaseFactor: 2.5,
          currentInterval: 3,
          currentRepetitions: 2,
        };
        const result = calculateSM2(input);

        // 3 * 2.5 = 7.5, rounded to 8
        expect(result.interval).toBe(8);
        expect(result.repetitions).toBe(3);
      });

      it('should use updated ease factor for calculation', () => {
        const input: SM2Input = {
          quality: 3, // Hard rating decreases EF
          currentEaseFactor: 2.5,
          currentInterval: 10,
          currentRepetitions: 3,
        };
        const result = calculateSM2(input);

        // EF should decrease with quality 3
        expect(result.easeFactor).toBeLessThan(2.5);
        // Interval should be calculated with new EF
        expect(result.interval).toBeLessThan(25); // Would be 25 with EF 2.5
      });
    });

    describe('Easy bonus', () => {
      it('should apply 1.3x bonus for Easy rating on first review', () => {
        const input: SM2Input = {
          quality: 5,
          currentEaseFactor: 2.5,
          currentInterval: 0,
          currentRepetitions: 0,
        };
        const result = calculateSM2(input);

        // First review: 1 day * 1.3 = 1.3, rounded to 1
        expect(result.interval).toBe(1);
      });

      it('should apply 1.3x bonus for Easy rating on second review', () => {
        const input: SM2Input = {
          quality: 5,
          currentEaseFactor: 2.5,
          currentInterval: 1,
          currentRepetitions: 1,
        };
        const result = calculateSM2(input);

        // Second review: 3 days * 1.3 = 3.9, rounded to 4
        expect(result.interval).toBe(4);
      });

      it('should apply 1.3x bonus for Easy rating on subsequent reviews', () => {
        const input: SM2Input = {
          quality: 5,
          currentEaseFactor: 2.5,
          currentInterval: 10,
          currentRepetitions: 3,
        };
        const result = calculateSM2(input);

        // Base: 10 * 2.6 (increased EF) ≈ 26, then * 1.3 ≈ 34
        expect(result.interval).toBeGreaterThan(30);
      });

      it('should not apply bonus for non-Easy ratings', () => {
        const goodInput: SM2Input = {
          quality: 4,
          currentEaseFactor: 2.5,
          currentInterval: 10,
          currentRepetitions: 3,
        };
        const easyInput: SM2Input = {
          quality: 5,
          currentEaseFactor: 2.5,
          currentInterval: 10,
          currentRepetitions: 3,
        };

        const goodResult = calculateSM2(goodInput);
        const easyResult = calculateSM2(easyInput);

        // Easy should give longer interval due to bonus
        expect(easyResult.interval).toBeGreaterThan(goodResult.interval);
      });
    });

    describe('next review date', () => {
      it('should set next review date based on interval', () => {
        const now = new Date();
        const input: SM2Input = {
          quality: 4,
          currentEaseFactor: 2.5,
          currentInterval: 3,
          currentRepetitions: 2,
        };
        const result = calculateSM2(input);
        const nextDate = new Date(result.nextReviewDate);

        // Should be approximately 8 days from now
        const expectedDate = addDays(now, 8);
        const diff = Math.abs(nextDate.getTime() - expectedDate.getTime());

        // Allow 1 second tolerance
        expect(diff).toBeLessThan(1000);
      });
    });
  });

  // ==========================================================================
  // Ease Factor Tests
  // ==========================================================================

  describe('calculateEaseFactor', () => {
    it('should increase ease factor on quality 5', () => {
      const newEF = calculateEaseFactor(2.5, 5);
      expect(newEF).toBeGreaterThan(2.5);
    });

    it('should maintain ease factor on quality 4', () => {
      const newEF = calculateEaseFactor(2.5, 4);
      // Quality 4: delta = 0.1 - 1 * (0.08 + 1 * 0.02) = 0.1 - 0.1 = 0
      expect(newEF).toBe(2.5);
    });

    it('should decrease ease factor on quality 3', () => {
      const newEF = calculateEaseFactor(2.5, 3);
      expect(newEF).toBeLessThan(2.5);
    });

    it('should significantly decrease ease factor on quality 0', () => {
      const newEF = calculateEaseFactor(2.5, 0);
      expect(newEF).toBeLessThan(2.0);
    });

    it('should clamp ease factor to minimum 1.3', () => {
      // Even with repeated low quality, should not go below 1.3
      let ef = 2.5;
      for (let i = 0; i < 20; i++) {
        ef = calculateEaseFactor(ef, 0);
      }
      expect(ef).toBe(MIN_EASE_FACTOR);
    });

    it('should clamp ease factor to maximum 3.0', () => {
      // Even with repeated high quality, should not go above 3.0
      let ef = 2.5;
      for (let i = 0; i < 20; i++) {
        ef = calculateEaseFactor(ef, 5);
      }
      expect(ef).toBe(MAX_EASE_FACTOR);
    });
  });

  // ==========================================================================
  // Utility Function Tests
  // ==========================================================================

  describe('addDays', () => {
    it('should add days to a date', () => {
      const date = new Date('2024-01-15T12:00:00.000Z');
      const result = addDays(date, 7);

      expect(result.getDate()).toBe(22);
      expect(result.getMonth()).toBe(0); // January
    });

    it('should handle month rollover', () => {
      const date = new Date('2024-01-28T12:00:00.000Z');
      const result = addDays(date, 7);

      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(4);
    });

    it('should handle zero days', () => {
      const date = new Date('2024-01-15T12:00:00.000Z');
      const result = addDays(date, 0);

      expect(result.getDate()).toBe(date.getDate());
    });

    it('should not mutate the original date', () => {
      const date = new Date('2024-01-15T12:00:00.000Z');
      const originalTime = date.getTime();
      addDays(date, 7);

      expect(date.getTime()).toBe(originalTime);
    });
  });

  describe('getNextReviewDate', () => {
    it('should return ISO string for date N days from now', () => {
      const result = getNextReviewDate(7);
      const resultDate = new Date(result);
      const expectedDate = addDays(new Date(), 7);

      const diff = Math.abs(resultDate.getTime() - expectedDate.getTime());
      expect(diff).toBeLessThan(1000);
    });

    it('should return today for 0 days', () => {
      const result = getNextReviewDate(0);
      const resultDate = new Date(result);
      const today = new Date();

      expect(resultDate.getDate()).toBe(today.getDate());
    });
  });

  describe('isCardDueForReview', () => {
    it('should return true for null date (never reviewed)', () => {
      expect(isCardDueForReview(null)).toBe(true);
    });

    it('should return true for past date', () => {
      const pastDate = addDays(new Date(), -1).toISOString();
      expect(isCardDueForReview(pastDate)).toBe(true);
    });

    it('should return true for current date', () => {
      const now = new Date().toISOString();
      expect(isCardDueForReview(now)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = addDays(new Date(), 1).toISOString();
      expect(isCardDueForReview(futureDate)).toBe(false);
    });
  });

  describe('isCardMastered', () => {
    it('should return false for interval <= 21', () => {
      expect(isCardMastered(0)).toBe(false);
      expect(isCardMastered(10)).toBe(false);
      expect(isCardMastered(21)).toBe(false);
    });

    it('should return true for interval > 21', () => {
      expect(isCardMastered(22)).toBe(true);
      expect(isCardMastered(30)).toBe(true);
      expect(isCardMastered(100)).toBe(true);
    });
  });

  describe('getRatingLabel', () => {
    it('should return correct labels for each rating', () => {
      expect(getRatingLabel(0)).toBe('Again');
      expect(getRatingLabel(3)).toBe('Hard');
      expect(getRatingLabel(4)).toBe('Good');
      expect(getRatingLabel(5)).toBe('Easy');
    });
  });

  describe('getEstimatedInterval', () => {
    it('should return interval for each rating option', () => {
      const againInterval = getEstimatedInterval(0, 2.5, 10, 3);
      const hardInterval = getEstimatedInterval(3, 2.5, 10, 3);
      const goodInterval = getEstimatedInterval(4, 2.5, 10, 3);
      const easyInterval = getEstimatedInterval(5, 2.5, 10, 3);

      expect(againInterval).toBe(1);
      expect(hardInterval).toBeGreaterThan(againInterval);
      expect(goodInterval).toBeGreaterThan(hardInterval);
      expect(easyInterval).toBeGreaterThan(goodInterval);
    });
  });

  describe('formatInterval', () => {
    it('should format 0 days as "now"', () => {
      expect(formatInterval(0)).toBe('now');
    });

    it('should format 1 day correctly', () => {
      expect(formatInterval(1)).toBe('1 day');
    });

    it('should format days (2-6) correctly', () => {
      expect(formatInterval(2)).toBe('2 days');
      expect(formatInterval(6)).toBe('6 days');
    });

    it('should format 1 week correctly', () => {
      expect(formatInterval(7)).toBe('1 week');
      expect(formatInterval(10)).toBe('1 week');
    });

    it('should format multiple weeks correctly', () => {
      expect(formatInterval(14)).toBe('2 weeks');
      expect(formatInterval(21)).toBe('3 weeks');
    });

    it('should format 1 month correctly', () => {
      expect(formatInterval(30)).toBe('1 month');
      expect(formatInterval(45)).toBe('1 month');
    });

    it('should format multiple months correctly', () => {
      expect(formatInterval(60)).toBe('2 months');
      expect(formatInterval(90)).toBe('3 months');
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe('Constants', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_EASE_FACTOR).toBe(2.5);
      expect(MIN_EASE_FACTOR).toBe(1.3);
      expect(MAX_EASE_FACTOR).toBe(3.0);
      expect(EASY_BONUS).toBe(1.3);
    });
  });

  // ==========================================================================
  // Integration / Realistic Scenario Tests
  // ==========================================================================

  describe('Realistic learning scenarios', () => {
    it('should simulate learning a new card successfully', () => {
      // New card: first review
      let result = calculateSM2({
        quality: 4,
        currentEaseFactor: DEFAULT_EASE_FACTOR,
        currentInterval: 0,
        currentRepetitions: 0,
      });
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);

      // Second review
      result = calculateSM2({
        quality: 4,
        currentEaseFactor: result.easeFactor,
        currentInterval: result.interval,
        currentRepetitions: result.repetitions,
      });
      expect(result.interval).toBe(3);
      expect(result.repetitions).toBe(2);

      // Third review
      result = calculateSM2({
        quality: 4,
        currentEaseFactor: result.easeFactor,
        currentInterval: result.interval,
        currentRepetitions: result.repetitions,
      });
      expect(result.interval).toBeGreaterThan(3);
      expect(result.repetitions).toBe(3);
    });

    it('should handle forgetting and relearning', () => {
      // Card with good progress
      let result = calculateSM2({
        quality: 4,
        currentEaseFactor: 2.5,
        currentInterval: 10,
        currentRepetitions: 4,
      });

      // User forgets
      result = calculateSM2({
        quality: 0,
        currentEaseFactor: result.easeFactor,
        currentInterval: result.interval,
        currentRepetitions: result.repetitions,
      });

      // Reset to beginning
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBeLessThan(2.5);
    });

    it('should allow cards to reach mastery', () => {
      let result = {
        easeFactor: DEFAULT_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
      };

      // Simulate perfect reviews until mastery
      for (let i = 0; i < 10 && result.interval <= 21; i++) {
        result = calculateSM2({
          quality: 5,
          currentEaseFactor: result.easeFactor,
          currentInterval: result.interval,
          currentRepetitions: result.repetitions,
        });
      }

      expect(isCardMastered(result.interval)).toBe(true);
    });
  });
});

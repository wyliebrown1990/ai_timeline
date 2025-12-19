/**
 * Tests for the Duplicate Detector (Sprint 32.2)
 *
 * Tests the cross-source duplicate detection functionality:
 * 1. Title similarity (Levenshtein distance)
 * 2. URL matching
 * 3. Integration with the database
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  levenshteinDistance,
  calculateTitleSimilarity,
} from '../../../server/src/services/ingestion/duplicateDetector';

describe('Duplicate Detector (Sprint 32.2)', () => {
  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should return string length for completely different strings', () => {
      expect(levenshteinDistance('abc', 'xyz')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', 'hello')).toBe(5);
      expect(levenshteinDistance('hello', '')).toBe(5);
      expect(levenshteinDistance('', '')).toBe(0);
    });

    it('should calculate correct distance for single character difference', () => {
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
      expect(levenshteinDistance('hello', 'jello')).toBe(1);
    });

    it('should calculate correct distance for insertions', () => {
      expect(levenshteinDistance('hello', 'helloo')).toBe(1);
      expect(levenshteinDistance('hello', 'hhello')).toBe(1);
    });

    it('should calculate correct distance for deletions', () => {
      expect(levenshteinDistance('hello', 'helo')).toBe(1);
      expect(levenshteinDistance('hello', 'ello')).toBe(1);
    });

    it('should be symmetric', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(
        levenshteinDistance('sitting', 'kitten')
      );
    });

    it('should handle longer strings', () => {
      // Classic example: kitten -> sitting requires 3 operations
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });
  });

  describe('calculateTitleSimilarity', () => {
    it('should return 1 for identical titles', () => {
      expect(calculateTitleSimilarity('OpenAI releases GPT-5', 'OpenAI releases GPT-5')).toBe(1);
    });

    it('should return 1 for titles differing only in case', () => {
      expect(
        calculateTitleSimilarity('OpenAI Releases GPT-5', 'openai releases gpt-5')
      ).toBe(1);
    });

    it('should return 1 for titles with extra whitespace', () => {
      expect(
        calculateTitleSimilarity('OpenAI   releases  GPT-5', 'OpenAI releases GPT-5')
      ).toBe(1);
    });

    it('should return 0 for empty strings', () => {
      expect(calculateTitleSimilarity('', 'hello')).toBe(0);
      expect(calculateTitleSimilarity('hello', '')).toBe(0);
    });

    it('should return high similarity for similar titles', () => {
      const similarity = calculateTitleSimilarity(
        'OpenAI Announces GPT-5 Preview',
        'OpenAI Announces GPT-5 Launch'
      );
      // Levenshtein: only last word differs (Preview vs Launch)
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should return low similarity for different titles', () => {
      const similarity = calculateTitleSimilarity(
        'OpenAI Announces GPT-5',
        'Google launches new search feature'
      );
      // Should be < 0.5 for different topics
      expect(similarity).toBeLessThan(0.5);
    });

    it('should return moderate similarity for partially matching titles', () => {
      const similarity = calculateTitleSimilarity(
        'New AI model released by OpenAI',
        'OpenAI releases new AI assistant'
      );
      // Levenshtein is character-based, not semantic - these differ significantly
      expect(similarity).toBeGreaterThan(0.1);
      expect(similarity).toBeLessThan(0.9);
    });

    it('should handle real-world news title variations', () => {
      // Very similar titles - only prefix differs ("Breaking: " = 10 chars)
      const similarity = calculateTitleSimilarity(
        'Breaking: OpenAI releases GPT-5',
        'OpenAI releases GPT-5'
      );
      // "Breaking: " prefix adds 10 chars of difference to 31 char string
      expect(similarity).toBeGreaterThan(0.65);
    });
  });

  describe('Duplicate Detection Logic', () => {
    it('should identify high title match as duplicate', () => {
      // Identical except for minor suffix
      const sim = calculateTitleSimilarity(
        'OpenAI releases GPT-5',
        'OpenAI releases GPT-5!'
      );
      expect(sim).toBeGreaterThanOrEqual(0.9);
    });

    it('should identify <50% title match as non-duplicate', () => {
      const sim = calculateTitleSimilarity(
        'OpenAI releases GPT-5',
        'Apple announces new iPhone with AI features'
      );
      expect(sim).toBeLessThan(0.5);
    });

    it('should correctly score nearly identical titles', () => {
      // Same title with minor word variation
      const sim = calculateTitleSimilarity(
        'OpenAI releases GPT-5 model',
        'OpenAI releases GPT-5 system'
      );
      // Only 1 word differs at end - high similarity
      expect(sim).toBeGreaterThan(0.7);
    });
  });

  describe('Edge Cases', () => {
    it('should handle titles with special characters', () => {
      const similarity = calculateTitleSimilarity(
        'GPT-5: The Next Generation!',
        'GPT-5 - The Next Generation'
      );
      // Only punctuation differs
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should handle titles with numbers', () => {
      const similarity = calculateTitleSimilarity(
        'GPT-5 vs GPT-4: A Comparison',
        'GPT-5 vs GPT-4: Comparison'
      );
      // Very similar - only "A " differs
      expect(similarity).toBeGreaterThan(0.85);
    });

    it('should handle very short titles', () => {
      const similarity = calculateTitleSimilarity('GPT-5', 'GPT-4');
      expect(similarity).toBeGreaterThan(0.6); // Only 1 character different
    });

    it('should handle very long titles with major differences', () => {
      const longTitle1 =
        'OpenAI announces GPT-5 with improved reasoning capabilities and better understanding of context and nuance in conversations';
      const longTitle2 =
        'OpenAI unveils GPT-5 featuring enhanced reasoning abilities and improved contextual understanding in dialogues';
      const similarity = calculateTitleSimilarity(longTitle1, longTitle2);
      // Character-level: these differ significantly despite same topic
      expect(similarity).toBeGreaterThan(0.3);
      expect(similarity).toBeLessThan(0.6);
    });

    it('should handle very long identical titles', () => {
      const longTitle =
        'OpenAI announces GPT-5 with improved reasoning capabilities and better understanding of context';
      const similarity = calculateTitleSimilarity(longTitle, longTitle);
      expect(similarity).toBe(1);
    });
  });
});

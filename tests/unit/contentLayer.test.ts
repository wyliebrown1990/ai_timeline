/**
 * Content Layer Context Tests (Sprint 19)
 *
 * Tests for the ContentLayerContext and related functionality.
 */

import {
  CONTENT_LAYER_OPTIONS,
  CONTENT_LAYERS,
  type ContentLayer,
} from '../../src/contexts/ContentLayerContext';
import { AUDIENCE_TYPE_OPTIONS, AUDIENCE_TYPES, type AudienceType } from '../../src/types/userProfile';

describe('Content Layer Types and Constants', () => {
  // ==========================================================================
  // ContentLayer Type Tests
  // ==========================================================================

  describe('CONTENT_LAYERS', () => {
    it('should contain all four content layers', () => {
      expect(CONTENT_LAYERS).toContain('simple');
      expect(CONTENT_LAYERS).toContain('business');
      expect(CONTENT_LAYERS).toContain('technical');
      expect(CONTENT_LAYERS).toContain('full');
      expect(CONTENT_LAYERS).toHaveLength(4);
    });

    it('should be in logical order', () => {
      expect(CONTENT_LAYERS[0]).toBe('simple');
      expect(CONTENT_LAYERS[1]).toBe('business');
      expect(CONTENT_LAYERS[2]).toBe('technical');
      expect(CONTENT_LAYERS[3]).toBe('full');
    });
  });

  // ==========================================================================
  // CONTENT_LAYER_OPTIONS Tests
  // ==========================================================================

  describe('CONTENT_LAYER_OPTIONS', () => {
    it('should have options for all content layers', () => {
      expect(Object.keys(CONTENT_LAYER_OPTIONS)).toHaveLength(CONTENT_LAYERS.length);
      for (const layer of CONTENT_LAYERS) {
        expect(CONTENT_LAYER_OPTIONS[layer]).toBeDefined();
      }
    });

    it('should have required properties for each layer', () => {
      for (const layer of CONTENT_LAYERS) {
        const option = CONTENT_LAYER_OPTIONS[layer];
        expect(option.label).toBeDefined();
        expect(typeof option.label).toBe('string');
        expect(option.label.length).toBeGreaterThan(0);

        expect(option.description).toBeDefined();
        expect(typeof option.description).toBe('string');
        expect(option.description.length).toBeGreaterThan(0);

        expect(option.icon).toBeDefined();
        expect(typeof option.icon).toBe('string');
      }
    });

    it('should have correct labels for each layer', () => {
      expect(CONTENT_LAYER_OPTIONS.simple.label).toBe('Simple');
      expect(CONTENT_LAYER_OPTIONS.business.label).toBe('Business');
      expect(CONTENT_LAYER_OPTIONS.technical.label).toBe('Technical');
      expect(CONTENT_LAYER_OPTIONS.full.label).toBe('Full');
    });

    it('should have descriptive descriptions', () => {
      // Simple should mention easy/jargon-free
      expect(CONTENT_LAYER_OPTIONS.simple.description.toLowerCase()).toMatch(/easy|jargon/);

      // Business should mention business/impact/strategic
      expect(CONTENT_LAYER_OPTIONS.business.description.toLowerCase()).toMatch(/business|impact|strategic/);

      // Technical should mention technical/architecture/depth
      expect(CONTENT_LAYER_OPTIONS.technical.description.toLowerCase()).toMatch(/technical|architecture|depth/);

      // Full should mention all/detail
      expect(CONTENT_LAYER_OPTIONS.full.description.toLowerCase()).toMatch(/all|detail/);
    });

    it('should have valid icon names', () => {
      const validIconNames = ['BookOpen', 'Briefcase', 'Code2', 'Layers'];
      for (const layer of CONTENT_LAYERS) {
        expect(validIconNames).toContain(CONTENT_LAYER_OPTIONS[layer].icon);
      }
    });
  });

  // ==========================================================================
  // Audience Type to Content Layer Mapping Tests
  // ==========================================================================

  describe('Audience to Content Layer Mapping', () => {
    it('AUDIENCE_TYPE_OPTIONS should have defaultContentLayer for all audience types', () => {
      for (const audienceType of AUDIENCE_TYPES) {
        const option = AUDIENCE_TYPE_OPTIONS[audienceType];
        expect(option.defaultContentLayer).toBeDefined();
      }
    });

    it('everyday audience should map to plain-english content layer', () => {
      expect(AUDIENCE_TYPE_OPTIONS.everyday.defaultContentLayer).toBe('plain-english');
    });

    it('leader audience should map to executive content layer', () => {
      expect(AUDIENCE_TYPE_OPTIONS.leader.defaultContentLayer).toBe('executive');
    });

    it('technical audience should map to technical content layer', () => {
      expect(AUDIENCE_TYPE_OPTIONS.technical.defaultContentLayer).toBe('technical');
    });

    it('general audience should map to simple content layer', () => {
      expect(AUDIENCE_TYPE_OPTIONS.general.defaultContentLayer).toBe('simple');
    });
  });

  // ==========================================================================
  // Type Inference Tests
  // ==========================================================================

  describe('Type inference', () => {
    it('should correctly infer ContentLayer type', () => {
      const layer: ContentLayer = 'simple';
      expect(CONTENT_LAYERS).toContain(layer);
    });

    it('should accept all valid content layers', () => {
      const validLayers: ContentLayer[] = ['simple', 'business', 'technical', 'full'];
      for (const layer of validLayers) {
        expect(CONTENT_LAYERS).toContain(layer);
      }
    });
  });

  // ==========================================================================
  // Content Layer Mapping Function Tests
  // ==========================================================================

  describe('getDefaultLayerForAudience mapping', () => {
    // Helper function that mirrors the logic in ContentLayerContext
    function getDefaultLayerForAudience(audienceType: AudienceType | undefined): ContentLayer {
      if (!audienceType) return 'simple';

      const defaultContentLayer = AUDIENCE_TYPE_OPTIONS[audienceType]?.defaultContentLayer;

      switch (defaultContentLayer) {
        case 'plain-english':
          return 'simple';
        case 'executive':
          return 'business';
        case 'technical':
          return 'technical';
        case 'simple':
        default:
          return 'simple';
      }
    }

    it('should return simple for undefined audience', () => {
      expect(getDefaultLayerForAudience(undefined)).toBe('simple');
    });

    it('should return simple for everyday audience', () => {
      expect(getDefaultLayerForAudience('everyday')).toBe('simple');
    });

    it('should return business for leader audience', () => {
      expect(getDefaultLayerForAudience('leader')).toBe('business');
    });

    it('should return technical for technical audience', () => {
      expect(getDefaultLayerForAudience('technical')).toBe('technical');
    });

    it('should return simple for general audience', () => {
      expect(getDefaultLayerForAudience('general')).toBe('simple');
    });
  });
});

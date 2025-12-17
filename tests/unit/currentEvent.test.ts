import {
  CurrentEventSchema,
  CurrentEventArraySchema,
  validateCurrentEvent,
  safeParseCurrentEvent,
  isEventExpired,
  filterActiveEvents,
  getFeaturedEvents,
  type CurrentEvent,
} from '../../src/types/currentEvent';

describe('CurrentEvent Types and Validation', () => {
  // Valid current event fixture
  const validCurrentEvent: CurrentEvent = {
    id: 'ce1',
    headline: 'OpenAI Releases GPT-5 with Enhanced Reasoning Capabilities',
    summary: 'OpenAI has announced GPT-5, featuring significantly improved reasoning and problem-solving abilities. The new model builds on the transformer architecture and shows substantial improvements in complex task handling.',
    sourceUrl: 'https://example.com/gpt5-announcement',
    sourcePublisher: 'TechCrunch',
    publishedDate: '2025-01-15',
    prerequisiteMilestoneIds: ['E2017_TRANSFORMER', 'E2020_GPT3', 'E2022_CHATGPT'],
    connectionExplanation: 'GPT-5 represents the latest evolution in the GPT series, building on the transformer architecture introduced in 2017 and the scaling breakthroughs of GPT-3 and ChatGPT.',
    featured: true,
    expiresAt: '2025-06-15',
  };

  describe('CurrentEventSchema', () => {
    it('should validate a complete current event', () => {
      const result = CurrentEventSchema.safeParse(validCurrentEvent);
      expect(result.success).toBe(true);
    });

    it('should validate event without optional fields', () => {
      const minimalEvent = {
        id: 'ce2',
        headline: 'Minimal headline for testing validation',
        summary: 'A minimal summary that meets the 50 character minimum requirement for validation.',
        publishedDate: '2025-01-15',
        prerequisiteMilestoneIds: ['E2017_TRANSFORMER', 'E2020_GPT3'],
        connectionExplanation: 'Connection explanation here.',
      };
      const result = CurrentEventSchema.safeParse(minimalEvent);
      expect(result.success).toBe(true);
    });

    it('should default featured to false', () => {
      const { featured: _featured, ...eventWithoutFeatured } = validCurrentEvent;
      const result = CurrentEventSchema.safeParse(eventWithoutFeatured);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.featured).toBe(false);
      }
    });

    describe('id field', () => {
      it('should reject empty id', () => {
        const result = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          id: '',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('headline field', () => {
      it('should reject headline under 10 characters', () => {
        const result = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          headline: 'Short',
        });
        expect(result.success).toBe(false);
      });

      it('should reject headline over 200 characters', () => {
        const result = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          headline: 'A'.repeat(201),
        });
        expect(result.success).toBe(false);
      });

      it('should accept headline at boundaries', () => {
        const result10 = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          headline: 'A'.repeat(10),
        });
        const result200 = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          headline: 'A'.repeat(200),
        });
        expect(result10.success).toBe(true);
        expect(result200.success).toBe(true);
      });
    });

    describe('summary field', () => {
      it('should reject summary under 50 characters', () => {
        const result = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          summary: 'Too short summary.',
        });
        expect(result.success).toBe(false);
      });

      it('should reject summary over 500 characters', () => {
        const result = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          summary: 'A'.repeat(501),
        });
        expect(result.success).toBe(false);
      });

      it('should accept summary at boundaries', () => {
        const result50 = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          summary: 'A'.repeat(50),
        });
        const result500 = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          summary: 'A'.repeat(500),
        });
        expect(result50.success).toBe(true);
        expect(result500.success).toBe(true);
      });
    });

    describe('sourceUrl field', () => {
      it('should accept valid URL', () => {
        const result = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          sourceUrl: 'https://example.com/article',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid URL', () => {
        const result = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          sourceUrl: 'not-a-valid-url',
        });
        expect(result.success).toBe(false);
      });

      it('should allow undefined sourceUrl', () => {
        const { sourceUrl: _url, ...eventWithoutUrl } = validCurrentEvent;
        const result = CurrentEventSchema.safeParse(eventWithoutUrl);
        expect(result.success).toBe(true);
      });
    });

    describe('prerequisiteMilestoneIds field', () => {
      it('should reject fewer than 2 milestone IDs', () => {
        const result = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          prerequisiteMilestoneIds: ['E2017_TRANSFORMER'],
        });
        expect(result.success).toBe(false);
      });

      it('should reject more than 6 milestone IDs', () => {
        const result = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          prerequisiteMilestoneIds: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'],
        });
        expect(result.success).toBe(false);
      });

      it('should accept 2-6 milestone IDs', () => {
        const result2 = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          prerequisiteMilestoneIds: ['M1', 'M2'],
        });
        const result6 = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          prerequisiteMilestoneIds: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
        });
        expect(result2.success).toBe(true);
        expect(result6.success).toBe(true);
      });
    });

    describe('connectionExplanation field', () => {
      it('should reject empty connectionExplanation', () => {
        const result = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          connectionExplanation: '',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('publishedDate field', () => {
      it('should reject empty publishedDate', () => {
        const result = CurrentEventSchema.safeParse({
          ...validCurrentEvent,
          publishedDate: '',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('CurrentEventArraySchema', () => {
    it('should validate an array of current events', () => {
      const events = [
        validCurrentEvent,
        { ...validCurrentEvent, id: 'ce2', headline: 'Another headline for testing' },
      ];
      const result = CurrentEventArraySchema.safeParse(events);
      expect(result.success).toBe(true);
    });

    it('should validate empty array', () => {
      const result = CurrentEventArraySchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it('should reject array with invalid event', () => {
      const events = [
        validCurrentEvent,
        { ...validCurrentEvent, id: '' },
      ];
      const result = CurrentEventArraySchema.safeParse(events);
      expect(result.success).toBe(false);
    });
  });

  describe('validateCurrentEvent helper', () => {
    it('should return parsed data for valid input', () => {
      const result = validateCurrentEvent(validCurrentEvent);
      expect(result.id).toBe('ce1');
      expect(result.featured).toBe(true);
    });

    it('should throw for invalid input', () => {
      expect(() => {
        validateCurrentEvent({ ...validCurrentEvent, id: '' });
      }).toThrow();
    });
  });

  describe('safeParseCurrentEvent helper', () => {
    it('should return success result for valid input', () => {
      const result = safeParseCurrentEvent(validCurrentEvent);
      expect(result.success).toBe(true);
    });

    it('should return failure result for invalid input', () => {
      const result = safeParseCurrentEvent({ ...validCurrentEvent, id: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('isEventExpired helper', () => {
    it('should return false for event without expiresAt', () => {
      const { expiresAt: _expires, ...eventWithoutExpiry } = validCurrentEvent;
      const event = CurrentEventSchema.parse(eventWithoutExpiry);
      expect(isEventExpired(event)).toBe(false);
    });

    it('should return false for event with future expiration', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const event = CurrentEventSchema.parse({
        ...validCurrentEvent,
        expiresAt: futureDate.toISOString(),
      });
      expect(isEventExpired(event)).toBe(false);
    });

    it('should return true for event with past expiration', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const event = CurrentEventSchema.parse({
        ...validCurrentEvent,
        expiresAt: pastDate.toISOString(),
      });
      expect(isEventExpired(event)).toBe(true);
    });

    it('should use custom reference date', () => {
      const event = CurrentEventSchema.parse({
        ...validCurrentEvent,
        expiresAt: '2025-06-15',
      });
      const beforeExpiry = new Date('2025-01-01');
      const afterExpiry = new Date('2025-12-01');

      expect(isEventExpired(event, beforeExpiry)).toBe(false);
      expect(isEventExpired(event, afterExpiry)).toBe(true);
    });
  });

  describe('filterActiveEvents helper', () => {
    it('should filter out expired events', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const events: CurrentEvent[] = [
        { ...validCurrentEvent, id: 'active1', expiresAt: futureDate.toISOString() },
        { ...validCurrentEvent, id: 'expired1', expiresAt: pastDate.toISOString() },
        { ...validCurrentEvent, id: 'active2', expiresAt: undefined },
      ];

      const activeEvents = filterActiveEvents(events);
      expect(activeEvents).toHaveLength(2);
      expect(activeEvents.map((e) => e.id)).toEqual(['active1', 'active2']);
    });

    it('should return all events if none are expired', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const events: CurrentEvent[] = [
        { ...validCurrentEvent, id: 'e1', expiresAt: futureDate.toISOString() },
        { ...validCurrentEvent, id: 'e2', expiresAt: undefined },
      ];

      const activeEvents = filterActiveEvents(events);
      expect(activeEvents).toHaveLength(2);
    });

    it('should return empty array if all events are expired', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      const events: CurrentEvent[] = [
        { ...validCurrentEvent, id: 'e1', expiresAt: pastDate.toISOString() },
        { ...validCurrentEvent, id: 'e2', expiresAt: pastDate.toISOString() },
      ];

      const activeEvents = filterActiveEvents(events);
      expect(activeEvents).toHaveLength(0);
    });
  });

  describe('getFeaturedEvents helper', () => {
    it('should return only featured events', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const events: CurrentEvent[] = [
        { ...validCurrentEvent, id: 'featured1', featured: true, expiresAt: futureDate.toISOString() },
        { ...validCurrentEvent, id: 'notFeatured', featured: false, expiresAt: futureDate.toISOString() },
        { ...validCurrentEvent, id: 'featured2', featured: true, expiresAt: futureDate.toISOString() },
      ];

      const featuredEvents = getFeaturedEvents(events);
      expect(featuredEvents).toHaveLength(2);
      expect(featuredEvents.map((e) => e.id)).toEqual(['featured1', 'featured2']);
    });

    it('should exclude expired featured events by default', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const events: CurrentEvent[] = [
        { ...validCurrentEvent, id: 'activeFeatured', featured: true, expiresAt: futureDate.toISOString() },
        { ...validCurrentEvent, id: 'expiredFeatured', featured: true, expiresAt: pastDate.toISOString() },
      ];

      const featuredEvents = getFeaturedEvents(events);
      expect(featuredEvents).toHaveLength(1);
      expect(featuredEvents[0].id).toBe('activeFeatured');
    });

    it('should include expired featured events when includeExpired is true', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const events: CurrentEvent[] = [
        { ...validCurrentEvent, id: 'activeFeatured', featured: true, expiresAt: futureDate.toISOString() },
        { ...validCurrentEvent, id: 'expiredFeatured', featured: true, expiresAt: pastDate.toISOString() },
      ];

      const featuredEvents = getFeaturedEvents(events, true);
      expect(featuredEvents).toHaveLength(2);
    });
  });
});

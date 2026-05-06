/**
 * Tests for the News Quiz Generator service (Sprint Quiz-1).
 *
 * Focus: pure date-math invariants of getFridayUTC. The verifyNoTitleLeak
 * self-check is intentionally tested via end-to-end manual generator runs
 * documented in the sprint's Backend Validation section, since it requires
 * live Anthropic credentials.
 */

import { describe, it, expect } from '@jest/globals';
import { getFridayUTC } from '../../../server/src/services/newsQuizGenerator';

describe('getFridayUTC', () => {
  it('returns the same Friday at 00:00 UTC when given a Friday', () => {
    const friday = new Date('2026-05-01T15:30:00Z'); // Friday afternoon
    const result = getFridayUTC(friday);
    expect(result.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('returns the most recent prior Friday when given a Saturday', () => {
    const saturday = new Date('2026-05-02T08:00:00Z');
    const result = getFridayUTC(saturday);
    expect(result.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('returns the most recent prior Friday when given a Monday', () => {
    const monday = new Date('2026-05-04T12:00:00Z');
    const result = getFridayUTC(monday);
    expect(result.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('returns the most recent prior Friday when given a Wednesday', () => {
    const wednesday = new Date('2026-05-06T20:00:00Z');
    const result = getFridayUTC(wednesday);
    expect(result.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('returns the most recent prior Friday when given a Thursday', () => {
    const thursday = new Date('2026-05-07T23:59:59Z');
    const result = getFridayUTC(thursday);
    expect(result.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('returns 00:00 UTC even when input has a non-zero time', () => {
    const friday = new Date('2026-04-24T23:59:59.999Z');
    const result = getFridayUTC(friday);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it('handles month boundary correctly', () => {
    // Sun May 3 2026 → most recent Friday is May 1
    const sunday = new Date('2026-05-03T10:00:00Z');
    expect(getFridayUTC(sunday).toISOString()).toBe('2026-05-01T00:00:00.000Z');

    // Mon Mar 2 2026 → most recent Friday is Feb 27
    const monday = new Date('2026-03-02T10:00:00Z');
    expect(getFridayUTC(monday).toISOString()).toBe('2026-02-27T00:00:00.000Z');
  });
});

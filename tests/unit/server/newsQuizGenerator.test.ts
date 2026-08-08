/**
 * Tests for the News Quiz Generator service (Sprint Quiz-1).
 *
 * Focus: pure date/availability invariants. LLM quality checks are exercised by
 * the scheduled production path because they require live Anthropic credentials.
 */

import { describe, it, expect } from '@jest/globals';
import {
  getFridayUTC,
  getQuizAvailability,
} from '../../../server/src/services/newsQuizGenerator';

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

describe('getQuizAvailability', () => {
  const expectedFriday = new Date('2026-07-17T00:00:00.000Z');

  it('reports a missing current-week quiz', () => {
    expect(getQuizAvailability(null, expectedFriday)).toEqual({
      available: false,
      reason: 'missing',
      questionCount: 0,
    });
  });

  it('rejects a prior Friday quiz even when it has enough questions', () => {
    expect(
      getQuizAvailability(
        {
          weekOf: new Date('2026-07-10T00:00:00.000Z'),
          questions: [{}, {}, {}, {}, {}],
        },
        expectedFriday
      )
    ).toEqual({
      available: false,
      reason: 'wrong_week',
      questionCount: 0,
    });
  });

  it('rejects malformed or undersized question payloads', () => {
    expect(
      getQuizAvailability(
        { weekOf: expectedFriday, questions: { not: 'an array' } },
        expectedFriday
      )
    ).toEqual({
      available: false,
      reason: 'invalid_questions',
      questionCount: 0,
    });

    expect(
      getQuizAvailability(
        { weekOf: expectedFriday, questions: [{}, {}] },
        expectedFriday
      )
    ).toEqual({
      available: false,
      reason: 'too_few_questions',
      questionCount: 2,
    });
  });

  it('accepts a current Friday quiz with at least three questions', () => {
    expect(
      getQuizAvailability(
        { weekOf: expectedFriday, questions: [{}, {}, {}] },
        expectedFriday
      )
    ).toEqual({
      available: true,
      reason: 'available',
      questionCount: 3,
    });
  });
});

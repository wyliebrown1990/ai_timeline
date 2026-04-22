/**
 * Sprint Blog-1 — server/src/services/blog.ts unit tests
 *
 * Covers pure, DB-free logic (reading-minutes). DB-dependent tests (slug uniqueness,
 * related-posts ranking, controller supertest) are intentionally deferred: the repo
 * does not yet have Prisma-mocking or DB-fixture infra, and spinning that up is
 * out-of-scope for Blog-1. The QA smoke tests in the sprint's Task 10 exercise those
 * paths end-to-end against prod.
 */

import { computeReadingMinutes } from '../../../server/src/services/blog';

describe('computeReadingMinutes', () => {
  it('returns 1 for empty input', () => {
    expect(computeReadingMinutes('')).toBe(1);
    expect(computeReadingMinutes('   ')).toBe(1);
  });

  it('returns 1 for short content', () => {
    expect(computeReadingMinutes('Hello world.')).toBe(1);
    expect(computeReadingMinutes('A short sentence with a few words.')).toBe(1);
  });

  it('rounds up on the 200-word boundary', () => {
    const words200 = Array(200).fill('word').join(' ');
    expect(computeReadingMinutes(words200)).toBe(1);

    const words201 = Array(201).fill('word').join(' ');
    expect(computeReadingMinutes(words201)).toBe(2);
  });

  it('handles long content (~2000 words)', () => {
    const body = Array(2000).fill('lorem').join(' ');
    expect(computeReadingMinutes(body)).toBe(10);
  });

  it('treats irregular whitespace as single separators', () => {
    const body = 'one\n\ntwo\tthree    four\n  five';
    expect(computeReadingMinutes(body)).toBe(1);
  });

  it('is defensive against non-string input', () => {
    // Runtime contract: service callers may pass Prisma columns typed as nullable.
    const fn = computeReadingMinutes as (x: unknown) => number;
    expect(fn(null)).toBe(1);
    expect(fn(undefined)).toBe(1);
  });
});

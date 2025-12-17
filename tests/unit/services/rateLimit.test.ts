/**
 * Rate Limiting Service Tests
 */

import {
  checkRateLimit,
  clearRateLimitForSession,
  getRateLimitStatus,
} from '../../../server/src/services/rateLimit';

describe('Rate Limiting Service', () => {
  beforeEach(() => {
    // Clear rate limit data before each test
    clearRateLimitForSession('test-session');
  });

  describe('checkRateLimit', () => {
    it('should allow first request and return correct remaining count', () => {
      const result = checkRateLimit('test-session');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should decrement remaining count with each request', () => {
      const result1 = checkRateLimit('test-session-2');
      expect(result1.remaining).toBe(9);

      const result2 = checkRateLimit('test-session-2');
      expect(result2.remaining).toBe(8);

      const result3 = checkRateLimit('test-session-2');
      expect(result3.remaining).toBe(7);
    });

    it('should block requests after limit is reached', () => {
      const sessionId = 'test-session-limit';

      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(sessionId);
        expect(result.allowed).toBe(true);
      }

      // 11th request should be blocked
      const blockedResult = checkRateLimit(sessionId);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.remaining).toBe(0);
      expect(blockedResult.retryAfterMs).toBeGreaterThan(0);
    });

    it('should track different sessions independently', () => {
      const result1 = checkRateLimit('session-a');
      const result2 = checkRateLimit('session-b');

      expect(result1.remaining).toBe(9);
      expect(result2.remaining).toBe(9);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return full limit for new sessions', () => {
      const status = getRateLimitStatus('new-session');

      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(10);
    });

    it('should not increment counter when checking status', () => {
      // First actual request
      checkRateLimit('status-test');

      // Check status multiple times
      getRateLimitStatus('status-test');
      getRateLimitStatus('status-test');
      getRateLimitStatus('status-test');

      // Status should still show 9 remaining
      const status = getRateLimitStatus('status-test');
      expect(status.remaining).toBe(9);
    });

    it('should reflect current rate limit state', () => {
      const sessionId = 'status-reflect-test';

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit(sessionId);
      }

      const status = getRateLimitStatus(sessionId);
      expect(status.remaining).toBe(5);
      expect(status.allowed).toBe(true);
    });
  });

  describe('clearRateLimitForSession', () => {
    it('should reset rate limit for a session', () => {
      const sessionId = 'clear-test';

      // Use up some requests
      checkRateLimit(sessionId);
      checkRateLimit(sessionId);
      checkRateLimit(sessionId);

      const statusBefore = getRateLimitStatus(sessionId);
      expect(statusBefore.remaining).toBe(7);

      // Clear and verify reset
      clearRateLimitForSession(sessionId);

      const statusAfter = getRateLimitStatus(sessionId);
      expect(statusAfter.remaining).toBe(10);
    });
  });
});

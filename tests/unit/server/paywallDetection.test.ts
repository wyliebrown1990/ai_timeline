import { describe, it, expect } from '@jest/globals';
import {
  evaluatePaywallSignals,
  KNOWN_PAYWALLED_HOSTNAMES,
} from '../../../server/src/services/scraper/paywallDetection';

describe('evaluatePaywallSignals', () => {
  it('returns extensionFlag verbatim when set (highest precedence)', () => {
    const out = evaluatePaywallSignals({
      url: 'https://nytimes.com/article',
      httpStatus: 200,
      content: 'totally fine content',
      extensionFlag: 'extension_overlay',
    });
    expect(out).toEqual({ isPaywalled: true, reason: 'extension_overlay' });
  });

  it('flags HTTP 402', () => {
    const out = evaluatePaywallSignals({ url: 'https://example.com', httpStatus: 402 });
    expect(out).toEqual({ isPaywalled: true, reason: 'http_402' });
  });

  it('flags HTTP 403', () => {
    const out = evaluatePaywallSignals({ url: 'https://example.com', httpStatus: 403 });
    expect(out).toEqual({ isPaywalled: true, reason: 'http_403' });
  });

  it('flags paywall phrase in title', () => {
    const out = evaluatePaywallSignals({
      url: 'https://example.com',
      title: 'You must subscribe to continue reading',
      content: 'short body',
    });
    expect(out.isPaywalled).toBe(true);
    expect(out.reason).toBe('paywall_phrase');
  });

  it('flags paywall phrase in body content', () => {
    const out = evaluatePaywallSignals({
      url: 'https://example.com',
      title: 'A normal headline',
      content: 'lorem ipsum ... members only ... dolor sit amet',
    });
    expect(out.reason).toBe('paywall_phrase');
  });

  it('flags known-paywalled domain alone (NYT)', () => {
    const out = evaluatePaywallSignals({ url: 'https://www.nytimes.com/2026/04/29/article' });
    expect(out).toEqual({ isPaywalled: true, reason: 'known_domain' });
  });

  it('flags known-paywalled domain regardless of www. prefix', () => {
    const out = evaluatePaywallSignals({ url: 'https://wsj.com/path' });
    expect(out.reason).toBe('known_domain');
  });

  it('does NOT flag short content alone on an unknown domain', () => {
    const out = evaluatePaywallSignals({
      url: 'https://techcrunch.com/breaking-news',
      content: 'Brief breaking news.',
      wordCount: 30,
    });
    expect(out).toEqual({ isPaywalled: false, reason: null });
  });

  it('does NOT flag long content on an unknown domain with no phrases', () => {
    const out = evaluatePaywallSignals({
      url: 'https://techcrunch.com/article',
      title: 'Normal article',
      content: 'a '.repeat(500),
      wordCount: 500,
    });
    expect(out.isPaywalled).toBe(false);
  });

  it('does not throw on a malformed URL', () => {
    expect(() =>
      evaluatePaywallSignals({ url: 'not-a-url', content: 'whatever' })
    ).not.toThrow();
  });

  it('extension flag takes precedence even over a paywall phrase', () => {
    const out = evaluatePaywallSignals({
      url: 'https://example.com',
      title: 'subscribe to continue',
      extensionFlag: 'extension_short_content',
    });
    expect(out.reason).toBe('extension_short_content');
  });

  it('exposes the curated paywalled hostname list as a Set', () => {
    expect(KNOWN_PAYWALLED_HOSTNAMES.has('nytimes.com')).toBe(true);
    expect(KNOWN_PAYWALLED_HOSTNAMES.has('techcrunch.com')).toBe(false);
  });
});

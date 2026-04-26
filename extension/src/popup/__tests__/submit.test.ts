import { describe, expect, it, vi } from 'vitest';
import { runSubmit, type SubmitState } from '../lib/submit';
import { ApiError } from '../../lib/api';
import type { scrape as scrapeFn, submitArticle as submitFn } from '../../lib/api';
import type { ExtractResponse } from '../../content/content';

const defaultExtract = async (): Promise<ExtractResponse> => ({
  success: true as const,
  title: 't',
  textContent: 'x'.repeat(500),
  byline: null,
  length: 500,
  excerpt: null,
  url: 'https://example.com/a',
});

function makeDeps(overrides: {
  scrape?: () => Promise<unknown>;
  submitArticle?: () => Promise<unknown>;
  extract?: () => Promise<ExtractResponse>;
}) {
  const states: SubmitState[] = [];
  return {
    states,
    deps: {
      scrape: vi.fn(overrides.scrape ?? (async () => ({ articleId: 'a1', title: 'Scraped' }))) as unknown as typeof scrapeFn,
      submitArticle: vi.fn(overrides.submitArticle ?? (async () => ({ articleId: 'a2' }))) as unknown as typeof submitFn,
      extract: vi.fn<(tabId: number) => Promise<ExtractResponse>>(overrides.extract ?? defaultExtract),
      onState: (s: SubmitState) => {
        states.push(s);
      },
    },
  };
}

describe('runSubmit — first tier (server scrape)', () => {
  it('returns success when scrape returns articleId', async () => {
    const { deps, states } = makeDeps({});
    const final = await runSubmit(deps, { tabId: 1, url: 'https://x.com/a', forceReadability: false });
    expect(final).toMatchObject({ kind: 'success', via: 'scrape', articleId: 'a1' });
    expect(deps.extract).not.toHaveBeenCalled();
    expect(states.map((s) => s.kind)).toContain('scraping');
  });

  it('returns duplicate on 409 with existingId', async () => {
    const { deps } = makeDeps({
      scrape: async () => {
        throw new ApiError(409, { existingId: 'dup-123' });
      },
    });
    const final = await runSubmit(deps, { tabId: 1, url: 'https://x.com/a', forceReadability: false });
    expect(final).toMatchObject({ kind: 'duplicate', existingId: 'dup-123' });
    expect(deps.extract).not.toHaveBeenCalled();
  });
});

describe('runSubmit — fallback to client extraction', () => {
  it.each(['captcha', 'forbidden', 'blocked', 'paywall', 'empty'])(
    'falls back when scrape returns failureType=%s',
    async (failureType) => {
      const { deps } = makeDeps({
        scrape: async () => {
          throw new ApiError(400, { failureType }, failureType);
        },
      });
      const final = await runSubmit(deps, { tabId: 1, url: 'https://x.com/a', forceReadability: false });
      expect(final).toMatchObject({ kind: 'success', via: 'submit', articleId: 'a2' });
      expect(deps.extract).toHaveBeenCalledOnce();
      expect(deps.submitArticle).toHaveBeenCalledOnce();
    },
  );

  it('does NOT fall back on a generic 400 with no failureType', async () => {
    const { deps } = makeDeps({
      scrape: async () => {
        throw new ApiError(400, { error: 'bad request' });
      },
    });
    const final = await runSubmit(deps, { tabId: 1, url: 'https://x.com/a', forceReadability: false });
    expect(final.kind).toBe('error');
    expect(deps.extract).not.toHaveBeenCalled();
  });

  it('skips first tier when forceReadability=true', async () => {
    const { deps } = makeDeps({});
    const final = await runSubmit(deps, { tabId: 1, url: 'https://x.com/a', forceReadability: true });
    expect(final).toMatchObject({ kind: 'success', via: 'submit' });
    expect(deps.scrape).not.toHaveBeenCalled();
    expect(deps.extract).toHaveBeenCalledOnce();
  });
});

describe('runSubmit — extraction failures', () => {
  it('returns error when readability returns null', async () => {
    const { deps } = makeDeps({
      scrape: async () => {
        throw new ApiError(403, { failureType: 'forbidden' }, 'forbidden');
      },
      extract: async () => ({ success: false, reason: 'readability_null', url: 'https://x.com/a' }),
    });
    const final = await runSubmit(deps, { tabId: 1, url: 'https://x.com/a', forceReadability: false });
    expect(final.kind).toBe('error');
    expect((final as Extract<SubmitState, { kind: 'error' }>).retryable).toBe(false);
    expect(deps.submitArticle).not.toHaveBeenCalled();
  });

  it('returns error when extracted text is too short', async () => {
    const { deps } = makeDeps({
      scrape: async () => {
        throw new ApiError(403, { failureType: 'paywall' }, 'paywall');
      },
      extract: async () => ({ success: false, reason: 'too_short', url: 'https://x.com/a' }),
    });
    const final = await runSubmit(deps, { tabId: 1, url: 'https://x.com/a', forceReadability: false });
    expect(final.kind).toBe('error');
    expect(deps.submitArticle).not.toHaveBeenCalled();
  });
});

describe('runSubmit — submit-tier errors', () => {
  it('marks 5xx as retryable, 4xx as non-retryable', async () => {
    const { deps: deps5xx } = makeDeps({
      scrape: async () => {
        throw new ApiError(403, { failureType: 'paywall' }, 'paywall');
      },
      submitArticle: async () => {
        throw new ApiError(503, { error: 'down' });
      },
    });
    const f1 = await runSubmit(deps5xx, { tabId: 1, url: 'https://x.com/a', forceReadability: false });
    expect(f1.kind).toBe('error');
    expect((f1 as Extract<SubmitState, { kind: 'error' }>).retryable).toBe(true);

    const { deps: deps4xx } = makeDeps({
      scrape: async () => {
        throw new ApiError(403, { failureType: 'paywall' }, 'paywall');
      },
      submitArticle: async () => {
        throw new ApiError(400, { error: 'bad' });
      },
    });
    const f2 = await runSubmit(deps4xx, { tabId: 1, url: 'https://x.com/a', forceReadability: false });
    expect(f2.kind).toBe('error');
    expect((f2 as Extract<SubmitState, { kind: 'error' }>).retryable).toBe(false);
  });

  it('handles duplicate detected on the submit branch', async () => {
    const { deps } = makeDeps({
      scrape: async () => {
        throw new ApiError(403, { failureType: 'paywall' }, 'paywall');
      },
      submitArticle: async () => {
        throw new ApiError(409, { existingId: 'dup-456' });
      },
    });
    const final = await runSubmit(deps, { tabId: 1, url: 'https://x.com/a', forceReadability: false });
    expect(final).toMatchObject({ kind: 'duplicate', existingId: 'dup-456' });
  });
});

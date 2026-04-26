import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, UnauthorizedError, apiRequest } from '../api';
import { setJwt, getJwt } from '../storage';

const OK_FUTURE = Date.now() + 60 * 60 * 1000;

describe('apiRequest — auth + 401 handling', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('throws UnauthorizedError when no JWT and auth=true', async () => {
    await expect(apiRequest('/api/admin/articles', { auth: true })).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('attaches Bearer token from storage', async () => {
    await setJwt('abc.def.ghi', OK_FUTURE);
    (globalThis.fetch as unknown as { mockResolvedValue: (r: Response) => void }).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    await apiRequest('/api/admin/articles');
    const call = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    const opts = call[1] as RequestInit;
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer abc.def.ghi');
  });

  it('clears stored JWT and throws UnauthorizedError on 401', async () => {
    await setJwt('abc.def.ghi', OK_FUTURE);
    (globalThis.fetch as unknown as { mockResolvedValue: (r: Response) => void }).mockResolvedValue(
      new Response(null, { status: 401 }),
    );
    await expect(apiRequest('/api/admin/articles')).rejects.toBeInstanceOf(UnauthorizedError);
    expect(await getJwt()).toBeNull();
  });

  it('throws ApiError with body on non-OK responses', async () => {
    await setJwt('abc.def.ghi', OK_FUTURE);
    (globalThis.fetch as unknown as { mockResolvedValue: (r: Response) => void }).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Already exists', existingId: 'x1' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(apiRequest('/api/admin/articles')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      body: { existingId: 'x1' },
    });
  });

  it('sets failureType from body when present', async () => {
    await setJwt('abc.def.ghi', OK_FUTURE);
    (globalThis.fetch as unknown as { mockResolvedValue: (r: Response) => void }).mockResolvedValue(
      new Response(JSON.stringify({ failureType: 'paywall' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    try {
      await apiRequest('/api/admin/articles/scrape');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).failureType).toBe('paywall');
    }
  });
});

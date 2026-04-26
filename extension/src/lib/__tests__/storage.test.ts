import { describe, expect, it } from 'vitest';
import {
  clearJwt,
  getForceReadabilityForDomain,
  getJwt,
  setForceReadabilityForDomain,
  setJwt,
} from '../storage';

describe('jwt storage', () => {
  it('returns null when nothing stored', async () => {
    expect(await getJwt()).toBeNull();
  });

  it('stores and reads back a fresh JWT', async () => {
    const future = Date.now() + 60_000;
    await setJwt('tok', future);
    expect(await getJwt()).toEqual({ token: 'tok', expiresAt: future });
  });

  it('returns null for expired JWTs (does not even need explicit clear)', async () => {
    await setJwt('tok', Date.now() - 1);
    expect(await getJwt()).toBeNull();
  });

  it('clearJwt removes both keys', async () => {
    await setJwt('tok', Date.now() + 60_000);
    await clearJwt();
    expect(await getJwt()).toBeNull();
  });
});

describe('force-readability per-domain', () => {
  it('defaults to false', async () => {
    expect(await getForceReadabilityForDomain('example.com')).toBe(false);
  });

  it('persists per domain independently', async () => {
    await setForceReadabilityForDomain('a.com', true);
    expect(await getForceReadabilityForDomain('a.com')).toBe(true);
    expect(await getForceReadabilityForDomain('b.com')).toBe(false);
  });

  it('removes the entry on false', async () => {
    await setForceReadabilityForDomain('a.com', true);
    await setForceReadabilityForDomain('a.com', false);
    expect(await getForceReadabilityForDomain('a.com')).toBe(false);
  });
});

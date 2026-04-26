import { describe, expect, it } from 'vitest';
import { decodeJwt, jwtExpiresAtMs } from '../jwt';

function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function makeJwt(payload: Record<string, unknown>): string {
  return ['header', b64url(payload), 'sig'].join('.');
}

describe('decodeJwt', () => {
  it('decodes the payload', () => {
    const token = makeJwt({ sub: 'admin', role: 'admin', exp: 1234 });
    expect(decodeJwt(token)).toMatchObject({ sub: 'admin', exp: 1234 });
  });

  it('throws on malformed', () => {
    expect(() => decodeJwt('not-a-jwt')).toThrow();
  });
});

describe('jwtExpiresAtMs', () => {
  it('multiplies exp claim by 1000', () => {
    const token = makeJwt({ exp: 1700000000 });
    expect(jwtExpiresAtMs(token)).toBe(1700000000 * 1000);
  });

  it('throws when exp missing', () => {
    const token = makeJwt({ sub: 'x' });
    expect(() => jwtExpiresAtMs(token)).toThrow();
  });
});

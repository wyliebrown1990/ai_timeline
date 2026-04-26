// Minimal JWT decoder — payload only, no signature verification.
// Used to extract `exp` so the popup can hide the login form when the
// stored token is still fresh. Trust comes from HTTPS to the API, not
// from re-validating the token client-side.

export interface JwtPayload {
  sub?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

export function decodeJwt(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');
  const padded = parts[1].padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), '=');
  const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json) as JwtPayload;
}

export function jwtExpiresAtMs(token: string): number {
  const { exp } = decodeJwt(token);
  if (!exp) throw new Error('JWT missing exp claim');
  return exp * 1000;
}

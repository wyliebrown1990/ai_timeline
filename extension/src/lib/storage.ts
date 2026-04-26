// Thin typed wrappers around chrome.storage so the rest of the popup
// doesn't have to mention chrome.* directly.

const JWT_KEY = 'apiJwt';
const JWT_EXP_KEY = 'apiJwtExpiresAt';
const THEME_KEY = 'themePref';
const FORCE_READABILITY_KEY = 'forceReadabilityDomains';
const RECENT_CACHE_KEY = 'recentSubmissionsCache';

export type ThemePref = 'light' | 'dark' | 'system';

export async function getJwt(): Promise<{ token: string; expiresAt: number } | null> {
  const out = await chrome.storage.local.get([JWT_KEY, JWT_EXP_KEY]);
  const token = out[JWT_KEY] as string | undefined;
  const expiresAt = out[JWT_EXP_KEY] as number | undefined;
  if (!token || !expiresAt) return null;
  if (Date.now() > expiresAt) return null;
  return { token, expiresAt };
}

export async function setJwt(token: string, expiresAt: number): Promise<void> {
  await chrome.storage.local.set({ [JWT_KEY]: token, [JWT_EXP_KEY]: expiresAt });
}

export async function clearJwt(): Promise<void> {
  await chrome.storage.local.remove([JWT_KEY, JWT_EXP_KEY]);
}

export async function getTheme(): Promise<ThemePref> {
  const out = await chrome.storage.local.get(THEME_KEY);
  return (out[THEME_KEY] as ThemePref | undefined) ?? 'system';
}

export async function setTheme(pref: ThemePref): Promise<void> {
  await chrome.storage.local.set({ [THEME_KEY]: pref });
}

export async function getForceReadabilityForDomain(domain: string): Promise<boolean> {
  const out = await chrome.storage.local.get(FORCE_READABILITY_KEY);
  const map = (out[FORCE_READABILITY_KEY] as Record<string, boolean> | undefined) ?? {};
  return Boolean(map[domain]);
}

export async function setForceReadabilityForDomain(domain: string, on: boolean): Promise<void> {
  const out = await chrome.storage.local.get(FORCE_READABILITY_KEY);
  const map = (out[FORCE_READABILITY_KEY] as Record<string, boolean> | undefined) ?? {};
  if (on) map[domain] = true;
  else delete map[domain];
  await chrome.storage.local.set({ [FORCE_READABILITY_KEY]: map });
}

export async function getCachedRecent<T>(): Promise<T | null> {
  const out = await chrome.storage.session.get(RECENT_CACHE_KEY);
  return (out[RECENT_CACHE_KEY] as T | undefined) ?? null;
}

export async function setCachedRecent<T>(value: T): Promise<void> {
  await chrome.storage.session.set({ [RECENT_CACHE_KEY]: value });
}

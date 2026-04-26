import { getTheme, setTheme as persistTheme, type ThemePref } from './storage';

export type EffectiveTheme = 'light' | 'dark';

export function effectiveTheme(pref: ThemePref): EffectiveTheme {
  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: EffectiveTheme): void {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export async function loadAndApplyTheme(): Promise<{ pref: ThemePref; effective: EffectiveTheme }> {
  const pref = await getTheme();
  const eff = effectiveTheme(pref);
  applyTheme(eff);
  return { pref, effective: eff };
}

export async function cycleTheme(current: ThemePref): Promise<ThemePref> {
  // Two-state toggle (light <-> dark) plus persistence.
  // 'system' rolls into the inverted resolved theme so the toggle is always meaningful.
  const next: ThemePref =
    current === 'dark' ? 'light' : current === 'light' ? 'dark' : effectiveTheme(current) === 'dark' ? 'light' : 'dark';
  await persistTheme(next);
  applyTheme(effectiveTheme(next));
  return next;
}

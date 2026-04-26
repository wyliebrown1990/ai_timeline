import { Moon, Sun } from 'lucide-react';
import type { ThemePref } from '../../lib/storage';
import { effectiveTheme } from '../../lib/theme';

interface Props {
  pref: ThemePref;
  onCycle: () => void;
}

export function ThemeToggle({ pref, onCycle }: Props) {
  const eff = effectiveTheme(pref);
  const Icon = eff === 'dark' ? Sun : Moon;
  const label = eff === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

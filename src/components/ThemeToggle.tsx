/**
 * ThemeToggle - Button to toggle between light and dark themes
 */

import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useTheme, type ThemeMode } from '../context/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const cycleTheme = () => {
    const themes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    if (nextTheme) {
      setTheme(nextTheme);
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <ComputerDesktopIcon className="h-5 w-5" />;
    }
    return resolvedTheme === 'dark' ? (
      <MoonIcon className="h-5 w-5" />
    ) : (
      <SunIcon className="h-5 w-5" />
    );
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
    }
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`inline-flex items-center gap-2 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:focus:ring-offset-gray-900 ${className}`}
      data-testid="theme-toggle"
      aria-label={`Current theme: ${getLabel()}. Click to change.`}
      title={`Theme: ${getLabel()}`}
    >
      {getIcon()}
      {showLabel && <span className="text-sm font-medium">{getLabel()}</span>}
    </button>
  );
}

/**
 * Simplified toggle for just light/dark switching
 */
export function ThemeToggleSimple({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:focus:ring-offset-gray-900 ${className}`}
      data-testid="theme-toggle"
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Current: ${resolvedTheme} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
}

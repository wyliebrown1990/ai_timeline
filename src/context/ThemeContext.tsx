/**
 * ThemeContext - Manages application theme (light/dark/system)
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'ai-timeline-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'dark'; // Default to dark mode for new users
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    // Check localStorage first, then use default
    const stored = getStoredTheme();
    return stored || defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (theme === 'system') {
      return getSystemTheme();
    }
    return theme;
  });

  // Update resolved theme when theme or system preference changes
  useEffect(() => {
    const updateResolvedTheme = () => {
      if (theme === 'system') {
        setResolvedTheme(getSystemTheme());
      } else {
        setResolvedTheme(theme);
      }
    };

    updateResolvedTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateResolvedTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

import { useEffect, useState } from 'react';
import { LogOut, Sparkles } from 'lucide-react';
import { LoginForm } from './components/LoginForm';
import { SubmitPanel } from './components/SubmitPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { clearJwt, getJwt, getTheme, type ThemePref } from '../lib/storage';
import { applyTheme, cycleTheme, effectiveTheme } from '../lib/theme';

type AuthState = 'loading' | 'logged_out' | 'logged_in';

export default function App() {
  const [auth, setAuth] = useState<AuthState>('loading');
  const [themePref, setThemePref] = useState<ThemePref>('system');

  useEffect(() => {
    (async () => {
      const pref = await getTheme();
      setThemePref(pref);
      applyTheme(effectiveTheme(pref));

      const jwt = await getJwt();
      setAuth(jwt ? 'logged_in' : 'logged_out');
    })();
  }, []);

  async function onCycleTheme() {
    const next = await cycleTheme(themePref);
    setThemePref(next);
  }

  async function onSignOut() {
    await clearJwt();
    setAuth('logged_out');
  }

  return (
    <div className="flex min-h-[200px] flex-col p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Timeline Submit</h1>
        </div>
        <div className="flex items-center gap-1">
          {auth === 'logged_in' && (
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <ThemeToggle pref={themePref} onCycle={onCycleTheme} />
        </div>
      </header>

      {auth === 'loading' && (
        <div className="space-y-2" aria-live="polite">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-9 w-full" />
          <div className="skeleton h-9 w-full" />
        </div>
      )}

      {auth === 'logged_out' && <LoginForm onLoggedIn={() => setAuth('logged_in')} firstTime />}

      {auth === 'logged_in' && <SubmitPanel onUnauthorized={() => setAuth('logged_out')} />}
    </div>
  );
}

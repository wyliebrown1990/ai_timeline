import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { LoginForm } from './components/LoginForm';
import { SubmitPanel } from './components/SubmitPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { getJwt, getTheme, type ThemePref } from '../lib/storage';
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

  return (
    <div className="flex min-h-[200px] flex-col p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Timeline Submit</h1>
        </div>
        <ThemeToggle pref={themePref} onCycle={onCycleTheme} />
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

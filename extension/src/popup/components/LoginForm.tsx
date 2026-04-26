import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ApiError, login } from '../../lib/api';
import { jwtExpiresAtMs } from '../../lib/jwt';
import { setJwt } from '../../lib/storage';

interface Props {
  onLoggedIn: () => void;
  firstTime: boolean;
}

export function LoginForm({ onLoggedIn, firstTime }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const resp = await login(username, password);
      const expiresAt = jwtExpiresAtMs(resp.token);
      await setJwt(resp.token, expiresAt);
      onLoggedIn();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid username or password.');
      } else if (err instanceof ApiError) {
        setError((err.body as { error?: string } | null)?.error ?? `Login failed (${err.status}).`);
      } else {
        setError('Network error. Try again.');
      }
      userRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {firstTime && (
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Sign in with your AI Timeline admin credentials to start submitting articles.
        </p>
      )}

      <div>
        <label
          htmlFor="username"
          className="block text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400"
        >
          Username
        </label>
        <input
          ref={userRef}
          id="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={submitting}
          className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={submitting}
          className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !username || !password}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 transition-colors motion-reduce:transition-none"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

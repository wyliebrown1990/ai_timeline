/**
 * NewsletterCta — 5-state subscribe form.
 *
 * States: idle → validating → submitting → success | error.
 * Storage is the `Subscriber` table via POST /api/blog/subscribe. No ESP
 * wiring yet; when volume justifies one, export from the DB and import.
 *
 * Accessibility: the input has a visible label, invalid input renders an
 * inline error tied via aria-describedby, and the success state wraps in
 * `role="status" aria-live="polite"` so screen readers announce completion.
 */

import { useState } from 'react';
import { Mail, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE } from '../../services/api';

type State =
  | { kind: 'idle' }
  | { kind: 'validating'; message: string }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  /** Free-text label for where this form is rendered (admin analytics). */
  source?: string;
  /** Heading copy override — defaults to "Subscribe to the blog". */
  title?: string;
  /** Description copy override. */
  description?: string;
  className?: string;
}

export function NewsletterCta({
  source,
  title = 'Subscribe to the blog',
  description = "We'll only email when a new post publishes. No spam. Unsubscribe anytime.",
  className,
}: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setState({ kind: 'validating', message: 'Please enter a valid email address.' });
      return;
    }
    setState({ kind: 'submitting' });
    try {
      const res = await fetch(`${API_BASE}/blog/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? 'Could not subscribe right now.');
      }
      toast.success("You're in! We'll send you the next post.");
      setState({ kind: 'success' });
      setEmail('');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't subscribe — please try again.";
      toast.error(message);
      setState({ kind: 'error', message });
    }
  };

  if (state.kind === 'success') {
    return (
      <section
        role="status"
        aria-live="polite"
        className={`rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center ${className ?? ''}`}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <Check className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
          </span>
          <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
            Thanks! You're subscribed.
          </h3>
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            You'll hear from us when the next post goes live.
          </p>
        </div>
      </section>
    );
  }

  const inputInvalid = state.kind === 'validating';
  const submitting = state.kind === 'submitting';

  return (
    <section
      className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-warm-50 dark:bg-gray-800/40 p-6 ${className ?? ''}`}
      aria-labelledby="newsletter-cta-heading"
    >
      <div className="flex flex-col md:flex-row md:items-center md:gap-6">
        <div className="flex items-start gap-3 md:flex-1">
          <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
            <Mail className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </span>
          <div>
            <h3
              id="newsletter-cta-heading"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {title}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-4 md:mt-0 md:min-w-[320px]">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="newsletter-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state.kind === 'validating' || state.kind === 'error') {
                  setState({ kind: 'idle' });
                }
              }}
              disabled={submitting}
              aria-invalid={inputInvalid || state.kind === 'error'}
              aria-describedby={
                state.kind === 'validating' || state.kind === 'error'
                  ? 'newsletter-error'
                  : undefined
              }
              placeholder="you@example.com"
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              disabled={submitting || email.trim().length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2.5 text-sm font-medium min-h-[44px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subscribing…
                </>
              ) : (
                'Subscribe'
              )}
            </button>
          </div>
          {(state.kind === 'validating' || state.kind === 'error') && (
            <p
              id="newsletter-error"
              className="mt-2 text-sm text-red-600 dark:text-red-400"
            >
              {state.message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

export default NewsletterCta;

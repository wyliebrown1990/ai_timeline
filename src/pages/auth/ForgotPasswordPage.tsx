/**
 * Forgot Password Page (Sprint LEarn-3)
 *
 * Allows users to request a password reset email.
 */

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useUserAuth } from '../../contexts';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useUserAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await forgotPassword(email);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Failed to send reset email');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F3EF] dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-4">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                AI Timeline Atlas
              </h1>
            </Link>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              Reset your password
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          {success ? (
            /* Success state */
            <div className="text-center">
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-600 dark:text-green-400 text-sm">
                  If an account with that email exists, we&apos;ve sent a password reset link.
                  Check your inbox!
                </p>
              </div>
              <Link
                to="/login"
                className="text-[#E07A5F] hover:text-[#c96a52] font-medium"
              >
                Return to sign in
              </Link>
            </div>
          ) : (
            <>
              {/* Error message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-[#E07A5F] hover:bg-[#c96a52] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              {/* Back to login */}
              <p className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
                Remember your password?{' '}
                <Link
                  to="/login"
                  className="text-[#E07A5F] hover:text-[#c96a52] font-medium"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

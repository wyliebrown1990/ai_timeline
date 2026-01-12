/**
 * Reset Password Page (Sprint LEarn-3)
 *
 * Allows users to set a new password using a reset token from email.
 */

import { useState, type FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useUserAuth();

  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePassword = (): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }

    if (!/[A-Z]/.test(password)) {
      return 'Password must contain an uppercase letter';
    }

    if (!/[a-z]/.test(password)) {
      return 'Password must contain a lowercase letter';
    }

    if (!/[0-9]/.test(password)) {
      return 'Password must contain a number';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    const result = await resetPassword(token, password);

    if (result.success) {
      navigate('/login', {
        state: { message: 'Password reset! Please sign in with your new password.' },
      });
    } else {
      setError(result.error || 'Failed to reset password');
      setIsSubmitting(false);
    }
  };

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EF] dark:bg-zinc-900 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
              Invalid Reset Link
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block px-6 py-3 bg-[#E07A5F] hover:bg-[#c96a52] text-white font-medium rounded-lg transition-colors"
            >
              Request new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
              Set new password
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Enter your new password below
            </p>
          </div>

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
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                placeholder="Enter new password"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                At least 8 characters with uppercase, lowercase, and a number
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[#E07A5F] hover:bg-[#c96a52] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Resetting...' : 'Reset password'}
            </button>
          </form>

          {/* Back to login */}
          <p className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
            <Link
              to="/login"
              className="text-[#E07A5F] hover:text-[#c96a52] font-medium"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

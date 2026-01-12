/**
 * User Registration Page (Sprint LEarn-3)
 *
 * Allows new users to create accounts.
 */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useUserAuth();

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.email || !formData.username || !formData.password) {
      return 'Email, username, and password are required';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters';
    }

    if (!/[A-Z]/.test(formData.password)) {
      return 'Password must contain an uppercase letter';
    }

    if (!/[a-z]/.test(formData.password)) {
      return 'Password must contain a lowercase letter';
    }

    if (!/[0-9]/.test(formData.password)) {
      return 'Password must contain a number';
    }

    if (formData.username.length < 3 || formData.username.length > 20) {
      return 'Username must be 3-20 characters';
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }

    if (formData.username.startsWith('_')) {
      return 'Username cannot start with an underscore';
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    const result = await register({
      email: formData.email,
      username: formData.username,
      password: formData.password,
      displayName: formData.displayName || undefined,
    });

    if (result.success) {
      // Redirect to login with success message
      navigate('/login', {
        state: { message: 'Account created! Please sign in.' },
      });
    } else {
      setError(result.error || 'Registration failed');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EF] dark:bg-zinc-900">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F3EF] dark:bg-zinc-900 px-4 py-12">
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
              Create your account
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Start tracking your AI learning progress
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Registration form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value.toLowerCase())}
                required
                autoComplete="username"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                placeholder="Choose a username"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>

            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Display Name <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                autoComplete="name"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                placeholder="How should we call you?"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                placeholder="Create a password"
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
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[#E07A5F] hover:bg-[#c96a52] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#E07A5F] hover:text-[#c96a52] font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

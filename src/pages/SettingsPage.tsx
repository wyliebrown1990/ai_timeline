/**
 * SettingsPage
 * User settings including API key management
 * Anthropic Warm theme - elegant, minimal design
 */

import { useState } from 'react';
import { Key, Eye, EyeOff, Trash2, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { useApiKeyContext } from '../components/ApiKey';

/**
 * API Key Settings Section Component
 */
function ApiKeySettings() {
  const {
    hasKey,
    keyFingerprint,
    isValidating,
    validationError,
    saveKey,
    removeKey,
  } = useApiKeyContext();

  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setLocalError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const success = await saveKey(inputValue.trim());
      if (success) {
        setInputValue('');
        setShowInput(false);
        setSuccessMessage('API key saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
      // Error is handled via validationError from context
    } catch {
      setLocalError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveKey = () => {
    if (window.confirm('Are you sure you want to remove your API key? You will need to enter it again to use AI features.')) {
      removeKey();
      setSuccessMessage('API key removed');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  return (
    <div className="bg-white dark:bg-warm-800 rounded-xl shadow-warm border border-warm-200 dark:border-warm-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
          <Key className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-warmGray-800 dark:text-warm-100">
            Anthropic API Key
          </h2>
          <p className="text-sm text-warmGray-500 dark:text-warm-400">
            Required for AI companion and AI-powered features
          </p>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300">{successMessage}</span>
        </div>
      )}

      {/* Error message */}
      {(localError || validationError) && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">{localError || validationError}</span>
        </div>
      )}

      {hasKey && !showInput ? (
        /* Show current key status */
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-warm-50 dark:bg-warm-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-warmGray-800 dark:text-warm-100">
                  API Key Configured
                </p>
                <p className="text-xs text-warmGray-500 dark:text-warm-400">
                  Ending in ...{keyFingerprint}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInput(true)}
                className="px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                Update
              </button>
              <button
                onClick={handleRemoveKey}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Remove API key"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Security note */}
          <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <p className="text-xs text-primary-700 dark:text-primary-300">
              Your API key is encrypted and stored only in your browser. We never send it to our servers.
              All AI requests go directly from your browser to Anthropic.
            </p>
          </div>
        </div>
      ) : (
        /* Show input form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-warmGray-700 dark:text-warm-300 mb-2">
              Enter your Anthropic API key
            </label>
            <div className="relative">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-4 py-2.5 pr-10 bg-warm-50 dark:bg-warm-700 border border-warm-300 dark:border-warm-600 rounded-lg text-warmGray-800 dark:text-warm-100 placeholder-warmGray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isSubmitting || isValidating}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warmGray-400 hover:text-warmGray-600 dark:hover:text-warm-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-warm-50 dark:bg-warm-700/50 rounded-lg space-y-2">
            <p className="text-sm font-medium text-warmGray-700 dark:text-warm-300">
              How to get an API key:
            </p>
            <ol className="text-xs text-warmGray-600 dark:text-warm-400 list-decimal list-inside space-y-1">
              <li>Go to console.anthropic.com</li>
              <li>Sign up or log in to your account</li>
              <li>Navigate to API Keys section</li>
              <li>Create a new key and paste it here</li>
            </ol>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline mt-2"
            >
              Open Anthropic Console
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Security disclosure */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>Security:</strong> Your key is encrypted with AES-GCM and stored only in your browser.
              We never have access to your key. All AI requests go directly to Anthropic's servers.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!inputValue.trim() || isSubmitting || isValidating}
              className="px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {(isSubmitting || isValidating) && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isSubmitting || isValidating ? 'Validating...' : 'Save API Key'}
            </button>
            {hasKey && (
              <button
                type="button"
                onClick={() => {
                  setShowInput(false);
                  setInputValue('');
                  setLocalError(null);
                }}
                className="px-4 py-2 text-warmGray-600 dark:text-warm-400 font-medium hover:bg-warm-100 dark:hover:bg-warm-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * Settings Page Component
 */
export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-warm-50 dark:bg-warm-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-warmGray-800 dark:text-warm-100">
            Settings
          </h1>
          <p className="text-warmGray-600 dark:text-warm-400 mt-1">
            Manage your preferences and API configuration
          </p>
        </div>

        {/* Settings sections */}
        <div className="space-y-6">
          <ApiKeySettings />
        </div>
      </div>
    </div>
  );
}

/**
 * SettingsPage
 * User settings including API key management
 * Anthropic Warm theme - elegant, minimal design
 */

import { useState } from 'react';
import { Key, Eye, EyeOff, Trash2, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { useApiKeyContext } from '../components/ApiKey';
import { apiKeyService } from '../services/apiKeyService';

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
  const [isFreeTier, setIsFreeTier] = useState(() => apiKeyService.isUsingFreeTier());

  const handleEnableFreeTier = () => {
    console.log('[SettingsPage] handleEnableFreeTier clicked');
    apiKeyService.enableFreeTier();
    setIsFreeTier(true);
    setSuccessMessage('Free tier enabled!');
    console.log('[SettingsPage] Free tier state updated');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDisableFreeTier = () => {
    apiKeyService.disableFreeTier();
    setIsFreeTier(false);
    setSuccessMessage('Free tier disabled');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

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
        // Disable free tier when user provides their own key
        apiKeyService.disableFreeTier();
        setIsFreeTier(false);
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
          <Key className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Anthropic API Key
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
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
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  API Key Configured
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ending in ...{keyFingerprint}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInput(true)}
                className="px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
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
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Your API key is encrypted and stored only in your browser. We never send it to our servers.
              All AI requests go directly from your browser to Anthropic.
            </p>
          </div>
        </div>
      ) : isFreeTier && !showInput ? (
        /* Show free tier status */
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Free Tier Active
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Using shared API with rate limits
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInput(true)}
                className="px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
              >
                Use Own Key
              </button>
              <button
                onClick={handleDisableFreeTier}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Disable free tier"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Free tier info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Free tier provides limited AI features at no cost. For unlimited usage with faster responses,
              add your own Anthropic API key above.
            </p>
          </div>
        </div>
      ) : (
        /* Show input form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter your Anthropic API key
            </label>
            <div className="relative">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={isSubmitting || isValidating}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              How to get an API key:
            </p>
            <ol className="text-xs text-gray-600 dark:text-gray-400 list-decimal list-inside space-y-1">
              <li>Go to console.anthropic.com</li>
              <li>Sign up or log in to your account</li>
              <li>Navigate to API Keys section</li>
              <li>Create a new key and paste it here</li>
            </ol>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline mt-2"
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
              className="px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {(isSubmitting || isValidating) && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isSubmitting || isValidating ? 'Validating...' : 'Save API Key'}
            </button>
            {(hasKey || isFreeTier) && (
              <button
                type="button"
                onClick={() => {
                  setShowInput(false);
                  setInputValue('');
                  setLocalError(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Free Tier Option */}
          {!hasKey && !isFreeTier && (
            <div className="mt-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-2">
                Don't have an API key?
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-400 mb-3">
                Try AI features for free with limited usage. No API key required.
              </p>
              <button
                type="button"
                onClick={handleEnableFreeTier}
                className="w-full px-4 py-2.5 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                Use Free Tier
              </button>
            </div>
          )}
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
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

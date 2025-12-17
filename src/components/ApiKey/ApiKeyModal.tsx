/**
 * API Key Modal Component
 *
 * Displays a modal prompting users to enter their Anthropic API key.
 * Features:
 * - Clear security/privacy disclosure
 * - Key input with visibility toggle
 * - Validation status display
 * - Instructions for getting a key
 * - "Don't ask again" option
 */

import { useState, useCallback, useEffect } from 'react';
import {
  X,
  Key,
  Shield,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useApiKeyContext } from './ApiKeyContext';

/**
 * ApiKeyModal Component
 *
 * Renders a modal for API key entry when showModal is true.
 * Automatically handles validation and storage.
 */
export function ApiKeyModal() {
  const {
    showModal,
    closeModal,
    saveKey,
    setOptOut,
    isValidating,
    validationError,
  } = useApiKeyContext();

  // Local state for input
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (showModal) {
      setKeyInput('');
      setShowKey(false);
      setDontAskAgain(false);
    }
  }, [showModal]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim() || isValidating) return;

    await saveKey(keyInput.trim());
  }, [keyInput, isValidating, saveKey]);

  // Handle close with opt-out
  const handleClose = useCallback(() => {
    if (dontAskAgain) {
      setOptOut(true);
    }
    closeModal();
  }, [dontAskAgain, setOptOut, closeModal]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal, handleClose]);

  // Don't render if modal not shown
  if (!showModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-key-modal-title"
      data-testid="api-key-modal"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl animate-scale-in">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2
                id="api-key-modal-title"
                className="text-xl font-bold text-gray-900 dark:text-white"
              >
                API Key Required
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                To use AI features in this app
              </p>
            </div>
          </div>
        </div>

        {/* Security disclosure */}
        <div className="px-6 pb-4">
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">
                Security & Privacy
              </h3>
            </div>
            <ul className="text-xs text-green-700 dark:text-green-200 space-y-1">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>Your key is encrypted and stored <strong>only in your browser</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>We <strong>never</strong> send your key to our servers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>AI requests go directly from your browser to Anthropic</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>You can remove your key at any time in Settings</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Key input form */}
        <form onSubmit={handleSubmit} className="px-6 pb-4">
          <label
            htmlFor="api-key-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Enter your Anthropic API key
          </label>
          <div className="relative">
            <input
              id="api-key-input"
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-ant-api03-..."
              className={`
                w-full px-4 py-3 pr-12 rounded-lg border
                bg-white dark:bg-gray-700
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${validationError
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
                }
              `}
              autoComplete="off"
              autoFocus
              data-testid="api-key-input"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Validation status */}
          {isValidating && (
            <div className="flex items-center gap-2 mt-2 text-sm text-blue-600 dark:text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Validating key...</span>
            </div>
          )}

          {validationError && (
            <div className="flex items-center gap-2 mt-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span>{validationError}</span>
            </div>
          )}
        </form>

        {/* How to get a key */}
        <div className="px-6 pb-4">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              How to get an API key
            </h3>
            <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>Go to console.anthropic.com</li>
              <li>Sign up or log in to your account</li>
              <li>Navigate to the API Keys section</li>
              <li>Create a new key and copy it here</li>
            </ol>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Get API Key
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!keyInput.trim() || isValidating}
            className="w-full px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isValidating ? 'Validating...' : 'Save & Continue'}
          </button>

          {/* Don't ask again checkbox */}
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Don't ask me again (use without AI features)
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default ApiKeyModal;

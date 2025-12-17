/**
 * ProfileIndicator Component
 *
 * Shows user profile summary in the header with welcome message
 * and quick access to profile settings.
 */

import { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, Settings, RefreshCw } from 'lucide-react';
import { useUserProfileContext } from '../../contexts/UserProfileContext';
import { USER_ROLE_LABELS } from '../../types/userProfile';

/**
 * Compact profile indicator for the header
 * Shows role and provides quick settings access
 */
export function ProfileIndicator() {
  const { profile, onboardingSkipped, resetUserData } = useUserProfileContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Don't show anything for first-time visitors (they'll see onboarding)
  if (!profile && !onboardingSkipped) {
    return null;
  }

  // For users who skipped onboarding, show a minimal indicator
  if (onboardingSkipped && !profile) {
    return (
      <button
        onClick={() => resetUserData()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        title="Set up your profile"
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">Set up profile</span>
      </button>
    );
  }

  if (!profile) return null;

  const roleLabel = USER_ROLE_LABELS[profile.role];
  const shortRole = roleLabel.split(' ')[0]; // Just first word for compact display

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <span className="hidden sm:inline">{shortRole}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          {/* Profile summary */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Welcome back!
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {roleLabel}
            </p>
            {profile.goals.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {profile.goals.length} learning {profile.goals.length === 1 ? 'goal' : 'goals'}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to settings/profile editing would go here
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="w-4 h-4" />
              Edit Profile
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                resetUserData();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              Start Fresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileIndicator;

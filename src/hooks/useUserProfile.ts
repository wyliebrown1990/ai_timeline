/**
 * User Profile Hook
 *
 * Manages user profile and onboarding state using localStorage.
 * Provides access to role, goals, and preferences for personalization.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  UserProfile,
  CreateUserProfile,
  UpdateUserProfile,
  UserRole,
  ExplanationLevel,
  AudienceType,
} from '../types/userProfile';
import { safeParseUserProfile, validateCreateUserProfile, AUDIENCE_TYPE_OPTIONS } from '../types/userProfile';

/**
 * Storage key for user profile data
 */
const STORAGE_KEY = 'ai-timeline-user';

/**
 * Stored user data structure
 */
export interface StoredUserData {
  profile?: UserProfile;
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
}

/**
 * Default empty storage state
 */
const DEFAULT_STORAGE: StoredUserData = {
  profile: undefined,
  onboardingCompleted: false,
  onboardingSkipped: false,
};

/**
 * Generate a unique user ID
 */
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Map user role to default explanation level
 * Executive/Leadership -> Business Impact
 * Developer -> Technical
 * Others -> Simple
 */
export function getRoleDefaultExplanationLevel(role: UserRole): ExplanationLevel {
  switch (role) {
    case 'executive':
    case 'product_manager':
    case 'marketing_sales':
    case 'operations_hr':
      return 'business';
    case 'developer':
      return 'technical';
    case 'everyday_user':
    case 'culture_enthusiast':
    case 'student':
    case 'curious':
    default:
      return 'simple';
  }
}

/**
 * Load user data from localStorage
 * Includes migration for older profiles without audienceType
 */
function loadUserData(): StoredUserData {
  if (typeof window === 'undefined') return DEFAULT_STORAGE;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredUserData;
      // Validate the profile if it exists
      if (parsed.profile) {
        // Migrate older profiles without audienceType
        if (!parsed.profile.audienceType) {
          parsed.profile.audienceType = 'general';
        }
        const result = safeParseUserProfile(parsed.profile);
        if (!result.success) {
          console.warn('Invalid stored profile, clearing:', result.error);
          return DEFAULT_STORAGE;
        }
      }
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load user data:', error);
  }

  return DEFAULT_STORAGE;
}

/**
 * Save user data to localStorage
 */
function saveUserData(data: StoredUserData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save user data:', error);
  }
}

/**
 * Hook return type
 */
export interface UseUserProfileReturn {
  /** Current user profile (undefined if not created) */
  profile: UserProfile | undefined;

  /** Whether onboarding has been completed */
  onboardingCompleted: boolean;

  /** Whether onboarding was skipped */
  onboardingSkipped: boolean;

  /** Whether the user is a first-time visitor (no profile, not skipped) */
  isFirstTimeVisitor: boolean;

  /** Create a new user profile from onboarding data */
  createProfile: (data: CreateUserProfile) => UserProfile;

  /** Update the existing user profile */
  updateProfile: (updates: UpdateUserProfile) => void;

  /** Mark onboarding as completed */
  completeOnboarding: () => void;

  /** Skip onboarding (use defaults) */
  skipOnboarding: () => void;

  /** Reset all user data (for testing/debugging) */
  resetUserData: () => void;

  /** Get the current explanation level (from profile or default) */
  getExplanationLevel: () => ExplanationLevel;

  /** Get the user's audience type */
  getAudienceType: () => AudienceType;

  /** Get the default content layer tab based on audience type */
  getDefaultContentLayer: () => 'plain-english' | 'executive' | 'technical' | 'simple';
}

/**
 * Hook for managing user profile and onboarding state
 *
 * @example
 * ```tsx
 * const {
 *   profile,
 *   isFirstTimeVisitor,
 *   createProfile,
 *   skipOnboarding,
 * } = useUserProfile();
 *
 * // Show onboarding if first-time visitor
 * if (isFirstTimeVisitor) {
 *   return <OnboardingModal onComplete={createProfile} onSkip={skipOnboarding} />;
 * }
 * ```
 */
export function useUserProfile(): UseUserProfileReturn {
  const [userData, setUserData] = useState<StoredUserData>(DEFAULT_STORAGE);

  // Load user data from localStorage on mount
  useEffect(() => {
    setUserData(loadUserData());
  }, []);

  // Helper to update and save user data
  const updateUserData = useCallback((newData: StoredUserData) => {
    setUserData(newData);
    saveUserData(newData);
  }, []);

  // Create a new user profile
  const createProfile = useCallback(
    (data: CreateUserProfile): UserProfile => {
      // Validate the input data
      const validatedData = validateCreateUserProfile(data);

      const now = new Date().toISOString();
      const newProfile: UserProfile = {
        id: generateUserId(),
        ...validatedData,
        createdAt: now,
        updatedAt: now,
      };

      updateUserData({
        profile: newProfile,
        onboardingCompleted: true,
        onboardingSkipped: false,
      });

      return newProfile;
    },
    [updateUserData]
  );

  // Update the existing profile
  const updateProfile = useCallback(
    (updates: UpdateUserProfile) => {
      if (!userData.profile) {
        console.warn('Cannot update profile: no profile exists');
        return;
      }

      const updatedProfile: UserProfile = {
        ...userData.profile,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      updateUserData({
        ...userData,
        profile: updatedProfile,
      });
    },
    [userData, updateUserData]
  );

  // Mark onboarding as completed
  const completeOnboarding = useCallback(() => {
    updateUserData({
      ...userData,
      onboardingCompleted: true,
    });
  }, [userData, updateUserData]);

  // Skip onboarding
  const skipOnboarding = useCallback(() => {
    updateUserData({
      ...userData,
      onboardingCompleted: false,
      onboardingSkipped: true,
    });
  }, [userData, updateUserData]);

  // Reset all user data
  const resetUserData = useCallback(() => {
    updateUserData(DEFAULT_STORAGE);
  }, [updateUserData]);

  // Get the current explanation level
  const getExplanationLevel = useCallback((): ExplanationLevel => {
    if (userData.profile?.preferredExplanationLevel) {
      return userData.profile.preferredExplanationLevel;
    }
    if (userData.profile?.role) {
      return getRoleDefaultExplanationLevel(userData.profile.role);
    }
    return 'simple';
  }, [userData.profile]);

  // Get the user's audience type
  const getAudienceType = useCallback((): AudienceType => {
    return userData.profile?.audienceType || 'general';
  }, [userData.profile]);

  // Get the default content layer based on audience type
  const getDefaultContentLayer = useCallback((): 'plain-english' | 'executive' | 'technical' | 'simple' => {
    const audienceType = userData.profile?.audienceType || 'general';
    return AUDIENCE_TYPE_OPTIONS[audienceType].defaultContentLayer;
  }, [userData.profile]);

  // Derived state
  const isFirstTimeVisitor = useMemo(() => {
    return !userData.profile && !userData.onboardingCompleted && !userData.onboardingSkipped;
  }, [userData]);

  return useMemo(
    () => ({
      profile: userData.profile,
      onboardingCompleted: userData.onboardingCompleted,
      onboardingSkipped: userData.onboardingSkipped,
      isFirstTimeVisitor,
      createProfile,
      updateProfile,
      completeOnboarding,
      skipOnboarding,
      resetUserData,
      getExplanationLevel,
      getAudienceType,
      getDefaultContentLayer,
    }),
    [
      userData.profile,
      userData.onboardingCompleted,
      userData.onboardingSkipped,
      isFirstTimeVisitor,
      createProfile,
      updateProfile,
      completeOnboarding,
      skipOnboarding,
      resetUserData,
      getExplanationLevel,
      getAudienceType,
      getDefaultContentLayer,
    ]
  );
}

export default useUserProfile;

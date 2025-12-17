/**
 * OnboardingWrapper Component
 *
 * Wraps the application to show onboarding for first-time visitors
 * and welcome back messages for returning users.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingModal } from './OnboardingModal';
import { useUserProfileContext } from '../../contexts/UserProfileContext';
import type { CreateUserProfile } from '../../types/userProfile';

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that handles onboarding flow
 * Shows modal for first-time visitors, otherwise renders children
 */
export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const navigate = useNavigate();
  const {
    isFirstTimeVisitor,
    createProfile,
    skipOnboarding,
  } = useUserProfileContext();

  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding modal for first-time visitors
  useEffect(() => {
    if (isFirstTimeVisitor) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeVisitor]);

  // Handle completing onboarding
  const handleComplete = useCallback(
    (profile: CreateUserProfile) => {
      createProfile(profile);
      setShowOnboarding(false);
    },
    [createProfile]
  );

  // Handle skipping onboarding
  const handleSkip = useCallback(() => {
    skipOnboarding();
    setShowOnboarding(false);
  }, [skipOnboarding]);

  // Handle starting a learning path from onboarding
  const handleStartPath = useCallback(
    (pathId: string) => {
      setShowOnboarding(false);
      navigate(`/learn/${pathId}`);
    },
    [navigate]
  );

  // Handle exploring all paths
  const handleExploreAll = useCallback(() => {
    setShowOnboarding(false);
    navigate('/learn');
  }, [navigate]);

  return (
    <>
      {children}

      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleComplete}
        onSkip={handleSkip}
        onStartPath={handleStartPath}
        onExploreAll={handleExploreAll}
      />
    </>
  );
}

export default OnboardingWrapper;

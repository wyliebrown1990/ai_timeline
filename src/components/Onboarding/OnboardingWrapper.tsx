/**
 * OnboardingWrapper Component
 *
 * Provides onboarding modal that can be triggered from anywhere in the app.
 * Uses context to expose openOnboarding function to child components.
 */

import { useState, useCallback, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingModal } from './OnboardingModal';
import { useUserProfileContext } from '../../contexts/UserProfileContext';
import type { CreateUserProfile } from '../../types/userProfile';

/**
 * Context type for onboarding controls
 */
interface OnboardingContextType {
  /** Open the onboarding modal */
  openOnboarding: () => void;
  /** Whether the onboarding modal is currently open */
  isOnboardingOpen: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

/**
 * Hook to access onboarding controls from any component
 * @throws Error if used outside of OnboardingWrapper
 */
export function useOnboarding(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingWrapper');
  }
  return context;
}

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides onboarding functionality
 * Exposes openOnboarding via context for use anywhere in the app
 */
export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const navigate = useNavigate();
  const {
    createProfile,
    skipOnboarding,
  } = useUserProfileContext();

  const [showOnboarding, setShowOnboarding] = useState(false);

  // Open the onboarding modal
  const openOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

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

  const contextValue: OnboardingContextType = {
    openOnboarding,
    isOnboardingOpen: showOnboarding,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}

      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleComplete}
        onSkip={handleSkip}
        onStartPath={handleStartPath}
        onExploreAll={handleExploreAll}
      />
    </OnboardingContext.Provider>
  );
}

export default OnboardingWrapper;

/**
 * User Profile Context
 *
 * Provides app-wide access to user profile and onboarding state.
 * Wrap the application root with UserProfileProvider to enable
 * profile-based personalization throughout the app.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useUserProfile, type UseUserProfileReturn } from '../hooks/useUserProfile';

/**
 * Context type matches the hook return type
 */
type UserProfileContextType = UseUserProfileReturn | null;

/**
 * Context for user profile state
 */
const UserProfileContext = createContext<UserProfileContextType>(null);

/**
 * Props for the provider component
 */
interface UserProfileProviderProps {
  children: ReactNode;
}

/**
 * Provider component that wraps the application to provide profile access
 *
 * @example
 * ```tsx
 * // In your App or layout component
 * import { UserProfileProvider } from '@/contexts/UserProfileContext';
 *
 * function App() {
 *   return (
 *     <UserProfileProvider>
 *       <YourAppContent />
 *     </UserProfileProvider>
 *   );
 * }
 * ```
 */
export function UserProfileProvider({ children }: UserProfileProviderProps) {
  const userProfile = useUserProfile();

  return (
    <UserProfileContext.Provider value={userProfile}>
      {children}
    </UserProfileContext.Provider>
  );
}

/**
 * Hook to access user profile context
 *
 * @throws Error if used outside of UserProfileProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { profile, isFirstTimeVisitor, createProfile } = useUserProfileContext();
 *
 *   if (isFirstTimeVisitor) {
 *     return <OnboardingModal onComplete={createProfile} />;
 *   }
 *
 *   return <div>Welcome back, {profile?.role}!</div>;
 * }
 * ```
 */
export function useUserProfileContext(): UseUserProfileReturn {
  const context = useContext(UserProfileContext);

  if (context === null) {
    throw new Error('useUserProfileContext must be used within a UserProfileProvider');
  }

  return context;
}

export default UserProfileContext;

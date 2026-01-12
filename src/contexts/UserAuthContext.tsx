/**
 * User Authentication Context (Sprint LEarn-3)
 *
 * Provides app-wide authentication state for regular users (not admin).
 * Uses localStorage for access token and httpOnly cookies for refresh token.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type UserProfile,
  type RegisterInput,
  type LoginInput,
  type UpdateProfileInput,
  type ChangePasswordInput,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  getCurrentUser,
  updateProfile as apiUpdateProfile,
  changePassword as apiChangePassword,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
  linkSession as apiLinkSession,
  getAccessToken,
  getUserAuthHeaders,
  UserAuthError,
} from '../services/userAuth';

interface UserAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
}

interface UserAuthContextType extends UserAuthState {
  register: (input: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  login: (input: LoginInput, sessionId?: string | null) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<{ success: boolean; error?: string }>;
  changePassword: (input: ChangePasswordInput) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  linkSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  getAuthHeaders: () => Record<string, string>;
  refreshUser: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextType | null>(null);

interface UserAuthProviderProps {
  children: ReactNode;
}

/**
 * Provider component for user authentication
 */
export function UserAuthProvider({ children }: UserAuthProviderProps) {
  const [state, setState] = useState<UserAuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (!token) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
        return;
      }

      // Try to get current user
      const user = await getCurrentUser();
      if (user) {
        setState({
          isAuthenticated: true,
          isLoading: false,
          user,
        });
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
      }
    };

    initAuth();
  }, []);

  /**
   * Register a new account
   */
  const register = useCallback(
    async (input: RegisterInput): Promise<{ success: boolean; error?: string }> => {
      try {
        await apiRegister(input);
        return { success: true };
      } catch (error) {
        console.error('[UserAuth] Register error:', error);
        const message = error instanceof UserAuthError ? error.message : 'Registration failed';
        return { success: false, error: message };
      }
    },
    []
  );

  /**
   * Login with email and password
   * Optionally links an existing session to the user account
   */
  const login = useCallback(
    async (input: LoginInput, sessionId?: string | null): Promise<{ success: boolean; error?: string }> => {
      try {
        const result = await apiLogin(input);
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: result.user,
        });

        // Link anonymous session to user account if sessionId is provided
        if (sessionId) {
          try {
            await apiLinkSession(sessionId);
            console.log('[UserAuth] Session linked to user account');
          } catch (linkError) {
            // Don't fail login if session linking fails
            console.warn('[UserAuth] Failed to link session:', linkError);
          }
        }

        return { success: true };
      } catch (error) {
        console.error('[UserAuth] Login error:', error);
        const message = error instanceof UserAuthError ? error.message : 'Login failed';
        return { success: false, error: message };
      }
    },
    []
  );

  /**
   * Logout and clear state
   */
  const logout = useCallback(async (): Promise<void> => {
    await apiLogout();
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(
    async (input: UpdateProfileInput): Promise<{ success: boolean; error?: string }> => {
      try {
        const updatedUser = await apiUpdateProfile(input);
        setState((prev) => ({
          ...prev,
          user: updatedUser,
        }));
        return { success: true };
      } catch (error) {
        console.error('[UserAuth] Update profile error:', error);
        const message = error instanceof UserAuthError ? error.message : 'Failed to update profile';
        return { success: false, error: message };
      }
    },
    []
  );

  /**
   * Change password
   */
  const changePassword = useCallback(
    async (input: ChangePasswordInput): Promise<{ success: boolean; error?: string }> => {
      try {
        await apiChangePassword(input);
        // User needs to re-login
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
        return { success: true };
      } catch (error) {
        console.error('[UserAuth] Change password error:', error);
        const message = error instanceof UserAuthError ? error.message : 'Failed to change password';
        return { success: false, error: message };
      }
    },
    []
  );

  /**
   * Request password reset
   */
  const forgotPassword = useCallback(
    async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      try {
        const result = await apiForgotPassword(email);
        return { success: true, message: result.message };
      } catch (error) {
        console.error('[UserAuth] Forgot password error:', error);
        const message = error instanceof UserAuthError ? error.message : 'Failed to send reset email';
        return { success: false, error: message };
      }
    },
    []
  );

  /**
   * Reset password with token
   */
  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      try {
        const result = await apiResetPassword(token, newPassword);
        return { success: true, message: result.message };
      } catch (error) {
        console.error('[UserAuth] Reset password error:', error);
        const message = error instanceof UserAuthError ? error.message : 'Failed to reset password';
        return { success: false, error: message };
      }
    },
    []
  );

  /**
   * Link anonymous session to user account
   */
  const linkSession = useCallback(
    async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await apiLinkSession(sessionId);
        return { success: true };
      } catch (error) {
        console.error('[UserAuth] Link session error:', error);
        const message = error instanceof UserAuthError ? error.message : 'Failed to link session';
        return { success: false, error: message };
      }
    },
    []
  );

  /**
   * Get authorization headers for API requests
   */
  const getAuthHeaders = useCallback((): Record<string, string> => {
    return getUserAuthHeaders();
  }, []);

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    const user = await getCurrentUser();
    if (user) {
      setState((prev) => ({
        ...prev,
        user,
      }));
    }
  }, []);

  const value: UserAuthContextType = {
    ...state,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    linkSession,
    getAuthHeaders,
    refreshUser,
  };

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

/**
 * Hook to access user authentication context
 *
 * @throws Error if used outside of UserAuthProvider
 */
export function useUserAuth(): UserAuthContextType {
  const context = useContext(UserAuthContext);

  if (context === null) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }

  return context;
}

export default UserAuthContext;

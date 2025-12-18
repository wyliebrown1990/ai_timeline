/**
 * Authentication Context
 *
 * Provides app-wide authentication state for admin access.
 * Uses sessionStorage for token storage (clears on tab close for security).
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

const AUTH_TOKEN_KEY = 'ai-timeline-admin-token';

/**
 * API base URL for auth endpoints
 * In production, uses the API Gateway URL; in development, uses relative URL with Vite proxy
 */
const API_BASE = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

interface AuthUser {
  sub: string;
  role: 'admin' | 'user';
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  token: string | null;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider component that wraps the application to provide auth access
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
  });

  /**
   * Verify token validity with the server
   */
  const verifyToken = useCallback(async (token: string): Promise<AuthUser | null> => {
    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch {
      return null;
    }
  }, []);

  /**
   * Initialize auth state from stored token
   */
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = sessionStorage.getItem(AUTH_TOKEN_KEY);

      if (storedToken) {
        const user = await verifyToken(storedToken);
        if (user) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            user,
            token: storedToken,
          });
          return;
        }
        // Token invalid, clear it
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
      }

      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
      });
    };

    initAuth();
  }, [verifyToken]);

  /**
   * Login with username and password
   */
  const login = useCallback(
    async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error?.message || 'Invalid credentials',
          };
        }

        const data = await response.json();
        const { token } = data;

        // Store token in sessionStorage
        sessionStorage.setItem(AUTH_TOKEN_KEY, token);

        // Verify and get user info
        const user = await verifyToken(token);
        if (!user) {
          return { success: false, error: 'Failed to verify token' };
        }

        setState({
          isAuthenticated: true,
          isLoading: false,
          user,
          token,
        });

        return { success: true };
      } catch (error) {
        console.error('[Auth] Login error:', error);
        return {
          success: false,
          error: 'Network error. Please try again.',
        };
      }
    },
    [verifyToken]
  );

  /**
   * Logout and clear token
   */
  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
    });
  }, []);

  /**
   * Get authorization headers for API requests
   */
  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (state.token) {
      return { Authorization: `Bearer ${state.token}` };
    }
    return {};
  }, [state.token]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    getAuthHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 *
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;

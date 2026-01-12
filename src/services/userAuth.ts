/**
 * User Authentication API Service (Sprint LEarn-3)
 *
 * Handles user registration, login, and profile management.
 * Uses httpOnly cookies for refresh tokens (managed by browser).
 */

const API_BASE = import.meta.env.VITE_DYNAMIC_API_URL || '/api';
const USER_TOKEN_KEY = 'ai-timeline-user-token';

/**
 * User profile returned from API
 */
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isAdmin: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

/**
 * Public user profile (limited info)
 */
export interface PublicUserProfile {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

/**
 * Registration input
 */
export interface RegisterInput {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}

/**
 * Login input
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Auth result with user and access token
 */
export interface AuthResult {
  user: UserProfile;
  accessToken: string;
}

/**
 * Profile update input
 */
export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

/**
 * Change password input
 */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(USER_TOKEN_KEY);
}

/**
 * Store access token
 */
export function setAccessToken(token: string): void {
  localStorage.setItem(USER_TOKEN_KEY, token);
}

/**
 * Clear access token
 */
export function clearAccessToken(): void {
  localStorage.removeItem(USER_TOKEN_KEY);
}

/**
 * Get authorization headers
 */
export function getUserAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * User auth API error
 */
export class UserAuthError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'UserAuthError';
  }
}

/**
 * Register a new user account
 */
export async function register(input: RegisterInput): Promise<{ message: string; user: UserProfile }> {
  const response = await fetch(`${API_BASE}/auth/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new UserAuthError(response.status, data.error || 'Registration failed');
  }

  return data;
}

/**
 * Login and receive tokens
 * Note: Refresh token is stored in httpOnly cookie by the server
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  const response = await fetch(`${API_BASE}/auth/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important: include cookies
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new UserAuthError(response.status, data.error || 'Login failed');
  }

  // Store access token
  setAccessToken(data.accessToken);

  return {
    user: data.user,
    accessToken: data.accessToken,
  };
}

/**
 * Logout and clear tokens
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/user/logout`, {
      method: 'POST',
      headers: {
        ...getUserAuthHeaders(),
      },
      credentials: 'include',
    });
  } catch {
    // Ignore logout errors - we'll clear local state anyway
  }

  clearAccessToken();
}

/**
 * Refresh access token using refresh token cookie
 */
export async function refreshAccessToken(): Promise<AuthResult | null> {
  const response = await fetch(`${API_BASE}/auth/user/refresh`, {
    method: 'POST',
    credentials: 'include', // Include refresh token cookie
  });

  if (!response.ok) {
    clearAccessToken();
    return null;
  }

  const data = await response.json();
  setAccessToken(data.accessToken);

  return {
    user: data.user,
    accessToken: data.accessToken,
  };
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const token = getAccessToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`${API_BASE}/auth/user/me`, {
    headers: {
      ...getUserAuthHeaders(),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    // Token might be expired, try refresh
    if (response.status === 401) {
      const refreshResult = await refreshAccessToken();
      if (refreshResult) {
        return refreshResult.user;
      }
    }
    return null;
  }

  const data = await response.json();
  return data.user;
}

/**
 * Update user profile
 */
export async function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/auth/user/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getUserAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new UserAuthError(response.status, data.error || 'Failed to update profile');
  }

  return data.user;
}

/**
 * Change password (requires current password)
 */
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/user/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getUserAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new UserAuthError(response.status, data.error || 'Failed to change password');
  }

  // Clear token since we need to re-login
  clearAccessToken();
}

/**
 * Request password reset email
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/auth/user/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new UserAuthError(response.status, data.error || 'Failed to send reset email');
  }

  return data;
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/auth/user/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new UserAuthError(response.status, data.error || 'Failed to reset password');
  }

  return data;
}

/**
 * Link anonymous session to user account
 */
export async function linkSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/user/link-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getUserAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new UserAuthError(response.status, data.error || 'Failed to link session');
  }
}

/**
 * Get public user profile by username
 */
export async function getPublicProfile(username: string): Promise<PublicUserProfile | null> {
  const response = await fetch(`${API_BASE}/auth/users/${encodeURIComponent(username)}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const data = await response.json();
    throw new UserAuthError(response.status, data.error || 'Failed to get profile');
  }

  const data = await response.json();
  return data.user;
}

export default {
  register,
  login,
  logout,
  refreshAccessToken,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  linkSession,
  getPublicProfile,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  getUserAuthHeaders,
};

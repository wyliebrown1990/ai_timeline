/**
 * Auth Controller (Sprint LEarn-3)
 *
 * Handles authentication endpoints: register, login, logout, token refresh,
 * password reset, and user profile management.
 */

import type { Request, Response } from 'express';
import authService from '../services/auth/authService';

// Cookie options for refresh token
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

/**
 * POST /api/auth/register
 * Register a new user account
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, username, displayName, website } = req.body;

    // Honeypot check - if website field is filled, silently reject (bot detected)
    if (website && website.length > 0) {
      // Log for monitoring but don't reveal to client
      console.log(`[SPAM] Registration honeypot triggered for email: ${email}`);
      // Return fake success to not alert the bot
      return res.status(201).json({
        message: 'Account created successfully. Please log in.',
        user: { username },
      });
    }

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    const user = await authService.register({
      email,
      password,
      username,
      displayName,
    });

    res.status(201).json({
      message: 'Account created successfully. Please log in.',
      user,
    });
  } catch {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
}

/**
 * POST /api/auth/login
 * Login and receive tokens
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login({ email, password });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    // Return access token in response body
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: message });
  }
}

/**
 * POST /api/auth/logout
 * Clear tokens and log out
 */
export async function logout(req: Request, res: Response) {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // If user is authenticated, clear their refresh token in DB
    if (req.user) {
      await authService.logout(req.user.userId);
    }

    res.json({ message: 'Logged out successfully' });
  } catch {
    // Always succeed logout even if there's an error
    res.json({ message: 'Logged out' });
  }
}

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token from cookie
 */
export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    if (!result) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Set new refresh token in cookie
    res.cookie('refreshToken', result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch {
    res.status(401).json({ error: 'Token refresh failed' });
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Failed to get user' });
  }
}

/**
 * PUT /api/auth/me
 * Update current user's profile
 */
export async function updateProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { displayName, bio, avatarUrl } = req.body;

    const user = await authService.updateProfile(req.user.userId, {
      displayName,
      bio,
      avatarUrl,
    });

    res.json({ user });
  } catch {
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    res.status(400).json({ error: message });
  }
}

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
export async function changePassword(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    await authService.changePassword(req.user.userId, currentPassword, newPassword);

    // Clear refresh token cookie since we invalidated all tokens
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch {
    const message = error instanceof Error ? error.message : 'Failed to change password';
    res.status(400).json({ error: message });
  }
}

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const token = await authService.requestPasswordReset(email);

    // Don't reveal if email exists - always return success
    // In production, send email with reset link containing token
    if (token) {
      console.log(`[Auth] Password reset token for ${email}: ${token}`);
      // TODO: Send email with reset link
    }

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch {
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    await authService.resetPassword(token, newPassword);

    res.json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch {
    const message = error instanceof Error ? error.message : 'Failed to reset password';
    res.status(400).json({ error: message });
  }
}

/**
 * GET /api/users/:username
 * Get public user profile by username
 */
export async function getPublicProfile(req: Request, res: Response) {
  try {
    const { username } = req.params;

    const user = await authService.getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return limited public info
    res.json({
      user: {
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to get profile' });
  }
}

/**
 * POST /api/auth/link-session
 * Link an existing anonymous session to the authenticated user
 */
export async function linkSession(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    await authService.linkSessionToUser(sessionId, req.user.userId);

    res.json({ message: 'Session linked to account' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to link session';
    res.status(400).json({ error: message });
  }
}

/**
 * POST /api/auth/user/learning-action
 * Record a learning action (Sprint Spam-2)
 * Increments learning actions count and may unlock commenting
 */
export async function recordLearningAction(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { actionType } = req.body;

    const validActionTypes = ['milestone_view', 'flashcard_complete', 'quiz_complete'];
    if (!actionType || !validActionTypes.includes(actionType)) {
      return res.status(400).json({
        error: 'Invalid action type',
        message: `actionType must be one of: ${validActionTypes.join(', ')}`,
      });
    }

    const result = await authService.recordLearningAction(req.user.userId, actionType);

    res.json({
      success: true,
      unlocked: result.unlocked,
      trustScore: result.trustScore.score,
      trustTier: result.trustScore.tier,
      message: result.unlocked
        ? 'Commenting has been unlocked!'
        : 'Learning action recorded',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record learning action';
    res.status(400).json({ error: message });
  }
}

export default {
  register,
  login,
  logout,
  refresh,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getPublicProfile,
  linkSession,
  recordLearningAction,
};

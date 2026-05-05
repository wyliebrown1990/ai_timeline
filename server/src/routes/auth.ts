import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import * as crypto from 'crypto';
import { generateToken, requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import authController from '../controllers/auth';
import {
  requireAuth as requireUserAuth,
  optionalAuth,
} from '../middleware/authMiddleware';

const router = Router();

// =============================================================================
// User Authentication Routes (database-backed)
// =============================================================================

/**
 * POST /api/auth/user/register
 * Register a new user account
 */
router.post('/user/register', authController.register);

/**
 * POST /api/auth/user/login
 * Login and receive tokens
 */
router.post('/user/login', authController.login);

/**
 * POST /api/auth/user/logout
 * Clear tokens and log out
 */
router.post('/user/logout', optionalAuth, authController.logout);

/**
 * POST /api/auth/user/refresh
 * Refresh access token using refresh token from cookie
 */
router.post('/user/refresh', authController.refresh);

/**
 * GET /api/auth/user/me
 * Get current authenticated user
 */
router.get('/user/me', requireUserAuth, authController.getCurrentUser);

/**
 * PUT /api/auth/user/me
 * Update current user's profile
 */
router.put('/user/me', requireUserAuth, authController.updateProfile);

/**
 * POST /api/auth/user/change-password
 * Change password for authenticated user
 */
router.post('/user/change-password', requireUserAuth, authController.changePassword);

/**
 * POST /api/auth/user/forgot-password
 * Request password reset email
 */
router.post('/user/forgot-password', authController.forgotPassword);

/**
 * POST /api/auth/user/reset-password
 * Reset password using token
 */
router.post('/user/reset-password', authController.resetPassword);

/**
 * POST /api/auth/user/link-session
 * Link an existing anonymous session to the authenticated user
 */
router.post('/user/link-session', requireUserAuth, authController.linkSession);

/**
 * POST /api/auth/user/learning-action
 * Record a learning action (Sprint Spam-2)
 * { actionType: 'milestone_view' | 'flashcard_complete' | 'quiz_complete' }
 */
router.post('/user/learning-action', requireUserAuth, authController.recordLearningAction);

/**
 * GET /api/auth/users/:username
 * Get public user profile by username
 */
router.get('/users/:username', authController.getPublicProfile);

// =============================================================================
// Admin Authentication Routes (environment variable-based)
// =============================================================================

/**
 * Login request validation schema
 */
const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Secure password comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to maintain constant time
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Get admin credentials from environment
 */
function getAdminCredentials(): { username: string; password: string } {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required');
  }

  if (password.length < 16) {
    throw new Error('ADMIN_PASSWORD must be at least 16 characters long');
  }

  return { username, password };
}

/**
 * POST /api/auth/login
 * Authenticate admin user and return JWT token
 *
 * Request body:
 * {
 *   username: string;
 *   password: string;
 * }
 *
 * Response:
 * {
 *   token: string;
 *   expiresIn: string;
 * }
 */
router.post('/login', (req: Request, res: Response, next) => {
  try {
    // Validate request body
    const result = LoginSchema.safeParse(req.body);
    if (!result.success) {
      throw ApiError.badRequest('Invalid credentials format', result.error.issues);
    }

    const { username, password } = result.data;
    const adminCreds = getAdminCredentials();

    // Verify credentials with timing-safe comparison
    const usernameMatch = secureCompare(username, adminCreds.username);
    const passwordMatch = secureCompare(password, adminCreds.password);

    if (!usernameMatch || !passwordMatch) {
      // Generic error to prevent username enumeration
      throw new ApiError(401, 'Invalid credentials');
    }

    // Generate JWT token
    const token = generateToken('admin', 'admin');
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    res.json({
      token,
      expiresIn,
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/verify
 * Verify if current token is valid
 * Protected endpoint - requires valid JWT
 *
 * Response:
 * {
 *   valid: boolean;
 *   user: { sub: string; role: string };
 * }
 */
router.get('/verify', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    valid: true,
    user: {
      sub: req.user?.sub,
      role: req.user?.role,
    },
  });
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token (get new token with extended expiry)
 * Protected endpoint - requires valid JWT
 *
 * Response:
 * {
 *   token: string;
 *   expiresIn: string;
 * }
 */
router.post('/refresh', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  const token = generateToken(req.user.sub, req.user.role);
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  res.json({
    token,
    expiresIn,
    message: 'Token refreshed',
  });
});

export default router;

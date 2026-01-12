/**
 * Authentication Service (Sprint LEarn-3)
 *
 * Handles user registration, login, token management, and password operations.
 * Uses bcrypt for password hashing and JWT for tokens.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../db';
import type { User } from '@prisma/client';

// =============================================================================
// Configuration
// =============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const JWT_ACCESS_EXPIRY = '15m'; // Access token: 15 minutes
const JWT_REFRESH_EXPIRY = '7d'; // Refresh token: 7 days
const BCRYPT_ROUNDS = 12;

// Reserved usernames that cannot be registered
const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'support',
  'help',
  'api',
  'www',
  'root',
  'system',
  'mod',
  'moderator',
];

// =============================================================================
// Types
// =============================================================================

export interface RegisterInput {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

// User without sensitive fields
export type SafeUser = Omit<
  User,
  | 'passwordHash'
  | 'refreshToken'
  | 'refreshTokenExpires'
  | 'emailVerifyToken'
  | 'emailVerifyExpires'
  | 'passwordResetToken'
  | 'passwordResetExpires'
>;

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username format
 * - 3-20 characters
 * - Alphanumeric + underscore
 * - Cannot start with underscore
 */
function isValidUsername(username: string): boolean {
  if (username.length < 3 || username.length > 20) return false;
  if (username.startsWith('_')) return false;
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  return usernameRegex.test(username);
}

/**
 * Validate password strength
 * - At least 8 characters
 * - Contains uppercase letter
 * - Contains lowercase letter
 * - Contains number
 */
function isValidPassword(password: string): { valid: boolean; reason?: string } {
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain an uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain a lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain a number' };
  }
  return { valid: true };
}

/**
 * Check if username is reserved
 */
function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.includes(username.toLowerCase());
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Remove sensitive fields from user object
 */
function toSafeUser(user: User): SafeUser {
  const {
    passwordHash,
    refreshToken,
    refreshTokenExpires,
    emailVerifyToken,
    emailVerifyExpires,
    passwordResetToken,
    passwordResetExpires,
    ...safeUser
  } = user;
  return safeUser;
}

/**
 * Generate JWT access token
 */
function generateAccessToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
    isAdmin: user.isAdmin,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
}

/**
 * Generate refresh token (random string stored in DB)
 */
function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

/**
 * Calculate refresh token expiry date
 */
function getRefreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7); // 7 days
  return expiry;
}

// =============================================================================
// Auth Operations
// =============================================================================

/**
 * Register a new user
 */
export async function register(input: RegisterInput): Promise<SafeUser> {
  const { email, password, username, displayName } = input;

  // Validate email
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  // Validate username
  if (!isValidUsername(username)) {
    throw new Error(
      'Username must be 3-20 characters, alphanumeric and underscores only, cannot start with underscore'
    );
  }

  // Check reserved usernames
  if (isReservedUsername(username)) {
    throw new Error('This username is reserved');
  }

  // Validate password
  const passwordCheck = isValidPassword(password);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.reason);
  }

  // Check if email already exists
  const existingEmail = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existingEmail) {
    throw new Error('An account with this email already exists');
  }

  // Check if username already exists
  const existingUsername = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });
  if (existingUsername) {
    throw new Error('This username is already taken');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      username: username.toLowerCase(),
      displayName: displayName || username,
    },
  });

  return toSafeUser(user);
}

/**
 * Login user and return tokens
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  const { email, password } = input;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const refreshTokenExpires = getRefreshTokenExpiry();

  // Update user with refresh token and last login
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshToken,
      refreshTokenExpires,
      lastLoginAt: new Date(),
    },
  });

  return {
    user: toSafeUser(updatedUser),
    accessToken,
    refreshToken,
  };
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthResult | null> {
  // Find user with this refresh token
  const user = await prisma.user.findFirst({
    where: {
      refreshToken,
      refreshTokenExpires: {
        gt: new Date(), // Token not expired
      },
    },
  });

  if (!user) {
    return null;
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken();
  const refreshTokenExpires = getRefreshTokenExpiry();

  // Update refresh token in database
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshToken: newRefreshToken,
      refreshTokenExpires,
    },
  });

  return {
    user: toSafeUser(updatedUser),
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Logout user by clearing refresh token
 */
export async function logout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      refreshToken: null,
      refreshTokenExpires: null,
    },
  });
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;
  return toSafeUser(user);
}

/**
 * Get user by username (for public profiles)
 */
export async function getUserByUsername(username: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });

  if (!user) return null;
  return toSafeUser(user);
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  data: { displayName?: string; bio?: string; avatarUrl?: string }
): Promise<SafeUser> {
  // Validate bio length
  if (data.bio && data.bio.length > 500) {
    throw new Error('Bio must be 500 characters or less');
  }

  // Validate display name length
  if (data.displayName && data.displayName.length > 50) {
    throw new Error('Display name must be 50 characters or less');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return toSafeUser(user);
}

/**
 * Change password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Get user with password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Validate new password
  const passwordCheck = isValidPassword(newPassword);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.reason);
  }

  // Hash and save new password
  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      // Invalidate all refresh tokens for security
      refreshToken: null,
      refreshTokenExpires: null,
    },
  });
}

/**
 * Request password reset - generates token
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    // Don't reveal if email exists
    return null;
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = new Date();
  resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    },
  });

  return resetToken;
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // Find user with valid reset token
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  // Validate new password
  const passwordCheck = isValidPassword(newPassword);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.reason);
  }

  // Hash and save new password, clear reset token
  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
      // Invalidate all refresh tokens
      refreshToken: null,
      refreshTokenExpires: null,
    },
  });
}

/**
 * Link session to authenticated user
 */
export async function linkSessionToUser(sessionId: string, userId: string): Promise<void> {
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { userId },
  });
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: string) {
  return prisma.userSession.findMany({
    where: { userId },
    orderBy: { lastActiveAt: 'desc' },
  });
}

export default {
  register,
  login,
  verifyAccessToken,
  refreshAccessToken,
  logout,
  getUserById,
  getUserByUsername,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  linkSessionToUser,
  getUserSessions,
};

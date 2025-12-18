import type { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { ApiError } from './error';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // User ID or admin identifier
  role: 'admin' | 'user';
  iat: number;
  exp: number;
}

/**
 * Extended Request type with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Get JWT secret from environment with validation
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  return secret;
}

/**
 * Generate a JWT token for authenticated users
 */
export function generateToken(userId: string, role: 'admin' | 'user' = 'user'): string {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  return jwt.sign(
    { sub: userId, role },
    secret,
    { expiresIn }
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload {
  const secret = getJwtSecret();
  return jwt.verify(token, secret) as JwtPayload;
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authentication middleware - requires valid JWT token
 * Use this for endpoints that need any authenticated user
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw ApiError.badRequest('Authorization header with Bearer token is required');
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid or expired token'));
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Token has expired'));
      return;
    }
    next(error);
  }
}

/**
 * Admin authorization middleware - requires admin role
 * Use this for protected admin-only endpoints (create, update, delete)
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // First check authentication
  requireAuth(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }

    // Then check admin role
    if (req.user?.role !== 'admin') {
      next(new ApiError(403, 'Admin privileges required'));
      return;
    }

    next();
  });
}

/**
 * Optional authentication middleware - attaches user if token present
 * Use this for endpoints that work for both authenticated and anonymous users
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (token) {
      const payload = verifyToken(token);
      req.user = payload;
    }

    next();
  } catch {
    // Token is invalid but that's okay for optional auth
    next();
  }
}

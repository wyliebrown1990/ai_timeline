/**
 * Authentication Middleware (Sprint LEarn-3)
 *
 * Middleware for protecting routes that require authentication.
 * Verifies JWT tokens and attaches user info to request.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type TokenPayload } from '../services/auth/authService';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Require authentication for a route
 * Returns 401 if no valid token is provided
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Attach user info to request
  req.user = payload;
  next();
}

/**
 * Optional authentication - attaches user if token is valid, but doesn't require it
 * Useful for routes that have different behavior for logged-in vs anonymous users
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}

/**
 * Require admin privileges
 * Must be used after requireAuth middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }

  next();
}

export default {
  requireAuth,
  optionalAuth,
  requireAdmin,
};

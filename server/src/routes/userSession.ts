/**
 * User Session Routes
 *
 * API routes for user session management and data migration.
 * All routes are public (no admin authentication required).
 *
 * Sprint 38 - User Data Migration
 */

import { Router } from 'express';
import * as userSessionController from '../controllers/userSession';

const router = Router();

/**
 * User Session API routes
 * All routes mounted under /api/user
 */

// POST /api/user/session
// Get or create a user session by device ID
router.post('/session', userSessionController.getOrCreateSession);

// POST /api/user/migrate
// Migrate localStorage data to database
router.post('/migrate', userSessionController.migrateLocalStorageData);

// GET /api/user/:sessionId
// Get full session data including stats, profile, and streak history
router.get('/:sessionId', userSessionController.getSession);

// GET /api/user/:sessionId/profile
// Get user profile by session ID
router.get('/:sessionId/profile', userSessionController.getProfile);

// PUT /api/user/:sessionId/profile
// Update user profile
router.put('/:sessionId/profile', userSessionController.updateProfile);

export default router;

/**
 * Database Migrations Routes
 *
 * Admin-only routes for running database migrations in production.
 * Sprint 36 - Flashcard Database Migration
 */

import { Router } from 'express';
import * as migrationsController from '../controllers/migrations';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/admin/migrations/status - Check migration status
router.get('/status', requireAdmin, migrationsController.getMigrationStatus);

// POST /api/admin/migrations/run - Run a migration
router.post('/run', requireAdmin, migrationsController.runMigrations);

export default router;

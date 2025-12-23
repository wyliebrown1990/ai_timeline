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

// POST /api/admin/migrations/seed-key-figures - Seed foundational AI key figures
router.post('/seed-key-figures', requireAdmin, migrationsController.seedKeyFigures);

// POST /api/admin/migrations/contributors - Migrate milestone contributors to KeyFigures (Sprint 47)
router.post('/contributors', requireAdmin, migrationsController.migrateContributors);

export default router;

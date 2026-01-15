/**
 * Bibliography Routes
 * Sprint Bib-1: Admin API endpoints for bibliography ingestion
 *
 * Provides endpoints for automated ingestion of bibliography entries
 * from external sources into milestones.
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import * as bibliographyController from '../controllers/bibliography';

const router = Router();

// All routes require admin authentication
router.use(requireAdmin);

// POST /api/admin/bibliography/ingest - Start bibliography ingestion
router.post('/ingest', bibliographyController.startIngestion);

// GET /api/admin/bibliography/status - Get ingestion status
router.get('/status', bibliographyController.getStatus);

// GET /api/admin/bibliography/report - Get latest ingestion report
router.get('/report', bibliographyController.getReport);

// POST /api/admin/bibliography/cancel - Cancel running ingestion
router.post('/cancel', bibliographyController.cancelIngestion);

// POST /api/admin/bibliography/test - Run test ingestion (dry run, limited entries)
router.post('/test', bibliographyController.runTest);

export default router;

/**
 * Pipeline Routes
 *
 * API endpoints for ingestion pipeline monitoring and manual controls.
 * Sprint 32.10 - Ingestion Monitoring Dashboard
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import * as pipelineController from '../controllers/pipeline';

const router = Router();

// All routes require admin authentication
router.use(requireAdmin);

// GET /api/admin/pipeline/stats - Get comprehensive pipeline stats
router.get('/stats', pipelineController.getPipelineStats);

// POST /api/admin/pipeline/ingest - Trigger manual ingestion
router.post('/ingest', pipelineController.triggerIngestion);

// POST /api/admin/pipeline/detect-duplicates - Trigger duplicate detection
router.post('/detect-duplicates', pipelineController.triggerDuplicateDetection);

// GET /api/admin/pipeline/errors - Get error statistics
router.get('/errors', pipelineController.getPipelineErrors);

// POST /api/admin/pipeline/errors/clear - Clear all unresolved errors
router.post('/errors/clear', pipelineController.clearPipelineErrors);

// DELETE /api/admin/pipeline/errors/cleanup - Delete old resolved errors
router.delete('/errors/cleanup', pipelineController.cleanupOldErrors);

// POST /api/admin/pipeline/ingestion/pause - Toggle ingestion pause state
router.post('/ingestion/pause', pipelineController.toggleIngestionPause);

// POST /api/admin/pipeline/analysis/pause - Toggle analysis pause state
router.post('/analysis/pause', pipelineController.toggleAnalysisPause);

// POST /api/admin/pipeline/analyze - Trigger manual analysis run
router.post('/analyze', pipelineController.triggerAnalysis);

export default router;

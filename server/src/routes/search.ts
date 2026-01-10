/**
 * Global Search Routes
 * Sprint 47 - Phase 7: Search Integration
 */

import { Router } from 'express';
import { globalSearch } from '../controllers/search';

const router = Router();

/**
 * GET /api/search
 * Global search across milestones, glossary terms, and key figures
 */
router.get('/', globalSearch);

export default router;

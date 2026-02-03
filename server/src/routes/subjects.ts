/**
 * Subject API Routes
 * Sprint Subj-1 - Subject Taxonomy System
 *
 * Public routes: /api/subjects
 * Admin routes: /api/admin/subjects and /api/admin/content
 */

import { Router } from 'express';
import * as subjectsController from '../controllers/subjects';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// =============================================================================
// Public Routes - No authentication required
// =============================================================================

// GET /api/subjects/tree - Get full taxonomy tree
router.get('/tree', subjectsController.getTree);

// GET /api/subjects/search?q=query - Search subjects
router.get('/search', subjectsController.search);

// GET /api/subjects/related - Get related content (shares subjects)
// NOTE: Must be before /:slug to avoid conflict
router.get('/related', subjectsController.getRelatedContent);

// GET /api/subjects/for-content?contentType=milestone&contentId=E2023_DPO
// Public endpoint for getting subjects assigned to a piece of content
// NOTE: Must be before /:slug to avoid conflict
router.get('/for-content', subjectsController.getContentSubjectsPublic);

// GET /api/subjects/:slug - Get subject by slug
router.get('/:slug', subjectsController.getBySlug);

// GET /api/subjects/:slug/ancestors - Get parent chain
router.get('/:slug/ancestors', subjectsController.getAncestors);

// GET /api/subjects/:slug/stats - Get content statistics
router.get('/:slug/stats', subjectsController.getStats);

// GET /api/subjects/:slug/content - Get content for subject (IDs or hydrated)
router.get('/:slug/content', subjectsController.getContent);

// GET /api/subjects/:slug/learning-path - Get auto-generated learning path
router.get('/:slug/learning-path', subjectsController.getLearningPath);

// POST /api/subjects/cross-path - Generate cross-subject learning path
router.post('/cross-path', subjectsController.getCrossPath);

export default router;

// =============================================================================
// Admin Routes - Require authentication
// =============================================================================

export const adminRouter = Router();

// GET /api/admin/subjects - List all subjects
adminRouter.get('/', requireAdmin, subjectsController.getAll);

// POST /api/admin/subjects - Create subject
adminRouter.post('/', requireAdmin, subjectsController.create);

// PUT /api/admin/subjects/:id - Update subject
adminRouter.put('/:id', requireAdmin, subjectsController.update);

// DELETE /api/admin/subjects/:id - Delete subject
adminRouter.delete('/:id', requireAdmin, subjectsController.remove);

// Synonym management
// GET /api/admin/subjects/synonyms - List synonyms
adminRouter.get('/synonyms', requireAdmin, subjectsController.getSynonyms);

// POST /api/admin/subjects/synonyms - Create synonym
adminRouter.post('/synonyms', requireAdmin, subjectsController.createSynonym);

// DELETE /api/admin/subjects/synonyms/:id - Delete synonym
adminRouter.delete('/synonyms/:id', requireAdmin, subjectsController.deleteSynonym);

// =============================================================================
// Content Subject Routes - Manage subject assignments on content
// =============================================================================

export const contentSubjectRouter = Router();

// GET /api/admin/content/:type/:id/subjects - Get subjects for content
contentSubjectRouter.get('/:type/:id/subjects', requireAdmin, subjectsController.getContentSubjects);

// PUT /api/admin/content/:type/:id/subjects - Set subjects for content
contentSubjectRouter.put('/:type/:id/subjects', requireAdmin, subjectsController.updateContentSubjects);

// POST /api/admin/content/:type/:id/subjects - Add subject to content
contentSubjectRouter.post('/:type/:id/subjects', requireAdmin, subjectsController.addContentSubject);

// DELETE /api/admin/content/:type/:id/subjects/:subjectId - Remove subject from content
contentSubjectRouter.delete('/:type/:id/subjects/:subjectId', requireAdmin, subjectsController.removeContentSubject);

// =============================================================================
// Backfill Routes - Subject backfill for existing content
// =============================================================================

// POST /api/admin/subjects/backfill - Start a backfill job
adminRouter.post('/backfill', requireAdmin, subjectsController.startBackfill);

// GET /api/admin/subjects/backfill/status - Get current backfill status
adminRouter.get('/backfill/status', requireAdmin, subjectsController.getBackfillStatus);

// GET /api/admin/subjects/coverage - Get classification coverage stats
adminRouter.get('/coverage', requireAdmin, subjectsController.getCoverageStats);

// POST /api/admin/subjects/migrate-content-type - Fix news_event to current_event
adminRouter.post('/migrate-content-type', requireAdmin, subjectsController.migrateContentType);

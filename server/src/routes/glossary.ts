import { Router } from 'express';
import * as glossaryController from '../controllers/glossary';
import { requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Glossary API routes (Sprint 32)
 * Public routes: /api/glossary
 * Admin routes: /api/admin/glossary
 */

// Public routes - no authentication required
// GET /api/glossary - List all glossary terms
router.get('/', glossaryController.getAllTerms);

// GET /api/glossary/search?q=query - Search glossary terms
router.get('/search', glossaryController.searchTerms);

// GET /api/glossary/term/:termName - Get term by name
router.get('/term/:termName', glossaryController.getTermByName);

// GET /api/glossary/:id - Get term by ID
router.get('/:id', glossaryController.getTermById);

export default router;

/**
 * Admin glossary routes (require authentication)
 * These are mounted separately on /api/admin/glossary
 */
export const adminRouter = Router();

// GET /api/admin/glossary/stats - Get glossary statistics
adminRouter.get('/stats', requireAdmin, glossaryController.getStats);

// POST /api/admin/glossary/bulk - Bulk create terms (for migration)
adminRouter.post('/bulk', requireAdmin, glossaryController.bulkCreateTerms);

// POST /api/admin/glossary - Create a new term
adminRouter.post('/', requireAdmin, glossaryController.createTerm);

// PUT /api/admin/glossary/:id - Update a term
adminRouter.put('/:id', requireAdmin, glossaryController.updateTerm);

// DELETE /api/admin/glossary/:id - Delete a term
adminRouter.delete('/:id', requireAdmin, glossaryController.deleteTerm);

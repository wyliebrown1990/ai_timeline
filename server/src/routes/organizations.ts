import { Router } from 'express';
import * as organizationsController from '../controllers/organizations';
import { requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Organizations API routes (Sprint KPC-1)
 * Public routes: /api/organizations
 * Admin routes: /api/admin/organizations
 */

// Public routes - no authentication required

// GET /api/organizations - List all organizations
router.get('/', organizationsController.getAllOrganizations);

// GET /api/organizations/search?q=query - Search organizations
router.get('/search', organizationsController.searchOrganizations);

// GET /api/organizations/focus-areas - Get all unique focus areas
router.get('/focus-areas', organizationsController.getFocusAreas);

// GET /api/organizations/:slug - Get organization by slug
router.get('/:slug', organizationsController.getOrganizationBySlug);

// GET /api/organizations/:slug/key-concepts - Get glossary terms linked to organization (Sprint SEO-3)
router.get('/:slug/key-concepts', organizationsController.getOrgKeyConcepts);

export default router;

/**
 * Admin organizations routes (require authentication)
 * These are mounted separately on /api/admin/organizations
 */
export const adminRouter = Router();

// GET /api/admin/organizations/stats - Get organization statistics
adminRouter.get('/stats', requireAdmin, organizationsController.getStats);

// POST /api/admin/organizations - Create a new organization
adminRouter.post('/', requireAdmin, organizationsController.createOrganization);

// PUT /api/admin/organizations/:id - Update an organization
adminRouter.put('/:id', requireAdmin, organizationsController.updateOrganization);

// DELETE /api/admin/organizations/:id - Delete an organization
adminRouter.delete('/:id', requireAdmin, organizationsController.deleteOrganization);

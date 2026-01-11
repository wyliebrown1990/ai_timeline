import { Router } from 'express';
import * as personsController from '../controllers/persons';
import { requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Persons API routes (Sprint KPC-1)
 * Public routes: /api/persons
 * Admin routes: /api/admin/persons
 */

// Public routes - no authentication required

// GET /api/persons - List all persons
router.get('/', personsController.getAllPersons);

// GET /api/persons/search?q=query - Search persons
router.get('/search', personsController.searchPersons);

// GET /api/persons/focus-areas - Get all unique focus areas
router.get('/focus-areas', personsController.getFocusAreas);

// GET /api/persons/:slug - Get person by slug
router.get('/:slug', personsController.getPersonBySlug);

// GET /api/persons/:slug/affiliations - Get person's affiliations
router.get('/:slug/affiliations', personsController.getPersonAffiliations);

export default router;

/**
 * Admin persons routes (require authentication)
 * These are mounted separately on /api/admin/persons
 */
export const adminRouter = Router();

// GET /api/admin/persons/stats - Get person statistics
adminRouter.get('/stats', requireAdmin, personsController.getStats);

// POST /api/admin/persons - Create a new person
adminRouter.post('/', requireAdmin, personsController.createPerson);

// PUT /api/admin/persons/:id - Update a person
adminRouter.put('/:id', requireAdmin, personsController.updatePerson);

// DELETE /api/admin/persons/:id - Delete a person
adminRouter.delete('/:id', requireAdmin, personsController.deletePerson);

// POST /api/admin/persons/:id/affiliations - Add an affiliation
adminRouter.post('/:id/affiliations', requireAdmin, personsController.addAffiliation);

// DELETE /api/admin/persons/:id/affiliations/:affId - Remove an affiliation
adminRouter.delete('/:id/affiliations/:affId', requireAdmin, personsController.removeAffiliation);

/**
 * Contact Routes
 *
 * Public endpoint for contact form submissions.
 */

import { Router } from 'express';
import { submitContactForm } from '../controllers/contact';

const router = Router();

// POST /api/contact - Submit contact form
router.post('/', submitContactForm);

export default router;

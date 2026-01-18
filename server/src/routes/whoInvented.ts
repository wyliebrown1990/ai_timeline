/**
 * Who Invented Routes
 * Sprint SEO-4 Task 5 - "Who Invented X?" Pages
 *
 * API routes for who-invented page data.
 */

import { Router } from 'express';
import { getWhoInventedPage, getWhoInventedListHandler } from '../controllers/whoInvented';

const router = Router();

// GET /api/who-invented - List of all who-invented pages
router.get('/', getWhoInventedListHandler);

// GET /api/who-invented/:slug - Specific who-invented page
router.get('/:slug', getWhoInventedPage);

export default router;

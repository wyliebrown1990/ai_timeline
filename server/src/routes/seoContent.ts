/**
 * SEO Content Generation Routes
 * Sprint SEO-4 Task 8 - Admin Tools for Content Generation
 *
 * Admin routes for bulk content generation for Explained and Who Invented pages.
 */

import { Router } from 'express';
import * as seoContentController from '../controllers/seoContent';

const router = Router();

// Statistics
router.get('/stats', seoContentController.getStats);

// Get terms needing generation
router.get('/terms', seoContentController.getTermsNeedingGeneration);

// Get a specific term's generated content
router.get('/terms/:termId', seoContentController.getTermContent);

// Update a term's generated content
router.put('/terms/:termId', seoContentController.updateTermContent);

// Reset a term's status to pending
router.post('/terms/:termId/reset', seoContentController.resetTermStatus);

// Generate Explained content for a single term
router.post('/generate/explained/:termId', seoContentController.generateExplained);

// Generate Who Invented content for a single term
router.post('/generate/who-invented/:termId', seoContentController.generateWhoInvented);

// Bulk generate Explained content
router.post('/generate/explained/bulk', seoContentController.bulkGenerateExplained);

// Bulk generate Who Invented content
router.post('/generate/who-invented/bulk', seoContentController.bulkGenerateWhoInvented);

export default router;

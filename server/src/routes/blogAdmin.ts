/**
 * Admin blog routes — /api/admin/blog, /api/admin/authors
 * Sprint Blog-1 — Data Model & API Foundation
 *
 * All routes require admin JWT.
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import * as adminController from '../controllers/blogAdmin';

const router = Router();

// Posts
router.get('/', requireAdmin, adminController.listPosts);
router.post('/', requireAdmin, adminController.createPost);
router.post('/upload-url', requireAdmin, adminController.getUploadUrl);
router.get('/:id', requireAdmin, adminController.getPost);
router.put('/:id', requireAdmin, adminController.updatePost);
router.delete('/:id', requireAdmin, adminController.deletePost);
router.post('/:id/publish', requireAdmin, adminController.publishPost);
router.post('/:id/schedule', requireAdmin, adminController.schedulePost);
router.post('/:id/archive', requireAdmin, adminController.archivePost);

export default router;

/**
 * Admin author router — mounted at /api/admin/authors
 */
export const authorsAdminRouter = Router();
authorsAdminRouter.get('/', requireAdmin, adminController.listAuthors);
authorsAdminRouter.post('/', requireAdmin, adminController.createAuthor);
authorsAdminRouter.put('/:id', requireAdmin, adminController.updateAuthor);

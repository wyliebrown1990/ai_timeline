/**
 * Public blog routes — /api/blog, /api/authors
 * Sprint Blog-1 — Data Model & API Foundation
 */

import { Router } from 'express';
import * as blogController from '../controllers/blog';

const router = Router();

// RSS first so /api/blog/rss.xml isn't caught by /:slug
router.get('/rss.xml', blogController.rssFeed);
router.get('/related', blogController.getRelated);
router.get('/for-entity', blogController.getPostsForEntity);
router.post('/subscribe', blogController.subscribeNewsletter);
router.get('/', blogController.listPosts);
router.get('/:slug', blogController.getPostBySlug);

export default router;

/**
 * Author router — mounted at /api/authors
 */
export const authorsRouter = Router();
authorsRouter.get('/:slug', blogController.getAuthor);

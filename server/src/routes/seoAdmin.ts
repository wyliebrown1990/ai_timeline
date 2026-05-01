import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import * as seoAdminController from '../controllers/seoAdmin';

const router = Router();

router.post('/ingest', requireAdmin, seoAdminController.ingest);
router.get('/health', requireAdmin, seoAdminController.health);
router.get('/insights', requireAdmin, seoAdminController.list);
router.get('/insights/:id', requireAdmin, seoAdminController.detail);
router.post('/insights/:id/dismiss', requireAdmin, seoAdminController.dismiss);
router.post('/insights/:id/action', requireAdmin, seoAdminController.action);
router.post('/insights/:id/propose-rewrite', requireAdmin, seoAdminController.proposeInsightRewrite);
router.post('/insights/:id/ship-rewrite', requireAdmin, seoAdminController.shipInsightRewrite);
router.post('/insights/:id/generate-proposal', requireAdmin, seoAdminController.generateProposalFromInsight);
router.get('/feedback/pending', requireAdmin, seoAdminController.pendingFeedback);
router.get('/actions', requireAdmin, seoAdminController.actions);
router.post('/actions/:id/measure', requireAdmin, seoAdminController.measureAction);
router.post('/actions/:id/rollback', requireAdmin, seoAdminController.rollback);
router.get('/proposals', requireAdmin, seoAdminController.proposals);
router.post('/proposals/:id/approve', requireAdmin, seoAdminController.approveProposal);
router.post('/proposals/:id/reject', requireAdmin, seoAdminController.rejectProposal);
router.put('/proposals/:id/link-draft', requireAdmin, seoAdminController.linkProposal);
router.put('/pause', requireAdmin, seoAdminController.pause);
router.put('/run-status', requireAdmin, seoAdminController.updateRunStatus);

export default router;

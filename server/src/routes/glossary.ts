import { Router } from 'express';
import * as glossaryController from '../controllers/glossary';
import * as prerequisiteController from '../controllers/prerequisites';
import { requireAdmin } from '../middleware/auth';
import { seedPrerequisites } from '../services/prerequisiteSeed';

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

// GET /api/glossary/foundational - Get foundational terms (good starting points)
router.get('/foundational', prerequisiteController.getFoundationalTerms);

// POST /api/glossary/suggested-next - Get suggested next concepts
router.post('/suggested-next', prerequisiteController.getSuggestedNext);

// GET /api/glossary/term/:termName - Get term by name
router.get('/term/:termName', glossaryController.getTermByName);

// GET /api/glossary/:id - Get term by ID
router.get('/:id', glossaryController.getTermById);

// GET /api/glossary/:id/prerequisites - Get prerequisites for a term
router.get('/:id/prerequisites', prerequisiteController.getPrerequisites);

// GET /api/glossary/:id/prerequisites/chain - Get full prerequisite chain
router.get('/:id/prerequisites/chain', prerequisiteController.getPrerequisiteChain);

// GET /api/glossary/:id/learning-sequence - Get optimal learning sequence
router.get('/:id/learning-sequence', prerequisiteController.getLearningSequence);

// GET /api/glossary/:id/dependents - Get terms that depend on this term
router.get('/:id/dependents', prerequisiteController.getDependents);

// POST /api/glossary/:id/check-readiness - Check if user is ready to learn
router.post('/:id/check-readiness', prerequisiteController.checkReadiness);

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

// PUT /api/admin/glossary/:id/prerequisites - Update prerequisites for a term
adminRouter.put('/:id/prerequisites', requireAdmin, prerequisiteController.updatePrerequisites);

// PUT /api/admin/glossary/:id/difficulty - Update difficulty and concept type
adminRouter.put('/:id/difficulty', requireAdmin, prerequisiteController.updateDifficulty);

// DELETE /api/admin/glossary/:id - Delete a term
adminRouter.delete('/:id', requireAdmin, glossaryController.deleteTerm);

// AI-Assisted Prerequisite Suggestions (Sprint LEarn-1, Section 8)
// POST /api/admin/glossary/:id/suggest-prerequisites - Get AI suggestions for a term
adminRouter.post('/:id/suggest-prerequisites', requireAdmin, prerequisiteController.suggestPrerequisites);

// POST /api/admin/glossary/:id/apply-suggestions - Apply AI suggestions to a term
adminRouter.post('/:id/apply-suggestions', requireAdmin, prerequisiteController.applySuggestions);

// POST /api/admin/glossary/bulk-suggest-prerequisites - Get suggestions for multiple terms
adminRouter.post('/bulk-suggest-prerequisites', requireAdmin, prerequisiteController.bulkSuggestPrerequisites);

// POST /api/admin/glossary/seed-prerequisites - Seed prerequisite data
adminRouter.post('/seed-prerequisites', requireAdmin, async (req, res, next) => {
  try {
    const result = await seedPrerequisites();
    res.json({
      message: 'Prerequisite seeding complete',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/glossary/run-prerequisite-migration - Run the prerequisite migration SQL
adminRouter.post('/run-prerequisite-migration', requireAdmin, async (req, res, next) => {
  try {
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    // Check if columns already exist
    const checkResult = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'GlossaryTerm' AND column_name = 'prerequisiteIds'
    `;

    if (checkResult.length > 0) {
      res.json({ message: 'Migration already applied - columns exist' });
      return;
    }

    // Run migration SQL
    await prisma.$executeRaw`
      ALTER TABLE "GlossaryTerm"
      ADD COLUMN IF NOT EXISTS "conceptType" TEXT NOT NULL DEFAULT 'foundational',
      ADD COLUMN IF NOT EXISTS "difficulty" INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "prerequisiteIds" TEXT NOT NULL DEFAULT '[]'
    `;

    await prisma.$executeRaw`
      ALTER TABLE "Milestone"
      ADD COLUMN IF NOT EXISTS "prerequisiteConceptIds" TEXT NOT NULL DEFAULT '[]'
    `;

    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "GlossaryTerm_difficulty_idx" ON "GlossaryTerm"("difficulty")
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "GlossaryTerm_conceptType_idx" ON "GlossaryTerm"("conceptType")
    `;

    res.json({ message: 'Migration applied successfully' });
  } catch (error) {
    next(error);
  }
});

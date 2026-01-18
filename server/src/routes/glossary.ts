import { Router } from 'express';
import * as glossaryController from '../controllers/glossary';
import * as prerequisiteController from '../controllers/prerequisites';
import { requireAdmin } from '../middleware/auth';
import { seedPrerequisites } from '../services/prerequisiteSeed';
import { generateQuickAnswer, generateQuickAnswersBulk } from '../services/glossary';

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

// GET /api/glossary/slug/:slug - Get term by slug (Sprint SEO-3)
router.get('/slug/:slug', glossaryController.getTermBySlug);

// GET /api/glossary/:id - Get term by ID
router.get('/:id', glossaryController.getTermById);

// GET /api/glossary/:id/key-figures - Get key figures for a term (Sprint SEO-3)
router.get('/:id/key-figures', glossaryController.getTermKeyFigures);

// GET /api/glossary/:id/linked-milestones - Get milestones linked to a term (Sprint SEO-3)
router.get('/:id/linked-milestones', glossaryController.getTermLinkedMilestones);

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

// SEO Quick Answer Generation (Sprint SEO-2)
// POST /api/admin/glossary/:id/generate-quick-answer - Generate quick answer for a term
adminRouter.post('/:id/generate-quick-answer', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const quickAnswer = await generateQuickAnswer(id);

    if (!quickAnswer) {
      res.status(404).json({ error: 'Term not found' });
      return;
    }

    res.json({ success: true, quickAnswer });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/glossary/generate-quick-answers-bulk - Bulk generate quick answers
adminRouter.post('/generate-quick-answers-bulk', requireAdmin, async (req, res, next) => {
  try {
    const { limit = 10 } = req.body;
    const result = await generateQuickAnswersBulk(limit);

    res.json({
      success: true,
      message: `Generated ${result.generated} quick answers`,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/glossary/run-quick-answer-migration - Add quickAnswer column to database
adminRouter.post('/run-quick-answer-migration', requireAdmin, async (req, res, next) => {
  try {
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    // Check if column already exists
    const checkResult = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'GlossaryTerm' AND column_name = 'quickAnswer'
    `;

    if (checkResult.length > 0) {
      res.json({ message: 'Migration already applied - quickAnswer column exists' });
      return;
    }

    // Add the column
    await prisma.$executeRaw`
      ALTER TABLE "GlossaryTerm"
      ADD COLUMN "quickAnswer" TEXT
    `;

    res.json({ message: 'Migration applied successfully - quickAnswer column added' });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/glossary/run-slug-migration - Add slug column to database (Sprint SEO-3)
adminRouter.post('/run-slug-migration', requireAdmin, async (req, res, next) => {
  try {
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    // Check if column already exists
    const checkResult = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'GlossaryTerm' AND column_name = 'slug'
    `;

    if (checkResult.length > 0) {
      res.json({ message: 'Migration already applied - slug column exists' });
      return;
    }

    // Add the column (nullable first, will add unique constraint after backfill)
    await prisma.$executeRaw`
      ALTER TABLE "GlossaryTerm"
      ADD COLUMN "slug" TEXT
    `;

    res.json({ message: 'Migration applied successfully - slug column added' });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/glossary/backfill-slugs - Generate slugs for all terms without one (Sprint SEO-3)
adminRouter.post('/backfill-slugs', requireAdmin, async (req, res, next) => {
  try {
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    // Get all terms without slugs
    const terms = await prisma.glossaryTerm.findMany({
      where: { slug: null },
      select: { id: true, term: true },
    });

    if (terms.length === 0) {
      res.json({ message: 'All terms already have slugs', updated: 0 });
      return;
    }

    // Helper to create slug from term
    const createSlug = (term: string): string => {
      return term
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    };

    let updated = 0;
    const errors: string[] = [];

    for (const term of terms) {
      try {
        const slug = createSlug(term.term);
        await prisma.glossaryTerm.update({
          where: { id: term.id },
          data: { slug },
        });
        updated++;
      } catch (error) {
        errors.push(`${term.term}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    res.json({
      message: `Backfilled ${updated} slugs`,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/glossary/add-slug-unique-constraint - Add unique constraint after backfill (Sprint SEO-3)
adminRouter.post('/add-slug-unique-constraint', requireAdmin, async (req, res, next) => {
  try {
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    // Check if any terms are missing slugs
    const missingCount = await prisma.glossaryTerm.count({
      where: { slug: null },
    });

    if (missingCount > 0) {
      res.status(400).json({
        error: `Cannot add unique constraint: ${missingCount} terms are missing slugs. Run backfill-slugs first.`,
      });
      return;
    }

    // Add unique constraint
    await prisma.$executeRaw`
      ALTER TABLE "GlossaryTerm"
      ADD CONSTRAINT "GlossaryTerm_slug_key" UNIQUE ("slug")
    `;

    res.json({ message: 'Unique constraint added to slug column' });
  } catch (error) {
    // Check if constraint already exists
    if (error instanceof Error && error.message.includes('already exists')) {
      res.json({ message: 'Unique constraint already exists' });
      return;
    }
    next(error);
  }
});

// POST /api/admin/glossary/run-key-figures-migration - Create GlossaryTermPerson table (Sprint SEO-3)
adminRouter.post('/run-key-figures-migration', requireAdmin, async (req, res, next) => {
  try {
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    // Check if table already exists
    const checkResult = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'GlossaryTermPerson'
    `;

    if (checkResult.length > 0) {
      res.json({ message: 'Migration already applied - GlossaryTermPerson table exists' });
      return;
    }

    // Create the table
    await prisma.$executeRaw`
      CREATE TABLE "GlossaryTermPerson" (
        "id" TEXT NOT NULL,
        "glossaryTermId" TEXT NOT NULL,
        "personId" TEXT NOT NULL,
        "contributionNote" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GlossaryTermPerson_pkey" PRIMARY KEY ("id")
      )
    `;

    // Add unique constraint
    await prisma.$executeRaw`
      ALTER TABLE "GlossaryTermPerson"
      ADD CONSTRAINT "GlossaryTermPerson_glossaryTermId_personId_key" UNIQUE ("glossaryTermId", "personId")
    `;

    // Add foreign keys
    await prisma.$executeRaw`
      ALTER TABLE "GlossaryTermPerson"
      ADD CONSTRAINT "GlossaryTermPerson_glossaryTermId_fkey"
      FOREIGN KEY ("glossaryTermId") REFERENCES "GlossaryTerm"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `;

    await prisma.$executeRaw`
      ALTER TABLE "GlossaryTermPerson"
      ADD CONSTRAINT "GlossaryTermPerson_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "Person"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `;

    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX "GlossaryTermPerson_glossaryTermId_idx" ON "GlossaryTermPerson"("glossaryTermId")
    `;

    await prisma.$executeRaw`
      CREATE INDEX "GlossaryTermPerson_personId_idx" ON "GlossaryTermPerson"("personId")
    `;

    res.json({ message: 'Migration applied successfully - GlossaryTermPerson table created' });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/glossary/:id/key-figures - Get key figures linked to a term (Sprint SEO-3)
adminRouter.get('/:id/key-figures', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    const links = await prisma.glossaryTermPerson.findMany({
      where: { glossaryTermId: id },
      include: {
        person: {
          select: {
            id: true,
            canonicalName: true,
            slug: true,
            imageUrl: true,
            shortBio: true,
            currentRole: true,
          },
        },
      },
    });

    res.json(links.map(link => ({
      id: link.id,
      personId: link.personId,
      contributionNote: link.contributionNote,
      person: link.person,
    })));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/glossary/:id/key-figures - Link a person to a term (Sprint SEO-3)
adminRouter.post('/:id/key-figures', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { personId, contributionNote } = req.body;
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    if (!personId) {
      res.status(400).json({ error: 'personId is required' });
      return;
    }

    const link = await prisma.glossaryTermPerson.create({
      data: {
        glossaryTermId: id,
        personId,
        contributionNote: contributionNote || null,
      },
      include: {
        person: {
          select: {
            id: true,
            canonicalName: true,
            slug: true,
            imageUrl: true,
          },
        },
      },
    });

    res.status(201).json(link);
  } catch (error) {
    // Handle duplicate
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(409).json({ error: 'Person is already linked to this term' });
      return;
    }
    next(error);
  }
});

// PUT /api/admin/glossary/:id/key-figures/:linkId - Update a term-person link (Sprint SEO-3)
adminRouter.put('/:id/key-figures/:linkId', requireAdmin, async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { contributionNote } = req.body;
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    const link = await prisma.glossaryTermPerson.update({
      where: { id: linkId },
      data: { contributionNote },
    });

    res.json(link);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/glossary/:id/key-figures/:linkId - Remove a term-person link (Sprint SEO-3)
adminRouter.delete('/:id/key-figures/:linkId', requireAdmin, async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    await prisma.glossaryTermPerson.delete({
      where: { id: linkId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/glossary/run-org-key-concepts-migration - Create GlossaryTermOrganization table (Sprint SEO-3)
adminRouter.post('/run-org-key-concepts-migration', requireAdmin, async (req, res, next) => {
  try {
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    // Check if table already exists
    const checkResult = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'GlossaryTermOrganization'
    `;

    if (checkResult.length > 0) {
      res.json({ message: 'Migration already applied - GlossaryTermOrganization table exists' });
      return;
    }

    // Create the table
    await prisma.$executeRaw`
      CREATE TABLE "GlossaryTermOrganization" (
        "id" TEXT NOT NULL,
        "glossaryTermId" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "contributionNote" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GlossaryTermOrganization_pkey" PRIMARY KEY ("id")
      )
    `;

    // Add unique constraint
    await prisma.$executeRaw`
      ALTER TABLE "GlossaryTermOrganization"
      ADD CONSTRAINT "GlossaryTermOrganization_glossaryTermId_organizationId_key" UNIQUE ("glossaryTermId", "organizationId")
    `;

    // Add foreign keys
    await prisma.$executeRaw`
      ALTER TABLE "GlossaryTermOrganization"
      ADD CONSTRAINT "GlossaryTermOrganization_glossaryTermId_fkey"
      FOREIGN KEY ("glossaryTermId") REFERENCES "GlossaryTerm"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `;

    await prisma.$executeRaw`
      ALTER TABLE "GlossaryTermOrganization"
      ADD CONSTRAINT "GlossaryTermOrganization_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `;

    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX "GlossaryTermOrganization_glossaryTermId_idx" ON "GlossaryTermOrganization"("glossaryTermId")
    `;

    await prisma.$executeRaw`
      CREATE INDEX "GlossaryTermOrganization_organizationId_idx" ON "GlossaryTermOrganization"("organizationId")
    `;

    res.json({ message: 'Migration applied successfully - GlossaryTermOrganization table created' });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/glossary/:id/org-links - Get organizations linked to a term (Sprint SEO-3)
adminRouter.get('/:id/org-links', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    const links = await prisma.glossaryTermOrganization.findMany({
      where: { glossaryTermId: id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            shortDescription: true,
            type: true,
          },
        },
      },
    });

    res.json(links.map(link => ({
      id: link.id,
      organizationId: link.organizationId,
      contributionNote: link.contributionNote,
      organization: link.organization,
    })));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/glossary/:id/org-links - Link an organization to a term (Sprint SEO-3)
adminRouter.post('/:id/org-links', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId, contributionNote } = req.body;
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    if (!organizationId) {
      res.status(400).json({ error: 'organizationId is required' });
      return;
    }

    const link = await prisma.glossaryTermOrganization.create({
      data: {
        glossaryTermId: id,
        organizationId,
        contributionNote: contributionNote || null,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });

    res.status(201).json(link);
  } catch (error) {
    // Handle duplicate
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(409).json({ error: 'Organization is already linked to this term' });
      return;
    }
    next(error);
  }
});

// PUT /api/admin/glossary/:id/org-links/:linkId - Update a term-org link (Sprint SEO-3)
adminRouter.put('/:id/org-links/:linkId', requireAdmin, async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { contributionNote } = req.body;
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    const link = await prisma.glossaryTermOrganization.update({
      where: { id: linkId },
      data: { contributionNote },
    });

    res.json(link);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/glossary/:id/org-links/:linkId - Remove a term-org link (Sprint SEO-3)
adminRouter.delete('/:id/org-links/:linkId', requireAdmin, async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    await prisma.glossaryTermOrganization.delete({
      where: { id: linkId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/glossary/run-milestone-term-migration - Create MilestoneGlossaryTerm table (Sprint SEO-3)
adminRouter.post('/run-milestone-term-migration', requireAdmin, async (req, res, next) => {
  try {
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    // Check if table already exists
    const checkResult = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'MilestoneGlossaryTerm'
    `;

    if (checkResult.length > 0) {
      res.json({ message: 'Migration already applied - MilestoneGlossaryTerm table exists' });
      return;
    }

    // Create the table
    await prisma.$executeRaw`
      CREATE TABLE "MilestoneGlossaryTerm" (
        "id" TEXT NOT NULL,
        "milestoneId" TEXT NOT NULL,
        "glossaryTermId" TEXT NOT NULL,
        "relevanceNote" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MilestoneGlossaryTerm_pkey" PRIMARY KEY ("id")
      )
    `;

    // Add unique constraint
    await prisma.$executeRaw`
      ALTER TABLE "MilestoneGlossaryTerm"
      ADD CONSTRAINT "MilestoneGlossaryTerm_milestoneId_glossaryTermId_key" UNIQUE ("milestoneId", "glossaryTermId")
    `;

    // Add foreign keys
    await prisma.$executeRaw`
      ALTER TABLE "MilestoneGlossaryTerm"
      ADD CONSTRAINT "MilestoneGlossaryTerm_milestoneId_fkey"
      FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `;

    await prisma.$executeRaw`
      ALTER TABLE "MilestoneGlossaryTerm"
      ADD CONSTRAINT "MilestoneGlossaryTerm_glossaryTermId_fkey"
      FOREIGN KEY ("glossaryTermId") REFERENCES "GlossaryTerm"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `;

    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX "MilestoneGlossaryTerm_milestoneId_idx" ON "MilestoneGlossaryTerm"("milestoneId")
    `;

    await prisma.$executeRaw`
      CREATE INDEX "MilestoneGlossaryTerm_glossaryTermId_idx" ON "MilestoneGlossaryTerm"("glossaryTermId")
    `;

    res.json({ message: 'Migration applied successfully - MilestoneGlossaryTerm table created' });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/glossary/:id/milestone-links - Get milestones linked to a term (Sprint SEO-3)
adminRouter.get('/:id/milestone-links', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    const links = await prisma.milestoneGlossaryTerm.findMany({
      where: { glossaryTermId: id },
      include: {
        milestone: {
          select: {
            id: true,
            title: true,
            date: true,
            category: true,
            significance: true,
          },
        },
      },
    });

    res.json(links.map(link => ({
      id: link.id,
      milestoneId: link.milestoneId,
      relevanceNote: link.relevanceNote,
      milestone: link.milestone,
    })));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/glossary/:id/milestone-links - Link a milestone to a term (Sprint SEO-3)
adminRouter.post('/:id/milestone-links', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { milestoneId, relevanceNote } = req.body;
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    if (!milestoneId) {
      res.status(400).json({ error: 'milestoneId is required' });
      return;
    }

    const link = await prisma.milestoneGlossaryTerm.create({
      data: {
        glossaryTermId: id,
        milestoneId,
        relevanceNote: relevanceNote || null,
      },
      include: {
        milestone: {
          select: {
            id: true,
            title: true,
            date: true,
            category: true,
          },
        },
      },
    });

    res.status(201).json(link);
  } catch (error) {
    // Handle duplicate
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(409).json({ error: 'Milestone is already linked to this term' });
      return;
    }
    next(error);
  }
});

// PUT /api/admin/glossary/:id/milestone-links/:linkId - Update a term-milestone link (Sprint SEO-3)
adminRouter.put('/:id/milestone-links/:linkId', requireAdmin, async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { relevanceNote } = req.body;
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    const link = await prisma.milestoneGlossaryTerm.update({
      where: { id: linkId },
      data: { relevanceNote },
    });

    res.json(link);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/glossary/:id/milestone-links/:linkId - Remove a term-milestone link (Sprint SEO-3)
adminRouter.delete('/:id/milestone-links/:linkId', requireAdmin, async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { prisma } = await import('../db');
    if (!prisma) throw new Error('Database not available');

    await prisma.milestoneGlossaryTerm.delete({
      where: { id: linkId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

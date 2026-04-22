/**
 * Admin blog routes — /api/admin/blog, /api/admin/authors
 * Sprint Blog-1 — Data Model & API Foundation
 *
 * All routes require admin JWT.
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import * as adminController from '../controllers/blogAdmin';
import { prisma } from '../db';

const router = Router();

// Posts
router.get('/', requireAdmin, adminController.listPosts);
router.post('/', requireAdmin, adminController.createPost);
router.post('/upload-url', requireAdmin, adminController.getUploadUrl);

/**
 * POST /api/admin/blog/run-migration — idempotent in-Lambda schema bootstrap for prod.
 * The main migration lives at prisma/migrations/20260422000000_add_blog_posts/migration.sql
 * and will also apply via `prisma migrate deploy`, but that command requires direct
 * access to the RDS instance — our prod DB is VPC-only, so we match the pattern used
 * by the glossary admin migrations (see `/api/admin/glossary/run-*-migration`).
 * Safe to re-run: every DDL uses IF NOT EXISTS.
 */
router.post('/run-migration', requireAdmin, async (_req, res, next) => {
  try {
    const statements = [
      `CREATE TABLE IF NOT EXISTS "Author" (
        "id" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT,
        "bio" TEXT,
        "avatarUrl" TEXT,
        "links" TEXT NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "BlogPost" (
        "id" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "subtitle" TEXT,
        "excerpt" TEXT NOT NULL,
        "bodyMarkdown" TEXT NOT NULL,
        "coverImageUrl" TEXT,
        "authorId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "publishedAt" TIMESTAMP(3),
        "scheduledFor" TIMESTAMP(3),
        "readingMinutes" INTEGER NOT NULL DEFAULT 1,
        "seoTitle" TEXT,
        "seoDescription" TEXT,
        "canonicalUrl" TEXT,
        "tags" TEXT NOT NULL DEFAULT '[]',
        "featured" BOOLEAN NOT NULL DEFAULT false,
        "viewCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "BlogPostSubject" (
        "id" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        "subjectId" TEXT NOT NULL,
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "BlogPostSubject_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "BlogPostRelation" (
        "id" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "relationLabel" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BlogPostRelation_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Author_slug_key" ON "Author"("slug")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_key" ON "BlogPost"("slug")`,
      `CREATE INDEX IF NOT EXISTS "BlogPost_status_publishedAt_idx" ON "BlogPost"("status", "publishedAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "BlogPost_featured_publishedAt_idx" ON "BlogPost"("featured", "publishedAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "BlogPost_authorId_publishedAt_idx" ON "BlogPost"("authorId", "publishedAt" DESC)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "BlogPostSubject_postId_subjectId_key" ON "BlogPostSubject"("postId", "subjectId")`,
      `CREATE INDEX IF NOT EXISTS "BlogPostSubject_subjectId_idx" ON "BlogPostSubject"("subjectId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "BlogPostRelation_postId_entityType_entityId_key" ON "BlogPostRelation"("postId", "entityType", "entityId")`,
      `CREATE INDEX IF NOT EXISTS "BlogPostRelation_entityType_entityId_idx" ON "BlogPostRelation"("entityType", "entityId")`,
    ];

    // Foreign keys — separate so the CREATE TABLE IF NOT EXISTS above won't fail if
    // the table already exists without the FK (tolerant upgrade path).
    const fkStatements: Array<{ name: string; sql: string }> = [
      {
        name: 'BlogPost_authorId_fkey',
        sql: `ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      },
      {
        name: 'BlogPostSubject_postId_fkey',
        sql: `ALTER TABLE "BlogPostSubject" ADD CONSTRAINT "BlogPostSubject_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      },
      {
        name: 'BlogPostSubject_subjectId_fkey',
        sql: `ALTER TABLE "BlogPostSubject" ADD CONSTRAINT "BlogPostSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      },
      {
        name: 'BlogPostRelation_postId_fkey',
        sql: `ALTER TABLE "BlogPostRelation" ADD CONSTRAINT "BlogPostRelation_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      },
    ];

    const results: string[] = [];
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
      results.push('ok');
    }

    for (const { name, sql } of fkStatements) {
      const existing = await prisma.$queryRawUnsafe<Array<{ conname: string }>>(
        `SELECT conname FROM pg_constraint WHERE conname = $1`,
        name
      );
      if (existing.length > 0) {
        results.push(`${name}: exists`);
        continue;
      }
      await prisma.$executeRawUnsafe(sql);
      results.push(`${name}: added`);
    }

    res.json({ message: 'Blog migration applied', results });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/blog/seed-default-post — idempotent prod seeder.
 *
 * Creates the Sprint Blog-1 seed post ("Why we built LAEA") in prod. Mirrors
 * prisma/seeds/blog.ts but runs inside the VPC so it can reach RDS without a
 * tunnel. Upsert-by-slug so re-running is safe.
 */
router.post('/seed-default-post', requireAdmin, async (_req, res, next) => {
  try {
    const AUTHOR_SLUG = 'wylie-brown';
    const POST_SLUG = 'why-we-built-laea';
    const POST_BODY = `# Why we built LAEA

Most "AI history" resources online are either a marketing reel from a single lab or a
timeline flattened into a dozen bullet points. Neither captures the *actual* shape of the
field: a braided river of ideas whose tributaries came from statistics, neuroscience,
linguistics, philosophy, and — more recently — massive amounts of capital.

## The gap

Builders, investors, students, and policymakers keep asking the same set of questions:

- *When did this idea actually start?*
- *Who first proposed it, who scaled it, and who commercialized it?*
- *What did it unlock, and what did it break?*
- *What's the honest state of play today?*

Answering those well requires a data structure. A good retrospective is not a list of
events; it is a **graph** of people, organizations, models, concepts, and moments — with
the edges between them labeled and dated. That's what LAEA is: a structured atlas that
lets you zoom from a 90-second overview of a decade down to the specific 2014 workshop
where a specific idea was first published, and then follow forward to every commercial
product it seeded.

## The pieces

Under the hood, LAEA ships five first-class entities that reference each other:

1. **Milestones** — dated events with significance scores, stakeholders, and an honest
   "what changed" summary.
2. **People** — researchers, executives, founders, engineers. Each profile is a
   *currently-doing* feed, not a frozen Wikipedia stub.
3. **Organizations** — companies, labs, universities. Same living-profile treatment.
4. **Glossary terms** — concept pages that include prerequisites, who invented them,
   and what they unlocked.
5. **Subjects** — a three-level taxonomy (domain → category → subcategory) that ties
   everything together so you can surf laterally across the graph.

This blog is the sixth: the place where we *think out loud* about the graph — the
arguments between milestones, the unresolved debates inside a term, the context behind
a career change. Posts link directly into the structured data, and the structured data
links back here.

## What's next

Expect shorter explainers when the news warrants them, longer op-eds when something is
worth disagreeing about in public, and occasional retrospectives when a timeline thread
closes a decades-long loop. If you want a piece on something specific — or you disagree
with how we've mapped something — the repo is open and the atlas is meant to be
contested. That's the whole point.
`;

    const author = await prisma.author.upsert({
      where: { slug: AUTHOR_SLUG },
      create: {
        slug: AUTHOR_SLUG,
        name: 'Wylie Brown',
        role: 'Editor',
        bio: 'Builder of the AI Timeline Atlas. Writes about history, markets, and infrastructure of AI.',
        links: '{}',
      },
      update: { name: 'Wylie Brown', role: 'Editor' },
    });

    const wordCount = POST_BODY.trim().split(/\s+/).filter(Boolean).length;
    const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

    const post = await prisma.blogPost.upsert({
      where: { slug: POST_SLUG },
      create: {
        slug: POST_SLUG,
        title: 'Why we built LAEA',
        subtitle: 'An atlas of AI history — because every other map is too flat.',
        excerpt:
          'Most AI history online is either marketing reel or bullet-point timeline. Neither captures the real shape of the field. Here is what we are building instead.',
        bodyMarkdown: POST_BODY,
        authorId: author.id,
        status: 'published',
        publishedAt: new Date(),
        readingMinutes,
        tags: JSON.stringify(['editorial', 'atlas', 'intro']),
        featured: true,
        seoTitle: 'Why we built LAEA — a structured atlas of AI history',
        seoDescription:
          'The AI Timeline Atlas is a graph of people, orgs, models, and ideas. Here is why we built it and how it fits together.',
      },
      update: {
        title: 'Why we built LAEA',
        bodyMarkdown: POST_BODY,
        readingMinutes,
        featured: true,
        status: 'published',
      },
    });

    const science = await prisma.subject.findFirst({
      where: { slug: 'science', level: 0 },
      select: { id: true },
    });
    if (science) {
      await prisma.blogPostSubject.upsert({
        where: { postId_subjectId: { postId: post.id, subjectId: science.id } },
        create: { postId: post.id, subjectId: science.id, isPrimary: true },
        update: { isPrimary: true },
      });
    }

    const milestone = await prisma.milestone.findFirst({
      orderBy: { date: 'desc' },
      select: { id: true },
    });
    if (milestone) {
      await prisma.blogPostRelation.upsert({
        where: {
          postId_entityType_entityId: {
            postId: post.id,
            entityType: 'milestone',
            entityId: milestone.id,
          },
        },
        create: {
          postId: post.id,
          entityType: 'milestone',
          entityId: milestone.id,
          relationLabel: 'Referenced',
        },
        update: { relationLabel: 'Referenced' },
      });
    }

    res.json({
      message: 'Seed post upserted',
      post: { id: post.id, slug: post.slug, status: post.status },
      linkedSubjectSlug: science ? 'science' : null,
      linkedMilestoneId: milestone?.id ?? null,
    });
  } catch (error) {
    next(error);
  }
});

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

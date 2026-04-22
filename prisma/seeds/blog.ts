/* eslint-disable no-console */
/**
 * Blog seed — idempotent (upsert by slug).
 * Sprint Blog-1 — Data Model & API Foundation
 *
 * Creates: Wylie as Author, "Why we built LAEA" as a featured published post,
 * linked to one existing Subject (if any) and one existing Milestone (if any).
 *
 * Run: DATABASE_URL=... npm run seed:blog
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

async function main() {
  console.log('[seed:blog] Starting…');

  // 1. Upsert author
  const author = await prisma.author.upsert({
    where: { slug: AUTHOR_SLUG },
    create: {
      slug: AUTHOR_SLUG,
      name: 'Wylie Brown',
      role: 'Editor',
      bio: 'Builder of the AI Timeline Atlas. Writes about history, markets, and infrastructure of AI.',
      avatarUrl: null,
      links: JSON.stringify({}),
    },
    update: {
      name: 'Wylie Brown',
      role: 'Editor',
    },
  });
  console.log(`[seed:blog] Author upserted: ${author.slug} (${author.id})`);

  // 2. Upsert post
  const wordCount = POST_BODY.trim().split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const post = await prisma.blogPost.upsert({
    where: { slug: POST_SLUG },
    create: {
      slug: POST_SLUG,
      title: 'Why we built LAEA',
      subtitle: 'An atlas of AI history — because every other map is too flat.',
      excerpt:
        'Most AI history online is either marketing reel or bullet-point timeline. Neither ' +
        'captures the real shape of the field. Here is what we are building instead.',
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
      excerpt:
        'Most AI history online is either marketing reel or bullet-point timeline. Neither ' +
        'captures the real shape of the field. Here is what we are building instead.',
      readingMinutes,
      featured: true,
      status: 'published',
    },
  });
  console.log(`[seed:blog] Post upserted: ${post.slug} (${post.id})`);

  // 3. Link to one subject if available (skip silently if the taxonomy is empty)
  const subject =
    (await prisma.subject.findFirst({
      where: { level: 0, slug: 'science' },
      select: { id: true, slug: true, name: true },
    })) ??
    (await prisma.subject.findFirst({
      select: { id: true, slug: true, name: true },
    }));

  if (subject) {
    await prisma.blogPostSubject.upsert({
      where: { postId_subjectId: { postId: post.id, subjectId: subject.id } },
      create: { postId: post.id, subjectId: subject.id, isPrimary: true },
      update: { isPrimary: true },
    });
    console.log(`[seed:blog] Linked subject: ${subject.slug}`);
  } else {
    console.log('[seed:blog] No Subject rows found — skipped subject link.');
  }

  // 4. Link to one milestone if available (skip silently if none)
  const milestone = await prisma.milestone.findFirst({
    orderBy: { date: 'desc' },
    select: { id: true, title: true },
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
    console.log(`[seed:blog] Linked milestone: ${milestone.id} — ${milestone.title}`);
  } else {
    console.log('[seed:blog] No Milestone rows found — skipped milestone link.');
  }

  console.log('[seed:blog] Done.');
}

main()
  .catch((err) => {
    console.error('[seed:blog] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

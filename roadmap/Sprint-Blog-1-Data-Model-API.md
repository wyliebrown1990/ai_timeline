# Sprint Blog-1: Data Model & API Foundation

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-21 by Claude (AITechLeadReview — added S3 SDK install, IAM policy task, Subject relation line refs)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and `.claude/rules/backend.md`, `.claude/rules/data-models.md`, `.claude/rules/subject-taxonomy.md`.
2. Open `roadmap/PLAN-Blog-Editorial.md` and re-read the **Developer Workflow (MANDATORY)** section. Do not skip.
3. Open this file. Find the next unchecked `[ ]` task — start there.
4. For every code block you write: typecheck → lint → tests → commit → check the box.
5. QA live on frontend and backend before closing each task group.
6. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Establish the database schema, API endpoints, and seed data needed to support the blog. This sprint is pure backend — no UI. Output: a running API that can list + fetch posts (public) and create/update/publish them (admin).

**Priority**: HIGH (blocking all other Blog sprints)
**Estimated Effort**: 2 days
**Status**: Not started

---

## Prerequisites

- [ ] Confirm RDS PostgreSQL accessible: `DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text) npx prisma db pull`
- [ ] Confirm local dev server runs: `npm run dev` + `npm run dev:server`
- [ ] Review existing Prisma models `Subject`, `ContentSubject`, `Milestone`, `Person`, `Organization`, `GlossaryTerm`

---

## Tasks

### 1. Prisma Schema

#### 1.1 Add `Author` model
- [ ] Add to `prisma/schema.prisma`:
  ```prisma
  model Author {
    id         String     @id @default(cuid())
    slug       String     @unique
    name       String
    role       String?    // e.g. "Editor", "Contributor"
    bio        String?
    avatarUrl  String?
    links      String     @default("{}")  // JSON: {twitter, linkedin, website}
    createdAt  DateTime   @default(now())
    updatedAt  DateTime   @updatedAt
    posts      BlogPost[]
  }
  ```

#### 1.2 Add `BlogPost` model
- [ ] Add to `prisma/schema.prisma`:
  ```prisma
  model BlogPost {
    id              String    @id @default(cuid())
    slug            String    @unique
    title           String
    subtitle        String?
    excerpt         String    // used for cards + OG description
    bodyMarkdown    String    // source of truth
    coverImageUrl   String?
    authorId        String
    author          Author    @relation(fields: [authorId], references: [id])
    status          String    @default("draft") // draft | scheduled | published | archived
    publishedAt     DateTime?
    scheduledFor    DateTime?
    readingMinutes  Int       @default(1)
    seoTitle        String?
    seoDescription  String?
    canonicalUrl    String?
    tags            String    @default("[]")  // JSON string[]
    featured        Boolean   @default(false) // homepage hero eligibility
    viewCount       Int       @default(0)
    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt

    subjects        BlogPostSubject[]
    relations       BlogPostRelation[]

    @@index([status, publishedAt(sort: Desc)])
    @@index([featured, publishedAt(sort: Desc)])
    @@index([authorId, publishedAt(sort: Desc)])
  }
  ```

#### 1.3 Add `BlogPostSubject` join model
- [ ] Add to `prisma/schema.prisma`:
  ```prisma
  model BlogPostSubject {
    id         String   @id @default(cuid())
    postId     String
    post       BlogPost @relation(fields: [postId], references: [id], onDelete: Cascade)
    subjectId  String
    subject    Subject  @relation(fields: [subjectId], references: [id])
    isPrimary  Boolean  @default(false)

    @@unique([postId, subjectId])
    @@index([subjectId])
  }
  ```
- [ ] Add inverse relation `posts BlogPostSubject[]` to the existing `Subject` model at `prisma/schema.prisma:1237-1271` (in the existing relations block alongside `contentSubjects` and `synonyms`).

#### 1.4 Add `BlogPostRelation` polymorphic link
- [ ] Add to `prisma/schema.prisma`:
  ```prisma
  model BlogPostRelation {
    id            String   @id @default(cuid())
    postId        String
    post          BlogPost @relation(fields: [postId], references: [id], onDelete: Cascade)
    entityType    String   // milestone | person | organization | glossary_term
    entityId      String
    relationLabel String?  // e.g. "Explains", "Profile of"
    createdAt     DateTime @default(now())

    @@unique([postId, entityType, entityId])
    @@index([entityType, entityId])
  }
  ```

#### 1.5 Migrate
- [ ] Run local migration: `npx prisma migrate dev --name add_blog_posts`
- [ ] Verify schema changes with `npx prisma studio` (inspect models)
- [ ] Commit `prisma/schema.prisma` + new migration folder

### 2. Types (Zod)

- [ ] Create `src/types/blog.ts` with Zod schemas: `BlogPostSchema`, `BlogPostListItemSchema`, `AuthorSchema`, `BlogPostStatusEnum`.
- [ ] Export inferred TS types.
- [ ] Add a short comment at the top explaining this file is the contract for `/api/blog` responses.

### 3. Backend Services

#### 3.0 Install S3 SDK (required for 3.3 and Blog-3 image upload)
- [ ] `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` — currently only `@aws-sdk/client-ssm`, `@aws-sdk/client-ses`, `@aws-sdk/client-lambda`, `@aws-sdk/client-cloudwatch-logs` are installed (verified against `package.json:40-43`).


#### 3.1 Public service
- [ ] Create `server/src/services/blog.ts` with:
  - `listPublishedPosts({ page, pageSize, tag?, subjectSlug?, authorSlug? })`
  - `getPublishedPostBySlug(slug)` — includes author, subjects, relations
  - `getRelatedPosts(postId, limit = 3)` — ranks by shared-subject count, then shared-entity count, then recency
  - `computeReadingMinutes(markdown: string): number` — words / 200 rounded up, min 1

#### 3.2 Admin service
- [ ] Create `server/src/services/blogAdmin.ts` with:
  - `listAllPosts({ status?, authorId?, q? })`
  - `createDraft(input, authorId)` — auto-generates slug from title, ensures uniqueness (append `-2`, `-3`, ...)
  - `updatePost(id, patch)` — recomputes `readingMinutes` when body changes
  - `publishPost(id)` — sets status=published, publishedAt=now (or scheduledFor if present)
  - `schedulePost(id, scheduledFor)`
  - `archivePost(id)`
  - `setSubjects(postId, subjectIds, primaryId?)`
  - `setRelations(postId, relations[])`

#### 3.3 S3 upload
- [ ] Add `getPresignedUploadUrl(filename, contentType)` to `server/src/services/blogAdmin.ts` that returns a presigned PUT URL for `s3://ai-timeline-frontend-1765916222/blog-uploads/{yyyy}/{mm}/{uuid}.{ext}`.
- [ ] Use `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (installed in Task 3.0).

#### 3.4 SAM IAM policy — S3 permissions (CRITICAL — blocks prod upload)
> **Found by AITechLeadReview**: `infra/template.yaml:136-176` currently grants CloudWatch/SSM/EC2/SES/Lambda but **zero S3 permissions**. Without this update, the presigned upload URL will be generated but PUT requests will 403.
- [ ] Edit `infra/template.yaml` — in the `ai-timeline-api-prod` function's `Policies` block, add a statement:
  ```yaml
  - Statement:
      - Effect: Allow
        Action:
          - s3:PutObject
          - s3:GetObject
        Resource: arn:aws:s3:::ai-timeline-frontend-1765916222/blog-uploads/*
  ```
- [ ] If Blog-5 OG image generation also writes to S3, also allow `s3:PutObject` on `arn:aws:s3:::ai-timeline-frontend-1765916222/blog-og/*` (or add in Blog-5 — whichever ships first).
- [ ] Verify after deploy: `aws iam get-role-policy --role-name <lambda-role> --policy-name <name>` shows the new Resource ARN.

### 4. Controllers + Routes

#### 4.1 Public controller
- [ ] Create `server/src/controllers/blog.ts` handling:
  - `GET /api/blog` (list with filters, pagination)
  - `GET /api/blog/:slug`
  - `GET /api/blog/related?slug=`
  - `GET /api/authors/:slug`

#### 4.2 Admin controller
- [ ] Create `server/src/controllers/blogAdmin.ts` handling the full admin surface listed in `PLAN-Blog-Editorial.md` (`POST/PUT/GET/DELETE` on `/api/admin/blog`, `/publish`, `/schedule`, `/archive`, `/upload-url`, authors CRUD).
- [ ] All admin endpoints MUST be behind the existing JWT middleware.

#### 4.3 Routes
- [ ] Create `server/src/routes/blog.ts` (public).
- [ ] Create `server/src/routes/blogAdmin.ts` (admin).
- [ ] Wire both in `server/src/index.ts` alongside existing route mounts. Keep order: public before admin.

### 5. Sitemap + RSS stubs

- [ ] Extend `server/src/routes/sitemap.ts`: include `/blog` index and every published post URL with `lastmod = publishedAt`.
- [ ] Add `GET /api/blog/rss.xml` route returning RSS 2.0 for the 20 most-recent published posts. Minimal implementation now; richer formatting in Sprint Blog-4.

### 6. Seed data

- [ ] Create `prisma/seeds/blog.ts` that inserts:
  - 1 `Author` record for Wylie (`slug: "wylie-brown"`).
  - 1 sample `BlogPost` in status `published` titled *"Why we built LAEA"* with 500+ words of markdown body and `featured: true`.
  - Link it to 1 existing `Subject` and 1 existing `Milestone` via `BlogPostRelation`.
- [ ] Add `"seed:blog": "ts-node prisma/seeds/blog.ts"` to `package.json` scripts.
- [ ] Run locally: `npm run seed:blog`. Verify with `npx prisma studio`.

### 7. Tests

- [ ] Create `server/src/services/__tests__/blog.test.ts`:
  - `computeReadingMinutes` edge cases (empty, short, long).
  - `getRelatedPosts` ranking with mocked Prisma.
  - Slug uniqueness logic.
- [ ] Create `server/src/controllers/__tests__/blog.test.ts` hitting the public routes with supertest: list, get-by-slug, 404, filter by tag.
- [ ] Create `server/src/controllers/__tests__/blogAdmin.test.ts`: auth required, create → publish → appears in public list.
- [ ] All tests passing: `npm test -- blog`.

### 8. Type-safety + lint

- [ ] `npm run typecheck` — zero errors.
- [ ] `npm run lint` — zero errors.

### 9. Deploy

- [ ] Build server: `cd infra && sam build` (ensure Task 3.4 IAM changes are in the template)
- [ ] Deploy: `sam deploy --no-confirm-changeset`
- [ ] Run prod migration: `export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text) && npx prisma migrate deploy`
- [ ] Seed the featured post in prod: `DATABASE_URL=... npm run seed:blog` (only if no post exists — the seed must be idempotent; make it upsert by slug).

### 10. QA — Backend smoke tests

- [ ] `curl https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api/blog` returns seeded post.
- [ ] `curl .../api/blog/why-we-built-laea` returns full post with author + subjects + relations.
- [ ] `curl .../api/blog/rss.xml` returns valid RSS XML.
- [ ] `curl .../sitemap.xml | grep /blog/` shows the new post URL.
- [ ] Admin login flow: obtain JWT → `POST /api/admin/blog` creates draft → `POST /api/admin/blog/:id/publish` works → appears in public list.
- [ ] CloudWatch logs clean: `aws logs tail /aws/lambda/ai-timeline-api-prod --since 10m` — no errors.

---

## Definition of Done

- [ ] All tasks above checked.
- [ ] Local + prod migrations applied with zero data loss on existing tables.
- [ ] One featured post live in prod, returned by all three public endpoints + sitemap + RSS.
- [ ] Admin can create/publish via curl or Postman against prod.
- [ ] Code coverage for new services ≥80% (unit tests for all service functions).
- [ ] Zero TypeScript errors, zero lint errors.
- [ ] Committed to `main` with descriptive commit messages; deploy recorded in commit.

---

## Files Touched (expected)

```
prisma/schema.prisma
prisma/migrations/<timestamp>_add_blog_posts/
prisma/seeds/blog.ts
server/src/services/blog.ts                       (new)
server/src/services/blogAdmin.ts                  (new)
server/src/services/__tests__/blog.test.ts        (new)
server/src/controllers/blog.ts                    (new)
server/src/controllers/blogAdmin.ts               (new)
server/src/controllers/__tests__/blog.test.ts     (new)
server/src/controllers/__tests__/blogAdmin.test.ts (new)
server/src/routes/blog.ts                         (new)
server/src/routes/blogAdmin.ts                    (new)
server/src/routes/sitemap.ts                      (modify)
server/src/index.ts                               (modify — mount routes)
src/types/blog.ts                                 (new)
package.json                                      (add seed:blog script, deps)
```

---

## Blocked — PM decision needed

(None yet. Add any questions for Wylie here.)

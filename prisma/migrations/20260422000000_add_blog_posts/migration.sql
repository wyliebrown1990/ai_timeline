-- CreateTable
CREATE TABLE "Author" (
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
);

-- CreateTable
CREATE TABLE "BlogPost" (
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
);

-- CreateTable
CREATE TABLE "BlogPostSubject" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BlogPostSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPostRelation" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "relationLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogPostRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_status_publishedAt_idx" ON "BlogPost"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "BlogPost_featured_publishedAt_idx" ON "BlogPost"("featured", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "BlogPost_authorId_publishedAt_idx" ON "BlogPost"("authorId", "publishedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "BlogPostSubject_postId_subjectId_key" ON "BlogPostSubject"("postId", "subjectId");

-- CreateIndex
CREATE INDEX "BlogPostSubject_subjectId_idx" ON "BlogPostSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPostRelation_postId_entityType_entityId_key" ON "BlogPostRelation"("postId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "BlogPostRelation_entityType_entityId_idx" ON "BlogPostRelation"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostSubject" ADD CONSTRAINT "BlogPostSubject_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostSubject" ADD CONSTRAINT "BlogPostSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostRelation" ADD CONSTRAINT "BlogPostRelation_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

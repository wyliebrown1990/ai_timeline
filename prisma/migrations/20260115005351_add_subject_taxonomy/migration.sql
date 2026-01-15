-- AlterTable
ALTER TABLE "IngestedArticle" ADD COLUMN     "classifiedSubjects" JSONB,
ADD COLUMN     "subjectClassifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL,
    "parentId" TEXT,
    "path" TEXT NOT NULL,
    "domainSlug" TEXT NOT NULL,
    "defaultDifficulty" TEXT,
    "learningObjectives" TEXT NOT NULL DEFAULT '[]',
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectSynonym" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "term" TEXT NOT NULL,

    CONSTRAINT "SubjectSynonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSubject" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'auto',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subject_slug_key" ON "Subject"("slug");

-- CreateIndex
CREATE INDEX "Subject_level_idx" ON "Subject"("level");

-- CreateIndex
CREATE INDEX "Subject_domainSlug_idx" ON "Subject"("domainSlug");

-- CreateIndex
CREATE INDEX "Subject_parentId_idx" ON "Subject"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectSynonym_term_key" ON "SubjectSynonym"("term");

-- CreateIndex
CREATE INDEX "SubjectSynonym_subjectId_idx" ON "SubjectSynonym"("subjectId");

-- CreateIndex
CREATE INDEX "ContentSubject_contentType_contentId_idx" ON "ContentSubject"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "ContentSubject_subjectId_idx" ON "ContentSubject"("subjectId");

-- CreateIndex
CREATE INDEX "ContentSubject_isPrimary_subjectId_idx" ON "ContentSubject"("isPrimary", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentSubject_contentType_contentId_subjectId_key" ON "ContentSubject"("contentType", "contentId", "subjectId");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectSynonym" ADD CONSTRAINT "SubjectSynonym_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSubject" ADD CONSTRAINT "ContentSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: KeyFigure
CREATE TABLE "KeyFigure" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "aliases" TEXT NOT NULL DEFAULT '[]',
    "shortBio" TEXT NOT NULL,
    "fullBio" TEXT,
    "primaryOrg" TEXT,
    "previousOrgs" TEXT NOT NULL DEFAULT '[]',
    "role" TEXT NOT NULL,
    "notableFor" TEXT NOT NULL,
    "imageUrl" TEXT,
    "wikipediaUrl" TEXT,
    "linkedInUrl" TEXT,
    "twitterHandle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "sourceArticleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeyFigure_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MilestoneContributor
CREATE TABLE "MilestoneContributor" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "keyFigureId" TEXT NOT NULL,
    "contributionType" TEXT,

    CONSTRAINT "MilestoneContributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable: KeyFigureDraft
CREATE TABLE "KeyFigureDraft" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "extractedName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "suggestedBio" TEXT,
    "suggestedOrg" TEXT,
    "suggestedRole" TEXT,
    "matchedFigureId" TEXT,
    "matchConfidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeyFigureDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KeyFigure_canonicalName_key" ON "KeyFigure"("canonicalName");
CREATE INDEX "KeyFigure_canonicalName_idx" ON "KeyFigure"("canonicalName");
CREATE INDEX "KeyFigure_role_idx" ON "KeyFigure"("role");
CREATE INDEX "KeyFigure_status_idx" ON "KeyFigure"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneContributor_milestoneId_keyFigureId_key" ON "MilestoneContributor"("milestoneId", "keyFigureId");
CREATE INDEX "MilestoneContributor_milestoneId_idx" ON "MilestoneContributor"("milestoneId");
CREATE INDEX "MilestoneContributor_keyFigureId_idx" ON "MilestoneContributor"("keyFigureId");

-- CreateIndex
CREATE INDEX "KeyFigureDraft_status_idx" ON "KeyFigureDraft"("status");
CREATE INDEX "KeyFigureDraft_articleId_idx" ON "KeyFigureDraft"("articleId");
CREATE INDEX "KeyFigureDraft_matchedFigureId_idx" ON "KeyFigureDraft"("matchedFigureId");

-- AddForeignKey
ALTER TABLE "MilestoneContributor" ADD CONSTRAINT "MilestoneContributor_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneContributor" ADD CONSTRAINT "MilestoneContributor_keyFigureId_fkey" FOREIGN KEY ("keyFigureId") REFERENCES "KeyFigure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyFigureDraft" ADD CONSTRAINT "KeyFigureDraft_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "IngestedArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyFigureDraft" ADD CONSTRAINT "KeyFigureDraft_matchedFigureId_fkey" FOREIGN KEY ("matchedFigureId") REFERENCES "KeyFigure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

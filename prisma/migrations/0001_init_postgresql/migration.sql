-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "significance" INTEGER NOT NULL,
    "era" TEXT,
    "organization" TEXT,
    "contributors" TEXT NOT NULL DEFAULT '[]',
    "sourceUrl" TEXT,
    "imageUrl" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "sources" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessImpact" TEXT,
    "commonMisconceptions" TEXT,
    "historicalContext" TEXT,
    "simpleExplanation" TEXT,
    "technicalDepth" TEXT,
    "tldr" TEXT,
    "whyItMattersToday" TEXT,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "checkFrequency" INTEGER NOT NULL DEFAULT 60,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestedArticle" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisStatus" TEXT NOT NULL DEFAULT 'pending',
    "analyzedAt" TIMESTAMP(3),
    "relevanceScore" DOUBLE PRECISION,
    "isMilestoneWorthy" BOOLEAN NOT NULL DEFAULT false,
    "milestoneRationale" TEXT,
    "analysisError" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" TEXT,
    "duplicateScore" DOUBLE PRECISION,
    "duplicateReason" TEXT,

    CONSTRAINT "IngestedArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDraft" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "draftData" JSONB NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "validationErrors" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedId" TEXT,

    CONSTRAINT "ContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlossaryTerm" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "shortDefinition" TEXT NOT NULL,
    "fullDefinition" TEXT NOT NULL,
    "businessContext" TEXT,
    "example" TEXT,
    "inMeetingExample" TEXT,
    "category" TEXT NOT NULL,
    "relatedTermIds" TEXT NOT NULL DEFAULT '[]',
    "relatedMilestoneIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceArticleId" TEXT,

    CONSTRAINT "GlossaryTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionError" (
    "id" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "sourceId" TEXT,
    "articleId" TEXT,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "ingestionPaused" BOOLEAN NOT NULL DEFAULT false,
    "analysisPaused" BOOLEAN NOT NULL DEFAULT false,
    "lastIngestionRun" TIMESTAMP(3),
    "lastAnalysisRun" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Milestone_date_idx" ON "Milestone"("date");

-- CreateIndex
CREATE INDEX "Milestone_category_idx" ON "Milestone"("category");

-- CreateIndex
CREATE INDEX "Milestone_era_idx" ON "Milestone"("era");

-- CreateIndex
CREATE UNIQUE INDEX "NewsSource_url_key" ON "NewsSource"("url");

-- CreateIndex
CREATE UNIQUE INDEX "IngestedArticle_externalUrl_key" ON "IngestedArticle"("externalUrl");

-- CreateIndex
CREATE INDEX "IngestedArticle_sourceId_idx" ON "IngestedArticle"("sourceId");

-- CreateIndex
CREATE INDEX "IngestedArticle_publishedAt_idx" ON "IngestedArticle"("publishedAt");

-- CreateIndex
CREATE INDEX "IngestedArticle_analysisStatus_idx" ON "IngestedArticle"("analysisStatus");

-- CreateIndex
CREATE INDEX "IngestedArticle_isMilestoneWorthy_idx" ON "IngestedArticle"("isMilestoneWorthy");

-- CreateIndex
CREATE INDEX "IngestedArticle_isDuplicate_idx" ON "IngestedArticle"("isDuplicate");

-- CreateIndex
CREATE INDEX "IngestedArticle_ingestedAt_idx" ON "IngestedArticle"("ingestedAt");

-- CreateIndex
CREATE INDEX "ContentDraft_articleId_idx" ON "ContentDraft"("articleId");

-- CreateIndex
CREATE INDEX "ContentDraft_contentType_idx" ON "ContentDraft"("contentType");

-- CreateIndex
CREATE INDEX "ContentDraft_status_idx" ON "ContentDraft"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryTerm_term_key" ON "GlossaryTerm"("term");

-- CreateIndex
CREATE INDEX "GlossaryTerm_term_idx" ON "GlossaryTerm"("term");

-- CreateIndex
CREATE INDEX "GlossaryTerm_category_idx" ON "GlossaryTerm"("category");

-- CreateIndex
CREATE INDEX "IngestionError_errorType_idx" ON "IngestionError"("errorType");

-- CreateIndex
CREATE INDEX "IngestionError_resolved_idx" ON "IngestionError"("resolved");

-- CreateIndex
CREATE INDEX "IngestionError_createdAt_idx" ON "IngestionError"("createdAt");

-- AddForeignKey
ALTER TABLE "IngestedArticle" ADD CONSTRAINT "IngestedArticle_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NewsSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestedArticle" ADD CONSTRAINT "IngestedArticle_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "IngestedArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "IngestedArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "ContentDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "draftData" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "validationErrors" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    "publishedId" TEXT,
    CONSTRAINT "ContentDraft_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "IngestedArticle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IngestedArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "ingestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisStatus" TEXT NOT NULL DEFAULT 'pending',
    "analyzedAt" DATETIME,
    "relevanceScore" REAL,
    "isMilestoneWorthy" BOOLEAN NOT NULL DEFAULT false,
    "milestoneRationale" TEXT,
    "analysisError" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT "IngestedArticle_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NewsSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_IngestedArticle" ("analysisStatus", "content", "externalUrl", "id", "ingestedAt", "publishedAt", "reviewStatus", "sourceId", "title") SELECT "analysisStatus", "content", "externalUrl", "id", "ingestedAt", "publishedAt", "reviewStatus", "sourceId", "title" FROM "IngestedArticle";
DROP TABLE "IngestedArticle";
ALTER TABLE "new_IngestedArticle" RENAME TO "IngestedArticle";
CREATE UNIQUE INDEX "IngestedArticle_externalUrl_key" ON "IngestedArticle"("externalUrl");
CREATE INDEX "IngestedArticle_sourceId_idx" ON "IngestedArticle"("sourceId");
CREATE INDEX "IngestedArticle_publishedAt_idx" ON "IngestedArticle"("publishedAt");
CREATE INDEX "IngestedArticle_analysisStatus_idx" ON "IngestedArticle"("analysisStatus");
CREATE INDEX "IngestedArticle_isMilestoneWorthy_idx" ON "IngestedArticle"("isMilestoneWorthy");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ContentDraft_articleId_idx" ON "ContentDraft"("articleId");

-- CreateIndex
CREATE INDEX "ContentDraft_contentType_idx" ON "ContentDraft"("contentType");

-- CreateIndex
CREATE INDEX "ContentDraft_status_idx" ON "ContentDraft"("status");

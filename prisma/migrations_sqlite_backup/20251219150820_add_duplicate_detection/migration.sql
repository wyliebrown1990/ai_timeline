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
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" TEXT,
    "duplicateScore" REAL,
    "duplicateReason" TEXT,
    CONSTRAINT "IngestedArticle_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NewsSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IngestedArticle_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "IngestedArticle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IngestedArticle" ("analysisError", "analysisStatus", "analyzedAt", "content", "externalUrl", "id", "ingestedAt", "isMilestoneWorthy", "milestoneRationale", "publishedAt", "relevanceScore", "reviewStatus", "sourceId", "title") SELECT "analysisError", "analysisStatus", "analyzedAt", "content", "externalUrl", "id", "ingestedAt", "isMilestoneWorthy", "milestoneRationale", "publishedAt", "relevanceScore", "reviewStatus", "sourceId", "title" FROM "IngestedArticle";
DROP TABLE "IngestedArticle";
ALTER TABLE "new_IngestedArticle" RENAME TO "IngestedArticle";
CREATE UNIQUE INDEX "IngestedArticle_externalUrl_key" ON "IngestedArticle"("externalUrl");
CREATE INDEX "IngestedArticle_sourceId_idx" ON "IngestedArticle"("sourceId");
CREATE INDEX "IngestedArticle_publishedAt_idx" ON "IngestedArticle"("publishedAt");
CREATE INDEX "IngestedArticle_analysisStatus_idx" ON "IngestedArticle"("analysisStatus");
CREATE INDEX "IngestedArticle_isMilestoneWorthy_idx" ON "IngestedArticle"("isMilestoneWorthy");
CREATE INDEX "IngestedArticle_isDuplicate_idx" ON "IngestedArticle"("isDuplicate");
CREATE INDEX "IngestedArticle_ingestedAt_idx" ON "IngestedArticle"("ingestedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

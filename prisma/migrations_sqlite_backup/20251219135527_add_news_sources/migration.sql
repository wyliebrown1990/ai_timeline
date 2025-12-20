-- CreateTable
CREATE TABLE "NewsSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "checkFrequency" INTEGER NOT NULL DEFAULT 60,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IngestedArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "ingestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisStatus" TEXT NOT NULL DEFAULT 'pending',
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT "IngestedArticle_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NewsSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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

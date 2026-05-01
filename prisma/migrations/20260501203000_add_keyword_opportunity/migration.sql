-- CreateTable
CREATE TABLE "KeywordOpportunity" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "seedQuery" TEXT NOT NULL,
    "clusterKey" TEXT,
    "clusterSnapshotId" TEXT,
    "sourceRefJson" JSONB,
    "targetIntent" TEXT NOT NULL,
    "demandProxy" INTEGER NOT NULL DEFAULT 0,
    "competitionProxy" INTEGER NOT NULL DEFAULT 0,
    "laeaFitScore" INTEGER NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pageTypeRecommendation" TEXT NOT NULL,
    "targetUrl" TEXT,
    "rationale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "linkedExperimentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KeywordOpportunity_dedupeKey_key" ON "KeywordOpportunity"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordOpportunity_linkedExperimentId_key" ON "KeywordOpportunity"("linkedExperimentId");

-- CreateIndex
CREATE INDEX "KeywordOpportunity_status_overallScore_idx" ON "KeywordOpportunity"("status", "overallScore");

-- CreateIndex
CREATE INDEX "KeywordOpportunity_sourceType_overallScore_idx" ON "KeywordOpportunity"("sourceType", "overallScore");

-- CreateIndex
CREATE INDEX "KeywordOpportunity_clusterKey_idx" ON "KeywordOpportunity"("clusterKey");

-- CreateIndex
CREATE INDEX "KeywordOpportunity_clusterSnapshotId_idx" ON "KeywordOpportunity"("clusterSnapshotId");

-- AddForeignKey
ALTER TABLE "KeywordOpportunity" ADD CONSTRAINT "KeywordOpportunity_clusterSnapshotId_fkey" FOREIGN KEY ("clusterSnapshotId") REFERENCES "GscClusterSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordOpportunity" ADD CONSTRAINT "KeywordOpportunity_linkedExperimentId_fkey" FOREIGN KEY ("linkedExperimentId") REFERENCES "SeoExperiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

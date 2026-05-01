-- AlterTable
ALTER TABLE "SeoProposal"
ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'weekly_snapshot',
ADD COLUMN "clusterSnapshotId" TEXT,
ADD COLUMN "hypothesis" TEXT,
ADD COLUMN "topicPodJson" JSONB,
ALTER COLUMN "snapshotId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SeoExperiment" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "proposalId" TEXT,
    "actionId" TEXT,
    "targetKeyword" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "variantType" TEXT NOT NULL,
    "topicPodJson" JSONB,
    "checkpointsJson" JSONB NOT NULL,
    "scheduledReviewAt" TIMESTAMP(3) NOT NULL,
    "reviewWindowDays" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "metricsBeforeJson" JSONB,
    "metricsAfterJson" JSONB,
    "notes" TEXT,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeoProposal_sourceType_createdAt_idx" ON "SeoProposal"("sourceType", "createdAt");

-- CreateIndex
CREATE INDEX "SeoProposal_clusterSnapshotId_idx" ON "SeoProposal"("clusterSnapshotId");

-- CreateIndex
CREATE INDEX "SeoExperiment_status_scheduledReviewAt_idx" ON "SeoExperiment"("status", "scheduledReviewAt");

-- CreateIndex
CREATE INDEX "SeoExperiment_sourceType_sourceId_idx" ON "SeoExperiment"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SeoExperiment_proposalId_key" ON "SeoExperiment"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "SeoExperiment_actionId_key" ON "SeoExperiment"("actionId");

-- AddForeignKey
ALTER TABLE "SeoProposal"
ADD CONSTRAINT "SeoProposal_clusterSnapshotId_fkey"
FOREIGN KEY ("clusterSnapshotId") REFERENCES "GscClusterSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoExperiment"
ADD CONSTRAINT "SeoExperiment_proposalId_fkey"
FOREIGN KEY ("proposalId") REFERENCES "SeoProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoExperiment"
ADD CONSTRAINT "SeoExperiment_actionId_fkey"
FOREIGN KEY ("actionId") REFERENCES "SeoAgentAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

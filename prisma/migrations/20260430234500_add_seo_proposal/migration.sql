-- CreateTable
CREATE TABLE "SeoProposal" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "proposalType" TEXT NOT NULL,
    "targetKeyword" TEXT NOT NULL,
    "suggestedAngle" TEXT NOT NULL,
    "linkInventoryJson" JSONB NOT NULL,
    "newsHooksJson" JSONB,
    "rationale" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "draftPostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,

    CONSTRAINT "SeoProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeoProposal_status_createdAt_idx" ON "SeoProposal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SeoProposal_targetKeyword_createdAt_idx" ON "SeoProposal"("targetKeyword", "createdAt");

-- AddForeignKey
ALTER TABLE "SeoProposal" ADD CONSTRAINT "SeoProposal_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GscWeeklySnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoProposal" ADD CONSTRAINT "SeoProposal_draftPostId_fkey" FOREIGN KEY ("draftPostId") REFERENCES "BlogPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

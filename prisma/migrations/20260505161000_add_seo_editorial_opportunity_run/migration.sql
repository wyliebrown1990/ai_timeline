-- CreateTable
CREATE TABLE "SeoEditorialOpportunityRun" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetKeyword" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "postId" TEXT,
    "reason" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoEditorialOpportunityRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoEditorialOpportunityRun_idempotencyKey_key" ON "SeoEditorialOpportunityRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SeoEditorialOpportunityRun_weekStart_status_idx" ON "SeoEditorialOpportunityRun"("weekStart", "status");

-- CreateIndex
CREATE INDEX "SeoEditorialOpportunityRun_sourceType_sourceId_idx" ON "SeoEditorialOpportunityRun"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "SeoEditorialOpportunityRun_postId_idx" ON "SeoEditorialOpportunityRun"("postId");

-- AddForeignKey
ALTER TABLE "SeoEditorialOpportunityRun" ADD CONSTRAINT "SeoEditorialOpportunityRun_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SerpSample" (
    "id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "sourceOpportunityId" TEXT,
    "requestKey" TEXT NOT NULL,
    "normalizedQueryKey" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "dateRange" TEXT NOT NULL,
    "page" INTEGER NOT NULL DEFAULT 1,
    "creditsUsed" INTEGER NOT NULL DEFAULT 1,
    "effectiveCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "competitionProxy" INTEGER NOT NULL DEFAULT 0,
    "responseJson" JSONB NOT NULL,
    "summaryJson" JSONB NOT NULL,
    "sampledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SerpSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SerpSample_requestKey_expiresAt_idx" ON "SerpSample"("requestKey", "expiresAt");

-- CreateIndex
CREATE INDEX "SerpSample_vendor_sampledAt_idx" ON "SerpSample"("vendor", "sampledAt");

-- CreateIndex
CREATE INDEX "SerpSample_sourceOpportunityId_idx" ON "SerpSample"("sourceOpportunityId");

-- AddForeignKey
ALTER TABLE "SerpSample" ADD CONSTRAINT "SerpSample_sourceOpportunityId_fkey" FOREIGN KEY ("sourceOpportunityId") REFERENCES "KeywordOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "GscClusterSnapshot" (
    "id" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "horizon" TEXT NOT NULL,
    "clusterKey" TEXT NOT NULL,
    "representativeQuery" TEXT NOT NULL,
    "memberQueriesJson" JSONB NOT NULL,
    "memberPagesJson" JSONB NOT NULL,
    "primaryPage" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "bucket" TEXT,
    "bucketScore" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'open',
    "evidenceJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscClusterSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GscClusterSnapshot_windowEnd_horizon_clusterKey_key"
ON "GscClusterSnapshot"("windowEnd", "horizon", "clusterKey");

-- CreateIndex
CREATE INDEX "GscClusterSnapshot_horizon_bucket_windowEnd_idx"
ON "GscClusterSnapshot"("horizon", "bucket", "windowEnd");

-- CreateIndex
CREATE INDEX "GscClusterSnapshot_status_windowEnd_idx"
ON "GscClusterSnapshot"("status", "windowEnd");

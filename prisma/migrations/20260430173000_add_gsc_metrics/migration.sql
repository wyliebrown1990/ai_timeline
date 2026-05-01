-- CreateTable
CREATE TABLE "GscDailyMetric" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dataSource" TEXT NOT NULL,
    "query" TEXT,
    "queryKey" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GscWeeklySnapshot" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "dataSource" TEXT NOT NULL,
    "query" TEXT,
    "queryKey" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "bucket" TEXT,
    "bucketScore" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscWeeklySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GscDailyMetric_date_dataSource_queryKey_page_device_country_key"
ON "GscDailyMetric"("date", "dataSource", "queryKey", "page", "device", "country");

-- CreateIndex
CREATE INDEX "GscDailyMetric_page_date_dataSource_idx"
ON "GscDailyMetric"("page", "date", "dataSource");

-- CreateIndex
CREATE INDEX "GscDailyMetric_query_date_idx"
ON "GscDailyMetric"("query", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GscWeeklySnapshot_weekStart_dataSource_queryKey_page_key"
ON "GscWeeklySnapshot"("weekStart", "dataSource", "queryKey", "page");

-- CreateIndex
CREATE INDEX "GscWeeklySnapshot_bucket_weekStart_idx"
ON "GscWeeklySnapshot"("bucket", "weekStart");

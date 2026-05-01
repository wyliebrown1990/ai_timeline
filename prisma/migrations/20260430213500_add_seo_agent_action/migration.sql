-- CreateTable
CREATE TABLE "SeoAgentAction" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT,
    "actionType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "beforeJson" JSONB NOT NULL,
    "afterJson" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "shippedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rolledBackAt" TIMESTAMP(3),
    "measuredAt" TIMESTAMP(3),
    "measuredDelta" JSONB,

    CONSTRAINT "SeoAgentAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeoAgentAction_targetType_targetId_idx" ON "SeoAgentAction"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "SeoAgentAction_shippedAt_idx" ON "SeoAgentAction"("shippedAt");

-- CreateIndex
CREATE INDEX "SeoAgentAction_rolledBackAt_idx" ON "SeoAgentAction"("rolledBackAt");

-- AddForeignKey
ALTER TABLE "SeoAgentAction" ADD CONSTRAINT "SeoAgentAction_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GscWeeklySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isShadowbanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shadowbanReason" TEXT,
ADD COLUMN     "shadowbannedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "automated" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlaggedContent" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlaggedContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationLog_targetType_targetId_idx" ON "ModerationLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ModerationLog_moderatorId_idx" ON "ModerationLog"("moderatorId");

-- CreateIndex
CREATE INDEX "ModerationLog_action_idx" ON "ModerationLog"("action");

-- CreateIndex
CREATE INDEX "ModerationLog_createdAt_idx" ON "ModerationLog"("createdAt");

-- CreateIndex
CREATE INDEX "FlaggedContent_status_severity_idx" ON "FlaggedContent"("status", "severity");

-- CreateIndex
CREATE INDEX "FlaggedContent_status_createdAt_idx" ON "FlaggedContent"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FlaggedContent_contentType_contentId_key" ON "FlaggedContent"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "User_isShadowbanned_idx" ON "User"("isShadowbanned");

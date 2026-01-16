-- AlterTable
ALTER TABLE "CurrentEvent" ADD COLUMN     "completionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "downvotes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hotScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tldr" TEXT,
ADD COLUMN     "upvotes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "NewsInteraction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedCollection" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "items" TEXT NOT NULL DEFAULT '[]',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsInteraction_sessionId_eventId_idx" ON "NewsInteraction"("sessionId", "eventId");

-- CreateIndex
CREATE INDEX "NewsInteraction_eventId_action_idx" ON "NewsInteraction"("eventId", "action");

-- CreateIndex
CREATE INDEX "NewsInteraction_createdAt_idx" ON "NewsInteraction"("createdAt");

-- CreateIndex
CREATE INDEX "NewsInteraction_sessionId_createdAt_idx" ON "NewsInteraction"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "NewsInteraction_sessionId_action_idx" ON "NewsInteraction"("sessionId", "action");

-- CreateIndex
CREATE INDEX "SavedCollection_sessionId_idx" ON "SavedCollection"("sessionId");

-- CreateIndex
CREATE INDEX "SavedCollection_userId_idx" ON "SavedCollection"("userId");

-- CreateIndex
CREATE INDEX "SavedCollection_isPublic_idx" ON "SavedCollection"("isPublic");

-- CreateIndex
CREATE INDEX "CurrentEvent_hotScore_idx" ON "CurrentEvent"("hotScore" DESC);

-- CreateIndex
CREATE INDEX "CurrentEvent_isPublished_hotScore_idx" ON "CurrentEvent"("isPublished", "hotScore" DESC);

-- AddForeignKey
ALTER TABLE "NewsInteraction" ADD CONSTRAINT "NewsInteraction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CurrentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedCollection" ADD CONSTRAINT "SavedCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "CurrentEvent" ADD COLUMN     "mediaType" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "videoId" TEXT;

-- CreateIndex
CREATE INDEX "CurrentEvent_mediaType_idx" ON "CurrentEvent"("mediaType");

-- CreateEnum: SourceType
CREATE TYPE "SourceType" AS ENUM ('rss', 'web_scraper', 'youtube_channel', 'youtube_playlist');

-- AlterTable: NewsSource - Add new columns
ALTER TABLE "NewsSource" ADD COLUMN "sourceType" "SourceType" NOT NULL DEFAULT 'rss';
ALTER TABLE "NewsSource" ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "NewsSource" ADD COLUMN "lastSuccessAt" TIMESTAMP(3);
ALTER TABLE "NewsSource" ADD COLUMN "consecutiveFailures" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: NewsSource - Make feedUrl optional (was required)
ALTER TABLE "NewsSource" ALTER COLUMN "feedUrl" DROP NOT NULL;

-- DataMigration: Populate config.feedUrl for existing RSS sources
UPDATE "NewsSource"
SET config = jsonb_build_object('feedUrl', "feedUrl", 'checkFrequency', "checkFrequency")
WHERE "feedUrl" IS NOT NULL AND config = '{}';

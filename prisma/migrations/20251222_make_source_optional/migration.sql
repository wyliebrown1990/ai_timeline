-- AlterTable: Make sourceId optional for manual article submissions
ALTER TABLE "IngestedArticle" ALTER COLUMN "sourceId" DROP NOT NULL;

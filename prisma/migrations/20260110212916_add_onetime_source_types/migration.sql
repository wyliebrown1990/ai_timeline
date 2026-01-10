-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SourceType" ADD VALUE 'single_url';
ALTER TYPE "SourceType" ADD VALUE 'youtube_video';

-- AlterTable
ALTER TABLE "KeyFigure" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "KeyFigureDraft" ALTER COLUMN "updatedAt" DROP DEFAULT;

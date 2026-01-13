-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "legitimateScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CommentVote" ADD COLUMN     "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspiciousReason" TEXT,
ADD COLUMN     "voterIp" TEXT;

-- CreateIndex
CREATE INDEX "CommentVote_isSuspicious_idx" ON "CommentVote"("isSuspicious");

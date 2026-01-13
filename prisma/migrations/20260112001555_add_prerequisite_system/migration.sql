-- AlterTable
ALTER TABLE "GlossaryTerm" ADD COLUMN     "conceptType" TEXT NOT NULL DEFAULT 'foundational',
ADD COLUMN     "difficulty" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "prerequisiteIds" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "prerequisiteConceptIds" TEXT NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "GlossaryTerm_difficulty_idx" ON "GlossaryTerm"("difficulty");

-- CreateIndex
CREATE INDEX "GlossaryTerm_conceptType_idx" ON "GlossaryTerm"("conceptType");

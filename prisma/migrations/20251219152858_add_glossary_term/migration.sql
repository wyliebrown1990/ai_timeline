-- CreateTable
CREATE TABLE "GlossaryTerm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "term" TEXT NOT NULL,
    "shortDefinition" TEXT NOT NULL,
    "fullDefinition" TEXT NOT NULL,
    "businessContext" TEXT,
    "example" TEXT,
    "inMeetingExample" TEXT,
    "category" TEXT NOT NULL,
    "relatedTermIds" TEXT NOT NULL DEFAULT '[]',
    "relatedMilestoneIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sourceArticleId" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryTerm_term_key" ON "GlossaryTerm"("term");

-- CreateIndex
CREATE INDEX "GlossaryTerm_term_idx" ON "GlossaryTerm"("term");

-- CreateIndex
CREATE INDEX "GlossaryTerm_category_idx" ON "GlossaryTerm"("category");

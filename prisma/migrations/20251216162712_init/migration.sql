-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "significance" INTEGER NOT NULL,
    "era" TEXT,
    "organization" TEXT,
    "contributors" TEXT NOT NULL DEFAULT '[]',
    "sourceUrl" TEXT,
    "imageUrl" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "sources" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Milestone_date_idx" ON "Milestone"("date");

-- CreateIndex
CREATE INDEX "Milestone_category_idx" ON "Milestone"("category");

-- CreateIndex
CREATE INDEX "Milestone_era_idx" ON "Milestone"("era");

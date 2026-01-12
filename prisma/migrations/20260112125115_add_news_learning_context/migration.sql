-- AlterTable
ALTER TABLE "CurrentEvent" ADD COLUMN     "relatedMilestoneIds" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "whyItMatters" TEXT;

-- CreateTable
CREATE TABLE "NewsEventConcept" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "mentionContext" TEXT,
    "isKeyTopic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsEventConcept_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsEventConcept_eventId_idx" ON "NewsEventConcept"("eventId");

-- CreateIndex
CREATE INDEX "NewsEventConcept_conceptId_idx" ON "NewsEventConcept"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsEventConcept_eventId_conceptId_key" ON "NewsEventConcept"("eventId", "conceptId");

-- AddForeignKey
ALTER TABLE "NewsEventConcept" ADD CONSTRAINT "NewsEventConcept_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CurrentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsEventConcept" ADD CONSTRAINT "NewsEventConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "GlossaryTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

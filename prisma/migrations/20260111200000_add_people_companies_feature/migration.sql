-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('company', 'research_lab', 'university', 'nonprofit', 'government');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "OrgType" NOT NULL DEFAULT 'company',
    "shortDescription" TEXT NOT NULL,
    "mission" TEXT,
    "history" TEXT,
    "currentFocus" TEXT,
    "currentFocusUpdatedAt" TIMESTAMP(3),
    "focusAreas" TEXT NOT NULL DEFAULT '[]',
    "products" TEXT NOT NULL DEFAULT '[]',
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "wikipediaUrl" TEXT,
    "linkedInUrl" TEXT,
    "foundedYear" INTEGER,
    "headquarters" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "aliases" TEXT NOT NULL DEFAULT '[]',
    "shortBio" TEXT NOT NULL,
    "background" TEXT,
    "careerHistory" TEXT,
    "contributions" TEXT,
    "philosophy" TEXT,
    "currentlyDoing" TEXT,
    "currentlyDoingUpdatedAt" TIMESTAMP(3),
    "fullBio" TEXT,
    "primaryOrg" TEXT,
    "previousOrgs" TEXT NOT NULL DEFAULT '[]',
    "notableFor" TEXT,
    "role" TEXT NOT NULL,
    "focusAreas" TEXT NOT NULL DEFAULT '[]',
    "currentOrgId" TEXT,
    "currentRole" TEXT,
    "imageUrl" TEXT,
    "wikipediaUrl" TEXT,
    "linkedInUrl" TEXT,
    "twitterHandle" TEXT,
    "personalWebsite" TEXT,
    "googleScholarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "sourceArticleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affiliation" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Affiliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsEventPersonMention" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "mentionType" TEXT NOT NULL DEFAULT 'mentioned',
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsEventPersonMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsEventOrgMention" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "mentionType" TEXT NOT NULL DEFAULT 'mentioned',
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsEventOrgMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonDraft" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "extractedName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "suggestedBio" TEXT,
    "suggestedOrg" TEXT,
    "suggestedRole" TEXT,
    "matchedPersonId" TEXT,
    "matchConfidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrentlyDoingDraft" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "proposedText" TEXT NOT NULL,
    "sourceArticleId" TEXT,
    "sourceEventId" TEXT,
    "changeType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CurrentlyDoingDraft_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add organizationId to Milestone
ALTER TABLE "Milestone" ADD COLUMN "organizationId" TEXT;

-- AlterTable: Make keyFigureId nullable and add personId to MilestoneContributor
ALTER TABLE "MilestoneContributor" ALTER COLUMN "keyFigureId" DROP NOT NULL;
ALTER TABLE "MilestoneContributor" ADD COLUMN "personId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_type_idx" ON "Organization"("type");
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Person_canonicalName_key" ON "Person"("canonicalName");
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");
CREATE INDEX "Person_canonicalName_idx" ON "Person"("canonicalName");
CREATE INDEX "Person_slug_idx" ON "Person"("slug");
CREATE INDEX "Person_role_idx" ON "Person"("role");
CREATE INDEX "Person_status_idx" ON "Person"("status");
CREATE INDEX "Person_currentOrgId_idx" ON "Person"("currentOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliation_personId_orgId_role_startDate_key" ON "Affiliation"("personId", "orgId", "role", "startDate");
CREATE INDEX "Affiliation_personId_idx" ON "Affiliation"("personId");
CREATE INDEX "Affiliation_orgId_idx" ON "Affiliation"("orgId");
CREATE INDEX "Affiliation_isCurrent_idx" ON "Affiliation"("isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "NewsEventPersonMention_eventId_personId_key" ON "NewsEventPersonMention"("eventId", "personId");
CREATE INDEX "NewsEventPersonMention_eventId_idx" ON "NewsEventPersonMention"("eventId");
CREATE INDEX "NewsEventPersonMention_personId_idx" ON "NewsEventPersonMention"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsEventOrgMention_eventId_orgId_key" ON "NewsEventOrgMention"("eventId", "orgId");
CREATE INDEX "NewsEventOrgMention_eventId_idx" ON "NewsEventOrgMention"("eventId");
CREATE INDEX "NewsEventOrgMention_orgId_idx" ON "NewsEventOrgMention"("orgId");

-- CreateIndex
CREATE INDEX "PersonDraft_status_idx" ON "PersonDraft"("status");
CREATE INDEX "PersonDraft_articleId_idx" ON "PersonDraft"("articleId");
CREATE INDEX "PersonDraft_matchedPersonId_idx" ON "PersonDraft"("matchedPersonId");

-- CreateIndex
CREATE INDEX "CurrentlyDoingDraft_personId_idx" ON "CurrentlyDoingDraft"("personId");
CREATE INDEX "CurrentlyDoingDraft_status_idx" ON "CurrentlyDoingDraft"("status");

-- CreateIndex
CREATE INDEX "Milestone_organizationId_idx" ON "Milestone"("organizationId");

-- CreateIndex for MilestoneContributor personId
CREATE UNIQUE INDEX "MilestoneContributor_milestoneId_personId_key" ON "MilestoneContributor"("milestoneId", "personId");
CREATE INDEX "MilestoneContributor_personId_idx" ON "MilestoneContributor"("personId");

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_currentOrgId_fkey" FOREIGN KEY ("currentOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affiliation" ADD CONSTRAINT "Affiliation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Affiliation" ADD CONSTRAINT "Affiliation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsEventPersonMention" ADD CONSTRAINT "NewsEventPersonMention_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CurrentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsEventPersonMention" ADD CONSTRAINT "NewsEventPersonMention_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsEventOrgMention" ADD CONSTRAINT "NewsEventOrgMention_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CurrentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsEventOrgMention" ADD CONSTRAINT "NewsEventOrgMention_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonDraft" ADD CONSTRAINT "PersonDraft_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "IngestedArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonDraft" ADD CONSTRAINT "PersonDraft_matchedPersonId_fkey" FOREIGN KEY ("matchedPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneContributor" ADD CONSTRAINT "MilestoneContributor_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

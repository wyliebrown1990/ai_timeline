/**
 * Entity Linker Service
 * Sprint KPC-4 - AI Entity Detection & Auto-Linking
 *
 * Processes extracted entities from articles and:
 * - Links high-confidence matches to existing records
 * - Creates drafts for new entities
 * - Queues career change updates for review
 */

import { prisma } from '../db';
import { matchPerson, matchOrganization } from './entityMatcher';
import type { ExtractedPerson, ExtractedOrganization } from './ingestion/entityExtraction';

// ============================================================================
// Types
// ============================================================================

export interface LinkingResult {
  articleId: string;
  personsLinked: number;
  personsNeedReview: number;
  personDraftsCreated: number;
  orgsLinked: number;
  orgsNeedReview: number;
  careerChangesDetected: number;
  details: LinkingDetail[];
}

export interface LinkingDetail {
  entityType: 'person' | 'organization';
  extractedName: string;
  action: 'linked' | 'draft_created' | 'queued_review' | 'skipped';
  linkedRecordId?: string;
  confidence?: number;
  reason?: string;
}

// ============================================================================
// Auto-link Thresholds
// ============================================================================

const AUTO_LINK_THRESHOLD = 0.95;
const CAREER_CHANGE_KEYWORDS = [
  'joins', 'joined', 'leaves', 'left', 'departs', 'departed',
  'hired', 'named', 'appointed', 'promoted', 'resigned',
  'steps down', 'takes over', 'new role', 'new position',
  'ceo of', 'chief', 'head of', 'director of',
];

// ============================================================================
// Main Linking Function
// ============================================================================

/**
 * Process extracted entities from an article
 * Links them to existing records or creates drafts for review
 *
 * @param articleId - The source article ID
 * @param persons - Extracted person entities
 * @param organizations - Extracted organization entities
 * @param targetEventId - Optional CurrentEvent ID to link mentions to
 */
export async function processExtractedEntities(
  articleId: string,
  persons: ExtractedPerson[],
  organizations: ExtractedOrganization[],
  targetEventId?: string
): Promise<LinkingResult> {
  const result: LinkingResult = {
    articleId,
    personsLinked: 0,
    personsNeedReview: 0,
    personDraftsCreated: 0,
    orgsLinked: 0,
    orgsNeedReview: 0,
    careerChangesDetected: 0,
    details: [],
  };

  // Process persons
  for (const person of persons) {
    const detail = await processExtractedPerson(articleId, person, targetEventId);
    result.details.push(detail);

    if (detail.action === 'linked') {
      result.personsLinked++;
    } else if (detail.action === 'draft_created') {
      result.personDraftsCreated++;
    } else if (detail.action === 'queued_review') {
      result.personsNeedReview++;
    }

    // Check for career changes
    if (person.isCareerChange && detail.linkedRecordId) {
      result.careerChangesDetected++;
      await queueCareerChangeUpdate(
        detail.linkedRecordId,
        person,
        articleId
      );
    }
  }

  // Process organizations
  for (const org of organizations) {
    const detail = await processExtractedOrganization(articleId, org, targetEventId);
    result.details.push(detail);

    if (detail.action === 'linked') {
      result.orgsLinked++;
    } else if (detail.action === 'queued_review') {
      result.orgsNeedReview++;
    }
  }

  console.log(
    `[EntityLinker] Processed ${persons.length} persons, ${organizations.length} orgs for article ${articleId}. ` +
    `Linked: ${result.personsLinked} persons, ${result.orgsLinked} orgs. ` +
    `Drafts: ${result.personDraftsCreated}. Review needed: ${result.personsNeedReview + result.orgsNeedReview}`
  );

  return result;
}

// ============================================================================
// Person Processing
// ============================================================================

/**
 * Process a single extracted person
 */
async function processExtractedPerson(
  articleId: string,
  person: ExtractedPerson,
  targetEventId?: string
): Promise<LinkingDetail> {
  const match = await matchPerson(person.name);

  if (match.matched && match.person && match.confidence >= AUTO_LINK_THRESHOLD) {
    // High confidence match - auto-link
    if (targetEventId) {
      await createPersonMention(targetEventId, match.person.id, person.mentionType, person.context);
    }

    return {
      entityType: 'person',
      extractedName: person.name,
      action: 'linked',
      linkedRecordId: match.person.id,
      confidence: match.confidence,
    };
  }

  if (match.suggestedAction === 'review' && match.candidates && match.candidates.length > 0) {
    // Has potential matches - queue for review
    await createPersonDraft(
      articleId,
      person,
      match.candidates[0].person.id,
      match.candidates[0].confidence
    );

    return {
      entityType: 'person',
      extractedName: person.name,
      action: 'queued_review',
      confidence: match.candidates[0].confidence,
      reason: `Possible match: ${match.candidates[0].person.canonicalName}`,
    };
  }

  // No match - create draft for new person
  await createPersonDraft(articleId, person);

  return {
    entityType: 'person',
    extractedName: person.name,
    action: 'draft_created',
  };
}

/**
 * Create a PersonDraft record
 */
async function createPersonDraft(
  articleId: string,
  person: ExtractedPerson,
  matchedPersonId?: string,
  matchConfidence?: number
): Promise<void> {
  // Check for existing draft with same name for this article
  const existing = await prisma.personDraft.findFirst({
    where: {
      articleId,
      normalizedName: { equals: person.name.trim(), mode: 'insensitive' },
    },
  });

  if (existing) {
    console.log(`[EntityLinker] Skipping duplicate draft for: ${person.name}`);
    return;
  }

  await prisma.personDraft.create({
    data: {
      articleId,
      extractedName: person.name,
      normalizedName: person.name.trim(),
      context: person.context.substring(0, 500),
      suggestedOrg: person.organization || null,
      suggestedRole: person.role || null,
      matchedPersonId: matchedPersonId || null,
      matchConfidence: matchConfidence || null,
      status: 'pending',
    },
  });
}

/**
 * Create a NewsEventPersonMention linking a person to an event
 */
async function createPersonMention(
  eventId: string,
  personId: string,
  mentionType: 'subject' | 'quoted' | 'mentioned',
  context?: string
): Promise<void> {
  // Check for existing mention
  const existing = await prisma.newsEventPersonMention.findUnique({
    where: {
      eventId_personId: { eventId, personId },
    },
  });

  if (existing) {
    console.log(`[EntityLinker] Person mention already exists: ${personId} -> ${eventId}`);
    return;
  }

  await prisma.newsEventPersonMention.create({
    data: {
      eventId,
      personId,
      mentionType,
      context: context?.substring(0, 500),
    },
  });

  console.log(`[EntityLinker] Created person mention: ${personId} -> ${eventId} (${mentionType})`);
}

// ============================================================================
// Organization Processing
// ============================================================================

/**
 * Process a single extracted organization
 */
async function processExtractedOrganization(
  articleId: string,
  org: ExtractedOrganization,
  targetEventId?: string
): Promise<LinkingDetail> {
  const match = await matchOrganization(org.name);

  if (match.matched && match.organization && match.confidence >= AUTO_LINK_THRESHOLD) {
    // High confidence match - auto-link
    if (targetEventId) {
      await createOrgMention(targetEventId, match.organization.id, org.mentionType, org.context);
    }

    return {
      entityType: 'organization',
      extractedName: org.name,
      action: 'linked',
      linkedRecordId: match.organization.id,
      confidence: match.confidence,
    };
  }

  if (match.candidates && match.candidates.length > 0) {
    // Has potential matches - queue for review
    // Note: OrganizationDraft model is not yet implemented
    // For now, just log and mark as needs review
    console.log(
      `[EntityLinker] Org needs review: ${org.name} ` +
      `(possible match: ${match.candidates[0].organization.name} @ ${match.candidates[0].confidence.toFixed(2)})`
    );

    return {
      entityType: 'organization',
      extractedName: org.name,
      action: 'queued_review',
      confidence: match.candidates[0].confidence,
      reason: `Possible match: ${match.candidates[0].organization.name}`,
    };
  }

  // No match - would create draft (OrganizationDraft not yet implemented)
  console.log(`[EntityLinker] New org detected (draft not created): ${org.name}`);

  return {
    entityType: 'organization',
    extractedName: org.name,
    action: 'skipped',
    reason: 'OrganizationDraft model not yet implemented',
  };
}

/**
 * Create a NewsEventOrgMention linking an organization to an event
 */
async function createOrgMention(
  eventId: string,
  orgId: string,
  mentionType: 'subject' | 'announcement' | 'mentioned',
  context?: string
): Promise<void> {
  // Check for existing mention
  const existing = await prisma.newsEventOrgMention.findUnique({
    where: {
      eventId_orgId: { eventId, orgId },
    },
  });

  if (existing) {
    console.log(`[EntityLinker] Org mention already exists: ${orgId} -> ${eventId}`);
    return;
  }

  await prisma.newsEventOrgMention.create({
    data: {
      eventId,
      orgId,
      mentionType,
      context: context?.substring(0, 500),
    },
  });

  console.log(`[EntityLinker] Created org mention: ${orgId} -> ${eventId} (${mentionType})`);
}

// ============================================================================
// Career Change Detection
// ============================================================================

/**
 * Queue a "Currently Doing" update for review
 */
async function queueCareerChangeUpdate(
  personId: string,
  extractedInfo: ExtractedPerson,
  articleId: string
): Promise<void> {
  // Check if this is actually a career change by analyzing context
  const contextLower = extractedInfo.context.toLowerCase();
  const isCareerChange = CAREER_CHANGE_KEYWORDS.some((keyword) =>
    contextLower.includes(keyword)
  );

  if (!isCareerChange && !extractedInfo.isCareerChange) {
    return;
  }

  // Check for existing pending update for this person
  const existingUpdate = await prisma.currentlyDoingDraft.findFirst({
    where: {
      personId,
      status: 'pending',
    },
  });

  if (existingUpdate) {
    console.log(`[EntityLinker] Career change update already pending for person ${personId}`);
    return;
  }

  // Generate proposed text
  let proposedText = '';
  if (extractedInfo.role && extractedInfo.organization) {
    proposedText = `${extractedInfo.role} at ${extractedInfo.organization}`;
  } else if (extractedInfo.organization) {
    proposedText = `Working at ${extractedInfo.organization}`;
  } else {
    proposedText = extractedInfo.context.substring(0, 200);
  }

  // Determine change type
  const changeType = extractedInfo.isCareerChange ? 'career' : 'announcement';

  // Create the draft
  await prisma.currentlyDoingDraft.create({
    data: {
      personId,
      proposedText,
      sourceArticleId: articleId,
      changeType,
      confidence: 0.7, // Default confidence, can be refined with AI
      status: 'pending',
    },
  });

  console.log(`[EntityLinker] Queued career change update for person ${personId}: "${proposedText}"`);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get pending person drafts for an article
 */
export async function getPendingPersonDrafts(articleId: string): Promise<number> {
  return prisma.personDraft.count({
    where: {
      articleId,
      status: 'pending',
    },
  });
}

/**
 * Get pending career change drafts for a person
 */
export async function getPendingCareerChanges(personId: string): Promise<number> {
  return prisma.currentlyDoingDraft.count({
    where: {
      personId,
      status: 'pending',
    },
  });
}

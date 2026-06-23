import { prisma } from '../../db';
import { updatePost } from '../blogAdmin';
import type { SeoProposalLinkInventoryItem } from './briefGenerator';
import { discoverEditorialEntityInventory } from './editorialEntityDiscovery';
import { countPreviewEntityLinks, enforceEditorialEntityLinks, scorePreviewEntityMix } from './editorialEntityLinker';

export interface BackfillBlogEntityLinksOptions {
  publishedAfter?: string;
  dryRun?: boolean;
  limit?: number;
}

export interface BackfillBlogEntityLinksItem {
  slug: string;
  beforePreviewLinks: number;
  afterPreviewLinks: number;
  beforeMixScore?: number;
  afterMixScore?: number;
  updated: boolean;
  reason?: string;
  relationsCount?: number;
}

export interface BackfillBlogEntityLinksSummary {
  publishedAfter: string;
  dryRun: boolean;
  scannedCount: number;
  updatedCount: number;
  skippedCount: number;
  items: BackfillBlogEntityLinksItem[];
}

const DEFAULT_PUBLISHED_AFTER = '2026-05-05';
const ENTITY_SHORTCODE_PATTERN = /\[\[(person|organization|glossary|event):([a-zA-Z0-9_-]+)\|([^\]]+)\]\]/g;
const SIMPLE_ENTITY_SHORTCODE_PATTERN = /\[\[(person|organization|glossary|event):([a-zA-Z0-9_-]+)\|([^\[\]]+)\]\]/g;
const ENTITY_MARKDOWN_LINK_WITH_LABEL_PATTERN = /\[([^\]]+)\]\(((?:https:\/\/letaiexplainai\.com)?\/(?:people|organizations|glossary|events)\/[^)]+)\)/g;
const ATLAS_CONNECTIONS_SECTION_PATTERN = /\n##\s+Atlas connections\b[\s\S]*?(?=\n##\s+|\s*$)/gi;
const ENTITY_LABEL_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'this',
  'to',
  'with',
]);

function isSuspiciousEntityLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return true;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return true;
  if (ENTITY_LABEL_STOPWORDS.has(normalized)) return true;
  if (normalized.length <= 2 && !/^[A-Z0-9]{2,5}$/.test(trimmed)) return true;

  return false;
}

function stripPreviewEntityMarkup(markdown: string): string {
  let stripped = markdown.replace(ATLAS_CONNECTIONS_SECTION_PATTERN, '');

  while (true) {
    const next = stripped.replace(
      SIMPLE_ENTITY_SHORTCODE_PATTERN,
      (_match, _entityType: string, _entityTarget: string, label: string) => label,
    );
    if (next === stripped) break;
    stripped = next;
  }

  stripped = stripped.replace(
    ENTITY_SHORTCODE_PATTERN,
    (match, _entityType: string, _entityTarget: string, label: string) => (
      isSuspiciousEntityLabel(label) ? label : match
    ),
  );

  return stripped.replace(
    ENTITY_MARKDOWN_LINK_WITH_LABEL_PATTERN,
    (_match, label: string) => label,
  );
}

async function loadExistingRelationInventory(
  relations: Array<{ entityType: string; entityId: string }>,
): Promise<SeoProposalLinkInventoryItem[]> {
  const glossaryIds = relations
    .filter((relation) => relation.entityType === 'glossary_term')
    .map((relation) => relation.entityId);
  const personIds = relations
    .filter((relation) => relation.entityType === 'person')
    .map((relation) => relation.entityId);
  const organizationIds = relations
    .filter((relation) => relation.entityType === 'organization')
    .map((relation) => relation.entityId);
  const milestoneIds = relations
    .filter((relation) => relation.entityType === 'milestone')
    .map((relation) => relation.entityId);

  const [glossaryTerms, persons, organizations, milestones] = await Promise.all([
    glossaryIds.length > 0
      ? prisma.glossaryTerm.findMany({
          where: {
            OR: [
              { id: { in: glossaryIds } },
              { slug: { in: glossaryIds } },
            ],
          },
          select: {
            id: true,
            term: true,
            slug: true,
          },
        })
      : Promise.resolve([]),
    personIds.length > 0
      ? prisma.person.findMany({
          where: {
            OR: [
              { id: { in: personIds } },
              { slug: { in: personIds } },
            ],
          },
          select: {
            id: true,
            canonicalName: true,
            slug: true,
          },
        })
      : Promise.resolve([]),
    organizationIds.length > 0
      ? prisma.organization.findMany({
          where: {
            OR: [
              { id: { in: organizationIds } },
              { slug: { in: organizationIds } },
            ],
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        })
      : Promise.resolve([]),
    milestoneIds.length > 0
      ? prisma.milestone.findMany({
          where: { id: { in: milestoneIds } },
          select: {
            id: true,
            title: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return [
    ...glossaryTerms.map((term) => ({
      entityType: 'glossary_term' as const,
      id: term.id,
      label: term.term,
      path: `/glossary/${term.slug}`,
      reason: 'Existing published relation on this post.',
    })),
    ...persons.map((person) => ({
      entityType: 'person' as const,
      id: person.id,
      label: person.canonicalName,
      path: `/people/${person.slug}`,
      reason: 'Existing published relation on this post.',
    })),
    ...organizations.map((organization) => ({
      entityType: 'organization' as const,
      id: organization.id,
      label: organization.name,
      path: `/organizations/${organization.slug}`,
      reason: 'Existing published relation on this post.',
    })),
    ...milestones.map((milestone) => ({
      entityType: 'milestone' as const,
      id: milestone.id,
      label: milestone.title,
      path: `/events/${milestone.id}`,
      reason: 'Existing published relation on this post.',
    })),
  ];
}

function relationSignature(
  relations: Array<{ entityType: string; entityId: string; relationLabel?: string | null }>,
): string {
  return JSON.stringify(
    relations
      .map((relation) => ({
        entityType: relation.entityType,
        entityId: relation.entityId,
        relationLabel: relation.relationLabel ?? null,
      }))
      .sort((a, b) => `${a.entityType}:${a.entityId}`.localeCompare(`${b.entityType}:${b.entityId}`)),
  );
}

export async function backfillBlogEntityLinks(
  options: BackfillBlogEntityLinksOptions = {},
): Promise<BackfillBlogEntityLinksSummary> {
  const publishedAfter = options.publishedAfter ?? DEFAULT_PUBLISHED_AFTER;
  const dryRun = options.dryRun ?? false;
  const limit = options.limit ?? 20;

  const posts = await prisma.blogPost.findMany({
    where: {
      status: 'published',
      publishedAt: {
        gte: new Date(`${publishedAfter}T00:00:00.000Z`),
      },
    },
    include: {
      relations: true,
    },
    orderBy: {
      publishedAt: 'desc',
    },
    take: limit,
  });

  const items: BackfillBlogEntityLinksItem[] = [];
  let updatedCount = 0;

  for (const post of posts) {
    const beforePreviewLinks = countPreviewEntityLinks(post.bodyMarkdown);
    const cleanedBodyMarkdown = stripPreviewEntityMarkup(post.bodyMarkdown);
    const relationInventory = await loadExistingRelationInventory(post.relations);
    const discoveredInventory = await discoverEditorialEntityInventory({
      title: post.title,
      bodyMarkdown: cleanedBodyMarkdown,
      baseInventory: relationInventory,
    });
    const beforeMixScore = scorePreviewEntityMix(post.bodyMarkdown, discoveredInventory);
    const minimumPreviewLinks = Math.max(3, Math.min(6, discoveredInventory.length));
    const enriched = enforceEditorialEntityLinks({
      bodyMarkdown: cleanedBodyMarkdown,
      linkInventory: discoveredInventory,
      relations: post.relations.map((relation) => ({
        entityType: relation.entityType,
        entityId: relation.entityId,
        relationLabel: relation.relationLabel ?? undefined,
      })),
      minimumPreviewLinks,
    });
    const afterPreviewLinks = countPreviewEntityLinks(enriched.bodyMarkdown);
    const afterMixScore = scorePreviewEntityMix(enriched.bodyMarkdown, discoveredInventory);
    const relationsChanged =
      relationSignature(enriched.relations)
      !== relationSignature(post.relations.map((relation) => ({
        entityType: relation.entityType,
        entityId: relation.entityId,
        relationLabel: relation.relationLabel ?? undefined,
      })));
    const bodyChanged = enriched.bodyMarkdown !== post.bodyMarkdown;
    const improved = (bodyChanged || relationsChanged) && (
      afterMixScore > beforeMixScore
      || (afterMixScore === beforeMixScore && afterPreviewLinks > beforePreviewLinks)
    );

    if (!improved) {
      items.push({
        slug: post.slug,
        beforePreviewLinks,
        afterPreviewLinks,
        beforeMixScore,
        afterMixScore,
        updated: false,
        reason: 'No richer entity coverage available for this post body.',
        relationsCount: enriched.relations.length,
      });
      continue;
    }

    if (!dryRun) {
      await updatePost(post.id, {
        bodyMarkdown: enriched.bodyMarkdown,
        relations: enriched.relations,
      });
    }

    updatedCount += 1;
    items.push({
      slug: post.slug,
      beforePreviewLinks,
      afterPreviewLinks,
      beforeMixScore,
      afterMixScore,
      updated: true,
      relationsCount: enriched.relations.length,
      reason: afterPreviewLinks >= beforePreviewLinks
        ? undefined
        : 'Improved entity-link quality even though the total preview-link count dropped.',
    });
  }

  return {
    publishedAfter,
    dryRun,
    scannedCount: posts.length,
    updatedCount,
    skippedCount: posts.length - updatedCount,
    items,
  };
}

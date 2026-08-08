import { prisma } from '../db';

const SITE_ORIGINS = ['https://letaiexplainai.com', 'https://www.letaiexplainai.com'];
const ENTITY_SHORTCODE_PATTERN = /\[\[(person|organization|glossary|event):([a-zA-Z0-9_-]+)\|([^\]]+)\]\]/g;
const ENTITY_MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(((?:https:\/\/(?:www\.)?letaiexplainai\.com)?\/(people|organizations|glossary|events|subjects)\/([^/?#)\s]+)(?:[?#][^)]*)?)\)/g;

export type RoutableBlogEntityType =
  | 'person'
  | 'organization'
  | 'glossary_term'
  | 'milestone'
  | 'subject';

export interface BlogEntityRelationInput {
  entityType: string;
  entityId: string;
}

export interface BlogEntityTarget {
  entityType: RoutableBlogEntityType;
  target: string;
  path: string;
  label: string;
  sources: Array<'shortcode' | 'markdown' | 'relation'>;
}

export interface InvalidBlogEntityTarget extends BlogEntityTarget {
  reason: 'not_publicly_routable';
}

export interface BlogEntityLinkValidationResult {
  valid: boolean;
  targets: BlogEntityTarget[];
  invalidTargets: InvalidBlogEntityTarget[];
  unsupportedRelationTypes: string[];
}

function shortcodeEntityType(type: string): RoutableBlogEntityType {
  if (type === 'glossary') return 'glossary_term';
  if (type === 'event') return 'milestone';
  return type as 'person' | 'organization';
}

function pathEntityType(segment: string): RoutableBlogEntityType {
  if (segment === 'glossary') return 'glossary_term';
  if (segment === 'events') return 'milestone';
  if (segment === 'people') return 'person';
  if (segment === 'organizations') return 'organization';
  return 'subject';
}

function entityPath(entityType: RoutableBlogEntityType, target: string): string {
  switch (entityType) {
    case 'person':
      return `/people/${target}`;
    case 'organization':
      return `/organizations/${target}`;
    case 'glossary_term':
      return `/glossary/${target}`;
    case 'milestone':
      return `/events/${target}`;
    case 'subject':
      return `/subjects/${target}`;
  }
}

function normalizePath(path: string): string {
  let normalized = path;
  for (const origin of SITE_ORIGINS) {
    if (normalized.startsWith(origin)) {
      normalized = normalized.slice(origin.length);
      break;
    }
  }
  return normalized.split(/[?#]/, 1)[0];
}

function supportedRelationType(value: string): value is RoutableBlogEntityType {
  return value === 'person'
    || value === 'organization'
    || value === 'glossary_term'
    || value === 'milestone';
}

export function extractBlogEntityTargets(
  bodyMarkdown: string,
  relations: BlogEntityRelationInput[] = [],
): { targets: BlogEntityTarget[]; unsupportedRelationTypes: string[] } {
  const targets = new Map<string, BlogEntityTarget>();
  const unsupportedRelationTypes = new Set<string>();

  function addTarget(input: Omit<BlogEntityTarget, 'sources'> & { source: BlogEntityTarget['sources'][number] }): void {
    const key = `${input.entityType}:${input.target}`;
    const existing = targets.get(key);
    if (existing) {
      if (!existing.sources.includes(input.source)) existing.sources.push(input.source);
      return;
    }
    targets.set(key, {
      entityType: input.entityType,
      target: input.target,
      path: input.path,
      label: input.label,
      sources: [input.source],
    });
  }

  for (const match of bodyMarkdown.matchAll(ENTITY_SHORTCODE_PATTERN)) {
    const entityType = shortcodeEntityType(match[1]);
    const target = match[2];
    addTarget({
      entityType,
      target,
      path: entityPath(entityType, target),
      label: match[3].trim(),
      source: 'shortcode',
    });
  }

  for (const match of bodyMarkdown.matchAll(ENTITY_MARKDOWN_LINK_PATTERN)) {
    const entityType = pathEntityType(match[3]);
    const target = match[4];
    addTarget({
      entityType,
      target,
      path: normalizePath(match[2]),
      label: match[1].trim(),
      source: 'markdown',
    });
  }

  for (const relation of relations) {
    if (!supportedRelationType(relation.entityType)) {
      unsupportedRelationTypes.add(relation.entityType);
      continue;
    }
    addTarget({
      entityType: relation.entityType,
      target: relation.entityId,
      path: entityPath(relation.entityType, relation.entityId),
      label: relation.entityId,
      source: 'relation',
    });
  }

  return {
    targets: [...targets.values()],
    unsupportedRelationTypes: [...unsupportedRelationTypes].sort(),
  };
}

export async function validateBlogEntityLinks(
  bodyMarkdown: string,
  relations: BlogEntityRelationInput[] = [],
): Promise<BlogEntityLinkValidationResult> {
  const extracted = extractBlogEntityTargets(bodyMarkdown, relations);
  const byType = (entityType: RoutableBlogEntityType) => extracted.targets
    .filter((target) => target.entityType === entityType)
    .map((target) => target.target);

  const personTargets = byType('person');
  const organizationTargets = byType('organization');
  const glossaryTargets = byType('glossary_term');
  const milestoneIds = byType('milestone');
  const subjectTargets = byType('subject');

  const [persons, organizations, glossaryTerms, milestones, subjects] = await Promise.all([
    personTargets.length > 0
      ? prisma.person.findMany({
          where: {
            OR: [{ slug: { in: personTargets } }, { id: { in: personTargets } }],
            status: 'published',
          },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
    organizationTargets.length > 0
      ? prisma.organization.findMany({
          where: {
            OR: [{ slug: { in: organizationTargets } }, { id: { in: organizationTargets } }],
            status: 'published',
          },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
    glossaryTargets.length > 0
      ? prisma.glossaryTerm.findMany({
          where: { OR: [{ slug: { in: glossaryTargets } }, { id: { in: glossaryTargets } }] },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
    milestoneIds.length > 0
      ? prisma.milestone.findMany({
          where: { id: { in: milestoneIds } },
          select: { id: true },
        })
      : Promise.resolve([]),
    subjectTargets.length > 0
      ? prisma.subject.findMany({
          where: { OR: [{ slug: { in: subjectTargets } }, { id: { in: subjectTargets } }] },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
  ]);

  // Visible shortcodes and markdown links must resolve by the exact identifier
  // encoded in their public route. Relation metadata is older and mixed: some
  // posts store a canonical slug while others store the database ID. Accept
  // either representation for relation-only targets without letting an ID pass
  // as a visible /people, /organizations, /glossary, or /subjects route.
  const publiclyRoutableKeys = new Set<string>([
    ...persons.map((row) => `person:${row.slug}`),
    ...organizations.map((row) => `organization:${row.slug}`),
    ...glossaryTerms.flatMap((row) => row.slug ? [`glossary_term:${row.slug}`] : []),
    ...milestones.map((row) => `milestone:${row.id}`),
    ...subjects.map((row) => `subject:${row.slug}`),
  ]);
  const validRelationKeys = new Set<string>([
    ...persons.flatMap((row) => [`person:${row.id}`, `person:${row.slug}`]),
    ...organizations.flatMap((row) => [`organization:${row.id}`, `organization:${row.slug}`]),
    ...glossaryTerms.flatMap((row) => [
      `glossary_term:${row.id}`,
      ...(row.slug ? [`glossary_term:${row.slug}`] : []),
    ]),
    ...milestones.map((row) => `milestone:${row.id}`),
    ...subjects.flatMap((row) => [`subject:${row.id}`, `subject:${row.slug}`]),
  ]);

  const invalidTargets = extracted.targets
    .filter((target) => {
      const key = `${target.entityType}:${target.target}`;
      const hasVisibleLink = target.sources.some((source) => source !== 'relation');
      return hasVisibleLink
        ? !publiclyRoutableKeys.has(key)
        : !validRelationKeys.has(key);
    })
    .map((target): InvalidBlogEntityTarget => ({
      ...target,
      reason: 'not_publicly_routable',
    }));

  return {
    valid: invalidTargets.length === 0 && extracted.unsupportedRelationTypes.length === 0,
    targets: extracted.targets,
    invalidTargets,
    unsupportedRelationTypes: extracted.unsupportedRelationTypes,
  };
}

import { prisma } from '../../db';
import { ApiError } from '../../middleware/error';
import { search as searchGlossaryTerms } from '../glossary';
import { search as searchMilestones } from '../milestones';
import { search as searchOrganizations } from '../organizations';
import { search as searchPersons } from '../persons';
import { matchOrganization, matchPerson } from '../entityMatcher';
import { getClusterDetail, type ClusterOpportunityDetail } from '../gsc/queryClusterer';

const MAX_LINK_OPPORTUNITIES = 5;
const GENERIC_PATHS = new Set([
  '/',
  '/blog',
  '/compare',
  '/events',
  '/explained',
  '/glossary',
  '/news',
  '/people',
  '/subjects',
  '/timeline',
  '/who-invented',
]);

export type SeoTopicPodMoveType =
  | 'optimize_current'
  | 'create_new'
  | 'expand_existing'
  | 'internal_link_only';

export interface SeoTopicPodDestination {
  type: 'existing_page' | 'entity_page' | 'new_blog_post';
  label: string;
  path: string;
  exists: boolean;
  reason: string;
}

export interface SeoTopicPodCompanionAsset {
  type: 'supporting_explainer' | 'faq_expansion' | 'internal_link_pass' | 'entity_support';
  label: string;
  path: string | null;
  status: 'existing' | 'proposed';
  reason: string;
}

export interface SeoTopicPodLinkOpportunity {
  entityType: 'person' | 'organization' | 'glossary_term' | 'milestone' | 'blog_post';
  label: string;
  path: string;
  reason: string;
}

export interface SeoTopicPodPlan {
  keyword: string;
  sourceType: 'cluster_snapshot';
  sourceId: string;
  sourceLabel: string;
  primaryPage: string;
  moveType: SeoTopicPodMoveType;
  hypothesis: string;
  canonicalDestination: SeoTopicPodDestination;
  companionAssets: SeoTopicPodCompanionAsset[];
  internalLinkOpportunities: SeoTopicPodLinkOpportunity[];
}

interface ExactMatchDestination {
  type: SeoTopicPodDestination['type'];
  label: string;
  path: string;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function titleCaseFromSlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizePathname(pageUrl: string): string {
  try {
    const pathname = new URL(pageUrl).pathname || '/';
    return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  } catch {
    return pageUrl.endsWith('/') && pageUrl !== '/' ? pageUrl.slice(0, -1) : pageUrl;
  }
}

function deriveKeywordFromRepresentativeQuery(query: string): string {
  const normalized = normalizeWhitespace(
    query
      .replace(/["“”]/g, ' ')
      .replace(/\b(quiz|quizzes|trivia|test|tests|question|questions)\b/gi, ' ')
  );

  return normalized.length > 0 ? normalized : query;
}

function isGenericPath(pathname: string): boolean {
  return GENERIC_PATHS.has(pathname);
}

function buildNewBlogDestination(keyword: string): SeoTopicPodDestination {
  const slug = slugify(keyword) || 'ai-history';
  return {
    type: 'new_blog_post',
    label: `New blog explainer: ${titleCaseFromSlug(slug)}`,
    path: `/blog/${slug}`,
    exists: false,
    reason: 'No stronger canonical page exists yet, so the next best move is a dedicated explainer page.',
  };
}

function buildHypothesis(
  keyword: string,
  primaryPath: string,
  moveType: SeoTopicPodMoveType,
  memberQueryCount: number
): string {
  if (moveType === 'optimize_current') {
    return `Tightening ${primaryPath} around the clustered theme "${keyword}" should convert the ${memberQueryCount} visible query variants into clearer intent-match and stronger clicks.`;
  }

  if (moveType === 'expand_existing') {
    return `Expanding the existing canonical page for "${keyword}" should capture the clustered demand without splitting authority across another thin asset.`;
  }

  if (moveType === 'internal_link_only') {
    return `The site likely already has the right canonical destination for "${keyword}", so the growth lever is stronger internal-link routing rather than a fresh page.`;
  }

  return `A dedicated page for "${keyword}" should outperform the current generic destination ${primaryPath} because the cluster shows consistent intent across several close query variants.`;
}

async function findExactDestination(keyword: string): Promise<ExactMatchDestination | null> {
  const slug = slugify(keyword);
  const [glossaryTerm, milestone, personMatch, organizationMatch, blogPost] = await Promise.all([
    prisma.glossaryTerm.findFirst({
      where: {
        OR: [
          { term: { equals: keyword, mode: 'insensitive' } },
          ...(slug ? [{ slug: { equals: slug, mode: 'insensitive' } }] : []),
        ],
      },
      select: {
        term: true,
        slug: true,
      },
    }),
    prisma.milestone.findFirst({
      where: {
        title: { equals: keyword, mode: 'insensitive' },
      },
      select: {
        id: true,
        title: true,
      },
    }),
    matchPerson(keyword),
    matchOrganization(keyword),
    prisma.blogPost.findFirst({
      where: {
        status: 'published',
        OR: [
          { title: { equals: keyword, mode: 'insensitive' } },
          ...(slug ? [{ slug: { equals: slug, mode: 'insensitive' } }] : []),
        ],
      },
      select: {
        title: true,
        slug: true,
      },
    }),
  ]);

  if (glossaryTerm) {
    return {
      type: 'entity_page',
      label: glossaryTerm.term,
      path: `/glossary/${glossaryTerm.slug ?? slug}`,
    };
  }

  if (milestone) {
    return {
      type: 'entity_page',
      label: milestone.title,
      path: `/events/${milestone.id}`,
    };
  }

  if (personMatch.matched && personMatch.person) {
    return {
      type: 'entity_page',
      label: personMatch.person.canonicalName,
      path: `/people/${personMatch.person.slug}`,
    };
  }

  if (organizationMatch.matched && organizationMatch.organization) {
    return {
      type: 'entity_page',
      label: organizationMatch.organization.name,
      path: `/organizations/${organizationMatch.organization.slug}`,
    };
  }

  if (blogPost) {
    return {
      type: 'existing_page',
      label: blogPost.title,
      path: `/blog/${blogPost.slug}`,
    };
  }

  return null;
}

async function loadInternalLinkOpportunities(keyword: string): Promise<SeoTopicPodLinkOpportunity[]> {
  const [persons, organizations, glossaryTerms, milestones, blogPosts] = await Promise.all([
    searchPersons(keyword, MAX_LINK_OPPORTUNITIES),
    searchOrganizations(keyword, MAX_LINK_OPPORTUNITIES),
    searchGlossaryTerms(keyword, MAX_LINK_OPPORTUNITIES),
    searchMilestones({ query: keyword, skip: 0, limit: MAX_LINK_OPPORTUNITIES }),
    prisma.blogPost.findMany({
      where: {
        status: 'published',
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { excerpt: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      select: {
        title: true,
        slug: true,
      },
      take: MAX_LINK_OPPORTUNITIES,
      orderBy: {
        publishedAt: 'desc',
      },
    }),
  ]);

  const items: SeoTopicPodLinkOpportunity[] = [];
  const seen = new Set<string>();

  function push(item: SeoTopicPodLinkOpportunity) {
    const key = `${item.entityType}:${item.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push(item);
    }
  }

  for (const person of persons) {
    push({
      entityType: 'person',
      label: person.canonicalName,
      path: `/people/${person.slug}`,
      reason: 'Related published person page that can route relevance into the cluster target.',
    });
  }

  for (const organization of organizations) {
    push({
      entityType: 'organization',
      label: organization.name,
      path: `/organizations/${organization.slug}`,
      reason: 'Related organization page that can reinforce the topic cluster.',
    });
  }

  for (const glossaryTerm of glossaryTerms) {
    push({
      entityType: 'glossary_term',
      label: glossaryTerm.term,
      path: `/glossary/${glossaryTerm.slug ?? slugify(glossaryTerm.term)}`,
      reason: 'Glossary coverage that can carry a first-mention link into the canonical destination.',
    });
  }

  for (const milestone of milestones.results) {
    push({
      entityType: 'milestone',
      label: milestone.title,
      path: `/events/${milestone.id}`,
      reason: 'Event page that can deepen the supporting internal-link graph.',
    });
  }

  for (const blogPost of blogPosts) {
    push({
      entityType: 'blog_post',
      label: blogPost.title,
      path: `/blog/${blogPost.slug}`,
      reason: 'Existing published blog post that can be updated with a supporting link.',
    });
  }

  return items.slice(0, MAX_LINK_OPPORTUNITIES);
}

function buildCompanionAssets(
  keyword: string,
  destination: SeoTopicPodDestination,
  primaryPath: string,
  linkOpportunities: SeoTopicPodLinkOpportunity[]
): SeoTopicPodCompanionAsset[] {
  const assets: SeoTopicPodCompanionAsset[] = [];

  if (destination.type === 'new_blog_post') {
    assets.push({
      type: 'supporting_explainer',
      label: `Publish ${keyword} explainer`,
      path: destination.path,
      status: 'proposed',
      reason: 'The cluster does not yet have a strong dedicated canonical page.',
    });
  } else if (destination.path !== primaryPath) {
    assets.push({
      type: 'entity_support',
      label: `Strengthen ${destination.path}`,
      path: destination.path,
      status: 'existing',
      reason: 'A stronger canonical page already exists and should absorb the clustered demand.',
    });
  }

  assets.push({
    type: 'faq_expansion',
    label: `Add FAQ coverage on ${destination.path}`,
    path: destination.path,
    status: destination.exists ? 'existing' : 'proposed',
    reason: 'Clustered long-tail variants usually benefit from explicit FAQ-style subheadings and internal anchors.',
  });

  if (linkOpportunities.length > 0) {
    assets.push({
      type: 'internal_link_pass',
      label: 'Run an internal-link pass',
      path: destination.path,
      status: destination.exists ? 'existing' : 'proposed',
      reason: `There are ${linkOpportunities.length} existing pages that can route relevance into the canonical target.`,
    });
  }

  return assets.slice(0, 3);
}

export async function planTopicPodForCluster(clusterId: string): Promise<SeoTopicPodPlan> {
  const cluster = await getClusterDetail(clusterId);
  if (!cluster) {
    throw ApiError.notFound('Cluster opportunity not found');
  }

  return buildTopicPodFromCluster(cluster);
}

export async function buildTopicPodFromCluster(cluster: ClusterOpportunityDetail): Promise<SeoTopicPodPlan> {
  const keyword = deriveKeywordFromRepresentativeQuery(cluster.representativeQuery);
  const primaryPath = normalizePathname(cluster.primaryPage);
  const [exactDestination, internalLinkOpportunities] = await Promise.all([
    findExactDestination(keyword),
    loadInternalLinkOpportunities(keyword),
  ]);

  let canonicalDestination: SeoTopicPodDestination;
  let moveType: SeoTopicPodMoveType;

  if (exactDestination && exactDestination.path !== primaryPath) {
    canonicalDestination = {
      ...exactDestination,
      exists: true,
      reason: `LAEA already has a stronger exact-match destination at ${exactDestination.path}.`,
    };
    moveType = 'expand_existing';
  } else if (!isGenericPath(primaryPath)) {
    canonicalDestination = {
      type: 'existing_page',
      label: primaryPath,
      path: primaryPath,
      exists: true,
      reason: 'The current landing page is specific enough to optimize instead of spawning a new asset.',
    };
    moveType = 'optimize_current';
  } else if (exactDestination) {
    canonicalDestination = {
      ...exactDestination,
      exists: true,
      reason: `An exact-match destination already exists at ${exactDestination.path}, so this is mainly an internal-link and packaging problem.`,
    };
    moveType = 'internal_link_only';
  } else {
    canonicalDestination = buildNewBlogDestination(keyword);
    moveType = 'create_new';
  }

  return {
    keyword,
    sourceType: 'cluster_snapshot',
    sourceId: cluster.id,
    sourceLabel: `${cluster.horizon} ${cluster.bucket.replace('cluster_', '').replace('_', ' ')}`,
    primaryPage: cluster.primaryPage,
    moveType,
    hypothesis: buildHypothesis(keyword, primaryPath, moveType, cluster.memberQueryCount),
    canonicalDestination,
    companionAssets: buildCompanionAssets(keyword, canonicalDestination, primaryPath, internalLinkOpportunities),
    internalLinkOpportunities,
  };
}

import { prisma } from '../../db';
import {
  getLatestFinalizedPtDate,
  isoDateStringToUtcDate,
  shiftIsoDate,
} from '../gsc/gscClient';
import { planTopicPodForCluster } from './topicPodPlanner';

const PROJECT_HOST = 'https://letaiexplainai.com';
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MIN_IMPRESSIONS = 10;
const LOOKBACK_DAYS = 90;

export type SeoPackagingSeverity = 'critical' | 'warning' | 'info';
export type SeoPackagingIssueType =
  | 'evergreen_routing'
  | 'title_link_risk'
  | 'metadata_thin'
  | 'breadcrumb_missing'
  | 'schema_gap';

export type SeoPackagingPageType =
  | 'home'
  | 'timeline'
  | 'news_index'
  | 'news_detail'
  | 'blog_post'
  | 'unknown';

export interface SeoPackagingIssueRecord {
  id: string;
  type: SeoPackagingIssueType;
  severity: SeoPackagingSeverity;
  label: string;
  details: string;
  recommendedFix: string;
}

export interface SeoPackagingEvergreenRecommendation {
  clusterId: string;
  representativeQuery: string;
  targetPath: string;
  targetLabel: string;
  moveType: 'optimize_current' | 'create_new' | 'expand_existing' | 'internal_link_only';
  rationale: string;
}

export interface SeoPackagingAuditRecord {
  id: string;
  windowStart: string;
  windowEnd: string;
  pageUrl: string;
  pagePath: string;
  pageType: SeoPackagingPageType;
  title: string | null;
  h1: string | null;
  description: string | null;
  canonicalPath: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  issueCount: number;
  criticalCount: number;
  experimentActive: boolean;
  issueTypes: SeoPackagingIssueType[];
  issues: SeoPackagingIssueRecord[];
  structuredDataTypes: string[];
  evergreenRecommendation: SeoPackagingEvergreenRecommendation | null;
}

export interface SeoPackagingAuditListResult {
  data: SeoPackagingAuditRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    windowStart: string;
    windowEnd: string;
    counts: {
      all: number;
      critical: number;
      warning: number;
      info: number;
    };
  };
}

interface AggregatedPageMetric {
  pageUrl: string;
  pagePath: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

interface EvergreenCandidate {
  pagePath: string;
  clusterId: string;
  representativeQuery: string;
  targetPath: string;
  targetLabel: string;
  moveType: 'optimize_current' | 'create_new' | 'expand_existing' | 'internal_link_only';
  rationale: string;
}

interface PageAuditContext {
  pageType: SeoPackagingPageType;
  pageUrl: string;
  pagePath: string;
  title: string | null;
  h1: string | null;
  description: string | null;
  canonicalPath: string | null;
  explicitSeoTitle: boolean;
  explicitSeoDescription: boolean;
  hasBreadcrumbs: boolean;
  structuredDataTypes: string[];
  expectedStructuredDataTypes: string[];
}

function clampLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit) || !limit || limit < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
}

function normalizePathname(pageUrl: string): string {
  try {
    const pathname = new URL(pageUrl).pathname || '/';
    return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  } catch {
    return pageUrl.endsWith('/') && pageUrl !== '/' ? pageUrl.slice(0, -1) : pageUrl;
  }
}

function encodeAuditId(pageUrl: string): string {
  return Buffer.from(pageUrl).toString('base64url');
}

function decodeAuditId(id: string): string | null {
  try {
    const decoded = Buffer.from(id, 'base64url').toString('utf8');
    return decoded.startsWith(PROJECT_HOST) ? decoded : null;
  } catch {
    return null;
  }
}

function classifyPageType(pagePath: string): SeoPackagingPageType {
  if (pagePath === '/') {
    return 'home';
  }

  if (pagePath === '/timeline') {
    return 'timeline';
  }

  if (pagePath === '/news') {
    return 'news_index';
  }

  if (pagePath.startsWith('/news/')) {
    return 'news_detail';
  }

  if (pagePath.startsWith('/blog/')) {
    return 'blog_post';
  }

  return 'unknown';
}

function severityRank(value: SeoPackagingSeverity): number {
  switch (value) {
    case 'critical':
      return 3;
    case 'warning':
      return 2;
    case 'info':
    default:
      return 1;
  }
}

function tokenize(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function hasWeakTitleAlignment(title: string | null, h1: string | null): boolean {
  const titleTokens = new Set(tokenize(title));
  const h1Tokens = tokenize(h1);
  if (titleTokens.size === 0 || h1Tokens.length === 0) {
    return false;
  }

  const overlap = h1Tokens.filter((token) => titleTokens.has(token)).length;
  return overlap / Math.max(titleTokens.size, h1Tokens.length) < 0.3;
}

function titleContainsHeading(title: string | null, h1: string | null): boolean {
  if (!title || !h1) {
    return false;
  }

  return title.toLowerCase().includes(h1.toLowerCase());
}

function buildIssue(
  type: SeoPackagingIssueType,
  severity: SeoPackagingSeverity,
  label: string,
  details: string,
  recommendedFix: string
): SeoPackagingIssueRecord {
  return {
    id: `${type}:${label}`,
    type,
    severity,
    label,
    details,
    recommendedFix,
  };
}

async function loadEvergreenCandidates(windowEnd: string): Promise<Map<string, EvergreenCandidate>> {
  const rows = await prisma.gscClusterSnapshot.findMany({
    where: {
      horizon: '90d',
      windowEnd: isoDateStringToUtcDate(windowEnd),
      bucket: 'cluster_content_gap',
      status: 'open',
    },
    select: {
      id: true,
      primaryPage: true,
      representativeQuery: true,
    },
  });

  const candidates = new Map<string, EvergreenCandidate>();

  for (const row of rows) {
    const pagePath = normalizePathname(row.primaryPage);
    if (pagePath !== '/news' && !pagePath.startsWith('/news/')) {
      continue;
    }

    const topicPod = await planTopicPodForCluster(row.id);
    candidates.set(pagePath, {
      pagePath,
      clusterId: row.id,
      representativeQuery: row.representativeQuery,
      targetPath: topicPod.canonicalDestination.path,
      targetLabel: topicPod.canonicalDestination.label,
      moveType: topicPod.moveType,
      rationale: topicPod.hypothesis,
    });
  }

  return candidates;
}

async function loadActiveExperimentPaths(): Promise<Set<string>> {
  const rows = await prisma.seoExperiment.findMany({
    where: {
      status: {
        in: ['planned', 'running'],
      },
    },
    select: {
      targetUrl: true,
    },
  });

  return new Set(rows.map((row) => normalizePathname(row.targetUrl)));
}

async function aggregatePageMetrics(windowStart: string, windowEnd: string): Promise<AggregatedPageMetric[]> {
  const rows = await prisma.gscDailyMetric.findMany({
    where: {
      dataSource: 'page_aggregate',
      date: {
        gte: isoDateStringToUtcDate(windowStart),
        lte: isoDateStringToUtcDate(windowEnd),
      },
    },
    select: {
      page: true,
      clicks: true,
      impressions: true,
      position: true,
    },
  });

  const accumulator = new Map<string, { clicks: number; impressions: number; weightedPosition: number }>();

  for (const row of rows) {
    if (!row.page || row.impressions < 1) {
      continue;
    }

    const current = accumulator.get(row.page) ?? {
      clicks: 0,
      impressions: 0,
      weightedPosition: 0,
    };

    current.clicks += row.clicks;
    current.impressions += row.impressions;
    current.weightedPosition += row.position * row.impressions;
    accumulator.set(row.page, current);
  }

  return Array.from(accumulator.entries())
    .map(([pageUrl, value]) => ({
      pageUrl,
      pagePath: normalizePathname(pageUrl),
      impressions: value.impressions,
      clicks: value.clicks,
      ctr: value.impressions > 0 ? value.clicks / value.impressions : 0,
      position: value.impressions > 0 ? value.weightedPosition / value.impressions : 0,
    }))
    .filter((row) => row.impressions >= MIN_IMPRESSIONS)
    .sort((left, right) => right.impressions - left.impressions);
}

async function buildPageAuditContext(metric: AggregatedPageMetric): Promise<PageAuditContext | null> {
  const pageType = classifyPageType(metric.pagePath);

  if (pageType === 'home') {
    return {
      pageType,
      pageUrl: metric.pageUrl,
      pagePath: metric.pagePath,
      title: 'LAEA - Interactive AI Timeline, History & Learning Platform',
      h1: 'Let AI Explain AI',
      description: 'Explore the complete history of artificial intelligence through interactive timelines, learning paths, and AI news with historical context. From Turing to GPT-5, understand how AI evolved.',
      canonicalPath: '/',
      explicitSeoTitle: true,
      explicitSeoDescription: true,
      hasBreadcrumbs: false,
      structuredDataTypes: [],
      expectedStructuredDataTypes: [],
    };
  }

  if (pageType === 'timeline') {
    return {
      pageType,
      pageUrl: metric.pageUrl,
      pagePath: metric.pagePath,
      title: 'AI Timeline: Complete History of Artificial Intelligence',
      h1: 'AI Timeline',
      description: 'Explore the complete AI timeline from 1950 to 2026. Interactive history of artificial intelligence milestones, major model releases, and breakthroughs. Updated weekly with the latest AI developments.',
      canonicalPath: '/timeline',
      explicitSeoTitle: true,
      explicitSeoDescription: true,
      hasBreadcrumbs: false,
      structuredDataTypes: ['ItemList'],
      expectedStructuredDataTypes: ['ItemList'],
    };
  }

  if (pageType === 'news_index') {
    return {
      pageType,
      pageUrl: metric.pageUrl,
      pagePath: metric.pagePath,
      title: 'AI News - Latest Artificial Intelligence Headlines & Updates',
      h1: 'AI News Hub',
      description: 'Stay current with the latest AI news and developments. Every story includes historical context connecting today\'s breakthroughs to AI\'s rich history. Updated daily.',
      canonicalPath: '/news',
      explicitSeoTitle: true,
      explicitSeoDescription: true,
      hasBreadcrumbs: false,
      structuredDataTypes: [],
      expectedStructuredDataTypes: [],
    };
  }

  if (pageType === 'news_detail') {
    const parts = metric.pagePath.split('/').filter(Boolean);
    const eventId = parts[1];
    if (!eventId || eventId === 'quiz') {
      return null;
    }

    const event = await prisma.currentEvent.findUnique({
      where: { id: eventId },
      select: {
        headline: true,
        summary: true,
      },
    });

    if (!event) {
      return null;
    }

    return {
      pageType,
      pageUrl: metric.pageUrl,
      pagePath: metric.pagePath,
      title: event.headline,
      h1: event.headline,
      description: event.summary,
      canonicalPath: metric.pagePath,
      explicitSeoTitle: true,
      explicitSeoDescription: true,
      hasBreadcrumbs: false,
      structuredDataTypes: ['NewsArticle'],
      expectedStructuredDataTypes: ['NewsArticle', 'BreadcrumbList'],
    };
  }

  if (pageType === 'blog_post') {
    const parts = metric.pagePath.split('/').filter(Boolean);
    const slug = parts[1];
    if (!slug) {
      return null;
    }

    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: {
        title: true,
        excerpt: true,
        seoTitle: true,
        seoDescription: true,
        canonicalUrl: true,
        status: true,
      },
    });

    if (!post || post.status !== 'published') {
      return null;
    }

    return {
      pageType,
      pageUrl: metric.pageUrl,
      pagePath: metric.pagePath,
      title: post.seoTitle ?? post.title,
      h1: post.title,
      description: post.seoDescription ?? post.excerpt,
      canonicalPath: normalizePathname(post.canonicalUrl ?? metric.pageUrl),
      explicitSeoTitle: Boolean(post.seoTitle),
      explicitSeoDescription: Boolean(post.seoDescription),
      hasBreadcrumbs: true,
      structuredDataTypes: ['Article', 'BreadcrumbList'],
      expectedStructuredDataTypes: ['Article', 'BreadcrumbList'],
    };
  }

  return null;
}

function buildPackagingIssues(
  context: PageAuditContext,
  metric: AggregatedPageMetric,
  evergreenCandidate: EvergreenCandidate | null
): SeoPackagingIssueRecord[] {
  const issues: SeoPackagingIssueRecord[] = [];

  if (evergreenCandidate) {
    issues.push(
      buildIssue(
        'evergreen_routing',
        'critical',
        'Repeated demand is leaking to a transient news destination',
        `${evergreenCandidate.representativeQuery} is still landing on ${context.pagePath}, which is a weak canonical destination for recurring search intent.`,
        `Promote this theme toward ${evergreenCandidate.targetPath} and treat the current page as a news hook, not the canonical destination.`
      )
    );
  }

  if (!context.title) {
    issues.push(
      buildIssue(
        'title_link_risk',
        'warning',
        'Missing title signal',
        'This page does not resolve to a stable title signal for Search.',
        'Add a descriptive title that names the topic and distinguishes the page from generic archive views.'
      )
    );
  } else if (
    (context.pageType === 'blog_post' && (context.title.length < 30 || context.title.length > 70))
    || (!titleContainsHeading(context.title, context.h1) && hasWeakTitleAlignment(context.title, context.h1))
  ) {
    issues.push(
      buildIssue(
        'title_link_risk',
        'warning',
        'Title and visible heading may be pulling in different directions',
        `Current title: "${context.title}"${context.h1 ? ` · H1: "${context.h1}"` : ''}`,
        'Tighten the title/H1 pairing so both signals clearly describe the same topic without boilerplate.'
      )
    );
  }

  const descriptionTooLong = context.description.length > 170
    && (context.pageType === 'blog_post' || context.pageType === 'news_detail');

  if (!context.description || context.description.length < 110 || descriptionTooLong || !context.explicitSeoDescription) {
    issues.push(
      buildIssue(
        'metadata_thin',
        context.pageType === 'blog_post' && !context.explicitSeoDescription ? 'warning' : 'info',
        'Metadata description is thin or relying on a fallback',
        context.description
          ? `Current description length: ${context.description.length} characters.`
          : 'No description is available for this page.',
        'Write a concise, specific description that reflects the current page intent and can stand alone in search snippets.'
      )
    );
  }

  if (!context.explicitSeoTitle && context.pageType === 'blog_post') {
    issues.push(
      buildIssue(
        'title_link_risk',
        'warning',
        'Blog post is relying on the H1 as the entire title link signal',
        'Published blog posts with impressions should usually have an explicit SEO title instead of relying on the raw post title.',
        'Add a differentiated SEO title that preserves the thesis while sharpening query alignment.'
      )
    );
  }

  if (!context.hasBreadcrumbs && context.expectedStructuredDataTypes.includes('BreadcrumbList')) {
    issues.push(
      buildIssue(
        'breadcrumb_missing',
        'warning',
        'Deep page is missing breadcrumb support',
        `${context.pagePath} is an impression-bearing deep page but it does not expose the breadcrumb trail we expect for this page type.`,
        'Add a visible breadcrumb path and matching BreadcrumbList structured data that reflects a normal user journey.'
      )
    );
  }

  const missingStructuredTypes = context.expectedStructuredDataTypes.filter(
    (type) => !context.structuredDataTypes.includes(type)
  );
  if (missingStructuredTypes.length > 0) {
    issues.push(
      buildIssue(
        'schema_gap',
        'warning',
        'Expected structured data coverage is incomplete',
        `Missing: ${missingStructuredTypes.join(', ')}.`,
        'Restore the supported structured data already expected for this page type without adding unsupported rich-result markup.'
      )
    );
  }

  if (metric.ctr === 0 && metric.impressions >= 25 && context.pageType === 'news_index') {
    issues.push(
      buildIssue(
        'title_link_risk',
        'info',
        'Archive page is attracting impressions without clicks',
        `${metric.impressions} impressions over the last ${LOOKBACK_DAYS} days produced no clicks.`,
        'Treat this as a sign to route repeated demand toward stronger evergreen destinations instead of expanding the archive page.'
      )
    );
  }

  return issues;
}

function buildAuditRecord(
  context: PageAuditContext,
  metric: AggregatedPageMetric,
  issues: SeoPackagingIssueRecord[],
  evergreenCandidate: EvergreenCandidate | null,
  activeExperimentPaths: Set<string>,
  windowStart: string,
  windowEnd: string
): SeoPackagingAuditRecord {
  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;

  return {
    id: encodeAuditId(metric.pageUrl),
    windowStart,
    windowEnd,
    pageUrl: metric.pageUrl,
    pagePath: metric.pagePath,
    pageType: context.pageType,
    title: context.title,
    h1: context.h1,
    description: context.description,
    canonicalPath: context.canonicalPath,
    impressions: metric.impressions,
    clicks: metric.clicks,
    ctr: metric.ctr,
    position: metric.position,
    issueCount: issues.length,
    criticalCount,
    experimentActive: activeExperimentPaths.has(metric.pagePath),
    issueTypes: Array.from(new Set(issues.map((issue) => issue.type))),
    issues: issues.sort((left, right) => severityRank(right.severity) - severityRank(left.severity)),
    structuredDataTypes: context.structuredDataTypes,
    evergreenRecommendation: evergreenCandidate
      ? {
          clusterId: evergreenCandidate.clusterId,
          representativeQuery: evergreenCandidate.representativeQuery,
          targetPath: evergreenCandidate.targetPath,
          targetLabel: evergreenCandidate.targetLabel,
          moveType: evergreenCandidate.moveType,
          rationale: evergreenCandidate.rationale,
        }
      : null,
  };
}

async function buildAllPackagingAudits(): Promise<{
  windowStart: string;
  windowEnd: string;
  audits: SeoPackagingAuditRecord[];
}> {
  const windowEnd = getLatestFinalizedPtDate();
  const windowStart = shiftIsoDate(windowEnd, -(LOOKBACK_DAYS - 1));
  const [metrics, evergreenCandidates, activeExperimentPaths] = await Promise.all([
    aggregatePageMetrics(windowStart, windowEnd),
    loadEvergreenCandidates(windowEnd),
    loadActiveExperimentPaths(),
  ]);

  const audits: SeoPackagingAuditRecord[] = [];
  for (const metric of metrics) {
    const context = await buildPageAuditContext(metric);
    if (!context) {
      continue;
    }

    const evergreenCandidate = evergreenCandidates.get(metric.pagePath) ?? null;
    const issues = buildPackagingIssues(context, metric, evergreenCandidate);
    if (issues.length === 0) {
      continue;
    }

    audits.push(buildAuditRecord(
      context,
      metric,
      issues,
      evergreenCandidate,
      activeExperimentPaths,
      windowStart,
      windowEnd
    ));
  }

  audits.sort((left, right) => {
    if (right.criticalCount !== left.criticalCount) {
      return right.criticalCount - left.criticalCount;
    }

    if (right.issueCount !== left.issueCount) {
      return right.issueCount - left.issueCount;
    }

    return right.impressions - left.impressions;
  });

  return {
    windowStart,
    windowEnd,
    audits,
  };
}

export async function listSeoPackagingAudits(options: {
  page?: number;
  limit?: number;
} = {}): Promise<SeoPackagingAuditListResult> {
  const page = Math.max(1, options.page ?? 1);
  const limit = clampLimit(options.limit);
  const { windowStart, windowEnd, audits } = await buildAllPackagingAudits();
  const startIndex = (page - 1) * limit;
  const data = audits.slice(startIndex, startIndex + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total: audits.length,
      totalPages: audits.length === 0 ? 0 : Math.ceil(audits.length / limit),
    },
    meta: {
      windowStart,
      windowEnd,
      counts: {
        all: audits.length,
        critical: audits.filter((audit) => audit.criticalCount > 0).length,
        warning: audits.filter((audit) => audit.criticalCount === 0 && audit.issues.some((issue) => issue.severity === 'warning')).length,
        info: audits.filter((audit) => audit.issues.every((issue) => issue.severity === 'info')).length,
      },
    },
  };
}

export async function getSeoPackagingAudit(id: string): Promise<SeoPackagingAuditRecord | null> {
  const pageUrl = decodeAuditId(id);
  if (!pageUrl) {
    return null;
  }

  const { audits } = await buildAllPackagingAudits();
  return audits.find((audit) => audit.pageUrl === pageUrl) ?? null;
}

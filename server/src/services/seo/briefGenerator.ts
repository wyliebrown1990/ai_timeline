import Anthropic from '@anthropic-ai/sdk';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../middleware/error';
import { prisma } from '../../db';
import { search as searchPersons } from '../persons';
import { search as searchOrganizations } from '../organizations';
import { search as searchGlossaryTerms } from '../glossary';
import { search as searchMilestones } from '../milestones';
import { matchOrganization, matchPerson } from '../entityMatcher';
import { ensureExperimentForProposalLink, type SeoExperimentTopicPod } from './experimentLedger';
import { planTopicPodForCluster } from './topicPodPlanner';
import { getSeoPackagingAudit, type SeoPackagingAuditRecord, type SeoPackagingIssueRecord } from './serpPackagingAudit';
import type { SerperKeywordSourceRef } from './serperClient';

const PROPOSAL_MODEL = 'claude-sonnet-4-20250514';
const SUPPORTED_BUCKETS = new Set(['content_gap', 'trend_signal']);
const DUPLICATE_WINDOW_DAYS = 30;
const RECENT_NEWS_WINDOW_DAYS = 14;
const MAX_ENTITY_RESULTS = 5;
const MAX_NEWS_HOOKS = 5;
const PROJECT_HOST = 'https://letaiexplainai.com';
const BLOG_PROPOSAL_TYPE = 'blog_post';
const EVERGREEN_ROUTING_PROPOSAL_TYPE = 'evergreen_routing';
const PACKAGING_FIX_PROPOSAL_TYPE = 'packaging_fix';
const QUERY_NOISE_PATTERN = /\b(quiz|quizzes|trivia|test|tests|question|questions)\b/gi;
const HYPERBOLIC_PHRASES = [
  'revolutionary',
  'game-changing',
  'ultimate guide',
  'must-read',
  'powerful secret',
  'unleash',
  'in this article, we will explore',
];

export type SeoProposalStatus = 'pending' | 'drafting' | 'approved' | 'rejected' | 'shipped';
export type SeoProposalStatusFilter = SeoProposalStatus | 'all';
export type SeoProposalType =
  | typeof BLOG_PROPOSAL_TYPE
  | typeof EVERGREEN_ROUTING_PROPOSAL_TYPE
  | typeof PACKAGING_FIX_PROPOSAL_TYPE;
export type SeoProposalHandoffMode = 'blog_draft' | 'manual_routing_review' | 'manual_packaging_fix';

interface SnapshotRecord {
  id: string;
  weekStart: Date;
  bucket: string | null;
  page: string;
  query: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  status: string;
}

interface ClusterSourceRecord {
  id: string;
  windowStart: Date;
  windowEnd: Date;
  bucket: string | null;
  primaryPage: string;
  representativeQuery: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  status: string;
}

interface ProposalRow {
  id: string;
  sourceType: string;
  snapshotId: string | null;
  clusterSnapshotId: string | null;
  proposalType: string;
  targetKeyword: string;
  suggestedAngle: string;
  linkInventoryJson: unknown;
  newsHooksJson: unknown;
  rationale: string;
  hypothesis: string | null;
  topicPodJson: unknown;
  sourceRefJson: unknown;
  packagingFixJson: unknown;
  confidence: number;
  status: string;
  draftPostId: string | null;
  createdAt: Date;
  actedAt: Date | null;
  rejectedReason: string | null;
  snapshot: {
    id: string;
    weekStart: Date;
    bucket: string | null;
    page: string;
    query: string | null;
  } | null;
  clusterSnapshot: {
    id: string;
    windowStart: Date;
    windowEnd: Date;
    bucket: string | null;
    primaryPage: string;
    representativeQuery: string;
  } | null;
  draftPost: {
    id: string;
    slug: string;
    title: string;
    status: string;
    publishedAt: Date | null;
  } | null;
}

export interface SeoProposalLinkInventoryItem {
  entityType: 'person' | 'organization' | 'glossary_term' | 'milestone';
  id: string;
  label: string;
  path: string;
  reason: string;
}

export interface SeoProposalNewsHook {
  articleId: string;
  title: string;
  externalUrl: string;
  sourceName: string | null;
  publishedAt: string;
}

export interface SeoProposalHandoff {
  mode: SeoProposalHandoffMode;
  label: string;
  topic: string | null;
  keyword: string;
  newsUrl: string | null;
  command: string | null;
  proposalPath: string;
  guidance: string;
}

export interface SeoProposalRoutingPlan {
  currentPath: string;
  representativeQuery: string | null;
  targetPath: string;
  targetLabel: string;
  moveType: SeoExperimentTopicPod['moveType'];
  rationale: string;
}

interface SeoPackagingProposalSourceRef {
  auditId: string;
  pageUrl: string;
  pagePath: string;
  pageType: SeoPackagingAuditRecord['pageType'];
  windowStart: string;
  windowEnd: string;
  sourceBucket: 'serp_packaging';
  sourceQuery: null;
}

interface SeoKeywordOpportunityProposalSourceRef {
  opportunityId: string;
  opportunitySourceType: 'gsc_cluster' | 'google_trends' | 'serp_sample' | 'editorial_seed';
  pageUrl: string;
  pagePath: string;
  pageTypeRecommendation: string;
  windowStart: string;
  windowEnd: null;
  sourceBucket: 'gsc_cluster' | 'google_trends' | 'serp_sample' | 'editorial_seed';
  sourceQuery: string;
}

interface KeywordOpportunityProposalSourceRecord {
  id: string;
  sourceType: 'gsc_cluster' | 'google_trends' | 'serp_sample' | 'editorial_seed';
  seedQuery: string;
  targetIntent: string;
  demandProxy: number;
  competitionProxy: number;
  laeaFitScore: number;
  overallScore: number;
  pageTypeRecommendation: string;
  targetUrl: string | null;
  rationale: string;
  status: string;
  sourceRefJson: unknown;
  createdAt: Date;
}

export interface SeoProposalPackagingFixPlan {
  pagePath: string;
  pageType: SeoPackagingAuditRecord['pageType'];
  title: string | null;
  h1: string | null;
  description: string | null;
  canonicalPath: string | null;
  structuredDataTypes: string[];
  issueTypes: SeoPackagingAuditRecord['issueTypes'];
  issues: SeoPackagingIssueRecord[];
}

export interface SeoProposalRecord {
  id: string;
  sourceType: string;
  sourceId: string;
  proposalType: SeoProposalType;
  targetKeyword: string;
  suggestedAngle: string;
  rationale: string;
  hypothesis: string | null;
  confidence: number;
  status: SeoProposalStatus;
  rejectedReason: string | null;
  createdAt: string;
  actedAt: string | null;
  sourceWindowStart: string;
  sourceWindowEnd: string | null;
  sourceBucket: string | null;
  sourcePage: string;
  sourceQuery: string | null;
  linkInventory: SeoProposalLinkInventoryItem[];
  newsHooks: SeoProposalNewsHook[];
  topicPod: SeoExperimentTopicPod | null;
  routingPlan: SeoProposalRoutingPlan | null;
  packagingFixPlan: SeoProposalPackagingFixPlan | null;
  handoff: SeoProposalHandoff;
  draftPost: {
    id: string;
    slug: string;
    title: string;
    status: string;
    publishedAt: string | null;
  } | null;
}

export interface SeoProposalListResult {
  data: SeoProposalRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    counts: Record<'all' | 'pending' | 'drafting' | 'approved' | 'rejected' | 'shipped', number>;
  };
}

interface GeneratedAngle {
  suggestedAngle: string;
  rationale: string;
  confidence: number;
}

function getProposalType(value: string): SeoProposalType {
  if (value === EVERGREEN_ROUTING_PROPOSAL_TYPE) {
    return EVERGREEN_ROUTING_PROPOSAL_TYPE;
  }

  if (value === PACKAGING_FIX_PROPOSAL_TYPE) {
    return PACKAGING_FIX_PROPOSAL_TYPE;
  }

  return BLOG_PROPOSAL_TYPE;
}

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw ApiError.internal('ANTHROPIC_API_KEY environment variable is not set');
  }

  return new Anthropic({ apiKey });
}

function clampLimit(limit: number | undefined, fallback: number): number {
  if (!Number.isFinite(limit) || !limit || limit < 1) {
    return fallback;
  }

  return Math.max(1, Math.min(100, Math.trunc(limit)));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function trimToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = normalizeWhitespace(value);
  return trimmed.length > 0 ? trimmed : null;
}

function stripQuotedPunctuation(value: string): string {
  return normalizeWhitespace(value.replace(/["“”]/g, ' '));
}

function stripQueryNoise(value: string): string {
  return normalizeWhitespace(value.replace(QUERY_NOISE_PATTERN, ' '));
}

function extractQuotedPhrases(value: string): string[] {
  return Array.from(value.matchAll(/["“”]([^"“”]+)["“”]/g))
    .map((match) => trimToNull(match[1]))
    .filter((phrase): phrase is string => phrase !== null);
}

function formatIsoDate(date: Date): string {
  return date.toISOString();
}

function formatIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function subtractDays(days: number): Date {
  return new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
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

function buildRoutingPlan(proposal: {
  proposalType: SeoProposalType;
  sourcePage: string;
  sourceQuery: string | null;
  topicPod: SeoExperimentTopicPod | null;
}): SeoProposalRoutingPlan | null {
  if (proposal.proposalType !== EVERGREEN_ROUTING_PROPOSAL_TYPE || !proposal.topicPod) {
    return null;
  }

  return {
    currentPath: normalizePathname(proposal.sourcePage),
    representativeQuery: proposal.sourceQuery,
    targetPath: proposal.topicPod.canonicalDestination.path,
    targetLabel: proposal.topicPod.canonicalDestination.label,
    moveType: proposal.topicPod.moveType,
    rationale: proposal.topicPod.hypothesis,
  };
}

function parsePackagingSourceRef(value: unknown): SeoPackagingProposalSourceRef | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const auditId = trimToNull(typeof record.auditId === 'string' ? record.auditId : null);
  const pageUrl = trimToNull(typeof record.pageUrl === 'string' ? record.pageUrl : null);
  const pagePath = trimToNull(typeof record.pagePath === 'string' ? record.pagePath : null);
  const pageType = record.pageType;
  const windowStart = trimToNull(typeof record.windowStart === 'string' ? record.windowStart : null);
  const windowEnd = trimToNull(typeof record.windowEnd === 'string' ? record.windowEnd : null);
  const sourceBucket = record.sourceBucket;
  const sourceQuery = record.sourceQuery;

  if (
    !auditId
    || !pageUrl
    || !pagePath
    || (pageType !== 'home'
      && pageType !== 'timeline'
      && pageType !== 'news_index'
      && pageType !== 'news_detail'
      && pageType !== 'blog_post'
      && pageType !== 'unknown')
    || !windowStart
    || !windowEnd
    || sourceBucket !== 'serp_packaging'
    || sourceQuery !== null
  ) {
    return null;
  }

  return {
    auditId,
    pageUrl,
    pagePath,
    pageType,
    windowStart,
    windowEnd,
    sourceBucket,
    sourceQuery: null,
  };
}

function parseKeywordOpportunitySourceRef(value: unknown): SeoKeywordOpportunityProposalSourceRef | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const opportunityId = trimToNull(typeof record.opportunityId === 'string' ? record.opportunityId : null);
  const opportunitySourceType = record.opportunitySourceType;
  const pageUrl = trimToNull(typeof record.pageUrl === 'string' ? record.pageUrl : null);
  const pagePath = trimToNull(typeof record.pagePath === 'string' ? record.pagePath : null);
  const pageTypeRecommendation = trimToNull(
    typeof record.pageTypeRecommendation === 'string' ? record.pageTypeRecommendation : null
  );
  const windowStart = trimToNull(typeof record.windowStart === 'string' ? record.windowStart : null);
  const windowEnd = record.windowEnd;
  const sourceBucket = record.sourceBucket;
  const sourceQuery = trimToNull(typeof record.sourceQuery === 'string' ? record.sourceQuery : null);

  if (
    !opportunityId
    || (opportunitySourceType !== 'gsc_cluster'
      && opportunitySourceType !== 'google_trends'
      && opportunitySourceType !== 'serp_sample'
      && opportunitySourceType !== 'editorial_seed')
    || !pageUrl
    || !pagePath
    || !pageTypeRecommendation
    || !windowStart
    || windowEnd !== null
    || (sourceBucket !== 'gsc_cluster'
      && sourceBucket !== 'google_trends'
      && sourceBucket !== 'serp_sample'
      && sourceBucket !== 'editorial_seed')
    || !sourceQuery
  ) {
    return null;
  }

  return {
    opportunityId,
    opportunitySourceType,
    pageUrl,
    pagePath,
    pageTypeRecommendation,
    windowStart,
    windowEnd: null,
    sourceBucket,
    sourceQuery,
  };
}

function parseSerperSourceRef(value: unknown): SerperKeywordSourceRef | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const vendor = record.vendor;
  const requestKey = trimToNull(typeof record.requestKey === 'string' ? record.requestKey : null);
  const originSourceType = trimToNull(typeof record.originSourceType === 'string' ? record.originSourceType : null);
  const originOpportunityId = trimToNull(typeof record.originOpportunityId === 'string' ? record.originOpportunityId : null);
  const originDedupeKey = trimToNull(typeof record.originDedupeKey === 'string' ? record.originDedupeKey : null);
  const query = trimToNull(typeof record.query === 'string' ? record.query : null);
  const country = trimToNull(typeof record.country === 'string' ? record.country : null);
  const language = trimToNull(typeof record.language === 'string' ? record.language : null);
  const dateRange = trimToNull(typeof record.dateRange === 'string' ? record.dateRange : null);
  const page = typeof record.page === 'number' ? record.page : null;
  const sampledAt = trimToNull(typeof record.sampledAt === 'string' ? record.sampledAt : null);
  const expiresAt = trimToNull(typeof record.expiresAt === 'string' ? record.expiresAt : null);
  const organicCount = typeof record.organicCount === 'number' ? record.organicCount : null;
  const peopleAlsoAskCount = typeof record.peopleAlsoAskCount === 'number' ? record.peopleAlsoAskCount : null;
  const relatedSearchCount = typeof record.relatedSearchCount === 'number' ? record.relatedSearchCount : null;
  const topDomains = Array.isArray(record.topDomains)
    ? record.topDomains.filter((item): item is string => typeof item === 'string')
    : null;
  const strongDomainCount = typeof record.strongDomainCount === 'number' ? record.strongDomainCount : null;
  const forumDomainCount = typeof record.forumDomainCount === 'number' ? record.forumDomainCount : null;
  const videoDomainCount = typeof record.videoDomainCount === 'number' ? record.videoDomainCount : null;
  const competitionProxy = typeof record.competitionProxy === 'number' ? record.competitionProxy : null;
  const competitionReason = trimToNull(
    typeof record.competitionReason === 'string' ? record.competitionReason : null
  );
  const effectiveCostUsd = typeof record.effectiveCostUsd === 'number' ? record.effectiveCostUsd : null;

  if (
    vendor !== 'serper'
    || !requestKey
    || !originSourceType
    || !originOpportunityId
    || !originDedupeKey
    || !query
    || !country
    || !language
    || !dateRange
    || page === null
    || !sampledAt
    || !expiresAt
    || organicCount === null
    || peopleAlsoAskCount === null
    || relatedSearchCount === null
    || !topDomains
    || strongDomainCount === null
    || forumDomainCount === null
    || videoDomainCount === null
    || competitionProxy === null
    || !competitionReason
    || effectiveCostUsd === null
  ) {
    return null;
  }

  return {
    vendor,
    requestKey,
    originSourceType,
    originOpportunityId,
    originDedupeKey,
    query,
    country,
    language,
    dateRange,
    page,
    sampledAt,
    expiresAt,
    organicCount,
    peopleAlsoAskCount,
    relatedSearchCount,
    topDomains,
    strongDomainCount,
    forumDomainCount,
    videoDomainCount,
    competitionProxy,
    competitionReason,
    effectiveCostUsd,
  };
}

function parsePackagingFixPlan(value: unknown): SeoProposalPackagingFixPlan | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const pagePath = trimToNull(typeof record.pagePath === 'string' ? record.pagePath : null);
  const pageType = record.pageType;
  const title = trimToNull(typeof record.title === 'string' ? record.title : null);
  const h1 = trimToNull(typeof record.h1 === 'string' ? record.h1 : null);
  const description = trimToNull(typeof record.description === 'string' ? record.description : null);
  const canonicalPath = trimToNull(typeof record.canonicalPath === 'string' ? record.canonicalPath : null);
  const structuredDataTypes = Array.isArray(record.structuredDataTypes)
    ? record.structuredDataTypes.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const issueTypes = Array.isArray(record.issueTypes)
    ? record.issueTypes.filter(
      (item): item is SeoPackagingAuditRecord['issueTypes'][number] =>
        item === 'evergreen_routing'
        || item === 'title_link_risk'
        || item === 'metadata_thin'
        || item === 'breadcrumb_missing'
        || item === 'schema_gap'
    )
    : [];
  const issues = Array.isArray(record.issues)
    ? record.issues
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return null;
        }

        const issue = item as Record<string, unknown>;
        const id = trimToNull(typeof issue.id === 'string' ? issue.id : null);
        const type = issue.type;
        const severity = issue.severity;
        const label = trimToNull(typeof issue.label === 'string' ? issue.label : null);
        const details = trimToNull(typeof issue.details === 'string' ? issue.details : null);
        const recommendedFix = trimToNull(typeof issue.recommendedFix === 'string' ? issue.recommendedFix : null);

        if (
          !id
          || (type !== 'evergreen_routing'
            && type !== 'title_link_risk'
            && type !== 'metadata_thin'
            && type !== 'breadcrumb_missing'
            && type !== 'schema_gap')
          || (severity !== 'critical' && severity !== 'warning' && severity !== 'info')
          || !label
          || !details
          || !recommendedFix
        ) {
          return null;
        }

        return {
          id,
          type,
          severity,
          label,
          details,
          recommendedFix,
        } satisfies SeoPackagingIssueRecord;
      })
      .filter((item): item is SeoPackagingIssueRecord => item !== null)
    : [];

  if (
    !pagePath
    || (pageType !== 'home'
      && pageType !== 'timeline'
      && pageType !== 'news_index'
      && pageType !== 'news_detail'
      && pageType !== 'blog_post'
      && pageType !== 'unknown')
    || issues.length === 0
  ) {
    return null;
  }

  return {
    pagePath,
    pageType,
    title,
    h1,
    description,
    canonicalPath,
    structuredDataTypes,
    issueTypes,
    issues,
  };
}

function getPackagingFixIssues(audit: SeoPackagingAuditRecord): SeoPackagingIssueRecord[] {
  return audit.issues.filter((issue) => issue.type !== 'evergreen_routing');
}

function formatHumanList(items: string[]): string {
  if (items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function describePackagingFocus(issueType: SeoPackagingIssueRecord['type']): string | null {
  switch (issueType) {
    case 'title_link_risk':
      return 'title signal';
    case 'metadata_thin':
      return 'meta description';
    case 'breadcrumb_missing':
      return 'breadcrumb support';
    case 'schema_gap':
      return 'structured data coverage';
    case 'evergreen_routing':
    default:
      return null;
  }
}

function buildPackagingFixAngle(audit: SeoPackagingAuditRecord): string {
  const focusAreas = Array.from(new Set(
    getPackagingFixIssues(audit)
      .map((issue) => describePackagingFocus(issue.type))
      .filter((value): value is string => value !== null)
  ));

  if (focusAreas.length === 0) {
    return `Review the manual SERP packaging fixes for ${audit.pagePath}.`;
  }

  return `Tighten the ${formatHumanList(focusAreas)} on ${audit.pagePath} so the page presents a clearer answer in search.`;
}

function buildPackagingFixRationale(audit: SeoPackagingAuditRecord): string {
  const issues = getPackagingFixIssues(audit);
  const summary = issues.slice(0, 2).map((issue) => issue.label).join(' and ');
  return `${audit.pagePath} already has ${audit.impressions} impressions over the current ${audit.windowStart} to ${audit.windowEnd} audit window, but it is still showing ${summary || 'human-reviewed packaging gaps'}. This is a packaging fix proposal, not a new-content ask, so the goal is to improve how the current page is understood and presented in search.`;
}

function buildPackagingFixHypothesis(audit: SeoPackagingAuditRecord): string {
  const focusAreas = Array.from(new Set(
    getPackagingFixIssues(audit)
      .map((issue) => describePackagingFocus(issue.type))
      .filter((value): value is string => value !== null)
  ));

  if (focusAreas.length === 0) {
    return `If ${audit.pagePath} gets cleaner search packaging, it should capture more qualified clicks without changing the underlying topic coverage.`;
  }

  return `If ${audit.pagePath} gets clearer ${formatHumanList(focusAreas)}, Google should present the page more cleanly and click-through should improve on the existing impression base.`;
}

function scorePackagingFixConfidence(audit: SeoPackagingAuditRecord): number {
  const fixIssues = getPackagingFixIssues(audit);
  let confidence = 0.68;

  if (audit.criticalCount > 0) {
    confidence += 0.08;
  }

  if (fixIssues.length >= 2) {
    confidence += 0.05;
  }

  if (audit.impressions >= 50) {
    confidence += 0.05;
  } else if (audit.impressions >= 20) {
    confidence += 0.03;
  }

  if (fixIssues.some((issue) => issue.type === 'title_link_risk') && fixIssues.some((issue) => issue.type === 'metadata_thin')) {
    confidence += 0.04;
  }

  return clampConfidence(confidence);
}

function buildPackagingSourceRef(audit: SeoPackagingAuditRecord): SeoPackagingProposalSourceRef {
  return {
    auditId: audit.id,
    pageUrl: audit.pageUrl,
    pagePath: audit.pagePath,
    pageType: audit.pageType,
    windowStart: audit.windowStart,
    windowEnd: audit.windowEnd,
    sourceBucket: 'serp_packaging',
    sourceQuery: null,
  };
}

function buildPackagingFixPlan(audit: SeoPackagingAuditRecord): SeoProposalPackagingFixPlan {
  const issues = getPackagingFixIssues(audit);
  return {
    pagePath: audit.pagePath,
    pageType: audit.pageType,
    title: audit.title,
    h1: audit.h1,
    description: audit.description,
    canonicalPath: audit.canonicalPath,
    structuredDataTypes: audit.structuredDataTypes,
    issueTypes: Array.from(new Set(issues.map((issue) => issue.type))),
    issues,
  };
}

function deriveKeywordFromPage(pageUrl: string): string {
  const pathname = normalizePathname(pageUrl);
  const segments = pathname.split('/').filter(Boolean);
  const slug = segments[segments.length - 1];

  if (!slug) {
    return 'AI history';
  }

  return titleCaseFromSlug(slug);
}

function deriveKeywordFromQuery(query: string | null | undefined): string | null {
  const raw = trimToNull(query);
  if (!raw) {
    return null;
  }

  const dequoted = stripQuotedPunctuation(raw);
  return trimToNull(stripQueryNoise(dequoted)) ?? trimToNull(dequoted);
}

function buildDuplicateEntityCandidates(keyword: string, rawQuery: string | null | undefined): string[] {
  const candidates = new Set<string>();

  function pushCandidate(value: string | null) {
    const normalized = trimToNull(value);
    if (normalized) {
      candidates.add(normalized);
    }
  }

  pushCandidate(keyword);

  const raw = trimToNull(rawQuery);
  if (!raw) {
    return Array.from(candidates);
  }

  for (const phrase of extractQuotedPhrases(raw)) {
    pushCandidate(stripQueryNoise(stripQuotedPunctuation(phrase)));
  }

  pushCandidate(stripQueryNoise(stripQuotedPunctuation(raw)));
  pushCandidate(stripQuotedPunctuation(raw));

  return Array.from(candidates);
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0.05, Math.min(0.99, Number(value.toFixed(2))));
}

function extractResponseText(response: Awaited<ReturnType<Anthropic['messages']['create']>>): string {
  const text = response.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n')
    .trim();

  if (!text) {
    throw ApiError.internal('Claude returned an empty SEO proposal brief response');
  }

  return text;
}

function parseGeneratedAngleResponse(raw: string): GeneratedAngle {
  const sanitized = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    throw ApiError.internal('Claude returned invalid JSON for the SEO proposal brief');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw ApiError.internal('Claude returned an invalid SEO proposal brief payload');
  }

  const record = parsed as Record<string, unknown>;
  const suggestedAngle = trimToNull(typeof record.suggestedAngle === 'string' ? record.suggestedAngle : null);
  const rationale = trimToNull(typeof record.rationale === 'string' ? record.rationale : null);
  const confidence = Number(record.confidence);

  if (!suggestedAngle || !rationale || !Number.isFinite(confidence)) {
    throw ApiError.internal('Claude returned an incomplete SEO proposal brief payload');
  }

  return {
    suggestedAngle,
    rationale,
    confidence: clampConfidence(confidence),
  };
}

function buildPrompt(input: {
  snapshot: SnapshotRecord;
  keyword: string;
  linkInventory: SeoProposalLinkInventoryItem[];
  newsHooks: SeoProposalNewsHook[];
}): string {
  const entityLines = input.linkInventory.length > 0
    ? input.linkInventory.map((item) => `- ${item.entityType}: ${item.label} (${item.path})`).join('\n')
    : '- No strong linked entities found yet.';

  const newsLines = input.newsHooks.length > 0
    ? input.newsHooks.map((item) => `- ${item.title} (${item.sourceName ?? 'Unknown source'}, ${item.publishedAt})`).join('\n')
    : '- No recent news hooks found.';

  return `You are preparing a content brief for the AI Timeline Atlas blog at letaiexplainai.com.

Your job is to turn a Google Search Console finding into a blog angle with a clear thesis.

Rules:
- Do not write a generic recap or glossary definition.
- Do not write a "Top 10" or other listicle framing.
- Prefer a concrete, arguable angle that fits an AI history / entity-graph site.
- Keep the angle specific enough that a human can hand it to /AIBlogDraft.

Return ONLY valid JSON with this exact shape:
{
  "suggestedAngle": "one sentence angle",
  "rationale": "2-4 sentence explanation of why this angle is timely and winnable",
  "confidence": 0.0
}

Finding:
- Bucket: ${input.snapshot.bucket ?? 'unknown'}
- Week start: ${formatIsoDay(input.snapshot.weekStart)}
- Landing page: ${input.snapshot.page}
- Visible query: ${input.snapshot.query ?? 'none (derive from page context)'}
- Target keyword: ${input.keyword}
- Impressions: ${input.snapshot.impressions}
- Clicks: ${input.snapshot.clicks}
- CTR: ${input.snapshot.ctr.toFixed(3)}
- Avg position: ${input.snapshot.position.toFixed(2)}

Linked entities:
${entityLines}

Recent news hooks:
${newsLines}

Write the angle for a blog post proposal, not metadata.`;
}

function buildClusterPrompt(input: {
  cluster: ClusterSourceRecord;
  keyword: string;
  linkInventory: SeoProposalLinkInventoryItem[];
  newsHooks: SeoProposalNewsHook[];
  topicPod: SeoExperimentTopicPod;
}): string {
  const entityLines = input.linkInventory.length > 0
    ? input.linkInventory.map((item) => `- ${item.entityType}: ${item.label} (${item.path})`).join('\n')
    : '- No strong linked entities found yet.';

  const newsLines = input.newsHooks.length > 0
    ? input.newsHooks.map((item) => `- ${item.title} (${item.sourceName ?? 'Unknown source'}, ${item.publishedAt})`).join('\n')
    : '- No recent news hooks found.';

  const companionLines = input.topicPod.companionAssets.length > 0
    ? input.topicPod.companionAssets.map((item) => `- ${item.label} (${item.status}${item.path ? `, ${item.path}` : ''})`).join('\n')
    : '- No companion assets recommended yet.';

  return `You are preparing a content brief for the AI Timeline Atlas blog at letaiexplainai.com.

Your job is to turn a clustered Google Search Console opportunity into a blog angle with a clear thesis.

Rules:
- Do not write a generic recap or glossary definition.
- Do not write a "Top 10" or other listicle framing.
- Prefer a concrete, arguable angle that fits an AI history / entity-graph site.
- Respect the topic pod recommendation; do not pitch a duplicate page when the planner says to strengthen an existing destination.
- Keep the angle specific enough that a human can hand it to /AIBlogDraft.

Return ONLY valid JSON with this exact shape:
{
  "suggestedAngle": "one sentence angle",
  "rationale": "2-4 sentence explanation of why this angle is timely and winnable",
  "confidence": 0.0
}

Cluster opportunity:
- Bucket: ${input.cluster.bucket ?? 'unknown'}
- Window: ${formatIsoDay(input.cluster.windowStart)} to ${formatIsoDay(input.cluster.windowEnd)}
- Primary landing page: ${input.cluster.primaryPage}
- Representative query: ${input.cluster.representativeQuery}
- Target keyword: ${input.keyword}
- Impressions: ${input.cluster.impressions}
- Clicks: ${input.cluster.clicks}
- CTR: ${input.cluster.ctr.toFixed(3)}
- Avg position: ${input.cluster.position.toFixed(2)}

Topic pod plan:
- Move type: ${input.topicPod.moveType}
- Hypothesis: ${input.topicPod.hypothesis}
- Canonical destination: ${input.topicPod.canonicalDestination.path} (${input.topicPod.canonicalDestination.reason})
- Companion assets:
${companionLines}

Linked entities:
${entityLines}

Recent news hooks:
${newsLines}

Write the angle for a blog post proposal, not metadata.`;
}

function buildKeywordOpportunityPrompt(input: {
  opportunity: KeywordOpportunityProposalSourceRecord;
  keyword: string;
  linkInventory: SeoProposalLinkInventoryItem[];
  newsHooks: SeoProposalNewsHook[];
}): string {
  const serperSourceRef = parseSerperSourceRef(input.opportunity.sourceRefJson);
  const entityLines = input.linkInventory.length > 0
    ? input.linkInventory.map((item) => `- ${item.entityType}: ${item.label} (${item.path})`).join('\n')
    : '- No strong linked entities found yet.';

  const newsLines = input.newsHooks.length > 0
    ? input.newsHooks.map((item) => `- ${item.title} (${item.sourceName ?? 'Unknown source'}, ${item.publishedAt})`).join('\n')
    : '- No recent news hooks found.';
  const serperLines = serperSourceRef
    ? [
        `- Sampled query: ${serperSourceRef.query}`,
        `- Origin source type: ${serperSourceRef.originSourceType}`,
        `- Locale + window: ${serperSourceRef.country.toUpperCase()} / ${serperSourceRef.language.toUpperCase()} / ${serperSourceRef.dateRange} / page ${serperSourceRef.page}`,
        `- Sampled at: ${formatIsoDate(new Date(serperSourceRef.sampledAt))}`,
        `- Refreshed competition proxy: ${serperSourceRef.competitionProxy}`,
        `- Organic results sampled: ${serperSourceRef.organicCount}`,
        `- Top domains: ${serperSourceRef.topDomains.join(', ') || 'none captured'}`,
        `- Authoritative domains in top results: ${serperSourceRef.strongDomainCount}`,
        `- Forum results: ${serperSourceRef.forumDomainCount}`,
        `- Video results: ${serperSourceRef.videoDomainCount}`,
        `- People Also Ask prompts: ${serperSourceRef.peopleAlsoAskCount}`,
        `- Competition read: ${serperSourceRef.competitionReason}`,
      ].join('\n')
    : '- No live SERP sample attached.';

  return `You are preparing a content brief for the AI Timeline Atlas blog at letaiexplainai.com.

Your job is to turn a manually scored keyword opportunity into a blog angle with a clear thesis.

Rules:
- Do not write a generic recap or glossary definition.
- Do not write a "Top 10" or other listicle framing.
- Prefer a concrete, arguable angle that fits an AI history / entity-graph site.
- Respect the recommended destination and page type.
- Keep the angle specific enough that a human can hand it to /AIBlogDraft.
- When live SERP evidence is present, use it to differentiate from the current first-page winners instead of repeating generic category copy.

Return ONLY valid JSON with this exact shape:
{
  "suggestedAngle": "one sentence angle",
  "rationale": "2-4 sentence explanation of why this angle is timely and winnable",
  "confidence": 0.0
}

Keyword opportunity:
- Source type: ${input.opportunity.sourceType}
- Added: ${formatIsoDay(input.opportunity.createdAt)}
- Target keyword: ${input.keyword}
- Target intent: ${input.opportunity.targetIntent}
- Recommended page type: ${input.opportunity.pageTypeRecommendation}
- Planned destination: ${input.opportunity.targetUrl ?? 'not set'}
- Demand proxy: ${input.opportunity.demandProxy}
- Competition proxy: ${input.opportunity.competitionProxy}
- LAEA fit: ${input.opportunity.laeaFitScore}
- Overall score: ${input.opportunity.overallScore.toFixed(1)}
- Operator rationale: ${input.opportunity.rationale}

Live SERP evidence:
${serperLines}

Linked entities:
${entityLines}

Recent news hooks:
${newsLines}

Write the angle for a blog post proposal, not metadata.`;
}

function adjustConfidence(
  baseConfidence: number,
  snapshot: SnapshotRecord,
  linkInventoryCount: number,
  newsHookCount: number
): number {
  let nextConfidence = baseConfidence;

  if (linkInventoryCount >= 3) {
    nextConfidence += 0.08;
  } else if (linkInventoryCount === 0) {
    nextConfidence -= 0.08;
  }

  if (newsHookCount > 0) {
    nextConfidence += 0.07;
  }

  if (snapshot.bucket === 'trend_signal' || snapshot.impressions >= 100) {
    nextConfidence += 0.05;
  }

  return clampConfidence(nextConfidence);
}

function adjustClusterConfidence(
  baseConfidence: number,
  cluster: ClusterSourceRecord,
  linkInventoryCount: number,
  newsHookCount: number,
  moveType: SeoExperimentTopicPod['moveType']
): number {
  let nextConfidence = baseConfidence;

  if (cluster.impressions >= 60) {
    nextConfidence += 0.08;
  } else if (cluster.impressions < 25) {
    nextConfidence -= 0.06;
  }

  if (linkInventoryCount >= 3) {
    nextConfidence += 0.06;
  }

  if (newsHookCount > 0) {
    nextConfidence += 0.05;
  }

  if (moveType === 'create_new') {
    nextConfidence += 0.04;
  } else if (moveType === 'internal_link_only') {
    nextConfidence -= 0.05;
  }

  return clampConfidence(nextConfidence);
}

function adjustKeywordOpportunityConfidence(
  baseConfidence: number,
  opportunity: KeywordOpportunityProposalSourceRecord,
  linkInventoryCount: number,
  newsHookCount: number,
): number {
  const serperSourceRef = parseSerperSourceRef(opportunity.sourceRefJson);
  let nextConfidence = baseConfidence;

  if (linkInventoryCount >= 3) {
    nextConfidence += 0.07;
  } else if (linkInventoryCount === 0) {
    nextConfidence -= 0.07;
  }

  if (newsHookCount > 0) {
    nextConfidence += 0.05;
  }

  if (opportunity.laeaFitScore >= 80) {
    nextConfidence += 0.05;
  }

  if (opportunity.competitionProxy <= 40) {
    nextConfidence += 0.04;
  }

  if (opportunity.demandProxy < 25) {
    nextConfidence -= 0.06;
  }

  if (serperSourceRef) {
    if (serperSourceRef.strongDomainCount >= 3) {
      nextConfidence -= 0.08;
    } else if (serperSourceRef.strongDomainCount === 0) {
      nextConfidence += 0.04;
    }

    if (serperSourceRef.forumDomainCount > 0 || serperSourceRef.videoDomainCount > 0) {
      nextConfidence += 0.05;
    }

    if (serperSourceRef.peopleAlsoAskCount >= 3) {
      nextConfidence += 0.02;
    }

    if (serperSourceRef.competitionProxy <= 45) {
      nextConfidence += 0.04;
    } else if (serperSourceRef.competitionProxy >= 70) {
      nextConfidence -= 0.05;
    }
  }

  return clampConfidence(nextConfidence);
}

function findGenericListicleReason(angle: string): string | null {
  return /^\s*top\s+\d+/i.test(angle) ? 'Generic listicle framing is not allowed' : null;
}

function findVoiceDriftReason(angle: string): string | null {
  const lower = angle.toLowerCase();
  const hit = HYPERBOLIC_PHRASES.find((phrase) => lower.includes(phrase));
  return hit ? `Voice drift detected: avoid phrase "${hit}"` : null;
}

function getDraftStatus(status: string): SeoProposalStatus {
  if (status === 'pending' || status === 'drafting' || status === 'approved' || status === 'rejected' || status === 'shipped') {
    return status;
  }

  return 'pending';
}

function parseLinkInventory(value: unknown): SeoProposalLinkInventoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const entityType = record.entityType;
      const id = trimToNull(typeof record.id === 'string' ? record.id : null);
      const label = trimToNull(typeof record.label === 'string' ? record.label : null);
      const path = trimToNull(typeof record.path === 'string' ? record.path : null);
      const reason = trimToNull(typeof record.reason === 'string' ? record.reason : null);

      if (
        (entityType !== 'person' && entityType !== 'organization' && entityType !== 'glossary_term' && entityType !== 'milestone') ||
        !id ||
        !label ||
        !path ||
        !reason
      ) {
        return null;
      }

      return {
        entityType,
        id,
        label,
        path,
        reason,
      } satisfies SeoProposalLinkInventoryItem;
    })
    .filter((item): item is SeoProposalLinkInventoryItem => item !== null);
}

function parseNewsHooks(value: unknown): SeoProposalNewsHook[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const articleId = trimToNull(typeof record.articleId === 'string' ? record.articleId : null);
      const title = trimToNull(typeof record.title === 'string' ? record.title : null);
      const externalUrl = trimToNull(typeof record.externalUrl === 'string' ? record.externalUrl : null);
      const publishedAt = trimToNull(typeof record.publishedAt === 'string' ? record.publishedAt : null);

      if (!articleId || !title || !externalUrl || !publishedAt) {
        return null;
      }

      return {
        articleId,
        title,
        externalUrl,
        sourceName: trimToNull(typeof record.sourceName === 'string' ? record.sourceName : null),
        publishedAt,
      } satisfies SeoProposalNewsHook;
    })
    .filter((item): item is SeoProposalNewsHook => item !== null);
}

function buildHandoff(proposal: {
  proposalType: SeoProposalType;
  targetKeyword: string;
  suggestedAngle: string;
  newsHooks: SeoProposalNewsHook[];
  topicPod: SeoExperimentTopicPod | null;
  sourcePage: string;
}): SeoProposalHandoff {
  const newsUrl = proposal.newsHooks[0]?.externalUrl ?? null;
  if (proposal.proposalType === PACKAGING_FIX_PROPOSAL_TYPE) {
    return {
      mode: 'manual_packaging_fix',
      label: 'Review packaging plan',
      topic: null,
      keyword: proposal.targetKeyword,
      newsUrl: null,
      command: null,
      proposalPath: `${PROJECT_HOST}/admin/seo-insights/proposals`,
      guidance: 'Review the recommended title, metadata, breadcrumb, and structured-data changes manually before shipping. Packaging fixes stay human-approved.',
    };
  }

  if (
    proposal.proposalType === EVERGREEN_ROUTING_PROPOSAL_TYPE
    && proposal.topicPod
    && proposal.topicPod.moveType !== 'create_new'
  ) {
    const currentPath = normalizePathname(proposal.sourcePage);
    const targetPath = proposal.topicPod.canonicalDestination.path;
    const guidanceByMoveType: Record<Exclude<SeoExperimentTopicPod['moveType'], 'create_new'>, string> = {
      optimize_current: `Retarget ${targetPath} so it becomes the canonical destination for recurring demand currently landing on ${currentPath}.`,
      expand_existing: `Expand ${targetPath} and route repeated demand away from ${currentPath} once the destination clearly answers the clustered query intent.`,
      internal_link_only: `Strengthen internal links and navigational cues so ${targetPath} becomes the clear canonical destination instead of ${currentPath}.`,
    };

    return {
      mode: 'manual_routing_review',
      label: 'Review routing plan',
      topic: null,
      keyword: proposal.targetKeyword,
      newsUrl,
      command: null,
      proposalPath: `${PROJECT_HOST}/admin/seo-insights/proposals`,
      guidance: guidanceByMoveType[proposal.topicPod.moveType],
    };
  }

  const commandParts = [
    `/AIBlogDraft topic: ${JSON.stringify(proposal.suggestedAngle)}`,
    `keyword: ${JSON.stringify(proposal.targetKeyword)}`,
  ];

  if (newsUrl) {
    commandParts.push(`news_url: ${JSON.stringify(newsUrl)}`);
  }

  return {
    mode: 'blog_draft',
    label: proposal.proposalType === EVERGREEN_ROUTING_PROPOSAL_TYPE
      ? 'Draft canonical destination'
      : 'Send to /AIBlogDraft',
    topic: proposal.suggestedAngle,
    keyword: proposal.targetKeyword,
    newsUrl,
    command: commandParts.join(' '),
    proposalPath: `${PROJECT_HOST}/admin/seo-insights/proposals`,
    guidance: proposal.proposalType === EVERGREEN_ROUTING_PROPOSAL_TYPE
      ? 'This routing plan needs a stronger evergreen destination first. Draft the recommended destination, then route recurring demand toward it.'
      : 'Approving this proposal keeps a human in the loop and prepares a structured /AIBlogDraft handoff.',
  };
}

function parseTopicPod(value: unknown): SeoExperimentTopicPod | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as SeoExperimentTopicPod;
}

function serializeProposal(row: ProposalRow): SeoProposalRecord {
  const linkInventory = parseLinkInventory(row.linkInventoryJson);
  const newsHooks = parseNewsHooks(row.newsHooksJson);
  const proposalType = getProposalType(row.proposalType);
  const topicPod = parseTopicPod(row.topicPodJson);
  const packagingSourceRef = parsePackagingSourceRef(row.sourceRefJson);
  const keywordOpportunitySourceRef = parseKeywordOpportunitySourceRef(row.sourceRefJson);
  const packagingFixPlan = parsePackagingFixPlan(row.packagingFixJson);
  const sourceWindowStart = row.snapshot
    ? formatIsoDate(row.snapshot.weekStart)
    : row.clusterSnapshot
      ? formatIsoDate(row.clusterSnapshot.windowStart)
      : packagingSourceRef?.windowStart ?? keywordOpportunitySourceRef?.windowStart ?? formatIsoDate(row.createdAt);
  const sourceWindowEnd = row.clusterSnapshot
    ? formatIsoDate(row.clusterSnapshot.windowEnd)
    : packagingSourceRef?.windowEnd ?? keywordOpportunitySourceRef?.windowEnd ?? null;
  const sourceBucket = (
    row.snapshot?.bucket
    ?? row.clusterSnapshot?.bucket
    ?? packagingSourceRef?.sourceBucket
    ?? keywordOpportunitySourceRef?.sourceBucket
    ?? null
  );
  const sourcePage = (
    row.snapshot?.page
    ?? row.clusterSnapshot?.primaryPage
    ?? packagingSourceRef?.pageUrl
    ?? keywordOpportunitySourceRef?.pageUrl
    ?? ''
  );
  const sourceQuery = (
    row.snapshot?.query
    ?? row.clusterSnapshot?.representativeQuery
    ?? packagingSourceRef?.sourceQuery
    ?? keywordOpportunitySourceRef?.sourceQuery
    ?? null
  );
  const sourceId = (
    row.clusterSnapshotId
    ?? row.snapshotId
    ?? packagingSourceRef?.auditId
    ?? keywordOpportunitySourceRef?.opportunityId
  );

  if (!sourceId) {
    throw ApiError.internal('SEO proposal source is missing');
  }

  return {
    id: row.id,
    sourceType: row.sourceType,
    sourceId,
    proposalType,
    targetKeyword: row.targetKeyword,
    suggestedAngle: row.suggestedAngle,
    rationale: row.rationale,
    hypothesis: row.hypothesis,
    confidence: row.confidence,
    status: getDraftStatus(row.status),
    rejectedReason: row.rejectedReason,
    createdAt: formatIsoDate(row.createdAt),
    actedAt: row.actedAt ? formatIsoDate(row.actedAt) : null,
    sourceWindowStart,
    sourceWindowEnd,
    sourceBucket,
    sourcePage,
    sourceQuery,
    linkInventory,
    newsHooks,
    topicPod,
    routingPlan: buildRoutingPlan({
      proposalType,
      sourcePage,
      sourceQuery,
      topicPod,
    }),
    packagingFixPlan,
    handoff: buildHandoff({
      proposalType,
      targetKeyword: row.targetKeyword,
      suggestedAngle: row.suggestedAngle,
      newsHooks,
      topicPod,
      sourcePage,
    }),
    draftPost: row.draftPost
      ? {
          id: row.draftPost.id,
          slug: row.draftPost.slug,
          title: row.draftPost.title,
          status: row.draftPost.status,
          publishedAt: row.draftPost.publishedAt ? formatIsoDate(row.draftPost.publishedAt) : null,
        }
      : null,
  };
}

async function loadSnapshot(snapshotId: string): Promise<SnapshotRecord> {
  const snapshot = await prisma.gscWeeklySnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      id: true,
      weekStart: true,
      bucket: true,
      page: true,
      query: true,
      clicks: true,
      impressions: true,
      ctr: true,
      position: true,
      status: true,
    },
  });

  if (!snapshot) {
    throw ApiError.notFound('SEO proposal source snapshot not found');
  }

  if (!snapshot.bucket || !SUPPORTED_BUCKETS.has(snapshot.bucket)) {
    throw new ApiError(409, 'Only content-gap and trend-signal findings can generate proposals');
  }

  return snapshot;
}

async function loadClusterSource(clusterId: string): Promise<ClusterSourceRecord> {
  const cluster = await prisma.gscClusterSnapshot.findUnique({
    where: { id: clusterId },
    select: {
      id: true,
      windowStart: true,
      windowEnd: true,
      bucket: true,
      primaryPage: true,
      representativeQuery: true,
      clicks: true,
      impressions: true,
      ctr: true,
      position: true,
      status: true,
    },
  });

  if (!cluster) {
    throw ApiError.notFound('SEO proposal source cluster not found');
  }

  if (!cluster.bucket || (cluster.bucket !== 'cluster_content_gap' && cluster.bucket !== 'cluster_topic_theme')) {
    throw new ApiError(409, 'Only clustered content gaps and topic themes can generate proposals');
  }

  return cluster;
}

async function loadKeywordOpportunitySource(
  opportunityId: string,
): Promise<KeywordOpportunityProposalSourceRecord> {
  const opportunity = await prisma.keywordOpportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      sourceType: true,
      seedQuery: true,
      targetIntent: true,
      demandProxy: true,
      competitionProxy: true,
      laeaFitScore: true,
      overallScore: true,
      pageTypeRecommendation: true,
      targetUrl: true,
      rationale: true,
      status: true,
      sourceRefJson: true,
      createdAt: true,
    },
  });

  if (!opportunity) {
    throw ApiError.notFound('SEO keyword opportunity not found');
  }

  if (
    opportunity.sourceType !== 'gsc_cluster'
    && opportunity.sourceType !== 'google_trends'
    && opportunity.sourceType !== 'serp_sample'
    && opportunity.sourceType !== 'editorial_seed'
  ) {
    throw ApiError.internal('SEO keyword opportunity source type is invalid');
  }

  return opportunity;
}

async function ensureNoRecentDuplicate(keyword: string, proposalType: SeoProposalType): Promise<void> {
  const duplicateWindowStart = subtractDays(DUPLICATE_WINDOW_DAYS);
  const existing = await prisma.seoProposal.findFirst({
    where: {
      targetKeyword: {
        equals: keyword,
        mode: 'insensitive',
      },
      proposalType,
      createdAt: {
        gte: duplicateWindowStart,
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new ApiError(409, 'A recent proposal already exists for this keyword');
  }
}

function buildEvergreenRoutingAngle(topicPod: SeoExperimentTopicPod): string {
  const targetPath = topicPod.canonicalDestination.path;

  switch (topicPod.moveType) {
    case 'optimize_current':
      return `Retarget ${targetPath} so it becomes the canonical destination for this recurring search demand.`;
    case 'expand_existing':
      return `Expand ${targetPath} so it becomes the canonical destination for this recurring search demand.`;
    case 'internal_link_only':
      return `Strengthen internal linking toward ${targetPath} so Google stops treating weaker pages as the destination.`;
    case 'create_new':
    default:
      return `Create a canonical evergreen destination at ${targetPath} and route repeated demand toward it.`;
  }
}

function buildEvergreenRoutingRationale(cluster: ClusterSourceRecord, topicPod: SeoExperimentTopicPod): string {
  const currentPath = normalizePathname(cluster.primaryPage);
  return `${topicPod.hypothesis} Current landing page: ${currentPath}. Recommended canonical destination: ${topicPod.canonicalDestination.path}.`;
}

async function loadLinkInventory(keyword: string): Promise<SeoProposalLinkInventoryItem[]> {
  const [personMatch, organizationMatch, persons, organizations, glossaryTerms, milestoneResults] = await Promise.all([
    matchPerson(keyword),
    matchOrganization(keyword),
    searchPersons(keyword, MAX_ENTITY_RESULTS),
    searchOrganizations(keyword, MAX_ENTITY_RESULTS),
    searchGlossaryTerms(keyword, MAX_ENTITY_RESULTS),
    searchMilestones({ query: keyword, skip: 0, limit: MAX_ENTITY_RESULTS }),
  ]);

  const items: SeoProposalLinkInventoryItem[] = [];
  const seen = new Set<string>();

  function pushItem(item: SeoProposalLinkInventoryItem) {
    const key = `${item.entityType}:${item.id}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    items.push(item);
  }

  if (personMatch.matched && personMatch.person) {
    pushItem({
      entityType: 'person',
      id: personMatch.person.id,
      label: personMatch.person.canonicalName,
      path: `/people/${personMatch.person.slug}`,
      reason: 'Exact match for the keyword in the people graph.',
    });
  }

  if (organizationMatch.matched && organizationMatch.organization) {
    pushItem({
      entityType: 'organization',
      id: organizationMatch.organization.id,
      label: organizationMatch.organization.name,
      path: `/organizations/${organizationMatch.organization.slug}`,
      reason: 'Exact match for the keyword in the organization graph.',
    });
  }

  for (const person of persons) {
    pushItem({
      entityType: 'person',
      id: person.id,
      label: person.canonicalName,
      path: `/people/${person.slug}`,
      reason: 'Related published person match for internal linking.',
    });
  }

  for (const organization of organizations) {
    pushItem({
      entityType: 'organization',
      id: organization.id,
      label: organization.name,
      path: `/organizations/${organization.slug}`,
      reason: 'Related published organization match for internal linking.',
    });
  }

  for (const glossaryTerm of glossaryTerms) {
    pushItem({
      entityType: 'glossary_term',
      id: glossaryTerm.id,
      label: glossaryTerm.term,
      path: `/glossary/${glossaryTerm.slug ?? slugify(glossaryTerm.term)}`,
      reason: 'Related glossary term for first-mention internal links.',
    });
  }

  for (const milestone of milestoneResults.results) {
    pushItem({
      entityType: 'milestone',
      id: milestone.id,
      label: milestone.title,
      path: `/events/${milestone.id}`,
      reason: 'Related milestone/event page that can deepen the brief.',
    });
  }

  return items.slice(0, MAX_ENTITY_RESULTS * 2);
}

async function loadNewsHooks(keyword: string): Promise<SeoProposalNewsHook[]> {
  const windowStart = subtractDays(RECENT_NEWS_WINDOW_DAYS);
  const slug = slugify(keyword);
  const rows = await prisma.ingestedArticle.findMany({
    where: {
      publishedAt: {
        gte: windowStart,
      },
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
        ...(slug ? [{ externalUrl: { contains: slug, mode: 'insensitive' } }] : []),
      ],
    },
    orderBy: {
      publishedAt: 'desc',
    },
    include: {
      source: {
        select: {
          name: true,
        },
      },
    },
    take: MAX_NEWS_HOOKS,
  });

  return rows.map((row) => ({
    articleId: row.id,
    title: row.title,
    externalUrl: row.externalUrl,
    sourceName: row.source?.name ?? null,
    publishedAt: formatIsoDate(row.publishedAt),
  }));
}

async function findDuplicateEntityReason(keyword: string, rawQuery?: string | null): Promise<string | null> {
  for (const candidate of buildDuplicateEntityCandidates(keyword, rawQuery)) {
    const normalizedKeyword = normalizeWhitespace(candidate);
    const normalizedSlug = slugify(normalizedKeyword);

    const [glossaryTerm, milestone, personMatch, organizationMatch] = await Promise.all([
      prisma.glossaryTerm.findFirst({
        where: {
          OR: [
            { term: { equals: normalizedKeyword, mode: 'insensitive' } },
            ...(normalizedSlug ? [{ slug: { equals: normalizedSlug, mode: 'insensitive' } }] : []),
          ],
        },
        select: {
          term: true,
          slug: true,
        },
      }),
      prisma.milestone.findFirst({
        where: {
          title: { equals: normalizedKeyword, mode: 'insensitive' },
        },
        select: {
          id: true,
          title: true,
        },
      }),
      matchPerson(normalizedKeyword),
      matchOrganization(normalizedKeyword),
    ]);

    if (glossaryTerm) {
      return `Keyword already maps to existing glossary page /glossary/${glossaryTerm.slug ?? normalizedSlug}`;
    }

    if (milestone) {
      return `Keyword already maps to existing event page /events/${milestone.id}`;
    }

    if (personMatch.matched && personMatch.person) {
      return `Keyword already maps to existing person page /people/${personMatch.person.slug}`;
    }

    if (organizationMatch.matched && organizationMatch.organization) {
      return `Keyword already maps to existing organization page /organizations/${organizationMatch.organization.slug}`;
    }
  }

  return null;
}

async function runSlopPreflight(input: {
  keyword: string;
  rawQuery?: string | null;
  suggestedAngle: string;
}): Promise<string | null> {
  return (
    findGenericListicleReason(input.suggestedAngle) ??
    findVoiceDriftReason(input.suggestedAngle) ??
    await findDuplicateEntityReason(input.keyword, input.rawQuery)
  );
}

async function createProposalRow(snapshot: SnapshotRecord): Promise<ProposalRow> {
  const keyword = deriveKeywordFromQuery(snapshot.query) ?? deriveKeywordFromPage(snapshot.page);
  if (!keyword) {
    throw new ApiError(409, 'Could not derive a target keyword for this proposal');
  }

  await ensureNoRecentDuplicate(keyword, BLOG_PROPOSAL_TYPE);

  const [linkInventory, newsHooks] = await Promise.all([
    loadLinkInventory(keyword),
    loadNewsHooks(keyword),
  ]);

  const client = getAnthropicClient();
  const prompt = buildPrompt({
    snapshot,
    keyword,
    linkInventory,
    newsHooks,
  });
  const response = await client.messages.create({
    model: PROPOSAL_MODEL,
    max_tokens: 700,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const generated = parseGeneratedAngleResponse(extractResponseText(response));
  const slopReason = await runSlopPreflight({
    keyword,
    rawQuery: snapshot.query,
    suggestedAngle: generated.suggestedAngle,
  });
  const confidence = adjustConfidence(generated.confidence, snapshot, linkInventory.length, newsHooks.length);
  const nextStatus: SeoProposalStatus = slopReason ? 'rejected' : 'pending';

  return prisma.$transaction(async (tx) => {
    const created = await tx.seoProposal.create({
      data: {
        sourceType: 'weekly_snapshot',
        snapshotId: snapshot.id,
        proposalType: BLOG_PROPOSAL_TYPE,
        targetKeyword: keyword,
        suggestedAngle: generated.suggestedAngle,
        linkInventoryJson: linkInventory,
        newsHooksJson: newsHooks,
        rationale: generated.rationale,
        hypothesis: generated.rationale,
        confidence,
        status: nextStatus,
        rejectedReason: slopReason,
      },
      include: {
        snapshot: {
          select: {
            id: true,
            weekStart: true,
            bucket: true,
            page: true,
            query: true,
          },
        },
        clusterSnapshot: {
          select: {
            id: true,
            windowStart: true,
            windowEnd: true,
            bucket: true,
            primaryPage: true,
            representativeQuery: true,
          },
        },
        draftPost: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            publishedAt: true,
          },
        },
      },
    });

    await tx.gscWeeklySnapshot.update({
      where: { id: snapshot.id },
      data: {
        status: 'actioned',
      },
    });

    return created;
  });
}

async function createClusterProposalRow(cluster: ClusterSourceRecord): Promise<ProposalRow> {
  const topicPod = await planTopicPodForCluster(cluster.id);
  const keyword = topicPod.keyword;

  await ensureNoRecentDuplicate(keyword, BLOG_PROPOSAL_TYPE);

  const [linkInventory, newsHooks] = await Promise.all([
    loadLinkInventory(keyword),
    loadNewsHooks(keyword),
  ]);

  const client = getAnthropicClient();
  const prompt = buildClusterPrompt({
    cluster,
    keyword,
    linkInventory,
    newsHooks,
    topicPod,
  });
  const response = await client.messages.create({
    model: PROPOSAL_MODEL,
    max_tokens: 700,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const generated = parseGeneratedAngleResponse(extractResponseText(response));
  const slopReason = await runSlopPreflight({
    keyword,
    rawQuery: cluster.representativeQuery,
    suggestedAngle: generated.suggestedAngle,
  });
  const confidence = adjustClusterConfidence(
    generated.confidence,
    cluster,
    linkInventory.length,
    newsHooks.length,
    topicPod.moveType
  );
  const nextStatus: SeoProposalStatus = slopReason ? 'rejected' : 'pending';

  return prisma.$transaction(async (tx) => {
    const created = await tx.seoProposal.create({
      data: {
        sourceType: 'cluster_snapshot',
        clusterSnapshotId: cluster.id,
        proposalType: BLOG_PROPOSAL_TYPE,
        targetKeyword: keyword,
        suggestedAngle: generated.suggestedAngle,
        linkInventoryJson: linkInventory,
        newsHooksJson: newsHooks,
        rationale: generated.rationale,
        hypothesis: topicPod.hypothesis,
        topicPodJson: topicPod as Prisma.JsonObject,
        confidence,
        status: nextStatus,
        rejectedReason: slopReason,
      },
      include: {
        snapshot: {
          select: {
            id: true,
            weekStart: true,
            bucket: true,
            page: true,
            query: true,
          },
        },
        clusterSnapshot: {
          select: {
            id: true,
            windowStart: true,
            windowEnd: true,
            bucket: true,
            primaryPage: true,
            representativeQuery: true,
          },
        },
        draftPost: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            publishedAt: true,
          },
        },
      },
    });

    await tx.gscClusterSnapshot.update({
      where: { id: cluster.id },
      data: {
        status: 'actioned',
      },
    });

    return created;
  });
}

async function createKeywordOpportunityProposalRow(
  opportunity: KeywordOpportunityProposalSourceRecord,
): Promise<ProposalRow> {
  const keyword = normalizeWhitespace(opportunity.seedQuery);
  if (!keyword) {
    throw new ApiError(409, 'Could not derive a target keyword for this keyword opportunity');
  }

  if (!opportunity.targetUrl) {
    throw new ApiError(409, 'Keyword opportunity needs a concrete target URL before it can enter the proposal lane');
  }

  await ensureNoRecentDuplicate(keyword, BLOG_PROPOSAL_TYPE);

  const [linkInventory, newsHooks] = await Promise.all([
    loadLinkInventory(keyword),
    loadNewsHooks(keyword),
  ]);

  const client = getAnthropicClient();
  const prompt = buildKeywordOpportunityPrompt({
    opportunity,
    keyword,
    linkInventory,
    newsHooks,
  });
  const response = await client.messages.create({
    model: PROPOSAL_MODEL,
    max_tokens: 700,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const generated = parseGeneratedAngleResponse(extractResponseText(response));
  const slopReason = await runSlopPreflight({
    keyword,
    rawQuery: opportunity.seedQuery,
    suggestedAngle: generated.suggestedAngle,
  });
  const confidence = adjustKeywordOpportunityConfidence(
    generated.confidence,
    opportunity,
    linkInventory.length,
    newsHooks.length,
  );
  const nextStatus: SeoProposalStatus = slopReason ? 'rejected' : 'pending';
  const serperSourceRef = parseSerperSourceRef(opportunity.sourceRefJson);
  const proposalSourceRef: Prisma.JsonObject = {
    opportunityId: opportunity.id,
    opportunitySourceType: opportunity.sourceType,
    pageUrl: opportunity.targetUrl,
    pagePath: normalizePathname(opportunity.targetUrl),
    pageTypeRecommendation: opportunity.pageTypeRecommendation,
    windowStart: formatIsoDate(opportunity.createdAt),
    windowEnd: null,
    sourceBucket: opportunity.sourceType,
    sourceQuery: opportunity.seedQuery,
  };

  if (serperSourceRef) {
    proposalSourceRef.serperSample = serperSourceRef as unknown as Prisma.JsonObject;
  }

  return prisma.seoProposal.create({
    data: {
      sourceType: 'keyword_opportunity',
      proposalType: BLOG_PROPOSAL_TYPE,
      targetKeyword: keyword,
      suggestedAngle: generated.suggestedAngle,
      linkInventoryJson: linkInventory,
      newsHooksJson: newsHooks,
      rationale: generated.rationale,
      hypothesis: opportunity.rationale,
      sourceRefJson: proposalSourceRef,
      confidence,
      status: nextStatus,
      rejectedReason: slopReason,
    },
    include: {
      snapshot: {
        select: {
          id: true,
          weekStart: true,
          bucket: true,
          page: true,
          query: true,
        },
      },
      clusterSnapshot: {
        select: {
          id: true,
          windowStart: true,
          windowEnd: true,
          bucket: true,
          primaryPage: true,
          representativeQuery: true,
        },
      },
      draftPost: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
        },
      },
    },
  });
}

async function createEvergreenRoutingProposalRow(cluster: ClusterSourceRecord): Promise<ProposalRow> {
  const topicPod = await planTopicPodForCluster(cluster.id);
  const keyword = topicPod.keyword;

  await ensureNoRecentDuplicate(keyword, EVERGREEN_ROUTING_PROPOSAL_TYPE);

  const [linkInventory, newsHooks] = await Promise.all([
    loadLinkInventory(keyword),
    loadNewsHooks(keyword),
  ]);

  const suggestedAngle = buildEvergreenRoutingAngle(topicPod);
  const rationale = buildEvergreenRoutingRationale(cluster, topicPod);
  const confidence = adjustClusterConfidence(0.78, cluster, linkInventory.length, newsHooks.length, topicPod.moveType);

  return prisma.$transaction(async (tx) => {
    const created = await tx.seoProposal.create({
      data: {
        sourceType: 'cluster_snapshot',
        clusterSnapshotId: cluster.id,
        proposalType: EVERGREEN_ROUTING_PROPOSAL_TYPE,
        targetKeyword: keyword,
        suggestedAngle,
        linkInventoryJson: linkInventory,
        newsHooksJson: newsHooks,
        rationale,
        hypothesis: topicPod.hypothesis,
        topicPodJson: topicPod as Prisma.JsonObject,
        confidence,
        status: 'pending',
        rejectedReason: null,
      },
      include: {
        snapshot: {
          select: {
            id: true,
            weekStart: true,
            bucket: true,
            page: true,
            query: true,
          },
        },
        clusterSnapshot: {
          select: {
            id: true,
            windowStart: true,
            windowEnd: true,
            bucket: true,
            primaryPage: true,
            representativeQuery: true,
          },
        },
        draftPost: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            publishedAt: true,
          },
        },
      },
    });

    await tx.gscClusterSnapshot.update({
      where: { id: cluster.id },
      data: {
        status: 'actioned',
      },
    });

    return created;
  });
}

async function createPackagingFixProposalRow(audit: SeoPackagingAuditRecord): Promise<ProposalRow> {
  const packagingFixPlan = buildPackagingFixPlan(audit);
  if (packagingFixPlan.issues.length === 0) {
    throw new ApiError(409, 'This packaging audit does not have a manual packaging-fix plan');
  }

  await ensureNoRecentDuplicate(audit.pagePath, PACKAGING_FIX_PROPOSAL_TYPE);

  const sourceRef = buildPackagingSourceRef(audit);

  return prisma.seoProposal.create({
    data: {
      sourceType: 'packaging_audit',
      proposalType: PACKAGING_FIX_PROPOSAL_TYPE,
      targetKeyword: audit.pagePath,
      suggestedAngle: buildPackagingFixAngle(audit),
      linkInventoryJson: [],
      newsHooksJson: [],
      rationale: buildPackagingFixRationale(audit),
      hypothesis: buildPackagingFixHypothesis(audit),
      sourceRefJson: sourceRef as Prisma.JsonObject,
      packagingFixJson: packagingFixPlan as Prisma.JsonObject,
      confidence: scorePackagingFixConfidence(audit),
      status: 'pending',
      rejectedReason: null,
    },
    include: {
      snapshot: {
        select: {
          id: true,
          weekStart: true,
          bucket: true,
          page: true,
          query: true,
        },
      },
      clusterSnapshot: {
        select: {
          id: true,
          windowStart: true,
          windowEnd: true,
          bucket: true,
          primaryPage: true,
          representativeQuery: true,
        },
      },
      draftPost: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
        },
      },
    },
  });
}

function getProposalStatusWhere(status: SeoProposalStatusFilter) {
  if (status === 'all') {
    return {};
  }

  if (status === 'approved') {
    return {
      status: {
        in: ['approved', 'shipped'],
      },
    };
  }

  return { status };
}

export async function listSeoProposals(options: {
  status?: SeoProposalStatusFilter;
  page?: number;
  limit?: number;
}): Promise<SeoProposalListResult> {
  const status = options.status ?? 'all';
  const page = Math.max(1, options.page ?? 1);
  const limit = clampLimit(options.limit, 25);
  const skip = (page - 1) * limit;
  const where = getProposalStatusWhere(status);

  const [rows, total, pendingCount, draftingCount, approvedCount, rejectedCount, shippedCount, allCount] = await Promise.all([
    prisma.seoProposal.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      include: {
        snapshot: {
          select: {
            id: true,
            weekStart: true,
            bucket: true,
            page: true,
            query: true,
          },
        },
        clusterSnapshot: {
          select: {
            id: true,
            windowStart: true,
            windowEnd: true,
            bucket: true,
            primaryPage: true,
            representativeQuery: true,
          },
        },
        draftPost: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            publishedAt: true,
          },
        },
      },
    }),
    prisma.seoProposal.count({ where }),
    prisma.seoProposal.count({ where: { status: 'pending' } }),
    prisma.seoProposal.count({ where: { status: 'drafting' } }),
    prisma.seoProposal.count({ where: { status: { in: ['approved', 'shipped'] } } }),
    prisma.seoProposal.count({ where: { status: 'rejected' } }),
    prisma.seoProposal.count({ where: { status: 'shipped' } }),
    prisma.seoProposal.count(),
  ]);

  return {
    data: rows.map(serializeProposal),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    meta: {
      counts: {
        all: allCount,
        pending: pendingCount,
        drafting: draftingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        shipped: shippedCount,
      },
    },
  };
}

export async function generateProposal(snapshotId: string): Promise<SeoProposalRecord> {
  const snapshot = await loadSnapshot(snapshotId);
  const created = await createProposalRow(snapshot);
  return serializeProposal(created);
}

export async function generateProposalFromCluster(clusterId: string): Promise<SeoProposalRecord> {
  const cluster = await loadClusterSource(clusterId);
  const created = await createClusterProposalRow(cluster);
  return serializeProposal(created);
}

export async function generateProposalFromKeywordOpportunity(opportunityId: string): Promise<SeoProposalRecord> {
  const opportunity = await loadKeywordOpportunitySource(opportunityId);
  const created = await createKeywordOpportunityProposalRow(opportunity);
  return serializeProposal(created);
}

export async function generateEvergreenRoutingProposal(clusterId: string): Promise<SeoProposalRecord> {
  const cluster = await loadClusterSource(clusterId);
  const created = await createEvergreenRoutingProposalRow(cluster);
  return serializeProposal(created);
}

export async function generatePackagingFixProposal(auditId: string): Promise<SeoProposalRecord> {
  const audit = await getSeoPackagingAudit(auditId);
  if (!audit) {
    throw ApiError.notFound('SEO packaging audit not found');
  }

  const created = await createPackagingFixProposalRow(audit);
  return serializeProposal(created);
}

async function getProposalById(proposalId: string): Promise<ProposalRow> {
  const proposal = await prisma.seoProposal.findUnique({
    where: { id: proposalId },
    include: {
      snapshot: {
        select: {
          id: true,
          weekStart: true,
          bucket: true,
          page: true,
          query: true,
        },
      },
      clusterSnapshot: {
        select: {
          id: true,
          windowStart: true,
          windowEnd: true,
          bucket: true,
          primaryPage: true,
          representativeQuery: true,
        },
      },
      draftPost: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
        },
      },
    },
  });

  if (!proposal) {
    throw ApiError.notFound('SEO proposal not found');
  }

  return proposal;
}

export async function approveSeoProposal(proposalId: string): Promise<{
  proposal: SeoProposalRecord;
  handoff: SeoProposalHandoff;
}> {
  const proposal = await getProposalById(proposalId);
  const serializedCurrent = serializeProposal(proposal);
  if (proposal.status !== 'pending') {
    throw new ApiError(409, 'Only pending proposals can be approved');
  }

  const nextStatus: SeoProposalStatus = (
    serializedCurrent.handoff.mode === 'manual_routing_review'
    || serializedCurrent.handoff.mode === 'manual_packaging_fix'
  )
    ? 'approved'
    : 'drafting';

  const updated = await prisma.seoProposal.update({
    where: { id: proposalId },
    data: {
      status: nextStatus,
      actedAt: new Date(),
    },
    include: {
      snapshot: {
        select: {
          id: true,
          weekStart: true,
          bucket: true,
          page: true,
          query: true,
        },
      },
      clusterSnapshot: {
        select: {
          id: true,
          windowStart: true,
          windowEnd: true,
          bucket: true,
          primaryPage: true,
          representativeQuery: true,
        },
      },
      draftPost: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
        },
      },
    },
  });

  const serialized = serializeProposal(updated);
  return {
    proposal: serialized,
    handoff: serialized.handoff,
  };
}

export async function rejectSeoProposal(proposalId: string, reason: string): Promise<SeoProposalRecord> {
  const trimmedReason = trimToNull(reason);
  if (!trimmedReason) {
    throw ApiError.badRequest('Reject reason is required');
  }

  const proposal = await getProposalById(proposalId);
  if (proposal.status === 'shipped') {
    throw new ApiError(409, 'Published proposals cannot be rejected');
  }

  const updated = await prisma.seoProposal.update({
    where: { id: proposalId },
    data: {
      status: 'rejected',
      actedAt: new Date(),
      rejectedReason: trimmedReason,
    },
    include: {
      snapshot: {
        select: {
          id: true,
          weekStart: true,
          bucket: true,
          page: true,
          query: true,
        },
      },
      clusterSnapshot: {
        select: {
          id: true,
          windowStart: true,
          windowEnd: true,
          bucket: true,
          primaryPage: true,
          representativeQuery: true,
        },
      },
      draftPost: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
        },
      },
    },
  });

  return serializeProposal(updated);
}

export async function linkProposalDraft(proposalId: string, draftPostId: string): Promise<SeoProposalRecord> {
  const nextDraftPostId = trimToNull(draftPostId);
  if (!nextDraftPostId) {
    throw ApiError.badRequest('draftPostId is required');
  }

  const [proposal, draftPost] = await Promise.all([
    getProposalById(proposalId),
    prisma.blogPost.findUnique({
      where: { id: nextDraftPostId },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        publishedAt: true,
      },
    }),
  ]);

  if (!draftPost) {
    throw ApiError.notFound('Blog post draft not found');
  }

  const serializedProposal = serializeProposal(proposal);
  if (serializedProposal.handoff.mode !== 'blog_draft') {
    throw new ApiError(409, 'This proposal does not use the blog-draft handoff flow');
  }

  if (proposal.status !== 'drafting' && proposal.status !== 'approved') {
    throw new ApiError(409, 'Only drafting or approved proposals can link a draft post');
  }

  const nextStatus: SeoProposalStatus = draftPost.status === 'published' ? 'shipped' : 'approved';

  const updated = await prisma.seoProposal.update({
    where: { id: proposalId },
    data: {
      draftPostId: draftPost.id,
      status: nextStatus,
      actedAt: new Date(),
    },
    include: {
      snapshot: {
        select: {
          id: true,
          weekStart: true,
          bucket: true,
          page: true,
          query: true,
        },
      },
      clusterSnapshot: {
        select: {
          id: true,
          windowStart: true,
          windowEnd: true,
          bucket: true,
          primaryPage: true,
          representativeQuery: true,
        },
      },
      draftPost: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
        },
      },
    },
  });

  await ensureExperimentForProposalLink(updated.id);
  return serializeProposal(updated);
}

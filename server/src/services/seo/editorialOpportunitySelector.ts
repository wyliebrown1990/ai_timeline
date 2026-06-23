import {
  listSeoProposals,
  type SeoProposalRecord,
  type SeoProposalStatusFilter,
} from './briefGenerator';
import {
  listKeywordOpportunities,
  type KeywordOpportunityRecord,
} from './keywordDiscovery';
import { prisma } from '../../db';

const MAX_POSTS_PER_RUN = 3;
const MAX_AUTO_PUBLISH_PER_RUN = 3;
const MAX_CANDIDATES_PER_RUN = 8;
const MIN_PROPOSAL_DRAFT_CONFIDENCE = 0.6;
const MIN_PROPOSAL_AUTO_PUBLISH_CONFIDENCE = 0.7;
const MIN_KEYWORD_DRAFT_SCORE = 40;
const MIN_KEYWORD_AUTO_PUBLISH_SCORE = 70;
const WEEKLY_FALLBACK_ID_PREFIX = 'weekly-news-fallback:';
const MIN_FALLBACK_ARTICLE_SCORE = 0.5;
const FALLBACK_ARTICLE_WINDOW_DAYS = 21;
const FALLBACK_ARTICLE_LIMIT = 12;
const FALLBACK_AUTO_PUBLISH_MIN_SCORE = 60;
const FALLBACK_GUARDED_SOURCE_SCORE_CAP = 74;
const TRUSTED_FALLBACK_HOST_SUFFIXES = [
  'openai.com',
  'anthropic.com',
  'deepmind.google',
  'ai.googleblog.com',
  'blog.google',
  'microsoft.com',
  'nvidia.com',
  'meta.com',
  'ibm.com',
  'arxiv.org',
  'nature.com',
  'science.org',
  'mit.edu',
  'stanford.edu',
  'berkeley.edu',
  'cmu.edu',
  'theverge.com',
  'techcrunch.com',
  'wired.com',
  'technologyreview.com',
  'semianalysis.com',
] as const;
const DRAFT_ONLY_FALLBACK_HOST_PARTS = [
  'beehiiv',
  'substack',
  'medium.com',
  'x.com',
  'twitter.com',
  'reddit.com',
  'youtube.com',
  'facebook.com',
  'instagram.com',
] as const;

export type EditorialOpportunitySourceType = 'proposal' | 'keyword';
export type EditorialOpportunityAction = 'auto_publish' | 'draft_only';

export interface EditorialOpportunity {
  id: string;
  sourceType: EditorialOpportunitySourceType;
  action: EditorialOpportunityAction;
  title: string;
  targetKeyword: string;
  rationale: string;
  confidence: number;
  source: SeoProposalRecord | KeywordOpportunityRecord;
}

export interface DeferredEditorialOpportunity {
  id: string;
  sourceType: EditorialOpportunitySourceType;
  title: string;
  reason: string;
}

export interface EditorialOpportunitySelection {
  selected: EditorialOpportunity[];
  deferred: DeferredEditorialOpportunity[];
}

function isAllowedProposalSource(sourceType: string): boolean {
  return (
    sourceType === 'content_gap' ||
    sourceType === 'trend_signal' ||
    sourceType === 'cluster_snapshot' ||
    sourceType === 'keyword_opportunity' ||
    sourceType === 'gsc_cluster' ||
    sourceType === 'google_trends' ||
    sourceType === 'serp_sample'
  );
}

function isAllowedKeywordSource(row: KeywordOpportunityRecord): boolean {
  return (
    row.sourceType === 'gsc_cluster' ||
    row.sourceType === 'google_trends' ||
    row.sourceType === 'serp_sample' ||
    row.sourceType === 'editorial_seed'
  );
}

function proposalTitle(proposal: SeoProposalRecord): string {
  return proposal.suggestedAngle || proposal.targetKeyword;
}

function keywordTitle(row: KeywordOpportunityRecord): string {
  return row.targetUrl ? `${row.seedQuery} -> ${row.targetUrl}` : row.seedQuery;
}

function isEligibleProposal(proposal: SeoProposalRecord): string | null {
  if (proposal.proposalType !== 'blog_post' || proposal.handoff.mode !== 'blog_draft') {
    return 'Only blog-draft proposals can enter Tuesday editorial automation.';
  }

  if (proposal.draftPost) {
    return 'Proposal already has a linked blog post.';
  }

  if (proposal.status === 'approved' || proposal.status === 'drafting') {
    return null;
  }

  if (proposal.status !== 'pending') {
    return `Proposal status ${proposal.status} is not eligible.`;
  }

  if (!isAllowedProposalSource(proposal.sourceType)) {
    return `Proposal source ${proposal.sourceType} is not an autonomous source.`;
  }

  if (proposal.confidence < MIN_PROPOSAL_DRAFT_CONFIDENCE) {
    return `Proposal confidence ${proposal.confidence.toFixed(2)} is below ${MIN_PROPOSAL_DRAFT_CONFIDENCE.toFixed(2)}.`;
  }

  return null;
}

function isEligibleKeyword(row: KeywordOpportunityRecord): string | null {
  if (row.status !== 'scored' && row.status !== 'promoted') {
    return `Keyword status ${row.status} is not scored or promoted.`;
  }

  if (!isAllowedKeywordSource(row)) {
    return `Keyword source ${row.sourceType} is not an autonomous source.`;
  }

  if (row.pageTypeRecommendation !== 'blog_post') {
    return `Keyword recommendation ${row.pageTypeRecommendation} is not blog_post.`;
  }

  if (row.overallScore < MIN_KEYWORD_DRAFT_SCORE) {
    return `Keyword score ${row.overallScore} is below ${MIN_KEYWORD_DRAFT_SCORE}.`;
  }

  return null;
}

function proposalCanAutoPublish(proposal: SeoProposalRecord): boolean {
  return proposal.confidence >= MIN_PROPOSAL_AUTO_PUBLISH_CONFIDENCE;
}

function keywordCanAutoPublish(row: KeywordOpportunityRecord): boolean {
  if (isWeeklyFallbackKeyword(row)) {
    return row.overallScore >= FALLBACK_AUTO_PUBLISH_MIN_SCORE;
  }

  return row.sourceType !== 'editorial_seed' && row.overallScore >= MIN_KEYWORD_AUTO_PUBLISH_SCORE;
}

export function isWeeklyFallbackKeyword(row: Pick<KeywordOpportunityRecord, 'id'>): boolean {
  return row.id.startsWith(WEEKLY_FALLBACK_ID_PREFIX);
}

function blogSlugFromTargetUrl(targetUrl: string | null): string | null {
  if (!targetUrl) return null;

  try {
    const url = new URL(targetUrl);
    if (url.hostname !== 'letaiexplainai.com') return null;
    const match = url.pathname.match(/^\/blog\/([^/]+)\/?$/);
    return match?.[1] ?? null;
  } catch {
    const match = targetUrl.match(/^\/blog\/([^/]+)\/?$/);
    return match?.[1] ?? null;
  }
}

async function removeAlreadyHandledKeywords(
  rows: KeywordOpportunityRecord[],
): Promise<KeywordOpportunityRecord[]> {
  if (rows.length === 0) {
    return rows;
  }

  const targetSlugs = rows
    .map((row) => blogSlugFromTargetUrl(row.targetUrl))
    .filter((slug): slug is string => Boolean(slug));
  const targetKeywords = rows.map((row) => row.seedQuery);

  const [existingPosts, terminalProposals] = await Promise.all([
    targetSlugs.length
      ? prisma.blogPost.findMany({
          where: {
            slug: { in: targetSlugs },
            status: 'published',
          },
          select: { slug: true },
        })
      : Promise.resolve([]),
    prisma.seoProposal.findMany({
      where: {
        targetKeyword: { in: targetKeywords },
        OR: [
          { status: 'rejected' },
          {
            status: { in: ['approved', 'shipped'] },
            draftPostId: { not: null },
          },
        ],
      },
      select: { targetKeyword: true },
    }),
  ]);

  const handledSlugs = new Set(existingPosts.map((post) => post.slug));
  const terminalKeywords = new Set(terminalProposals.map((proposal) => proposal.targetKeyword));

  return rows.filter((row) => {
    const targetSlug = blogSlugFromTargetUrl(row.targetUrl);
    return !(targetSlug && handledSlugs.has(targetSlug)) && !terminalKeywords.has(row.seedQuery);
  });
}

export function selectEditorialOpportunities(input: {
  proposals: SeoProposalRecord[];
  keywords: KeywordOpportunityRecord[];
  maxPosts?: number;
  maxAutoPublish?: number;
  maxCandidates?: number;
}): EditorialOpportunitySelection {
  const maxPosts = Math.max(0, Math.min(MAX_POSTS_PER_RUN, input.maxPosts ?? MAX_POSTS_PER_RUN));
  const maxCandidates = Math.max(0, Math.min(MAX_CANDIDATES_PER_RUN, input.maxCandidates ?? maxPosts));
  const maxAutoPublish = Math.max(0, Math.min(MAX_AUTO_PUBLISH_PER_RUN, input.maxAutoPublish ?? MAX_AUTO_PUBLISH_PER_RUN));
  const selected: EditorialOpportunity[] = [];
  const deferred: DeferredEditorialOpportunity[] = [];
  let autoPublishCount = 0;

  const proposalRows = [...input.proposals].sort((a, b) => {
    const statusRank = (proposal: SeoProposalRecord) => (
      proposal.status === 'approved' ? 0 : proposal.status === 'drafting' ? 1 : 2
    );
    return statusRank(a) - statusRank(b) || b.confidence - a.confidence;
  });

  function selectKeyword(row: KeywordOpportunityRecord): void {
    const title = keywordTitle(row);
    const reason = isEligibleKeyword(row);
    if (reason) {
      deferred.push({ id: row.id, sourceType: 'keyword', title, reason });
      return;
    }

    if (selected.length >= maxCandidates) {
      deferred.push({ id: row.id, sourceType: 'keyword', title, reason: 'Deferred because the Tuesday candidate cap was reached.' });
      return;
    }

    const action: EditorialOpportunityAction =
      autoPublishCount < maxAutoPublish && keywordCanAutoPublish(row) ? 'auto_publish' : 'draft_only';
    if (action === 'auto_publish') autoPublishCount += 1;
    selected.push({
      id: row.id,
      sourceType: 'keyword',
      action,
      title,
      targetKeyword: row.seedQuery,
      rationale: row.rationale,
      confidence: row.overallScore / 100,
      source: row,
    });
  }

  function selectProposal(proposal: SeoProposalRecord): void {
    const title = proposalTitle(proposal);
    const reason = isEligibleProposal(proposal);
    if (reason) {
      deferred.push({ id: proposal.id, sourceType: 'proposal', title, reason });
      return;
    }

    if (selected.length >= maxCandidates) {
      deferred.push({ id: proposal.id, sourceType: 'proposal', title, reason: 'Deferred because the Tuesday candidate cap was reached.' });
      return;
    }

    const action: EditorialOpportunityAction =
      autoPublishCount < maxAutoPublish && proposalCanAutoPublish(proposal) ? 'auto_publish' : 'draft_only';
    if (action === 'auto_publish') autoPublishCount += 1;
    selected.push({
      id: proposal.id,
      sourceType: 'proposal',
      action,
      title,
      targetKeyword: proposal.targetKeyword,
      rationale: proposal.rationale,
      confidence: proposal.confidence,
      source: proposal,
    });
  }

  const weeklyNewsRows = input.keywords
    .filter(isWeeklyFallbackKeyword)
    .sort((a, b) => b.overallScore - a.overallScore);
  const discoveryRows = input.keywords
    .filter((row) => !isWeeklyFallbackKeyword(row))
    .sort((a, b) => b.overallScore - a.overallScore);

  for (const row of weeklyNewsRows) selectKeyword(row);
  for (const row of discoveryRows) selectKeyword(row);
  for (const proposal of proposalRows) selectProposal(proposal);

  return { selected, deferred };
}

async function loadProposals(status: SeoProposalStatusFilter): Promise<SeoProposalRecord[]> {
  const result = await listSeoProposals({ status, page: 1, limit: 100 });
  return result.data;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[‘’']s\b/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function articleTitleToKeyword(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .replace(/\s[-|:]\s.*$/, '')
    .trim()
    .slice(0, 96);
}

function hostnameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isTrustedFallbackSource(url: string | null | undefined): boolean {
  const host = hostnameFromUrl(url);
  if (!host) return false;
  return TRUSTED_FALLBACK_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function isDraftOnlyFallbackSource(url: string | null | undefined, sourceName: string | null | undefined): boolean {
  const haystack = `${hostnameFromUrl(url) ?? ''} ${sourceName ?? ''}`.toLowerCase();
  return DRAFT_ONLY_FALLBACK_HOST_PARTS.some((part) => haystack.includes(part));
}

function scoreWeeklyFallbackArticle(input: {
  relevanceScore: number;
  externalUrl: string | null | undefined;
  sourceName: string | null | undefined;
}): { score: number; sourceTrustNote: string } {
  if (isTrustedFallbackSource(input.externalUrl)) {
    return {
      score: Math.max(60, input.relevanceScore),
      sourceTrustNote: 'trusted-source fallback; eligible for auto-publish only if quality gates also pass',
    };
  }

  const sourceTrustNote = isDraftOnlyFallbackSource(input.externalUrl, input.sourceName)
    ? 'guarded fallback from newsletter/social/community source; quality gates and source discipline decide publishability'
    : 'guarded fallback until corroborated by a trusted or primary source; quality gates and source discipline decide publishability';

  return {
    score: Math.min(FALLBACK_GUARDED_SOURCE_SCORE_CAP, Math.max(60, input.relevanceScore)),
    sourceTrustNote,
  };
}

async function loadWeeklyNewsFallbackKeywords(): Promise<KeywordOpportunityRecord[]> {
  const publishedAfter = new Date(Date.now() - FALLBACK_ARTICLE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const articles = await prisma.ingestedArticle.findMany({
    where: {
      publishedAt: { gte: publishedAfter },
      isDuplicate: false,
      analysisStatus: 'complete',
      relevanceScore: { gte: MIN_FALLBACK_ARTICLE_SCORE },
    },
    orderBy: [
      { relevanceScore: 'desc' },
      { publishedAt: 'desc' },
    ],
    include: {
      source: {
        select: { name: true },
      },
    },
    take: FALLBACK_ARTICLE_LIMIT,
  });

  const targetSlugs = articles.map((article) => slugify(articleTitleToKeyword(article.title))).filter(Boolean);
  const existingPosts = targetSlugs.length
    ? await prisma.blogPost.findMany({
        where: {
          slug: { in: targetSlugs },
          status: 'published',
        },
        select: { slug: true },
      })
    : [];
  const handledSlugs = new Set(existingPosts.map((post) => post.slug));

  return articles
    .map((article): KeywordOpportunityRecord => {
      const keyword = articleTitleToKeyword(article.title);
      const relevanceScore = Math.round((article.relevanceScore ?? MIN_FALLBACK_ARTICLE_SCORE) * 1000) / 10;
      const fallbackScore = scoreWeeklyFallbackArticle({
        relevanceScore,
        externalUrl: article.externalUrl,
        sourceName: article.source?.name,
      });
      return {
        id: `${WEEKLY_FALLBACK_ID_PREFIX}${article.id}`,
        sourceType: 'editorial_seed',
        dedupeKey: `weekly-news-fallback:${article.id}`,
        seedQuery: keyword,
        clusterKey: null,
        clusterSnapshotId: null,
        targetIntent: 'informational',
        demandProxy: Math.round(relevanceScore),
        competitionProxy: 45,
        laeaFitScore: Math.max(60, Math.round(relevanceScore)),
        overallScore: fallbackScore.score,
        pageTypeRecommendation: 'blog_post',
        targetUrl: null,
        rationale: `Weekly fallback from recent ingested article "${article.title}"${article.source?.name ? ` (${article.source.name})` : ''}. Source: ${article.externalUrl}. Source gate: ${fallbackScore.sourceTrustNote}. Use this when GSC-backed SEO opportunities are stale, duplicated, or packaging-only so LAEA still drafts fresh, relevant editorial coverage.`,
        status: 'scored',
        linkedExperimentId: null,
        sourceRef: null,
        createdAt: article.ingestedAt.toISOString(),
        updatedAt: article.ingestedAt.toISOString(),
      };
    })
    .filter((row) => row.seedQuery.length > 0 && !handledSlugs.has(slugify(row.seedQuery)));
}

export async function loadEditorialOpportunityBacklog(): Promise<{
  proposals: SeoProposalRecord[];
  keywords: KeywordOpportunityRecord[];
}> {
  const [approved, drafting, pending, scoredKeywords, promotedKeywords, fallbackKeywords] = await Promise.all([
    loadProposals('approved'),
    loadProposals('drafting'),
    loadProposals('pending'),
    listKeywordOpportunities({ status: 'scored', page: 1, limit: 25 }),
    listKeywordOpportunities({ status: 'promoted', page: 1, limit: 25 }),
    loadWeeklyNewsFallbackKeywords(),
  ]);

  const keywords = await removeAlreadyHandledKeywords([
    ...scoredKeywords.data,
    ...promotedKeywords.data,
    ...fallbackKeywords,
  ]);

  return {
    proposals: [...approved, ...drafting, ...pending],
    keywords,
  };
}

export const editorialOpportunitySelectorTestInternals = {
  scoreWeeklyFallbackArticle,
  isEligibleKeyword,
  isEligibleProposal,
};

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
const MAX_AUTO_PUBLISH_PER_RUN = 2;
const MIN_PROPOSAL_DRAFT_CONFIDENCE = 0.6;
const MIN_PROPOSAL_AUTO_PUBLISH_CONFIDENCE = 0.7;
const MIN_KEYWORD_DRAFT_SCORE = 40;
const MIN_KEYWORD_AUTO_PUBLISH_SCORE = 70;

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
  return row.sourceType !== 'editorial_seed' && row.overallScore >= MIN_KEYWORD_AUTO_PUBLISH_SCORE;
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
            status: { not: 'archived' },
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
}): EditorialOpportunitySelection {
  const maxPosts = Math.max(0, Math.min(MAX_POSTS_PER_RUN, input.maxPosts ?? MAX_POSTS_PER_RUN));
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

  for (const proposal of proposalRows) {
    const title = proposalTitle(proposal);
    const reason = isEligibleProposal(proposal);
    if (reason) {
      deferred.push({ id: proposal.id, sourceType: 'proposal', title, reason });
      continue;
    }

    if (selected.length >= maxPosts) {
      deferred.push({ id: proposal.id, sourceType: 'proposal', title, reason: 'Deferred because the Tuesday post cap was reached.' });
      continue;
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

  const keywordRows = [...input.keywords].sort((a, b) => b.overallScore - a.overallScore);
  for (const row of keywordRows) {
    const title = keywordTitle(row);
    const reason = isEligibleKeyword(row);
    if (reason) {
      deferred.push({ id: row.id, sourceType: 'keyword', title, reason });
      continue;
    }

    if (selected.length >= maxPosts) {
      deferred.push({ id: row.id, sourceType: 'keyword', title, reason: 'Deferred because the Tuesday post cap was reached.' });
      continue;
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

  return { selected, deferred };
}

async function loadProposals(status: SeoProposalStatusFilter): Promise<SeoProposalRecord[]> {
  const result = await listSeoProposals({ status, page: 1, limit: 100 });
  return result.data;
}

export async function loadEditorialOpportunityBacklog(): Promise<{
  proposals: SeoProposalRecord[];
  keywords: KeywordOpportunityRecord[];
}> {
  const [approved, drafting, pending, scoredKeywords, promotedKeywords] = await Promise.all([
    loadProposals('approved'),
    loadProposals('drafting'),
    loadProposals('pending'),
    listKeywordOpportunities({ status: 'scored', page: 1, limit: 25 }),
    listKeywordOpportunities({ status: 'promoted', page: 1, limit: 25 }),
  ]);

  const keywords = await removeAlreadyHandledKeywords([
    ...scoredKeywords.data,
    ...promotedKeywords.data,
  ]);

  return {
    proposals: [...approved, ...drafting, ...pending],
    keywords,
  };
}

export const editorialOpportunitySelectorTestInternals = {
  isEligibleKeyword,
  isEligibleProposal,
};

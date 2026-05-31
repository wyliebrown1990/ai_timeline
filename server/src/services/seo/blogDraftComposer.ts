import {
  findDuplicateEntityReason,
  loadLinkInventory,
  loadNewsHooks,
  parseSerperSourceRef,
  runSlopPreflight,
  type SeoProposalLinkInventoryItem,
  type SeoProposalNewsHook,
  type SeoProposalRecord,
} from './briefGenerator';
import type { KeywordOpportunityRecord } from './keywordDiscovery';
import type { SerperKeywordSourceRef } from './serperClient';
import type { EditorialOpportunity } from './editorialOpportunitySelector';
import { isWeeklyFallbackKeyword } from './editorialOpportunitySelector';

export interface EditorialBlogCompositionBrief {
  targetKeyword: string;
  angle: string;
  rationale: string;
  linkInventory: SeoProposalLinkInventoryItem[];
  newsHooks: SeoProposalNewsHook[];
  serperSourceRef: SerperKeywordSourceRef | null;
  winnabilityNotes: string[];
  blockers: string[];
}

function proposalSource(opportunity: EditorialOpportunity): SeoProposalRecord | null {
  return opportunity.sourceType === 'proposal' ? opportunity.source as SeoProposalRecord : null;
}

function keywordSource(opportunity: EditorialOpportunity): KeywordOpportunityRecord | null {
  return opportunity.sourceType === 'keyword' ? opportunity.source as KeywordOpportunityRecord : null;
}

function keywordSerperSource(row: KeywordOpportunityRecord | null): SerperKeywordSourceRef | null {
  if (!row?.sourceRef) return null;
  if ('vendor' in row.sourceRef && row.sourceRef.vendor === 'serper') {
    return parseSerperSourceRef(row.sourceRef);
  }
  return null;
}

function buildWinnabilityNotes(input: {
  opportunity: EditorialOpportunity;
  linkInventory: SeoProposalLinkInventoryItem[];
  serperSourceRef: SerperKeywordSourceRef | null;
}): string[] {
  const notes: string[] = [];
  const keyword = keywordSource(input.opportunity);

  if (input.linkInventory.length >= 3) {
    notes.push(`Strong internal-link base: ${input.linkInventory.length} reusable entity links.`);
  } else {
    notes.push(`Weak internal-link base: ${input.linkInventory.length} reusable entity links.`);
  }

  if (input.serperSourceRef) {
    notes.push(`SERP sample reused from cache key ${input.serperSourceRef.requestKey}; competition proxy ${input.serperSourceRef.competitionProxy}.`);
    if (input.serperSourceRef.strongDomainCount >= 3) {
      notes.push('SERP has several authoritative domains, so auto-publish needs a narrower atlas-specific thesis.');
    }
  } else {
    notes.push('No attached Serper source sample; drafting may continue, but auto-publish must rely on stricter fit gates.');
  }

  if (keyword) {
    notes.push(`Portfolio score ${keyword.overallScore}; demand ${keyword.demandProxy}; competition ${keyword.competitionProxy}; LAEA fit ${keyword.laeaFitScore}.`);
  }

  return notes;
}

function broadKeywordReason(keyword: string): string | null {
  const normalized = keyword.trim().toLowerCase();
  const singleWordBroad = new Set([
    'ai',
    'artificial intelligence',
    'machine learning',
    'deep learning',
    'openai',
    'chatgpt',
    'llm',
    'llms',
  ]);
  return singleWordBroad.has(normalized)
    ? `Target keyword "${keyword}" is too broad for autonomous publishing without a narrower LAEA angle.`
    : null;
}

export async function buildEditorialBlogCompositionBrief(
  opportunity: EditorialOpportunity,
): Promise<EditorialBlogCompositionBrief> {
  const proposal = proposalSource(opportunity);
  const keyword = keywordSource(opportunity);
  const [loadedLinks, loadedNewsHooks, slopReason, duplicateEntityReason] = await Promise.all([
    proposal?.linkInventory?.length ? Promise.resolve(proposal.linkInventory) : loadLinkInventory(opportunity.targetKeyword),
    proposal?.newsHooks?.length ? Promise.resolve(proposal.newsHooks) : loadNewsHooks(opportunity.targetKeyword),
    runSlopPreflight({
      keyword: opportunity.targetKeyword,
      rawQuery: proposal?.sourceQuery ?? keyword?.seedQuery ?? null,
      suggestedAngle: opportunity.title,
    }),
    findDuplicateEntityReason(opportunity.targetKeyword, proposal?.sourceQuery ?? keyword?.seedQuery ?? null),
  ]);
  const serperSourceRef = keywordSerperSource(keyword);
  const blockers = [
    slopReason,
    duplicateEntityReason,
    broadKeywordReason(opportunity.targetKeyword),
  ].filter((reason): reason is string => Boolean(reason));

  if (loadedLinks.length < 3 && !isWeeklyFallbackKeyword(opportunity)) {
    blockers.push('Fewer than 3 strong internal links are available for this topic.');
  }

  return {
    targetKeyword: opportunity.targetKeyword,
    angle: opportunity.title,
    rationale: opportunity.rationale,
    linkInventory: loadedLinks,
    newsHooks: loadedNewsHooks,
    serperSourceRef,
    winnabilityNotes: buildWinnabilityNotes({
      opportunity,
      linkInventory: loadedLinks,
      serperSourceRef,
    }),
    blockers,
  };
}

import { describe, expect, it } from '@jest/globals';
import type { SeoProposalRecord } from '../../../server/src/services/seo/briefGenerator';
import type { KeywordOpportunityRecord } from '../../../server/src/services/seo/keywordDiscovery';
import { selectEditorialOpportunities } from '../../../server/src/services/seo/editorialOpportunitySelector';

function proposal(overrides: Partial<SeoProposalRecord>): SeoProposalRecord {
  return {
    id: 'proposal-1',
    sourceType: 'content_gap',
    sourceId: 'source-1',
    proposalType: 'blog_post',
    targetKeyword: 'ai timeline',
    suggestedAngle: 'AI timeline explained',
    rationale: 'Strong content gap.',
    hypothesis: null,
    confidence: 0.8,
    status: 'pending',
    rejectedReason: null,
    createdAt: '2026-05-05T00:00:00.000Z',
    actedAt: null,
    sourceWindowStart: '2026-04-24',
    sourceWindowEnd: null,
    sourceBucket: 'content_gap',
    sourcePage: 'https://letaiexplainai.com/news',
    sourceQuery: 'ai timeline',
    linkInventory: [],
    newsHooks: [],
    topicPod: null,
    routingPlan: null,
    packagingFixPlan: null,
    handoff: {
      mode: 'blog_draft',
      label: 'Blog draft',
      topic: 'AI timeline explained',
      keyword: 'ai timeline',
      newsUrl: null,
      command: null,
      proposalPath: '/admin/seo-insights/proposals',
      guidance: 'Draft a post.',
    },
    draftPost: null,
    ...overrides,
  };
}

function keyword(overrides: Partial<KeywordOpportunityRecord>): KeywordOpportunityRecord {
  return {
    id: 'keyword-1',
    sourceType: 'serp_sample',
    dedupeKey: 'keyword-1',
    seedQuery: 'ai agents explained',
    clusterKey: null,
    clusterSnapshotId: null,
    targetIntent: 'informational',
    demandProxy: 80,
    competitionProxy: 35,
    laeaFitScore: 90,
    overallScore: 75,
    pageTypeRecommendation: 'blog_post',
    targetUrl: null,
    rationale: 'Good fit.',
    status: 'scored',
    linkedExperimentId: null,
    sourceRef: null,
    createdAt: '2026-05-05T00:00:00.000Z',
    updatedAt: '2026-05-05T00:00:00.000Z',
    ...overrides,
  };
}

describe('editorialOpportunitySelector', () => {
  it('prioritizes approved proposals and enforces post and auto-publish caps', () => {
    const result = selectEditorialOpportunities({
      proposals: [
        proposal({ id: 'pending-high', status: 'pending', confidence: 0.95 }),
        proposal({ id: 'approved-mid', status: 'approved', confidence: 0.8 }),
        proposal({ id: 'drafting-mid', status: 'drafting', confidence: 0.82 }),
      ],
      keywords: [
        keyword({ id: 'keyword-high', overallScore: 90 }),
      ],
      maxPosts: 3,
      maxAutoPublish: 2,
    });

    expect(result.selected.map((row) => row.id)).toEqual([
      'approved-mid',
      'drafting-mid',
      'pending-high',
    ]);
    expect(result.selected.map((row) => row.action)).toEqual([
      'auto_publish',
      'auto_publish',
      'draft_only',
    ]);
    expect(result.deferred).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'keyword-high', reason: 'Deferred because the Tuesday post cap was reached.' }),
    ]));
  });

  it('allows editorial seeds and lower-scored keywords into draft-only mode', () => {
    const result = selectEditorialOpportunities({
      proposals: [],
      keywords: [
        keyword({ id: 'seed', sourceType: 'editorial_seed', overallScore: 99 }),
        keyword({ id: 'draftable', sourceType: 'serp_sample', overallScore: 45 }),
        keyword({ id: 'weak', sourceType: 'serp_sample', overallScore: 39 }),
        keyword({ id: 'not-blog', sourceType: 'serp_sample', pageTypeRecommendation: 'landing_page', overallScore: 95 }),
      ],
    });

    expect(result.selected.map((row) => [row.id, row.action])).toEqual([
      ['seed', 'draft_only'],
      ['draftable', 'draft_only'],
    ]);
    expect(result.deferred).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'weak', reason: 'Keyword score 39 is below 40.' }),
      expect.objectContaining({ id: 'not-blog', reason: 'Keyword recommendation landing_page is not blog_post.' }),
    ]));
  });

  it('keeps promoted keyword rows eligible for the post composer', () => {
    const result = selectEditorialOpportunities({
      proposals: [],
      keywords: [
        keyword({ id: 'promoted-auto', status: 'promoted', overallScore: 82 }),
        keyword({ id: 'promoted-draft', status: 'promoted', overallScore: 55 }),
      ],
      maxPosts: 3,
      maxAutoPublish: 1,
    });

    expect(result.selected.map((row) => [row.id, row.action])).toEqual([
      ['promoted-auto', 'auto_publish'],
      ['promoted-draft', 'draft_only'],
    ]);
  });

  it('allows cluster and keyword-opportunity proposals and drafts lower-confidence ideas', () => {
    const result = selectEditorialOpportunities({
      proposals: [
        proposal({ id: 'cluster', sourceType: 'cluster_snapshot', confidence: 0.97 }),
        proposal({ id: 'keyword-proposal', sourceType: 'keyword_opportunity', sourceBucket: 'editorial_seed', confidence: 0.65 }),
      ],
      keywords: [],
      maxPosts: 3,
      maxAutoPublish: 2,
    });

    expect(result.selected.map((row) => [row.id, row.action])).toEqual([
      ['cluster', 'auto_publish'],
      ['keyword-proposal', 'draft_only'],
    ]);
  });

  it('rejects proposals below draft threshold or already linked to posts', () => {
    const result = selectEditorialOpportunities({
      proposals: [
        proposal({ id: 'low-confidence', confidence: 0.59 }),
        proposal({
          id: 'linked',
          status: 'approved',
          draftPost: {
            id: 'post-1',
            slug: 'post-1',
            title: 'Post 1',
            status: 'draft',
            publishedAt: null,
          },
        }),
      ],
      keywords: [],
    });

    expect(result.selected).toHaveLength(0);
    expect(result.deferred).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'low-confidence', reason: 'Proposal confidence 0.59 is below 0.60.' }),
      expect.objectContaining({ id: 'linked', reason: 'Proposal already has a linked blog post.' }),
    ]));
  });
});

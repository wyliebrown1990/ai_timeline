import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockMessageCreate = jest.fn();
const mockSnapshotFindUnique = jest.fn();
const mockSnapshotUpdate = jest.fn();
const mockClusterFindUnique = jest.fn();
const mockClusterUpdate = jest.fn();
const mockKeywordOpportunityFindUnique = jest.fn();
const mockProposalFindFirst = jest.fn();
const mockProposalFindUnique = jest.fn();
const mockProposalFindMany = jest.fn();
const mockProposalCount = jest.fn();
const mockProposalCreate = jest.fn();
const mockProposalUpdate = jest.fn();
const mockArticleFindMany = jest.fn();
const mockGlossaryTermFindFirst = jest.fn();
const mockMilestoneFindFirst = jest.fn();
const mockBlogPostFindUnique = jest.fn();
const mockSearchPersons = jest.fn();
const mockSearchOrganizations = jest.fn();
const mockSearchGlossaryTerms = jest.fn();
const mockSearchMilestones = jest.fn();
const mockMatchPerson = jest.fn();
const mockMatchOrganization = jest.fn();
const mockTransaction = jest.fn();
const mockEnsureExperimentForProposalLink = jest.fn();
const mockPlanTopicPodForCluster = jest.fn();
const mockGetSeoPackagingAudit = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockMessageCreate,
    },
  })),
}));

const mockTx = {
  seoProposal: {
    create: mockProposalCreate,
  },
  gscWeeklySnapshot: {
    update: mockSnapshotUpdate,
  },
  gscClusterSnapshot: {
    update: mockClusterUpdate,
  },
};

jest.mock('../../../server/src/db', () => ({
  prisma: {
    gscWeeklySnapshot: {
      findUnique: mockSnapshotFindUnique,
      update: mockSnapshotUpdate,
    },
    gscClusterSnapshot: {
      findUnique: mockClusterFindUnique,
      update: mockClusterUpdate,
    },
    keywordOpportunity: {
      findUnique: mockKeywordOpportunityFindUnique,
    },
    seoProposal: {
      findFirst: mockProposalFindFirst,
      findUnique: mockProposalFindUnique,
      findMany: mockProposalFindMany,
      count: mockProposalCount,
      create: mockProposalCreate,
      update: mockProposalUpdate,
    },
    ingestedArticle: {
      findMany: mockArticleFindMany,
    },
    glossaryTerm: {
      findFirst: mockGlossaryTermFindFirst,
    },
    milestone: {
      findFirst: mockMilestoneFindFirst,
    },
    blogPost: {
      findUnique: mockBlogPostFindUnique,
    },
    $transaction: mockTransaction,
  },
}));

jest.mock('../../../server/src/services/persons', () => ({
  search: mockSearchPersons,
}));

jest.mock('../../../server/src/services/organizations', () => ({
  search: mockSearchOrganizations,
}));

jest.mock('../../../server/src/services/glossary', () => ({
  search: mockSearchGlossaryTerms,
}));

jest.mock('../../../server/src/services/milestones', () => ({
  search: mockSearchMilestones,
}));

jest.mock('../../../server/src/services/entityMatcher', () => ({
  matchPerson: mockMatchPerson,
  matchOrganization: mockMatchOrganization,
}));

jest.mock('../../../server/src/services/seo/experimentLedger', () => ({
  ensureExperimentForProposalLink: mockEnsureExperimentForProposalLink,
}));

jest.mock('../../../server/src/services/seo/topicPodPlanner', () => ({
  planTopicPodForCluster: mockPlanTopicPodForCluster,
}));

jest.mock('../../../server/src/services/seo/serpPackagingAudit', () => ({
  getSeoPackagingAudit: mockGetSeoPackagingAudit,
}));

import {
  generateEvergreenRoutingProposal,
  generatePackagingFixProposal,
  generateProposal,
  generateProposalFromCluster,
  generateProposalFromKeywordOpportunity,
  linkProposalDraft,
  loadLinkInventory,
} from '../../../server/src/services/seo/briefGenerator';

function buildAnthropicResponse(text: string) {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

function buildSnapshot(overrides: Partial<{
  id: string;
  weekStart: string;
  bucket: string;
  page: string;
  query: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  status: string;
}> = {}) {
  return {
    id: overrides.id ?? 'snapshot_1',
    weekStart: new Date(`${overrides.weekStart ?? '2026-04-21'}T00:00:00.000Z`),
    bucket: overrides.bucket ?? 'content_gap',
    page: overrides.page ?? 'https://letaiexplainai.com/news',
    query: overrides.query === undefined ? 'AI agents in healthcare' : overrides.query,
    clicks: overrides.clicks ?? 8,
    impressions: overrides.impressions ?? 140,
    ctr: overrides.ctr ?? 0.057,
    position: overrides.position ?? 4.2,
    status: overrides.status ?? 'open',
  };
}

function buildCreatedProposal(overrides: Partial<{
  sourceType: string;
  clusterSnapshotId: string | null;
  proposalType: string;
  targetKeyword: string;
  suggestedAngle: string;
  rationale: string;
  hypothesis: string | null;
  topicPodJson: unknown;
  sourceRefJson: unknown;
  packagingFixJson: unknown;
  confidence: number;
  status: string;
  rejectedReason: string | null;
  linkInventoryJson: unknown;
  newsHooksJson: unknown;
  primaryPage: string;
  representativeQuery: string;
  sourcePage: string;
  sourceQuery: string | null;
  draftPostId: string | null;
  draftPost: {
    id: string;
    slug: string;
    title: string;
    status: string;
    publishedAt: Date | null;
  } | null;
}> = {}) {
  const snapshot = buildSnapshot();
  return {
    id: 'proposal_1',
    sourceType: overrides.sourceType ?? 'weekly_snapshot',
    snapshotId: (
      overrides.sourceType === 'cluster_snapshot'
      || overrides.sourceType === 'packaging_audit'
      || overrides.sourceType === 'keyword_opportunity'
    ) ? null : snapshot.id,
    clusterSnapshotId: overrides.clusterSnapshotId ?? null,
    proposalType: overrides.proposalType ?? 'blog_post',
    targetKeyword: overrides.targetKeyword ?? 'AI agents in healthcare',
    suggestedAngle: overrides.suggestedAngle ?? 'Why AI agent rollouts in healthcare stall at the last mile',
    linkInventoryJson: overrides.linkInventoryJson ?? [],
    newsHooksJson: overrides.newsHooksJson ?? [],
    rationale: overrides.rationale ?? 'Healthcare AI agents look timely, but deployment friction is the real thesis.',
    hypothesis: overrides.hypothesis ?? (overrides.rationale ?? 'Healthcare AI agents look timely, but deployment friction is the real thesis.'),
    topicPodJson: overrides.topicPodJson ?? null,
    sourceRefJson: overrides.sourceRefJson ?? (overrides.sourceType === 'packaging_audit' ? {
      auditId: 'packaging_1',
      pageUrl: overrides.sourcePage ?? 'https://letaiexplainai.com/news',
      pagePath: '/news',
      pageType: 'news_index',
      windowStart: '2026-01-29',
      windowEnd: '2026-04-28',
      sourceBucket: 'serp_packaging',
      sourceQuery: null,
    } : null),
    packagingFixJson: overrides.packagingFixJson ?? null,
    confidence: overrides.confidence ?? 0.88,
    status: overrides.status ?? 'pending',
    draftPostId: overrides.draftPostId ?? null,
    createdAt: new Date('2026-04-30T12:00:00.000Z'),
    actedAt: null,
    rejectedReason: overrides.rejectedReason ?? null,
    snapshot: (
      overrides.sourceType === 'cluster_snapshot'
      || overrides.sourceType === 'packaging_audit'
      || overrides.sourceType === 'keyword_opportunity'
    ) ? null : {
      id: snapshot.id,
      weekStart: snapshot.weekStart,
      bucket: snapshot.bucket,
      page: overrides.sourcePage ?? snapshot.page,
      query: overrides.sourceQuery === undefined ? snapshot.query : overrides.sourceQuery,
    },
    clusterSnapshot: overrides.sourceType === 'cluster_snapshot'
      ? {
          id: overrides.clusterSnapshotId ?? 'cluster_1',
          windowStart: new Date('2026-04-01T00:00:00.000Z'),
          windowEnd: new Date('2026-04-28T00:00:00.000Z'),
          bucket: 'cluster_content_gap',
          primaryPage: overrides.primaryPage ?? 'https://letaiexplainai.com/timeline',
          representativeQuery: overrides.representativeQuery ?? overrides.targetKeyword ?? 'AI timeline',
        }
      : null,
    draftPost: overrides.draftPost ?? null,
  };
}

function buildCluster(overrides: Partial<{
  id: string;
  representativeQuery: string;
  primaryPage: string;
  bucket: string;
  impressions: number;
}> = {}) {
  return {
    id: overrides.id ?? 'cluster_1',
    windowStart: new Date('2026-04-01T00:00:00.000Z'),
    windowEnd: new Date('2026-04-28T00:00:00.000Z'),
    bucket: overrides.bucket ?? 'cluster_content_gap',
    primaryPage: overrides.primaryPage ?? 'https://letaiexplainai.com/timeline',
    representativeQuery: overrides.representativeQuery ?? 'AI timeline',
    clicks: 0,
    impressions: overrides.impressions ?? 95,
    ctr: 0,
    position: 79.3,
    status: 'open',
  };
}

function buildKeywordOpportunity(overrides: Partial<{
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
}> = {}) {
  return {
    id: overrides.id ?? 'kw_1',
    sourceType: overrides.sourceType ?? 'editorial_seed',
    seedQuery: overrides.seedQuery ?? 'ai agent memory',
    targetIntent: overrides.targetIntent ?? 'topic_theme',
    demandProxy: overrides.demandProxy ?? 64,
    competitionProxy: overrides.competitionProxy ?? 38,
    laeaFitScore: overrides.laeaFitScore ?? 82,
    overallScore: overrides.overallScore ?? 69.9,
    pageTypeRecommendation: overrides.pageTypeRecommendation ?? 'blog_post',
    targetUrl: overrides.targetUrl ?? 'https://letaiexplainai.com/blog/ai-agent-memory',
    rationale: overrides.rationale ?? 'Manual seed from strategy review.',
    status: overrides.status ?? 'scored',
    sourceRefJson: overrides.sourceRefJson ?? null,
    createdAt: new Date('2026-05-01T12:00:00.000Z'),
  };
}

describe('briefGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';

    mockSnapshotFindUnique.mockResolvedValue(buildSnapshot());
    mockClusterFindUnique.mockResolvedValue(buildCluster());
    mockKeywordOpportunityFindUnique.mockResolvedValue(buildKeywordOpportunity());
    mockProposalFindFirst.mockResolvedValue(null);
    mockProposalFindUnique.mockResolvedValue(null);
    mockProposalFindMany.mockResolvedValue([]);
    mockProposalCount.mockResolvedValue(0);
    mockArticleFindMany.mockResolvedValue([]);
    mockGlossaryTermFindFirst.mockResolvedValue(null);
    mockMilestoneFindFirst.mockResolvedValue(null);
    mockBlogPostFindUnique.mockResolvedValue(null);
    mockSearchPersons.mockResolvedValue([]);
    mockSearchOrganizations.mockResolvedValue([]);
    mockSearchGlossaryTerms.mockResolvedValue([]);
    mockSearchMilestones.mockResolvedValue({ results: [], total: 0 });
    mockMatchPerson.mockResolvedValue({ matched: false, confidence: 0, suggestedAction: 'create_draft', matchType: 'none' });
    mockMatchOrganization.mockResolvedValue({ matched: false, confidence: 0, suggestedAction: 'create_draft', matchType: 'none' });
    mockEnsureExperimentForProposalLink.mockResolvedValue(undefined);
    mockGetSeoPackagingAudit.mockResolvedValue({
      id: 'packaging_1',
      windowStart: '2026-01-29',
      windowEnd: '2026-04-28',
      pageUrl: 'https://letaiexplainai.com/news',
      pagePath: '/news',
      pageType: 'news_index',
      title: 'AI News - Latest Artificial Intelligence Headlines & Updates',
      h1: 'AI News Hub',
      description: 'Stay current with the latest AI news and developments.',
      canonicalPath: '/news',
      impressions: 80,
      clicks: 0,
      ctr: 0,
      position: 8.7,
      issueCount: 1,
      criticalCount: 0,
      experimentActive: false,
      issueTypes: ['title_link_risk'],
      issues: [
        {
          id: 'title_link_risk:secondary',
          type: 'title_link_risk',
          severity: 'warning',
          label: 'Archive page is attracting impressions without clicks',
          details: '80 impressions produced no clicks.',
          recommendedFix: 'Strengthen the page title and description.',
        },
      ],
      structuredDataTypes: [],
      evergreenRecommendation: null,
    });
    mockPlanTopicPodForCluster.mockResolvedValue({
      keyword: 'AI timeline',
      sourceType: 'cluster_snapshot',
      sourceId: 'cluster_1',
      sourceLabel: '90d content gap',
      primaryPage: 'https://letaiexplainai.com/timeline',
      moveType: 'create_new',
      hypothesis: 'A dedicated AI timeline explainer should outperform the generic hub page.',
      canonicalDestination: {
        type: 'new_blog_post',
        label: 'New blog explainer: AI Timeline',
        path: '/blog/ai-timeline',
        exists: false,
        reason: 'No stronger destination exists yet.',
      },
      companionAssets: [],
      internalLinkOpportunities: [],
    });
    mockTransaction.mockImplementation(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));
    mockProposalCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      buildCreatedProposal({
        sourceType: (data.sourceType as string | undefined) ?? 'weekly_snapshot',
        clusterSnapshotId: (data.clusterSnapshotId as string | null | undefined) ?? null,
        proposalType: (data.proposalType as string | undefined) ?? 'blog_post',
        targetKeyword: data.targetKeyword as string,
        suggestedAngle: data.suggestedAngle as string,
        rationale: data.rationale as string,
        hypothesis: (data.hypothesis as string | null | undefined) ?? null,
        topicPodJson: data.topicPodJson ?? null,
        sourceRefJson: data.sourceRefJson ?? null,
        packagingFixJson: data.packagingFixJson ?? null,
        confidence: data.confidence as number,
        status: data.status as string,
        rejectedReason: (data.rejectedReason as string | null | undefined) ?? null,
        linkInventoryJson: data.linkInventoryJson,
        newsHooksJson: data.newsHooksJson ?? [],
        sourcePage: (data.sourceRefJson as { pageUrl?: string } | undefined)?.pageUrl ?? undefined,
        sourceQuery: (data.sourceRefJson as { sourceQuery?: string | null } | undefined)?.sourceQuery ?? undefined,
      })
    );
    mockSnapshotUpdate.mockResolvedValue({});
    mockClusterUpdate.mockResolvedValue({});
  });

  it('broadens link-inventory lookup beyond the raw headline string', async () => {
    mockSearchOrganizations.mockResolvedValue([
      {
        id: 'nvidia',
        slug: 'nvidia',
        name: 'NVIDIA',
      },
    ]);
    mockSearchGlossaryTerms.mockResolvedValue([
      {
        id: 'ai-agents',
        slug: 'ai-agents',
        term: 'AI agents',
      },
    ]);
    mockSearchMilestones.mockResolvedValue({
      results: [
        {
          id: 'E2024_BLACKWELL',
          title: 'Blackwell announcement',
        },
      ],
      total: 1,
    });

    const result = await loadLinkInventory('NVIDIA agents in your laptop?');

    expect(mockSearchOrganizations).toHaveBeenCalledWith('NVIDIA', expect.any(Number));
    expect(mockSearchGlossaryTerms).toHaveBeenCalledWith('agents', expect.any(Number));
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'organization',
        id: 'nvidia',
        path: '/organizations/nvidia',
      }),
      expect.objectContaining({
        entityType: 'glossary_term',
        id: 'ai-agents',
        path: '/glossary/ai-agents',
      }),
      expect.objectContaining({
        entityType: 'milestone',
        id: 'E2024_BLACKWELL',
        path: '/events/E2024_BLACKWELL',
      }),
    ]));
  });

  it('excludes glossary records without a canonical public slug', async () => {
    mockSearchGlossaryTerms.mockResolvedValue([
      {
        id: 'draft-concept-id',
        slug: null,
        term: 'Teleoperated Humanoid Robot',
      },
      {
        id: 'machine-learning-id',
        slug: 'machine-learning',
        term: 'Machine Learning',
      },
    ]);

    const result = await loadLinkInventory('teleoperated humanoid robot');

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/glossary/machine-learning' }),
    ]));
    expect(result).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/glossary/teleoperated-humanoid-robot' }),
    ]));
  });

  it('rejects generic listicle angles before persisting them as pending work', async () => {
    mockMessageCreate.mockResolvedValue(buildAnthropicResponse(JSON.stringify({
      suggestedAngle: 'Top 10 AI agents in healthcare',
      rationale: 'This listicle would be timely for healthcare readers.',
      confidence: 0.7,
    })));

    const result = await generateProposal('snapshot_1');

    expect(result.status).toBe('rejected');
    expect(result.rejectedReason).toContain('Generic listicle');
    expect(mockProposalCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'rejected',
      }),
    }));
    expect(mockSnapshotUpdate).not.toHaveBeenCalled();
  });

  it('rejects angles that duplicate an existing glossary entity', async () => {
    mockSnapshotFindUnique.mockResolvedValue(buildSnapshot({
      query: 'Transformer',
      page: 'https://letaiexplainai.com/news',
    }));
    mockGlossaryTermFindFirst.mockResolvedValue({
      term: 'Transformer',
      slug: 'transformer',
    });
    mockMessageCreate.mockResolvedValue(buildAnthropicResponse(JSON.stringify({
      suggestedAngle: 'Why transformer economics now matter more than model size alone',
      rationale: 'The timing is good, but this exact keyword already belongs to a glossary entity.',
      confidence: 0.72,
    })));

    const result = await generateProposal('snapshot_1');

    expect(result.status).toBe('rejected');
    expect(result.rejectedReason).toContain('/glossary/transformer');
  });

  it('rejects quoted entity queries when a quoted phrase already maps to an existing milestone page', async () => {
    mockSnapshotFindUnique.mockResolvedValue(buildSnapshot({
      query: '"turing award" "multiple winners" quiz',
      page: 'https://letaiexplainai.com/news',
    }));
    mockMilestoneFindFirst.mockResolvedValue({
      id: 'milestone_turing_award',
      title: 'Turing Award',
    });
    mockMessageCreate.mockResolvedValue(buildAnthropicResponse(JSON.stringify({
      suggestedAngle: 'Why the Turing Award\'s move toward shared laureates changed how AI progress gets recognized',
      rationale: 'This seems timely, but the underlying entity already has a canonical destination.',
      confidence: 0.71,
    })));

    const result = await generateProposal('snapshot_1');

    expect(result.status).toBe('rejected');
    expect(result.targetKeyword).toBe('turing award multiple winners');
    expect(result.rejectedReason).toContain('/events/milestone_turing_award');
  });

  it('rejects voice-drift angles that use hypey banned phrasing', async () => {
    mockMessageCreate.mockResolvedValue(buildAnthropicResponse(JSON.stringify({
      suggestedAngle: 'In this article, we will explore the revolutionary power of AI agents in healthcare',
      rationale: 'The topic is timely, but the phrasing drifts off voice.',
      confidence: 0.68,
    })));

    const result = await generateProposal('snapshot_1');

    expect(result.status).toBe('rejected');
    expect(result.rejectedReason).toContain('Voice drift');
  });

  it('persists a healthy proposal with elevated confidence when the graph and news context are strong', async () => {
    mockSearchPersons.mockResolvedValue([
      { id: 'person_1', canonicalName: 'Demis Hassabis', slug: 'demis-hassabis' },
      { id: 'person_2', canonicalName: 'Fei-Fei Li', slug: 'fei-fei-li' },
    ]);
    mockSearchOrganizations.mockResolvedValue([
      { id: 'org_1', name: 'OpenAI', slug: 'openai' },
    ]);
    mockSearchGlossaryTerms.mockResolvedValue([
      { id: 'glossary_1', term: 'AI agent', slug: 'ai-agent' },
    ]);
    mockArticleFindMany.mockResolvedValue([
      {
        id: 'article_1',
        title: 'Hospitals test AI agents for clinician workflows',
        externalUrl: 'https://example.com/hospitals-test-ai-agents',
        publishedAt: new Date('2026-04-28T12:00:00.000Z'),
        source: { name: 'Example Source' },
      },
    ]);
    mockMessageCreate.mockResolvedValue(buildAnthropicResponse(JSON.stringify({
      suggestedAngle: 'Why AI agent pilots in healthcare keep hitting workflow bottlenecks',
      rationale: 'The query is rising, the entity graph is rich, and recent coverage gives the post a real news hook.',
      confidence: 0.73,
    })));

    const result = await generateProposal('snapshot_1');

    expect(result.status).toBe('pending');
    expect(result.linkInventory).toHaveLength(4);
    expect(result.newsHooks).toHaveLength(1);
    expect(result.confidence).toBeGreaterThan(0.85);
    expect(result.handoff.mode).toBe('blog_draft');
    expect(result.handoff.command).toContain('/AIBlogDraft topic:');
    expect(mockSnapshotUpdate).toHaveBeenCalledWith({
      where: { id: 'snapshot_1' },
      data: { status: 'actioned' },
    });
  });

  it('refuses to generate a duplicate proposal for the same keyword inside the 30-day window', async () => {
    mockProposalFindFirst.mockResolvedValue({
      id: 'existing_proposal',
    });

    await expect(generateProposal('snapshot_1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'A recent proposal already exists for this keyword',
    });

    expect(mockProposalCreate).not.toHaveBeenCalled();
  });

  it('generates a cluster-backed proposal with topic pod context', async () => {
    mockMessageCreate.mockResolvedValue(buildAnthropicResponse(JSON.stringify({
      suggestedAngle: 'Why AI timeline queries need a dedicated explainer instead of a generic hub page',
      rationale: 'The clustered demand is consistent enough to justify a canonical explainer page with a clear thesis.',
      confidence: 0.82,
    })));

    const result = await generateProposalFromCluster('cluster_1');

    expect(result.sourceType).toBe('cluster_snapshot');
    expect(result.proposalType).toBe('blog_post');
    expect(result.sourceBucket).toBe('cluster_content_gap');
    expect(result.topicPod?.canonicalDestination.path).toBe('/blog/ai-timeline');
    expect(mockClusterUpdate).toHaveBeenCalledWith({
      where: { id: 'cluster_1' },
      data: { status: 'actioned' },
    });
  });

  it('auto-routes cluster proposal generation to evergreen when a stronger canonical destination already exists', async () => {
    mockPlanTopicPodForCluster.mockResolvedValue({
      keyword: 'in context learning',
      sourceType: 'cluster_snapshot',
      sourceId: 'cluster_1',
      sourceLabel: '90d topic theme',
      primaryPage: 'https://letaiexplainai.com/explained/in-context-learning',
      moveType: 'expand_existing',
      hypothesis: 'The glossary page should absorb this recurring clustered demand instead of spawning a duplicate blog post.',
      canonicalDestination: {
        type: 'entity_page',
        label: 'In-Context Learning',
        path: '/glossary/in-context-learning',
        exists: true,
        reason: 'LAEA already has a stronger exact-match destination at /glossary/in-context-learning.',
      },
      companionAssets: [],
      internalLinkOpportunities: [],
    });
    mockClusterFindUnique.mockResolvedValue(buildCluster({
      bucket: 'cluster_topic_theme',
      primaryPage: 'https://letaiexplainai.com/explained/in-context-learning',
      representativeQuery: 'in context learning',
    }));
    mockProposalCreate.mockResolvedValueOnce(buildCreatedProposal({
      sourceType: 'cluster_snapshot',
      clusterSnapshotId: 'cluster_1',
      proposalType: 'evergreen_routing',
      targetKeyword: 'in context learning',
      suggestedAngle: 'Expand /glossary/in-context-learning so it becomes the canonical destination for this recurring search demand.',
      rationale: 'The glossary page should absorb this recurring clustered demand instead of spawning a duplicate blog post. Current landing page: /explained/in-context-learning. Recommended canonical destination: /glossary/in-context-learning.',
      hypothesis: 'The glossary page should absorb this recurring clustered demand instead of spawning a duplicate blog post.',
      topicPodJson: {
        keyword: 'in context learning',
        sourceType: 'cluster_snapshot',
        sourceId: 'cluster_1',
        sourceLabel: '90d topic theme',
        primaryPage: 'https://letaiexplainai.com/explained/in-context-learning',
        moveType: 'expand_existing',
        hypothesis: 'The glossary page should absorb this recurring clustered demand instead of spawning a duplicate blog post.',
        canonicalDestination: {
          type: 'entity_page',
          label: 'In-Context Learning',
          path: '/glossary/in-context-learning',
          exists: true,
          reason: 'LAEA already has a stronger exact-match destination at /glossary/in-context-learning.',
        },
        companionAssets: [],
        internalLinkOpportunities: [],
      },
      confidence: 0.86,
      status: 'pending',
      rejectedReason: null,
      linkInventoryJson: [],
      newsHooksJson: [],
      primaryPage: 'https://letaiexplainai.com/explained/in-context-learning',
      representativeQuery: 'in context learning',
    }));

    const result = await generateProposalFromCluster('cluster_1');

    expect(result.proposalType).toBe('evergreen_routing');
    expect(result.status).toBe('pending');
    expect(result.handoff.mode).toBe('manual_routing_review');
    expect(result.handoff.command).toBeNull();
    expect(result.routingPlan).toMatchObject({
      currentPath: '/explained/in-context-learning',
      targetPath: '/glossary/in-context-learning',
      moveType: 'expand_existing',
    });
    expect(mockMessageCreate).not.toHaveBeenCalled();
    expect(mockClusterUpdate).toHaveBeenCalledWith({
      where: { id: 'cluster_1' },
      data: { status: 'actioned' },
    });
  });

  it('keeps a cluster open when a generated blog proposal is auto-rejected', async () => {
    mockMessageCreate.mockResolvedValue(buildAnthropicResponse(JSON.stringify({
      suggestedAngle: 'In this article, we will explore the revolutionary power of in-context learning',
      rationale: 'The topic is interesting, but the angle drifts into banned hype phrasing.',
      confidence: 0.7,
    })));
    mockClusterFindUnique.mockResolvedValue(buildCluster({
      bucket: 'cluster_topic_theme',
      representativeQuery: 'in context learning',
      primaryPage: 'https://letaiexplainai.com/explained/in-context-learning',
    }));
    mockPlanTopicPodForCluster.mockResolvedValue({
      keyword: 'in context learning',
      sourceType: 'cluster_snapshot',
      sourceId: 'cluster_1',
      sourceLabel: '90d topic theme',
      primaryPage: 'https://letaiexplainai.com/explained/in-context-learning',
      moveType: 'create_new',
      hypothesis: 'A fresh editorial angle could outperform the fragmented cluster landing.',
      canonicalDestination: {
        type: 'new_blog_post',
        label: 'New blog explainer: In-Context Learning',
        path: '/blog/in-context-learning',
        exists: false,
        reason: 'No stronger destination exists yet.',
      },
      companionAssets: [],
      internalLinkOpportunities: [],
    });

    const result = await generateProposalFromCluster('cluster_1');

    expect(result.status).toBe('rejected');
    expect(result.rejectedReason).toContain('Voice drift');
    expect(mockClusterUpdate).not.toHaveBeenCalled();
  });

  it('generates a manual keyword-opportunity proposal for editorial seeds', async () => {
    mockMessageCreate.mockResolvedValue(buildAnthropicResponse(JSON.stringify({
      suggestedAngle: 'Why AI agent memory is becoming the real bottleneck for trustworthy agents',
      rationale: 'The keyword is specific, the target page is clear, and the operator rationale points at a credible LAEA explainer angle.',
      confidence: 0.76,
    })));

    const result = await generateProposalFromKeywordOpportunity('kw_1');

    expect(result.sourceType).toBe('keyword_opportunity');
    expect(result.proposalType).toBe('blog_post');
    expect(result.sourceBucket).toBe('editorial_seed');
    expect(result.sourcePage).toBe('https://letaiexplainai.com/blog/ai-agent-memory');
    expect(result.sourceQuery).toBe('ai agent memory');
    expect(result.hypothesis).toBe('Manual seed from strategy review.');
    expect(result.handoff.mode).toBe('blog_draft');
    expect(mockKeywordOpportunityFindUnique).toHaveBeenCalledWith({
      where: { id: 'kw_1' },
      select: expect.objectContaining({
        id: true,
        sourceType: true,
        seedQuery: true,
        targetUrl: true,
        sourceRefJson: true,
      }),
    });
  });

  it('uses attached SERP evidence when generating a proposal from a SERP-sampled opportunity', async () => {
    mockKeywordOpportunityFindUnique.mockResolvedValue(buildKeywordOpportunity({
      sourceType: 'serp_sample',
      seedQuery: 'ai timeline',
      targetUrl: 'https://letaiexplainai.com/blog/ai-timeline',
      rationale: 'SERP validation shows mixed competition and a clear blog destination.',
      sourceRefJson: {
        vendor: 'serper',
        requestKey: 'us:en:qdr:m:1:ai timeline',
        originSourceType: 'gsc_cluster',
        originOpportunityId: 'kw_origin_1',
        originDedupeKey: 'gsc_cluster:ai-timeline',
        query: 'ai timeline',
        country: 'us',
        language: 'en',
        dateRange: 'qdr:m',
        page: 1,
        sampledAt: '2026-05-01T20:53:00.000Z',
        expiresAt: '2026-05-29T20:53:00.000Z',
        organicCount: 10,
        peopleAlsoAskCount: 4,
        relatedSearchCount: 6,
        topDomains: ['coursera.org', 'reddit.com', 'globaia.org'],
        strongDomainCount: 1,
        forumDomainCount: 1,
        videoDomainCount: 0,
        competitionProxy: 48,
        competitionReason: 'Top results include coursera.org, reddit.com, globaia.org; the SERP is mixed with 1 forum result(s) and 0 video result(s).',
        effectiveCostUsd: 0.001,
      },
    }));
    mockMessageCreate.mockResolvedValue(buildAnthropicResponse(JSON.stringify({
      suggestedAngle: 'Why searchers looking for an AI timeline still need a narrative guide instead of another course landing page',
      rationale: 'The first page is mixed enough that LAEA can win with a tighter historical thesis and clearer entity links.',
      confidence: 0.72,
    })));

    const result = await generateProposalFromKeywordOpportunity('kw_1');

    expect(result.sourceBucket).toBe('serp_sample');
    expect(result.sourcePage).toBe('https://letaiexplainai.com/blog/ai-timeline');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(mockMessageCreate).toHaveBeenCalledWith(expect.objectContaining({
      messages: [
        expect.objectContaining({
          content: expect.stringContaining('Live SERP evidence:'),
        }),
      ],
    }));
    expect(mockMessageCreate).toHaveBeenCalledWith(expect.objectContaining({
      messages: [
        expect.objectContaining({
          content: expect.stringContaining('Top domains: coursera.org, reddit.com, globaia.org'),
        }),
      ],
    }));
    expect(mockProposalCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceRefJson: expect.objectContaining({
          sourceBucket: 'serp_sample',
          serperSample: expect.objectContaining({
            vendor: 'serper',
            query: 'ai timeline',
            competitionProxy: 48,
          }),
        }),
      }),
    }));
  });

  it('creates an evergreen-routing proposal without calling Anthropic when a stronger existing destination is recommended', async () => {
    mockPlanTopicPodForCluster.mockResolvedValue({
      keyword: 'AI timeline',
      sourceType: 'cluster_snapshot',
      sourceId: 'cluster_1',
      sourceLabel: '90d content gap',
      primaryPage: 'https://letaiexplainai.com/news',
      moveType: 'optimize_current',
      hypothesis: 'The timeline hub should be the canonical destination for this recurring demand.',
      canonicalDestination: {
        type: 'timeline',
        label: 'AI Timeline',
        path: '/timeline',
        exists: true,
        reason: 'The existing timeline page already fits the intent.',
      },
      companionAssets: [],
      internalLinkOpportunities: [],
    });
    mockClusterFindUnique.mockResolvedValue(buildCluster({
      primaryPage: 'https://letaiexplainai.com/news',
      representativeQuery: 'ai timeline',
    }));
    mockProposalCreate.mockResolvedValueOnce(buildCreatedProposal({
      sourceType: 'cluster_snapshot',
      clusterSnapshotId: 'cluster_1',
      proposalType: 'evergreen_routing',
      targetKeyword: 'AI timeline',
      suggestedAngle: 'Retarget /timeline so it becomes the canonical destination for this recurring search demand.',
      rationale: 'The timeline hub should be the canonical destination for this recurring demand. Current landing page: /news. Recommended canonical destination: /timeline.',
      hypothesis: 'The timeline hub should be the canonical destination for this recurring demand.',
      topicPodJson: {
        keyword: 'AI timeline',
        sourceType: 'cluster_snapshot',
        sourceId: 'cluster_1',
        sourceLabel: '90d content gap',
        primaryPage: 'https://letaiexplainai.com/news',
        moveType: 'optimize_current',
        hypothesis: 'The timeline hub should be the canonical destination for this recurring demand.',
        canonicalDestination: {
          type: 'timeline',
          label: 'AI Timeline',
          path: '/timeline',
          exists: true,
          reason: 'The existing timeline page already fits the intent.',
        },
        companionAssets: [],
        internalLinkOpportunities: [],
      },
      confidence: 0.84,
      status: 'pending',
      rejectedReason: null,
      linkInventoryJson: [],
      newsHooksJson: [],
      primaryPage: 'https://letaiexplainai.com/news',
      representativeQuery: 'ai timeline',
    }));

    const result = await generateEvergreenRoutingProposal('cluster_1');

    expect(result.proposalType).toBe('evergreen_routing');
    expect(result.handoff.mode).toBe('manual_routing_review');
    expect(result.handoff.command).toBeNull();
    expect(result.routingPlan).toMatchObject({
      currentPath: '/news',
      targetPath: '/timeline',
      moveType: 'optimize_current',
    });
    expect(mockMessageCreate).not.toHaveBeenCalled();
    expect(mockClusterUpdate).toHaveBeenCalledWith({
      where: { id: 'cluster_1' },
      data: { status: 'actioned' },
    });
  });

  it('creates a packaging-fix proposal without calling Anthropic', async () => {
    mockProposalCreate.mockResolvedValueOnce(buildCreatedProposal({
      sourceType: 'packaging_audit',
      proposalType: 'packaging_fix',
      targetKeyword: '/news',
      suggestedAngle: 'Tighten the title signal on /news so the page presents a clearer answer in search.',
      rationale: '/news already has 80 impressions but is still showing a packaging gap.',
      hypothesis: 'If /news gets clearer title packaging, click-through should improve on the existing impression base.',
      sourceRefJson: {
        auditId: 'packaging_1',
        pageUrl: 'https://letaiexplainai.com/news',
        pagePath: '/news',
        pageType: 'news_index',
        windowStart: '2026-01-29',
        windowEnd: '2026-04-28',
        sourceBucket: 'serp_packaging',
        sourceQuery: null,
      },
      packagingFixJson: {
        pagePath: '/news',
        pageType: 'news_index',
        title: 'AI News - Latest Artificial Intelligence Headlines & Updates',
        h1: 'AI News Hub',
        description: 'Stay current with the latest AI news and developments.',
        canonicalPath: '/news',
        structuredDataTypes: [],
        issueTypes: ['title_link_risk'],
        issues: [
          {
            id: 'title_link_risk:secondary',
            type: 'title_link_risk',
            severity: 'warning',
            label: 'Archive page is attracting impressions without clicks',
            details: '80 impressions produced no clicks.',
            recommendedFix: 'Strengthen the page title and description.',
          },
        ],
      },
      confidence: 0.76,
      status: 'pending',
      rejectedReason: null,
      linkInventoryJson: [],
      newsHooksJson: [],
      sourcePage: 'https://letaiexplainai.com/news',
      sourceQuery: null,
    }));

    const result = await generatePackagingFixProposal('packaging_1');

    expect(result.proposalType).toBe('packaging_fix');
    expect(result.handoff.mode).toBe('manual_packaging_fix');
    expect(result.handoff.command).toBeNull();
    expect(result.sourceType).toBe('packaging_audit');
    expect(result.packagingFixPlan).toMatchObject({
      pagePath: '/news',
      issueTypes: ['title_link_risk'],
    });
    expect(mockMessageCreate).not.toHaveBeenCalled();
  });

  it('refuses to generate a duplicate packaging-fix proposal for the same page inside the 30-day window', async () => {
    mockProposalFindFirst.mockResolvedValueOnce({
      id: 'existing_packaging_proposal',
    });

    await expect(generatePackagingFixProposal('packaging_1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'A recent packaging-fix proposal already exists for /news. Check Proposals > Pending.',
    });

    expect(mockProposalCreate).not.toHaveBeenCalled();
    expect(mockMessageCreate).not.toHaveBeenCalled();
  });

  it('links a blog draft from a public /blog/... URL', async () => {
    mockProposalFindUnique.mockResolvedValue(buildCreatedProposal({
      sourceType: 'keyword_opportunity',
      status: 'drafting',
      sourceRefJson: {
        opportunityId: 'kw_1',
        opportunitySourceType: 'serp_sample',
        pageUrl: 'https://letaiexplainai.com/blog/chip-gaines',
        pagePath: '/blog/chip-gaines',
        pageTypeRecommendation: 'blog_post',
        windowStart: '2026-05-01T20:52:26.647Z',
        windowEnd: null,
        sourceBucket: 'serp_sample',
        sourceQuery: 'chip gaines',
      },
    }));
    mockBlogPostFindUnique
      .mockResolvedValueOnce({
        id: 'post_chip',
        slug: 'chip-gaines',
        title: 'Chip Gaines and the AI home-renovation moment',
        status: 'draft',
        publishedAt: null,
      })
      .mockResolvedValueOnce(null);
    mockProposalUpdate.mockResolvedValue(buildCreatedProposal({
      sourceType: 'keyword_opportunity',
      status: 'approved',
      sourceRefJson: {
        opportunityId: 'kw_1',
        opportunitySourceType: 'serp_sample',
        pageUrl: 'https://letaiexplainai.com/blog/chip-gaines',
        pagePath: '/blog/chip-gaines',
        pageTypeRecommendation: 'blog_post',
        windowStart: '2026-05-01T20:52:26.647Z',
        windowEnd: null,
        sourceBucket: 'serp_sample',
        sourceQuery: 'chip gaines',
      },
      draftPost: {
        id: 'post_chip',
        slug: 'chip-gaines',
        title: 'Chip Gaines and the AI home-renovation moment',
        status: 'draft',
        publishedAt: null,
      },
    }));

    const result = await linkProposalDraft('proposal_1', 'https://letaiexplainai.com/blog/chip-gaines');

    expect(mockBlogPostFindUnique).toHaveBeenCalledWith({
      where: { slug: 'chip-gaines' },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        publishedAt: true,
      },
    });
    expect(mockProposalUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'proposal_1' },
      data: expect.objectContaining({
        draftPostId: 'post_chip',
        status: 'approved',
      }),
    }));
    expect(result.draftPost?.id).toBe('post_chip');
  });

  it('explains that a planned /blog/... destination is not enough when no post exists yet', async () => {
    mockProposalFindUnique.mockResolvedValue(buildCreatedProposal({
      sourceType: 'keyword_opportunity',
      status: 'drafting',
      sourceRefJson: {
        opportunityId: 'kw_1',
        opportunitySourceType: 'serp_sample',
        pageUrl: 'https://letaiexplainai.com/blog/chip-gaines',
        pagePath: '/blog/chip-gaines',
        pageTypeRecommendation: 'blog_post',
        windowStart: '2026-05-01T20:52:26.647Z',
        windowEnd: null,
        sourceBucket: 'serp_sample',
        sourceQuery: 'chip gaines',
      },
    }));
    mockBlogPostFindUnique.mockResolvedValue(null);

    await expect(
      linkProposalDraft('proposal_1', 'https://letaiexplainai.com/blog/chip-gaines')
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringContaining('Planned destinations like /blog/chip-gaines do not count'),
    });
  });

  it('allows a shipped proposal to relink the same published post so experiment recovery can rerun safely', async () => {
    mockProposalFindUnique.mockResolvedValue(buildCreatedProposal({
      sourceType: 'keyword_opportunity',
      status: 'shipped',
      draftPostId: 'post_chip',
      sourceRefJson: {
        opportunityId: 'kw_1',
        opportunitySourceType: 'serp_sample',
        pageUrl: 'https://letaiexplainai.com/blog/chip-gaines',
        pagePath: '/blog/chip-gaines',
        pageTypeRecommendation: 'blog_post',
        windowStart: '2026-05-01T20:52:26.647Z',
        windowEnd: null,
        sourceBucket: 'serp_sample',
        sourceQuery: 'chip gaines',
      },
      draftPost: {
        id: 'post_chip',
        slug: 'chip-gaines',
        title: 'Chip Gaines and the AI home-renovation moment',
        status: 'published',
        publishedAt: new Date('2026-05-02T15:23:16.000Z'),
      },
    }));
    mockBlogPostFindUnique.mockResolvedValue({
      id: 'post_chip',
      slug: 'chip-gaines',
      title: 'Chip Gaines and the AI home-renovation moment',
      status: 'published',
      publishedAt: null,
    });
    mockProposalUpdate.mockResolvedValue(buildCreatedProposal({
      sourceType: 'keyword_opportunity',
      status: 'shipped',
      draftPostId: 'post_chip',
      sourceRefJson: {
        opportunityId: 'kw_1',
        opportunitySourceType: 'serp_sample',
        pageUrl: 'https://letaiexplainai.com/blog/chip-gaines',
        pagePath: '/blog/chip-gaines',
        pageTypeRecommendation: 'blog_post',
        windowStart: '2026-05-01T20:52:26.647Z',
        windowEnd: null,
        sourceBucket: 'serp_sample',
        sourceQuery: 'chip gaines',
      },
      draftPost: {
        id: 'post_chip',
        slug: 'chip-gaines',
        title: 'Chip Gaines and the AI home-renovation moment',
        status: 'published',
        publishedAt: new Date('2026-05-02T15:23:16.000Z'),
      },
    }));

    const result = await linkProposalDraft('proposal_1', 'https://letaiexplainai.com/blog/chip-gaines');

    expect(mockProposalUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'proposal_1' },
      data: expect.objectContaining({
        draftPostId: 'post_chip',
        status: 'shipped',
      }),
    }));
    expect(mockEnsureExperimentForProposalLink).toHaveBeenCalledWith('proposal_1');
    expect(result.status).toBe('shipped');
  });
});

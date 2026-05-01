import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockMessageCreate = jest.fn();
const mockSnapshotFindUnique = jest.fn();
const mockSnapshotUpdate = jest.fn();
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
};

jest.mock('../../../server/src/db', () => ({
  prisma: {
    gscWeeklySnapshot: {
      findUnique: mockSnapshotFindUnique,
      update: mockSnapshotUpdate,
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

import { generateProposal } from '../../../server/src/services/seo/briefGenerator';

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
  targetKeyword: string;
  suggestedAngle: string;
  rationale: string;
  confidence: number;
  status: string;
  rejectedReason: string | null;
  linkInventoryJson: unknown;
  newsHooksJson: unknown;
}> = {}) {
  const snapshot = buildSnapshot();
  return {
    id: 'proposal_1',
    snapshotId: snapshot.id,
    proposalType: 'blog_post',
    targetKeyword: overrides.targetKeyword ?? 'AI agents in healthcare',
    suggestedAngle: overrides.suggestedAngle ?? 'Why AI agent rollouts in healthcare stall at the last mile',
    linkInventoryJson: overrides.linkInventoryJson ?? [],
    newsHooksJson: overrides.newsHooksJson ?? [],
    rationale: overrides.rationale ?? 'Healthcare AI agents look timely, but deployment friction is the real thesis.',
    confidence: overrides.confidence ?? 0.88,
    status: overrides.status ?? 'pending',
    draftPostId: null,
    createdAt: new Date('2026-04-30T12:00:00.000Z'),
    actedAt: null,
    rejectedReason: overrides.rejectedReason ?? null,
    snapshot: {
      id: snapshot.id,
      weekStart: snapshot.weekStart,
      bucket: snapshot.bucket,
      page: snapshot.page,
      query: snapshot.query,
    },
    draftPost: null,
  };
}

describe('briefGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';

    mockSnapshotFindUnique.mockResolvedValue(buildSnapshot());
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
    mockTransaction.mockImplementation(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));
    mockProposalCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      buildCreatedProposal({
        targetKeyword: data.targetKeyword as string,
        suggestedAngle: data.suggestedAngle as string,
        rationale: data.rationale as string,
        confidence: data.confidence as number,
        status: data.status as string,
        rejectedReason: (data.rejectedReason as string | null | undefined) ?? null,
        linkInventoryJson: data.linkInventoryJson,
        newsHooksJson: data.newsHooksJson ?? [],
      })
    );
    mockSnapshotUpdate.mockResolvedValue({});
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
});

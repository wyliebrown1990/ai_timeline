import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ApiError } from '../../../server/src/middleware/error';

const mockMessageCreate = jest.fn();
const mockGetInsightDetail = jest.fn();
const mockIsPaused = jest.fn();
const mockBlogPostFindFirst = jest.fn();
const mockBlogPostFindMany = jest.fn();
const mockBlogPostUpdate = jest.fn();
const mockSeoAgentActionFindFirst = jest.fn();
const mockSeoAgentActionFindUnique = jest.fn();
const mockSeoAgentActionFindMany = jest.fn();
const mockSeoAgentActionCount = jest.fn();
const mockSeoAgentActionCreate = jest.fn();
const mockSeoAgentActionUpdate = jest.fn();
const mockGscWeeklySnapshotUpdate = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockMessageCreate,
    },
  })),
}));

jest.mock('../../../server/src/services/gsc/bucketClassifier', () => ({
  getInsightDetail: mockGetInsightDetail,
}));

jest.mock('../../../server/src/services/seo/agentControl', () => ({
  isPaused: mockIsPaused,
}));

const mockTx = {
  blogPost: {
    update: mockBlogPostUpdate,
  },
  gscWeeklySnapshot: {
    update: mockGscWeeklySnapshotUpdate,
  },
  seoAgentAction: {
    create: mockSeoAgentActionCreate,
    update: mockSeoAgentActionUpdate,
  },
};

jest.mock('../../../server/src/db', () => ({
  prisma: {
    blogPost: {
      findFirst: mockBlogPostFindFirst,
      findMany: mockBlogPostFindMany,
    },
    seoAgentAction: {
      findFirst: mockSeoAgentActionFindFirst,
      findUnique: mockSeoAgentActionFindUnique,
      findMany: mockSeoAgentActionFindMany,
      count: mockSeoAgentActionCount,
    },
    gscWeeklySnapshot: {
      update: mockGscWeeklySnapshotUpdate,
    },
    $transaction: mockTransaction,
  },
}));

import {
  proposeRewrite,
  rollbackSeoAction,
  shipRewrite,
} from '../../../server/src/services/seo/metadataRewriter';

const baseInsight = {
  id: 'snapshot_1',
  weekStart: '2026-04-21',
  bucket: 'winnable_loss' as const,
  status: 'open' as const,
  query: 'turing award multiple winners quiz',
  page: 'https://letaiexplainai.com/blog/turing-award-quiz',
  currentMetrics: {
    impressions: 180,
    clicks: 9,
    ctr: 0.05,
    position: 4.1,
  },
  baselineMetrics: {
    impressions: 150,
    clicks: 15,
    ctr: 0.1,
    position: 4,
  },
  score: 58,
  evidence: 'CTR is weak relative to the current average position.',
  suggestedAction: 'Rewrite the page title and meta description.',
  trend: [],
};

const basePost = {
  id: 'post_1',
  slug: 'turing-award-quiz',
  title: 'The Turing Award Quiz Is Harder Than It Looks',
  excerpt: 'Why this Turing Award multiple winners quiz keeps tripping people up.',
  seoTitle: 'Turing Award Quiz',
  seoDescription: 'A quick quiz on Turing Award winners and why some years are easier to remember than others.',
  bodyMarkdown: 'The Turing Award is the closest thing computing has to a Nobel. This post explains why the multiple-winners angle makes for a better quiz hook.',
  status: 'published',
  publishedAt: new Date('2026-04-10T12:00:00.000Z'),
};

function buildProposalResponse(overrides: Partial<{
  proposedTitle: string;
  proposedDescription: string;
  rationale: string;
  confidence: number;
}> = {}) {
  return JSON.stringify({
    proposedTitle: 'Turing Award Quiz: Why Multiple Winners Matter',
    proposedDescription: 'A sharper Turing Award quiz hook, with the multiple-winners twist front and center so searchers know exactly what they will learn.',
    rationale: 'The query is looking for the multiple-winners angle specifically. This rewrite keeps the voice grounded while making that promise clearer in both fields.',
    confidence: 0.9,
    ...overrides,
  });
}

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

describe('metadataRewriter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';

    mockGetInsightDetail.mockResolvedValue(baseInsight);
    mockIsPaused.mockResolvedValue(false);
    mockBlogPostFindFirst.mockResolvedValue(basePost);
    mockBlogPostFindMany.mockResolvedValue([
      {
        id: basePost.id,
        slug: basePost.slug,
        title: basePost.title,
      },
    ]);
    mockSeoAgentActionFindFirst.mockResolvedValue(null);
    mockSeoAgentActionFindUnique.mockResolvedValue(null);
    mockSeoAgentActionFindMany.mockResolvedValue([]);
    mockSeoAgentActionCount.mockResolvedValue(0);
    mockMessageCreate.mockResolvedValue(buildAnthropicResponse(buildProposalResponse()));
    mockBlogPostUpdate.mockResolvedValue(undefined);
    mockGscWeeklySnapshotUpdate.mockResolvedValue(undefined);
    mockSeoAgentActionCreate.mockResolvedValue({
      id: 'action_1',
      snapshotId: baseInsight.id,
      actionType: 'metadata_rewrite',
      targetType: 'blog_post',
      targetId: basePost.id,
      beforeJson: {
        slug: basePost.slug,
        pageUrl: baseInsight.page,
        seoTitle: basePost.seoTitle,
        seoDescription: basePost.seoDescription,
      },
      afterJson: {
        slug: basePost.slug,
        pageUrl: baseInsight.page,
        seoTitle: 'Turing Award Quiz: Why Multiple Winners Matter',
        seoDescription: 'A sharper Turing Award quiz hook, with the multiple-winners twist front and center so searchers know exactly what they will learn.',
      },
      confidence: 0.9,
      rationale: 'The query is looking for the multiple-winners angle specifically.',
      shippedAt: new Date('2026-04-30T12:00:00.000Z'),
      rolledBackAt: null,
      measuredAt: null,
      measuredDelta: null,
      snapshot: {
        id: baseInsight.id,
        page: baseInsight.page,
        query: baseInsight.query,
        weekStart: new Date('2026-04-21T00:00:00.000Z'),
      },
    });
    mockSeoAgentActionUpdate.mockResolvedValue({
      id: 'action_1',
      snapshotId: baseInsight.id,
      actionType: 'metadata_rewrite',
      targetType: 'blog_post',
      targetId: basePost.id,
      beforeJson: {
        slug: basePost.slug,
        pageUrl: baseInsight.page,
        seoTitle: basePost.seoTitle,
        seoDescription: basePost.seoDescription,
      },
      afterJson: {
        slug: basePost.slug,
        pageUrl: baseInsight.page,
        seoTitle: 'Turing Award Quiz: Why Multiple Winners Matter',
        seoDescription: 'A sharper Turing Award quiz hook, with the multiple-winners twist front and center so searchers know exactly what they will learn.',
      },
      confidence: 0.9,
      rationale: 'The query is looking for the multiple-winners angle specifically.',
      shippedAt: new Date('2026-04-30T12:00:00.000Z'),
      rolledBackAt: new Date('2026-05-01T09:00:00.000Z'),
      measuredAt: null,
      measuredDelta: null,
      snapshot: {
        id: baseInsight.id,
        page: baseInsight.page,
        query: baseInsight.query,
        weekStart: new Date('2026-04-21T00:00:00.000Z'),
      },
    });
    mockTransaction.mockImplementation(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));
  });

  it('returns a dry-run proposal with current and proposed metadata', async () => {
    const proposal = await proposeRewrite(baseInsight.id);

    expect(proposal).toMatchObject({
      snapshotId: baseInsight.id,
      targetId: basePost.id,
      currentTitle: basePost.seoTitle,
      currentDescription: basePost.seoDescription,
      proposedTitle: 'Turing Award Quiz: Why Multiple Winners Matter',
      confidence: 0.9,
    });
  });

  it('refuses to ship while the pause switch is on', async () => {
    mockIsPaused.mockResolvedValue(true);

    await expect(shipRewrite(baseInsight.id)).rejects.toMatchObject({
      statusCode: 409,
      message: 'SEO agent is paused',
    });
  });

  it('refuses to ship when confidence is below the threshold', async () => {
    mockMessageCreate.mockResolvedValue(
      buildAnthropicResponse(buildProposalResponse({ confidence: 0.72 }))
    );

    await expect(shipRewrite(baseInsight.id)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Rewrite confidence is below the auto-ship threshold',
    });
  });

  it('refuses to ship when the same post was already rewritten in the last 30 days', async () => {
    mockSeoAgentActionFindFirst.mockResolvedValue({
      id: 'recent_action',
      shippedAt: new Date('2026-04-25T12:00:00.000Z'),
    });

    await expect(shipRewrite(baseInsight.id)).rejects.toMatchObject({
      statusCode: 409,
      message: 'This post was already rewritten within the last 30 days',
    });
  });

  it('refuses to ship when the weekly blast radius cap has been reached', async () => {
    mockSeoAgentActionCount.mockResolvedValue(3);

    await expect(shipRewrite(baseInsight.id)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Weekly auto-ship cap reached for metadata rewrites',
    });
  });

  it.each([
    {
      label: 'keyword stuffing',
      response: buildProposalResponse({
        proposedTitle: 'AI Compute Bottleneck AI Compute Bottleneck Explained',
      }),
      expectedMessage: 'The proposed metadata repeats the same phrase too aggressively.',
    },
    {
      label: 'generic listicle',
      response: buildProposalResponse({
        proposedTitle: 'Top 10 Turing Award Facts You Need to Know',
      }),
      expectedMessage: 'The proposal drifts into generic listicle framing.',
    },
    {
      label: 'duplicate entity page framing',
      response: buildProposalResponse({
        proposedTitle: 'What Is In-Context Learning?',
      }),
      expectedMessage: 'The proposal reads like a generic entity explainer instead of a blog thesis.',
    },
    {
      label: 'voice drift',
      response: buildProposalResponse({
        proposedDescription: 'In this article, we explore the revolutionary power of the Turing Award multiple winners quiz and why it changes everything.',
      }),
      expectedMessage: 'The proposal uses hypey language that breaks the SEO voice rules.',
    },
    {
      label: 'hallucinated entities',
      response: buildProposalResponse({
        proposedDescription: 'A grounded look at the DeepMind Alignment Summit and why it changed how people search for the Turing Award quiz angle.',
      }),
      expectedMessage: 'The proposal introduces "DeepMind Alignment Summit" without support in the current page context.',
    },
    {
      label: 'forced comparison framing',
      response: buildProposalResponse({
        proposedTitle: 'Turing Award vs Nobel Prize: Which Matters More?',
      }),
      expectedMessage: 'The proposal introduces comparison framing that the source page does not naturally support.',
    },
    {
      label: 'metadata padding',
      response: buildProposalResponse({
        proposedTitle: 'Turing Award Quiz: Why Multiple Winners Matter More Than Most People Realize in Modern Computing History',
      }),
      expectedMessage: 'The proposed title is too long for the auto-ship lane.',
    },
  ])('rejects $label proposals during slop preflight', async ({ response, expectedMessage }) => {
    mockMessageCreate.mockResolvedValue(buildAnthropicResponse(response));

    await expect(shipRewrite(baseInsight.id)).rejects.toMatchObject({
      statusCode: 409,
      message: expectedMessage,
    });
  });

  it('ships a clean rewrite and writes the audit log + blog metadata update', async () => {
    const action = await shipRewrite(baseInsight.id);

    expect(mockBlogPostUpdate).toHaveBeenCalledWith({
      where: {
        id: basePost.id,
      },
      data: {
        seoTitle: 'Turing Award Quiz: Why Multiple Winners Matter',
        seoDescription: 'A sharper Turing Award quiz hook, with the multiple-winners twist front and center so searchers know exactly what they will learn.',
      },
    });
    expect(mockGscWeeklySnapshotUpdate).toHaveBeenCalledWith({
      where: {
        id: baseInsight.id,
      },
      data: {
        status: 'shipped',
      },
    });
    expect(mockSeoAgentActionCreate).toHaveBeenCalled();
    expect(action).toMatchObject({
      id: 'action_1',
      status: 'shipped',
      targetId: basePost.id,
      targetLabel: basePost.title,
    });
  });

  it('rolls back a shipped rewrite to the previous metadata', async () => {
    mockSeoAgentActionFindUnique.mockResolvedValue({
      id: 'action_1',
      snapshotId: baseInsight.id,
      actionType: 'metadata_rewrite',
      targetType: 'blog_post',
      targetId: basePost.id,
      beforeJson: {
        slug: basePost.slug,
        pageUrl: baseInsight.page,
        seoTitle: basePost.seoTitle,
        seoDescription: basePost.seoDescription,
      },
      afterJson: {
        slug: basePost.slug,
        pageUrl: baseInsight.page,
        seoTitle: 'Turing Award Quiz: Why Multiple Winners Matter',
        seoDescription: 'A sharper Turing Award quiz hook, with the multiple-winners twist front and center so searchers know exactly what they will learn.',
      },
      confidence: 0.9,
      rationale: 'Reasonable rewrite',
      shippedAt: new Date('2026-04-30T12:00:00.000Z'),
      rolledBackAt: null,
      measuredAt: null,
      measuredDelta: null,
      snapshot: {
        id: baseInsight.id,
        page: baseInsight.page,
        query: baseInsight.query,
        weekStart: new Date('2026-04-21T00:00:00.000Z'),
      },
    });

    const action = await rollbackSeoAction('action_1');

    expect(mockBlogPostUpdate).toHaveBeenCalledWith({
      where: {
        id: basePost.id,
      },
      data: {
        seoTitle: basePost.seoTitle,
        seoDescription: basePost.seoDescription,
      },
    });
    expect(action).toMatchObject({
      id: 'action_1',
      status: 'rolled_back',
    });
  });

  it('surfaces api errors cleanly when the proposal is unchanged', async () => {
    mockMessageCreate.mockResolvedValue(
      buildAnthropicResponse(buildProposalResponse({
        proposedTitle: basePost.seoTitle ?? '',
        proposedDescription: basePost.seoDescription ?? '',
      }))
    );

    await expect(proposeRewrite(baseInsight.id)).rejects.toBeInstanceOf(ApiError);
  });
});

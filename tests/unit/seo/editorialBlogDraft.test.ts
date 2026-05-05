import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { EditorialOpportunity } from '../../../server/src/services/seo/editorialOpportunitySelector';

const mockMessagesCreate = jest.fn();
const mockSubjectFindMany = jest.fn();
const mockEditorialRunFindUnique = jest.fn();
const mockEditorialRunCreate = jest.fn();
const mockEditorialRunUpdate = jest.fn();
const mockBlogPostFindFirst = jest.fn();
const mockCreateDraft = jest.fn();
const mockGetOrCreateDefaultAuthor = jest.fn();
const mockPublishPost = jest.fn();
const mockApproveSeoProposal = jest.fn();
const mockLinkProposalDraft = jest.fn();
const mockMarkKeywordOpportunityPromoted = jest.fn();
const mockEvaluateBlogQualityGate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockMessagesCreate,
    },
  })),
}));

jest.mock('../../../server/src/db', () => ({
  prisma: {
    subject: {
      findMany: mockSubjectFindMany,
    },
    seoEditorialOpportunityRun: {
      findUnique: mockEditorialRunFindUnique,
      create: mockEditorialRunCreate,
      update: mockEditorialRunUpdate,
    },
    blogPost: {
      findFirst: mockBlogPostFindFirst,
    },
  },
}));

jest.mock('../../../server/src/services/blogAdmin', () => ({
  createDraft: mockCreateDraft,
  getOrCreateDefaultAuthor: mockGetOrCreateDefaultAuthor,
  publishPost: mockPublishPost,
}));

jest.mock('../../../server/src/services/seo/briefGenerator', () => ({
  approveSeoProposal: mockApproveSeoProposal,
  linkProposalDraft: mockLinkProposalDraft,
}));

jest.mock('../../../server/src/services/seo/keywordDiscovery', () => ({
  markKeywordOpportunityPromoted: mockMarkKeywordOpportunityPromoted,
}));

jest.mock('../../../server/src/services/seo/blogQualityGate', () => ({
  evaluateBlogQualityGate: mockEvaluateBlogQualityGate,
}));

import {
  processEditorialOpportunity,
  resetEditorialBlogDraftForTests,
} from '../../../server/src/services/seo/editorialBlogDraft';

const GENERATED_DRAFT = {
  title: 'AI Timeline as a Systems Map',
  subtitle: 'Why timelines work better when they show bottlenecks.',
  excerpt: 'A systems-level read on why AI timelines should explain causal handoffs, not just list events.',
  seoTitle: 'AI Timeline as a Systems Map',
  seoDescription: 'AI timelines work best when they show causal handoffs, bottlenecks, and links between research eras instead of listing events flatly.',
  tags: ['ai-history', 'ai-timeline', 'machine-learning'],
  subjectSlugs: ['science-cs-ml'],
  relations: [{ entityType: 'glossary_term', entityId: 'machine-learning', relationLabel: 'mentions' }],
  bodyMarkdown: `Opening answer about AI timelines and why they matter.

## Key facts

- One.

## The atlas's read

Contested.`,
};

const PROPOSAL_OPPORTUNITY: EditorialOpportunity = {
  id: 'proposal-1',
  sourceType: 'proposal',
  action: 'auto_publish',
  title: 'AI timeline systems map',
  targetKeyword: 'ai timeline',
  rationale: 'Strong fit.',
  confidence: 0.92,
  source: {
    id: 'proposal-1',
    status: 'pending',
    handoff: { mode: 'blog_draft' },
  },
} as EditorialOpportunity;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  resetEditorialBlogDraftForTests();
  mockEditorialRunFindUnique.mockResolvedValue(null);
  mockEditorialRunCreate.mockResolvedValue({
    id: 'run-1',
    idempotencyKey: 'seo-editorial:2026-04-24:proposal:proposal-1',
    weekStart: new Date('2026-04-24T00:00:00.000Z'),
    sourceType: 'proposal',
    sourceId: 'proposal-1',
    targetKeyword: 'ai timeline',
    action: 'auto_publish',
    status: 'processing',
    postId: null,
    post: null,
    reason: null,
  });
  mockEditorialRunUpdate.mockImplementation(async ({ data }) => ({
    id: 'run-1',
    idempotencyKey: 'seo-editorial:2026-04-24:proposal:proposal-1',
    weekStart: new Date('2026-04-24T00:00:00.000Z'),
    sourceType: 'proposal',
    sourceId: 'proposal-1',
    targetKeyword: 'ai timeline',
    action: 'auto_publish',
    status: data.status,
    postId: data.postId ?? null,
    post: data.postId ? { slug: 'ai-timeline', title: GENERATED_DRAFT.title } : null,
    reason: data.reason,
  }));
  mockBlogPostFindFirst.mockResolvedValue(null);
  mockMessagesCreate.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(GENERATED_DRAFT) }],
  });
  mockSubjectFindMany.mockResolvedValue([{ id: 'subject-ml', slug: 'science-cs-ml' }]);
  mockEvaluateBlogQualityGate.mockReturnValue({
    passed: true,
    blockers: [],
    warnings: [],
    metrics: { internalLinkCount: 3, shortcodeCount: 1, wordCount: 900 },
  });
  mockGetOrCreateDefaultAuthor.mockResolvedValue({ id: 'author-1', slug: 'wylie-brown' });
  mockCreateDraft.mockResolvedValue({
    id: 'post-1',
    slug: 'ai-timeline',
    title: GENERATED_DRAFT.title,
    status: 'draft',
  });
  mockPublishPost.mockResolvedValue({
    id: 'post-1',
    slug: 'ai-timeline',
    title: GENERATED_DRAFT.title,
    status: 'published',
  });
  mockApproveSeoProposal.mockResolvedValue({});
  mockLinkProposalDraft.mockResolvedValue({});
  mockMarkKeywordOpportunityPromoted.mockResolvedValue({});
});

describe('editorialBlogDraft', () => {
  it('does not generate or mutate during dry-runs', async () => {
    const result = await processEditorialOpportunity(PROPOSAL_OPPORTUNITY, { dryRun: true });

    expect(result.status).toBe('draft_created');
    expect(result.postId).toBeNull();
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    expect(mockCreateDraft).not.toHaveBeenCalled();
  });

  it('creates, publishes, and links a passing proposal opportunity', async () => {
    const result = await processEditorialOpportunity(PROPOSAL_OPPORTUNITY, { weekStart: '2026-04-24' });

    expect(mockEditorialRunCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        idempotencyKey: 'seo-editorial:2026-04-24:proposal:proposal-1',
        status: 'processing',
      }),
    }));
    expect(mockApproveSeoProposal).toHaveBeenCalledWith('proposal-1');
    expect(mockCreateDraft).toHaveBeenCalledWith(expect.objectContaining({
      title: GENERATED_DRAFT.title,
      slug: 'ai-timeline',
      subjectIds: ['subject-ml'],
      primarySubjectId: 'subject-ml',
    }), 'author-1');
    expect(mockPublishPost).toHaveBeenCalledWith('post-1');
    expect(mockLinkProposalDraft).toHaveBeenCalledWith('proposal-1', 'post-1');
    expect(mockEditorialRunUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'auto_published',
        postId: 'post-1',
      }),
    }));
    expect(result).toEqual(expect.objectContaining({
      status: 'auto_published',
      postId: 'post-1',
      publicUrl: 'https://letaiexplainai.com/blog/ai-timeline',
      adminUrl: 'https://letaiexplainai.com/admin/blog/post-1/edit',
    }));
  });

  it('downgrades auto-publish to draft when repairable quality gates fail', async () => {
    mockEvaluateBlogQualityGate.mockReturnValue({
      passed: false,
      blockers: ['At least 3 distinct internal links are required.'],
      warnings: [],
      metrics: { internalLinkCount: 1, shortcodeCount: 0, wordCount: 500 },
    });

    const result = await processEditorialOpportunity(PROPOSAL_OPPORTUNITY, { weekStart: '2026-04-24' });

    expect(result.status).toBe('draft_created');
    expect(result.action).toBe('draft_only');
    expect(result.reason).toContain('At least 3 distinct internal links');
    expect(mockEditorialRunUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'draft_created',
        postId: 'post-1',
      }),
    }));
    expect(mockCreateDraft).toHaveBeenCalled();
    expect(mockPublishPost).not.toHaveBeenCalled();
    expect(mockLinkProposalDraft).toHaveBeenCalledWith('proposal-1', 'post-1');
  });

  it('skips without creating a draft when hard quality gates fail', async () => {
    mockEvaluateBlogQualityGate.mockReturnValue({
      passed: false,
      blockers: ['seoTitle is required and must be <= 60 characters.'],
      warnings: [],
      metrics: { internalLinkCount: 3, shortcodeCount: 0, wordCount: 900 },
    });

    const result = await processEditorialOpportunity(PROPOSAL_OPPORTUNITY, { weekStart: '2026-04-24' });

    expect(result.status).toBe('skipped_by_gate');
    expect(result.reason).toContain('seoTitle is required');
    expect(mockCreateDraft).not.toHaveBeenCalled();
    expect(mockPublishPost).not.toHaveBeenCalled();
  });

  it('returns an existing completed run without generating another post', async () => {
    mockEditorialRunFindUnique.mockResolvedValue({
      id: 'run-1',
      idempotencyKey: 'seo-editorial:2026-04-24:proposal:proposal-1',
      weekStart: new Date('2026-04-24T00:00:00.000Z'),
      sourceType: 'proposal',
      sourceId: 'proposal-1',
      targetKeyword: 'ai timeline',
      action: 'auto_publish',
      status: 'auto_published',
      postId: 'post-1',
      post: { slug: 'ai-timeline', title: 'AI Timeline as a Systems Map' },
      reason: 'Created successfully.',
    });

    const result = await processEditorialOpportunity(PROPOSAL_OPPORTUNITY, { weekStart: '2026-04-24' });

    expect(result).toEqual(expect.objectContaining({
      status: 'auto_published',
      postId: 'post-1',
      publicUrl: 'https://letaiexplainai.com/blog/ai-timeline',
    }));
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    expect(mockCreateDraft).not.toHaveBeenCalled();
  });

  it('blocks duplicate blog topics before creating a draft', async () => {
    mockBlogPostFindFirst.mockResolvedValue({
      id: 'existing-post',
      slug: 'ai-timeline',
      title: 'AI Timeline',
      status: 'published',
    });

    const result = await processEditorialOpportunity(PROPOSAL_OPPORTUNITY, { weekStart: '2026-04-24' });

    expect(result.status).toBe('skipped_by_gate');
    expect(result.reason).toContain('Duplicate topic blocked');
    expect(mockCreateDraft).not.toHaveBeenCalled();
    expect(mockEditorialRunUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'skipped_by_gate',
      }),
    }));
  });
});

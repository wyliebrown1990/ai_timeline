import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockFindMany = jest.fn();
const mockGlossaryFindMany = jest.fn();
const mockPersonFindMany = jest.fn();
const mockOrganizationFindMany = jest.fn();
const mockMilestoneFindMany = jest.fn();
const mockUpdatePost = jest.fn();
const mockDiscoverEditorialEntityInventory = jest.fn();
const mockEnforceEditorialEntityLinks = jest.fn();
const mockCountPreviewEntityLinks = jest.fn();
const mockScorePreviewEntityMix = jest.fn();

jest.mock('../../../server/src/db', () => ({
  prisma: {
    blogPost: {
      findMany: mockFindMany,
    },
    glossaryTerm: {
      findMany: mockGlossaryFindMany,
    },
    person: {
      findMany: mockPersonFindMany,
    },
    organization: {
      findMany: mockOrganizationFindMany,
    },
    milestone: {
      findMany: mockMilestoneFindMany,
    },
  },
}));

jest.mock('../../../server/src/services/blogAdmin', () => ({
  updatePost: mockUpdatePost,
}));

jest.mock('../../../server/src/services/seo/editorialEntityDiscovery', () => ({
  discoverEditorialEntityInventory: mockDiscoverEditorialEntityInventory,
}));

jest.mock('../../../server/src/services/seo/editorialEntityLinker', () => ({
  enforceEditorialEntityLinks: mockEnforceEditorialEntityLinks,
  countPreviewEntityLinks: mockCountPreviewEntityLinks,
  scorePreviewEntityMix: mockScorePreviewEntityMix,
}));

import { backfillBlogEntityLinks } from '../../../server/src/services/seo/backfillBlogEntityLinks';

describe('backfillBlogEntityLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([
      {
        id: 'post-1',
        slug: 'when-ai-builds-itself',
        title: 'When AI builds itself',
        bodyMarkdown: 'Before body',
        relations: [
          {
            entityType: 'glossary_term',
            entityId: 'ai-safety',
            relationLabel: null,
          },
          {
            entityType: 'organization',
            entityId: 'anthropic',
            relationLabel: null,
          },
          {
            entityType: 'glossary_term',
            entityId: 'neural-network',
            relationLabel: null,
          },
        ],
      },
    ]);
    mockGlossaryFindMany.mockResolvedValue([
      {
        id: 'ai-safety',
        term: 'AI Safety',
        slug: 'ai-safety',
      },
      {
        id: 'neural-network',
        term: 'Neural Network',
        slug: 'neural-network',
      },
    ]);
    mockPersonFindMany.mockResolvedValue([]);
    mockOrganizationFindMany.mockResolvedValue([
      {
        id: 'anthropic',
        name: 'Anthropic',
        slug: 'anthropic',
      },
    ]);
    mockMilestoneFindMany.mockResolvedValue([]);
    mockDiscoverEditorialEntityInventory.mockResolvedValue([
      {
        entityType: 'glossary_term',
        id: 'ai-safety',
        label: 'AI Safety',
        path: '/glossary/ai-safety',
        reason: 'Relevant glossary term.',
      },
    ]);
    mockEnforceEditorialEntityLinks.mockReturnValue({
      bodyMarkdown: 'After body',
      relations: [
        {
          entityType: 'glossary_term',
          entityId: 'ai-safety',
          relationLabel: undefined,
        },
        {
          entityType: 'organization',
          entityId: 'anthropic',
          relationLabel: undefined,
        },
        {
          entityType: 'glossary_term',
          entityId: 'neural-network',
          relationLabel: undefined,
        },
      ],
    });
    mockCountPreviewEntityLinks.mockImplementation((bodyMarkdown: string) => (
      bodyMarkdown === 'Before body' ? 3 : 3
    ));
    mockScorePreviewEntityMix.mockImplementation((bodyMarkdown: string) => (
      bodyMarkdown === 'Before body' ? 180 : 210
    ));
  });

  it('updates posts when entity-link quality improves without increasing preview-link count', async () => {
    const summary = await backfillBlogEntityLinks({
      publishedAfter: '2026-05-05',
      dryRun: false,
      limit: 10,
    });

    expect(mockUpdatePost).toHaveBeenCalledWith('post-1', {
      bodyMarkdown: 'After body',
      relations: [
        {
          entityType: 'glossary_term',
          entityId: 'ai-safety',
          relationLabel: undefined,
        },
        {
          entityType: 'organization',
          entityId: 'anthropic',
          relationLabel: undefined,
        },
        {
          entityType: 'glossary_term',
          entityId: 'neural-network',
          relationLabel: undefined,
        },
      ],
    });
    expect(summary.updatedCount).toBe(1);
    expect(summary.items[0]).toEqual(expect.objectContaining({
      slug: 'when-ai-builds-itself',
      beforePreviewLinks: 3,
      afterPreviewLinks: 3,
      beforeMixScore: 180,
      afterMixScore: 210,
      updated: true,
      reason: undefined,
    }));
  });
});

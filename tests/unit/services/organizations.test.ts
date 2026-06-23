import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockOrganizationFindUnique = jest.fn();
const mockPersonFindMany = jest.fn();
const mockMilestoneFindMany = jest.fn();
const mockNewsEventOrgMentionFindMany = jest.fn();

jest.mock('../../../server/src/db', () => ({
  prisma: {
    organization: {
      findUnique: mockOrganizationFindUnique,
    },
    person: {
      findMany: mockPersonFindMany,
    },
    milestone: {
      findMany: mockMilestoneFindMany,
    },
    newsEventOrgMention: {
      findMany: mockNewsEventOrgMentionFindMany,
    },
  },
}));

import { getBySlugWithRelations } from '../../../server/src/services/organizations';

describe('organizations service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrganizationFindUnique.mockResolvedValue({
      id: 'org-anthropic',
      name: 'Anthropic',
      slug: 'anthropic',
      type: 'company',
      shortDescription: 'AI safety and research company.',
      mission: null,
      history: null,
      currentFocus: null,
      currentFocusUpdatedAt: null,
      focusAreas: '[]',
      products: '[]',
      logoUrl: null,
      websiteUrl: null,
      wikipediaUrl: null,
      linkedInUrl: null,
      foundedYear: 2021,
      headquarters: 'San Francisco, CA',
      status: 'published',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    mockPersonFindMany.mockResolvedValue([]);
    mockMilestoneFindMany.mockResolvedValue([]);
    mockNewsEventOrgMentionFindMany.mockResolvedValue([
      {
        mentionType: 'mentioned',
        event: {
          id: 'event-1',
          headline: 'Anthropic announces a model update',
          publishedDate: new Date('2026-06-01T00:00:00Z'),
          isPaywalled: false,
          paywallReason: null,
        },
      },
    ]);
  });

  it('loads related news event mentions using the orgId field from the Prisma model', async () => {
    const result = await getBySlugWithRelations('anthropic');

    expect(result?.organization.id).toBe('org-anthropic');
    expect(mockNewsEventOrgMentionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { orgId: 'org-anthropic' },
    }));
    expect(result?.newsEvents).toEqual([
      {
        id: 'event-1',
        title: 'Anthropic announces a model update',
        date: new Date('2026-06-01T00:00:00Z'),
        mentionType: 'mentioned',
        isPaywalled: false,
        paywallReason: null,
      },
    ]);
  });
});

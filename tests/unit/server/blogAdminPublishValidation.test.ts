import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockBlogPostFindUnique = jest.fn();
const mockBlogPostUpdate = jest.fn();
const mockValidateBlogEntityLinks = jest.fn();

jest.mock('../../../server/src/db', () => ({
  prisma: {
    blogPost: {
      findUnique: mockBlogPostFindUnique,
      update: mockBlogPostUpdate,
    },
  },
}));

jest.mock('../../../server/src/services/blogEntityLinkValidator', () => ({
  validateBlogEntityLinks: mockValidateBlogEntityLinks,
}));

import { publishPost } from '../../../server/src/services/blogAdmin';

beforeEach(() => {
  jest.clearAllMocks();
  mockBlogPostFindUnique.mockResolvedValue({
    id: 'post-1',
    bodyMarkdown: 'Read [[glossary:transformer|Transformers]].',
    scheduledFor: null,
    relations: [{ entityType: 'glossary_term', entityId: 'transformer' }],
  });
  mockBlogPostUpdate.mockResolvedValue({ id: 'post-1', status: 'published' });
  mockValidateBlogEntityLinks.mockResolvedValue({
    valid: true,
    targets: [],
    invalidTargets: [],
    unsupportedRelationTypes: [],
  });
});

describe('blogAdmin publish entity validation', () => {
  it('blocks the publish state transition when any preview target is unroutable', async () => {
    mockValidateBlogEntityLinks.mockResolvedValue({
      valid: false,
      targets: [],
      invalidTargets: [{
        entityType: 'glossary_term',
        target: 'invented-concept',
        path: '/glossary/invented-concept',
        label: 'Invented concept',
        sources: ['shortcode'],
        reason: 'not_publicly_routable',
      }],
      unsupportedRelationTypes: [],
    });

    await expect(publishPost('post-1')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Blog post contains entity links that do not resolve to public atlas content.',
    });
    expect(mockBlogPostUpdate).not.toHaveBeenCalled();
  });

  it('publishes only after all targets pass validation', async () => {
    await expect(publishPost('post-1')).resolves.toEqual({
      id: 'post-1',
      status: 'published',
    });

    expect(mockValidateBlogEntityLinks).toHaveBeenCalledWith(
      'Read [[glossary:transformer|Transformers]].',
      [{ entityType: 'glossary_term', entityId: 'transformer' }],
    );
    expect(mockBlogPostUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'post-1' },
      data: expect.objectContaining({ status: 'published' }),
    }));
  });
});

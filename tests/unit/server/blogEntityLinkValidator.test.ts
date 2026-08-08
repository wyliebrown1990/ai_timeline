import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPersonFindMany = jest.fn();
const mockOrganizationFindMany = jest.fn();
const mockGlossaryFindMany = jest.fn();
const mockMilestoneFindMany = jest.fn();
const mockSubjectFindMany = jest.fn();

jest.mock('../../../server/src/db', () => ({
  prisma: {
    person: { findMany: mockPersonFindMany },
    organization: { findMany: mockOrganizationFindMany },
    glossaryTerm: { findMany: mockGlossaryFindMany },
    milestone: { findMany: mockMilestoneFindMany },
    subject: { findMany: mockSubjectFindMany },
  },
}));

import {
  extractBlogEntityTargets,
  validateBlogEntityLinks,
} from '../../../server/src/services/blogEntityLinkValidator';

beforeEach(() => {
  jest.clearAllMocks();
  mockPersonFindMany.mockResolvedValue([]);
  mockOrganizationFindMany.mockResolvedValue([]);
  mockGlossaryFindMany.mockResolvedValue([]);
  mockMilestoneFindMany.mockResolvedValue([]);
  mockSubjectFindMany.mockResolvedValue([]);
});

describe('blogEntityLinkValidator', () => {
  it('extracts every hover-preview route, including plain subject links', () => {
    const result = extractBlogEntityTargets([
      '[[person:sam-altman|Sam Altman]] led [[organization:openai|OpenAI]].',
      'Read [[glossary:transformer|Transformers]] and [[event:E2017_TRANSFORMER|the event]].',
      'Browse [Machine Learning](/subjects/science-cs-ml).',
    ].join('\n'));

    expect(result.targets).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'person', target: 'sam-altman' }),
      expect.objectContaining({ entityType: 'organization', target: 'openai' }),
      expect.objectContaining({ entityType: 'glossary_term', target: 'transformer' }),
      expect.objectContaining({ entityType: 'milestone', target: 'E2017_TRANSFORMER' }),
      expect.objectContaining({ entityType: 'subject', target: 'science-cs-ml' }),
    ]));
  });

  it('accepts only targets backed by publicly routable records', async () => {
    mockPersonFindMany.mockResolvedValue([{ id: 'person-1', slug: 'sam-altman' }]);
    mockOrganizationFindMany.mockResolvedValue([{ id: 'org-1', slug: 'openai' }]);
    mockGlossaryFindMany.mockResolvedValue([{ id: 'term-1', slug: 'transformer' }]);
    mockMilestoneFindMany.mockResolvedValue([{ id: 'E2017_TRANSFORMER' }]);
    mockSubjectFindMany.mockResolvedValue([{ id: 'subject-1', slug: 'science-cs-ml' }]);

    const result = await validateBlogEntityLinks([
      '[[person:sam-altman|Sam Altman]] led [[organization:openai|OpenAI]].',
      'Read [[glossary:transformer|Transformers]] and [[event:E2017_TRANSFORMER|the event]].',
      'Browse [Machine Learning](/subjects/science-cs-ml).',
    ].join('\n'));

    expect(result.valid).toBe(true);
    expect(result.invalidTargets).toEqual([]);
    expect(mockPersonFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [{ slug: { in: ['sam-altman'] } }, { id: { in: ['sam-altman'] } }],
        status: 'published',
      },
    }));
  });

  it('accepts legacy database IDs in relation metadata without treating them as public slugs', async () => {
    mockGlossaryFindMany.mockResolvedValue([{ id: 'term-1', slug: 'transformer' }]);

    const relationOnly = await validateBlogEntityLinks('', [
      { entityType: 'glossary_term', entityId: 'term-1' },
    ]);
    expect(relationOnly.valid).toBe(true);

    const visibleId = await validateBlogEntityLinks(
      'Read [[glossary:term-1|Transformers]].',
      [{ entityType: 'glossary_term', entityId: 'term-1' }],
    );
    expect(visibleId.valid).toBe(false);
    expect(visibleId.invalidTargets).toEqual([
      expect.objectContaining({
        entityType: 'glossary_term',
        target: 'term-1',
        sources: expect.arrayContaining(['shortcode', 'relation']),
      }),
    ]);
  });

  it('blocks a synthetic glossary slug even when it looks canonical', async () => {
    const result = await validateBlogEntityLinks(
      'A [[glossary:teleoperated-humanoid-robot|teleoperated humanoid robot]] performed surgery.',
      [{ entityType: 'glossary_term', entityId: 'teleoperated-humanoid-robot' }],
    );

    expect(result.valid).toBe(false);
    expect(result.invalidTargets).toEqual([
      expect.objectContaining({
        entityType: 'glossary_term',
        target: 'teleoperated-humanoid-robot',
        path: '/glossary/teleoperated-humanoid-robot',
        sources: expect.arrayContaining(['shortcode', 'relation']),
      }),
    ]);
  });

  it('blocks unsupported relation types instead of silently publishing them', async () => {
    const result = await validateBlogEntityLinks('', [
      { entityType: 'invented_type', entityId: 'made-up' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.unsupportedRelationTypes).toEqual(['invented_type']);
  });
});

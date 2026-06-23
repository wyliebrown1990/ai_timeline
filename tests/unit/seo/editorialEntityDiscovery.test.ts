import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGlossaryFindMany = jest.fn();
const mockPersonFindMany = jest.fn();
const mockOrganizationFindMany = jest.fn();
const mockGetLinkedMilestones = jest.fn();
const mockGetPersonKeyConcepts = jest.fn();
const mockGetOrganizationKeyConcepts = jest.fn();
const mockSearchMilestones = jest.fn();

jest.mock('../../../server/src/db', () => ({
  prisma: {
    glossaryTerm: {
      findMany: mockGlossaryFindMany,
    },
    person: {
      findMany: mockPersonFindMany,
    },
    organization: {
      findMany: mockOrganizationFindMany,
    },
  },
}));

jest.mock('../../../server/src/services/glossary', () => ({
  getLinkedMilestones: mockGetLinkedMilestones,
}));

jest.mock('../../../server/src/services/persons', () => ({
  getKeyConcepts: mockGetPersonKeyConcepts,
}));

jest.mock('../../../server/src/services/organizations', () => ({
  getKeyConcepts: mockGetOrganizationKeyConcepts,
}));

jest.mock('../../../server/src/services/milestones', () => ({
  search: mockSearchMilestones,
}));

import { discoverEditorialEntityInventory } from '../../../server/src/services/seo/editorialEntityDiscovery';

describe('editorialEntityDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGlossaryFindMany.mockResolvedValue([
      {
        id: 'recursive-self-improvement',
        term: 'recursive self-improvement',
        slug: 'recursive-self-improvement',
        shortDefinition: 'A system improving itself iteratively.',
      },
      {
        id: 'alignment',
        term: 'alignment',
        slug: 'alignment',
        shortDefinition: 'Matching system behavior to human goals.',
      },
      {
        id: 'theory-of-mind',
        term: 'Theory of Mind',
        slug: 'theory-of-mind',
        shortDefinition: 'Reasoning about another mind.',
      },
      {
        id: 'credit-assignment-problem',
        term: 'Credit Assignment Problem',
        slug: 'credit-assignment-problem',
        shortDefinition: 'Connecting outcomes back to causes.',
      },
    ]);
    mockPersonFindMany.mockResolvedValue([
      {
        id: 'jensen-huang',
        canonicalName: 'Jensen Huang',
        slug: 'jensen-huang',
        aliases: '[]',
      },
    ]);
    mockOrganizationFindMany.mockResolvedValue([
      {
        id: 'nvidia',
        name: 'NVIDIA',
        slug: 'nvidia',
      },
    ]);
    mockGetPersonKeyConcepts.mockResolvedValue([]);
    mockGetOrganizationKeyConcepts.mockResolvedValue([
      {
        glossaryTerm: {
          id: 'alignment',
          term: 'alignment',
          slug: 'alignment',
          shortDefinition: 'Matching system behavior to human goals.',
          category: 'core_concept',
        },
      },
    ]);
    mockGetLinkedMilestones.mockImplementation(async (termId: string) => (
      termId === 'recursive-self-improvement'
        ? [{
            milestone: {
              id: 'E2020_GPT3',
              title: 'GPT-3 demonstrated few-shot generalization at scale',
              date: new Date('2020-06-11T00:00:00.000Z'),
              category: 'research',
              significance: 10,
            },
          }]
        : []
    ));
    mockSearchMilestones.mockResolvedValue({
      results: [
        {
          id: 'E2020_GPT3',
          title: 'GPT-3 demonstrated few-shot generalization at scale',
          matchedFields: ['title'],
        },
      ],
      total: 1,
    });
  });

  it('discovers direct body matches and expands them through the atlas graph', async () => {
    const inventory = await discoverEditorialEntityInventory({
      title: 'Can recursive self-improvement work on NVIDIA hardware?',
      bodyMarkdown: [
        '## Key facts',
        '',
        '- Recursive self-improvement faces an alignment problem.',
        '- Jensen Huang has framed NVIDIA as a critical AI infrastructure company.',
        '',
        '## What did GPT-3 change?',
        '',
        'Recursive self-improvement sounds plausible until alignment and evaluation start to fail.',
      ].join('\n'),
      baseInventory: [],
    });

    expect(inventory).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'glossary_term',
        id: 'recursive-self-improvement',
        path: '/glossary/recursive-self-improvement',
      }),
      expect.objectContaining({
        entityType: 'glossary_term',
        id: 'alignment',
        path: '/glossary/alignment',
      }),
      expect.objectContaining({
        entityType: 'person',
        id: 'jensen-huang',
        path: '/people/jensen-huang',
      }),
      expect.objectContaining({
        entityType: 'organization',
        id: 'nvidia',
        path: '/organizations/nvidia',
      }),
      expect.objectContaining({
        entityType: 'milestone',
        id: 'E2020_GPT3',
        path: '/events/E2020_GPT3',
      }),
    ]));
  });

  it('does not treat normal-cased words as uppercase glossary acronyms', async () => {
    const inventory = await discoverEditorialEntityInventory({
      title: 'Tom said the cap on chip spending matters',
      bodyMarkdown: [
        '## Key facts',
        '',
        '- Tom argued the cap would force harder trade-offs in accelerator design.',
        '- The article only discusses spending limits and a quoted speaker, not cognition research or reinforcement-learning diagnostics.',
      ].join('\n'),
      baseInventory: [],
    });

    expect(inventory).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'theory-of-mind' }),
      expect.objectContaining({ id: 'credit-assignment-problem' }),
    ]));
  });

  it('filters graph-expanded glossary terms that have no lexical support in the draft', async () => {
    mockGetOrganizationKeyConcepts.mockResolvedValueOnce([
      {
        glossaryTerm: {
          id: 'knowledge-base-ai',
          term: 'Knowledge Base (AI)',
          slug: 'knowledge-base-ai',
          shortDefinition: 'Structured information used by AI systems.',
          category: 'core_concept',
        },
      },
    ]);

    const inventory = await discoverEditorialEntityInventory({
      title: 'Why NVIDIA keeps talking about AI infrastructure',
      bodyMarkdown: [
        '## Key facts',
        '',
        '- NVIDIA keeps framing compute, deployment, and inference efficiency as the hard constraint.',
        '- The piece stays focused on chips, serving costs, and latency trade-offs.',
      ].join('\n'),
      baseInventory: [],
    });

    expect(inventory).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'knowledge-base-ai' }),
    ]));
  });

  it('keeps graph-expanded glossary terms when the draft language clearly supports them', async () => {
    mockGetOrganizationKeyConcepts.mockResolvedValueOnce([
      {
        glossaryTerm: {
          id: 'knowledge-base-ai',
          term: 'Knowledge Base (AI)',
          slug: 'knowledge-base-ai',
          shortDefinition: 'Structured information used by AI systems.',
          category: 'core_concept',
        },
      },
    ]);

    const inventory = await discoverEditorialEntityInventory({
      title: 'Why NVIDIA keeps talking about AI infrastructure',
      bodyMarkdown: [
        '## Key facts',
        '',
        '- NVIDIA keeps arguing that a knowledge base is only as useful as the retrieval and serving layer underneath it.',
      ].join('\n'),
      baseInventory: [],
    });

    expect(inventory).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'glossary_term',
        id: 'knowledge-base-ai',
        path: '/glossary/knowledge-base-ai',
      }),
    ]));
  });
});

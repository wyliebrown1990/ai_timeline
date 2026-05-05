import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { EditorialOpportunity } from '../../../server/src/services/seo/editorialOpportunitySelector';

const mockLoadLinkInventory = jest.fn();
const mockLoadNewsHooks = jest.fn();
const mockRunSlopPreflight = jest.fn();
const mockFindDuplicateEntityReason = jest.fn();

jest.mock('../../../server/src/services/seo/briefGenerator', () => ({
  loadLinkInventory: mockLoadLinkInventory,
  loadNewsHooks: mockLoadNewsHooks,
  runSlopPreflight: mockRunSlopPreflight,
  findDuplicateEntityReason: mockFindDuplicateEntityReason,
  parseSerperSourceRef: (value: unknown) => value,
}));

import { buildEditorialBlogCompositionBrief } from '../../../server/src/services/seo/blogDraftComposer';

function opportunity(overrides: Partial<EditorialOpportunity> = {}): EditorialOpportunity {
  return {
    id: 'proposal-1',
    sourceType: 'proposal',
    action: 'auto_publish',
    title: 'AI timeline systems map',
    targetKeyword: 'ai timeline',
    rationale: 'Strong fit.',
    confidence: 0.9,
    source: {
      id: 'proposal-1',
      sourceQuery: 'ai timeline',
      linkInventory: [
        { entityType: 'glossary_term', id: 'machine-learning', label: 'Machine learning', path: '/glossary/machine-learning', reason: 'Relevant term.' },
        { entityType: 'organization', id: 'openai', label: 'OpenAI', path: '/organizations/openai', reason: 'Relevant organization.' },
        { entityType: 'person', id: 'sam-altman', label: 'Sam Altman', path: '/people/sam-altman', reason: 'Relevant person.' },
      ],
      newsHooks: [],
    },
    ...overrides,
  } as EditorialOpportunity;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadLinkInventory.mockResolvedValue([]);
  mockLoadNewsHooks.mockResolvedValue([]);
  mockRunSlopPreflight.mockResolvedValue(null);
  mockFindDuplicateEntityReason.mockResolvedValue(null);
});

describe('blogDraftComposer', () => {
  it('reuses proposal link inventory instead of rebuilding a parallel context', async () => {
    const brief = await buildEditorialBlogCompositionBrief(opportunity());

    expect(mockLoadLinkInventory).not.toHaveBeenCalled();
    expect(brief.linkInventory).toHaveLength(3);
    expect(brief.blockers).toEqual([]);
    expect(brief.winnabilityNotes.join(' ')).toContain('Strong internal-link base');
  });

  it('loads shared link inventory for keyword rows and blocks weak internal-link bases', async () => {
    mockLoadLinkInventory.mockResolvedValue([
      { entityType: 'glossary_term', id: 'agent', label: 'AI agent', path: '/glossary/ai-agent', reason: 'Relevant term.' },
    ]);

    const brief = await buildEditorialBlogCompositionBrief(opportunity({
      id: 'keyword-1',
      sourceType: 'keyword',
      targetKeyword: 'ai agent orchestration',
      source: {
        id: 'keyword-1',
        sourceType: 'serp_sample',
        seedQuery: 'ai agent orchestration',
        sourceRef: {
          vendor: 'serper',
          requestKey: 'serper:ai-agent-orchestration',
          query: 'ai agent orchestration',
          competitionProxy: 42,
          strongDomainCount: 1,
          topDomains: ['example.com'],
          peopleAlsoAskCount: 4,
          competitionReason: 'Mixed SERP.',
        },
        overallScore: 72,
        demandProxy: 70,
        competitionProxy: 42,
        laeaFitScore: 88,
      },
    }));

    expect(mockLoadLinkInventory).toHaveBeenCalledWith('ai agent orchestration');
    expect(brief.serperSourceRef?.requestKey).toBe('serper:ai-agent-orchestration');
    expect(brief.blockers).toContain('Fewer than 3 strong internal links are available for this topic.');
  });
});

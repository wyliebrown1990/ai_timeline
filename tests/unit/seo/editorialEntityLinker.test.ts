import { describe, expect, it } from '@jest/globals';
import { enforceEditorialEntityLinks, scorePreviewEntityMix } from '../../../server/src/services/seo/editorialEntityLinker';

const LINK_INVENTORY = [
  {
    entityType: 'glossary_term' as const,
    id: 'machine-learning',
    label: 'Machine learning',
    path: '/glossary/machine-learning',
    reason: 'Relevant glossary term.',
  },
  {
    entityType: 'organization' as const,
    id: 'openai',
    label: 'OpenAI',
    path: '/organizations/openai',
    reason: 'Relevant organization.',
  },
  {
    entityType: 'person' as const,
    id: 'sam-altman',
    label: 'Sam Altman',
    path: '/people/sam-altman',
    reason: 'Relevant person.',
  },
  {
    entityType: 'glossary_term' as const,
    id: 'ai-safety',
    label: 'AI Safety',
    path: '/glossary/ai-safety',
    reason: 'Relevant glossary term.',
  },
];

describe('editorialEntityLinker', () => {
  it('inserts previewable entity shortcodes on first natural mention and derives relations', () => {
    const result = enforceEditorialEntityLinks({
      bodyMarkdown: [
        'Machine learning became commercially visible when OpenAI productized the research wave and Sam Altman became one of its most visible executives.',
        '',
        '## Key facts',
        '',
        '- The story is about distribution, not just labs.',
      ].join('\n'),
      linkInventory: LINK_INVENTORY,
      relations: [],
    });

    expect(result.bodyMarkdown).toContain('[[glossary:machine-learning|Machine learning]]');
    expect(result.bodyMarkdown).toContain('[[organization:openai|OpenAI]]');
    expect(result.bodyMarkdown).toContain('[[person:sam-altman|Sam Altman]]');
    expect(result.previewEntityLinkCount).toBe(3);
    expect(result.relations).toEqual(expect.arrayContaining([
      { entityType: 'glossary_term', entityId: 'machine-learning', relationLabel: undefined },
      { entityType: 'organization', entityId: 'openai', relationLabel: undefined },
      { entityType: 'person', entityId: 'sam-altman', relationLabel: undefined },
    ]));
  });

  it('adds an atlas connections fallback section when the prose does not naturally mention enough entities', () => {
    const result = enforceEditorialEntityLinks({
      bodyMarkdown: [
        'OpenAI changed how the public encountered generative AI because distribution, not raw capability, set the pace of adoption.',
        '',
        '## Key facts',
        '',
        '- Distribution determines which models become products.',
        '',
        '## Sources',
        '',
        '- [One source](https://example.com/source)',
      ].join('\n'),
      linkInventory: LINK_INVENTORY,
      relations: [],
    });

    expect(result.bodyMarkdown).toContain('[[organization:openai|OpenAI]]');
    expect(result.bodyMarkdown).toContain('## Atlas connections');
    expect(result.bodyMarkdown).toContain('[[glossary:machine-learning|Machine learning]]');
    expect(result.bodyMarkdown).toContain('[[person:sam-altman|Sam Altman]]');
    expect(result.previewEntityLinkCount).toBe(3);
  });

  it('strips bogus filler-word entity links and relinks the real entity mention', () => {
    const result = enforceEditorialEntityLinks({
      bodyMarkdown: [
        'This topic is often framed [[glossary:machine-learning|as]] a commercial shift, but Machine learning is the term readers actually need in the atlas.',
        '',
        '## Key facts',
        '',
        '- Model distribution changed the pace of adoption.',
      ].join('\n'),
      linkInventory: LINK_INVENTORY,
      relations: [],
    });

    expect(result.bodyMarkdown).not.toContain('[[glossary:machine-learning|as]]');
    expect(result.bodyMarkdown).toContain('[[glossary:machine-learning|Machine learning]]');
    expect(result.previewEntityLinkCount).toBe(3);
  });

  it('removes generated entity links whose target is not in the verified atlas inventory', () => {
    const result = enforceEditorialEntityLinks({
      bodyMarkdown: [
        'Speech-to-speech translation has become a useful product phrase, but [Speech-to-speech translation](/glossary/speech-to-speech-translation) is not yet an atlas glossary entry.',
        '',
        'Machine learning and OpenAI still give the article enough real atlas anchors with Sam Altman.',
        '',
        '## Key facts',
        '',
        '- Unsupported entity links should never publish as preview links.',
      ].join('\n'),
      linkInventory: LINK_INVENTORY,
      relations: [],
    });

    expect(result.bodyMarkdown).not.toContain('/glossary/speech-to-speech-translation');
    expect(result.bodyMarkdown).toContain('Speech-to-speech translation is not yet an atlas glossary entry.');
    expect(result.bodyMarkdown).toContain('[[glossary:machine-learning|Machine learning]]');
    expect(result.bodyMarkdown).toContain('[[organization:openai|OpenAI]]');
    expect(result.bodyMarkdown).toContain('[[person:sam-altman|Sam Altman]]');
  });

  it('does not use lowercase stopwords as acronym matches for glossary links', () => {
    const result = enforceEditorialEntityLinks({
      bodyMarkdown: [
        'When AI systems begin modifying themselves, the useful answer is not raw power as a metric, but clearer evaluation and review.',
        '',
        '## Key facts',
        '',
        '- Alignment work still shapes deployment choices.',
      ].join('\n'),
      linkInventory: LINK_INVENTORY,
      relations: [],
    });

    expect(result.bodyMarkdown).not.toContain('[[glossary:ai-safety|as]]');
  });

  it('does not nest later entity links inside shortcodes inserted earlier in the same pass', () => {
    const result = enforceEditorialEntityLinks({
      bodyMarkdown: [
        'OpenAI built one kind of product, but AI agents became a different interface wager.',
        '',
        '## Key facts',
        '',
        '- OpenAI and AI agents both matter for the product layer.',
      ].join('\n'),
      linkInventory: [
        {
          entityType: 'organization',
          id: 'openai',
          label: 'OpenAI',
          path: '/organizations/openai',
          reason: 'Relevant organization.',
        },
        {
          entityType: 'glossary_term',
          id: 'ai-agents',
          label: 'AI Agents',
          path: '/glossary/ai-agents',
          reason: 'Relevant glossary term.',
        },
        {
          entityType: 'glossary_term',
          id: 'knowledge-base-ai',
          label: 'Knowledge Base (AI)',
          path: '/glossary/knowledge-base-ai',
          reason: 'Relevant glossary term.',
        },
      ],
      relations: [],
      minimumPreviewLinks: 3,
    });

    expect(result.bodyMarkdown).not.toContain('[[glossary:[[organization:openai|openai]]|OpenAI]]');
    expect(result.bodyMarkdown).not.toContain('[[glossary:knowledge-base-ai|[[glossary:ai-agents|AI');
  });

  it('prefers the richer entity surface when multiple candidates share the same label family', () => {
    const result = enforceEditorialEntityLinks({
      bodyMarkdown: [
        'OpenAI became the distribution layer for a new class of models.',
        '',
        '## Key facts',
        '',
        '- Distribution changed who reached users first.',
      ].join('\n'),
      linkInventory: [
        {
          entityType: 'organization',
          id: 'openai',
          label: 'OpenAI',
          path: '/organizations/openai',
          reason: 'Relevant organization.',
        },
        {
          entityType: 'glossary_term',
          id: 'openai',
          label: 'OpenAI',
          path: '/glossary/openai',
          reason: 'Expanded from linked glossary concepts in the atlas graph.',
        },
        {
          entityType: 'person',
          id: 'sam-altman',
          label: 'Sam Altman',
          path: '/people/sam-altman',
          reason: 'Relevant person.',
        },
        {
          entityType: 'milestone',
          id: 'E2022_CHATGPT',
          label: 'ChatGPT launch',
          path: '/events/E2022_CHATGPT',
          reason: 'Relevant historical event.',
        },
      ],
      relations: [],
      minimumPreviewLinks: 3,
    });

    expect(result.bodyMarkdown).toContain('[[organization:openai|OpenAI]]');
    expect(result.bodyMarkdown).not.toContain('[[glossary:openai|OpenAI]]');
    expect(result.bodyMarkdown).toContain('[[person:sam-altman|Sam Altman]]');
    expect(result.bodyMarkdown).toContain('[[event:E2022_CHATGPT|ChatGPT launch]]');
  });

  it('keeps low-signal graph glossary terms out of fallback cards when better options exist', () => {
    const result = enforceEditorialEntityLinks({
      bodyMarkdown: [
        'Anthropic keeps pushing the model conversation toward deployment choices and evaluation.',
        '',
        '## Key facts',
        '',
        '- Product strategy determines which capabilities reach users.',
      ].join('\n'),
      linkInventory: [
        {
          entityType: 'organization',
          id: 'anthropic',
          label: 'Anthropic',
          path: '/organizations/anthropic',
          reason: 'Relevant organization.',
        },
        {
          entityType: 'person',
          id: 'dario-amodei',
          label: 'Dario Amodei',
          path: '/people/dario-amodei',
          reason: 'Relevant person.',
        },
        {
          entityType: 'milestone',
          id: 'E2024_CLAUDE35',
          label: 'Claude 3.5 launch',
          path: '/events/E2024_CLAUDE35',
          reason: 'Relevant historical event.',
        },
        {
          entityType: 'glossary_term',
          id: 'knowledge-base-ai',
          label: 'Knowledge Base (AI)',
          path: '/glossary/knowledge-base-ai',
          reason: 'Expanded from linked glossary concepts in the atlas graph.',
        },
      ],
      relations: [],
      minimumPreviewLinks: 3,
    });

    expect(result.bodyMarkdown).toContain('[[organization:anthropic|Anthropic]]');
    expect(result.bodyMarkdown).toContain('[[person:dario-amodei|Dario Amodei]]');
    expect(result.bodyMarkdown).toContain('[[event:E2024_CLAUDE35|Claude 3.5 launch]]');
    expect(result.bodyMarkdown).not.toContain('[[glossary:knowledge-base-ai|Knowledge Base (AI)]]');
  });

  it('still de-duplicates fallback families when the remaining candidate pool is smaller than the target', () => {
    const result = enforceEditorialEntityLinks({
      bodyMarkdown: [
        'Recursive self-improvement remains a live alignment question.',
        '',
        '## Key facts',
        '',
        '- The post does not mention Anthropic by name in the prose body.',
      ].join('\n'),
      linkInventory: [
        {
          entityType: 'organization',
          id: 'anthropic-org',
          label: 'Anthropic',
          path: '/organizations/anthropic',
          reason: 'Relevant organization.',
        },
        {
          entityType: 'glossary_term',
          id: 'anthropic-term',
          label: 'Anthropic',
          path: '/glossary/anthropic',
          reason: 'Existing published relation on this post.',
        },
        {
          entityType: 'glossary_term',
          id: 'ai-safety',
          label: 'AI Safety',
          path: '/glossary/ai-safety',
          reason: 'Relevant glossary term.',
        },
      ],
      relations: [],
      minimumPreviewLinks: 4,
    });

    expect(result.bodyMarkdown).toContain('[[organization:anthropic|Anthropic]]');
    expect(result.bodyMarkdown).not.toContain('[[glossary:anthropic|Anthropic]]');
  });

  it('scores a deduplicated link mix above a same-label duplicate mix', () => {
    const duplicateMix = [
      '## Atlas connections',
      '',
      '- [[glossary:ai-safety|AI Safety]]',
      '- [[organization:anthropic|Anthropic]]',
      '- [[glossary:anthropic|Anthropic]]',
      '- [[glossary:knowledge-base-ai|Knowledge Base (AI)]]',
    ].join('\n');
    const dedupedMix = [
      '## Atlas connections',
      '',
      '- [[glossary:ai-safety|AI Safety]]',
      '- [[organization:anthropic|Anthropic]]',
      '- [[glossary:knowledge-base-ai|Knowledge Base (AI)]]',
    ].join('\n');
    const inventory = [
      {
        entityType: 'glossary_term' as const,
        id: 'ai-safety',
        label: 'AI Safety',
        path: '/glossary/ai-safety',
        reason: 'Relevant glossary term.',
      },
      {
        entityType: 'organization' as const,
        id: 'anthropic-org',
        label: 'Anthropic',
        path: '/organizations/anthropic',
        reason: 'Relevant organization.',
      },
      {
        entityType: 'glossary_term' as const,
        id: 'anthropic-term',
        label: 'Anthropic',
        path: '/glossary/anthropic',
        reason: 'Existing published relation on this post.',
      },
      {
        entityType: 'glossary_term' as const,
        id: 'knowledge-base-ai',
        label: 'Knowledge Base (AI)',
        path: '/glossary/knowledge-base-ai',
        reason: 'Expanded from linked glossary concepts in the atlas graph.',
      },
    ];

    expect(scorePreviewEntityMix(dedupedMix, inventory)).toBeGreaterThan(scorePreviewEntityMix(duplicateMix, inventory));
  });
});

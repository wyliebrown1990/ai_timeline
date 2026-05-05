import { describe, expect, it } from '@jest/globals';
import {
  evaluateBlogQualityGate,
  type BlogQualityGateInput,
} from '../../../server/src/services/seo/blogQualityGate';

const VALID_DESCRIPTION = 'A clear explainer on why AI agents matter now, how they connect to older automation ideas, and what readers should watch next in AI history.';

function validBody(): string {
  return [
    'AI agents are software systems that can plan, use tools, and carry work across multiple steps because modern models can interpret goals and context. The useful way to understand AI agents is not as magic workers, but as a continuation of automation, search, and interface design. That framing matters for readers trying to separate actual capability from marketing fog.',
    '',
    '## Key facts',
    '',
    '- AI agents combine model reasoning, tool use, memory, and workflow control.',
    '- The 2020s agent wave grew out of earlier work on language models and reinforcement learning.',
    '- The durable question is where autonomy creates leverage versus where it creates review burden.',
    '',
    '## Why agents belong in the AI timeline',
    '',
    'The story runs through [[glossary:transformer|transformer architecture]], [[organization:openai|OpenAI]], and [[person:sam-altman|Sam Altman]] because those entities shaped the model and product layer.',
    '',
    '## Sources',
    '',
    '- [OpenAI](/organizations/openai)',
  ].join('\n');
}

function validInput(overrides: Partial<BlogQualityGateInput> = {}): BlogQualityGateInput {
  return {
    title: 'AI Agents Explained',
    slug: 'ai-agents-explained',
    seoTitle: 'AI Agents Explained | LAEA',
    seoDescription: VALID_DESCRIPTION,
    excerpt: 'A concise explanation of AI agents in historical context.',
    bodyMarkdown: validBody(),
    canonicalUrl: 'https://letaiexplainai.com/blog/ai-agents-explained',
    tags: ['agents', 'automation', 'language models'],
    subjectIds: ['science-cs-ml'],
    relations: [
      { entityType: 'glossary_term', entityId: 'transformer' },
      { entityType: 'organization', entityId: 'openai' },
      { entityType: 'person', entityId: 'sam-altman' },
    ],
    intendedAction: 'auto_publish',
    ...overrides,
  };
}

describe('blogQualityGate', () => {
  it('passes a well-formed generated blog draft', () => {
    const result = evaluateBlogQualityGate(validInput());

    expect(result.passed).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.metrics.internalLinkCount).toBeGreaterThanOrEqual(3);
    expect(result.metrics.shortcodeCount).toBe(3);
  });

  it('blocks weak metadata, body H1s, unresolved shortcodes, and too few internal links', () => {
    const result = evaluateBlogQualityGate(validInput({
      slug: 'AI_Agents',
      seoTitle: 'Everything You Need To Know About AI Agents In One Ultimate Guide',
      seoDescription: 'Too short.',
      bodyMarkdown: [
        '# AI Agents',
        '',
        'AI agents are tools. [[company:fake|FakeCo]]',
        '',
        '## Key facts',
        '',
        '- Agents use tools.',
      ].join('\n'),
      subjectIds: [],
      relations: [],
    }));

    expect(result.passed).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      'Slug must be lowercase kebab-case.',
      'seoTitle is required and must be <= 60 characters.',
      'seoDescription is required and must be 140-160 characters.',
      'Body markdown must not include a leading H1 because BlogPostPage renders the page H1.',
      'At least 3 distinct internal links are required.',
      'Unsupported markdown shortcode(s): [[company:fake|FakeCo]]',
      'Title or seoTitle uses generic/sloppy SERP phrasing.',
      'At least one subject is required.',
      'Opening 150 words must answer the target query directly.',
    ]));
  });

  it('blocks custom canonicals outside the blog URL pattern', () => {
    const result = evaluateBlogQualityGate(validInput({
      canonicalUrl: 'https://example.com/duplicate',
    }));

    expect(result.passed).toBe(false);
    expect(result.blockers).toContain(
      'Canonical URL must default to the absolute /blog/:slug URL unless a duplicate-content rationale is recorded.'
    );
  });

  it('counts stable top-level atlas routes as internal links', () => {
    const result = evaluateBlogQualityGate(validInput({
      bodyMarkdown: [
        'AI timelines are useful because they help readers connect model releases, research bottlenecks, and public adoption into one navigable history. The best answer is a map, not a flat list, because the important shifts usually happen when infrastructure, ideas, and products start reinforcing each other.',
        '',
        '## Key facts',
        '',
        '- The timeline view anchors the topic in dated events.',
        '- The glossary view explains recurring terms.',
        '- The learning view gives readers a route through the material.',
        '',
        '## Where should readers start?',
        '',
        'Start with the [Timeline](/timeline), use the [AI glossary](/glossary), then move through [Learn](/learn).',
        '',
        '## Sources',
        '',
        '- [AI Timeline](/blog/ai-timeline)',
      ].join('\n'),
      relations: [],
    }));

    expect(result.metrics.internalLinkCount).toBeGreaterThanOrEqual(3);
    expect(result.blockers).not.toContain('At least 3 distinct internal links are required.');
  });
});

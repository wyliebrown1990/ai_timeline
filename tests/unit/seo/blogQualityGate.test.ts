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
    targetKeyword: 'ai agents explained',
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
    strongInternalLinkCandidates: 3,
    hasArticleJsonLdPath: true,
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
    expect(result.metrics.sourceLinkCount).toBeGreaterThanOrEqual(1);
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

  it('blocks auto-publish for risky claims without visible source links', () => {
    const result = evaluateBlogQualityGate(validInput({
      bodyMarkdown: [
        'AI agent orchestration matters because enterprise teams started hitting governance limits as workflows became more complex. The key answer is that orchestration turns one overloaded agent into a coordinated system, which matters because complex tasks need separate retrieval, analysis, and review responsibilities.',
        '',
        '## Key facts',
        '',
        '- Enterprise adoption reached 60% by mid 2024.',
        '- Microsoft research showed single agents had 40% higher error rates when too many capabilities were combined.',
        '- Salesforce integrated agent routing in Q2 2024.',
        '',
        '## Why did orchestration matter?',
        '',
        'Use the [Timeline](/timeline), [AI glossary](/glossary), and [Learn](/learn) to map the context.',
        '',
        '## Sources',
        '',
        '- No source yet.',
      ].join('\n'),
    }));

    expect(result.metrics.riskyClaimCount).toBeGreaterThan(0);
    expect(result.metrics.sourceLinkCount).toBe(0);
    expect(result.blockers).toContain(
      'Auto-publish requires visible source links for numeric, vendor-specific, or research-like claims.'
    );
  });

  it('allows sourced risky claims to pass the source-link gate', () => {
    const result = evaluateBlogQualityGate(validInput({
      bodyMarkdown: [
        'AI agent orchestration matters because enterprise teams started hitting governance limits as workflows became more complex. The key answer is that orchestration turns one overloaded agent into a coordinated system, which matters because complex tasks need separate retrieval, analysis, and review responsibilities.',
        '',
        '## Key facts',
        '',
        '- LangChain introduced multi-agent workflow guidance for orchestrating specialized agents.',
        '- Microsoft AutoGen became one visible framework for multi-agent coordination.',
        '- The atlas view is strongest when these tools are treated as workflow infrastructure, not magic autonomy.',
        '',
        '## Why did orchestration matter?',
        '',
        'Use the [Timeline](/timeline), [AI glossary](/glossary), and [Learn](/learn) to map the context.',
        '',
        '## Sources',
        '',
        '- [LangChain multi-agent documentation](https://docs.langchain.com/oss/python/langchain/multi-agent/index)',
        '- [Microsoft AutoGen project](https://www.microsoft.com/en-us/research/project/autogen/)',
      ].join('\n'),
    }));

    expect(result.metrics.riskyClaimCount).toBeGreaterThan(0);
    expect(result.metrics.sourceLinkCount).toBeGreaterThanOrEqual(2);
    expect(result.blockers).not.toContain(
      'Auto-publish requires visible source links for numeric, vendor-specific, or research-like claims.'
    );
  });

  it('blocks auto-publish for too-broad keywords, weak pre-draft links, missing schema path, or no thesis', () => {
    const result = evaluateBlogQualityGate(validInput({
      targetKeyword: 'AI',
      strongInternalLinkCandidates: 1,
      hasArticleJsonLdPath: false,
      bodyMarkdown: [
        'AI is a broad field with many dates, people, and organizations. This recap names some areas of AI and gives readers a quick overview of the category. It is useful as a summary of common terms and milestones for readers who want an introduction.',
        '',
        '## Key facts',
        '',
        '- AI includes many techniques.',
        '- AI has a long history.',
        '- AI appears in many products.',
        '',
        '## What should readers open next?',
        '',
        'Use the [Timeline](/timeline), [AI glossary](/glossary), and [Learn](/learn).',
        '',
        '## Sources',
        '',
        '- [AI Timeline](/blog/ai-timeline)',
      ].join('\n'),
    }));

    expect(result.blockers).toEqual(expect.arrayContaining([
      'Auto-publish requires at least 3 strong internal-link candidates before drafting.',
      'Target keyword "AI" is too broad for autonomous publishing.',
      'Auto-publish requires a clear thesis; generic recaps stay draft-only.',
      'Auto-publish requires the existing Article and Breadcrumb JSON-LD path.',
    ]));
  });
});

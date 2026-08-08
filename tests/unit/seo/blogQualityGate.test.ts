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
    expect(result.metrics.previewEntityLinkCount).toBe(3);
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

  it('blocks preview links that anchor on filler text instead of the entity name', () => {
    const result = evaluateBlogQualityGate(validInput({
      bodyMarkdown: [
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
        'The story runs through [[glossary:transformer|as]], [[organization:openai|OpenAI]], and [[person:sam-altman|Sam Altman]] because those entities shaped the model and product layer.',
        '',
        '## Sources',
        '',
        '- [OpenAI](/organizations/openai)',
      ].join('\n'),
    }));

    expect(result.passed).toBe(false);
    expect(result.blockers).toContain(
      'Previewable entity links must anchor on the entity name, not filler text: [[glossary:transformer|as]]'
    );
  });

  it('blocks preview links that do not target verified atlas entity paths', () => {
    const result = evaluateBlogQualityGate(validInput({
      bodyMarkdown: [
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
        'The story runs through [[glossary:transformer|transformer architecture]], [[organization:openai|OpenAI]], and [Speech-to-speech translation](/glossary/speech-to-speech-translation) because those entities shaped the product layer.',
        '',
        '## Sources',
        '',
        '- [OpenAI](/organizations/openai)',
      ].join('\n'),
      allowedPreviewEntityPaths: ['/glossary/transformer', '/organizations/openai', '/people/sam-altman'],
    }));

    expect(result.passed).toBe(false);
    expect(result.blockers).toContain(
      'Previewable entity links must target verified atlas entries: /glossary/speech-to-speech-translation'
    );
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
    expect(result.metrics.previewEntityLinkCount).toBe(0);
    expect(result.blockers).toContain(
      'At least 3 distinct previewable entity links are required (/people, /organizations, /glossary, /events).'
    );
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

  it('caps the entity-link quota while preserving category quality', () => {
    const result = evaluateBlogQualityGate(validInput({
      availablePreviewLinkCandidates: 6,
      availablePreviewEntityTypes: ['glossary_term', 'person', 'organization', 'milestone'],
      availableNonOrganizationCandidates: 4,
    }));

    expect(result.passed).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      'Previewable LAEA links must include at least 3 non-organization entities when the atlas inventory supports it.',
    ]));
    expect(result.blockers).not.toContain(
      'At least 6 distinct previewable entity links are required (/people, /organizations, /glossary, /events).',
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

  it('blocks auto-publish for extraordinary claims with only one visible source', () => {
    const result = evaluateBlogQualityGate(validInput({
      bodyMarkdown: [
        'OpenAI solved a famous math problem because the reported result would change how people understand automated reasoning. The useful answer is that such a claim needs careful sourcing before it belongs in the AI timeline, because one write-up is not enough to treat a mathematical result as settled.',
        '',
        '## Key facts',
        '',
        '- OpenAI reportedly found counterexamples to a long-running conjecture.',
        '- A claim this large needs independent corroboration before publication.',
        '- The atlas should separate reported claims from verified milestones.',
        '',
        '## Why does this belong in the timeline?',
        '',
        'Use the [Timeline](/timeline), [AI glossary](/glossary), and [Learn](/learn) to map the context.',
        '',
        '## Sources',
        '',
        '- [One report](https://example.com/openai-math-claim)',
      ].join('\n'),
    }));

    expect(result.metrics.sourceLinkCount).toBe(1);
    expect(result.blockers).toContain(
      'Auto-publish requires at least 2 independent visible source links for extraordinary claims.'
    );
  });

  it('allows extraordinary claims through the source-count gate when independently sourced', () => {
    const result = evaluateBlogQualityGate(validInput({
      bodyMarkdown: [
        'A verified breakthrough in AI reasoning matters because independent sources can show whether a result changed from rumor into evidence. The useful answer is that readers need sourcing discipline around solved-problem claims, because those claims can reshape a timeline only when the record is strong.',
        '',
        '## Key facts',
        '',
        '- Researchers solved a constrained reasoning benchmark in a documented setting.',
        '- Independent coverage helps separate benchmark progress from broad capability claims.',
        '- The atlas should anchor any breakthrough in visible source context.',
        '',
        '## Why does this belong in the timeline?',
        '',
        'Use the [Timeline](/timeline), [AI glossary](/glossary), and [Learn](/learn) to map the context.',
        '',
        '## Sources',
        '',
        '- [Primary source](https://example.com/primary)',
        '- [Independent source](https://example.com/independent)',
      ].join('\n'),
    }));

    expect(result.metrics.sourceLinkCount).toBe(2);
    expect(result.blockers).not.toContain(
      'Auto-publish requires at least 2 independent visible source links for extraordinary claims.'
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

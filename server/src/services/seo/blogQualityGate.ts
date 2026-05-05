const SITE_ORIGIN = 'https://letaiexplainai.com';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENTITY_SHORTCODE_PATTERN = /\[\[(person|organization|glossary|event):([a-zA-Z0-9_-]+)\|([^\]]+)\]\]/g;
const ENTITY_SHORTCODE_EXACT_PATTERN = /^\[\[(person|organization|glossary|event):([a-zA-Z0-9_-]+)\|([^\]]+)\]\]$/;
const ANY_SHORTCODE_PATTERN = /\[\[([^\]]+)\]\]/g;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\(([^)]+)\)/g;
const HEADING_PATTERN = /^#{2,3}\s+(.+)$/gm;
const INTERNAL_LINK_PREFIXES = [
  '/people/',
  '/organizations/',
  '/glossary/',
  '/events/',
  '/subjects/',
  '/news/',
  '/learn/',
  '/timeline/',
  '/blog/',
];
const INTERNAL_LINK_EXACT_PATHS = new Set([
  '/glossary',
  '/learn',
  '/timeline',
  '/news',
  '/blog',
]);
const SLOP_TITLE_PATTERNS = [
  /\bultimate guide\b/i,
  /\beverything you need to know\b/i,
  /\btop\s+\d+\b/i,
  /\bgame[- ]changer\b/i,
  /\brevolutionary\b/i,
];
const RISKY_CLAIM_PATTERNS = [
  /\b\d+(?:\.\d+)?\s?%/,
  /\b\d+(?:\.\d+)?\s?(?:x|times)\b/i,
  /\bQ[1-4]\s+20\d{2}\b/i,
  /\b(?:early|mid|late)\s+20\d{2}\b/i,
  /\b(?:research|study|report|survey|benchmark|data)\s+(?:showed|shows|found|suggests|indicates)\b/i,
  /\b(?:OpenAI|Google|DeepMind|Microsoft|Meta|Anthropic|NVIDIA|Salesforce|LangChain|AutoGen)\b.*\b(?:released|introduced|announced|showed|found|integrated|launched)\b/i,
  /\b(?:released|introduced|announced|showed|found|integrated|launched)\b.*\b(?:OpenAI|Google|DeepMind|Microsoft|Meta|Anthropic|NVIDIA|Salesforce|LangChain|AutoGen)\b/i,
];

export interface BlogQualityGateInput {
  targetKeyword?: string;
  title: string;
  slug: string;
  seoTitle: string | null | undefined;
  seoDescription: string | null | undefined;
  excerpt: string;
  bodyMarkdown: string;
  canonicalUrl?: string | null;
  tags?: string[];
  subjectIds?: string[];
  relations?: Array<{ entityType: string; entityId: string }>;
  intendedAction: 'auto_publish' | 'draft_only';
  strongInternalLinkCandidates?: number;
  hasArticleJsonLdPath?: boolean;
  clientRenderedCrawlVerified?: boolean;
}

export interface BlogQualityGateResult {
  passed: boolean;
  blockers: string[];
  warnings: string[];
  metrics: {
    internalLinkCount: number;
    shortcodeCount: number;
    wordCount: number;
    sourceLinkCount: number;
    riskyClaimCount: number;
  };
}

function wordCount(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}

function getCanonical(input: BlogQualityGateInput): string {
  return input.canonicalUrl || `${SITE_ORIGIN}/blog/${input.slug}`;
}

function countEntityShortcodes(markdown: string): number {
  return [...markdown.matchAll(ENTITY_SHORTCODE_PATTERN)].length;
}

function findUnsupportedShortcodes(markdown: string): string[] {
  return [...markdown.matchAll(ANY_SHORTCODE_PATTERN)]
    .map((match) => match[0])
    .filter((shortcode) => !ENTITY_SHORTCODE_EXACT_PATTERN.test(shortcode));
}

function countInternalLinks(markdown: string): number {
  const hrefs = new Set<string>();

  for (const match of markdown.matchAll(ENTITY_SHORTCODE_PATTERN)) {
    const type = match[1];
    const slug = match[2];
    const href =
      type === 'person'
        ? `/people/${slug}`
        : type === 'organization'
          ? `/organizations/${slug}`
          : type === 'glossary'
            ? `/glossary/${slug}`
            : `/events/${slug}`;
    hrefs.add(href);
  }

  for (const match of markdown.matchAll(MARKDOWN_LINK_PATTERN)) {
    const href = match[1].trim();
    if (
      INTERNAL_LINK_EXACT_PATHS.has(href) ||
      INTERNAL_LINK_PREFIXES.some((prefix) => href.startsWith(prefix)) ||
      href.startsWith(`${SITE_ORIGIN}/`)
    ) {
      hrefs.add(href);
    }
  }

  return hrefs.size;
}

function hasVisibleKeyFacts(markdown: string): boolean {
  return /^#{2,3}\s+(key facts|summary|quick answer)\b/im.test(markdown);
}

function hasVisibleCitations(markdown: string): boolean {
  return /^#{2,3}\s+(sources|citations|further reading)\b/im.test(markdown);
}

function getVisibleCitationSection(markdown: string): string {
  const headings = [...markdown.matchAll(HEADING_PATTERN)];
  const citationHeading = headings.find((match) => /^(sources|citations|further reading)\b/i.test(match[1].trim()));
  if (!citationHeading || citationHeading.index === undefined) return '';

  const nextHeading = headings.find((match) => (match.index ?? 0) > citationHeading.index!);
  return markdown.slice(citationHeading.index, nextHeading?.index ?? markdown.length);
}

function countSourceLinks(markdown: string): number {
  const section = getVisibleCitationSection(markdown);
  if (!section) return 0;

  const hrefs = new Set<string>();
  for (const match of section.matchAll(MARKDOWN_LINK_PATTERN)) {
    const href = match[1].trim();
    if (href.startsWith('https://') || href.startsWith(`${SITE_ORIGIN}/`) || href.startsWith('/')) {
      hrefs.add(href);
    }
  }

  return hrefs.size;
}

function countRiskyClaims(markdown: string): number {
  const prose = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[[^\]]+\]\([^)]+\)/g, '')
    .replace(/\[\[(?:person|organization|glossary|event):[a-zA-Z0-9_-]+\|([^\]]+)\]\]/g, '$1');

  return RISKY_CLAIM_PATTERNS.reduce((count, pattern) => {
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    return count + [...prose.matchAll(globalPattern)].length;
  }, 0);
}

function hasBodyH1(markdown: string): boolean {
  return /^#\s+\S+/m.test(markdown);
}

function hasQuestionBlock(markdown: string): boolean {
  return /^#{2,3}\s+.+\?\s*$/im.test(markdown) || /\*\*Q:\*\*/i.test(markdown);
}

function broadKeywordReason(keyword: string | undefined): string | null {
  const normalized = keyword?.trim().toLowerCase();
  if (!normalized) return null;
  const tooBroad = new Set([
    'ai',
    'artificial intelligence',
    'machine learning',
    'deep learning',
    'openai',
    'chatgpt',
    'llm',
    'llms',
  ]);
  return tooBroad.has(normalized) ? `Target keyword "${keyword}" is too broad for autonomous publishing.` : null;
}

function hasThesis(markdown: string): boolean {
  const firstSection = markdown
    .replace(/^#{1,6}\s+.+$/gm, '')
    .split(/^#{2,3}\s+/m)[0]
    .toLowerCase();
  return /\b(because|therefore|the useful answer|the thesis|matters because|changed when|shifted from|bottleneck)\b/.test(firstSection);
}

function startsWithDirectAnswer(markdown: string): boolean {
  const stripped = markdown
    .replace(/^#{1,6}\s+.+$/gm, '')
    .replace(/\[[^\]]+\]\([^)]+\)/g, '')
    .replace(/\[\[(?:person|organization|glossary|event):[a-zA-Z0-9_-]+\|([^\]]+)\]\]/g, '$1')
    .trim();
  const opening = stripped.split(/\s+/).slice(0, 150).join(' ');
  return opening.length >= 120 && /(\bis\b|\bwas\b|\bare\b|\bmeans\b|\bmatters\b|\bbecause\b)/i.test(opening);
}

export function evaluateBlogQualityGate(input: BlogQualityGateInput): BlogQualityGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const internalLinkCount = countInternalLinks(input.bodyMarkdown);
  const shortcodeCount = countEntityShortcodes(input.bodyMarkdown);
  const sourceLinkCount = countSourceLinks(input.bodyMarkdown);
  const riskyClaimCount = countRiskyClaims(input.bodyMarkdown);
  const words = wordCount(input.bodyMarkdown);
  const canonical = getCanonical(input);

  if (!SLUG_PATTERN.test(input.slug)) {
    blockers.push('Slug must be lowercase kebab-case.');
  }
  if (!input.seoTitle || input.seoTitle.length > 60) {
    blockers.push('seoTitle is required and must be <= 60 characters.');
  }
  if (!input.seoDescription || input.seoDescription.length < 140 || input.seoDescription.length > 160) {
    blockers.push('seoDescription is required and must be 140-160 characters.');
  }
  if (!canonical.startsWith(`${SITE_ORIGIN}/blog/`)) {
    blockers.push('Canonical URL must default to the absolute /blog/:slug URL unless a duplicate-content rationale is recorded.');
  }
  if (hasBodyH1(input.bodyMarkdown)) {
    blockers.push('Body markdown must not include a leading H1 because BlogPostPage renders the page H1.');
  }
  if (internalLinkCount < 3) {
    blockers.push('At least 3 distinct internal links are required.');
  }
  const unsupportedShortcodes = findUnsupportedShortcodes(input.bodyMarkdown);
  if (unsupportedShortcodes.length > 0) {
    blockers.push(`Unsupported markdown shortcode(s): ${unsupportedShortcodes.join(', ')}`);
  }
  if (SLOP_TITLE_PATTERNS.some((pattern) => pattern.test(input.title) || pattern.test(input.seoTitle ?? ''))) {
    blockers.push('Title or seoTitle uses generic/sloppy SERP phrasing.');
  }
  if (!input.tags || input.tags.length < 3 || input.tags.length > 5) {
    warnings.push('Use 3-5 topical tags.');
  }
  if (!input.subjectIds || input.subjectIds.length === 0) {
    blockers.push('At least one subject is required.');
  }
  if (!input.relations || input.relations.length < 3) {
    warnings.push('Relations should include the directly cited entities that drive FromTheBlog injections.');
  }
  if (!startsWithDirectAnswer(input.bodyMarkdown)) {
    blockers.push('Opening 150 words must answer the target query directly.');
  }
  if (!hasVisibleKeyFacts(input.bodyMarkdown)) {
    blockers.push('A visible Key facts, Summary, or Quick answer block is required.');
  }
  if (!hasVisibleCitations(input.bodyMarkdown)) {
    warnings.push('Add a visible Sources/Citations/Further reading section for factual claims.');
  }
  if (input.intendedAction === 'auto_publish' && riskyClaimCount > 0 && sourceLinkCount === 0) {
    blockers.push('Auto-publish requires visible source links for numeric, vendor-specific, or research-like claims.');
  }
  if (input.intendedAction === 'auto_publish' && typeof input.strongInternalLinkCandidates === 'number' && input.strongInternalLinkCandidates < 3) {
    blockers.push('Auto-publish requires at least 3 strong internal-link candidates before drafting.');
  }
  const broadReason = input.intendedAction === 'auto_publish' ? broadKeywordReason(input.targetKeyword) : null;
  if (broadReason) {
    blockers.push(broadReason);
  }
  if (input.intendedAction === 'auto_publish' && !hasThesis(input.bodyMarkdown)) {
    blockers.push('Auto-publish requires a clear thesis; generic recaps stay draft-only.');
  }
  if (input.intendedAction === 'auto_publish' && input.hasArticleJsonLdPath === false) {
    blockers.push('Auto-publish requires the existing Article and Breadcrumb JSON-LD path.');
  }
  if (input.intendedAction === 'auto_publish' && input.clientRenderedCrawlVerified === false) {
    blockers.push('Auto-publish requires sampled Google-rendered HTML verification for SPA crawlability.');
  }
  if (!hasQuestionBlock(input.bodyMarkdown)) {
    warnings.push('Consider a concise visible PAA-style question block when useful.');
  }
  if (words < 800) {
    warnings.push('Generated long-tail explainers usually need at least 800 words to satisfy informational intent.');
  }

  return {
    passed: blockers.length === 0,
    blockers,
    warnings,
    metrics: {
      internalLinkCount,
      shortcodeCount,
      wordCount: words,
      sourceLinkCount,
      riskyClaimCount,
    },
  };
}

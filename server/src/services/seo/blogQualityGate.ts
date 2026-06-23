const SITE_ORIGIN = 'https://letaiexplainai.com';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENTITY_SHORTCODE_PATTERN = /\[\[(person|organization|glossary|event):([a-zA-Z0-9_-]+)\|([^\]]+)\]\]/g;
const ENTITY_SHORTCODE_EXACT_PATTERN = /^\[\[(person|organization|glossary|event):([a-zA-Z0-9_-]+)\|([^\]]+)\]\]$/;
const ANY_SHORTCODE_PATTERN = /\[\[([^\]]+)\]\]/g;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\(([^)]+)\)/g;
const ENTITY_MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\(((?:https:\/\/letaiexplainai\.com)?\/(?:people|organizations|glossary|events)\/[^)]+)\)/g;
const ENTITY_MARKDOWN_LINK_WITH_LABEL_PATTERN = /\[([^\]]+)\]\(((?:https:\/\/letaiexplainai\.com)?\/(?:people|organizations|glossary|events)\/[^)]+)\)/g;
const HEADING_PATTERN = /^#{2,3}\s+(.+)$/gm;
const ENTITY_LABEL_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'this',
  'to',
  'with',
]);
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
const EXTRAORDINARY_CLAIM_PATTERNS = [
  /\bsolv(?:ed|es|ing)\b.{0,80}\b(?:problem|conjecture|theorem|challenge|bottleneck)\b/i,
  /\bdisprov(?:ed|es|ing)\b/i,
  /\bcounterexample(?:s)?\b/i,
  /\bproved?\s+(?:it\s+)?false\b/i,
  /\bbroke\b.{0,80}\b(?:guardrail|benchmark|record|model|internet|web|search)\b/i,
  /\bfirst\s+(?:major|ever|time)\b/i,
  /\b(?:breakthrough|historic|unprecedented)\b/i,
] as const;

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
  availablePreviewLinkCandidates?: number;
  availablePreviewEntityTypes?: string[];
  availableNonOrganizationCandidates?: number;
  allowedPreviewEntityPaths?: string[];
  hasArticleJsonLdPath?: boolean;
  clientRenderedCrawlVerified?: boolean;
}

export interface BlogQualityGateResult {
  passed: boolean;
  blockers: string[];
  warnings: string[];
  metrics: {
    internalLinkCount: number;
    previewEntityLinkCount: number;
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

function countPreviewEntityLinks(markdown: string): number {
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

  for (const match of markdown.matchAll(ENTITY_MARKDOWN_LINK_PATTERN)) {
    hrefs.add(match[1].replace(SITE_ORIGIN, ''));
  }

  return hrefs.size;
}

function previewEntityTypes(markdown: string): Set<string> {
  const entityTypes = new Set<string>();

  for (const match of markdown.matchAll(ENTITY_SHORTCODE_PATTERN)) {
    entityTypes.add(
      match[1] === 'glossary'
        ? 'glossary_term'
        : match[1] === 'event'
          ? 'milestone'
          : match[1],
    );
  }

  for (const match of markdown.matchAll(ENTITY_MARKDOWN_LINK_PATTERN)) {
    const href = match[1].replace(SITE_ORIGIN, '');
    if (href.startsWith('/people/')) entityTypes.add('person');
    else if (href.startsWith('/organizations/')) entityTypes.add('organization');
    else if (href.startsWith('/glossary/')) entityTypes.add('glossary_term');
    else if (href.startsWith('/events/')) entityTypes.add('milestone');
  }

  return entityTypes;
}

function countNonOrganizationPreviewLinks(markdown: string): number {
  const hrefs = new Set<string>();

  for (const match of markdown.matchAll(ENTITY_SHORTCODE_PATTERN)) {
    const type = match[1];
    if (type === 'organization') continue;
    const slug = match[2];
    const href =
      type === 'person'
        ? `/people/${slug}`
        : type === 'glossary'
          ? `/glossary/${slug}`
          : `/events/${slug}`;
    hrefs.add(href);
  }

  for (const match of markdown.matchAll(ENTITY_MARKDOWN_LINK_PATTERN)) {
    const href = match[1].replace(SITE_ORIGIN, '');
    if (!href.startsWith('/organizations/')) {
      hrefs.add(href);
    }
  }

  return hrefs.size;
}

function findUnsupportedShortcodes(markdown: string): string[] {
  return [...markdown.matchAll(ANY_SHORTCODE_PATTERN)]
    .map((match) => match[0])
    .filter((shortcode) => !ENTITY_SHORTCODE_EXACT_PATTERN.test(shortcode));
}

function shortcodeToPath(type: string, slug: string): string {
  return type === 'person'
    ? `/people/${slug}`
    : type === 'organization'
      ? `/organizations/${slug}`
      : type === 'glossary'
        ? `/glossary/${slug}`
        : `/events/${slug}`;
}

function findUnsupportedPreviewEntityPaths(markdown: string, allowedPaths: string[] | undefined): string[] {
  if (!allowedPaths) return [];

  const allowed = new Set(allowedPaths.map((path) => path.replace(SITE_ORIGIN, '')));
  const unsupported = new Set<string>();

  for (const match of markdown.matchAll(ENTITY_SHORTCODE_PATTERN)) {
    const path = shortcodeToPath(match[1], match[2]);
    if (!allowed.has(path)) unsupported.add(path);
  }

  for (const match of markdown.matchAll(ENTITY_MARKDOWN_LINK_PATTERN)) {
    const path = match[1].replace(SITE_ORIGIN, '');
    if (!allowed.has(path)) unsupported.add(path);
  }

  return [...unsupported];
}

function isSuspiciousEntityLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return true;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return true;
  if (ENTITY_LABEL_STOPWORDS.has(normalized)) return true;
  if (normalized.length <= 2 && !/^[A-Z0-9]{2,5}$/.test(trimmed)) return true;

  return false;
}

function findSuspiciousEntityLabels(markdown: string): string[] {
  const suspicious = new Set<string>();

  for (const match of markdown.matchAll(ENTITY_SHORTCODE_PATTERN)) {
    if (isSuspiciousEntityLabel(match[3])) {
      suspicious.add(match[0]);
    }
  }

  for (const match of markdown.matchAll(ENTITY_MARKDOWN_LINK_WITH_LABEL_PATTERN)) {
    if (isSuspiciousEntityLabel(match[1])) {
      suspicious.add(match[0]);
    }
  }

  return [...suspicious];
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
  const prose = normalizedProse(markdown);

  return RISKY_CLAIM_PATTERNS.reduce((count, pattern) => {
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    return count + [...prose.matchAll(globalPattern)].length;
  }, 0);
}

function normalizedProse(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[[^\]]+\]\([^)]+\)/g, '')
    .replace(/\[\[(?:person|organization|glossary|event):[a-zA-Z0-9_-]+\|([^\]]+)\]\]/g, '$1');
}

function countExtraordinaryClaims(markdown: string): number {
  const prose = normalizedProse(markdown);

  return EXTRAORDINARY_CLAIM_PATTERNS.reduce((count, pattern) => {
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
  const previewEntityLinkCount = countPreviewEntityLinks(input.bodyMarkdown);
  const linkedPreviewEntityTypes = previewEntityTypes(input.bodyMarkdown);
  const nonOrganizationPreviewLinkCount = countNonOrganizationPreviewLinks(input.bodyMarkdown);
  const shortcodeCount = countEntityShortcodes(input.bodyMarkdown);
  const sourceLinkCount = countSourceLinks(input.bodyMarkdown);
  const riskyClaimCount = countRiskyClaims(input.bodyMarkdown);
  const extraordinaryClaimCount = countExtraordinaryClaims(input.bodyMarkdown);
  const words = wordCount(input.bodyMarkdown);
  const canonical = getCanonical(input);
  const requiredPreviewEntityLinks = input.availablePreviewLinkCandidates !== undefined
    ? Math.max(3, Math.min(6, input.availablePreviewLinkCandidates))
    : 3;
  const availablePreviewEntityTypeCount = new Set(input.availablePreviewEntityTypes ?? []).size;
  const requiredPreviewEntityTypeCount = availablePreviewEntityTypeCount >= 3
    ? 3
    : availablePreviewEntityTypeCount >= 2
      ? 2
      : 1;
  const requiredNonOrganizationPreviewLinks = input.availableNonOrganizationCandidates !== undefined
    ? Math.min(3, input.availableNonOrganizationCandidates)
    : 0;

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
  if (previewEntityLinkCount < requiredPreviewEntityLinks) {
    blockers.push(`At least ${requiredPreviewEntityLinks} distinct previewable entity links are required (/people, /organizations, /glossary, /events).`);
  }
  if (linkedPreviewEntityTypes.size < requiredPreviewEntityTypeCount) {
    blockers.push(`Previewable LAEA links must span at least ${requiredPreviewEntityTypeCount} entity categories when the atlas inventory supports it.`);
  }
  if (requiredNonOrganizationPreviewLinks >= 2 && nonOrganizationPreviewLinkCount < requiredNonOrganizationPreviewLinks) {
    blockers.push(`Previewable LAEA links must include at least ${requiredNonOrganizationPreviewLinks} non-organization entities when the atlas inventory supports it.`);
  }
  const unsupportedShortcodes = findUnsupportedShortcodes(input.bodyMarkdown);
  if (unsupportedShortcodes.length > 0) {
    blockers.push(`Unsupported markdown shortcode(s): ${unsupportedShortcodes.join(', ')}`);
  }
  const unsupportedPreviewEntityPaths = findUnsupportedPreviewEntityPaths(
    input.bodyMarkdown,
    input.allowedPreviewEntityPaths,
  );
  if (unsupportedPreviewEntityPaths.length > 0) {
    blockers.push(`Previewable entity links must target verified atlas entries: ${unsupportedPreviewEntityPaths.join(', ')}`);
  }
  const suspiciousEntityLabels = findSuspiciousEntityLabels(input.bodyMarkdown);
  if (suspiciousEntityLabels.length > 0) {
    blockers.push(`Previewable entity links must anchor on the entity name, not filler text: ${suspiciousEntityLabels.join(', ')}`);
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
  if (input.intendedAction === 'auto_publish' && input.relations && input.relations.length < previewEntityLinkCount) {
    blockers.push('Auto-publish requires relations for the linked LAEA entities that drive FromTheBlog injections.');
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
  if (input.intendedAction === 'auto_publish' && extraordinaryClaimCount > 0 && sourceLinkCount < 2) {
    blockers.push('Auto-publish requires at least 2 independent visible source links for extraordinary claims.');
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
      previewEntityLinkCount,
      shortcodeCount,
      wordCount: words,
      sourceLinkCount,
      riskyClaimCount,
    },
  };
}

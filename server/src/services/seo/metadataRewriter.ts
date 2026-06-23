import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '../../middleware/error';
import { prisma } from '../../db';
import { getInsightDetail, type InsightDetail } from '../gsc/bucketClassifier';
import { isPaused } from './agentControl';
import { ensureExperimentForAction } from './experimentLedger';
import { SEO_AUTOMATION_MODEL } from './anthropicModels';

// The /SEOAuditAgent skill drives reasoning (what to rewrite and why).
// This service drives execution (writes, audit, rollback, blast-radius caps).
// Guardrails are enforced HERE even if the skill misbehaves — never trust the skill alone.

const METADATA_REWRITE_MODEL = SEO_AUTOMATION_MODEL;
const MIN_SHIP_CONFIDENCE = 0.8;
const MIN_SHIP_IMPRESSIONS = 100;
const BLAST_RADIUS_CAP = 3;
const BLAST_RADIUS_WINDOW_DAYS = 7;
const RECENCY_WINDOW_DAYS = 30;
const PROJECT_HOST = 'https://letaiexplainai.com';
const QUERY_BUCKET = 'winnable_loss';
const ACTION_TYPE = 'metadata_rewrite';
const TARGET_TYPE = 'blog_post';
const MAX_BODY_CONTEXT_CHARS = 2200;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const FALLBACK_SEO_VOICE = `# SEOAuditAgent Voice File

This file captures SEO-specific editorial preferences that emerge as the automation runs.

**Append-only**: never delete old entries. If a rule changes, add a dated reversal entry.

---

## Baseline

- **Entity-graph first**: if the right answer is "make the graph richer first," do that before recommending copy churn.
- **Under-stated language**: prefer direct, declarative language over hyped promises.
- **No clickbait**: optimize for curiosity and clarity, not bait.
- **Thesis over recap**: any content proposal should have a point of view, not just coverage.
- **Human trust beats keyword density**: if a phrase reads stuffed, cut it.
- **Preserve canonical structure**: do not propose slug churn or gratuitous URL changes in the auto-ship lane.

## Entries

_No shipped SEO actions yet. Add one dated entry per shipped action once SEOI-5 is live._`;

const FALLBACK_SLOP_CATEGORIES = `# SEOAuditAgent Slop Categories

Every returned artifact must be checked against this file. Any hit downgrades the finding to \`human_only\`.

## Keyword stuffing

- **Definition**: repeating the target keyword unnaturally in title, description, or proposed copy.
- **What not to write**: "AI compute bottleneck AI compute bottleneck explained"
- **Recovery**: cut to natural density, keep the strongest occurrence, and rewrite for a human reader first.

## Generic listicles

- **Definition**: content ideas with no thesis, only a formatted list.
- **What not to write**: "Top 10 AI terms you need to know"
- **Recovery**: turn it into an argument-driven brief or kill it.

## Duplicate content with existing entity pages

- **Definition**: proposing a blog post that merely restates an existing glossary, person, organization, or event page.
- **What not to write**: "What is In-Context Learning?" when \`/glossary/in-context-learning\` already carries the answer
- **Recovery**: pivot to a thesis or route traffic to the canonical entity page.

## Voice drift

- **Definition**: hypey, filler-heavy, or synthetic phrasing that violates \`seo_voice.md\`.
- **What not to write**: "In this article, we will explore the revolutionary power of..."
- **Recovery**: rewrite in plain language with a concrete claim.

## Hallucinated entities

- **Definition**: referencing a person, paper, org, or event that the atlas does not actually support without checking it.
- **What not to write**: "the 2021 DeepMind Alignment Summit paper" when no such entity is verified
- **Recovery**: fact-check, then either cite the primary source or escalate for graph population first.

## Forced comparison framing

- **Definition**: slapping "X vs Y" onto a topic that is not inherently comparative.
- **What not to write**: "Anthropic vs AI Safety"
- **Recovery**: use the natural framing or downgrade the idea.

## Metadata padding

- **Definition**: overrunning readability to cram a keyword into \`seoTitle\` or \`seoDescription\`.
- **What not to write**: 70-character titles that still read incomplete, or descriptions that repeat the same noun three times
- **Recovery**: cap titles around 60 characters, descriptions around 155, and favor click-through clarity.`;

const candidateRepoRootPaths = [
  path.resolve(process.cwd(), '.claude/skills/SEOAuditAgent'),
  path.resolve(process.cwd(), '../.claude/skills/SEOAuditAgent'),
];

interface RewriteTarget {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  seoTitle: string | null;
  seoDescription: string | null;
  bodyMarkdown: string;
  status: string;
  publishedAt: Date | null;
}

export interface SeoRewriteProposal {
  snapshotId: string;
  targetType: 'blog_post';
  targetId: string;
  targetSlug: string;
  targetTitle: string;
  pageUrl: string;
  query: string;
  impressions: number;
  currentTitle: string;
  currentDescription: string;
  proposedTitle: string;
  proposedDescription: string;
  rationale: string;
  confidence: number;
}

type ActionStatusFilter = 'all' | 'shipped' | 'rolled_back' | 'measured';
type ActionStatus = 'shipped' | 'rolled_back' | 'measured';

interface MetadataSnapshotPayload {
  slug: string;
  pageUrl: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

interface StoredActionRow {
  id: string;
  snapshotId: string | null;
  actionType: string;
  targetType: string;
  targetId: string;
  beforeJson: unknown;
  afterJson: unknown;
  confidence: number;
  rationale: string;
  shippedAt: Date;
  rolledBackAt: Date | null;
  measuredAt: Date | null;
  measuredDelta: unknown;
  snapshot: {
    id: string;
    page: string;
    query: string | null;
    weekStart: Date;
  } | null;
}

export interface SeoActionRecord {
  id: string;
  snapshotId: string | null;
  actionType: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  targetPath: string;
  query: string | null;
  status: ActionStatus;
  confidence: number;
  rationale: string;
  shippedAt: string;
  rolledBackAt: string | null;
  measuredAt: string | null;
  before: MetadataSnapshotPayload;
  after: MetadataSnapshotPayload;
}

export interface SeoActionListResult {
  data: SeoActionRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SlopCheckResult {
  ok: boolean;
  category?: string;
  reason?: string;
}

interface ParsedProposal {
  proposedTitle: string;
  proposedDescription: string;
  rationale: string;
  confidence: number;
}

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw ApiError.internal('ANTHROPIC_API_KEY environment variable is not set');
  }

  return new Anthropic({ apiKey });
}

function clampPageSize(limit: number | undefined): number {
  return Math.max(1, Math.min(MAX_PAGE_SIZE, limit ?? DEFAULT_PAGE_SIZE));
}

function trimToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizePath(pageUrl: string): string {
  try {
    const pathname = new URL(pageUrl).pathname || pageUrl;
    return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  } catch {
    return pageUrl.endsWith('/') && pageUrl !== '/' ? pageUrl.slice(0, -1) : pageUrl;
  }
}

function extractBlogSlugFromPage(pageUrl: string): string | null {
  const pathname = normalizePath(pageUrl);
  const match = pathname.match(/^\/blog\/([^/]+)$/);
  return match?.[1] ?? null;
}

function buildPageUrl(slug: string): string {
  return `${PROJECT_HOST}/blog/${slug}`;
}

function toIsoDateString(date: Date): string {
  return date.toISOString();
}

function subtractDays(days: number): Date {
  return new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
}

function getCurrentTitle(target: RewriteTarget): string {
  return trimToNull(target.seoTitle) ?? target.title;
}

function getCurrentDescription(target: RewriteTarget): string {
  return trimToNull(target.seoDescription) ?? target.excerpt;
}

function buildMetadataPayload(target: RewriteTarget, overrides?: Partial<MetadataSnapshotPayload>): MetadataSnapshotPayload {
  return {
    slug: overrides?.slug ?? target.slug,
    pageUrl: overrides?.pageUrl ?? buildPageUrl(target.slug),
    seoTitle: overrides?.seoTitle ?? trimToNull(target.seoTitle),
    seoDescription: overrides?.seoDescription ?? trimToNull(target.seoDescription),
  };
}

async function readAssetFile(
  filename: 'seo_voice.md' | 'slop_categories.md',
  fallbackContent: string
): Promise<string> {
  for (const baseDir of candidateRepoRootPaths) {
    const candidate = path.join(baseDir, filename);
    try {
      const content = await readFile(candidate, 'utf8');
      const trimmed = content.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
      console.warn(`[SEO_METADATA_REWRITER] Asset file is empty: ${candidate}`);
    } catch {
      // Best-effort local lookup only.
    }
  }

  const fallback = fallbackContent.trim();
  if (fallback.length === 0) {
    console.warn(`[SEO_METADATA_REWRITER] Missing bundled fallback for ${filename}`);
    throw ApiError.internal(`Required SEO instruction asset is unavailable: ${filename}`);
  }

  console.warn(`[SEO_METADATA_REWRITER] Falling back to bundled ${filename} copy`);
  return fallback;
}

async function loadSeoVoice(): Promise<string> {
  return readAssetFile('seo_voice.md', FALLBACK_SEO_VOICE);
}

async function loadSlopCategories(): Promise<string> {
  return readAssetFile('slop_categories.md', FALLBACK_SLOP_CATEGORIES);
}

async function loadInsight(snapshotId: string): Promise<InsightDetail> {
  const insight = await getInsightDetail(snapshotId);
  if (!insight) {
    throw ApiError.notFound('SEO insight not found');
  }

  if (insight.bucket !== QUERY_BUCKET) {
    throw ApiError.badRequest('Only winnable-loss findings support metadata rewrites');
  }

  if (!insight.query) {
    throw ApiError.badRequest('This finding does not have a visible query to rewrite against');
  }

  return insight;
}

async function resolveRewriteTarget(insight: InsightDetail): Promise<RewriteTarget> {
  const slug = extractBlogSlugFromPage(insight.page);
  if (!slug) {
    throw ApiError.badRequest('Only blog post findings can be rewritten in the auto-ship lane');
  }

  const post = await prisma.blogPost.findFirst({
    where: {
      slug,
      status: 'published',
      publishedAt: {
        lte: new Date(),
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      seoTitle: true,
      seoDescription: true,
      bodyMarkdown: true,
      status: true,
      publishedAt: true,
    },
  });

  if (!post) {
    throw ApiError.badRequest('No published blog post matches this SEO finding');
  }

  return post;
}

function extractResponseText(response: Anthropic.Messages.Message): string {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function parseProposalResponse(rawText: string): ParsedProposal {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw ApiError.internal('Metadata rewrite model did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  const proposedTitle = normalizeWhitespace(String(parsed.proposedTitle ?? ''));
  const proposedDescription = normalizeWhitespace(String(parsed.proposedDescription ?? ''));
  const rationale = normalizeWhitespace(String(parsed.rationale ?? ''));
  const confidenceRaw = Number(parsed.confidence ?? 0);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.min(1, Math.max(0, confidenceRaw))
    : 0;

  if (!proposedTitle || !proposedDescription) {
    throw ApiError.internal('Metadata rewrite proposal is missing title or description');
  }

  return {
    proposedTitle,
    proposedDescription,
    rationale: rationale || 'Rewrite tightens query-match and click-through clarity while preserving the existing voice.',
    confidence,
  };
}

function buildPrompt(input: {
  insight: InsightDetail;
  target: RewriteTarget;
  seoVoice: string;
  slopCategories: string;
}): string {
  const currentTitle = getCurrentTitle(input.target);
  const currentDescription = getCurrentDescription(input.target);
  const bodyExcerpt = input.target.bodyMarkdown.slice(0, MAX_BODY_CONTEXT_CHARS);
  const pagePath = normalizePath(input.insight.page);

  return `You are preparing a metadata-only SEO rewrite for letaiexplainai.com.

Task:
- Rewrite ONLY the seoTitle and seoDescription for the blog post below.
- Do not suggest slug changes, canonical changes, body changes, or structural changes.
- Keep the tone under-stated, specific, and human.
- Favor click-through clarity over keyword stuffing.
- Do not invent new people, orgs, papers, events, or products that are not already supported by the source context.

Voice rules:
${input.seoVoice}

Slop categories to avoid:
${input.slopCategories}

Search Console signal:
- bucket: ${input.insight.bucket}
- query: ${input.insight.query}
- page: ${pagePath}
- impressions: ${input.insight.currentMetrics.impressions}
- clicks: ${input.insight.currentMetrics.clicks}
- ctr: ${input.insight.currentMetrics.ctr}
- position: ${input.insight.currentMetrics.position}
- evidence: ${input.insight.evidence}

Current post context:
- post title: ${input.target.title}
- current seoTitle: ${currentTitle}
- current seoDescription: ${currentDescription}
- excerpt: ${input.target.excerpt}
- page url: ${buildPageUrl(input.target.slug)}
- body excerpt:
${bodyExcerpt}

Return ONLY valid JSON in this exact shape:
{
  "proposedTitle": "<60 chars where possible, natural, specific>",
  "proposedDescription": "<140-160 chars where possible, natural, no padding>",
  "rationale": "<2-4 sentences explaining why this metadata should win more clicks for the target query>",
  "confidence": <number between 0 and 1>
}

Rules:
- Keep the target query or its natural variant visible, but never stuffed.
- Preserve the existing article thesis if the query is slightly awkward.
- No hype, no clickbait, no "In this article" filler.
- If the current metadata is already near-optimal, return a conservative rewrite and lower confidence.
- Never include markdown fences or extra commentary.`;
}

function significantTokenCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const stopwords = new Set([
    'about',
    'after',
    'against',
    'being',
    'between',
    'explain',
    'from',
    'have',
    'into',
    'more',
    'quiz',
    'that',
    'their',
    'there',
    'these',
    'this',
    'what',
    'when',
    'with',
    'your',
  ]);

  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    if (token.length < 4 || stopwords.has(token)) {
      continue;
    }
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return counts;
}

function hasKeywordStuffing(proposal: SeoRewriteProposal): SlopCheckResult | null {
  const combined = `${proposal.proposedTitle} ${proposal.proposedDescription}`;
  const repeatedPhrase = proposal.proposedTitle.match(/\b([a-z0-9]+(?:\s+[a-z0-9]+)+)\b(?:.*\b\1\b)/i);
  if (repeatedPhrase) {
    return {
      ok: false,
      category: 'keyword_stuffing',
      reason: 'The proposed metadata repeats the same phrase too aggressively.',
    };
  }

  const tokenCounts = significantTokenCounts(combined);
  for (const [token, count] of tokenCounts.entries()) {
    if (count >= 3) {
      return {
        ok: false,
        category: 'keyword_stuffing',
        reason: `The token "${token}" appears too many times in the proposal.`,
      };
    }
  }

  return null;
}

function hasGenericListiclePattern(proposal: SeoRewriteProposal): SlopCheckResult | null {
  const combined = `${proposal.proposedTitle} ${proposal.proposedDescription}`;
  if (/\b(top|best)\s+\d+\b/i.test(combined) || /\bthings you need to know\b/i.test(combined) || /\bultimate guide\b/i.test(combined)) {
    return {
      ok: false,
      category: 'generic_listicles',
      reason: 'The proposal drifts into generic listicle framing.',
    };
  }

  return null;
}

function hasDuplicateEntityPageFraming(proposal: SeoRewriteProposal): SlopCheckResult | null {
  if (/^(what is|who is|when was|what happened to)\b/i.test(proposal.proposedTitle)) {
    return {
      ok: false,
      category: 'duplicate_content',
      reason: 'The proposal reads like a generic entity explainer instead of a blog thesis.',
    };
  }

  return null;
}

function hasVoiceDrift(proposal: SeoRewriteProposal): SlopCheckResult | null {
  const combined = `${proposal.proposedTitle} ${proposal.proposedDescription}`;
  const bannedPhrases = [
    'revolutionary',
    'game-changing',
    'cutting-edge',
    'in this article',
    'delve into',
    'unlock the power',
    'ultimate guide',
  ];

  if (/[!]{1,}/.test(combined)) {
    return {
      ok: false,
      category: 'voice_drift',
      reason: 'The proposal is using overly promotional punctuation.',
    };
  }

  if (bannedPhrases.some((phrase) => combined.toLowerCase().includes(phrase))) {
    return {
      ok: false,
      category: 'voice_drift',
      reason: 'The proposal uses hypey language that breaks the SEO voice rules.',
    };
  }

  return null;
}

function hasHallucinatedEntities(proposal: SeoRewriteProposal, target: RewriteTarget): SlopCheckResult | null {
  const allowedContext = [
    proposal.query,
    target.title,
    target.excerpt,
    target.seoTitle,
    target.seoDescription,
    target.bodyMarkdown.slice(0, MAX_BODY_CONTEXT_CHARS),
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();

  const capitalizedPhrases = `${proposal.proposedTitle} ${proposal.proposedDescription}`.match(
    /\b[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){1,3}\b/g
  ) ?? [];
  const entityHintPattern = /\b(AI|Award|Conference|DeepMind|Google|Institute|Lab|Labs|Meta|Microsoft|Model|Nobel|OpenAI|Paper|Prize|Project|Research|Summit|System|Systems|University)\b/i;

  for (const phrase of capitalizedPhrases) {
    if (!entityHintPattern.test(phrase)) {
      continue;
    }

    if (!allowedContext.includes(phrase.toLowerCase())) {
      return {
        ok: false,
        category: 'hallucinated_entities',
        reason: `The proposal introduces "${phrase}" without support in the current page context.`,
      };
    }
  }

  return null;
}

function hasForcedComparisonFraming(proposal: SeoRewriteProposal, target: RewriteTarget): SlopCheckResult | null {
  const proposalText = `${proposal.proposedTitle} ${proposal.proposedDescription}`.toLowerCase();
  if (!/\b(vs\.?|versus)\b/.test(proposalText)) {
    return null;
  }

  const currentContext = [
    proposal.query,
    target.title,
    target.seoTitle,
    target.seoDescription,
    target.bodyMarkdown.slice(0, MAX_BODY_CONTEXT_CHARS),
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();

  if (!/\b(vs\.?|versus|compare|comparison)\b/.test(currentContext)) {
    return {
      ok: false,
      category: 'forced_comparison',
      reason: 'The proposal introduces comparison framing that the source page does not naturally support.',
    };
  }

  return null;
}

function hasMetadataPadding(proposal: SeoRewriteProposal): SlopCheckResult | null {
  if (proposal.proposedTitle.length > 65) {
    return {
      ok: false,
      category: 'metadata_padding',
      reason: 'The proposed title is too long for the auto-ship lane.',
    };
  }

  if (proposal.proposedDescription.length > 170) {
    return {
      ok: false,
      category: 'metadata_padding',
      reason: 'The proposed description is too long for the auto-ship lane.',
    };
  }

  return null;
}

function runSlopPreflight(proposal: SeoRewriteProposal, target: RewriteTarget): SlopCheckResult {
  const checks = [
    hasKeywordStuffing(proposal),
    hasGenericListiclePattern(proposal),
    hasDuplicateEntityPageFraming(proposal),
    hasVoiceDrift(proposal),
    hasForcedComparisonFraming(proposal, target),
    hasMetadataPadding(proposal),
    hasHallucinatedEntities(proposal, target),
  ];

  return checks.find((check): check is SlopCheckResult => Boolean(check)) ?? { ok: true };
}

async function enforceRecencyRule(targetId: string): Promise<void> {
  const recentAction = await prisma.seoAgentAction.findFirst({
    where: {
      actionType: ACTION_TYPE,
      targetType: TARGET_TYPE,
      targetId,
      shippedAt: {
        gte: subtractDays(RECENCY_WINDOW_DAYS),
      },
    },
    orderBy: {
      shippedAt: 'desc',
    },
  });

  if (recentAction) {
    throw new ApiError(409, 'This post was already rewritten within the last 30 days');
  }
}

async function enforceBlastRadiusCap(): Promise<void> {
  const shippedCount = await prisma.seoAgentAction.count({
    where: {
      actionType: ACTION_TYPE,
      rolledBackAt: null,
      shippedAt: {
        gte: subtractDays(BLAST_RADIUS_WINDOW_DAYS),
      },
    },
  });

  if (shippedCount >= BLAST_RADIUS_CAP) {
    throw new ApiError(409, 'Weekly auto-ship cap reached for metadata rewrites');
  }
}

export async function proposeRewrite(snapshotId: string): Promise<SeoRewriteProposal> {
  const [insight, seoVoice, slopCategories] = await Promise.all([
    loadInsight(snapshotId),
    loadSeoVoice(),
    loadSlopCategories(),
  ]);
  const target = await resolveRewriteTarget(insight);
  const client = getAnthropicClient();
  const prompt = buildPrompt({
    insight,
    target,
    seoVoice,
    slopCategories,
  });

  const response = await client.messages.create({
    model: METADATA_REWRITE_MODEL,
    max_tokens: 700,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const parsed = parseProposalResponse(extractResponseText(response));
  const currentTitle = getCurrentTitle(target);
  const currentDescription = getCurrentDescription(target);

  if (
    normalizeWhitespace(parsed.proposedTitle).toLowerCase() === normalizeWhitespace(currentTitle).toLowerCase() &&
    normalizeWhitespace(parsed.proposedDescription).toLowerCase() === normalizeWhitespace(currentDescription).toLowerCase()
  ) {
    throw new ApiError(409, 'Rewrite proposal did not improve the current metadata');
  }

  return {
    snapshotId: insight.id,
    targetType: TARGET_TYPE,
    targetId: target.id,
    targetSlug: target.slug,
    targetTitle: target.title,
    pageUrl: buildPageUrl(target.slug),
    query: insight.query,
    impressions: insight.currentMetrics.impressions,
    currentTitle,
    currentDescription,
    proposedTitle: parsed.proposedTitle,
    proposedDescription: parsed.proposedDescription,
    rationale: parsed.rationale,
    confidence: parsed.confidence,
  };
}

function getActionStatus(action: Pick<StoredActionRow, 'rolledBackAt' | 'measuredAt'>): ActionStatus {
  if (action.rolledBackAt) {
    return 'rolled_back';
  }

  if (action.measuredAt) {
    return 'measured';
  }

  return 'shipped';
}

function parseMetadataPayload(value: unknown): MetadataSnapshotPayload {
  if (!value || typeof value !== 'object') {
    throw ApiError.internal('Stored SEO audit payload is invalid');
  }

  const raw = value as Record<string, unknown>;
  const slug = normalizeWhitespace(String(raw.slug ?? ''));
  const pageUrl = normalizeWhitespace(String(raw.pageUrl ?? ''));

  if (!slug || !pageUrl) {
    throw ApiError.internal('Stored SEO audit payload is missing slug or pageUrl');
  }

  return {
    slug,
    pageUrl,
    seoTitle: trimToNull(typeof raw.seoTitle === 'string' ? raw.seoTitle : null),
    seoDescription: trimToNull(typeof raw.seoDescription === 'string' ? raw.seoDescription : null),
  };
}

async function serializeActions(rows: StoredActionRow[]): Promise<SeoActionRecord[]> {
  const blogTargetIds = rows
    .filter((row) => row.targetType === TARGET_TYPE)
    .map((row) => row.targetId);

  const posts = blogTargetIds.length > 0
    ? await prisma.blogPost.findMany({
      where: {
        id: {
          in: blogTargetIds,
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
      },
    })
    : [];

  const postById = new Map(posts.map((post) => [post.id, post]));

  return rows.map((row) => {
    const before = parseMetadataPayload(row.beforeJson);
    const after = parseMetadataPayload(row.afterJson);
    const post = postById.get(row.targetId);
    const targetLabel = post?.title ?? before.slug;
    const targetPath = row.snapshot?.page ?? before.pageUrl;

    return {
      id: row.id,
      snapshotId: row.snapshotId,
      actionType: row.actionType,
      targetType: row.targetType,
      targetId: row.targetId,
      targetLabel,
      targetPath,
      query: row.snapshot?.query ?? null,
      status: getActionStatus(row),
      confidence: row.confidence,
      rationale: row.rationale,
      shippedAt: toIsoDateString(row.shippedAt),
      rolledBackAt: row.rolledBackAt ? toIsoDateString(row.rolledBackAt) : null,
      measuredAt: row.measuredAt ? toIsoDateString(row.measuredAt) : null,
      before,
      after,
    };
  });
}

export async function shipRewrite(
  snapshotId: string,
  dryRun: boolean = false
): Promise<SeoRewriteProposal | SeoActionRecord> {
  const proposal = await proposeRewrite(snapshotId);
  const insight = await loadInsight(snapshotId);
  const target = await resolveRewriteTarget(insight);

  if (dryRun) {
    return proposal;
  }

  if (await isPaused()) {
    throw new ApiError(409, 'SEO agent is paused');
  }

  if (proposal.confidence < MIN_SHIP_CONFIDENCE) {
    throw new ApiError(409, 'Rewrite confidence is below the auto-ship threshold');
  }

  if (proposal.impressions < MIN_SHIP_IMPRESSIONS) {
    throw new ApiError(409, 'This finding does not meet the minimum impression threshold');
  }

  await Promise.all([
    enforceRecencyRule(target.id),
    enforceBlastRadiusCap(),
  ]);

  const slopResult = runSlopPreflight(proposal, target);
  if (!slopResult.ok) {
    throw new ApiError(409, slopResult.reason ?? 'Rewrite proposal failed slop preflight', {
      category: slopResult.category,
    });
  }

  const beforePayload = buildMetadataPayload(target);
  const afterPayload = buildMetadataPayload(target, {
    seoTitle: proposal.proposedTitle,
    seoDescription: proposal.proposedDescription,
  });

  const createdAction = await prisma.$transaction(async (tx) => {
    await tx.blogPost.update({
      where: {
        id: target.id,
      },
      data: {
        seoTitle: proposal.proposedTitle,
        seoDescription: proposal.proposedDescription,
      },
    });

    await tx.gscWeeklySnapshot.update({
      where: {
        id: snapshotId,
      },
      data: {
        status: 'shipped',
      },
    });

    return tx.seoAgentAction.create({
      data: {
        snapshotId,
        actionType: ACTION_TYPE,
        targetType: TARGET_TYPE,
        targetId: target.id,
        beforeJson: beforePayload,
        afterJson: afterPayload,
        confidence: proposal.confidence,
        rationale: proposal.rationale,
      },
      include: {
        snapshot: {
          select: {
            id: true,
            page: true,
            query: true,
            weekStart: true,
          },
        },
      },
    });
  });

  await ensureExperimentForAction(createdAction.id);
  const [serialized] = await serializeActions([createdAction as StoredActionRow]);
  return serialized;
}

export async function listSeoActions(options: {
  targetType?: string;
  limit?: number;
  page?: number;
  status?: ActionStatusFilter;
}): Promise<SeoActionListResult> {
  const page = Math.max(1, options.page ?? 1);
  const limit = clampPageSize(options.limit);
  const skip = (page - 1) * limit;
  const status = options.status ?? 'all';

  const where: Record<string, unknown> = {};
  if (options.targetType) {
    where.targetType = options.targetType;
  }

  if (status === 'rolled_back') {
    where.rolledBackAt = {
      not: null,
    };
  } else if (status === 'measured') {
    where.measuredAt = {
      not: null,
    };
    where.rolledBackAt = null;
  } else if (status === 'shipped') {
    where.measuredAt = null;
    where.rolledBackAt = null;
  }

  const [rows, total] = await Promise.all([
    prisma.seoAgentAction.findMany({
      where,
      orderBy: {
        shippedAt: 'desc',
      },
      skip,
      take: limit,
      include: {
        snapshot: {
          select: {
            id: true,
            page: true,
            query: true,
            weekStart: true,
          },
        },
      },
    }),
    prisma.seoAgentAction.count({ where }),
  ]);

  return {
    data: await serializeActions(rows as StoredActionRow[]),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

export async function rollbackSeoAction(actionId: string): Promise<SeoActionRecord> {
  const action = await prisma.seoAgentAction.findUnique({
    where: {
      id: actionId,
    },
    include: {
      snapshot: {
        select: {
          id: true,
          page: true,
          query: true,
          weekStart: true,
        },
      },
    },
  });

  if (!action) {
    throw ApiError.notFound('SEO action not found');
  }

  if (action.targetType !== TARGET_TYPE || action.actionType !== ACTION_TYPE) {
    throw ApiError.badRequest('Only blog metadata rewrites can be rolled back here');
  }

  if (action.rolledBackAt) {
    throw new ApiError(409, 'This SEO action has already been rolled back');
  }

  const before = parseMetadataPayload(action.beforeJson);

  const updatedAction = await prisma.$transaction(async (tx) => {
    await tx.blogPost.update({
      where: {
        id: action.targetId,
      },
      data: {
        seoTitle: before.seoTitle,
        seoDescription: before.seoDescription,
      },
    });

    return tx.seoAgentAction.update({
      where: {
        id: actionId,
      },
      data: {
        rolledBackAt: new Date(),
      },
      include: {
        snapshot: {
          select: {
            id: true,
            page: true,
            query: true,
            weekStart: true,
          },
        },
      },
    });
  });

  const [serialized] = await serializeActions([updatedAction as StoredActionRow]);
  return serialized;
}

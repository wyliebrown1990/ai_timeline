import Anthropic from '@anthropic-ai/sdk';
import { ApiError } from '../../middleware/error';
import { prisma } from '../../db';
import { search as searchPersons } from '../persons';
import { search as searchOrganizations } from '../organizations';
import { search as searchGlossaryTerms } from '../glossary';
import { search as searchMilestones } from '../milestones';
import { matchOrganization, matchPerson } from '../entityMatcher';

const PROPOSAL_MODEL = 'claude-sonnet-4-20250514';
const SUPPORTED_BUCKETS = new Set(['content_gap', 'trend_signal']);
const DUPLICATE_WINDOW_DAYS = 30;
const RECENT_NEWS_WINDOW_DAYS = 14;
const MAX_ENTITY_RESULTS = 5;
const MAX_NEWS_HOOKS = 5;
const PROJECT_HOST = 'https://letaiexplainai.com';
const PROPOSAL_TARGET_TYPE = 'blog_post';
const QUERY_NOISE_PATTERN = /\b(quiz|quizzes|trivia|test|tests|question|questions)\b/gi;
const HYPERBOLIC_PHRASES = [
  'revolutionary',
  'game-changing',
  'ultimate guide',
  'must-read',
  'powerful secret',
  'unleash',
  'in this article, we will explore',
];

export type SeoProposalStatus = 'pending' | 'drafting' | 'approved' | 'rejected' | 'shipped';
export type SeoProposalStatusFilter = SeoProposalStatus | 'all';

interface SnapshotRecord {
  id: string;
  weekStart: Date;
  bucket: string | null;
  page: string;
  query: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  status: string;
}

interface ProposalRow {
  id: string;
  snapshotId: string;
  proposalType: string;
  targetKeyword: string;
  suggestedAngle: string;
  linkInventoryJson: unknown;
  newsHooksJson: unknown;
  rationale: string;
  confidence: number;
  status: string;
  draftPostId: string | null;
  createdAt: Date;
  actedAt: Date | null;
  rejectedReason: string | null;
  snapshot: {
    id: string;
    weekStart: Date;
    bucket: string | null;
    page: string;
    query: string | null;
  };
  draftPost: {
    id: string;
    slug: string;
    title: string;
    status: string;
    publishedAt: Date | null;
  } | null;
}

export interface SeoProposalLinkInventoryItem {
  entityType: 'person' | 'organization' | 'glossary_term' | 'milestone';
  id: string;
  label: string;
  path: string;
  reason: string;
}

export interface SeoProposalNewsHook {
  articleId: string;
  title: string;
  externalUrl: string;
  sourceName: string | null;
  publishedAt: string;
}

export interface SeoProposalHandoff {
  topic: string;
  keyword: string;
  newsUrl: string | null;
  command: string;
  proposalPath: string;
}

export interface SeoProposalRecord {
  id: string;
  snapshotId: string;
  proposalType: string;
  targetKeyword: string;
  suggestedAngle: string;
  rationale: string;
  confidence: number;
  status: SeoProposalStatus;
  rejectedReason: string | null;
  createdAt: string;
  actedAt: string | null;
  weekStart: string;
  sourceBucket: string | null;
  sourcePage: string;
  sourceQuery: string | null;
  linkInventory: SeoProposalLinkInventoryItem[];
  newsHooks: SeoProposalNewsHook[];
  handoff: SeoProposalHandoff;
  draftPost: {
    id: string;
    slug: string;
    title: string;
    status: string;
    publishedAt: string | null;
  } | null;
}

export interface SeoProposalListResult {
  data: SeoProposalRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    counts: Record<'all' | 'pending' | 'drafting' | 'approved' | 'rejected' | 'shipped', number>;
  };
}

interface GeneratedAngle {
  suggestedAngle: string;
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

function clampLimit(limit: number | undefined, fallback: number): number {
  if (!Number.isFinite(limit) || !limit || limit < 1) {
    return fallback;
  }

  return Math.max(1, Math.min(100, Math.trunc(limit)));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function trimToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = normalizeWhitespace(value);
  return trimmed.length > 0 ? trimmed : null;
}

function stripQuotedPunctuation(value: string): string {
  return normalizeWhitespace(value.replace(/["“”]/g, ' '));
}

function stripQueryNoise(value: string): string {
  return normalizeWhitespace(value.replace(QUERY_NOISE_PATTERN, ' '));
}

function extractQuotedPhrases(value: string): string[] {
  return Array.from(value.matchAll(/["“”]([^"“”]+)["“”]/g))
    .map((match) => trimToNull(match[1]))
    .filter((phrase): phrase is string => phrase !== null);
}

function formatIsoDate(date: Date): string {
  return date.toISOString();
}

function formatIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function subtractDays(days: number): Date {
  return new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function titleCaseFromSlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizePathname(pageUrl: string): string {
  try {
    const pathname = new URL(pageUrl).pathname || '/';
    return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  } catch {
    return pageUrl.endsWith('/') && pageUrl !== '/' ? pageUrl.slice(0, -1) : pageUrl;
  }
}

function deriveKeywordFromPage(pageUrl: string): string {
  const pathname = normalizePathname(pageUrl);
  const segments = pathname.split('/').filter(Boolean);
  const slug = segments[segments.length - 1];

  if (!slug) {
    return 'AI history';
  }

  return titleCaseFromSlug(slug);
}

function deriveKeywordFromQuery(query: string | null | undefined): string | null {
  const raw = trimToNull(query);
  if (!raw) {
    return null;
  }

  const dequoted = stripQuotedPunctuation(raw);
  return trimToNull(stripQueryNoise(dequoted)) ?? trimToNull(dequoted);
}

function buildDuplicateEntityCandidates(keyword: string, rawQuery: string | null | undefined): string[] {
  const candidates = new Set<string>();

  function pushCandidate(value: string | null) {
    const normalized = trimToNull(value);
    if (normalized) {
      candidates.add(normalized);
    }
  }

  pushCandidate(keyword);

  const raw = trimToNull(rawQuery);
  if (!raw) {
    return Array.from(candidates);
  }

  for (const phrase of extractQuotedPhrases(raw)) {
    pushCandidate(stripQueryNoise(stripQuotedPunctuation(phrase)));
  }

  pushCandidate(stripQueryNoise(stripQuotedPunctuation(raw)));
  pushCandidate(stripQuotedPunctuation(raw));

  return Array.from(candidates);
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0.05, Math.min(0.99, Number(value.toFixed(2))));
}

function extractResponseText(response: Awaited<ReturnType<Anthropic['messages']['create']>>): string {
  const text = response.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n')
    .trim();

  if (!text) {
    throw ApiError.internal('Claude returned an empty SEO proposal brief response');
  }

  return text;
}

function parseGeneratedAngleResponse(raw: string): GeneratedAngle {
  const sanitized = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    throw ApiError.internal('Claude returned invalid JSON for the SEO proposal brief');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw ApiError.internal('Claude returned an invalid SEO proposal brief payload');
  }

  const record = parsed as Record<string, unknown>;
  const suggestedAngle = trimToNull(typeof record.suggestedAngle === 'string' ? record.suggestedAngle : null);
  const rationale = trimToNull(typeof record.rationale === 'string' ? record.rationale : null);
  const confidence = Number(record.confidence);

  if (!suggestedAngle || !rationale || !Number.isFinite(confidence)) {
    throw ApiError.internal('Claude returned an incomplete SEO proposal brief payload');
  }

  return {
    suggestedAngle,
    rationale,
    confidence: clampConfidence(confidence),
  };
}

function buildPrompt(input: {
  snapshot: SnapshotRecord;
  keyword: string;
  linkInventory: SeoProposalLinkInventoryItem[];
  newsHooks: SeoProposalNewsHook[];
}): string {
  const entityLines = input.linkInventory.length > 0
    ? input.linkInventory.map((item) => `- ${item.entityType}: ${item.label} (${item.path})`).join('\n')
    : '- No strong linked entities found yet.';

  const newsLines = input.newsHooks.length > 0
    ? input.newsHooks.map((item) => `- ${item.title} (${item.sourceName ?? 'Unknown source'}, ${item.publishedAt})`).join('\n')
    : '- No recent news hooks found.';

  return `You are preparing a content brief for the AI Timeline Atlas blog at letaiexplainai.com.

Your job is to turn a Google Search Console finding into a blog angle with a clear thesis.

Rules:
- Do not write a generic recap or glossary definition.
- Do not write a "Top 10" or other listicle framing.
- Prefer a concrete, arguable angle that fits an AI history / entity-graph site.
- Keep the angle specific enough that a human can hand it to /AIBlogDraft.

Return ONLY valid JSON with this exact shape:
{
  "suggestedAngle": "one sentence angle",
  "rationale": "2-4 sentence explanation of why this angle is timely and winnable",
  "confidence": 0.0
}

Finding:
- Bucket: ${input.snapshot.bucket ?? 'unknown'}
- Week start: ${formatIsoDay(input.snapshot.weekStart)}
- Landing page: ${input.snapshot.page}
- Visible query: ${input.snapshot.query ?? 'none (derive from page context)'}
- Target keyword: ${input.keyword}
- Impressions: ${input.snapshot.impressions}
- Clicks: ${input.snapshot.clicks}
- CTR: ${input.snapshot.ctr.toFixed(3)}
- Avg position: ${input.snapshot.position.toFixed(2)}

Linked entities:
${entityLines}

Recent news hooks:
${newsLines}

Write the angle for a blog post proposal, not metadata.`;
}

function adjustConfidence(
  baseConfidence: number,
  snapshot: SnapshotRecord,
  linkInventoryCount: number,
  newsHookCount: number
): number {
  let nextConfidence = baseConfidence;

  if (linkInventoryCount >= 3) {
    nextConfidence += 0.08;
  } else if (linkInventoryCount === 0) {
    nextConfidence -= 0.08;
  }

  if (newsHookCount > 0) {
    nextConfidence += 0.07;
  }

  if (snapshot.bucket === 'trend_signal' || snapshot.impressions >= 100) {
    nextConfidence += 0.05;
  }

  return clampConfidence(nextConfidence);
}

function findGenericListicleReason(angle: string): string | null {
  return /^\s*top\s+\d+/i.test(angle) ? 'Generic listicle framing is not allowed' : null;
}

function findVoiceDriftReason(angle: string): string | null {
  const lower = angle.toLowerCase();
  const hit = HYPERBOLIC_PHRASES.find((phrase) => lower.includes(phrase));
  return hit ? `Voice drift detected: avoid phrase "${hit}"` : null;
}

function getDraftStatus(status: string): SeoProposalStatus {
  if (status === 'pending' || status === 'drafting' || status === 'approved' || status === 'rejected' || status === 'shipped') {
    return status;
  }

  return 'pending';
}

function parseLinkInventory(value: unknown): SeoProposalLinkInventoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const entityType = record.entityType;
      const id = trimToNull(typeof record.id === 'string' ? record.id : null);
      const label = trimToNull(typeof record.label === 'string' ? record.label : null);
      const path = trimToNull(typeof record.path === 'string' ? record.path : null);
      const reason = trimToNull(typeof record.reason === 'string' ? record.reason : null);

      if (
        (entityType !== 'person' && entityType !== 'organization' && entityType !== 'glossary_term' && entityType !== 'milestone') ||
        !id ||
        !label ||
        !path ||
        !reason
      ) {
        return null;
      }

      return {
        entityType,
        id,
        label,
        path,
        reason,
      } satisfies SeoProposalLinkInventoryItem;
    })
    .filter((item): item is SeoProposalLinkInventoryItem => item !== null);
}

function parseNewsHooks(value: unknown): SeoProposalNewsHook[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const articleId = trimToNull(typeof record.articleId === 'string' ? record.articleId : null);
      const title = trimToNull(typeof record.title === 'string' ? record.title : null);
      const externalUrl = trimToNull(typeof record.externalUrl === 'string' ? record.externalUrl : null);
      const publishedAt = trimToNull(typeof record.publishedAt === 'string' ? record.publishedAt : null);

      if (!articleId || !title || !externalUrl || !publishedAt) {
        return null;
      }

      return {
        articleId,
        title,
        externalUrl,
        sourceName: trimToNull(typeof record.sourceName === 'string' ? record.sourceName : null),
        publishedAt,
      } satisfies SeoProposalNewsHook;
    })
    .filter((item): item is SeoProposalNewsHook => item !== null);
}

function buildHandoff(proposal: {
  targetKeyword: string;
  suggestedAngle: string;
  newsHooks: SeoProposalNewsHook[];
}): SeoProposalHandoff {
  const newsUrl = proposal.newsHooks[0]?.externalUrl ?? null;
  const commandParts = [
    `/AIBlogDraft topic: ${JSON.stringify(proposal.suggestedAngle)}`,
    `keyword: ${JSON.stringify(proposal.targetKeyword)}`,
  ];

  if (newsUrl) {
    commandParts.push(`news_url: ${JSON.stringify(newsUrl)}`);
  }

  return {
    topic: proposal.suggestedAngle,
    keyword: proposal.targetKeyword,
    newsUrl,
    command: commandParts.join(' '),
    proposalPath: `${PROJECT_HOST}/admin/seo-insights/proposals`,
  };
}

function serializeProposal(row: ProposalRow): SeoProposalRecord {
  const linkInventory = parseLinkInventory(row.linkInventoryJson);
  const newsHooks = parseNewsHooks(row.newsHooksJson);

  return {
    id: row.id,
    snapshotId: row.snapshotId,
    proposalType: row.proposalType,
    targetKeyword: row.targetKeyword,
    suggestedAngle: row.suggestedAngle,
    rationale: row.rationale,
    confidence: row.confidence,
    status: getDraftStatus(row.status),
    rejectedReason: row.rejectedReason,
    createdAt: formatIsoDate(row.createdAt),
    actedAt: row.actedAt ? formatIsoDate(row.actedAt) : null,
    weekStart: formatIsoDate(row.snapshot.weekStart),
    sourceBucket: row.snapshot.bucket,
    sourcePage: row.snapshot.page,
    sourceQuery: row.snapshot.query,
    linkInventory,
    newsHooks,
    handoff: buildHandoff({
      targetKeyword: row.targetKeyword,
      suggestedAngle: row.suggestedAngle,
      newsHooks,
    }),
    draftPost: row.draftPost
      ? {
          id: row.draftPost.id,
          slug: row.draftPost.slug,
          title: row.draftPost.title,
          status: row.draftPost.status,
          publishedAt: row.draftPost.publishedAt ? formatIsoDate(row.draftPost.publishedAt) : null,
        }
      : null,
  };
}

async function loadSnapshot(snapshotId: string): Promise<SnapshotRecord> {
  const snapshot = await prisma.gscWeeklySnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      id: true,
      weekStart: true,
      bucket: true,
      page: true,
      query: true,
      clicks: true,
      impressions: true,
      ctr: true,
      position: true,
      status: true,
    },
  });

  if (!snapshot) {
    throw ApiError.notFound('SEO proposal source snapshot not found');
  }

  if (!snapshot.bucket || !SUPPORTED_BUCKETS.has(snapshot.bucket)) {
    throw new ApiError(409, 'Only content-gap and trend-signal findings can generate proposals');
  }

  return snapshot;
}

async function ensureNoRecentDuplicate(keyword: string): Promise<void> {
  const duplicateWindowStart = subtractDays(DUPLICATE_WINDOW_DAYS);
  const existing = await prisma.seoProposal.findFirst({
    where: {
      targetKeyword: {
        equals: keyword,
        mode: 'insensitive',
      },
      createdAt: {
        gte: duplicateWindowStart,
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new ApiError(409, 'A recent proposal already exists for this keyword');
  }
}

async function loadLinkInventory(keyword: string): Promise<SeoProposalLinkInventoryItem[]> {
  const [personMatch, organizationMatch, persons, organizations, glossaryTerms, milestoneResults] = await Promise.all([
    matchPerson(keyword),
    matchOrganization(keyword),
    searchPersons(keyword, MAX_ENTITY_RESULTS),
    searchOrganizations(keyword, MAX_ENTITY_RESULTS),
    searchGlossaryTerms(keyword, MAX_ENTITY_RESULTS),
    searchMilestones({ query: keyword, skip: 0, limit: MAX_ENTITY_RESULTS }),
  ]);

  const items: SeoProposalLinkInventoryItem[] = [];
  const seen = new Set<string>();

  function pushItem(item: SeoProposalLinkInventoryItem) {
    const key = `${item.entityType}:${item.id}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    items.push(item);
  }

  if (personMatch.matched && personMatch.person) {
    pushItem({
      entityType: 'person',
      id: personMatch.person.id,
      label: personMatch.person.canonicalName,
      path: `/people/${personMatch.person.slug}`,
      reason: 'Exact match for the keyword in the people graph.',
    });
  }

  if (organizationMatch.matched && organizationMatch.organization) {
    pushItem({
      entityType: 'organization',
      id: organizationMatch.organization.id,
      label: organizationMatch.organization.name,
      path: `/organizations/${organizationMatch.organization.slug}`,
      reason: 'Exact match for the keyword in the organization graph.',
    });
  }

  for (const person of persons) {
    pushItem({
      entityType: 'person',
      id: person.id,
      label: person.canonicalName,
      path: `/people/${person.slug}`,
      reason: 'Related published person match for internal linking.',
    });
  }

  for (const organization of organizations) {
    pushItem({
      entityType: 'organization',
      id: organization.id,
      label: organization.name,
      path: `/organizations/${organization.slug}`,
      reason: 'Related published organization match for internal linking.',
    });
  }

  for (const glossaryTerm of glossaryTerms) {
    pushItem({
      entityType: 'glossary_term',
      id: glossaryTerm.id,
      label: glossaryTerm.term,
      path: `/glossary/${glossaryTerm.slug ?? slugify(glossaryTerm.term)}`,
      reason: 'Related glossary term for first-mention internal links.',
    });
  }

  for (const milestone of milestoneResults.results) {
    pushItem({
      entityType: 'milestone',
      id: milestone.id,
      label: milestone.title,
      path: `/events/${milestone.id}`,
      reason: 'Related milestone/event page that can deepen the brief.',
    });
  }

  return items.slice(0, MAX_ENTITY_RESULTS * 2);
}

async function loadNewsHooks(keyword: string): Promise<SeoProposalNewsHook[]> {
  const windowStart = subtractDays(RECENT_NEWS_WINDOW_DAYS);
  const slug = slugify(keyword);
  const rows = await prisma.ingestedArticle.findMany({
    where: {
      publishedAt: {
        gte: windowStart,
      },
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
        ...(slug ? [{ externalUrl: { contains: slug, mode: 'insensitive' } }] : []),
      ],
    },
    orderBy: {
      publishedAt: 'desc',
    },
    include: {
      source: {
        select: {
          name: true,
        },
      },
    },
    take: MAX_NEWS_HOOKS,
  });

  return rows.map((row) => ({
    articleId: row.id,
    title: row.title,
    externalUrl: row.externalUrl,
    sourceName: row.source?.name ?? null,
    publishedAt: formatIsoDate(row.publishedAt),
  }));
}

async function findDuplicateEntityReason(keyword: string, rawQuery?: string | null): Promise<string | null> {
  for (const candidate of buildDuplicateEntityCandidates(keyword, rawQuery)) {
    const normalizedKeyword = normalizeWhitespace(candidate);
    const normalizedSlug = slugify(normalizedKeyword);

    const [glossaryTerm, milestone, personMatch, organizationMatch] = await Promise.all([
      prisma.glossaryTerm.findFirst({
        where: {
          OR: [
            { term: { equals: normalizedKeyword, mode: 'insensitive' } },
            ...(normalizedSlug ? [{ slug: { equals: normalizedSlug, mode: 'insensitive' } }] : []),
          ],
        },
        select: {
          term: true,
          slug: true,
        },
      }),
      prisma.milestone.findFirst({
        where: {
          title: { equals: normalizedKeyword, mode: 'insensitive' },
        },
        select: {
          id: true,
          title: true,
        },
      }),
      matchPerson(normalizedKeyword),
      matchOrganization(normalizedKeyword),
    ]);

    if (glossaryTerm) {
      return `Keyword already maps to existing glossary page /glossary/${glossaryTerm.slug ?? normalizedSlug}`;
    }

    if (milestone) {
      return `Keyword already maps to existing event page /events/${milestone.id}`;
    }

    if (personMatch.matched && personMatch.person) {
      return `Keyword already maps to existing person page /people/${personMatch.person.slug}`;
    }

    if (organizationMatch.matched && organizationMatch.organization) {
      return `Keyword already maps to existing organization page /organizations/${organizationMatch.organization.slug}`;
    }
  }

  return null;
}

async function runSlopPreflight(input: {
  keyword: string;
  rawQuery?: string | null;
  suggestedAngle: string;
}): Promise<string | null> {
  return (
    findGenericListicleReason(input.suggestedAngle) ??
    findVoiceDriftReason(input.suggestedAngle) ??
    await findDuplicateEntityReason(input.keyword, input.rawQuery)
  );
}

async function createProposalRow(snapshot: SnapshotRecord): Promise<ProposalRow> {
  const keyword = deriveKeywordFromQuery(snapshot.query) ?? deriveKeywordFromPage(snapshot.page);
  if (!keyword) {
    throw new ApiError(409, 'Could not derive a target keyword for this proposal');
  }

  await ensureNoRecentDuplicate(keyword);

  const [linkInventory, newsHooks] = await Promise.all([
    loadLinkInventory(keyword),
    loadNewsHooks(keyword),
  ]);

  const client = getAnthropicClient();
  const prompt = buildPrompt({
    snapshot,
    keyword,
    linkInventory,
    newsHooks,
  });
  const response = await client.messages.create({
    model: PROPOSAL_MODEL,
    max_tokens: 700,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const generated = parseGeneratedAngleResponse(extractResponseText(response));
  const slopReason = await runSlopPreflight({
    keyword,
    rawQuery: snapshot.query,
    suggestedAngle: generated.suggestedAngle,
  });
  const confidence = adjustConfidence(generated.confidence, snapshot, linkInventory.length, newsHooks.length);
  const nextStatus: SeoProposalStatus = slopReason ? 'rejected' : 'pending';

  return prisma.$transaction(async (tx) => {
    const created = await tx.seoProposal.create({
      data: {
        snapshotId: snapshot.id,
        proposalType: PROPOSAL_TARGET_TYPE,
        targetKeyword: keyword,
        suggestedAngle: generated.suggestedAngle,
        linkInventoryJson: linkInventory,
        newsHooksJson: newsHooks,
        rationale: generated.rationale,
        confidence,
        status: nextStatus,
        rejectedReason: slopReason,
      },
      include: {
        snapshot: {
          select: {
            id: true,
            weekStart: true,
            bucket: true,
            page: true,
            query: true,
          },
        },
        draftPost: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            publishedAt: true,
          },
        },
      },
    });

    await tx.gscWeeklySnapshot.update({
      where: { id: snapshot.id },
      data: {
        status: 'actioned',
      },
    });

    return created;
  });
}

function getProposalStatusWhere(status: SeoProposalStatusFilter) {
  if (status === 'all') {
    return {};
  }

  if (status === 'approved') {
    return {
      status: {
        in: ['approved', 'shipped'],
      },
    };
  }

  return { status };
}

export async function listSeoProposals(options: {
  status?: SeoProposalStatusFilter;
  page?: number;
  limit?: number;
}): Promise<SeoProposalListResult> {
  const status = options.status ?? 'all';
  const page = Math.max(1, options.page ?? 1);
  const limit = clampLimit(options.limit, 25);
  const skip = (page - 1) * limit;
  const where = getProposalStatusWhere(status);

  const [rows, total, pendingCount, draftingCount, approvedCount, rejectedCount, shippedCount, allCount] = await Promise.all([
    prisma.seoProposal.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      include: {
        snapshot: {
          select: {
            id: true,
            weekStart: true,
            bucket: true,
            page: true,
            query: true,
          },
        },
        draftPost: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            publishedAt: true,
          },
        },
      },
    }),
    prisma.seoProposal.count({ where }),
    prisma.seoProposal.count({ where: { status: 'pending' } }),
    prisma.seoProposal.count({ where: { status: 'drafting' } }),
    prisma.seoProposal.count({ where: { status: { in: ['approved', 'shipped'] } } }),
    prisma.seoProposal.count({ where: { status: 'rejected' } }),
    prisma.seoProposal.count({ where: { status: 'shipped' } }),
    prisma.seoProposal.count(),
  ]);

  return {
    data: rows.map(serializeProposal),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    meta: {
      counts: {
        all: allCount,
        pending: pendingCount,
        drafting: draftingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        shipped: shippedCount,
      },
    },
  };
}

export async function generateProposal(snapshotId: string): Promise<SeoProposalRecord> {
  const snapshot = await loadSnapshot(snapshotId);
  const created = await createProposalRow(snapshot);
  return serializeProposal(created);
}

async function getProposalById(proposalId: string): Promise<ProposalRow> {
  const proposal = await prisma.seoProposal.findUnique({
    where: { id: proposalId },
    include: {
      snapshot: {
        select: {
          id: true,
          weekStart: true,
          bucket: true,
          page: true,
          query: true,
        },
      },
      draftPost: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
        },
      },
    },
  });

  if (!proposal) {
    throw ApiError.notFound('SEO proposal not found');
  }

  return proposal;
}

export async function approveSeoProposal(proposalId: string): Promise<{
  proposal: SeoProposalRecord;
  handoff: SeoProposalHandoff;
}> {
  const proposal = await getProposalById(proposalId);
  if (proposal.status !== 'pending') {
    throw new ApiError(409, 'Only pending proposals can be sent to /AIBlogDraft');
  }

  const updated = await prisma.seoProposal.update({
    where: { id: proposalId },
    data: {
      status: 'drafting',
      actedAt: new Date(),
    },
    include: {
      snapshot: {
        select: {
          id: true,
          weekStart: true,
          bucket: true,
          page: true,
          query: true,
        },
      },
      draftPost: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
        },
      },
    },
  });

  const serialized = serializeProposal(updated);
  return {
    proposal: serialized,
    handoff: serialized.handoff,
  };
}

export async function rejectSeoProposal(proposalId: string, reason: string): Promise<SeoProposalRecord> {
  const trimmedReason = trimToNull(reason);
  if (!trimmedReason) {
    throw ApiError.badRequest('Reject reason is required');
  }

  const proposal = await getProposalById(proposalId);
  if (proposal.status === 'shipped') {
    throw new ApiError(409, 'Published proposals cannot be rejected');
  }

  const updated = await prisma.seoProposal.update({
    where: { id: proposalId },
    data: {
      status: 'rejected',
      actedAt: new Date(),
      rejectedReason: trimmedReason,
    },
    include: {
      snapshot: {
        select: {
          id: true,
          weekStart: true,
          bucket: true,
          page: true,
          query: true,
        },
      },
      draftPost: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
        },
      },
    },
  });

  return serializeProposal(updated);
}

export async function linkProposalDraft(proposalId: string, draftPostId: string): Promise<SeoProposalRecord> {
  const nextDraftPostId = trimToNull(draftPostId);
  if (!nextDraftPostId) {
    throw ApiError.badRequest('draftPostId is required');
  }

  const [proposal, draftPost] = await Promise.all([
    getProposalById(proposalId),
    prisma.blogPost.findUnique({
      where: { id: nextDraftPostId },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        publishedAt: true,
      },
    }),
  ]);

  if (!draftPost) {
    throw ApiError.notFound('Blog post draft not found');
  }

  if (proposal.status !== 'drafting' && proposal.status !== 'approved') {
    throw new ApiError(409, 'Only drafting or approved proposals can link a draft post');
  }

  const nextStatus: SeoProposalStatus = draftPost.status === 'published' ? 'shipped' : 'approved';

  const updated = await prisma.seoProposal.update({
    where: { id: proposalId },
    data: {
      draftPostId: draftPost.id,
      status: nextStatus,
      actedAt: new Date(),
    },
    include: {
      snapshot: {
        select: {
          id: true,
          weekStart: true,
          bucket: true,
          page: true,
          query: true,
        },
      },
      draftPost: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
        },
      },
    },
  });

  return serializeProposal(updated);
}

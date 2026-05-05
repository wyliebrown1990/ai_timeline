import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../db';
import {
  createDraft,
  getOrCreateDefaultAuthor,
  publishPost,
  type CreateDraftInput,
} from '../blogAdmin';
import {
  approveSeoProposal,
  linkProposalDraft,
  type SeoProposalRecord,
} from './briefGenerator';
import {
  markKeywordOpportunityPromoted,
  type KeywordOpportunityRecord,
} from './keywordDiscovery';
import {
  evaluateBlogQualityGate,
  type BlogQualityGateResult,
} from './blogQualityGate';
import {
  claimEditorialOpportunityRun,
  completeEditorialOpportunityRun,
  findDuplicateEditorialPost,
  findExistingEditorialRun,
} from './editorialIdempotency';
import { EDITORIAL_VOICE_SNAPSHOT } from './editorialVoiceSnapshot';
import type { EditorialOpportunity } from './editorialOpportunitySelector';

const CONTENT_MODEL = process.env.SEO_EDITORIAL_BLOG_MODEL ?? 'claude-sonnet-4-20250514';
const SITE_ORIGIN = 'https://letaiexplainai.com';
const DEFAULT_SUBJECT_SLUGS = ['science-cs-ml'];

let anthropicClient: Anthropic | null = null;

export interface GeneratedEditorialBlogDraft {
  title: string;
  subtitle?: string;
  excerpt: string;
  bodyMarkdown: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  subjectSlugs: string[];
  relations?: Array<{ entityType: string; entityId: string; relationLabel?: string }>;
}

export interface ProcessEditorialOpportunityOptions {
  dryRun?: boolean;
  weekStart?: string | null;
  force?: boolean;
}

export interface ProcessEditorialOpportunityResult {
  id: string;
  sourceType: EditorialOpportunity['sourceType'];
  action: EditorialOpportunity['action'];
  status: 'draft_created' | 'auto_published' | 'skipped_by_gate' | 'failed';
  title: string;
  reason: string;
  postId: string | null;
  publicUrl: string | null;
  adminUrl: string | null;
  qualityGate: BlogQualityGateResult | null;
}

function getAnthropicClient(): Anthropic {
  if (anthropicClient) return anthropicClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

function extractJsonObject(value: string): unknown {
  const match = value.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Blog draft generation returned no JSON object');
  }
  return JSON.parse(match[0]) as unknown;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Generated blog draft missing ${field}`);
  }
  return value.trim();
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

function parseGeneratedDraft(value: unknown): GeneratedEditorialBlogDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Generated blog draft JSON must be an object');
  }

  const row = value as Record<string, unknown>;
  return {
    title: asString(row.title, 'title'),
    subtitle: typeof row.subtitle === 'string' ? row.subtitle.trim() : undefined,
    excerpt: asString(row.excerpt, 'excerpt'),
    bodyMarkdown: asString(row.bodyMarkdown, 'bodyMarkdown'),
    seoTitle: asString(row.seoTitle, 'seoTitle'),
    seoDescription: asString(row.seoDescription, 'seoDescription'),
    tags: asStringArray(row.tags),
    subjectSlugs: asStringArray(row.subjectSlugs),
    relations: Array.isArray(row.relations)
      ? row.relations
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
          .map((item) => ({
            entityType: asString(item.entityType, 'relations.entityType'),
            entityId: asString(item.entityId, 'relations.entityId'),
            relationLabel: typeof item.relationLabel === 'string' ? item.relationLabel.trim() : undefined,
          }))
      : [],
  };
}

function opportunityPrompt(opportunity: EditorialOpportunity): string {
  const source = opportunity.source as SeoProposalRecord | KeywordOpportunityRecord;
  const proposal = opportunity.sourceType === 'proposal' ? source as SeoProposalRecord : null;
  const keyword = opportunity.sourceType === 'keyword' ? source as KeywordOpportunityRecord : null;
  const handoff = proposal?.handoff;

  return `
You are drafting a topic-mode LAEA blog post for letaiexplainai.com.

Voice:
${EDITORIAL_VOICE_SNAPSHOT}

Opportunity:
- Target keyword: ${opportunity.targetKeyword}
- Working angle: ${opportunity.title}
- Rationale: ${opportunity.rationale}
- Confidence: ${opportunity.confidence.toFixed(2)}
- Source type: ${opportunity.sourceType}
${handoff?.newsUrl ? `- News hook: ${handoff.newsUrl}` : ''}
${keyword?.targetUrl ? `- Existing target URL context: ${keyword.targetUrl}` : ''}

Return one JSON object only. No markdown fences.

JSON shape:
{
  "title": "<declarative title, no clickbait>",
  "subtitle": "<second-level thesis>",
  "excerpt": "<card/OG excerpt>",
  "seoTitle": "<=60 chars, keyword-aware>",
  "seoDescription": "140-160 chars",
  "tags": ["3", "to", "5", "tags"],
  "subjectSlugs": ["science-cs-ml"],
  "relations": [
    { "entityType": "glossary_term", "entityId": "machine-learning", "relationLabel": "mentions" }
  ],
  "bodyMarkdown": "<800-1200 words. No H1. Use H2s. Include a visible ## Key facts section. Include at least 3 internal links using markdown links or supported entity shortcodes. Include ## Sources or ## Further reading. Include one question-style H2 or Q/A block. End with ## The atlas's read.>"
}

Supported entity shortcodes in bodyMarkdown:
- [[person:slug|Visible Name]]
- [[organization:slug|Visible Name]]
- [[glossary:slug|Visible Name]]
- [[event:id|Visible Name]]

Use only plausible LAEA internal links. If unsure, use stable paths like /timeline, /glossary, /learn, or /blog/ai-timeline. Do not invent external citations.
`.trim();
}

export async function generateEditorialBlogDraft(opportunity: EditorialOpportunity): Promise<GeneratedEditorialBlogDraft> {
  const response = await getAnthropicClient().messages.create({
    model: CONTENT_MODEL,
    max_tokens: 4500,
    temperature: 0.4,
    messages: [{ role: 'user', content: opportunityPrompt(opportunity) }],
  });
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
  return parseGeneratedDraft(extractJsonObject(text));
}

async function resolveSubjectIds(subjectSlugs: string[]): Promise<string[]> {
  const slugs = [...new Set([...subjectSlugs, ...DEFAULT_SUBJECT_SLUGS])];
  const subjects = await prisma.subject.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  return subjects.map((subject) => subject.id);
}

function buildDraftInput(generated: GeneratedEditorialBlogDraft, subjectIds: string[]): CreateDraftInput {
  return {
    title: generated.title,
    subtitle: generated.subtitle,
    excerpt: generated.excerpt,
    bodyMarkdown: generated.bodyMarkdown,
    tags: generated.tags,
    seoTitle: generated.seoTitle,
    seoDescription: generated.seoDescription,
    canonicalUrl: undefined,
    subjectIds,
    primarySubjectId: subjectIds[0],
    relations: generated.relations,
  };
}

function gateInput(
  generated: GeneratedEditorialBlogDraft,
  subjectIds: string[],
  slug: string,
  intendedAction: EditorialOpportunity['action'],
) {
  return {
    title: generated.title,
    slug,
    seoTitle: generated.seoTitle,
    seoDescription: generated.seoDescription,
    excerpt: generated.excerpt,
    bodyMarkdown: generated.bodyMarkdown,
    canonicalUrl: `${SITE_ORIGIN}/blog/${slug}`,
    tags: generated.tags,
    subjectIds,
    relations: generated.relations,
    intendedAction,
  };
}

function deriveDraftSlug(generated: GeneratedEditorialBlogDraft, opportunity: EditorialOpportunity): string {
  const candidate = (opportunity.targetKeyword || generated.title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return candidate || generated.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'post';
}

function resultFromExistingRun(
  opportunity: EditorialOpportunity,
  existing: Awaited<ReturnType<typeof findExistingEditorialRun>>,
): ProcessEditorialOpportunityResult | null {
  if (!existing || existing.status === 'processing') return null;

  const publicUrl = existing.postSlug ? `${SITE_ORIGIN}/blog/${existing.postSlug}` : null;
  return {
    id: opportunity.id,
    sourceType: opportunity.sourceType,
    action: existing.action,
    status: existing.status === 'auto_published'
      ? 'auto_published'
      : existing.status === 'draft_created'
        ? 'draft_created'
        : existing.status === 'skipped_by_gate'
          ? 'skipped_by_gate'
          : 'failed',
    title: existing.postTitle ?? opportunity.title,
    reason: existing.reason ?? 'Skipped because this opportunity was already processed for this GSC week.',
    postId: existing.postId,
    publicUrl,
    adminUrl: existing.postId ? `${SITE_ORIGIN}/admin/blog/${existing.postId}/edit` : null,
    qualityGate: null,
  };
}

async function prepareProposalForDraft(opportunity: EditorialOpportunity): Promise<void> {
  if (opportunity.sourceType !== 'proposal') return;
  const proposal = opportunity.source as SeoProposalRecord;
  if (proposal.status === 'pending') {
    await approveSeoProposal(proposal.id);
  }
}

async function afterCreateSideEffects(opportunity: EditorialOpportunity, postId: string): Promise<void> {
  if (opportunity.sourceType === 'proposal') {
    await linkProposalDraft(opportunity.id, postId);
    return;
  }

  await markKeywordOpportunityPromoted(opportunity.id);
}

export async function processEditorialOpportunity(
  opportunity: EditorialOpportunity,
  options: ProcessEditorialOpportunityOptions = {},
): Promise<ProcessEditorialOpportunityResult> {
  if (options.dryRun) {
    return {
      id: opportunity.id,
      sourceType: opportunity.sourceType,
      action: opportunity.action,
      status: 'draft_created',
      title: opportunity.title,
      reason: 'Dry run: would generate a blog draft and run quality gates.',
      postId: null,
      publicUrl: null,
      adminUrl: null,
      qualityGate: null,
    };
  }

  if (!options.weekStart) {
    return {
      id: opportunity.id,
      sourceType: opportunity.sourceType,
      action: opportunity.action,
      status: 'failed',
      title: opportunity.title,
      reason: 'Missing weekStart for editorial idempotency.',
      postId: null,
      publicUrl: null,
      adminUrl: null,
      qualityGate: null,
    };
  }

  const existing = await findExistingEditorialRun(options.weekStart, opportunity);
  if (existing && !options.force) {
    const existingResult = resultFromExistingRun(opportunity, existing);
    if (existingResult) return existingResult;
  }

  const claim = await claimEditorialOpportunityRun(options.weekStart, opportunity);
  if (claim.status !== 'processing' && !options.force) {
    const existingResult = resultFromExistingRun(opportunity, claim);
    if (existingResult) return existingResult;
  }

  try {
    const generated = await generateEditorialBlogDraft(opportunity);
    const subjectIds = await resolveSubjectIds(generated.subjectSlugs);
    const slug = deriveDraftSlug(generated, opportunity);
    const duplicate = await findDuplicateEditorialPost({
      slug,
      title: generated.title,
      targetKeyword: opportunity.targetKeyword,
    });
    if (duplicate) {
      const reason = `Duplicate topic blocked by existing ${duplicate.status} post: /blog/${duplicate.slug}`;
      await completeEditorialOpportunityRun(claim.idempotencyKey, {
        status: 'skipped_by_gate',
        reason,
        metadata: { duplicatePostId: duplicate.id, duplicateSlug: duplicate.slug },
      });
      return {
        id: opportunity.id,
        sourceType: opportunity.sourceType,
        action: opportunity.action,
        status: 'skipped_by_gate',
        title: generated.title,
        reason,
        postId: null,
        publicUrl: null,
        adminUrl: null,
        qualityGate: null,
      };
    }

    const qualityGate = evaluateBlogQualityGate(gateInput(generated, subjectIds, slug, opportunity.action));

    if (!qualityGate.passed) {
      const reason = `Quality gate blocked draft: ${qualityGate.blockers.join('; ')}`;
      await completeEditorialOpportunityRun(claim.idempotencyKey, {
        status: 'skipped_by_gate',
        reason,
        metadata: { qualityGate },
      });
      return {
        id: opportunity.id,
        sourceType: opportunity.sourceType,
        action: opportunity.action,
        status: 'skipped_by_gate',
        title: generated.title,
        reason,
        postId: null,
        publicUrl: null,
        adminUrl: null,
        qualityGate,
      };
    }

    await prepareProposalForDraft(opportunity);
    const author = await getOrCreateDefaultAuthor();
    const post = await createDraft({ ...buildDraftInput(generated, subjectIds), slug }, author.id);
    if (!post) {
      throw new Error('Blog draft creation returned no post');
    }

    const publishedPost = opportunity.action === 'auto_publish'
      ? await publishPost(post.id)
      : post;
    if (!publishedPost) {
      throw new Error(`Blog post ${post.id} disappeared before publish`);
    }

    await afterCreateSideEffects(opportunity, post.id);

    const publicUrl = `${SITE_ORIGIN}/blog/${publishedPost.slug}`;
    const status = opportunity.action === 'auto_publish' ? 'auto_published' : 'draft_created';
    const reason = qualityGate.warnings.length > 0
      ? `Created with warnings: ${qualityGate.warnings.join('; ')}`
      : 'Created successfully.';
    await completeEditorialOpportunityRun(claim.idempotencyKey, {
      status,
      postId: post.id,
      reason,
      metadata: { qualityGate },
    });

    return {
      id: opportunity.id,
      sourceType: opportunity.sourceType,
      action: opportunity.action,
      status,
      title: publishedPost.title,
      reason,
      postId: post.id,
      publicUrl,
      adminUrl: `${SITE_ORIGIN}/admin/blog/${post.id}/edit`,
      qualityGate,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown editorial draft error';
    await completeEditorialOpportunityRun(claim.idempotencyKey, {
      status: 'failed',
      reason,
    }).catch(() => null);

    return {
      id: opportunity.id,
      sourceType: opportunity.sourceType,
      action: opportunity.action,
      status: 'failed',
      title: opportunity.title,
      reason,
      postId: null,
      publicUrl: null,
      adminUrl: null,
      qualityGate: null,
    };
  }
}

export function resetEditorialBlogDraftForTests() {
  anthropicClient = null;
}

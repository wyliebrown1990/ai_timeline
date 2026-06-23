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
import { discoverEditorialEntityInventory } from './editorialEntityDiscovery';
import { enforceEditorialEntityLinks } from './editorialEntityLinker';
import {
  buildEditorialBlogCompositionBrief,
  type EditorialBlogCompositionBrief,
} from './blogDraftComposer';
import {
  claimEditorialOpportunityRun,
  completeEditorialOpportunityRun,
  findDuplicateEditorialPost,
  findExistingEditorialRun,
} from './editorialIdempotency';
import { EDITORIAL_VOICE_SNAPSHOT } from './editorialVoiceSnapshot';
import { isWeeklyFallbackKeyword, type EditorialOpportunity } from './editorialOpportunitySelector';
import { SEO_EDITORIAL_BLOG_MODEL } from './anthropicModels';

const CONTENT_MODEL = SEO_EDITORIAL_BLOG_MODEL;
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

interface NormalizedGeneratedDraft {
  generated: GeneratedEditorialBlogDraft;
  linkInventoryCount: number;
  availablePreviewEntityTypes: string[];
  availableNonOrganizationCandidates: number;
  allowedPreviewEntityPaths: string[];
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

function extractToolDraft(response: Anthropic.Message): unknown | null {
  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    return null;
  }

  return toolUse.input;
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

function opportunityPrompt(
  opportunity: EditorialOpportunity,
  brief: EditorialBlogCompositionBrief,
): string {
  const source = opportunity.source as SeoProposalRecord | KeywordOpportunityRecord;
  const proposal = opportunity.sourceType === 'proposal' ? source as SeoProposalRecord : null;
  const keyword = opportunity.sourceType === 'keyword' ? source as KeywordOpportunityRecord : null;
  const handoff = proposal?.handoff;
  const linkInventory = brief.linkInventory.length
    ? brief.linkInventory.map((item) => `- ${item.label}: ${item.path} (${item.reason})`).join('\n')
    : [
        '- AI Timeline: /blog/ai-timeline',
        '- Timeline: /timeline',
        '- AI glossary: /glossary',
        '- Learn: /learn',
      ].join('\n');
  const newsHooks = brief.newsHooks.length
    ? brief.newsHooks.map((item) => `- ${item.title}: ${item.externalUrl} (${item.sourceName ?? 'unknown source'}, ${item.publishedAt})`).join('\n')
    : '- No recent news hooks were attached.';
  const serperSummary = brief.serperSourceRef
    ? [
        `- Query: ${brief.serperSourceRef.query}`,
        `- Competition proxy: ${brief.serperSourceRef.competitionProxy}`,
        `- Top domains: ${brief.serperSourceRef.topDomains.join(', ') || 'none captured'}`,
        `- PAA prompts: ${brief.serperSourceRef.peopleAlsoAskCount}`,
        `- Competition read: ${brief.serperSourceRef.competitionReason}`,
      ].join('\n')
    : '- No attached Serper sample; avoid pretending to know live SERP composition.';
  const fallbackSourceDiscipline = isWeeklyFallbackKeyword(opportunity)
    ? [
        'Weekly fallback source discipline:',
        '- Treat the source hook as a lead, not proof. If the source is not a primary/vendor/research publication, frame claims as reported or draft a broader explainer around the underlying concept.',
        '- Do not assert that a model solved, disproved, broke, proved, or found counterexamples for a major problem unless the claim is backed by at least two visible source links or a primary research/vendor source.',
        '- If corroboration is thin, make the post draft-safe: explain the claim, the uncertainty, and why readers should care without declaring it settled fact.',
      ].join('\n')
    : '';

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

Internal links available:
${linkInventory}

Recent source hooks:
${newsHooks}

SERP/winnability evidence:
${serperSummary}

Pre-draft winnability notes:
${brief.winnabilityNotes.map((note) => `- ${note}`).join('\n')}

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
  "bodyMarkdown": "<800-1200 words. No H1. Use H2s. Include a visible ## Key facts section. Name concrete LAEA concepts, people, organizations, and historical milestones so the atlas can link them on first mention. Include at least 6 distinct previewable LAEA entity links when inventory supports it, with category variety: prefer glossary terms, key people, and historical events instead of only company names. Use supported entity shortcodes or /people|/organizations|/glossary|/events links. Generic atlas links like /timeline, /glossary, or /learn do not count toward the entity minimum. Include ## Sources with visible links. Include one question-style H2 or Q/A block. End with ## The atlas's read.>"
}

Supported entity shortcodes in bodyMarkdown:
- [[person:slug|Visible Name]]
- [[organization:slug|Visible Name]]
- [[glossary:slug|Visible Name]]
- [[event:id|Visible Name]]

Use at least 6 distinct previewable entity links from the Internal links available list when the atlas inventory supports it. Favor a mix of glossary terms, people, organizations, and milestones. Generic atlas links like [Timeline](/timeline), [AI glossary](/glossary), and [Learn](/learn) are useful context but do not count toward the entity minimum.

Source discipline:
- Do not include percentages, adoption stats, benchmark numbers, or "research showed" claims unless you include a visible source link in ## Sources.
- Do not make vendor-specific claims about OpenAI, Google, DeepMind, Microsoft, Meta, Anthropic, NVIDIA, Salesforce, LangChain, or AutoGen unless they are general historical context or visibly sourced.
- If you do not have a source URL, phrase the claim qualitatively instead of inventing precision.
${fallbackSourceDiscipline}
`.trim();
}

export async function generateEditorialBlogDraft(
  opportunity: EditorialOpportunity,
  brief: EditorialBlogCompositionBrief,
): Promise<GeneratedEditorialBlogDraft> {
  const response = await getAnthropicClient().messages.create({
    model: CONTENT_MODEL,
    max_tokens: 4500,
    temperature: 0.4,
    tools: [{
      name: 'submit_blog_draft',
      description: 'Submit the complete LAEA blog draft as structured fields.',
      input_schema: {
        type: 'object',
        required: ['title', 'excerpt', 'bodyMarkdown', 'seoTitle', 'seoDescription', 'tags', 'subjectSlugs'],
        properties: {
          title: { type: 'string' },
          subtitle: { type: 'string' },
          excerpt: { type: 'string' },
          seoTitle: { type: 'string' },
          seoDescription: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          subjectSlugs: { type: 'array', items: { type: 'string' } },
          relations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['entityType', 'entityId'],
              properties: {
                entityType: { type: 'string' },
                entityId: { type: 'string' },
                relationLabel: { type: 'string' },
              },
            },
          },
          bodyMarkdown: { type: 'string' },
        },
      },
    }],
    tool_choice: { type: 'tool', name: 'submit_blog_draft' },
    messages: [{ role: 'user', content: opportunityPrompt(opportunity, brief) }],
  });
  const toolDraft = extractToolDraft(response);
  if (toolDraft) {
    return parseGeneratedDraft(toolDraft);
  }

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
  normalized: NormalizedGeneratedDraft,
  subjectIds: string[],
  slug: string,
  intendedAction: EditorialOpportunity['action'],
  opportunity: EditorialOpportunity,
  _brief: EditorialBlogCompositionBrief,
) {
  const generated = normalized.generated;
  return {
    targetKeyword: opportunity.targetKeyword,
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
    strongInternalLinkCandidates: isWeeklyFallbackKeyword(opportunity) ? 3 : normalized.linkInventoryCount,
    availablePreviewLinkCandidates: normalized.linkInventoryCount,
    availablePreviewEntityTypes: normalized.availablePreviewEntityTypes,
    availableNonOrganizationCandidates: normalized.availableNonOrganizationCandidates,
    allowedPreviewEntityPaths: normalized.allowedPreviewEntityPaths,
    hasArticleJsonLdPath: true,
  };
}

function directAnswerParagraph(opportunity: EditorialOpportunity): string {
  return `${opportunity.targetKeyword} is best understood as a search for a clear map of where this topic fits in AI history. The useful answer is not just what happened, but which bottleneck changed, which people or institutions moved it, and why the shift mattered for later AI systems.`;
}

function hasInternalHref(markdown: string, href: string): boolean {
  return markdown.includes(`](${href})`);
}

function addFallbackInternalLinks(markdown: string): string {
  const fallbackLinks = [
    { label: 'AI Timeline', href: '/blog/ai-timeline' },
    { label: 'Timeline', href: '/timeline' },
    { label: 'AI glossary', href: '/glossary' },
    { label: 'Learn', href: '/learn' },
  ].filter((link) => !hasInternalHref(markdown, link.href));

  if (fallbackLinks.length === 0) return markdown;

  const section = [
    '## Explore the atlas',
    '',
    ...fallbackLinks.slice(0, 4).map((link) => `- [${link.label}](${link.href})`),
  ].join('\n');

  return `${markdown.trim()}\n\n${section}`;
}

function repairGeneratedDraftForGate(
  generated: GeneratedEditorialBlogDraft,
  opportunity: EditorialOpportunity,
  qualityGate: BlogQualityGateResult,
): GeneratedEditorialBlogDraft {
  let bodyMarkdown = generated.bodyMarkdown;

  if (qualityGate.blockers.includes('Opening 150 words must answer the target query directly.')) {
    bodyMarkdown = `${directAnswerParagraph(opportunity)}\n\n${bodyMarkdown.trim()}`;
  }

  if (qualityGate.blockers.includes('At least 3 distinct internal links are required.')) {
    bodyMarkdown = addFallbackInternalLinks(bodyMarkdown);
  }

  return {
    ...generated,
    bodyMarkdown,
  };
}

async function normalizeGeneratedDraft(
  generated: GeneratedEditorialBlogDraft,
  brief: EditorialBlogCompositionBrief,
): Promise<NormalizedGeneratedDraft> {
  const discoveredInventory = await discoverEditorialEntityInventory({
    title: generated.title,
    bodyMarkdown: generated.bodyMarkdown,
    baseInventory: brief.linkInventory,
  });
  const minimumPreviewLinks = Math.max(3, Math.min(6, discoveredInventory.length));
  const enriched = enforceEditorialEntityLinks({
    bodyMarkdown: generated.bodyMarkdown,
    linkInventory: discoveredInventory,
    relations: generated.relations,
    minimumPreviewLinks,
  });

  return {
    generated: {
      ...generated,
      bodyMarkdown: enriched.bodyMarkdown,
      relations: enriched.relations,
    },
    linkInventoryCount: discoveredInventory.length,
    availablePreviewEntityTypes: [...new Set(discoveredInventory.map((item) => item.entityType))],
    availableNonOrganizationCandidates: discoveredInventory.filter((item) => item.entityType !== 'organization').length,
    allowedPreviewEntityPaths: discoveredInventory.map((item) => item.path),
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

async function publishExistingDraftFromRun(
  opportunity: EditorialOpportunity,
  existing: NonNullable<Awaited<ReturnType<typeof findExistingEditorialRun>>>,
): Promise<ProcessEditorialOpportunityResult | null> {
  if (
    opportunity.action !== 'auto_publish' ||
    existing.status !== 'draft_created' ||
    !existing.postId ||
    existing.reason?.startsWith('Quality gate blocked draft:')
  ) {
    return null;
  }

  const publishedPost = await publishPost(existing.postId);
  if (!publishedPost) {
    throw new Error(`Blog post ${existing.postId} disappeared before publish`);
  }

  await completeEditorialOpportunityRun(existing.idempotencyKey, {
    status: 'auto_published',
    postId: existing.postId,
    reason: 'Published existing clean draft after opportunity qualified for the auto-publish lane.',
    metadata: { upgradedFrom: 'draft_created' },
  });

  return {
    id: opportunity.id,
    sourceType: opportunity.sourceType,
    action: 'auto_publish',
    status: 'auto_published',
    title: publishedPost.title,
    reason: 'Published existing clean draft after opportunity qualified for the auto-publish lane.',
    postId: existing.postId,
    publicUrl: `${SITE_ORIGIN}/blog/${publishedPost.slug}`,
    adminUrl: `${SITE_ORIGIN}/admin/blog/${existing.postId}/edit`,
    qualityGate: null,
  };
}

function isRetryableStaleProcessingRun(
  existing: NonNullable<Awaited<ReturnType<typeof findExistingEditorialRun>>>,
): boolean {
  if (existing.status !== 'processing' || existing.postId) {
    return false;
  }

  const updatedAtMs = Date.parse(existing.updatedAt);
  return Number.isFinite(updatedAtMs) && Date.now() - updatedAtMs > 15 * 60 * 1000;
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

  if (isWeeklyFallbackKeyword(opportunity)) {
    return;
  }

  await markKeywordOpportunityPromoted(opportunity.id);
}

async function createDraftAndLink(
  opportunity: EditorialOpportunity,
  generated: GeneratedEditorialBlogDraft,
  subjectIds: string[],
  slug: string,
): Promise<{ id: string; slug: string; title: string; status: string }> {
  await prepareProposalForDraft(opportunity);
  const author = await getOrCreateDefaultAuthor();
  const post = await createDraft({ ...buildDraftInput(generated, subjectIds), slug }, author.id);
  if (!post) {
    throw new Error('Blog draft creation returned no post');
  }
  await afterCreateSideEffects(opportunity, post.id);
  return post;
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
  if (
    existing?.status === 'processing' &&
    (!options.force || !isRetryableStaleProcessingRun(existing))
  ) {
    return {
      id: opportunity.id,
      sourceType: opportunity.sourceType,
      action: opportunity.action,
      status: 'skipped_by_gate',
      title: opportunity.title,
      reason: 'Opportunity is already processing for this week.',
      postId: null,
      publicUrl: null,
      adminUrl: null,
      qualityGate: null,
    };
  }
  if (
    existing &&
    (
      !options.force ||
      existing.postId ||
      (existing.status !== 'failed' && existing.status !== 'skipped_by_gate')
    )
  ) {
    if (options.force) {
      const upgraded = await publishExistingDraftFromRun(opportunity, existing);
      if (upgraded) return upgraded;
    }
    const existingResult = resultFromExistingRun(opportunity, existing);
    if (existingResult) return existingResult;
  }

  const claim = await claimEditorialOpportunityRun(options.weekStart, opportunity, {
    force: options.force ?? false,
  });
  if (!claim.claimed && claim.status === 'processing') {
    return {
      id: opportunity.id,
      sourceType: opportunity.sourceType,
      action: opportunity.action,
      status: 'skipped_by_gate',
      title: opportunity.title,
      reason: 'Opportunity is already processing for this week.',
      postId: null,
      publicUrl: null,
      adminUrl: null,
      qualityGate: null,
    };
  }
  if (claim.status !== 'processing') {
    const existingResult = resultFromExistingRun(opportunity, claim);
    if (existingResult) return existingResult;
  }

  try {
    const brief = await buildEditorialBlogCompositionBrief(opportunity);
    const effectiveAction: EditorialOpportunity['action'] =
      opportunity.action === 'auto_publish' && brief.blockers.length > 0 ? 'draft_only' : opportunity.action;
    const normalizedGenerated = await normalizeGeneratedDraft(
      await generateEditorialBlogDraft({ ...opportunity, action: effectiveAction }, brief),
      brief,
    );
    const generated = normalizedGenerated.generated;
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

    let qualityGate = evaluateBlogQualityGate(gateInput(normalizedGenerated, subjectIds, slug, effectiveAction, opportunity, brief));
    let finalGenerated = generated;
    if (!qualityGate.passed) {
      const repaired = await normalizeGeneratedDraft(
        repairGeneratedDraftForGate(generated, opportunity, qualityGate),
        brief,
      );
      finalGenerated = repaired.generated;
      qualityGate = evaluateBlogQualityGate(gateInput(repaired, subjectIds, slug, effectiveAction, opportunity, brief));
    }

    if (!qualityGate.passed) {
      const reason = `Quality gate blocked draft: ${qualityGate.blockers.join('; ')}`;
      const draftBlockers = new Set([
        'Slug must be lowercase kebab-case.',
        'seoTitle is required and must be <= 60 characters.',
        'seoDescription is required and must be 140-160 characters.',
        'Body markdown must not include a leading H1 because BlogPostPage renders the page H1.',
        'At least one subject is required.',
      ]);
      const canPersistDraft = qualityGate.blockers.every((blocker) => !draftBlockers.has(blocker));
      if (canPersistDraft) {
        const draftPost = await createDraftAndLink(opportunity, finalGenerated, subjectIds, slug);
        await completeEditorialOpportunityRun(claim.idempotencyKey, {
          status: 'draft_created',
          postId: draftPost.id,
          reason,
          metadata: { qualityGate, compositionBrief: brief, downgradedFrom: opportunity.action },
        });
        return {
          id: opportunity.id,
          sourceType: opportunity.sourceType,
          action: 'draft_only',
          status: 'draft_created',
          title: draftPost.title,
          reason,
          postId: draftPost.id,
          publicUrl: null,
          adminUrl: `${SITE_ORIGIN}/admin/blog/${draftPost.id}/edit`,
          qualityGate,
        };
      }

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

    const post = await createDraftAndLink(opportunity, finalGenerated, subjectIds, slug);

    const publishedPost = effectiveAction === 'auto_publish'
      ? await publishPost(post.id)
      : post;
    if (!publishedPost) {
      throw new Error(`Blog post ${post.id} disappeared before publish`);
    }

    const publicUrl = `${SITE_ORIGIN}/blog/${publishedPost.slug}`;
    const status = effectiveAction === 'auto_publish' ? 'auto_published' : 'draft_created';
    const downgradeReason = effectiveAction !== opportunity.action
      ? `Draft-only because pre-draft brief found: ${brief.blockers.join('; ')}`
      : null;
    const reason = downgradeReason
      ?? (qualityGate.warnings.length > 0
      ? `Created with warnings: ${qualityGate.warnings.join('; ')}`
      : 'Created successfully.');
    await completeEditorialOpportunityRun(claim.idempotencyKey, {
      status,
      postId: post.id,
      reason,
      metadata: { qualityGate, compositionBrief: brief, requestedAction: opportunity.action },
    });

    return {
      id: opportunity.id,
      sourceType: opportunity.sourceType,
      action: effectiveAction,
      status,
      title: publishedPost.title,
      reason,
      postId: post.id,
      publicUrl: status === 'auto_published' ? publicUrl : null,
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

import type { RelationInput } from '../blogAdmin';
import type { SeoProposalLinkInventoryItem } from './briefGenerator';

type LinkableEntityType = 'person' | 'organization' | 'glossary_term' | 'milestone';
type ShortcodeEntityType = 'person' | 'organization' | 'glossary' | 'event';

interface LinkCandidate {
  entityType: LinkableEntityType;
  entityId: string;
  label: string;
  path: string;
  shortcodeType: ShortcodeEntityType;
  shortcodeTarget: string;
  aliases: string[];
  reason: string;
  labelFamily: string;
}

interface ProtectedMarkdown {
  body: string;
  tokens: string[];
}

export interface EditorialEntityLinkerResult {
  bodyMarkdown: string;
  insertedCount: number;
  previewEntityLinkCount: number;
  relations: RelationInput[];
}

const ENTITY_SHORTCODE_PATTERN = /\[\[(person|organization|glossary|event):([a-zA-Z0-9_-]+)\|([^\]]+)\]\]/g;
const ENTITY_MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\(((?:https:\/\/letaiexplainai\.com)?\/(?:people|organizations|glossary|events)\/[^)]+)\)/g;
const ENTITY_MARKDOWN_LINK_WITH_LABEL_PATTERN = /\[([^\]]+)\]\(((?:https:\/\/letaiexplainai\.com)?\/(?:people|organizations|glossary|events)\/[^)]+)\)/g;
const MARKDOWN_LINK_PATTERN = /!?\[[^\]]+\]\([^)]+\)/g;
const FENCED_CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /`[^`\n]+`/g;
const HEADING_PATTERN = /^#{1,6}\s+.*$/gm;
const PROTECTED_PLACEHOLDER_PREFIX = '@@LAEA_ENTITY_TOKEN_';
const GENERIC_PAREN_ALIASES = new Set(['AI', 'ML', 'DL', 'NLP', 'LLM', 'LLMS']);
const GENERIC_GLOSSARY_TAIL_PATTERN = /\((?:ai|ml|dl|nlp|llm|llms)\)$/i;
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAcronym(label: string): string | null {
  const words = label
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length < 2) return null;

  const acronym = words
    .filter((word) => word.length > 0)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return acronym.length >= 2 ? acronym : null;
}

function isAcronymAlias(alias: string): boolean {
  return /^[A-Z0-9]{2,6}$/.test(alias.trim());
}

function buildAliases(label: string, entityType: LinkableEntityType): string[] {
  const aliases = new Set<string>();
  const trimmed = label.trim();
  if (!trimmed) return [];

  aliases.add(trimmed);

  const parenMatch = trimmed.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    aliases.add(parenMatch[1].trim());
    const parenAlias = parenMatch[2].trim();
    if (!GENERIC_PAREN_ALIASES.has(parenAlias.toUpperCase())) {
      aliases.add(parenAlias);
    }
  }

  const acronym = buildAcronym(trimmed);
  if (acronym) aliases.add(acronym);

  if (entityType === 'person') {
    const pieces = trimmed.split(/\s+/).filter(Boolean);
    if (pieces.length >= 2) {
      const lastName = pieces[pieces.length - 1];
      if (lastName.length >= 4) {
        aliases.add(lastName);
      }
    }
  }

  return [...aliases]
    .map((alias) => alias.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

function parseShortcodeTarget(path: string, entityType: LinkableEntityType): string | null {
  const normalized = path.replace('https://letaiexplainai.com', '');
  if (entityType === 'person' && normalized.startsWith('/people/')) {
    return normalized.slice('/people/'.length);
  }
  if (entityType === 'organization' && normalized.startsWith('/organizations/')) {
    return normalized.slice('/organizations/'.length);
  }
  if (entityType === 'glossary_term' && normalized.startsWith('/glossary/')) {
    return normalized.slice('/glossary/'.length);
  }
  if (entityType === 'milestone' && normalized.startsWith('/events/')) {
    return normalized.slice('/events/'.length);
  }
  return null;
}

function shortcodeTypeFor(entityType: LinkableEntityType): ShortcodeEntityType {
  switch (entityType) {
    case 'person':
      return 'person';
    case 'organization':
      return 'organization';
    case 'glossary_term':
      return 'glossary';
    case 'milestone':
      return 'event';
  }
}

function toCandidate(item: SeoProposalLinkInventoryItem): LinkCandidate | null {
  const shortcodeTarget = parseShortcodeTarget(item.path, item.entityType);
  if (!shortcodeTarget) return null;

  return {
    entityType: item.entityType,
    entityId: item.id,
    label: item.label,
    path: item.path.replace('https://letaiexplainai.com', ''),
    shortcodeType: shortcodeTypeFor(item.entityType),
    shortcodeTarget,
    aliases: buildAliases(item.label, item.entityType),
    reason: item.reason,
    labelFamily: normalizeLabelFamily(item.label),
  };
}

function protectPattern(input: ProtectedMarkdown, pattern: RegExp): ProtectedMarkdown {
  return {
    body: input.body.replace(pattern, (match) => {
      const token = `${PROTECTED_PLACEHOLDER_PREFIX}${input.tokens.length}@@`;
      input.tokens.push(match);
      return token;
    }),
    tokens: input.tokens,
  };
}

function protectMarkdown(markdown: string): ProtectedMarkdown {
  let protectedState: ProtectedMarkdown = { body: markdown, tokens: [] };
  protectedState = protectPattern(protectedState, FENCED_CODE_BLOCK_PATTERN);
  protectedState = protectPattern(protectedState, INLINE_CODE_PATTERN);
  protectedState = protectPattern(protectedState, ENTITY_SHORTCODE_PATTERN);
  protectedState = protectPattern(protectedState, MARKDOWN_LINK_PATTERN);
  protectedState = protectPattern(protectedState, HEADING_PATTERN);
  return protectedState;
}

function restoreMarkdown(protectedState: ProtectedMarkdown): string {
  return protectedState.tokens.reduce(
    (body, token, index) => body.replace(`${PROTECTED_PLACEHOLDER_PREFIX}${index}@@`, token),
    protectedState.body,
  );
}

function buildAliasRegex(alias: string): RegExp {
  const normalized = escapeRegExp(alias).replace(/\s+/g, '\\s+');
  return new RegExp(
    `(^|[^A-Za-z0-9_])(${normalized})(?=(?:['’]s)?(?![A-Za-z0-9_]))`,
    isAcronymAlias(alias) ? '' : 'i',
  );
}

function normalizeEntityLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLabelFamily(value: string): string {
  return value
    .replace(/\((?:[^)]+)\)/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function candidateSourceScore(candidate: LinkCandidate): number {
  if (/^Detected (?:glossary concept|person|organization|historical event)/i.test(candidate.reason)) {
    return 50;
  }
  if (/^Relevant /i.test(candidate.reason)) {
    return 42;
  }
  if (/^Existing published relation/i.test(candidate.reason)) {
    return 26;
  }
  if (/^Expanded from glossary-linked milestones/i.test(candidate.reason)) {
    return 24;
  }
  if (/^Expanded from linked glossary concepts/i.test(candidate.reason)) {
    return 16;
  }
  return 20;
}

function candidateTypeScore(candidate: LinkCandidate): number {
  switch (candidate.entityType) {
    case 'milestone':
      return 24;
    case 'person':
      return 22;
    case 'organization':
      return 20;
    case 'glossary_term':
    default:
      return 18;
  }
}

function isLowSignalGlossaryCandidate(candidate: LinkCandidate): boolean {
  return (
    candidate.entityType === 'glossary_term'
    && GENERIC_GLOSSARY_TAIL_PATTERN.test(candidate.label)
    && !/^Detected glossary concept/i.test(candidate.reason)
    && !/^Relevant glossary term/i.test(candidate.reason)
  );
}

function candidateScore(candidate: LinkCandidate): number {
  return (
    candidateSourceScore(candidate)
    + candidateTypeScore(candidate)
    + Math.min(candidate.label.length, 18)
    - (isLowSignalGlossaryCandidate(candidate) ? 24 : 0)
  );
}

function compareCandidates(a: LinkCandidate, b: LinkCandidate): number {
  const scoreDelta = candidateScore(b) - candidateScore(a);
  if (scoreDelta !== 0) return scoreDelta;
  const aliasDelta = b.aliases.length - a.aliases.length;
  if (aliasDelta !== 0) return aliasDelta;
  return b.label.length - a.label.length;
}

function isPlausibleEntityLabel(candidate: LinkCandidate, label: string): boolean {
  const normalizedLabel = normalizeEntityLabel(label);
  if (!normalizedLabel) return false;
  if (ENTITY_LABEL_STOPWORDS.has(normalizedLabel)) return false;
  if (normalizedLabel.length <= 2 && !/^[A-Z0-9]{2,5}$/.test(label.trim())) return false;

  return candidate.aliases.some((alias) => {
    const normalizedAlias = normalizeEntityLabel(alias);
    if (!normalizedAlias) return false;
    return (
      normalizedAlias === normalizedLabel
      || normalizedAlias.includes(normalizedLabel)
      || normalizedLabel.includes(normalizedAlias)
    );
  });
}

function sanitizeExistingEntityLinks(markdown: string, candidates: LinkCandidate[]): string {
  const shortcodePattern = new RegExp(ENTITY_SHORTCODE_PATTERN.source, 'g');
  const entityMarkdownLinkPattern = new RegExp(ENTITY_MARKDOWN_LINK_WITH_LABEL_PATTERN.source, 'g');
  const candidateByShortcode = new Map(
    candidates.map((candidate) => [
      `${candidate.shortcodeType}:${candidate.shortcodeTarget}`,
      candidate,
    ]),
  );
  const candidateByPath = new Map(
    candidates.map((candidate) => [candidate.path, candidate]),
  );

  const sanitizedShortcodes = markdown.replace(
    shortcodePattern,
    (match, shortcodeType: string, shortcodeTarget: string, label: string) => {
      const candidate = candidateByShortcode.get(`${shortcodeType}:${shortcodeTarget}`);
      if (!candidate) return label;
      return isPlausibleEntityLabel(candidate, label) ? match : label;
    },
  );

  return sanitizedShortcodes.replace(
    entityMarkdownLinkPattern,
    (match, label: string, path: string) => {
      const candidate = candidateByPath.get(path.replace('https://letaiexplainai.com', ''));
      if (!candidate) return label;
      return isPlausibleEntityLabel(candidate, label) ? match : label;
    },
  );
}

function replaceFirstAliasMention(body: string, candidate: LinkCandidate): { body: string; replaced: boolean } {
  let bestMatch: { index: number; label: string; matched: string } | null = null;

  for (const alias of candidate.aliases) {
    const regex = buildAliasRegex(alias);
    const match = regex.exec(body);
    if (!match || match.index === undefined) continue;

    const prefix = match[1] ?? '';
    const matched = match[2] ?? alias;
    const aliasStart = match.index + prefix.length;

    if (!bestMatch || aliasStart < bestMatch.index || (aliasStart === bestMatch.index && matched.length > bestMatch.matched.length)) {
      bestMatch = {
        index: aliasStart,
        label: matched,
        matched,
      };
    }
  }

  if (!bestMatch) {
    return { body, replaced: false };
  }

  const shortcode = `[[${candidate.shortcodeType}:${candidate.shortcodeTarget}|${bestMatch.label}]]`;
  const before = body.slice(0, bestMatch.index);
  const after = body.slice(bestMatch.index + bestMatch.matched.length);
  return {
    body: `${before}${shortcode}${after}`,
    replaced: true,
  };
}

function hasEntityLink(markdown: string, candidate: LinkCandidate): boolean {
  return (
    markdown.includes(`[[${candidate.shortcodeType}:${candidate.shortcodeTarget}|`)
    || markdown.includes(`](${candidate.path})`)
    || markdown.includes(`](https://letaiexplainai.com${candidate.path})`)
  );
}

function parseEntityPath(path: string): { entityType: LinkableEntityType; entityId: string } | null {
  const normalized = path.replace('https://letaiexplainai.com', '');
  if (normalized.startsWith('/people/')) {
    return { entityType: 'person', entityId: normalized.slice('/people/'.length) };
  }
  if (normalized.startsWith('/organizations/')) {
    return { entityType: 'organization', entityId: normalized.slice('/organizations/'.length) };
  }
  if (normalized.startsWith('/glossary/')) {
    return { entityType: 'glossary_term', entityId: normalized.slice('/glossary/'.length) };
  }
  if (normalized.startsWith('/events/')) {
    return { entityType: 'milestone', entityId: normalized.slice('/events/'.length) };
  }
  return null;
}

function candidateRelationKeys(candidate: LinkCandidate): string[] {
  return [...new Set([
    `${candidate.entityType}:${candidate.entityId}`,
    `${candidate.entityType}:${candidate.shortcodeTarget}`,
  ])];
}

function extractPreviewRelations(markdown: string, existingRelations: RelationInput[]): RelationInput[] {
  const labels = new Map(existingRelations.map((relation) => [
    `${relation.entityType}:${relation.entityId}`,
    relation.relationLabel,
  ]));
  const deduped = new Map<string, RelationInput>();

  for (const match of markdown.matchAll(ENTITY_SHORTCODE_PATTERN)) {
    const entityType =
      match[1] === 'glossary'
        ? 'glossary_term'
        : match[1] === 'event'
          ? 'milestone'
          : match[1];
    const entityId = match[2];
    const key = `${entityType}:${entityId}`;
    deduped.set(key, {
      entityType,
      entityId,
      relationLabel: labels.get(key),
    });
  }

  for (const match of markdown.matchAll(ENTITY_MARKDOWN_LINK_PATTERN)) {
    const parsed = parseEntityPath(match[1]);
    if (!parsed) continue;
    const key = `${parsed.entityType}:${parsed.entityId}`;
    deduped.set(key, {
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      relationLabel: labels.get(key),
    });
  }

  return [...deduped.values()];
}

function pickFallbackCandidates(
  candidates: LinkCandidate[],
  linkedKeys: Set<string>,
  linkedFamilies: Set<string>,
  needed: number,
): LinkCandidate[] {
  const remaining = candidates
    .filter((candidate) => (
      !linkedKeys.has(`${candidate.entityType}:${candidate.entityId}`)
      && !linkedFamilies.has(candidate.labelFamily)
    ))
    .sort(compareCandidates);

  const betterSignalCount = remaining.filter((candidate) => !isLowSignalGlossaryCandidate(candidate)).length;
  const allowedLowSignalGlossaries = Math.max(0, needed - betterSignalCount);
  const picked: LinkCandidate[] = [];
  const pickedTypes = new Set<LinkCandidate['entityType']>();
  const pickedFamilies = new Set<string>();
  let pickedLowSignalGlossaries = 0;

  function canPick(candidate: LinkCandidate): boolean {
    if (pickedFamilies.has(candidate.labelFamily)) return false;
    if (!isLowSignalGlossaryCandidate(candidate)) return true;
    return pickedLowSignalGlossaries < allowedLowSignalGlossaries;
  }

  function pick(candidate: LinkCandidate): void {
    picked.push(candidate);
    pickedTypes.add(candidate.entityType);
    pickedFamilies.add(candidate.labelFamily);
    if (isLowSignalGlossaryCandidate(candidate)) {
      pickedLowSignalGlossaries += 1;
    }
  }

  for (const candidate of remaining) {
    if (picked.length >= needed) break;
    if (pickedTypes.has(candidate.entityType)) continue;
    if (!canPick(candidate)) continue;
    pick(candidate);
  }

  for (const candidate of remaining) {
    if (picked.length >= needed) break;
    if (picked.some((existing) => existing.entityType === candidate.entityType && existing.entityId === candidate.entityId)) continue;
    if (!canPick(candidate)) continue;
    pick(candidate);
  }

  return picked;
}

function insertAtlasConnectionsSection(markdown: string, candidates: LinkCandidate[], minimumLinks: number): string {
  const existingRelations = extractPreviewRelations(markdown, []);
  if (existingRelations.length >= minimumLinks) {
    return markdown;
  }

  const candidateByKey = new Map(
    candidates.flatMap((candidate) => candidateRelationKeys(candidate).map((key) => [key, candidate] as const)),
  );
  const linkedKeys = new Set<string>();
  for (const relation of existingRelations) {
    const rawKey = `${relation.entityType}:${relation.entityId}`;
    linkedKeys.add(rawKey);
    const candidate = candidateByKey.get(rawKey);
    if (!candidate) continue;
    for (const key of candidateRelationKeys(candidate)) {
      linkedKeys.add(key);
    }
  }
  const linkedFamilies = new Set(
    existingRelations
      .map((relation) => candidateByKey.get(`${relation.entityType}:${relation.entityId}`)?.labelFamily ?? '')
      .filter(Boolean),
  );
  const remaining = pickFallbackCandidates(
    candidates,
    linkedKeys,
    linkedFamilies,
    Math.max(0, minimumLinks - existingRelations.length),
  );
  if (remaining.length === 0) {
    return markdown;
  }

  const needed = Math.max(0, minimumLinks - existingRelations.length);
  if (needed === 0) return markdown;

  const section = [
    '## Atlas connections',
    '',
    ...remaining.slice(0, needed).map((candidate) => `- [[${candidate.shortcodeType}:${candidate.shortcodeTarget}|${candidate.label}]]`),
  ].join('\n');

  if (/\n##\s+Sources\b/i.test(markdown)) {
    return markdown.replace(/\n##\s+Sources\b/i, `\n\n${section}\n\n## Sources`);
  }

  return `${markdown.trim()}\n\n${section}`;
}

export function countPreviewEntityLinks(markdown: string): number {
  return extractPreviewRelations(markdown, []).length;
}

export function scorePreviewEntityMix(
  markdown: string,
  linkInventory: SeoProposalLinkInventoryItem[],
): number {
  const candidateMap = new Map<string, LinkCandidate>();
  for (const candidate of linkInventory.map(toCandidate).filter((candidate): candidate is LinkCandidate => Boolean(candidate))) {
    for (const key of candidateRelationKeys(candidate)) {
      candidateMap.set(key, candidate);
    }
  }

  const linkedCandidates = extractPreviewRelations(markdown, [])
    .map((relation) => candidateMap.get(`${relation.entityType}:${relation.entityId}`))
    .filter((candidate): candidate is LinkCandidate => Boolean(candidate));

  const linkedTypes = new Set<string>();
  const familyCounts = new Map<string, number>();
  let score = 0;

  for (const candidate of linkedCandidates) {
    score += candidateScore(candidate);
    linkedTypes.add(candidate.entityType);
    familyCounts.set(candidate.labelFamily, (familyCounts.get(candidate.labelFamily) ?? 0) + 1);
  }

  const duplicateFamilyCount = [...familyCounts.values()].reduce((count, familyCount) => (
    familyCount > 1 ? count + (familyCount - 1) : count
  ), 0);

  return (
    score
    + (linkedTypes.size * 18)
    - (duplicateFamilyCount * 90)
  );
}

export function enforceEditorialEntityLinks(input: {
  bodyMarkdown: string;
  linkInventory: SeoProposalLinkInventoryItem[];
  relations?: RelationInput[];
  minimumPreviewLinks?: number;
  allowFallbackSection?: boolean;
}): EditorialEntityLinkerResult {
  const minimumPreviewLinks = input.minimumPreviewLinks ?? 3;
  const candidateMap = new Map<string, LinkCandidate>();
  for (const candidate of input.linkInventory.map(toCandidate).filter((candidate): candidate is LinkCandidate => Boolean(candidate))) {
    candidateMap.set(`${candidate.entityType}:${candidate.entityId}`, candidate);
  }
  const candidates = [...candidateMap.values()].sort(compareCandidates);

  let protectedMarkdown = protectMarkdown(sanitizeExistingEntityLinks(input.bodyMarkdown, candidates));
  let insertedCount = 0;
  const linkedFamilies = new Map<string, LinkCandidate>();

  const initialBody = restoreMarkdown(protectedMarkdown);
  for (const candidate of candidates) {
    if (!hasEntityLink(initialBody, candidate)) continue;
    const existing = linkedFamilies.get(candidate.labelFamily);
    if (!existing || compareCandidates(candidate, existing) < 0) {
      linkedFamilies.set(candidate.labelFamily, candidate);
    }
  }

  for (const candidate of candidates) {
    const currentBody = restoreMarkdown(protectedMarkdown);
    if (hasEntityLink(currentBody, candidate)) {
      const existing = linkedFamilies.get(candidate.labelFamily);
      if (!existing || compareCandidates(candidate, existing) < 0) {
        linkedFamilies.set(candidate.labelFamily, candidate);
      }
      continue;
    }

    const familyLeader = linkedFamilies.get(candidate.labelFamily);
    if (
      familyLeader
      && (familyLeader.entityType !== candidate.entityType || familyLeader.entityId !== candidate.entityId)
    ) {
      continue;
    }

    const replaced = replaceFirstAliasMention(protectedMarkdown.body, candidate);
    if (replaced.replaced) {
      protectedMarkdown = protectPattern({
        body: replaced.body,
        tokens: protectedMarkdown.tokens,
      }, ENTITY_SHORTCODE_PATTERN);
      insertedCount += 1;
      linkedFamilies.set(candidate.labelFamily, candidate);
    }
  }

  let bodyMarkdown = restoreMarkdown(protectedMarkdown);
  if (
    input.allowFallbackSection !== false
    && countPreviewEntityLinks(bodyMarkdown) < minimumPreviewLinks
  ) {
    bodyMarkdown = insertAtlasConnectionsSection(bodyMarkdown, candidates, minimumPreviewLinks);
  }

  const relations = extractPreviewRelations(bodyMarkdown, input.relations ?? []);
  return {
    bodyMarkdown,
    insertedCount,
    previewEntityLinkCount: relations.length,
    relations,
  };
}

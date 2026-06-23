import { prisma } from '../../db';
import { getLinkedMilestones } from '../glossary';
import { getKeyConcepts as getOrganizationKeyConcepts } from '../organizations';
import { getKeyConcepts as getPersonKeyConcepts } from '../persons';
import { search as searchMilestones } from '../milestones';
import type { SeoProposalLinkInventoryItem } from './briefGenerator';

type EntityType = SeoProposalLinkInventoryItem['entityType'];

interface GlossaryCatalogTerm {
  id: string;
  term: string;
  slug: string | null;
  shortDefinition: string;
}

interface PersonCatalogEntry {
  id: string;
  canonicalName: string;
  slug: string;
  aliases: string;
}

interface OrganizationCatalogEntry {
  id: string;
  name: string;
  slug: string;
}

interface EditorialEntityCatalog {
  glossaryTerms: GlossaryCatalogTerm[];
  persons: PersonCatalogEntry[];
  organizations: OrganizationCatalogEntry[];
}

interface DiscoveredGlossaryMatch {
  term: GlossaryCatalogTerm;
  occurrences: number;
  inTitle: boolean;
  inHeading: boolean;
}

interface GlossaryVariation {
  value: string;
  term: GlossaryCatalogTerm;
  caseSensitive: boolean;
}

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\([^)]+\)/g;
const ENTITY_SHORTCODE_PATTERN = /\[\[(?:person|organization|glossary|event):[a-zA-Z0-9_-]+\|([^\]]+)\]\]/g;
const HEADING_PATTERN = /^#{1,6}\s+(.+)$/gm;
const FENCED_CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /`[^`\n]+`/g;
const GENERIC_PAREN_ALIASES = new Set(['AI', 'ML', 'DL', 'NLP', 'LLM', 'LLMS']);
const QUERY_STOP_WORDS = new Set([
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
  'of',
  'on',
  'or',
  'the',
  'to',
  'vs',
  'with',
]);
const MAX_GLOSSARY_MATCHES = 8;
const MAX_PERSON_MATCHES = 4;
const MAX_ORGANIZATION_MATCHES = 6;
const MAX_GRAPH_GLOSSARY_MATCHES = 4;
const MAX_EVENT_MATCHES = 6;

let cachedCatalog: EditorialEntityCatalog | null = null;
let cachedCatalogLoadedAt = 0;
const CATALOG_CACHE_MS = 10 * 60 * 1000;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanMarkdown(markdown: string): string {
  return markdown
    .replace(FENCED_CODE_BLOCK_PATTERN, ' ')
    .replace(INLINE_CODE_PATTERN, ' ')
    .replace(ENTITY_SHORTCODE_PATTERN, '$1')
    .replace(MARKDOWN_LINK_PATTERN, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadings(markdown: string): string[] {
  return [...markdown.matchAll(HEADING_PATTERN)]
    .map((match) => match[1]?.trim())
    .filter((heading): heading is string => Boolean(heading));
}

function buildAcronym(label: string): string | null {
  const words = label
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length < 2) return null;

  const acronym = words
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return acronym.length >= 2 ? acronym : null;
}

function isAcronymAlias(alias: string): boolean {
  return /^[A-Z0-9]{2,6}$/.test(alias.trim());
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function buildPersonAliases(person: PersonCatalogEntry): string[] {
  return [...new Set([
    person.canonicalName,
    ...parseJsonArray(person.aliases),
  ])].filter((alias) => alias.trim().split(/\s+/).length >= 2);
}

function buildOrganizationAliases(organization: OrganizationCatalogEntry): string[] {
  const aliases = new Set<string>([organization.name]);
  const acronym = buildAcronym(organization.name);
  if (acronym && acronym.length >= 3) {
    aliases.add(acronym);
  }
  return [...aliases];
}

function buildTermVariations(terms: GlossaryCatalogTerm[]): GlossaryVariation[] {
  const variations = new Map<string, GlossaryVariation>();

  function pushVariation(term: GlossaryCatalogTerm, value: string, caseSensitive: boolean): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    variations.set(`${term.id}:${caseSensitive ? 'cs' : 'ci'}:${trimmed}`, {
      value: trimmed,
      term,
      caseSensitive,
    });
  }

  for (const term of terms) {
    const normalized = term.term.toLowerCase().trim();
    if (!normalized) continue;

    pushVariation(term, normalized, false);

    if (!normalized.endsWith('s') && normalized.length >= 4) {
      pushVariation(term, `${normalized}s`, false);
    }

    if (normalized.includes('-')) {
      pushVariation(term, normalized.replace(/-/g, ' '), false);
      pushVariation(term, normalized.replace(/-/g, ''), false);
    }

    const acronymMatch = term.term.match(/\(([A-Z0-9]+)\)/);
    if (
      acronymMatch
      && acronymMatch[1].length >= 2
      && !GENERIC_PAREN_ALIASES.has(acronymMatch[1].toUpperCase())
    ) {
      pushVariation(term, acronymMatch[1], true);
    }

    const acronym = buildAcronym(term.term);
    if (acronym && acronym.length >= 2) {
      pushVariation(term, acronym, true);
    }
  }

  return [...variations.values()];
}

function buildInventoryItem(
  entityType: EntityType,
  id: string,
  label: string,
  path: string,
  reason: string,
): SeoProposalLinkInventoryItem {
  return {
    entityType,
    id,
    label,
    path,
    reason,
  };
}

function mergeInventory(
  ...sources: SeoProposalLinkInventoryItem[][]
): SeoProposalLinkInventoryItem[] {
  const merged = new Map<string, SeoProposalLinkInventoryItem>();
  for (const source of sources) {
    for (const item of source) {
      merged.set(`${item.entityType}:${item.id}`, item);
    }
  }
  return [...merged.values()];
}

function buildSupportPhrase(value: string): string {
  return value
    .replace(/\((?:[^)]+)\)/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsWholePhrase(text: string, phrase: string): boolean {
  if (!phrase) return false;
  const pattern = escapeRegExp(phrase).replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${pattern}\\b`, 'i').test(text);
}

function tokenMatchesSupportText(text: string, token: string): boolean {
  if (!token) return false;
  const variants = new Set<string>([
    token,
    token.endsWith('s') ? token.slice(0, -1) : `${token}s`,
  ]);
  return [...variants]
    .filter((variant) => variant.length >= 3)
    .some((variant) => new RegExp(`\\b${escapeRegExp(variant)}\\b`, 'i').test(text));
}

function hasGraphGlossarySupport(label: string, supportText: string): boolean {
  const phrase = buildSupportPhrase(label);
  if (!phrase) return false;
  if (containsWholePhrase(supportText, phrase)) return true;

  const informativeTokens = phrase
    .split(/\s+/)
    .filter((token) => (
      token.length >= 4
      && !QUERY_STOP_WORDS.has(token)
      && !GENERIC_PAREN_ALIASES.has(token.toUpperCase())
    ));

  if (informativeTokens.length === 0) return false;

  const matchedTokens = informativeTokens.filter((token) => tokenMatchesSupportText(supportText, token)).length;
  const requiredMatches = informativeTokens.length >= 2 ? 2 : 1;
  return matchedTokens >= requiredMatches;
}

function findAliasOccurrences(text: string, aliases: string[]): number {
  let occurrences = 0;
  for (const alias of aliases) {
    const normalizedAlias = alias.trim();
    if (!normalizedAlias || normalizedAlias.length < 2) continue;
    const regex = new RegExp(
      `\\b${escapeRegExp(normalizedAlias).replace(/\s+/g, '\\s+')}\\b`,
      isAcronymAlias(normalizedAlias) ? 'g' : 'gi',
    );
    const matches = [...text.matchAll(regex)].length;
    occurrences += matches;
  }
  return occurrences;
}

async function loadCatalog(): Promise<EditorialEntityCatalog> {
  if (cachedCatalog && (Date.now() - cachedCatalogLoadedAt) < CATALOG_CACHE_MS) {
    return cachedCatalog;
  }

  const [glossaryTerms, persons, organizations] = await Promise.all([
    prisma.glossaryTerm.findMany({
      select: {
        id: true,
        term: true,
        slug: true,
        shortDefinition: true,
      },
    }),
    prisma.person.findMany({
      where: { status: 'published' },
      select: {
        id: true,
        canonicalName: true,
        slug: true,
        aliases: true,
      },
    }),
    prisma.organization.findMany({
      where: { status: 'published' },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  cachedCatalog = {
    glossaryTerms,
    persons,
    organizations,
  };
  cachedCatalogLoadedAt = Date.now();
  return cachedCatalog;
}

function discoverGlossaryTerms(input: {
  title: string;
  bodyText: string;
  headings: string[];
  glossaryTerms: GlossaryCatalogTerm[];
}): DiscoveredGlossaryMatch[] {
  const titleLower = input.title.toLowerCase();
  const headingLower = input.headings.join(' ').toLowerCase();
  const bodyLower = input.bodyText.toLowerCase();
  const termVariations = buildTermVariations(input.glossaryTerms);
  const matches = new Map<string, DiscoveredGlossaryMatch>();

  for (const variation of termVariations) {
    const term = variation.term;
    const baseTerm = term.term.trim();
    if (!baseTerm) continue;
    const allowSingleWord =
      baseTerm.includes(' ')
      || baseTerm.includes('-')
      || /[A-Z0-9]{2,}/.test(baseTerm)
      || baseTerm.length >= 9;
    if (!allowSingleWord) continue;

    const targetText = variation.caseSensitive ? input.bodyText : bodyLower;
    const targetTitle = variation.caseSensitive ? input.title : titleLower;
    const targetHeadings = variation.caseSensitive ? input.headings.join(' ') : headingLower;
    const candidate = variation.caseSensitive ? variation.value : variation.value.toLowerCase();
    const regex = new RegExp(`\\b${escapeRegExp(candidate)}\\b`, variation.caseSensitive ? 'g' : 'gi');
    const occurrences = [...targetText.matchAll(regex)].length;
    if (occurrences === 0) continue;

    const existing = matches.get(term.id);
    const inTitle = targetTitle.includes(candidate);
    const inHeading = targetHeadings.includes(candidate);

    if (existing) {
      existing.occurrences += occurrences;
      existing.inTitle = existing.inTitle || inTitle;
      existing.inHeading = existing.inHeading || inHeading;
      continue;
    }

    matches.set(term.id, {
      term,
      occurrences,
      inTitle,
      inHeading,
    });
  }

  return [...matches.values()]
    .sort((a, b) => {
      const score = (match: DiscoveredGlossaryMatch) =>
        (match.inTitle ? 20 : 0)
        + (match.inHeading ? 10 : 0)
        + match.occurrences * 3
        + (match.term.term.includes(' ') || match.term.term.includes('-') ? 3 : 0)
        + Math.min(match.term.term.length, 12);
      return score(b) - score(a);
    })
    .slice(0, MAX_GLOSSARY_MATCHES);
}

function discoverPeople(
  bodyText: string,
  persons: PersonCatalogEntry[],
): SeoProposalLinkInventoryItem[] {
  const matches = persons
    .map((person) => ({
      person,
      occurrences: findAliasOccurrences(bodyText, buildPersonAliases(person)),
    }))
    .filter((match) => match.occurrences > 0)
    .sort((a, b) => b.occurrences - a.occurrences || a.person.canonicalName.localeCompare(b.person.canonicalName))
    .slice(0, MAX_PERSON_MATCHES);

  return matches.map((match) =>
    buildInventoryItem(
      'person',
      match.person.id,
      match.person.canonicalName,
      `/people/${match.person.slug}`,
      'Detected person mentioned in draft body.',
    ));
}

function discoverOrganizations(
  bodyText: string,
  organizations: OrganizationCatalogEntry[],
): SeoProposalLinkInventoryItem[] {
  const matches = organizations
    .map((organization) => ({
      organization,
      occurrences: findAliasOccurrences(bodyText, buildOrganizationAliases(organization)),
    }))
    .filter((match) => match.occurrences > 0)
    .sort((a, b) => b.occurrences - a.occurrences || a.organization.name.localeCompare(b.organization.name))
    .slice(0, MAX_ORGANIZATION_MATCHES);

  return matches.map((match) =>
    buildInventoryItem(
      'organization',
      match.organization.id,
      match.organization.name,
      `/organizations/${match.organization.slug}`,
      'Detected organization mentioned in draft body.',
    ));
}

function extractMilestoneQueries(title: string, headings: string[], bodyText: string): string[] {
  const capitalizedPhrases = [...bodyText.matchAll(
    /\b(?:[A-Z]{2,}(?:[-.][A-Z0-9]+)*|[A-Z][A-Za-z0-9]*(?:[-.][A-Za-z0-9]+)*)(?:\s+(?:[A-Z]{2,}(?:[-.][A-Z0-9]+)*|[A-Z][A-Za-z0-9]*(?:[-.][A-Za-z0-9]+)*|[0-9]+(?:\.[0-9]+)?)){0,3}\b/g,
  )]
    .map((match) => match[0]?.trim())
    .filter((phrase): phrase is string => Boolean(phrase))
    .filter((phrase) => phrase.length >= 4);

  const headingFragments = headings
    .flatMap((heading) => heading.split(/[:()?]/))
    .map((heading) => heading.trim())
    .filter((heading) => heading.length >= 4);

  return [...new Set([title, ...headingFragments, ...capitalizedPhrases])]
    .filter((query) => {
      const normalized = query.toLowerCase().trim();
      return normalized.length >= 4 && !QUERY_STOP_WORDS.has(normalized);
    })
    .sort((a, b) => {
      const score = (query: string) =>
        (/\d/.test(query) ? 20 : 0)
        + (/[A-Z]{2,}/.test(query) ? 15 : 0)
        + (query.split(/\s+/).length > 1 ? 10 : 0)
        + Math.min(query.length, 20);
      return score(b) - score(a);
    })
    .slice(0, 12);
}

async function discoverMilestones(
  queries: string[],
  existing: SeoProposalLinkInventoryItem[],
): Promise<SeoProposalLinkInventoryItem[]> {
  const existingKeys = new Set(existing.map((item) => `${item.entityType}:${item.id}`));
  const discovered = new Map<string, SeoProposalLinkInventoryItem>();

  for (const query of queries) {
    const results = await searchMilestones({ query, skip: 0, limit: 3 });
    for (const result of results.results) {
      const key = `milestone:${result.id}`;
      if (existingKeys.has(key) || discovered.has(key)) continue;

      const titleMatch = result.title.toLowerCase().includes(query.toLowerCase());
      const isStrongMatch = titleMatch || result.matchedFields.includes('title');
      if (!isStrongMatch) continue;

      const label =
        titleMatch && query.length >= 3 && query.length <= result.title.length
          ? query
          : result.title;

      discovered.set(key, buildInventoryItem(
        'milestone',
        result.id,
        label,
        `/events/${result.id}`,
        'Detected historical event mention in draft body.',
      ));
      if (discovered.size >= MAX_EVENT_MATCHES) {
        return [...discovered.values()];
      }
    }
  }

  return [...discovered.values()];
}

async function discoverGraphGlossaryTerms(
  inventory: SeoProposalLinkInventoryItem[],
  supportText: string,
): Promise<SeoProposalLinkInventoryItem[]> {
  const discovered = new Map<string, SeoProposalLinkInventoryItem>();

  const personIds = inventory.filter((item) => item.entityType === 'person').map((item) => item.id);
  const organizationIds = inventory.filter((item) => item.entityType === 'organization').map((item) => item.id);

  const [personConcepts, organizationConcepts] = await Promise.all([
    Promise.all(personIds.map((id) => getPersonKeyConcepts(id))),
    Promise.all(organizationIds.map((id) => getOrganizationKeyConcepts(id))),
  ]);

  for (const concepts of [...personConcepts.flat(), ...organizationConcepts.flat()]) {
    const term = concepts.glossaryTerm;
    if (!term.slug) continue;
    if (!hasGraphGlossarySupport(term.term, supportText)) continue;
    const key = `glossary_term:${term.id}`;
    if (!discovered.has(key)) {
      discovered.set(key, buildInventoryItem(
        'glossary_term',
        term.id,
        term.term,
        `/glossary/${term.slug}`,
        'Expanded from linked glossary concepts in the atlas graph.',
      ));
    }
    if (discovered.size >= MAX_GRAPH_GLOSSARY_MATCHES) break;
  }

  return [...discovered.values()];
}

async function discoverGraphMilestones(
  inventory: SeoProposalLinkInventoryItem[],
): Promise<SeoProposalLinkInventoryItem[]> {
  const discovered = new Map<string, SeoProposalLinkInventoryItem>();
  const glossaryIds = inventory.filter((item) => item.entityType === 'glossary_term').map((item) => item.id);

  const linked = await Promise.all(glossaryIds.map((id) => getLinkedMilestones(id)));
  for (const milestoneLink of linked.flat()) {
    const milestone = milestoneLink.milestone;
    const key = `milestone:${milestone.id}`;
    if (!discovered.has(key)) {
      discovered.set(key, buildInventoryItem(
        'milestone',
        milestone.id,
        milestone.title,
        `/events/${milestone.id}`,
        'Expanded from glossary-linked milestones in the atlas graph.',
      ));
    }
    if (discovered.size >= MAX_EVENT_MATCHES) break;
  }

  return [...discovered.values()];
}

export async function discoverEditorialEntityInventory(input: {
  title: string;
  bodyMarkdown: string;
  baseInventory: SeoProposalLinkInventoryItem[];
}): Promise<SeoProposalLinkInventoryItem[]> {
  const catalog = await loadCatalog();
  const bodyText = cleanMarkdown(input.bodyMarkdown);
  const headings = extractHeadings(input.bodyMarkdown);

  const glossaryMatches = discoverGlossaryTerms({
    title: input.title,
    bodyText,
    headings,
    glossaryTerms: catalog.glossaryTerms,
  })
    .filter((match) => Boolean(match.term.slug))
    .map((match) => buildInventoryItem(
      'glossary_term',
      match.term.id,
      match.term.term,
      `/glossary/${match.term.slug}`,
      'Detected glossary concept mentioned in draft body.',
    ));

  const personMatches = discoverPeople(bodyText, catalog.persons);
  const organizationMatches = discoverOrganizations(bodyText, catalog.organizations);

  const basePlusDirect = mergeInventory(
    input.baseInventory,
    glossaryMatches,
    personMatches,
    organizationMatches,
  );

  const graphGlossarySupportText = [input.title, ...headings, bodyText].join(' ');
  const graphGlossaryMatches = await discoverGraphGlossaryTerms(basePlusDirect, graphGlossarySupportText);
  const basePlusGraph = mergeInventory(basePlusDirect, graphGlossaryMatches);

  const graphMilestones = await discoverGraphMilestones(basePlusGraph);
  const milestoneQueries = extractMilestoneQueries(input.title, headings, bodyText);
  const searchedMilestones = await discoverMilestones(milestoneQueries, mergeInventory(basePlusGraph, graphMilestones));

  return mergeInventory(
    basePlusGraph,
    graphMilestones,
    searchedMilestones,
  );
}

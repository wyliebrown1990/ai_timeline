/**
 * Entity Extraction Service
 * Sprint KPC-4 - AI Entity Detection
 *
 * Extracts people and organizations from articles using Claude AI.
 * Unlike the legacy keyFigureExtractor, this extracts both persons AND organizations
 * and stores results for matching against Person/Organization records.
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Types
// ============================================================================

/**
 * Person mention extracted from article content
 */
export interface ExtractedPerson {
  /** Full name as written in article */
  name: string;
  /** Role/title if mentioned (e.g., "CEO", "Research Scientist") */
  role?: string;
  /** Organization affiliation if mentioned */
  organization?: string;
  /** The sentence/context where they appear */
  context: string;
  /** Type of mention in the article */
  mentionType: 'subject' | 'quoted' | 'mentioned';
  /** Whether article describes a job change, new role, or career update */
  isCareerChange: boolean;
}

/**
 * Organization mention extracted from article content
 */
export interface ExtractedOrganization {
  /** Full organization name */
  name: string;
  /** Type of organization */
  type: 'company' | 'research_lab' | 'university' | 'nonprofit' | 'government';
  /** The sentence/context where they appear */
  context: string;
  /** Type of mention in the article */
  mentionType: 'subject' | 'announcement' | 'mentioned';
  /** Whether article describes new project, product, or focus area */
  isNewDevelopment: boolean;
}

/**
 * Result from entity extraction
 */
export interface EntityExtractionResult {
  persons: ExtractedPerson[];
  organizations: ExtractedOrganization[];
}

/**
 * Validated extraction result with metadata
 */
export interface ValidatedEntityExtraction extends EntityExtractionResult {
  articleId: string;
  extractedAt: Date;
  modelUsed: string;
  processingTimeMs: number;
}

// ============================================================================
// Prompts
// ============================================================================

/**
 * System prompt for entity extraction
 */
export const ENTITY_EXTRACTION_SYSTEM_PROMPT = `You are an AI entity extraction specialist focused on identifying people and organizations in AI/technology news articles. Your task is to accurately extract and categorize all relevant entities.

Guidelines:
1. Extract ALL people mentioned, even briefly
2. Include full names when available
3. Identify roles and organizational affiliations from context
4. Detect career changes (new jobs, departures, promotions)
5. For organizations, determine the most appropriate type
6. Note when an organization is making an announcement or is the main subject

Be thorough but avoid duplicates. Return structured JSON.`;

/**
 * User prompt template for entity extraction
 */
export function getEntityExtractionPrompt(title: string, content: string): string {
  // Truncate content if too long to save tokens
  const maxContentLength = 6000;
  const truncatedContent = content.length > maxContentLength
    ? content.substring(0, maxContentLength) + '...[truncated]'
    : content;

  return `Analyze this AI/technology article and extract all mentioned people and organizations.

ARTICLE TITLE: ${title}

ARTICLE CONTENT:
${truncatedContent}

For each PERSON, extract:
- name: Full name as written
- role: Their role/title if mentioned (e.g., "CEO", "Research Scientist", "Professor")
- organization: Their organization if mentioned
- context: The key sentence where they appear (max 200 chars)
- mentionType: "subject" (main focus of article), "quoted" (directly quoted), or "mentioned" (briefly referenced)
- isCareerChange: true if article describes a new job, role change, departure, or promotion

For each ORGANIZATION, extract:
- name: Full organization name (not abbreviations unless that's how it's written)
- type: "company", "research_lab", "university", "nonprofit", or "government"
- context: The key sentence where they appear (max 200 chars)
- mentionType: "subject" (main focus), "announcement" (making an announcement), or "mentioned" (briefly referenced)
- isNewDevelopment: true if article describes a new project, product, partnership, or strategic shift

Return valid JSON in this exact format:
{
  "persons": [
    {
      "name": "Full Name",
      "role": "Title/Role",
      "organization": "Org Name",
      "context": "Relevant sentence...",
      "mentionType": "subject|quoted|mentioned",
      "isCareerChange": false
    }
  ],
  "organizations": [
    {
      "name": "Organization Name",
      "type": "company|research_lab|university|nonprofit|government",
      "context": "Relevant sentence...",
      "mentionType": "subject|announcement|mentioned",
      "isNewDevelopment": false
    }
  ]
}

Important:
- Only include entities actually mentioned in the article
- If no persons are found, return empty "persons" array
- If no organizations are found, return empty "organizations" array
- Ensure JSON is valid and complete`;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate an extracted person object
 */
export function isValidExtractedPerson(obj: unknown): obj is ExtractedPerson {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;

  return (
    typeof p.name === 'string' &&
    p.name.length > 0 &&
    typeof p.context === 'string' &&
    ['subject', 'quoted', 'mentioned'].includes(p.mentionType as string) &&
    typeof p.isCareerChange === 'boolean'
  );
}

/**
 * Validate an extracted organization object
 */
export function isValidExtractedOrganization(obj: unknown): obj is ExtractedOrganization {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;

  return (
    typeof o.name === 'string' &&
    o.name.length > 0 &&
    ['company', 'research_lab', 'university', 'nonprofit', 'government'].includes(o.type as string) &&
    typeof o.context === 'string' &&
    ['subject', 'announcement', 'mentioned'].includes(o.mentionType as string) &&
    typeof o.isNewDevelopment === 'boolean'
  );
}

/**
 * Validate and clean extraction result from LLM
 */
export function validateExtractionResult(raw: unknown): EntityExtractionResult {
  const result: EntityExtractionResult = {
    persons: [],
    organizations: [],
  };

  if (!raw || typeof raw !== 'object') {
    return result;
  }

  const data = raw as Record<string, unknown>;

  // Validate persons
  if (Array.isArray(data.persons)) {
    for (const p of data.persons) {
      if (isValidExtractedPerson(p)) {
        result.persons.push({
          name: p.name.trim(),
          role: typeof p.role === 'string' ? p.role.trim() : undefined,
          organization: typeof p.organization === 'string' ? p.organization.trim() : undefined,
          context: p.context.substring(0, 500), // Limit context length
          mentionType: p.mentionType,
          isCareerChange: p.isCareerChange,
        });
      }
    }
  }

  // Validate organizations
  if (Array.isArray(data.organizations)) {
    for (const o of data.organizations) {
      if (isValidExtractedOrganization(o)) {
        result.organizations.push({
          name: o.name.trim(),
          type: o.type,
          context: o.context.substring(0, 500),
          mentionType: o.mentionType,
          isNewDevelopment: o.isNewDevelopment,
        });
      }
    }
  }

  return result;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Deduplicate extracted persons by name (case-insensitive)
 */
export function deduplicatePersons(persons: ExtractedPerson[]): ExtractedPerson[] {
  const seen = new Map<string, ExtractedPerson>();

  for (const person of persons) {
    const key = person.name.toLowerCase();
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, person);
    } else {
      // Merge: prefer subject > quoted > mentioned
      const priority = { subject: 3, quoted: 2, mentioned: 1 };
      if (priority[person.mentionType] > priority[existing.mentionType]) {
        seen.set(key, { ...existing, mentionType: person.mentionType });
      }
      // Keep career change flag if either is true
      if (person.isCareerChange && !existing.isCareerChange) {
        seen.set(key, { ...seen.get(key)!, isCareerChange: true });
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Deduplicate extracted organizations by name (case-insensitive)
 */
export function deduplicateOrganizations(orgs: ExtractedOrganization[]): ExtractedOrganization[] {
  const seen = new Map<string, ExtractedOrganization>();

  for (const org of orgs) {
    const key = org.name.toLowerCase();
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, org);
    } else {
      // Merge: prefer subject > announcement > mentioned
      const priority = { subject: 3, announcement: 2, mentioned: 1 };
      if (priority[org.mentionType] > priority[existing.mentionType]) {
        seen.set(key, { ...existing, mentionType: org.mentionType });
      }
      // Keep new development flag if either is true
      if (org.isNewDevelopment && !existing.isNewDevelopment) {
        seen.set(key, { ...seen.get(key)!, isNewDevelopment: true });
      }
    }
  }

  return Array.from(seen.values());
}

// ============================================================================
// Entity Extraction Service
// ============================================================================

/**
 * Extract entities (persons and organizations) from article content using Claude
 *
 * @param article - Article title and content
 * @param apiKey - Anthropic API key
 * @returns Validated and deduplicated extraction result
 */
export async function extractEntities(
  article: { title: string; content: string },
  apiKey: string
): Promise<EntityExtractionResult> {
  const client = new Anthropic({ apiKey });

  const userPrompt = getEntityExtractionPrompt(article.title, article.content);

  console.log('[EntityExtraction] Sending request to Claude Haiku');

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      system: ENTITY_EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    console.log(
      '[EntityExtraction] Response length:',
      text.length,
      'stop_reason:',
      response.stop_reason
    );

    // Parse the JSON response
    const parsed = parseEntityResponse(text);

    // Validate and clean the result
    const validated = validateExtractionResult(parsed);

    // Deduplicate
    const result: EntityExtractionResult = {
      persons: deduplicatePersons(validated.persons),
      organizations: deduplicateOrganizations(validated.organizations),
    };

    console.log(
      `[EntityExtraction] Extracted ${result.persons.length} persons, ` +
      `${result.organizations.length} organizations`
    );

    return result;
  } catch (error) {
    console.error('[EntityExtraction] API error:', error);
    throw error;
  }
}

/**
 * Parse the LLM response to extract JSON
 */
function parseEntityResponse(text: string): unknown {
  // Try to extract JSON object from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.log('[EntityExtraction] No JSON object in response');
    console.log('[EntityExtraction] Full response:', text.slice(0, 500));
    return { persons: [], organizations: [] };
  }

  try {
    const repaired = repairJson(jsonMatch[0]);
    return JSON.parse(repaired);
  } catch (parseError) {
    console.error('[EntityExtraction] Failed to parse JSON:', parseError);
    console.error('[EntityExtraction] Raw JSON (first 1000 chars):', jsonMatch[0].slice(0, 1000));
    return { persons: [], organizations: [] };
  }
}

/**
 * Repair common JSON issues from LLM responses
 */
function repairJson(json: string): string {
  let repaired = json;

  // Remove trailing commas before closing brackets
  repaired = repaired.replace(/,(\s*[\]}])/g, '$1');

  // Fix truncated JSON - try to close any unclosed brackets
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;

  // Add missing closing brackets/braces
  if (openBraces > closeBraces) {
    repaired += '}'.repeat(openBraces - closeBraces);
  }
  if (openBrackets > closeBrackets) {
    repaired += ']'.repeat(openBrackets - closeBrackets);
  }

  return repaired;
}

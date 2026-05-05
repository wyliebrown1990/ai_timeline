/**
 * Bibliography Parser
 * Sprint Bib-1: Parse bibliography entries from webpage
 *
 * Fetches and parses the bibliography from "A Brief History of Intelligence" website
 */

import type { BibliographyEntry, ParsedBibliography } from './types';

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&#39;": "'",
    "&apos;": "'",
    "&ndash;": "\u2013",
    "&mdash;": "\u2014",
    "&lsquo;": "\u2018",
    "&rsquo;": "\u2019",
    "&ldquo;": "\u201C",
    "&rdquo;": "\u201D",
    "&hellip;": "\u2026",
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, "gi"), char);
  }

  // Handle numeric entities like &#123;
  result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  result = result.replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return result;
}

/**
 * Clean and normalize text
 */
function cleanText(text: string): string {
  return decodeHTMLEntities(text)
    .replace(/\s+/g, ' ')  // Collapse whitespace
    .replace(/^\s+|\s+$/g, '')  // Trim
    .replace(/\t/g, ' ')  // Replace tabs with spaces
    .trim();
}

/**
 * Fetch the bibliography page HTML
 */
async function fetchBibliographyPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AITimelineBot/1.0; +https://letaiexplainai.com)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bibliography: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Extract year from citation text
 */
function extractYear(text: string): number | null {
  // Match 4-digit years in parentheses or standalone: (2020), 2020, etc.
  const yearPatterns = [
    /\((\d{4})\)/, // (2020)
    /,\s*(\d{4})\./, // , 2020.
    /,\s*(\d{4})\s*$/, // , 2020 at end
    /\b(19\d{2}|20\d{2})\b/, // Any 1900s or 2000s year
  ];

  for (const pattern of yearPatterns) {
    const match = text.match(pattern);
    if (match) {
      const year = parseInt(match[1], 10);
      if (year >= 1800 && year <= 2030) {
        return year;
      }
    }
  }

  return null;
}

/**
 * Check if a string is a valid author name (not empty, not HTML entities)
 */
function isValidAuthorName(name: string): boolean {
  const cleaned = cleanText(name);
  // Must have actual content (not just whitespace, HTML entities, or punctuation)
  if (cleaned.length < 2) return false;
  if (/^[\s&;,.-]+$/.test(cleaned)) return false;
  if (/^&\w+;?$/.test(cleaned)) return false; // HTML entity like &nbsp
  if (/^et\s+al\.?$/i.test(cleaned)) return false;
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(cleaned)) return false;
  return true;
}

/**
 * Extract authors from citation text (handles APA, Chicago, etc.)
 */
function extractAuthors(text: string): string[] {
  const authors: string[] = [];

  // Clean the input text first to decode HTML entities
  const cleanedText = cleanText(text);

  // Common patterns for author extraction
  // Pattern 1: "LastName, F." or "LastName, F. M." at the start
  // Pattern 2: "LastName, F., & LastName, F."
  // Pattern 3: "LastName, FirstName"

  // Get text before year (usually contains authors)
  const yearMatch = cleanedText.match(/\(\d{4}\)/);
  const authorSection = yearMatch ? cleanedText.substring(0, yearMatch.index).trim() : cleanedText.split('.')[0];

  // Try to split by " & " or ", &" for multiple authors
  const authorParts = authorSection.split(/(?:,\s*&|\s+&\s+|;\s*)/);

  for (const part of authorParts) {
    const cleaned = cleanText(part).replace(/^,|,$/g, '').trim();
    if (cleaned.length > 2 && cleaned.length < 100 && isValidAuthorName(cleaned)) {
      authors.push(cleaned);
    }
  }

  // If no authors found, try to get first name-like element
  if (authors.length === 0) {
    const firstPart = cleanText(cleanedText.split(/[.,]/)[0]);
    if (firstPart.length > 2 && firstPart.length < 100 && isValidAuthorName(firstPart)) {
      authors.push(firstPart);
    }
  }

  return authors.slice(0, 10); // Limit to 10 authors
}

/**
 * Check if a string looks like an author list
 * Author patterns: "R. Chalfie, M. Trent" or "Chalfie, R., Trent, M."
 */
function looksLikeAuthorList(text: string): boolean {
  // Pattern 1: Multiple "Initial. Name" patterns (e.g., "R. Chalfie, M. Trent")
  const initialNamePattern = /^(?:[A-Z]\.?\s+)?[A-Z][a-z]+(?:,\s*(?:and\s+)?(?:[A-Z]\.?\s+)?[A-Z][a-z]+)+/;
  if (initialNamePattern.test(text)) return true;

  // Pattern 2: "LastName, X." patterns (e.g., "Chalfie, R., Trent, M.")
  const lastNameInitialPattern = /^[A-Z][a-z]+,\s*[A-Z]\.?(?:,|\s+and)/;
  if (lastNameInitialPattern.test(text)) return true;

  // Pattern 3: High ratio of commas to words (author lists have many commas)
  const commaCount = (text.match(/,/g) || []).length;
  const wordCount = text.split(/\s+/).length;
  if (commaCount >= 3 && commaCount / wordCount > 0.3) return true;

  // Pattern 4: Contains "and" followed by initial+name at end (common in author lists)
  if (/\band\s+[A-Z]\.?\s*[A-Z][a-z]+\.?\s*$/.test(text)) return true;

  // Pattern 5: Multiple single initials followed by periods
  const initialCount = (text.match(/\b[A-Z]\.\s*/g) || []).length;
  if (initialCount >= 3) return true;

  return false;
}

/**
 * Extract title from citation (usually in italics or quotes)
 */
function extractTitle(text: string): string | null {
  // Clean the text first
  const cleaned = cleanText(text);

  // Try to find title in various formats:

  // Pattern 1: "Title in Double Quotes" - most common format
  const doubleQuoteMatch = cleaned.match(/"([^"]{10,300})"/);
  if (doubleQuoteMatch) {
    const title = doubleQuoteMatch[1].trim();
    if (!looksLikeAuthorList(title)) return title;
  }

  // Pattern 2: "Title in Smart Quotes"
  const smartQuoteMatch = cleaned.match(/[\u201C\u201D]([^\u201C\u201D]{10,300})[\u201C\u201D]/);
  if (smartQuoteMatch) {
    const title = smartQuoteMatch[1].trim();
    if (!looksLikeAuthorList(title)) return title;
  }

  // Pattern 3: 'Title in Single Quotes'
  const singleQuoteMatch = cleaned.match(/'([^']{10,300})'/);
  if (singleQuoteMatch) {
    const title = singleQuoteMatch[1].trim();
    if (!looksLikeAuthorList(title)) return title;
  }

  // Pattern 4: Title in italics (if HTML preserved)
  const italicMatch = cleaned.match(/<i>([^<]{10,300})<\/i>|<em>([^<]{10,300})<\/em>/);
  if (italicMatch) {
    const title = (italicMatch[1] || italicMatch[2]).trim();
    if (!looksLikeAuthorList(title)) return title;
  }

  // Pattern 5: After (year). "Title" or After (year). Title.
  // This handles: Author. (2020). "Title" or Author (2020). Title.
  const afterYearQuotedMatch = cleaned.match(/\(\d{4}\)[.\s]*[\u201C\u201D""]([^\u201C\u201D""]{10,300})[\u201C\u201D""]/);
  if (afterYearQuotedMatch) {
    const title = afterYearQuotedMatch[1].trim();
    if (!looksLikeAuthorList(title)) return title;
  }

  // Pattern 6: After year, title before journal name (usually ends with period before journal)
  // Author (2020). Title here. Journal Name, vol.
  const afterYearMatch = cleaned.match(/\(\d{4}\)[.\s]+([A-Z][^.]{10,200})\./);
  if (afterYearMatch) {
    const potentialTitle = afterYearMatch[1].trim();
    // Make sure it's not just author names
    if (!looksLikeAuthorList(potentialTitle)) {
      return potentialTitle;
    }
  }

  // Pattern 7: For citations like "Author, F. 2020. Title here. Journal..."
  const altYearMatch = cleaned.match(/\.\s+(\d{4})\.\s+([A-Z][^.]{10,200})\./);
  if (altYearMatch) {
    const title = altYearMatch[2].trim();
    if (!looksLikeAuthorList(title)) return title;
  }

  // Pattern 8: Look for capitalized phrase that's likely a title (book/paper names)
  // Skip common non-title patterns
  const titlePatterns = [
    /\.\s+([A-Z][A-Za-z\s:,'-]{15,150})\.\s+(?:In\s|Proceedings|Journal|MIT|Cambridge|Oxford|Springer|Academic|Princeton)/,
    /\.\s+"?([A-Z][^"]{15,150})"?\.\s+[A-Z]/,
  ];

  for (const pattern of titlePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const title = match[1].trim().replace(/^["']|["']$/g, '');
      if (!looksLikeAuthorList(title)) return title;
    }
  }

  // Return null if no valid title found - don't fall back to raw text
  return null;
}

/**
 * Extract DOI from citation
 */
function extractDOI(text: string): string | undefined {
  const doiPatterns = [
    /doi:\s*(10\.\d{4,}\/[^\s]+)/i,
    /doi\.org\/(10\.\d{4,}\/[^\s]+)/i,
    /(10\.\d{4,}\/[^\s<>"]+)/,
  ];

  for (const pattern of doiPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/[.,;]$/, ''); // Remove trailing punctuation
    }
  }

  return undefined;
}

/**
 * Extract URL from citation
 */
function extractUrl(text: string): string | undefined {
  const urlMatch = text.match(/https?:\/\/[^\s<>"]+/);
  if (urlMatch) {
    return urlMatch[0].replace(/[.,;)\]>]$/, ''); // Remove trailing punctuation
  }
  return undefined;
}

/**
 * Determine publication type from citation
 */
function determineType(
  text: string
): 'book' | 'paper' | 'article' | 'conference' | 'thesis' | 'report' | 'other' {
  const lowerText = text.toLowerCase();

  if (/proceedings|conference|workshop|symposium/i.test(lowerText)) {
    return 'conference';
  }
  if (/journal|transactions|letters/i.test(lowerText)) {
    return 'paper';
  }
  if (/thesis|dissertation/i.test(lowerText)) {
    return 'thesis';
  }
  if (/technical report|tr-\d|report no\./i.test(lowerText)) {
    return 'report';
  }
  if (/press|publisher|publishing|university press/i.test(lowerText)) {
    return 'book';
  }
  if (/arxiv|preprint/i.test(lowerText)) {
    return 'paper';
  }

  // Default to paper for academic-looking citations
  if (/\d{4}\)\..*\./i.test(text)) {
    return 'paper';
  }

  return 'other';
}

/**
 * Parse a single citation text into a BibliographyEntry
 */
function parseCitation(rawCitation: string): BibliographyEntry | null {
  // Clean the citation text first
  const cleaned = cleanText(rawCitation);
  if (cleaned.length < 20) return null;

  const year = extractYear(cleaned);
  if (!year) return null; // Skip entries without a parseable year

  const title = extractTitle(cleaned);
  if (!title) return null; // Skip entries where we couldn't extract a proper title

  // Validate title - must be actual title content, not just punctuation or author names
  if (title.length < 10) return null;
  if (/^[,.\s\-&]+$/.test(title)) return null; // Just punctuation
  if (/^(?:and\s+)?[A-Z][a-z]+,\s+[A-Z]\.?$/i.test(title)) return null; // Just author name
  if (title.startsWith(',') || title.startsWith('&')) return null; // Starts with separator
  if (looksLikeAuthorList(title)) return null; // Looks like an author list

  const authors = extractAuthors(cleaned);
  const doi = extractDOI(cleaned);
  const sourceUrl = doi ? `https://doi.org/${doi}` : extractUrl(cleaned);
  const type = determineType(cleaned);

  return {
    title,
    authors,
    year,
    sourceUrl,
    type,
    doi,
    rawCitation: cleaned,
  };
}

/**
 * Parse HTML and extract citation entries
 */
function parseHTMLForCitations(html: string): { citations: string[]; errors: string[] } {
  const citations: string[] = [];
  const errors: string[] = [];

  // Remove script and style tags
  let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Strategy 1: Look for list items (common bibliography format)
  const liMatches = cleanHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (liMatches && liMatches.length > 50) {
    for (const li of liMatches) {
      // Extract text content and decode HTML entities
      const text = cleanText(li.replace(/<[^>]+>/g, ' '));
      if (text.length > 30 && /\d{4}/.test(text)) {
        citations.push(text);
      }
    }
  }

  // Strategy 2: Look for paragraph tags with citation-like content
  if (citations.length < 50) {
    const pMatches = cleanHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (pMatches) {
      for (const p of pMatches) {
        const text = cleanText(p.replace(/<[^>]+>/g, ' '));
        // Check if it looks like a citation (has year, authors, etc.)
        if (text.length > 50 && text.length < 2000 && /\(\d{4}\)|,\s*\d{4}\./.test(text)) {
          citations.push(text);
        }
      }
    }
  }

  // Strategy 3: Look for div elements with bibliography-like classes
  if (citations.length < 50) {
    const divMatches = cleanHtml.match(
      /<div[^>]*class="[^"]*(?:citation|reference|bib)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
    );
    if (divMatches) {
      for (const div of divMatches) {
        const text = cleanText(div.replace(/<[^>]+>/g, ' '));
        if (text.length > 30 && /\d{4}/.test(text)) {
          citations.push(text);
        }
      }
    }
  }

  // Strategy 4: Split by common citation separators and look for patterns
  if (citations.length < 50) {
    // Look for text blocks that contain multiple citations
    const textContent = cleanHtml.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n');
    const lines = textContent.split('\n');

    for (const line of lines) {
      const text = cleanText(line);
      // Citation heuristic: contains year, has reasonable length, has author-like pattern
      if (
        text.length > 50 &&
        text.length < 2000 &&
        /\(\d{4}\)|\b\d{4}\b/.test(text) &&
        /[A-Z][a-z]+,?\s+[A-Z]\./.test(text)
      ) {
        citations.push(text);
      }
    }
  }

  // Remove duplicates
  const uniqueCitations = [...new Set(citations)];

  if (uniqueCitations.length < 10) {
    errors.push(`Only found ${uniqueCitations.length} citations - page structure may have changed`);
  }

  return { citations: uniqueCitations, errors };
}

/**
 * Main function: Parse bibliography from URL
 */
export async function parseBibliography(sourceUrl: string): Promise<ParsedBibliography> {
  console.log(`[BibliographyParser] Fetching bibliography from ${sourceUrl}`);

  const html = await fetchBibliographyPage(sourceUrl);
  console.log(`[BibliographyParser] Fetched ${html.length} bytes`);

  const { citations, errors } = parseHTMLForCitations(html);
  console.log(`[BibliographyParser] Found ${citations.length} raw citations`);

  const entries: BibliographyEntry[] = [];
  const parseErrors: string[] = [...errors];

  for (const citation of citations) {
    try {
      const entry = parseCitation(citation);
      if (entry) {
        entries.push(entry);
      }
    } catch (error) {
      parseErrors.push(`Failed to parse: "${citation.slice(0, 50)}...": ${error}`);
    }
  }

  console.log(`[BibliographyParser] Successfully parsed ${entries.length} entries`);

  return {
    entries,
    parseErrors,
    totalFound: citations.length,
    sourceUrl,
    parsedAt: new Date(),
  };
}

/**
 * Parse bibliography entries from raw text (alternative input)
 */
export function parseBibliographyFromText(text: string): BibliographyEntry[] {
  const entries: BibliographyEntry[] = [];

  // Split by double newlines or numbered entries
  const rawEntries = text.split(/\n\n|\n(?=\d+\.\s)/);

  for (const raw of rawEntries) {
    const entry = parseCitation(raw);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

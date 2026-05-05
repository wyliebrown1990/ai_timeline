/**
 * Source Metadata Fetcher
 * Sprint Bib-1: Scrape metadata from source URLs
 *
 * Attempts to fetch actual publication dates and additional metadata from DOI, arXiv, etc.
 */

import type { BibliographyEntry, ScrapedMetadata } from './types';

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

/**
 * Wait for rate limit
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Fetch with timeout and error handling
 */
async function safeFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response | null> {
  await waitForRateLimit();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AITimelineBot/1.0; +https://letaiexplainai.com)',
        Accept: 'text/html,application/json,application/xml',
        ...options.headers,
      },
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[SourceMetadataFetcher] Fetch failed for ${url}:`, error);
    return null;
  }
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  // Try various date formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/, // Month DD, YYYY
    /(\d{1,2})\s+(\w+)\s+(\d{4})/, // DD Month YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Try direct parsing
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return undefined;
}

/**
 * Fetch metadata from DOI.org
 */
async function fetchFromDOI(doi: string): Promise<ScrapedMetadata> {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;

  try {
    const response = await safeFetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response || !response.ok) {
      return { success: false, error: 'DOI lookup failed' };
    }

    const data = await response.json();
    const work = data.message;

    // Extract publication date
    let actualDate: Date | undefined;
    if (work.published) {
      const parts = work.published['date-parts']?.[0];
      if (parts) {
        actualDate = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
      }
    }

    // Extract abstract
    const abstract = work.abstract?.replace(/<[^>]+>/g, '').trim();

    // Extract authors
    const additionalAuthors =
      work.author?.map((a: { family?: string; given?: string }) =>
        `${a.given || ''} ${a.family || ''}`.trim()
      ) || [];

    // Extract venue (journal or conference)
    const venue = work['container-title']?.[0] || work.publisher;

    return {
      success: true,
      actualDate,
      abstract: abstract?.slice(0, 2000),
      organization: work.publisher,
      additionalAuthors,
      venue,
    };
  } catch (error) {
    return { success: false, error: `DOI fetch error: ${error}` };
  }
}

/**
 * Fetch metadata from arXiv
 */
async function fetchFromArxiv(arxivId: string): Promise<ScrapedMetadata> {
  const url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`;

  try {
    const response = await safeFetch(url);

    if (!response || !response.ok) {
      return { success: false, error: 'arXiv lookup failed' };
    }

    const xml = await response.text();

    // Parse XML response
    const publishedMatch = xml.match(/<published>([^<]+)<\/published>/);
    const abstractMatch = xml.match(/<summary>([^<]+)<\/summary>/s);
    let actualDate: Date | undefined;
    if (publishedMatch) {
      actualDate = parseDate(publishedMatch[1]);
    }

    return {
      success: true,
      actualDate,
      abstract: abstractMatch?.[1]?.trim().slice(0, 2000),
      venue: 'arXiv preprint',
    };
  } catch (error) {
    return { success: false, error: `arXiv fetch error: ${error}` };
  }
}

/**
 * Fetch metadata from a generic webpage
 */
async function fetchFromWebpage(url: string): Promise<ScrapedMetadata> {
  try {
    const response = await safeFetch(url);

    if (!response || !response.ok) {
      return { success: false, error: `HTTP ${response?.status}` };
    }

    const html = await response.text();

    // Try to extract date from meta tags or content
    let actualDate: Date | undefined;

    // Check meta tags
    const datePatterns = [
      /<meta[^>]*name="(?:date|DC\.date|citation_publication_date)"[^>]*content="([^"]+)"/i,
      /<meta[^>]*property="(?:article:published_time|og:published_time)"[^>]*content="([^"]+)"/i,
      /<time[^>]*datetime="([^"]+)"/i,
    ];

    for (const pattern of datePatterns) {
      const match = html.match(pattern);
      if (match) {
        actualDate = parseDate(match[1]);
        if (actualDate) break;
      }
    }

    // Try to extract abstract from meta description
    const abstractMatch = html.match(
      /<meta[^>]*name="(?:description|DC\.description|og:description)"[^>]*content="([^"]+)"/i
    );

    // Try to extract organization
    const orgMatch = html.match(
      /<meta[^>]*name="(?:author|DC\.publisher|citation_author_institution)"[^>]*content="([^"]+)"/i
    );

    return {
      success: actualDate !== undefined || abstractMatch !== null,
      actualDate,
      abstract: abstractMatch?.[1]?.slice(0, 2000),
      organization: orgMatch?.[1],
    };
  } catch (error) {
    return { success: false, error: `Webpage fetch error: ${error}` };
  }
}

/**
 * Extract arXiv ID from URL or text
 */
function extractArxivId(text: string): string | null {
  const patterns = [
    /arxiv\.org\/abs\/(\d+\.\d+)/i,
    /arxiv\.org\/pdf\/(\d+\.\d+)/i,
    /arxiv:(\d+\.\d+)/i,
    /arXiv:(\d+\.\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Main function: Fetch metadata for a bibliography entry
 */
export async function fetchSourceMetadata(entry: BibliographyEntry): Promise<ScrapedMetadata> {
  console.log(`[SourceMetadataFetcher] Fetching metadata for "${entry.title.slice(0, 50)}..."`);

  // Strategy 1: If DOI is available, use CrossRef API
  if (entry.doi) {
    console.log(`[SourceMetadataFetcher] Trying DOI: ${entry.doi}`);
    const doiResult = await fetchFromDOI(entry.doi);
    if (doiResult.success) {
      console.log(`[SourceMetadataFetcher] DOI lookup successful`);
      return doiResult;
    }
  }

  // Strategy 2: Check for arXiv URL
  const arxivId = extractArxivId(entry.sourceUrl || entry.rawCitation);
  if (arxivId) {
    console.log(`[SourceMetadataFetcher] Trying arXiv: ${arxivId}`);
    const arxivResult = await fetchFromArxiv(arxivId);
    if (arxivResult.success) {
      console.log(`[SourceMetadataFetcher] arXiv lookup successful`);
      return arxivResult;
    }
  }

  // Strategy 3: Try DOI from URL
  if (entry.sourceUrl) {
    const doiFromUrl = entry.sourceUrl.match(/doi\.org\/(10\.[^/\s]+\/[^/\s]+)/)?.[1];
    if (doiFromUrl) {
      console.log(`[SourceMetadataFetcher] Trying DOI from URL: ${doiFromUrl}`);
      const doiResult = await fetchFromDOI(doiFromUrl);
      if (doiResult.success) {
        console.log(`[SourceMetadataFetcher] DOI lookup successful`);
        return doiResult;
      }
    }
  }

  // Strategy 4: Scrape the webpage directly
  if (entry.sourceUrl) {
    console.log(`[SourceMetadataFetcher] Trying webpage scrape: ${entry.sourceUrl}`);
    const webResult = await fetchFromWebpage(entry.sourceUrl);
    if (webResult.success) {
      console.log(`[SourceMetadataFetcher] Webpage scrape successful`);
      return webResult;
    }
  }

  // No metadata found
  console.log(`[SourceMetadataFetcher] No metadata found for entry`);
  return { success: false, error: 'No metadata source available' };
}

/**
 * Batch fetch metadata with progress tracking
 */
export async function fetchMetadataForEntries(
  entries: BibliographyEntry[],
  options: {
    onProgress?: (processed: number, total: number, success: number) => void;
  } = {}
): Promise<Map<string, ScrapedMetadata>> {
  const { onProgress } = options;
  const results = new Map<string, ScrapedMetadata>();

  let successCount = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const key = `${entry.title}-${entry.year}`;

    const metadata = await fetchSourceMetadata(entry);
    results.set(key, metadata);

    if (metadata.success) successCount++;
    onProgress?.(i + 1, entries.length, successCount);
  }

  console.log(
    `[SourceMetadataFetcher] Fetched metadata for ${entries.length} entries, ${successCount} successful`
  );

  return results;
}

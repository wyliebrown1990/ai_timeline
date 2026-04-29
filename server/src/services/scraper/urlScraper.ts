/**
 * URL Scraper Service
 * Uses Playwright (headless browser) with Jina Reader API as fallback
 * Sprint 41: URL Scraper Integration
 * Sprint 44: Playwright integration for manual scraping
 * Sprint PD-1: Paywall detection — paywalled scrapes now return success:true
 *              with isPaywalled metadata, instead of being rejected outright.
 *              Paywall heuristics moved to ./paywallDetection.ts.
 */

import { playwrightClient } from './playwrightClient';
import {
  evaluatePaywallSignals,
  type PaywallReason,
} from './paywallDetection';

export interface ScrapedContent {
  success: boolean;
  title?: string;
  content?: string;
  wordCount?: number;
  error?: string;
  // 'paywall' is intentionally NOT in this union anymore — paywalled content
  // is delivered via isPaywalled below as a successful scrape with a flag.
  failureType?: 'captcha' | 'forbidden' | 'blocked' | 'empty';
  scrapedBy?: 'playwright' | 'jina';
  // Paywall signals (Sprint PD-1) — set on successful scrapes when the
  // heuristic fires. Callers should persist these alongside the article.
  isPaywalled?: boolean;
  paywallReason?: PaywallReason | null;
}

/**
 * Common failure patterns that indicate the scrape didn't get real content
 * These patterns appear when sites block scrapers or require authentication.
 *
 * Paywall patterns intentionally NOT here — see paywallDetection.ts. Paywalled
 * scrapes now persist with a flag instead of being rejected outright.
 */
const FAILURE_PATTERNS = [
  // CAPTCHA/Cloudflare patterns
  { pattern: /verify you are human/i, type: 'captcha' as const },
  { pattern: /just a moment/i, type: 'captcha' as const },
  { pattern: /checking your browser/i, type: 'captcha' as const },
  { pattern: /cloudflare/i, type: 'captcha' as const },
  { pattern: /ray id:/i, type: 'captcha' as const },
  { pattern: /complete the.*captcha/i, type: 'captcha' as const },
  { pattern: /please complete the security check/i, type: 'captcha' as const },
  { pattern: /enable javascript and cookies/i, type: 'captcha' as const },

  // Forbidden/blocked patterns
  { pattern: /error 403/i, type: 'forbidden' as const },
  { pattern: /forbidden/i, type: 'forbidden' as const },
  { pattern: /access denied/i, type: 'blocked' as const },
  { pattern: /you don't have permission/i, type: 'blocked' as const },
  { pattern: /blocked/i, type: 'blocked' as const },
];

/**
 * Check if scraped content looks like a failure/error page
 * Returns the failure type if detected, null otherwise
 */
function detectScrapeFailure(content: string, title?: string): ScrapedContent['failureType'] | null {
  const textToCheck = `${title || ''} ${content}`.toLowerCase();

  for (const { pattern, type } of FAILURE_PATTERNS) {
    if (pattern.test(textToCheck)) {
      return type;
    }
  }

  // Check for suspiciously short content (less than 100 words)
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  if (wordCount < 50) {
    return 'empty';
  }

  return null;
}

/**
 * Clean content to extract only meaningful article text
 * Removes navigation, ads, scripts, styles, and other non-content elements
 */
function cleanContent(content: string, title?: string): string {
  let cleaned = content;

  // Remove title from beginning if it's duplicated
  if (title && cleaned.startsWith(`# ${title}`)) {
    cleaned = cleaned.substring(`# ${title}`.length).trim();
  }

  // Remove all image markdown (![alt](url) or ![](url))
  cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '');

  // Remove social share links (text links with social keywords)
  cleaned = cleaned.replace(
    /\[\s*(Share|Tweet|Post|Email|Print|License|LinkedIn|Facebook|Twitter|Copy link|X\/Twitter|Add us on Google)\s*\]\([^)]+\)/gi,
    ''
  );

  // Remove list items that contain only social links
  cleaned = cleaned.replace(/^\s*\*\s*\[\s*(Share|Tweet|Post|Email|Print|License|LinkedIn|Facebook|Twitter|Copy link|X\/Twitter)\s*\]\([^)]+\)\s*$/gm, '');

  // Remove javascript: links
  cleaned = cleaned.replace(/\[.*?\]\(javascript:[^)]*\)/g, '');

  // Remove mailto: links that are just share buttons
  cleaned = cleaned.replace(/\[.*?\]\(mailto:\?Subject=[^)]+\)/g, '');

  // Remove orphaned closing parentheses from removed links (with optional surrounding punctuation)
  cleaned = cleaned.replace(/^\s*\*?\s*\)$/gm, '');

  // Remove lines that are just parentheses, quotes, or punctuation
  cleaned = cleaned.replace(/^\s*[)\]"']+\s*$/gm, '');

  // Remove "purchase licensing rights" lines
  cleaned = cleaned.replace(/^\s*\*?\s*\[?\s*purchase licensing rights.*$/gmi, '');

  // Remove "An article from" header lines
  cleaned = cleaned.replace(/^An article from.*$/gm, '');

  // Remove "Filed Under:" footer sections
  cleaned = cleaned.replace(/^Filed Under:.*$/gm, '');

  // Remove "Listen to the article" lines
  cleaned = cleaned.replace(/^.*Listen to the article.*$/gm, '');

  // Remove audio generation notices
  cleaned = cleaned.replace(/^This audio is auto-generated.*$/gm, '');

  // Common noise patterns
  const noisePatterns = [
    // Navigation and menu items
    /^(Home|About|Contact|Subscribe|Menu|Search|Login|Sign up|Newsletter)$/gm,
    // Social sharing buttons as plain text
    /^(Share|Tweet|Pin|Email|Print|WhatsApp|Facebook|Twitter|LinkedIn|X\/Twitter)$/gm,
    // Related articles sections
    /^(Related|Also read|More from|You may also like|Recommended|Popular|Trending):?$/gm,
    // Author/date patterns that are just labels (not followed by content)
    /^(By|Author|Published|Updated|Posted|Written by):?\s*$/gm,
    // Cookie/privacy notices
    /^We use cookies.*$/gm,
    /^Accept (all )?cookies.*$/gm,
    // Empty markdown links
    /\[\s*\]\(.*?\)/g,
    // Lines that are just "Dive Brief" or "Dive Insight" headers
    /^Dive (Brief|Insight):?\s*$/gm,
    // Getty Images credit
    /^Getty Images$/gm,
    // Purchase/licensing prompts
    /^purchase licensing rights$/gm,
    // Add us on Google
    /^Add us on Google$/gm,
  ];

  for (const pattern of noisePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove lines that are just URLs, empty bullets, or noise
  cleaned = cleaned
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      // Remove empty lines or lines with just whitespace
      if (trimmed === '') return true; // Keep actual empty lines for paragraph spacing
      // Remove lines that are just URLs
      if (trimmed.match(/^https?:\/\/[^\s]+$/)) return false;
      // Remove lines that are just bullet points with no content
      if (trimmed.match(/^\*\s*$/)) return false;
      // Remove empty list items
      if (trimmed === '*' || trimmed === '-') return false;
      // Remove lines that just have quotation marks or punctuation (orphaned from removed links)
      if (trimmed.match(/^["'()[\]*\-_\s]+$/)) return false;
      // Remove orphaned tooltip text
      if (trimmed.match(/^"(Print|Share|Post|License|Email)".*$/)) return false;
      return true;
    })
    .join('\n');

  // Remove orphaned list markers (lines with just * followed by whitespace)
  cleaned = cleaned.replace(/^\s*\*\s*\n/gm, '\n');

  // Remove nested empty lists
  cleaned = cleaned.replace(/^\s*\*\s*\*\s*$/gm, '');

  // Normalize multiple newlines to max 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Scrape article using Playwright headless browser
 */
async function scrapeWithPlaywright(url: string): Promise<ScrapedContent | null> {
  try {
    // Check if Playwright service is available
    const isAvailable = await playwrightClient.isAvailable();
    if (!isAvailable) {
      console.log('[Scraper] Playwright service not available, will use Jina');
      return null;
    }

    console.log('[Scraper] Using Playwright for:', url);

    const result = await playwrightClient.scrapeArticle(url, {
      // Use article-specific selectors for cleaner content
      contentSelector: 'article, .article, .post-content, .entry-content, main, [role="main"]',
      timeout: 30000,
    });

    if (!result.success || !result.content) {
      console.log('[Scraper] Playwright scrape failed:', result.error);
      return null;
    }

    // Clean the content
    const cleanedContent = cleanContent(result.content, result.title);
    const wordCount = cleanedContent.split(/\s+/).filter(Boolean).length;

    // Check for scrape failures
    const failureType = detectScrapeFailure(cleanedContent, result.title);
    if (failureType) {
      console.log('[Scraper] Playwright content has failure pattern:', failureType);
      return null; // Try Jina as fallback
    }

    console.log('[Scraper] Playwright success:', {
      titleLength: result.title?.length,
      contentLength: cleanedContent.length,
      wordCount,
    });

    const paywall = evaluatePaywallSignals({
      url,
      content: cleanedContent,
      title: result.title,
      wordCount,
    });

    return {
      success: true,
      title: result.title,
      content: cleanedContent,
      wordCount,
      scrapedBy: 'playwright',
      isPaywalled: paywall.isPaywalled,
      paywallReason: paywall.reason,
    };
  } catch (error) {
    console.error('[Scraper] Playwright error:', error);
    return null;
  }
}

/**
 * Scrape article using Jina Reader API (fallback)
 */
async function scrapeWithJina(url: string): Promise<ScrapedContent> {
  // Use Jina Reader API (free, no API key required)
  const jinaUrl = `https://r.jina.ai/${url}`;

  console.log('[Scraper] Using Jina for:', jinaUrl);

  const response = await fetch(jinaUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/plain',
      'User-Agent': 'AI-Timeline-Scraper/1.0',
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    console.error('[Scraper] Jina error:', response.status, response.statusText);
    return {
      success: false,
      error: `Failed to fetch content: ${response.status} ${response.statusText}`,
    };
  }

  const content = await response.text();

  if (!content || content.trim().length === 0) {
    return {
      success: false,
      error: 'No content extracted from URL',
    };
  }

  // Extract title from first markdown heading or first line
  let title: string | undefined;
  const lines = content.split('\n');

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      title = h1Match[1].trim();
      break;
    }
  }

  if (!title) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('http')) {
        title = trimmed.substring(0, 200);
        break;
      }
    }
  }

  // Clean the content
  const cleanedContent = cleanContent(content, title);
  const wordCount = cleanedContent.split(/\s+/).filter(Boolean).length;

  // Check for scrape failures
  const failureType = detectScrapeFailure(cleanedContent, title);
  if (failureType) {
    const failureMessages: Record<NonNullable<ScrapedContent['failureType']>, string> = {
      captcha:
        'The page is protected by CAPTCHA or Cloudflare. Please copy and paste the article content manually.',
      forbidden: 'Access to this page is forbidden (403). The site may be blocking automated requests.',
      blocked: 'Access to this page was blocked by the website.',
      empty:
        'The scraped content appears to be empty or too short. Please verify the URL or paste content manually.',
    };

    console.log('[Scraper] Jina failure detected:', failureType);

    return {
      success: false,
      title,
      content: cleanedContent,
      wordCount,
      error: failureMessages[failureType],
      failureType,
      scrapedBy: 'jina',
    };
  }

  console.log('[Scraper] Jina success:', {
    titleLength: title?.length,
    contentLength: cleanedContent.length,
    wordCount,
  });

  const paywall = evaluatePaywallSignals({
    url,
    content: cleanedContent,
    title,
    wordCount,
  });

  return {
    success: true,
    title,
    content: cleanedContent,
    wordCount,
    scrapedBy: 'jina',
    isPaywalled: paywall.isPaywalled,
    paywallReason: paywall.reason,
  };
}

/**
 * Scrape article content from a URL
 * Tries Playwright first (better for JS-heavy sites), falls back to Jina Reader
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return {
        success: false,
        error: 'Invalid URL format',
      };
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        success: false,
        error: 'Only HTTP and HTTPS URLs are supported',
      };
    }

    // Try Playwright first (better for JS-heavy sites)
    const playwrightResult = await scrapeWithPlaywright(url);
    if (playwrightResult?.success) {
      return playwrightResult;
    }

    // Fall back to Jina Reader
    return await scrapeWithJina(url);
  } catch (error) {
    console.error('[Scraper] Error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return {
          success: false,
          error: 'Request timed out - the page may be too slow or blocking scrapers',
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Unknown error occurred while scraping',
    };
  }
}

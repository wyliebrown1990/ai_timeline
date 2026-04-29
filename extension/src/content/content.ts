// Content script: runs Mozilla Readability against the live DOM when
// the popup asks for it. Does NOT auto-extract on every page load — the
// popup explicitly requests via chrome.tabs.sendMessage.

import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';

export type ExtractRequest = { type: 'EXTRACT_ARTICLE' };

export type PaywallReason =
  | 'extension_overlay'
  | 'extension_phrase'
  | 'extension_short_content';

export type ExtractSuccess = {
  success: true;
  title: string;
  textContent: string;
  byline: string | null;
  length: number;
  excerpt: string | null;
  url: string;
  paywall: { isPaywalled: boolean; reason: PaywallReason | null };
};

export type ExtractFailure = {
  success: false;
  reason: 'readability_null' | 'too_short';
  url: string;
};

export type ExtractResponse = ExtractSuccess | ExtractFailure;

// Live-DOM paywall heuristic. Sees the rendered page in the user's
// authenticated browser, so it's the most accurate place to detect
// overlays / "subscribe" prompts that server scrapes can't see.
const OVERLAY_SELECTORS = [
  '[id*="paywall" i]',
  '[class*="paywall" i]',
  '[id*="subscribe-prompt" i]',
  '[class*="subscribe-prompt" i]',
  '[id*="metered-content" i]',
  '[class*="metered-content" i]',
  '[data-testid*="paywall" i]',
];

const PAYWALL_PHRASES: RegExp[] = [
  /subscribe to continue/i,
  /log in to read/i,
  /sign in to read/i,
  /to continue reading/i,
  /create.*account.*to continue/i,
  /subscribers? only/i,
  /members? only/i,
];

const SHORT_ARTICLE_WORD_THRESHOLD = 200; // words; only fires WITH a large surrounding DOM
const LARGE_DOM_CHAR_THRESHOLD = 4000; // chars in document.body.innerText

export function detectLiveDomPaywall(
  doc: Document,
  articleText: string
): { isPaywalled: boolean; reason: PaywallReason | null } {
  // 1. Common paywall overlay elements. CSS attribute selectors with `i`
  //    match case-insensitively, so we cover paywall/Paywall/PAYWALL etc.
  for (const sel of OVERLAY_SELECTORS) {
    try {
      if (doc.querySelector(sel)) {
        return { isPaywalled: true, reason: 'extension_overlay' };
      }
    } catch {
      // Some selectors throw on exotic DOMs; skip and continue.
    }
  }

  // 2. Phrase match in the extracted article text. High confidence here
  //    because Readability has already stripped chrome / nav / footer.
  if (PAYWALL_PHRASES.some((p) => p.test(articleText))) {
    return { isPaywalled: true, reason: 'extension_phrase' };
  }

  // 3. Truncation signal: the extracted article is short, but the surrounding
  //    DOM is large. Indicates the body is collapsed behind a paywall while
  //    the rest of the page (nav, ads, footer, paywall pitch) is still there.
  const articleWordCount = articleText.split(/\s+/).filter(Boolean).length;
  const totalDomCharCount = doc.body?.innerText?.length ?? 0;
  if (
    articleWordCount < SHORT_ARTICLE_WORD_THRESHOLD &&
    totalDomCharCount > LARGE_DOM_CHAR_THRESHOLD
  ) {
    return { isPaywalled: true, reason: 'extension_short_content' };
  }

  return { isPaywalled: false, reason: null };
}

function extract(): ExtractResponse {
  const url = location.href;
  // Clone so Readability's destructive mutations don't break the live page
  const docClone = document.cloneNode(true) as Document;
  const reader = new Readability(docClone);
  const article = reader.parse();

  if (!article) {
    return { success: false, reason: 'readability_null', url };
  }

  const sanitized = DOMPurify.sanitize(article.textContent ?? '', {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();

  if (sanitized.length < 200) {
    return { success: false, reason: 'too_short', url };
  }

  // Run paywall detection against the ORIGINAL (live) document — Readability
  // mutated docClone, which would have stripped paywall overlay elements.
  const paywall = detectLiveDomPaywall(document, sanitized);

  return {
    success: true,
    title: article.title ?? document.title ?? '',
    textContent: sanitized,
    byline: article.byline ?? null,
    length: sanitized.length,
    excerpt: article.excerpt ?? null,
    url,
    paywall,
  };
}

chrome.runtime.onMessage.addListener((msg: ExtractRequest, _sender, sendResponse) => {
  if (msg?.type !== 'EXTRACT_ARTICLE') return;
  try {
    sendResponse(extract());
  } catch (err) {
    sendResponse({
      success: false,
      reason: 'readability_null',
      url: location.href,
      error: String(err),
    } as ExtractResponse);
  }
  // Return true to keep the message channel open for the async sendResponse
  return true;
});

// Content script: runs Mozilla Readability against the live DOM when
// the popup asks for it. Does NOT auto-extract on every page load — the
// popup explicitly requests via chrome.tabs.sendMessage.

import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';

export type ExtractRequest = { type: 'EXTRACT_ARTICLE' };

export type ExtractSuccess = {
  success: true;
  title: string;
  textContent: string;
  byline: string | null;
  length: number;
  excerpt: string | null;
  url: string;
};

export type ExtractFailure = {
  success: false;
  reason: 'readability_null' | 'too_short';
  url: string;
};

export type ExtractResponse = ExtractSuccess | ExtractFailure;

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

  return {
    success: true,
    title: article.title ?? document.title ?? '',
    textContent: sanitized,
    byline: article.byline ?? null,
    length: sanitized.length,
    excerpt: article.excerpt ?? null,
    url,
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

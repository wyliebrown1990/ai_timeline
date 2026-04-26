// Two-tier submission state machine. Pure logic — no DOM, no React.
// 1) Try POST /api/admin/articles/scrape
// 2) On 4xx with failureType ∈ knownTypes, fall back to client extraction
//    via chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_ARTICLE' })
//    then POST /api/admin/articles/submit with the extracted text.

import { ApiError } from '../../lib/api';
import type { scrape, submitArticle } from '../../lib/api';
import type { ExtractResponse } from '../../content/content';

export const FALLBACK_FAILURE_TYPES = new Set([
  'captcha',
  'forbidden',
  'blocked',
  'paywall',
  'empty',
]);

export type SubmitState =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'scraping' }
  | { kind: 'extracting' }
  | { kind: 'submitting_extracted' }
  | { kind: 'success'; articleId: string; via: 'scrape' | 'submit'; title?: string }
  | { kind: 'duplicate'; existingId: string }
  | {
      kind: 'error';
      message: string;
      retryable: boolean;
      stage: 'scrape' | 'extract' | 'submit' | 'unknown';
    };

export interface SubmitDeps {
  scrape: typeof scrape;
  submitArticle: typeof submitArticle;
  extract: (tabId: number) => Promise<ExtractResponse>;
  onState: (s: SubmitState) => void;
}

export interface SubmitInput {
  tabId: number;
  url: string;
  forceReadability: boolean;
}

function emit(deps: SubmitDeps, s: SubmitState): SubmitState {
  deps.onState(s);
  return s;
}

export async function runSubmit(deps: SubmitDeps, input: SubmitInput): Promise<SubmitState> {
  emit(deps, { kind: 'starting' });

  // Branch 1 — server scrape (skipped if forceReadability)
  if (!input.forceReadability) {
    emit(deps, { kind: 'scraping' });
    try {
      const resp = await deps.scrape(input.url);
      if (resp.articleId) {
        return emit(deps, {
          kind: 'success',
          articleId: resp.articleId,
          via: 'scrape',
          title: resp.title,
        });
      }
      return emit(deps, {
        kind: 'error',
        message: 'Server scrape returned no article id',
        retryable: true,
        stage: 'scrape',
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          const existingId = (err.body as { existingId?: string } | null)?.existingId;
          if (existingId) {
            return emit(deps, { kind: 'duplicate', existingId });
          }
        }
        if (err.status >= 400 && err.status < 500 && err.failureType && FALLBACK_FAILURE_TYPES.has(err.failureType)) {
          // Fall through to client extraction
        } else if (err.status >= 500) {
          return emit(deps, {
            kind: 'error',
            message: `Server error (${err.status}). Try again.`,
            retryable: true,
            stage: 'scrape',
          });
        } else if (err.status >= 400 && err.status < 500) {
          return emit(deps, {
            kind: 'error',
            message: (err.body as { error?: string } | null)?.error ?? `Request failed (${err.status})`,
            retryable: false,
            stage: 'scrape',
          });
        }
      } else {
        return emit(deps, {
          kind: 'error',
          message: 'Network error while reaching server. Try again.',
          retryable: true,
          stage: 'scrape',
        });
      }
    }
  }

  // Branch 2 — client extraction + /submit
  emit(deps, { kind: 'extracting' });
  let extracted: ExtractResponse;
  try {
    extracted = await deps.extract(input.tabId);
  } catch (err) {
    return emit(deps, {
      kind: 'error',
      message:
        'Could not run the content extractor on this tab. Reload the page and try again. ' +
        String(err instanceof Error ? err.message : err),
      retryable: true,
      stage: 'extract',
    });
  }

  if (!extracted.success) {
    const reasonText =
      extracted.reason === 'too_short'
        ? 'extracted text is too short to analyze'
        : 'page does not look like an article';
    return emit(deps, {
      kind: 'error',
      message: `Could not extract article — ${reasonText}. Open /admin/articles and paste manually.`,
      retryable: false,
      stage: 'extract',
    });
  }

  emit(deps, { kind: 'submitting_extracted' });
  try {
    const resp = await deps.submitArticle({
      sourceUrl: extracted.url,
      title: extracted.title,
      content: extracted.textContent,
    });
    if (resp.articleId) {
      return emit(deps, {
        kind: 'success',
        articleId: resp.articleId,
        via: 'submit',
        title: extracted.title,
      });
    }
    return emit(deps, {
      kind: 'error',
      message: 'Submit returned no article id.',
      retryable: true,
      stage: 'submit',
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409) {
        const existingId = (err.body as { existingId?: string } | null)?.existingId;
        if (existingId) {
          return emit(deps, { kind: 'duplicate', existingId });
        }
      }
      return emit(deps, {
        kind: 'error',
        message: (err.body as { error?: string } | null)?.error ?? `Submit failed (${err.status})`,
        retryable: err.status >= 500,
        stage: 'submit',
      });
    }
    return emit(deps, {
      kind: 'error',
      message: 'Network error during submit. Try again.',
      retryable: true,
      stage: 'submit',
    });
  }
}

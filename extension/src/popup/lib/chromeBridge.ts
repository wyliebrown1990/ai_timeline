// Thin async bridges over chrome.* — keeps SubmitPanel free of chrome.* casts.

import type { ExtractResponse } from '../../content/content';

export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] ?? null;
}

export async function extractFromTab(tabId: number): Promise<ExtractResponse> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_ARTICLE' }, (resp: ExtractResponse) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message ?? 'sendMessage failed'));
        return;
      }
      if (!resp) {
        reject(new Error('Content script returned no response'));
        return;
      }
      resolve(resp);
    });
  });
}

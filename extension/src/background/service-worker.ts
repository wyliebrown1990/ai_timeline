// Background service worker: tracks in-flight submissions so the toolbar
// badge reflects current activity. The popup messages this worker on
// submit-start / submit-end so the badge stays in sync across popups.

type Msg =
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_END'; ok: boolean };

let inFlight = 0;

function applyBadge(): void {
  if (inFlight > 0) {
    chrome.action.setBadgeText({ text: String(inFlight) });
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

function flashError(): void {
  const reduced =
    typeof self !== 'undefined' &&
    'matchMedia' in self &&
    (self as unknown as { matchMedia?: (q: string) => MediaQueryList }).matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches;

  chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
  chrome.action.setBadgeText({ text: '!' });

  // Reduced-motion users get the same color signal but no rapid clear/reset cycle.
  setTimeout(
    () => {
      applyBadge();
    },
    reduced ? 3000 : 3000,
  );
}

chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
  if (msg?.type === 'SUBMIT_START') {
    inFlight += 1;
    applyBadge();
    sendResponse({ ok: true, inFlight });
    return;
  }
  if (msg?.type === 'SUBMIT_END') {
    inFlight = Math.max(0, inFlight - 1);
    if (!msg.ok) {
      flashError();
    } else {
      applyBadge();
    }
    sendResponse({ ok: true, inFlight });
    return;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  applyBadge();
});

// Keep the badge synced if Chrome restarts the worker
applyBadge();
